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

    // Check if user has any credits available
    // Priority: subscription credits > gifted credits > free sample
    const hasSubscriptionCredits = user.credits > 0;
    const hasGiftedCredits = user.freeCredits > 0;
    const hasFreeSample = !user.freeBookUsed;

    if (!hasSubscriptionCredits && !hasGiftedCredits && !hasFreeSample) {
      return NextResponse.json(
        { error: 'No credits available. Please upgrade your plan or purchase credits.' },
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

    // Determine which credit to use (priority: subscription > gifted > free sample)
    // Subscription and gifted credits give FULL access, free sample gives LIMITED preview
    const useSubscriptionCredit = hasSubscriptionCredits;
    const useGiftedCredit = !useSubscriptionCredit && hasGiftedCredits;
    const useFreeSample = !useSubscriptionCredit && !useGiftedCredit && hasFreeSample;
    const isFullAccess = useSubscriptionCredit || useGiftedCredit;

    // Claim the book: associate with user, set appropriate payment status
    // - Subscription/gifted credits: paymentStatus='completed' → FULL book access
    // - Free sample: paymentStatus='free_preview' → LIMITED preview only
    await prisma.$transaction([
      // Update book with appropriate payment status
      prisma.book.update({
        where: { id: bookId },
        data: {
          userId: session.user.id,
          paymentStatus: isFullAccess ? 'completed' : 'free_preview',
          paymentMethod: useSubscriptionCredit
            ? 'subscription_credit'
            : useGiftedCredit
              ? 'free_credit'
              : 'free_book',
        },
      }),
      // Update user credits based on which type was used
      ...(useSubscriptionCredit
        ? [
            prisma.user.update({
              where: { id: session.user.id },
              data: {
                credits: { decrement: 1 },
              },
            }),
          ]
        : useGiftedCredit
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

    // Trigger book generation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/books/${bookId}/generate`, {
      method: 'POST',
    }).catch(console.error);

    const creditType = useSubscriptionCredit
      ? 'subscription credit'
      : useGiftedCredit
        ? 'gifted credit'
        : 'free preview';

    return NextResponse.json({
      success: true,
      message: isFullAccess
        ? `Book claimed using ${creditType} - full book access!`
        : 'Book claimed as free preview - upgrade to unlock full book',
      bookId,
      isFullAccess,
      creditType,
    });
  } catch (error) {
    console.error('Error claiming free book:', error);
    return NextResponse.json({ error: 'Failed to claim book' }, { status: 500 });
  }
}
