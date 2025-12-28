import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Resume book generation from where it left off.
 * This endpoint just updates the status to 'generating' without deleting any chapters.
 * The client-side orchestration will then continue calling /generate-next.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify book exists and has chapters to resume
    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        currentChapter: true,
        totalChapters: true,
        outline: true,
        _count: {
          select: { chapters: true },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Must have an outline to resume
    if (!book.outline) {
      return NextResponse.json({
        error: 'No outline found. Cannot resume - use /generate instead.',
      }, { status: 400 });
    }

    // Update book status to generating and clear error
    await prisma.book.update({
      where: { id },
      data: {
        status: 'generating',
        errorMessage: null,
        generationStartedAt: book.status !== 'generating' ? new Date() : undefined,
      },
    });

    console.log(`Resumed book ${id} from chapter ${book.currentChapter}/${book.totalChapters} (${book._count.chapters} chapters exist)`);

    return NextResponse.json({
      success: true,
      message: `Resumed from chapter ${book.currentChapter}`,
      currentChapter: book.currentChapter,
      totalChapters: book.totalChapters,
      existingChapters: book._count.chapters,
    });
  } catch (error) {
    console.error('Error resuming book generation:', error);
    return NextResponse.json(
      { error: 'Failed to resume generation' },
      { status: 500 }
    );
  }
}
