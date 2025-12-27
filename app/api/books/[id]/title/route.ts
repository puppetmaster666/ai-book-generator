import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Lightweight endpoint to get just the book title.
 * Used by the header notification badge.
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
        title: true,
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ title: book.title });
  } catch (error) {
    console.error('Error fetching book title:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book title' },
      { status: 500 }
    );
  }
}
