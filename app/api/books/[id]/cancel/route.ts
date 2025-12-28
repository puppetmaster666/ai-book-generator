import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Cancel book generation.
 * Sets the book status to 'cancelled' so the client stops orchestrating.
 * Progress (chapters) is preserved for potential retry later.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Only cancel if currently generating
    if (book.status !== 'generating' && book.status !== 'outlining') {
      return NextResponse.json({
        message: 'Book is not currently generating',
        status: book.status,
      });
    }

    // Update book status to cancelled (uses 'failed' status with specific error message)
    await prisma.book.update({
      where: { id },
      data: {
        status: 'failed',
        errorMessage: 'Generation cancelled by user',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Generation cancelled. Progress has been saved.',
    });
  } catch (error) {
    console.error('Error cancelling book generation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel generation' },
      { status: 500 }
    );
  }
}
