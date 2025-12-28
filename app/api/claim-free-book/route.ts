import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { bookId, email } = await request.json();

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID required' }, { status: 400 });
    }

    // Get the book and check it has a userId
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, userId: true, paymentStatus: true },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (!book.userId) {
      return NextResponse.json({ error: 'Book not associated with a user' }, { status: 400 });
    }

    if (book.paymentStatus === 'completed') {
      return NextResponse.json({ error: 'Book already paid for' }, { status: 400 });
    }

    // Check if user is eligible for free book
    const user = await prisma.user.findUnique({
      where: { id: book.userId },
      select: { freeBookUsed: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.freeBookUsed) {
      return NextResponse.json({ error: 'Free book already used' }, { status: 400 });
    }

    // Mark the free book as used and update the book
    await prisma.$transaction([
      prisma.user.update({
        where: { id: book.userId },
        data: { freeBookUsed: true },
      }),
      prisma.book.update({
        where: { id: bookId },
        data: {
          paymentStatus: 'completed',
          paymentId: `free_${Date.now()}`,
          email: email?.toLowerCase() || undefined,
        },
      }),
    ]);

    // Trigger book generation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/books/${bookId}/generate`, {
      method: 'POST',
    }).catch(console.error);

    return NextResponse.json({ success: true, bookId });
  } catch (error) {
    console.error('Claim free book error:', error);
    return NextResponse.json(
      { error: 'Failed to claim free book' },
      { status: 500 }
    );
  }
}
