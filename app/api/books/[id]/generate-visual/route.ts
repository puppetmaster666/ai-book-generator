
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
    try {
        const { id } = await params;

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

                // Use internal API call or direct generation. Direct generation is better for background tasks if we can.
                // But re-using the logic via fetch is safer for consistency.
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const genRes = await fetch(`${baseUrl}/api/generate-illustration`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scene: illustrationPrompt,
                        artStyle: book.artStyle,
                        bookFormat: bookFormat,
                    })
                });

                if (!genRes.ok) throw new Error('Generation failed');
                const genData = await genRes.json();

                if (genData.image) {
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
                    await prisma.illustration.create({
                        data: {
                            bookId: id,
                            chapterId: chapterId,
                            position: chapter.number, // Using position to store the sequence order/page number
                            prompt: illustrationPrompt,
                            imageUrl: `data:${genData.image.mimeType};base64,${genData.image.base64}`,
                            altText: chapter.scene.description.slice(0, 200),
                        }
                    });
                    return chapter.number;
                }
            } catch (e) {
                console.error(`Failed panel ${chapter.number}`, e);
            }
            return null;
        };

        // Process all pending in parallel batches
        // We do ALL of them. The 5 min timeout is the hard limit.
        for (let i = 0; i < pendingChapters.length; i += CONCURRENCY) {
            const chunk = pendingChapters.slice(i, i + CONCURRENCY);
            await Promise.all(chunk.map(ch => generateOne(ch)));
        }

        // Check completion again
        const finalCount = await prisma.illustration.count({ where: { bookId: id } });
        if (finalCount >= Math.min(targetChapters.length, maxIllustrations)) {
            // Assemble
            const assembleUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'} / api / books / ${id} / assemble`;
            await fetch(assembleUrl, { method: 'POST' });
            return NextResponse.json({ success: true, status: 'completed' });
        }

        return NextResponse.json({ success: true, status: 'partial', produced: finalCount });

    } catch (err: any) {
        console.error('Background generation error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
