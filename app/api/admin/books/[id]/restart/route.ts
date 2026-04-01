import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma, Prisma } from '@/lib/db';

/**
 * Admin endpoint to restart a book generation.
 *
 * POST body options:
 * - grantFullBook: boolean — if true, sets paymentStatus to 'completed' so the
 *   user gets the full book (not just the free sample preview)
 * - keepProgress: boolean — if true, doesn't delete existing chapters/illustrations,
 *   just resets status so generation resumes from where it stopped
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    let grantFullBook = false;
    let keepProgress = false;
    try {
      const body = await request.json();
      grantFullBook = body.grantFullBook === true;
      keepProgress = body.keepProgress === true;
    } catch {
      // No body or invalid JSON — use defaults
    }

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        paymentStatus: true,
        bookFormat: true,
        currentChapter: true,
        totalChapters: true,
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

    if (keepProgress) {
      // Resume mode: just reset status so reconcile/generate-next picks it up
      await prisma.book.update({
        where: { id },
        data: {
          status: book.currentChapter > 0 ? 'generating' : 'pending',
          errorMessage: null,
          reconcileRetries: 0,
          ...(grantFullBook ? { paymentStatus: 'completed', paymentId: `admin_grant_${Date.now()}` } : {}),
        },
      });

      console.log(`[Admin] Book ${id} "${book.title}" resumed by ${session.user.email}${grantFullBook ? ' (granted full book)' : ''}. Progress kept: ch ${book.currentChapter}/${book.totalChapters}`);

      // Trigger generation
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const isVisualBook = book.bookFormat === 'picture_book';
      const endpoint = book.currentChapter > 0
        ? (isVisualBook ? `/api/books/${id}/generate-visual` : `/api/books/${id}/generate-next`)
        : `/api/books/${id}/generate`;

      fetch(`${appUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverDriven: true }),
      }).catch(err => console.error(`[Admin] Failed to trigger generation for ${id}:`, err));

      return NextResponse.json({
        success: true,
        message: `Book "${book.title}" resumed${grantFullBook ? ' with full book access' : ''}. Generation will continue from chapter ${book.currentChapter}.`,
        mode: 'resume',
        grantedFullBook: grantFullBook,
      });
    }

    // Full restart: delete all content and regenerate from scratch
    await prisma.illustration.deleteMany({ where: { bookId: id } });
    await prisma.chapter.deleteMany({ where: { bookId: id } });

    await prisma.book.update({
      where: { id },
      data: {
        status: 'pending',
        outline: Prisma.DbNull,
        currentChapter: 0,
        totalChapters: 0,
        totalWords: 0,
        storySoFar: null,
        characterStates: Prisma.DbNull,
        screenplayContext: Prisma.DbNull,
        errorMessage: null,
        reconcileRetries: 0,
        generationStartedAt: null,
        completedAt: null,
        coverImageUrl: null,
        coverPrompt: null,
        characterVisualGuide: Prisma.DbNull,
        visualStyleGuide: Prisma.DbNull,
        livePreview: null,
        ...(grantFullBook ? { paymentStatus: 'completed', paymentId: `admin_grant_${Date.now()}` } : {}),
      },
    });

    console.log(`[Admin] Book ${id} "${book.title}" fully restarted by ${session.user.email}${grantFullBook ? ' (granted full book)' : ''}. Deleted ${book._count.chapters} chapters, ${book._count.illustrations} illustrations.`);

    // Trigger generation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/books/${id}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverDriven: true }),
    }).catch(err => console.error(`[Admin] Failed to trigger generation for ${id}:`, err));

    return NextResponse.json({
      success: true,
      message: `Book "${book.title}" fully restarted${grantFullBook ? ' with full book access' : ''}. Deleted ${book._count.chapters} chapters and ${book._count.illustrations} illustrations.`,
      mode: 'restart',
      grantedFullBook: grantFullBook,
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
