
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
    generateIllustrationPrompts,
    generateChildrensIllustrationPrompts,
    buildIllustrationPromptFromScene,
    buildSpeechBubblePrompt,
    buildPictureBookTextPrompt,
    type VisualChapter,
    type SceneDescription,
    type DialogueEntry,
    type ContentRating,
} from '@/lib/gemini';
import { getBookReadyEmail, sendEmail } from '@/lib/email';
import { BOOK_PRESETS, FREE_TIER_LIMITS, type BookPresetKey } from '@/lib/constants';
import { generateAndValidateIllustration, generateIllustrationWithRetry, type IllustrationAttemptResult } from '@/lib/illustration-utils';

// Set max duration for this background task (Vercel Fluid Compute allows 800s on Pro)
export const maxDuration = 800;

// Safety margin before Vercel timeout - stop accepting new work 60s before timeout
const TIMEOUT_SAFETY_MARGIN_MS = 60000;
const MAX_GENERATION_TIME_MS = (maxDuration * 1000) - TIMEOUT_SAFETY_MARGIN_MS; // 740 seconds

// Re-use the generation logic, but adapted for single-panel execution to check status
// We need to import the generation helper or duplicate the core logic briefly
// For safety, we'll implement a robust loop here that checks for cancellation
// and handles the "background" nature.

