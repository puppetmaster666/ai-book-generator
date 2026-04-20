import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { number: 'asc' },
          include: {
            illustrations: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                altText: true,
                position: true,
                createdAt: true,
                status: true,
                errorMessage: true,
                retryCount: true,
                isFeaturedRoastPanel: true,
                // Don't include imageUrl (base64) - use API endpoint instead
              },
            },
          },
        },
        illustrations: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            chapterId: true,
            altText: true,
            position: true,
            createdAt: true,
            status: true,
            errorMessage: true,
            retryCount: true,
            isFeaturedRoastPanel: true,
            // Don't include imageUrl (base64) - use API endpoint instead
          },
        },
      },
    });
    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }
    // Block access if book belongs to a different user
    if (book.userId && book.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Check if user is eligible for free book or has credits
    // IMPORTANT: Check the SESSION user's credits, not just book.userId
    // This handles the case where a logged-in user is viewing an unclaimed book
    let freeBookEligible = false;
    let canClaimFreePreview = false; // Free sample (limited preview)
    let hasGiftedCredits = false; // Admin gifted credits (full book access)
    let hasCredits = false;
    let userCredits = 0;
    let userPlan = 'free';
    let isFirstCompletedBook = false;
    const sessionUserId = session.user.id;
    // Determine which user to check for credits:
    // - If book has an owner and viewer is the owner, use owner's credits
    // - If book has no owner but viewer is logged in, use viewer's credits (they can claim it)
    // - If book has an owner but viewer is different, don't show credits (not their book)
    const userIdToCheck = book.userId
      ? (book.userId === sessionUserId ? book.userId : null) // Only show credits if it's their book
      : sessionUserId; // Book has no owner, show viewer's credits
    let creditBalance = 0;
    let creditCost = 0;
    if (userIdToCheck) {
      const { getCreditCost } = await import('@/lib/constants');
      creditCost = getCreditCost(book.bookPreset);

      const user = await prisma.user.findUnique({
        where: { id: userIdToCheck },
        select: { freeBookUsed: true, freeCredits: true, credits: true, creditBalance: true, plan: true },
      });
      if (user) {
        creditBalance = user.creditBalance;
        canClaimFreePreview = !user.freeBookUsed;
        hasGiftedCredits = user.freeCredits > 0;
        const hasSubscriptionCredits = user.credits > 0;
        const hasNewCredits = user.creditBalance >= creditCost;
        freeBookEligible = canClaimFreePreview || hasGiftedCredits || hasSubscriptionCredits || hasNewCredits;
        hasCredits = hasNewCredits || user.freeCredits > 0 || user.credits > 0;
        userCredits = user.creditBalance; // Show credit balance as primary
        userPlan = user.plan;
      }
      // Check if this is user's first completed book (for discount popup)
      if (book.status === 'completed' && book.userId) {
        const completedBooksCount = await prisma.book.count({
          where: {
            userId: book.userId,
            status: 'completed',
          },
        });
        isFirstCompletedBook = completedBooksCount === 1;
      }
    }
    // Transform illustrations to use API URLs instead of inline base64
    const transformedBook = {
      ...book,
      illustrations: book.illustrations.map(ill => ({
        ...ill,
        imageUrl: `/api/books/${id}/illustrations/${ill.id}`,
      })),
      chapters: book.chapters.map(ch => ({
        ...ch,
        illustrations: ch.illustrations?.map(ill => ({
          ...ill,
          imageUrl: `/api/books/${id}/illustrations/${ill.id}`,
        })),
      })),
    };
    return NextResponse.json({
      book: transformedBook,
      freeBookEligible,
      canClaimFreePreview,
      hasGiftedCredits,
      hasCredits,
      userCredits,
      userPlan,
      creditBalance,
      creditCost,
      isFirstCompletedBook
    });
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book' },
      { status: 500 }
    );
  }
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check ownership: book must belong to the authenticated user or have no owner
    const existingBook = await prisma.book.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existingBook) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    if (existingBook.userId) {
      const session = await auth();
      if (!session?.user?.id || session.user.id !== existingBook.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { email, authorName, title, premise, beginning, middle, ending, characters, targetWords, targetChapters } = body;
    // Only allow updating certain fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (email !== undefined) updateData.email = email;
    if (authorName !== undefined) updateData.authorName = authorName;
    if (title !== undefined) updateData.title = title;
    if (premise !== undefined) updateData.premise = premise;
    if (beginning !== undefined) updateData.beginning = beginning;
    if (middle !== undefined) updateData.middle = middle;
    if (ending !== undefined) updateData.ending = ending;
    if (characters !== undefined) updateData.characters = characters;
    if (targetWords !== undefined) updateData.targetWords = targetWords;
    if (targetChapters !== undefined) updateData.targetChapters = targetChapters;
    if (body.region !== undefined) updateData.region = body.region;

    // Update a specific panel's scene description (for editing failed panel prompts)
    if (body.updatePanelScene) {
      const { number, description } = body.updatePanelScene;
      const book = await prisma.book.findUnique({ where: { id }, select: { outline: true } });
      if (book?.outline) {
        const outline = book.outline as { chapters: Array<{ number: number; scene?: { description?: string } }> };
        const chapter = outline.chapters.find(c => c.number === number);
        if (chapter?.scene) {
          chapter.scene.description = description;
          updateData.outline = outline;
        }
      }
      // Also update the chapter's sceneDescription in DB
      await prisma.chapter.updateMany({
        where: { bookId: id, number },
        data: { sceneDescription: { description } as any },
      });
      // Delete failed illustration so it can be regenerated
      await prisma.illustration.deleteMany({
        where: { bookId: id, position: number, status: 'failed' },
      });
    }

    const updatedBook = await prisma.book.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({ book: updatedBook });
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Failed to update book' },
      { status: 500 }
    );
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify the book exists and check ownership
    const book = await prisma.book.findUnique({
      where: { id },
      select: { id: true, title: true, userId: true },
    });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Only the owner or admin can delete
    if (book.userId && book.userId !== session.user.id) {
      const adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
      });
      if (!adminUser?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Delete all related data (illustrations, chapters) then the book
    await prisma.$transaction([
      prisma.illustration.deleteMany({
        where: {
          OR: [
            { bookId: id },
            { chapter: { bookId: id } },
          ],
        },
      }),
      prisma.chapter.deleteMany({
        where: { bookId: id },
      }),
      prisma.book.delete({
        where: { id },
      }),
    ]);
    return NextResponse.json({ success: true, message: `Book "${book.title}" deleted` });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    );
  }
}
