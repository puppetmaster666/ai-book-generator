import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get userId from body or from session
    let userId = body.userId;

    if (!userId) {
      const session = await auth();
      userId = session?.user?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
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
