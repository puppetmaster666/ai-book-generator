import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Check if user is authenticated and is admin
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

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
      // Recent users (last 10)
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          freeBookUsed: true,
          createdAt: true,
          _count: { select: { books: true } },
        },
      }),
      // Recent books (last 20)
      prisma.book.findMany({
        take: 20,
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
          DATE(created_at) as date,
          COUNT(*) as books_created
        FROM "Book"
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
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
      recentUsers: recentUsers.map(u => ({
        ...u,
        booksCount: u._count.books,
      })),
      recentBooks,
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
