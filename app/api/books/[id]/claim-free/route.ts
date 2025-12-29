import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/books/[id]/claim-free
// Claims a book for free using the user's first-book-free offer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookId } = await params;

    // Get user and check eligibility
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, freeBookUsed: true, freeCredits: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has already used their free book
    if (user.freeBookUsed && user.freeCredits <= 0) {
      return NextResponse.json(
        { error: 'Free book already used and no credits available' },
        { status: 400 }
      );
    }

    // Get the book
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        userId: true,
        paymentStatus: true,
        status: true,
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check if book is already claimed by someone else
    if (book.userId && book.userId !== session.user.id) {
      return NextResponse.json({ error: 'Book belongs to another user' }, { status: 403 });
    }

    // Check if book is already paid for
    if (book.paymentStatus === 'completed') {
      return NextResponse.json({ error: 'Book is already paid for' }, { status: 400 });
    }

    // Determine which credit to use
    const useFreeCredit = user.freeCredits > 0;

    // Claim the book: associate with user, mark as paid, use free credit
    await prisma.$transaction([
      // Update book
      prisma.book.update({
        where: { id: bookId },
        data: {
          userId: session.user.id,
          paymentStatus: 'completed',
        },
      }),
      // Update user - use freeCredits if available, otherwise mark freeBookUsed
      ...(useFreeCredit
        ? [
            prisma.user.update({
              where: { id: session.user.id },
              data: {
                freeCredits: { decrement: 1 },
              },
            }),
          ]
        : [
            prisma.user.update({
              where: { id: session.user.id },
              data: {
                freeBookUsed: true,
              },
            }),
          ]),
    ]);

    return NextResponse.json({
      success: true,
      message: useFreeCredit
        ? 'Book claimed using free credit'
        : 'Book claimed using first-book-free offer',
      bookId,
    });
  } catch (error) {
    console.error('Error claiming free book:', error);
    return NextResponse.json({ error: 'Failed to claim book' }, { status: 500 });
  }
}
