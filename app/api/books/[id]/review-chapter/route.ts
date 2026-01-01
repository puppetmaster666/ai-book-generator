import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reviewAndPolishChapter } from '@/lib/gemini';

// This endpoint reviews a chapter in the background
// It's fire-and-forget from the main generation loop
export const maxDuration = 120; // 2 minutes max for review

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: bookId } = await params;

    try {
        const body = await request.json();
        const { chapterId } = body;

        if (!chapterId) {
            return NextResponse.json({ error: 'chapterId required' }, { status: 400 });
        }

        // Get the chapter
        const chapter = await prisma.chapter.findUnique({
            where: { id: chapterId },
            include: { book: { select: { bookType: true, targetWords: true, totalChapters: true } } }
        });

        if (!chapter) {
            return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
        }

        if (chapter.bookId !== bookId) {
            return NextResponse.json({ error: 'Chapter does not belong to this book' }, { status: 403 });
        }

        // Skip if already reviewed
        if (chapter.reviewed) {
            console.log(`[Review] Chapter ${chapter.number} already reviewed, skipping.`);
            return NextResponse.json({ success: true, status: 'already_reviewed' });
        }

        console.log(`[Review] Starting async review for chapter ${chapter.number} of book ${bookId}`);

        // Calculate target words per chapter
        const targetWordsPerChapter = Math.round(
            (chapter.book.targetWords || 60000) / (chapter.book.totalChapters || 20)
        );

        // Run the review
        const reviewResult = await reviewAndPolishChapter(
            chapter.content,
            targetWordsPerChapter,
            chapter.book.bookType || 'fiction'
        );

        if (reviewResult.success) {
            // Update the chapter with reviewed content
            const newWordCount = reviewResult.content.split(/\s+/).filter(w => w.length > 0).length;

            await prisma.chapter.update({
                where: { id: chapterId },
                data: {
                    content: reviewResult.content,
                    wordCount: newWordCount,
                    reviewed: true,
                }
            });

            // Update book's total word count
            const allChapters = await prisma.chapter.findMany({
                where: { bookId },
                select: { wordCount: true }
            });
            const totalWords = allChapters.reduce((sum, ch) => sum + ch.wordCount, 0);

            await prisma.book.update({
                where: { id: bookId },
                data: { totalWords }
            });

            console.log(`[Review] Chapter ${chapter.number} reviewed successfully. Words: ${chapter.wordCount} -> ${newWordCount}`);
            return NextResponse.json({ success: true, status: 'reviewed', wordCount: newWordCount });
        } else {
            // Mark as reviewed even if failed (to avoid retry loops)
            await prisma.chapter.update({
                where: { id: chapterId },
                data: { reviewed: true }
            });

            console.log(`[Review] Chapter ${chapter.number} review failed, marked as reviewed anyway.`);
            return NextResponse.json({ success: true, status: 'review_failed_skipped' });
        }
    } catch (error) {
        console.error('[Review] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Review failed' },
            { status: 500 }
        );
    }
}
