import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma, Prisma } from '@/lib/db';

const ADMIN_EMAILS = ['lhllparis@gmail.com'];

/**
 * User-facing endpoint to restart a stuck or failed book generation.
 * Users can restart their own books, admins can restart any book.
 *
 * This keeps the original book input (title, premise, characters, etc.)
 * but clears the outline, chapters, and all generated content,
 * allowing the user to generate fresh with the current code.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    // Get the book with ownership info
    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        userId: true,
        email: true,
        updatedAt: true,
        errorMessage: true,
        totalWords: true,
        _count: {
          select: {
            chapters: true,
            illustrations: true,
          },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check ownership - user must own the book or be admin
    const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);
    const isOwner = session?.user?.id && book.userId === session.user.id;
    const isEmailOwner = session?.user?.email && book.email === session.user.email;

    if (!isAdmin && !isOwner && !isEmailOwner) {
      return NextResponse.json({ error: 'You can only restart your own books' }, { status: 403 });
    }

    // Only allow restart for books that are stuck or failed
    // Don't allow restart for completed books (they're fine) or actively generating books
    const allowedStatuses = ['failed', 'pending', 'outlining', 'generating'];

    // Check if book is stuck (generating for more than 10 minutes without update)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const isStuck = (book.status === 'generating' || book.status === 'outlining') &&
                    book.updatedAt < tenMinutesAgo;
    const hasFailed = book.status === 'failed' || book.errorMessage;

    // Admins can always restart, users can only restart failed/stuck books
    // EXCEPTION: Allow anyone to restart "completed" books with 0 words (clearly broken)
    const isBrokenCompletion = book.status === 'completed' && (book.totalWords === 0 || book._count.chapters === 0);

    if (!isAdmin && !isBrokenCompletion) {
      if (book.status === 'completed') {
        return NextResponse.json({
          error: 'Cannot restart a completed book. If you need changes, please create a new book.'
        }, { status: 400 });
      }

      if (!hasFailed && !isStuck && book.status !== 'pending') {
        return NextResponse.json({
          error: 'Book generation is still in progress. Please wait or try again in a few minutes.',
          status: book.status,
          lastUpdate: book.updatedAt,
        }, { status: 400 });
      }
    }

    // Delete all chapters and illustrations
    await prisma.chapter.deleteMany({
      where: { bookId: id },
    });

    await prisma.illustration.deleteMany({
      where: { bookId: id },
    });

    // Reset the book to fresh state, keeping original input
    await prisma.book.update({
      where: { id },
      data: {
        // Reset generation state
        status: 'pending',
        outline: Prisma.DbNull,
        currentChapter: 0,
        totalChapters: 0,
        totalWords: 0,
        storySoFar: null,
        characterStates: Prisma.DbNull,
        errorMessage: null,

        // Reset timestamps
        generationStartedAt: null,
        completedAt: null,

        // Reset cover (will be regenerated)
        coverImageUrl: null,
        coverPrompt: null,

        // Reset visual guides (will be regenerated for illustrated books)
        characterVisualGuide: Prisma.DbNull,
        visualStyleGuide: Prisma.DbNull,

        // Keep everything else:
        // - title, authorName, genre, premise, characters
        // - bookFormat, bookType, writingStyle, chapterFormat
        // - dialogueStyle, bookPreset, artStyle, artStylePrompt
        // - targetWords, targetChapters
        // - email, userId, paymentStatus
      },
    });

    const userEmail = session?.user?.email || 'anonymous';
    console.log(`[Restart] Book ${id} "${book.title}" restarted by ${userEmail}. Deleted ${book._count.chapters} chapters, ${book._count.illustrations} illustrations.`);

    return NextResponse.json({
      success: true,
      message: `Book has been reset and is ready for fresh generation.`,
      deletedChapters: book._count.chapters,
      deletedIllustrations: book._count.illustrations,
    });

  } catch (error) {
    console.error('Error restarting book:', error);
    return NextResponse.json(
      { error: 'Failed to restart book' },
      { status: 500 }
    );
  }
}