// Helper to check if visual book
function isVisualBook(bookFormat: string, bookPreset: string | null): boolean {
    if (bookFormat === 'picture_book') return true;
    if (bookPreset === 'childrens_picture' || bookPreset === 'comic_story' || bookPreset === 'adult_comic') return true;
    return false;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Extract id outside try-catch so it's available in error handler
    const { id } = await params;

    try {
        // 1. Verify book and status
        const book = await prisma.book.findUnique({
            where: { id },
            include: {
                chapters: true,
                illustrations: true,
                user: { select: { plan: true } },
            },
        });

        if (!book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        // Determine book type details
        const bookFormat = book.bookFormat || 'text_only';
        const isVisual = isVisualBook(bookFormat, book.bookPreset);

        if (!isVisual) {
            return NextResponse.json({ error: 'Not a visual book' }, { status: 400 });
        }

        if (book.status === 'completed') {
            return NextResponse.json({ message: 'Book already completed' });
        }

        // If book was preview_complete but now paid, reset status to allow continuation
        if (book.status === 'preview_complete' && book.paymentStatus === 'completed') {
            console.log(`[Visual Gen] Book ${id} upgraded from preview, resetting status to generating`);
            await prisma.book.update({
                where: { id },
                data: { status: 'generating' },
            });
        }

        // GENERATION LOCK: Prevent concurrent visual generation
        // If status is 'generating' but no illustrations exist yet, this is from the outline
        // phase and we should proceed with visual generation (not skip it)
        if (book.status === 'generating') {
            const hasActiveVisualGen = book.illustrations && book.illustrations.length > 0;
            if (hasActiveVisualGen) {
                console.log(`[Visual Gen] Book ${id} already generating with ${book.illustrations.length} illustrations, skipping duplicate`);
                return NextResponse.json({ message: 'Generation already in progress', status: book.status });
            }
            console.log(`[Visual Gen] Book ${id} status is generating but no illustrations yet (from outline phase), proceeding with visual gen`);
        } else {
            // Atomically set status to generating - only succeeds if status hasn't changed
            const lockResult = await prisma.book.updateMany({
                where: { id, status: { not: 'generating' } },
                data: { status: 'generating' },
            });
            if (lockResult.count === 0) {
                console.log(`[Visual Gen] Failed to acquire generation lock for ${id}, another process got it`);
                return NextResponse.json({ message: 'Generation already in progress', status: 'generating' });
            }
        }

        // Check payment status and free tier limits
        const isPaid = book.paymentStatus === 'completed';
        const hasSubscription = book.user?.plan === 'monthly';
        const canGenerate = isPaid || hasSubscription;

        if (!canGenerate) {
            // Check free tier limits for unpaid users
            const panelsGenerated = book.illustrations.length;
            const limit = FREE_TIER_LIMITS.picture_book.panels;

            if (panelsGenerated >= limit) {
                return NextResponse.json({
                    error: 'preview_limit',
                    message: `Preview limit reached. You've generated ${panelsGenerated} panels. Upgrade to unlock the full book!`,
                    panelsGenerated,
                    limit,
                    upgradeUrl: `/book/${id}?upgrade=true`,
                }, { status: 402 });
            }
        }

        // 2. Get the outline which contains the scenes
        const outline = book.outline as { chapters: VisualChapter[] } | null;
        if (!outline || !outline.chapters) {
            return NextResponse.json({ error: 'Outline not generated yet' }, { status: 400 });
        }

        // 3. Trigger background processing
        // In Vercel, we can't spawn a true detached process easily in serverless,
        // but we can rely on the client initially calling this, or use QStash/Inngest in a real prod app.
        // For this implementation, we will perform a "generate next batch" approach OR a long-running loop
        // if the timeout allows. Given the user wants "background" behavior, we'll try to process
        // as many as possible within the timeout, and the client (if open) or a cron could re-trigger.
        // HOWEVER, the user specifically asked "let it run even if they leave".
        // The only way to guarantee this on standard Vercel serverless functions without external queues
        // is to start a loop that runs until completion or timeout.

        // We will start the generation loop here.
        // Note: This endpoint should be called *once* after outline is ready.

        let maxIllustrations = (bookFormat === 'comic_book' || bookFormat === 'comic' || book.dialogueStyle === 'bubbles' || book.bookPreset === 'comic_story') ? 24 : 20;

        // For free tier users, limit to 5 panels
        if (!canGenerate) {
            maxIllustrations = FREE_TIER_LIMITS.picture_book.panels;
        }

        // Filter chapters to target constraint
        const targetChapters = outline.chapters.slice(0, maxIllustrations);

        // 4. Start concurrent generation with a limit
        // We'll use a pool-like concurrency
        const CONCURRENCY = 3;
        let activeGenerations = 0;

        // Track what we've already done to skip - include both completed AND failed illustrations
        // Use position AND chapterId to prevent duplicate generation
        const existingPanelNumbers = new Set<number>();
        const existingChapterIds = new Set<string>();
        for (const ill of book.illustrations) {
            if (ill.position && ill.position > 0) existingPanelNumbers.add(ill.position);
            if (ill.chapterId) existingChapterIds.add(ill.chapterId);
        }

        // Also load chapter IDs to cross-reference
        const chapterRecords = await prisma.chapter.findMany({
            where: { bookId: id },
            select: { id: true, number: true },
        });
        const chapterIdByNumber = new Map(chapterRecords.map(c => [c.number, c.id]));

        const pendingChapters = targetChapters.filter(ch => {
            if (existingPanelNumbers.has(ch.number)) return false;
            const chId = chapterIdByNumber.get(ch.number);
            if (chId && existingChapterIds.has(chId)) return false;
            return true;
        });

        // Get visual guides from book data for consistency and copyright protection
        const characterVisualGuide = book.characterVisualGuide as any;
        const visualStyleGuide = book.visualStyleGuide as any;
        const characterPortraits = book.characterPortraits as Array<{characterName: string; facePortrait: string; fullBodyPortrait: string}> | null;

        // Track character first appearances for reference images (FALLBACK if no portraits)
        // Map of characterName -> { panelNumber, imageData }
        const characterFirstAppearances = new Map<string, { panelNumber: number; imageData: string }>();

        // Load existing illustrations to populate character first appearances (fallback)
        if (!characterPortraits || characterPortraits.length === 0) {
            console.log('[Visual Gen] No character portraits found, using first appearances as references');
            for (const illustration of book.illustrations) {
                if (illustration.imageUrl && illustration.position) {
                    // Extract which characters appear in this panel from the scene
                    const panelChapter = targetChapters.find(ch => ch.number === illustration.position);
                    if (panelChapter?.scene?.characters) {
                        for (const charName of panelChapter.scene.characters) {
                            if (!characterFirstAppearances.has(charName)) {
                                characterFirstAppearances.set(charName, {
                                    panelNumber: illustration.position,
                                    imageData: illustration.imageUrl
                                });
                            }
                        }
                    }
                }
            }
        } else {
            console.log(`[Visual Gen] Using ${characterPortraits.length} character portraits as references`);
        }

        if (pendingChapters.length === 0) {
            // All done! Trigger assembly!
            // We can call the assemble endpoint logic directly or fetch it
            const assembleUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/books/${id}/assemble`;
            await fetch(assembleUrl, { method: 'POST' });
            return NextResponse.json({ message: 'All panels completed, assembly triggered' });
        }

        // Since we can't genuinely "detach" in a simple Next.js API route without blocking the response until finished (which risks timeout),
        // we will process what we can. 
        // CRITICAL: The user wants it to run *even if they leave*. 
        // To achieve this on Vercel without timeouts killing it mid-way is hard without a queue.
        // BUT we can use `waitUntil` if on Vercel Edge, strictly speaking nodejs functions wait.
        // Best effort: We loop and generate. If the client disconnects, the serverless function *might* still run 
        // until `maxDuration` (5 mins). 
        // 5 mins is usually enough for 20 images if done in parallel batches of 3-4.

        console.log(`Starting background generation for book ${id}. Pending: ${pendingChapters.length}`);

        // Track generation start time for timeout protection
        const generationStartTime = Date.now();

        // Update status to generating
        await prisma.book.update({
            where: { id },
            data: { status: 'generating' }
        });

        // Helper to check if we're approaching timeout
        const isApproachingTimeout = () => {
            const elapsed = Date.now() - generationStartTime;
            return elapsed > MAX_GENERATION_TIME_MS;
        };

        // We accept the request and process "in background" (by not awaiting the full promise if we could, 
        // but Vercel freezes execution if we return. So we MUST await, but we can return a "Processing" status 
        // and let the client poll, knowing the specific invocation will run for 5 mins).

        // Actually, to support "user leaves", we should perform the work and THEN return, 
        // or return a stream. But a standard POST waits.
        // If the user *closes the tab*, the request cancels? 
        // Not necessarily if the server has received it. 

        // Let's implement the loop.
        const results = [];

        // Helper to generate one panel - returns panel number on success, null on failure
        // On failure, creates a failed illustration record for later retry
        const generateOne = async (chapter: VisualChapter): Promise<{ success: boolean; panelNumber: number; error?: string }> => {
            try {
                if (!chapter.scene) {
                    return { success: false, panelNumber: chapter.number, error: 'No scene data' };
                }

                // Check timeout before starting expensive generation
                if (isApproachingTimeout()) {
                    console.log(`[Visual Gen] Timeout approaching, skipping panel ${chapter.number}`);
                    return { success: false, panelNumber: chapter.number, error: 'timeout_approaching' };
                }

                // Determine if we need text baked into the image
                const isComicStyle = book.dialogueStyle === 'bubbles';
                const hasDialogue = isComicStyle && chapter.dialogue && chapter.dialogue.length > 0;
                const hasNarration = !!chapter.text && chapter.text.trim().length > 0;
                const isPictureBook = bookFormat === 'picture_book' && !isComicStyle;
                const hasStoryText = isPictureBook && hasNarration;
                const needsTextBaking = !!(hasDialogue || hasStoryText || (isComicStyle && hasNarration));

                let illustrationPrompt = buildIllustrationPromptFromScene(
                    chapter.scene,
                    book.artStyle || 'illustration',
                    characterVisualGuide || undefined,
                    visualStyleGuide || undefined,
                    chapter.panelLayout,
                    { skipNoTextInstruction: needsTextBaking, contentRating: (book.contentRating || 'general') as ContentRating }
                );

                if (hasDialogue && chapter.dialogue) {
                    const bubbles: DialogueEntry[] = chapter.dialogue.map(d => ({
                        speaker: d.speaker,
                        text: d.text,
                        position: d.position as any,
                        type: d.type as any,
                    }));
                    illustrationPrompt += buildSpeechBubblePrompt(bubbles);

                    // Also add narration box if page has narration text
                    if (isComicStyle && hasNarration) {
                        illustrationPrompt += `\n\nNARRATION BOX (IMPORTANT):\nInclude a rectangular narration caption box at the TOP of the image with this text:\n"${chapter.text.trim().slice(0, 150)}"\n\nStyle: Clean rectangular box with subtle background (yellow/cream or white), dark text, positioned at the top of the image.`;
                    }
                } else if (isComicStyle && hasNarration) {
                    // Comic page with narration but no dialogue
                    illustrationPrompt += `\n\nNARRATION BOX (IMPORTANT):\nInclude a rectangular narration caption box at the TOP of the image with this text:\n"${chapter.text.trim().slice(0, 150)}"\n\nStyle: Clean rectangular box with subtle background (yellow/cream or white), dark text, positioned at the top of the image.\n\nDo NOT include any other text except this narration box.`;
                } else if (hasStoryText) {
                    // Pass textPosition and pageStyle from the new pipeline if available
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const textPos = (chapter as any).textPosition as string | undefined;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pageSty = (chapter as any).pageStyle as string | undefined;
                    illustrationPrompt += buildPictureBookTextPrompt(chapter.text, textPos, pageSty);
                } else if (isPictureBook) {
                    // Picture book page with no text — this should not happen.
                    // Use the chapter summary as fallback narration text
                    const fallbackText = chapter.summary || chapter.title || '';
                    if (fallbackText.trim()) {
                        illustrationPrompt += buildPictureBookTextPrompt(fallbackText);
                        console.warn(`[Visual Gen] Page ${chapter.number}: No text field found, using summary as fallback: "${fallbackText.substring(0, 50)}..."`);
                    } else {
                        illustrationPrompt += `\nCRITICAL: Do NOT include any text, words, letters, numbers, signs, labels, or written characters anywhere in the image.`;
                    }
                } else {
                    illustrationPrompt += `\nCRITICAL: Do NOT include any text, words, letters, numbers, signs, labels, or written characters anywhere in the image.`;
                }

                // Build reference images for characters
                // PRIORITY 0: Protagonist photo (uploaded by user - highest priority)
                // PRIORITY 1: Character portraits (generated)
                // PRIORITY 2: First appearance (fallback)
                const referenceImages: { characterName: string; imageData: string }[] = [];
                const MAX_PORTRAIT_CHARACTERS = 2;
                let portraitCount = 0;

                // PRIORITY 0: If user uploaded a protagonist photo, use the styled version as reference
                const protagonistStyled = book.protagonistStyled as string | null;
                const characters = book.characters as Array<{ name: string; description: string }> | null;
                const mainCharName = characters?.[0]?.name;

                // Case-insensitive check for protagonist in scene
                const sceneCharsLower = chapter.scene.characters?.map((c: string) => c.toLowerCase()) || [];
                const protagonistInScene = mainCharName && sceneCharsLower.includes(mainCharName.toLowerCase());

                if (protagonistStyled && mainCharName && protagonistInScene) {
                    referenceImages.push({
                        characterName: `${mainCharName} (MUST match this face exactly)`,
                        imageData: protagonistStyled,
                    });
                    portraitCount++;
                    // Also add the protagonist description to the prompt for extra emphasis
                    const protagonistDesc = book.protagonistDescription as string | null;
                    if (protagonistDesc) {
                        illustrationPrompt += `\n\nPROTAGONIST REFERENCE (CRITICAL - EXACT MATCH REQUIRED):\n${protagonistDesc}\n\nCONSISTENCY RULES FOR "${mainCharName}" (DO NOT DEVIATE):\n- Face, hair, and skin tone must EXACTLY match the reference image\n- Clothing must be the SAME outfit as in the reference image in EVERY panel. Do NOT change their clothes.\n- If the reference does NOT show glasses, do NOT add glasses. If it shows glasses, ALWAYS include them.\n- Do NOT add or remove accessories, hats, jewelry, or any items not in the reference.\n- Body type and build must stay consistent.\n- This is based on a real person's photo. Accuracy is non-negotiable.`;
                    }
                    console.log(`[Visual Gen] Panel ${chapter.number}: Using protagonist photo reference for "${mainCharName}"`);
                }

                if (chapter.scene.characters && Array.isArray(chapter.scene.characters)) {
                    for (const charName of chapter.scene.characters) {
                        // Skip main character if we already added protagonist photo
                        if (protagonistStyled && mainCharName && charName.toLowerCase() === mainCharName.toLowerCase()) continue;

                        // PRIORITY 1: Use character portraits if available (canonical references)
                        if (characterPortraits && characterPortraits.length > 0) {
                            const portrait = characterPortraits.find(p =>
                                p.characterName.toLowerCase() === charName.toLowerCase()
                            );
                            if (portrait && portrait.facePortrait && portraitCount < MAX_PORTRAIT_CHARACTERS) {
                                // Only add face portrait if multiple characters (to reduce payload)
                                // Add both if only 1-2 characters in scene
                                const sceneCharCount = chapter.scene.characters.length;
                                if (sceneCharCount <= 2) {
                                    referenceImages.push({
                                        characterName: `${charName} (face reference)`,
                                        imageData: portrait.facePortrait
                                    });
                                    referenceImages.push({
                                        characterName: `${charName} (body reference)`,
                                        imageData: portrait.fullBodyPortrait
                                    });
                                } else {
                                    // Multiple characters - only send face portrait to save space
                                    referenceImages.push({
                                        characterName: `${charName} (face reference)`,
                                        imageData: portrait.facePortrait
                                    });
                                }
                                portraitCount++;
                                console.log(`[Visual Gen] Panel ${chapter.number}: Using portrait references for "${charName}"${sceneCharCount > 2 ? ' (face only - multi-char scene)' : ''}`);
                            } else if (portrait) {
                                console.log(`[Visual Gen] Panel ${chapter.number}: Skipping portrait for "${charName}" (limit reached, using visual guide)`);
                            } else {
                                console.log(`[Visual Gen] Panel ${chapter.number}: No portrait found for "${charName}", will use visual guide only`);
                            }
                        }
                        // PRIORITY 2: Fallback to first appearance if no portraits
                        else {
                            const firstAppearance = characterFirstAppearances.get(charName);
                            if (firstAppearance && firstAppearance.panelNumber < chapter.number && portraitCount < MAX_PORTRAIT_CHARACTERS) {
                                // This character appeared before - use their first image as reference
                                referenceImages.push({
                                    characterName: charName,
                                    imageData: firstAppearance.imageData
                                });
                                portraitCount++;
                                console.log(`[Visual Gen] Panel ${chapter.number}: Using first appearance for "${charName}" from panel ${firstAppearance.panelNumber}`);
                            }
                        }
                    }
                }

                // Use shared utility with validation (checks for text + relevance)
                const expectedText = chapter.text?.trim() || chapter.summary || null;
                const genResult = await generateAndValidateIllustration({
                    scene: illustrationPrompt,
                    artStyle: book.artStyle || 'illustration',
                    bookTitle: book.title,
                    chapterTitle: chapter.title || `Panel ${chapter.number}`,
                    setting: chapter.scene.background,
                    bookFormat: bookFormat,
                    characterVisualGuide: characterVisualGuide,
                    visualStyleGuide: visualStyleGuide,
                    referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                    expectedText,
                });

                // Build genData format to match existing code below
                const genData = genResult ? (() => {
                    // Extract MIME type from data URL instead of hardcoding
                    const mimeMatch = genResult.imageUrl.match(/^data:image\/([a-z]+);base64,/i);
                    const mimeType = mimeMatch ? `image/${mimeMatch[1]}` : 'image/png';
                    const base64 = genResult.imageUrl.replace(/^data:image\/\w+;base64,/, '');
                    return {
                        image: { mimeType, base64 }
                    };
                })() : null;

                // Ensure Chapter exists to link to (do this regardless of success/failure)
                let chapterId = null;
                const existingChapter = await prisma.chapter.findUnique({
                    where: {
                        bookId_number: {
                            bookId: id,
                            number: chapter.number
                        }
                    }
                });

                if (existingChapter) {
                    chapterId = existingChapter.id;
                } else {
                    const newChapter = await prisma.chapter.create({
                        data: {
                            bookId: id,
                            number: chapter.number,
                            title: chapter.title || `Panel ${chapter.number}`,
                            content: chapter.text || '',
                            summary: chapter.scene.description,
                            wordCount: (chapter.text || '').split(/\s+/).length,
                            sceneDescription: chapter.scene as any,
                            dialogue: chapter.dialogue as any,
                        }
                    });
                    chapterId = newChapter.id;
                }

                if (genData?.image) {
                    // Save successful illustration to DB
                    const imageUrl = `data:${genData.image.mimeType};base64,${genData.image.base64}`;
                    await prisma.illustration.create({
                        data: {
                            bookId: id,
                            chapterId: chapterId,
                            position: chapter.number,
                            prompt: illustrationPrompt,
                            imageUrl: imageUrl,
                            altText: chapter.scene.description.slice(0, 200),
                            status: 'completed',
                            retryCount: 0,
                        }
                    });

                    // Update character first appearances for future reference
                    if (chapter.scene.characters && Array.isArray(chapter.scene.characters)) {
                        for (const charName of chapter.scene.characters) {
                            if (!characterFirstAppearances.has(charName)) {
                                characterFirstAppearances.set(charName, {
                                    panelNumber: chapter.number,
                                    imageData: imageUrl
                                });
                                console.log(`[Visual Gen] Stored first appearance for "${charName}" in panel ${chapter.number}`);
                            }
                        }
                    }

                    return { success: true, panelNumber: chapter.number };
                } else {
                    // Generation failed - create a failed illustration record for retry
                    const errorMessage = 'Content blocked by safety filter or API rate limit exhausted';
                    console.log(`[Visual Gen] Panel ${chapter.number} failed, creating failed record for retry`);

                    await prisma.illustration.create({
                        data: {
                            bookId: id,
                            chapterId: chapterId,
                            position: chapter.number,
                            prompt: illustrationPrompt,
                            imageUrl: null, // No image yet
                            altText: chapter.scene.description.slice(0, 200),
                            status: 'failed',
                            errorMessage: errorMessage,
                            retryCount: 0,
                        }
                    });

                    return { success: false, panelNumber: chapter.number, error: errorMessage };
                }
            } catch (e: any) {
                const errorMsg = e?.message || 'Unknown error';
                console.error(`[Visual Gen] FAILED panel ${chapter.number}: ${errorMsg}`);

                // Create failed illustration record for retry
                try {
                    // First ensure chapter exists
                    let chapterId = null;
                    const existingChapter = await prisma.chapter.findUnique({
                        where: { bookId_number: { bookId: id, number: chapter.number } }
                    });
                    if (existingChapter) {
                        chapterId = existingChapter.id;
                    } else if (chapter.scene) {
                        const newChapter = await prisma.chapter.create({
                            data: {
                                bookId: id,
                                number: chapter.number,
                                title: chapter.title || `Panel ${chapter.number}`,
                                content: chapter.text || '',
                                summary: chapter.scene.description || 'Panel',
                                wordCount: (chapter.text || '').split(/\s+/).length,
                                sceneDescription: chapter.scene as any,
                                dialogue: chapter.dialogue as any,
                            }
                        });
                        chapterId = newChapter.id;
                    }

                    // Check if illustration already exists (avoid duplicates)
                    const existingIllustration = await prisma.illustration.findFirst({
                        where: { bookId: id, position: chapter.number }
                    });

                    if (!existingIllustration) {
                        await prisma.illustration.create({
                            data: {
                                bookId: id,
                                chapterId: chapterId,
                                position: chapter.number,
                                prompt: `Scene: ${chapter.scene?.description || 'Unknown'}`,
                                imageUrl: null,
                                status: 'failed',
                                errorMessage: errorMsg.substring(0, 500),
                                retryCount: 0,
                            }
                        });
                    }
                } catch (dbError) {
                    console.error(`[Visual Gen] Failed to save failure record for panel ${chapter.number}:`, dbError);
                }

                return { success: false, panelNumber: chapter.number, error: errorMsg };
            }
        };

        // Process panels ONE AT A TIME, sequentially
        // Stop on first failure so user can review, edit prompt, and retry
        // No wasted API calls, no duplicates, no mystery failures
        let totalFailures = 0;
        let totalSuccesses = 0;
        let stoppedDueToTimeout = false;
        let stoppedDueToFailure = false;

        for (let i = 0; i < pendingChapters.length; i++) {
            // Check timeout
            if (isApproachingTimeout()) {
                console.log(`[Visual Gen] Timeout approaching after ${Math.floor((Date.now() - generationStartTime) / 1000)}s, stopping`);
                stoppedDueToTimeout = true;
                break;
            }

            // Heartbeat update
            await prisma.book.update({
                where: { id },
                data: { status: 'generating' },
            });

            const chapter = pendingChapters[i];
            console.log(`[Visual Gen] Generating panel ${chapter.number} of ${targetChapters.length} (${i + 1}/${pendingChapters.length} pending)...`);

            const result = await generateOne(chapter);

            if (result.success) {
                totalSuccesses++;
            } else {
                totalFailures++;
                // Stop on first failure — let user see the error and retry/edit
                console.log(`[Visual Gen] Panel ${chapter.number} failed, stopping generation. User can retry.`);
                stoppedDueToFailure = true;
                break;
            }

            // Log progress
            console.log(`[Visual Gen] Panel ${chapter.number} done. ${totalSuccesses} success, ${totalFailures} failed of ${targetChapters.length} total`);
        }

        // Check completion status
        const successfulPanels = await prisma.illustration.count({
            where: { bookId: id, status: 'completed' }
        });
        const failedPanels = await prisma.illustration.count({
            where: { bookId: id, status: 'failed' }
        });
        const totalPanels = successfulPanels + failedPanels;

        console.log(`[Visual Gen] Generation finished: ${successfulPanels} success, ${failedPanels} failed of ${targetChapters.length} total`);

        // Stopped due to timeout or failure — mark as failed so user can retry
        if (stoppedDueToTimeout || stoppedDueToFailure) {
            const reason = stoppedDueToFailure
                ? `Panel generation failed. ${successfulPanels} of ${targetChapters.length} panels completed. Retry to continue.`
                : `Generation paused due to timeout. ${successfulPanels} panels completed. Retry to continue.`;

            await prisma.book.update({
                where: { id },
                data: { status: 'failed', errorMessage: reason },
            });

            return NextResponse.json({
                success: false,
                status: stoppedDueToFailure ? 'stopped_on_failure' : 'timeout',
                panelsCompleted: successfulPanels,
                panelsFailed: failedPanels,
                panelsRemaining: targetChapters.length - totalPanels,
                message: reason,
            });
        }

        // Check if all panels are processed (either success or fail)
        if (totalPanels >= Math.min(targetChapters.length, maxIllustrations)) {
            // Check if this is a free tier preview (not fully paid)
            if (!canGenerate) {
                console.log(`[Visual Gen] Free tier preview complete for book ${id}: ${successfulPanels} success, ${failedPanels} failed`);

                // Mark book as preview_complete so user can see their sample and download it
                await prisma.book.update({
                    where: { id },
                    data: {
                        status: 'preview_complete',
                        currentChapter: successfulPanels,
                        completedAt: new Date(),
                    },
                });

                return NextResponse.json({
                    success: true,
                    status: failedPanels > 0 ? 'preview_with_failures' : 'preview_complete',
                    panelsGenerated: successfulPanels,
                    panelsFailed: failedPanels,
                    message: failedPanels > 0
                        ? `Preview complete with ${failedPanels} failed panel(s). Retry them or upgrade to unlock the full book!`
                        : 'Preview generation complete. Upgrade to unlock the full book!',
                });
            }

            // All panels have been attempted - check if any failed
            if (failedPanels > 0) {
                console.log(`[Visual Gen] Book ${id} has ${failedPanels} failed panels that need retry`);

                // Set book status to failed so user sees the issue and can retry
                await prisma.book.update({
                    where: { id },
                    data: {
                        status: 'failed',
                        errorMessage: `${failedPanels} panel(s) failed to generate. Click retry to regenerate them.`,
                    },
                });

                return NextResponse.json({
                    success: false,
                    status: 'completed_with_failures',
                    panelsCompleted: successfulPanels,
                    panelsFailed: failedPanels,
                    message: `${failedPanels} panel(s) failed. Retry to regenerate them.`,
                });
            }

            // ALL panels successful - only then proceed with assembly
            const assembleUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/books/${id}/assemble`;
            await fetch(assembleUrl, { method: 'POST' });
            return NextResponse.json({ success: true, status: 'completed', panelsCompleted: successfulPanels });
        }

        // If we have some panels but not all processed yet
        if (successfulPanels === 0 && failedPanels === 0 && pendingChapters.length > 0) {
            // No panels at all - complete failure. Auto-refund credits.
            console.error(`[Visual Gen] ALL panels failed for book ${id}. Marking as failed and refunding.`);
            await prisma.book.update({
                where: { id },
                data: {
                    status: 'failed',
                    errorMessage: 'All panel generations failed. Your credits have been refunded. Please try again.',
                },
            });

            // Auto-refund credits
            if (book.userId && book.paymentMethod === 'credits') {
                const { getCreditCost } = await import('@/lib/constants');
                const cost = getCreditCost(book.bookPreset);
                await prisma.user.update({
                    where: { id: book.userId },
                    data: { creditBalance: { increment: cost } },
                });
                console.log(`[Visual Gen] Refunded ${cost} credits to user ${book.userId}`);
            }
            return NextResponse.json({ error: 'All panel generations failed. Credits refunded.', status: 'failed', refunded: true }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            status: 'partial',
            panelsCompleted: successfulPanels,
            panelsFailed: failedPanels,
            panelsRemaining: targetChapters.length - totalPanels,
        });

    } catch (err: any) {
        const errorMsg = err?.message || 'Unknown error';
        console.error(`[Visual Gen] Background generation error for book ${id}: ${errorMsg}`);

        // Mark book as failed and auto-refund
        try {
            const failedBook = await prisma.book.update({
                where: { id },
                data: {
                    status: 'failed',
                    errorMessage: `Generation failed: ${errorMsg.substring(0, 200)}. Credits refunded.`,
                },
            });
            console.log(`[Visual Gen] Marked book ${id} as failed`);

            // Auto-refund credits
            if (failedBook.userId && failedBook.paymentMethod === 'credits') {
                const { getCreditCost } = await import('@/lib/constants');
                const cost = getCreditCost(failedBook.bookPreset);
                await prisma.user.update({
                    where: { id: failedBook.userId },
                    data: { creditBalance: { increment: cost } },
                });
                console.log(`[Visual Gen] Refunded ${cost} credits to user ${failedBook.userId}`);
            }
        } catch (updateErr) {
            console.error('[Visual Gen] Failed to update book status:', updateErr);
        }

        return NextResponse.json({ error: errorMsg, refunded: true }, { status: 500 });
    }
}
