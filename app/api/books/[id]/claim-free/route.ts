import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCreditCost } from '@/lib/constants';

// POST /api/books/[id]/claim-free
// Claims a book using user's credits or free sample
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, freeBookUsed: true, freeCredits: true, credits: true, creditBalance: true },
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
      // No body or invalid JSON, default to free preview
    }

    // Get the book
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, userId: true, paymentStatus: true, status: true, bookPreset: true },
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

    const creditCost = getCreditCost(book.bookPreset);

    console.log(`[claim-free] User ${session.user.id}: creditBalance=${user.creditBalance}, freeCredits=${user.freeCredits}, credits=${user.credits}, freeBookUsed=${user.freeBookUsed}, useCredits=${useCredits}, creditCost=${creditCost}`);

    if (useCredits) {
      // CREDIT CONSUMPTION: User explicitly chose to use credits
      const hasEnoughCredits = user.creditBalance >= creditCost;
      // Legacy fallback: old credits/freeCredits system
      const hasLegacyCredits = user.credits > 0 || user.freeCredits > 0;

      if (!hasEnoughCredits && !hasLegacyCredits) {
        return NextResponse.json({
          error: 'Not enough credits',
          creditCost,
          creditBalance: user.creditBalance,
        }, { status: 400 });
      }

      if (hasEnoughCredits) {
        // New credit system: deduct creditBalance by cost
        await prisma.$transaction([
          prisma.book.update({
            where: { id: bookId },
            data: {
              userId: session.user.id,
              paymentStatus: 'completed',
              paymentMethod: 'credits',
            },
          }),
          prisma.user.update({
            where: { id: session.user.id },
            data: { creditBalance: { decrement: creditCost } },
          }),
        ]);
      } else {
        // Legacy: deduct old credits (1 credit = 1 book)
        const useSubCredit = user.credits > 0;
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
      }

      return NextResponse.json({
        success: true,
        message: 'Book claimed with credits. Full access!',
        bookId,
        isFullAccess: true,
        creditType: 'credits',
        creditCost,
      });
    }

    // FREE PREVIEW: Default path (signup flow)
    if (user.freeBookUsed) {
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
        data: { freeBookUsed: true },
      }),
    ]);

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
