import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/books/[id]/live-preview
 * Returns the current live preview text for a book being generated.
 * Used by the LivePreview component to show AI writing in real-time.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        livePreview: true,
        status: true,
        currentChapter: true,
        totalChapters: true,
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json({
      livePreview: book.livePreview || '',
      status: book.status,
      currentChapter: book.currentChapter,
      totalChapters: book.totalChapters,
      isGenerating: book.status === 'generating',
    });
  } catch (error) {
    console.error('Error fetching live preview:', error);
    return NextResponse.json({ error: 'Failed to fetch live preview' }, { status: 500 });
  }
}
