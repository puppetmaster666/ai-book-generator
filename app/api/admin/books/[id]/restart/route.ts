import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma, Prisma } from '@/lib/db';

const ADMIN_EMAILS = ['lhllparis@gmail.com'];

/**
 * Admin endpoint to restart a book generation from scratch.
 * Keeps the original book input (title, premise, characters, etc.)
 * but clears the outline, chapters, and all generated content.
 *
 * This allows re-generating with proper language detection.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Get the book to verify it exists
    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
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

    console.log(`[Admin] Book ${id} "${book.title}" restarted by ${session.user.email}. Deleted ${book._count.chapters} chapters, ${book._count.illustrations} illustrations.`);

    return NextResponse.json({
      success: true,
      message: `Book "${book.title}" has been reset. Deleted ${book._count.chapters} chapters and ${book._count.illustrations} illustrations.`,
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
