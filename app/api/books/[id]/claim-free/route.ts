import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/books/[id]/claim-free
// Claims a book using user's credits (subscription, gifted, or free sample)
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

    // Get user and check eligibility - include subscription credits!
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, freeBookUsed: true, freeCredits: true, credits: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine mode: free preview (signup flow) vs credit consumption (review page)
    let useCredits = false;
    try {
      const body = await request.json();
      useCredits = body.useCredits === true;
    } catch {
      // No body or invalid JSON — default to free preview
    }

    const hasSubscriptionCredits = user.credits > 0;
    const hasGiftedCredits = user.freeCredits > 0;
    const hasFreeSample = !user.freeBookUsed;

    console.log(`[claim-free] User ${session.user.id}: credits=${user.credits}, freeCredits=${user.freeCredits}, freeBookUsed=${user.freeBookUsed}, useCredits=${useCredits}, path=${useCredits && (hasSubscriptionCredits || hasGiftedCredits) ? 'CREDIT' : 'FREE_PREVIEW'}`);

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

    if (book.userId && book.userId !== session.user.id) {
      return NextResponse.json({ error: 'Book belongs to another user' }, { status: 403 });
    }

    if (book.paymentStatus === 'completed') {
      return NextResponse.json({ error: 'Book is already paid for' }, { status: 400 });
    }

    if (useCredits && (hasSubscriptionCredits || hasGiftedCredits)) {
      // CREDIT CONSUMPTION: User explicitly chose to use credits (from review page)
      // This gives FULL access
      const useSubCredit = hasSubscriptionCredits;

      await prisma.$transaction([
        prisma.book.update({
          where: { id: bookId },
          data: {
            userId: session.user.id,
            paymentStatus: 'completed',
            paymentMethod: useSubCredit ? 'subscription_credit' : 'free_credit',
          },
        }),
        prisma.user.update({
          where: { id: session.user.id },
          data: useSubCredit
            ? { credits: { decrement: 1 } }
            : { freeCredits: { decrement: 1 } },
        }),
      ]);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${appUrl}/api/books/${bookId}/generate`, {
        method: 'POST',
      }).catch(console.error);

      return NextResponse.json({
        success: true,
        message: 'Book claimed with credit. Full access!',
        bookId,
        isFullAccess: true,
        creditType: useSubCredit ? 'subscription credit' : 'gifted credit',
      });
    }

    // FREE PREVIEW: Default path (signup flow, or user with no credits)
    if (!hasFreeSample) {
      return NextResponse.json(
        { error: 'Free sample already used. Please upgrade to create more books.' },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.book.update({
        where: { id: bookId },
        data: {
          userId: session.user.id,
          paymentStatus: 'free_preview',
          paymentMethod: 'free_book',
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          freeBookUsed: true,
        },
      }),
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/books/${bookId}/generate`, {
      method: 'POST',
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      message: 'Book claimed as free preview. Upgrade to unlock the full book!',
      bookId,
      isFullAccess: false,
      creditType: 'free preview',
    });
  } catch (error) {
    console.error('Error claiming free book:', error);
    return NextResponse.json({ error: 'Failed to claim book' }, { status: 500 });
  }
}
