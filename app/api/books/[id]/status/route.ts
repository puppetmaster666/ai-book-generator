import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Lightweight status endpoint for polling during book generation.
 * Returns only essential fields to minimize database transfer.
 *
 * Full book fetch: ~6MB (with illustrations)
 * This endpoint: ~2KB
 */
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
        // Only count chapters/illustrations, don't fetch content
        _count: {
          select: {
            chapters: true,
            illustrations: true,
          },
        },
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: {
        id: book.id,
        status: book.status,
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
