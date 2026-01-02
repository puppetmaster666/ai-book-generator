
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
import { BOOK_PRESETS, type BookPresetKey } from '@/lib/constants';
import { generateIllustrationWithRetry } from '@/lib/illustration-utils';

// Set max duration for this background task (5 minutes is Vercel Pro limit)
export const maxDuration = 300;

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
            include: { chapters: true, illustrations: true },
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

        const maxIllustrations = (bookFormat === 'comic_book' || bookFormat === 'comic' || book.dialogueStyle === 'bubbles' || book.bookPreset === 'comic_story') ? 24 : 20;

        // Filter chapters to target constraint
        const targetChapters = outline.chapters.slice(0, maxIllustrations);

        // 4. Start concurrent generation with a limit
        // We'll use a pool-like concurrency
        const CONCURRENCY = 3;
        let activeGenerations = 0;

        // Track what we've already done to skip
        const existingPanelNumbers = new Set(
            book.illustrations.map(i => i.position || 0)
        );

        const pendingChapters = targetChapters.filter(ch => !existingPanelNumbers.has(ch.number));

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

        console.log(`Starting background generation for book ${id}. Pening: ${pendingChapters.length}`);

        // Update status to generating
        await prisma.book.update({
            where: { id },
            data: { status: 'generating' }
        });

        // We accept the request and process "in background" (by not awaiting the full promise if we could, 
        // but Vercel freezes execution if we return. So we MUST await, but we can return a "Processing" status 
        // and let the client poll, knowing the specific invocation will run for 5 mins).

        // Actually, to support "user leaves", we should perform the work and THEN return, 
        // or return a stream. But a standard POST waits.
        // If the user *closes the tab*, the request cancels? 
        // Not necessarily if the server has received it. 

        // Let's implement the loop.
        const results = [];

        // Helper to generate one panel
        const generateOne = async (chapter: VisualChapter) => {
            try {
                if (!chapter.scene) return null;

                // Determine if we need text baked into the image
                const hasDialogue = book.dialogueStyle === 'bubbles' && chapter.dialogue && chapter.dialogue.length > 0;
                const isPictureBook = bookFormat === 'picture_book' && !hasDialogue;
                const hasStoryText = isPictureBook && !!chapter.text && chapter.text.trim().length > 0;
                const needsTextBaking = !!(hasDialogue || hasStoryText);

                let illustrationPrompt = buildIllustrationPromptFromScene(
                    chapter.scene,
                    book.artStyle || 'illustration', // fallback
                    undefined,
                    undefined,
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
                } else if (hasStoryText) {
                    illustrationPrompt += buildPictureBookTextPrompt(chapter.text);
                } else {
                    illustrationPrompt += `\nCRITICAL: Do NOT include any text, words, letters, numbers, signs, labels, or written characters anywhere in the image.`;
                }

                // Build reference images for characters - PREFER portraits, fallback to first appearances
                const referenceImages = [];
                if (chapter.scene.characters && Array.isArray(chapter.scene.characters)) {
                    for (const charName of chapter.scene.characters) {
                        // PRIORITY 1: Use character portraits if available (canonical references)
                        if (characterPortraits && characterPortraits.length > 0) {
                            const portrait = characterPortraits.find(p =>
                                p.characterName.toLowerCase() === charName.toLowerCase()
                            );
                            if (portrait) {
                                // Add both face and full body portraits for maximum consistency
                                referenceImages.push({
                                    characterName: `${charName} (face reference)`,
                                    imageData: portrait.facePortrait
                                });
                                referenceImages.push({
                                    characterName: `${charName} (body reference)`,
                                    imageData: portrait.fullBodyPortrait
                                });
                                console.log(`[Visual Gen] Panel ${chapter.number}: Using portrait references for "${charName}"`);
                            } else {
                                console.log(`[Visual Gen] Panel ${chapter.number}: No portrait found for "${charName}", will use visual guide only`);
                            }
                        }
                        // PRIORITY 2: Fallback to first appearance if no portraits
                        else {
                            const firstAppearance = characterFirstAppearances.get(charName);
                            if (firstAppearance && firstAppearance.panelNumber < chapter.number) {
                                // This character appeared before - use their first image as reference
                                referenceImages.push({
                                    characterName: charName,
                                    imageData: firstAppearance.imageData
                                });
                                console.log(`[Visual Gen] Panel ${chapter.number}: Using first appearance for "${charName}" from panel ${firstAppearance.panelNumber}`);
                            }
                        }
                    }
                }

                // Use shared utility with robust retry/fallback logic
                const genResult = await generateIllustrationWithRetry({
                    scene: illustrationPrompt,
                    artStyle: book.artStyle || 'illustration',
                    bookTitle: book.title,
                    chapterTitle: chapter.title || `Panel ${chapter.number}`,
                    setting: chapter.scene.background,
                    bookFormat: bookFormat,
                    characterVisualGuide: characterVisualGuide,
                    visualStyleGuide: visualStyleGuide,
                    referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
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

                if (genData?.image) {
                    // Ensure Chapter exists to link to
                    // For visual books, chapters are often created on the fly or might not exist yet if only outline exists.
                    // We typically want to create the chapter record to hold the text/summary too.
                    let chapterId = null;

                    // Try to find or create chapter
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

                    // Save to DB
                    // Note: illustration model uses 'position' and 'chapterId'
                    const imageUrl = `data:${genData.image.mimeType};base64,${genData.image.base64}`;
                    await prisma.illustration.create({
                        data: {
                            bookId: id,
                            chapterId: chapterId,
                            position: chapter.number, // Using position to store the sequence order/page number
                            prompt: illustrationPrompt,
                            imageUrl: imageUrl,
                            altText: chapter.scene.description.slice(0, 200),
                        }
                    });

                    // Update character first appearances for future reference
                    // Any character appearing in this panel for the first time gets stored
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

                    return chapter.number;
                }
            } catch (e: any) {
                const errorMsg = e?.message || 'Unknown error';
                console.error(`[Visual Gen] FAILED panel ${chapter.number}: ${errorMsg}`);
                // Track failures but don't throw - let other panels continue
            }
            return null;
        };

        // Process all pending in parallel batches
        // We do ALL of them. The 5 min timeout is the hard limit.
        let totalFailures = 0;
        for (let i = 0; i < pendingChapters.length; i += CONCURRENCY) {
            const chunk = pendingChapters.slice(i, i + CONCURRENCY);
            const results = await Promise.all(chunk.map(ch => generateOne(ch)));
            totalFailures += results.filter(r => r === null).length;

            // Log progress
            const completed = await prisma.illustration.count({ where: { bookId: id } });
            console.log(`[Visual Gen] Batch complete: ${completed}/${targetChapters.length} panels done, ${totalFailures} failures`);
        }

        // Check completion again
        const finalCount = await prisma.illustration.count({ where: { bookId: id } });
        console.log(`[Visual Gen] Generation finished: ${finalCount}/${targetChapters.length} panels, ${totalFailures} failures`);

        if (finalCount >= Math.min(targetChapters.length, maxIllustrations)) {
            // Assemble
            const assembleUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/books/${id}/assemble`;
            await fetch(assembleUrl, { method: 'POST' });
            return NextResponse.json({ success: true, status: 'completed' });
        }

        // If we have some panels but not all, check if it's a total failure
        if (finalCount === 0 && pendingChapters.length > 0) {
            // All panels failed - mark book as failed
            console.error(`[Visual Gen] ALL panels failed for book ${id}. Marking as failed.`);
            await prisma.book.update({
                where: { id },
                data: {
                    status: 'failed',
                    errorMessage: 'All panel generations failed. API keys may be exhausted. Please try again later.',
                },
            });
            return NextResponse.json({ error: 'All panel generations failed', status: 'failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, status: 'partial', produced: finalCount, failures: totalFailures });

    } catch (err: any) {
        const errorMsg = err?.message || 'Unknown error';
        console.error(`[Visual Gen] Background generation error for book ${id}: ${errorMsg}`);

        // Try to mark book as failed
        try {
            await prisma.book.update({
                where: { id },
                data: {
                    status: 'failed',
                    errorMessage: `Generation failed: ${errorMsg.substring(0, 200)}`,
                },
            });
            console.log(`[Visual Gen] Marked book ${id} as failed`);
        } catch (updateErr) {
            console.error('[Visual Gen] Failed to update book status:', updateErr);
        }

        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
}
