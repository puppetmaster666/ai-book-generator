import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Get the session user (the person viewing the page)
    const session = await auth();
    const sessionUserId = session?.user?.id;

    // Determine which user to check for credits:
    // - If book has an owner and viewer is the owner, use owner's credits
    // - If book has no owner but viewer is logged in, use viewer's credits (they can claim it)
    // - If book has an owner but viewer is different, don't show credits (not their book)
    const userIdToCheck = book.userId
      ? (book.userId === sessionUserId ? book.userId : null) // Only show credits if it's their book
      : sessionUserId; // Book has no owner, show viewer's credits

    if (userIdToCheck) {
      const user = await prisma.user.findUnique({
        where: { id: userIdToCheck },
        select: { freeBookUsed: true, freeCredits: true, credits: true, plan: true },
      });
      if (user) {
        // Separate free preview (limited) from gifted credits (full access)
        canClaimFreePreview = !user.freeBookUsed;
        hasGiftedCredits = user.freeCredits > 0;
        // User is eligible for free claim if they have either option
        freeBookEligible = canClaimFreePreview || hasGiftedCredits;
        hasCredits = user.freeCredits > 0 || user.credits > 0;
        userCredits = user.freeCredits + user.credits;
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
      canClaimFreePreview, // Limited preview (free sample)
      hasGiftedCredits, // Full access via admin-gifted credits
      hasCredits,
      userCredits,
      userPlan,
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

    const book = await prisma.book.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ book });
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

    // Verify the book exists
    const book = await prisma.book.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Delete all related data (illustrations, chapters) then the book
    // Prisma should handle cascading deletes based on schema, but let's be explicit
    await prisma.$transaction([
      // Delete illustrations (both direct and chapter-linked)
      prisma.illustration.deleteMany({
        where: {
          OR: [
            { bookId: id },
            { chapter: { bookId: id } },
          ],
        },
      }),
      // Delete chapters
      prisma.chapter.deleteMany({
        where: { bookId: id },
      }),
      // Delete the book
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
