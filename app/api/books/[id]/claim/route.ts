import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Require authentication - userId must come from session, not request body
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if book exists
    const book = await prisma.book.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Only claim if book doesn't already have an owner
    if (book.userId && book.userId !== userId) {
      return NextResponse.json(
        { error: 'Book already belongs to another user' },
        { status: 403 }
      );
    }

    // Update book with userId
    await prisma.book.update({
      where: { id },
      data: { userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error claiming book:', error);
    return NextResponse.json(
      { error: 'Failed to claim book' },
      { status: 500 }
    );
  }
}
