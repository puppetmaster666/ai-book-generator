import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to find user by ID first, then by email as fallback
    let adminUser = null;
    if (session.user.id) {
      adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true, id: true },
      });
    }

    // Fallback to email lookup if ID lookup fails
    if (!adminUser && session.user.email) {
      adminUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { isAdmin: true, id: true },
      });
    }

    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userIds, deleteBooks = true } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'No user IDs provided' }, { status: 400 });
    }

    // Prevent self-deletion
    if (userIds.includes(adminUser.id)) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Get users to delete (exclude other admins for safety)
    const usersToDelete = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        isAdmin: false, // Don't allow deleting other admins
      },
      select: {
        id: true,
        email: true,
        _count: {
          select: { books: true },
        },
      },
    });

    if (usersToDelete.length === 0) {
      return NextResponse.json({ error: 'No deletable users found (admins cannot be deleted)' }, { status: 400 });
    }

    const userIdsToDelete = usersToDelete.map(u => u.id);
    const totalBooks = usersToDelete.reduce((sum, u) => sum + u._count.books, 0);

    // Delete in transaction
    const result = await prisma.$transaction(async (tx) => {
      // First delete all related data for the books
      if (deleteBooks) {
        // Get all book IDs for these users
        const books = await tx.book.findMany({
          where: { userId: { in: userIdsToDelete } },
          select: { id: true },
        });
        const bookIds = books.map(b => b.id);

        if (bookIds.length > 0) {
          // Delete book-related data
          await tx.illustration.deleteMany({ where: { bookId: { in: bookIds } } });
          await tx.chapter.deleteMany({ where: { bookId: { in: bookIds } } });
          await tx.book.deleteMany({ where: { id: { in: bookIds } } });
        }
      } else {
        // Just orphan the books (set userId to null)
        await tx.book.updateMany({
          where: { userId: { in: userIdsToDelete } },
          data: { userId: null },
        });
      }

      // Delete user-related data
      await tx.notification.deleteMany({ where: { userId: { in: userIdsToDelete } } });
      await tx.creditClaim.deleteMany({ where: { userId: { in: userIdsToDelete } } });

      // Sessions and Accounts have onDelete: Cascade, but let's be explicit
      await tx.session.deleteMany({ where: { userId: { in: userIdsToDelete } } });
      await tx.account.deleteMany({ where: { userId: { in: userIdsToDelete } } });

      // Finally delete the users
      const deleted = await tx.user.deleteMany({
        where: { id: { in: userIdsToDelete } },
      });

      return deleted;
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      booksDeleted: deleteBooks ? totalBooks : 0,
      booksOrphaned: deleteBooks ? 0 : totalBooks,
    });
  } catch (error) {
    console.error('Bulk delete users error:', error);
    return NextResponse.json(
      { error: 'Failed to delete users' },
      { status: 500 }
    );
  }
}
