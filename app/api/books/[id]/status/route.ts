import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Lightweight status endpoint for polling during book generation.
 * Returns only essential fields to minimize database transfer.
 *
 * Full book fetch: ~6MB (with illustrations)
 * This endpoint: ~2KB
 *
 * Also detects stale generations - if a book has been "generating" for 10+ minutes
 * without progress, automatically marks it as failed (handles Vercel timeout cases).
 */

// Stale generation threshold: 10 minutes without progress
const STALE_GENERATION_MS = 10 * 60 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        currentChapter: true,
        totalChapters: true,
        totalWords: true,
        bookFormat: true,
        dialogueStyle: true,
        bookPreset: true,
        artStyle: true,
        completedAt: true,
        generationStartedAt: true,
        updatedAt: true,
        // Only count chapters/illustrations, don't fetch content
        _count: {
          select: {
            chapters: true,
            illustrations: true,
          },
        },
        // Get the most recent chapter creation time to detect staleness
        chapters: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Check for stale generation
    // If book is "generating" but hasn't had any activity in 10+ minutes, mark as failed
    let currentStatus = book.status;
    if (book.status === 'generating') {
      const now = Date.now();

      // Get the most recent activity timestamp
      // Priority: last chapter created > book updatedAt > generationStartedAt
      const lastChapterTime = book.chapters[0]?.createdAt?.getTime() || 0;
      const bookUpdatedTime = book.updatedAt?.getTime() || 0;
      const generationStartTime = book.generationStartedAt?.getTime() || 0;

      const lastActivity = Math.max(lastChapterTime, bookUpdatedTime, generationStartTime);

      if (lastActivity > 0 && (now - lastActivity) > STALE_GENERATION_MS) {
        console.log(`Stale generation detected for book ${id}. Last activity: ${new Date(lastActivity).toISOString()}, now: ${new Date(now).toISOString()}`);

        // Mark book as failed
        await prisma.book.update({
          where: { id },
          data: {
            status: 'failed',
            errorMessage: 'Generation timed out. Please try resuming generation.',
          },
        });

        currentStatus = 'failed';
      }
    }

    return NextResponse.json({
      status: {
        id: book.id,
        status: currentStatus,
        paymentStatus: book.paymentStatus,
        currentChapter: book.currentChapter,
        totalChapters: book.totalChapters,
        totalWords: book.totalWords,
        bookFormat: book.bookFormat,
        dialogueStyle: book.dialogueStyle,
        bookPreset: book.bookPreset,
        artStyle: book.artStyle,
        completedAt: book.completedAt,
        generationStartedAt: book.generationStartedAt,
        chapterCount: book._count.chapters,
        illustrationCount: book._count.illustrations,
      },
    });
  } catch (error) {
    console.error('Error fetching book status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book status' },
      { status: 500 }
    );
  }
}
