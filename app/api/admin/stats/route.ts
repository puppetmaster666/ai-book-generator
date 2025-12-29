import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const booksPage = parseInt(searchParams.get('booksPage') || '1');
    const booksLimit = parseInt(searchParams.get('booksLimit') || '50');
    const booksOffset = (booksPage - 1) * booksLimit;
    const usersPage = parseInt(searchParams.get('usersPage') || '1');
    const usersLimit = parseInt(searchParams.get('usersLimit') || '50');
    const usersOffset = (usersPage - 1) * usersLimit;
    // Check if user is authenticated and is admin
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to find user by ID first, then by email as fallback
    let user = null;
    if (session.user.id) {
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
      });
    }

    // Fallback to email lookup if ID lookup fails
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { isAdmin: true },
      });
    }

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all stats in parallel
    const [
      totalUsers,
      totalBooks,
      completedBooks,
      pendingBooks,
      generatingBooks,
      failedBooks,
      totalPayments,
      recentUsers,
      recentBooks,
      booksByFormat,
      booksByGenre,
      dailyStats,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      // Total books
      prisma.book.count(),
      // Books by status
      prisma.book.count({ where: { status: 'completed' } }),
      prisma.book.count({ where: { status: 'pending' } }),
      prisma.book.count({ where: { status: 'generating' } }),
      prisma.book.count({ where: { status: 'failed' } }),
      // Total payments (completed)
      prisma.payment.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true },
        _count: true,
      }),
      // Paginated users
      prisma.user.findMany({
        skip: usersOffset,
        take: usersLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          freeBookUsed: true,
          freeCredits: true,
          createdAt: true,
          _count: { select: { books: true } },
        },
      }),
      // Paginated books
      prisma.book.findMany({
        skip: booksOffset,
        take: booksLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          authorName: true,
          genre: true,
          bookFormat: true,
          status: true,
          paymentStatus: true,
          totalWords: true,
          totalChapters: true,
          currentChapter: true,
          createdAt: true,
          completedAt: true,
          email: true,
          user: {
            select: { email: true, name: true },
          },
        },
      }),
      // Books by format
      prisma.book.groupBy({
        by: ['bookFormat'],
        _count: true,
      }),
      // Books by genre
      prisma.book.groupBy({
        by: ['genre'],
        _count: true,
      }),
      // Daily stats for last 30 days
      prisma.$queryRaw`
        SELECT
          DATE("createdAt") as date,
          COUNT(*) as books_created
        FROM "Book"
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      ` as Promise<Array<{ date: Date; books_created: bigint }>>,
    ]);

    // Calculate revenue
    const totalRevenue = (totalPayments._sum.amount || 0) / 100;
    const totalTransactions = totalPayments._count;

    return NextResponse.json({
      overview: {
        totalUsers,
        totalBooks,
        completedBooks,
        pendingBooks,
        generatingBooks,
        failedBooks,
        totalRevenue,
        totalTransactions,
      },
      users: recentUsers.map(u => ({
        ...u,
        booksCount: u._count.books,
      })),
      usersPagination: {
        page: usersPage,
        limit: usersLimit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / usersLimit),
      },
      books: recentBooks,
      booksPagination: {
        page: booksPage,
        limit: booksLimit,
        total: totalBooks,
        totalPages: Math.ceil(totalBooks / booksLimit),
      },
      booksByFormat: booksByFormat.map(b => ({
        format: b.bookFormat,
        count: b._count,
      })),
      booksByGenre: booksByGenre.map(b => ({
        genre: b.genre,
        count: b._count,
      })),
      dailyStats: dailyStats.map(d => ({
        date: d.date,
        booksCreated: Number(d.books_created),
      })),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
