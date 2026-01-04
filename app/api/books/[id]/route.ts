import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
    let freeBookEligible = false;
    let hasCredits = false;
    let userCredits = 0;
    let userPlan = 'free';
    let isFirstCompletedBook = false;
    if (book.userId) {
      const user = await prisma.user.findUnique({
        where: { id: book.userId },
        select: { freeBookUsed: true, freeCredits: true, credits: true, plan: true },
      });
      if (user) {
        // User is eligible for free book if they haven't used their first free book OR have credits
        freeBookEligible = !user.freeBookUsed || user.freeCredits > 0;
        hasCredits = user.freeCredits > 0 || user.credits > 0;
        userCredits = user.freeCredits + user.credits;
        userPlan = user.plan;
      }

      // Check if this is user's first completed book (for discount popup)
      if (book.status === 'completed') {
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

    const { email, authorName, title, premise, beginning, middle, ending, characters } = body;

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
