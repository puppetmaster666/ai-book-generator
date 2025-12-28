import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get book IDs from request body
    const { bookIds } = await request.json();

    if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
      return NextResponse.json({ error: 'No book IDs provided' }, { status: 400 });
    }

    // Validate all IDs are strings
    if (!bookIds.every((id: unknown) => typeof id === 'string')) {
      return NextResponse.json({ error: 'Invalid book ID format' }, { status: 400 });
    }

    console.log(`Admin bulk delete: Deleting ${bookIds.length} books`);

    // Delete related data first (due to foreign key constraints)
    // Delete chapters
    const deletedChapters = await prisma.chapter.deleteMany({
      where: { bookId: { in: bookIds } },
    });
    console.log(`Deleted ${deletedChapters.count} chapters`);

    // Delete illustrations
    const deletedIllustrations = await prisma.illustration.deleteMany({
      where: { bookId: { in: bookIds } },
    });
    console.log(`Deleted ${deletedIllustrations.count} illustrations`);

    // Delete the books
    const deletedBooks = await prisma.book.deleteMany({
      where: { id: { in: bookIds } },
    });
    console.log(`Deleted ${deletedBooks.count} books`);

    return NextResponse.json({
      success: true,
      deleted: {
        books: deletedBooks.count,
        chapters: deletedChapters.count,
        illustrations: deletedIllustrations.count,
      },
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete books', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
