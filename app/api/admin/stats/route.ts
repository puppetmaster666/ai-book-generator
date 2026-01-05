import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const booksPage = parseInt(searchParams.get('booksPage') || '1');
    const booksLimit = parseInt(searchParams.get('booksLimit') || '50');
    const booksOffset = (booksPage - 1) * booksLimit;
    const booksSearch = searchParams.get('booksSearch') || '';
    const usersPage = parseInt(searchParams.get('usersPage') || '1');
    const usersLimit = parseInt(searchParams.get('usersLimit') || '50');
    const usersOffset = (usersPage - 1) * usersLimit;
    const usersSearch = searchParams.get('usersSearch') || '';
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
      paymentsByType,
      allPayments,
      recentUsers,
      recentBooks,
      booksByFormat,
      dailyStats,
      anonymousContacts,
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
      // Payments grouped by type
      prisma.payment.groupBy({
        by: ['productType'],
        where: { status: 'completed' },
        _sum: { amount: true },
        _count: true,
      }),
      // All payments for debugging
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          email: true,
          amount: true,
          status: true,
          productType: true,
          createdAt: true,
        },
      }),
      // Paginated users with search
      prisma.user.findMany({
        where: usersSearch ? {
          OR: [
            { email: { contains: usersSearch, mode: 'insensitive' } },
            { name: { contains: usersSearch, mode: 'insensitive' } },
          ],
        } : undefined,
        skip: usersOffset,
        take: usersLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          name: true,
          plan: true,
          freeBookUsed: true,
          freeCredits: true,
          passwordHash: true, // To determine auth method (email vs Google)
          createdAt: true,
          _count: { select: { books: true } },
        },
      }),
      // Paginated books with search
      prisma.book.findMany({
        where: booksSearch ? {
          OR: [
            { title: { contains: booksSearch, mode: 'insensitive' } },
            { email: { contains: booksSearch, mode: 'insensitive' } },
            { authorName: { contains: booksSearch, mode: 'insensitive' } },
          ],
        } : undefined,
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
          paymentMethod: true,
          totalWords: true,
          totalChapters: true,
          currentChapter: true,
          createdAt: true,
          completedAt: true,
          email: true,
          // Original book input
          premise: true,
          beginning: true,
          middle: true,
          ending: true,
          errorMessage: true,
          // Download tracking
          downloadedAt: true,
          downloadFormat: true,
          // Featured sample
          isFeaturedSample: true,
          samplePdfUrl: true,
          coverImageUrl: true,
          user: {
            select: { email: true, name: true, plan: true, freeBookUsed: true },
          },
          // Count illustrations for visual books
          _count: {
            select: { illustrations: true },
          },
        },
      }),
      // Books by format
      prisma.book.groupBy({
        by: ['bookFormat'],
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
      // Anonymous contacts (books with email but no userId that have paid)
      prisma.book.findMany({
        where: {
          userId: null,
          email: { not: null },
          paymentStatus: 'completed',
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          title: true,
          authorName: true,
          status: true,
          bookFormat: true,
          genre: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);

    // Calculate revenue
    const totalRevenue = (totalPayments._sum.amount || 0) / 100;
    const totalTransactions = totalPayments._count;

    // Calculate payment breakdown by type
    const revenueBreakdown = paymentsByType.map(p => ({
      type: p.productType,
      amount: (p._sum.amount || 0) / 100,
      count: p._count,
    }));

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
        revenueBreakdown,
      },
      // Recent payments for debugging
      recentPayments: allPayments.map(p => ({
        ...p,
        amount: p.amount / 100,
      })),
      users: recentUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        plan: u.plan,
        freeBookUsed: u.freeBookUsed,
        freeCredits: u.freeCredits,
        createdAt: u.createdAt,
        booksCount: u._count.books,
        authMethod: u.passwordHash ? 'email' : 'google', // Determine based on password presence
        emailVerified: u.emailVerified,
      })),
      usersPagination: {
        page: usersPage,
        limit: usersLimit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / usersLimit),
      },
      books: recentBooks.map(b => ({
        ...b,
        illustrationCount: b._count.illustrations,
        _count: undefined,
      })),
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
      dailyStats: dailyStats.map(d => ({
        date: d.date,
        booksCreated: Number(d.books_created),
      })),
      // Group anonymous contacts by email (one person may have multiple books)
      anonymousContacts: Object.values(
        anonymousContacts.reduce((acc, book) => {
          const email = book.email!.toLowerCase();
          if (!acc[email]) {
            acc[email] = {
              email,
              books: [],
              firstPurchase: book.createdAt,
              lastPurchase: book.createdAt,
            };
          }
          acc[email].books.push({
            id: book.id,
            title: book.title,
            authorName: book.authorName,
            status: book.status,
            bookFormat: book.bookFormat,
            genre: book.genre,
            createdAt: book.createdAt,
            completedAt: book.completedAt,
          });
          if (book.createdAt < acc[email].firstPurchase) {
            acc[email].firstPurchase = book.createdAt;
          }
          if (book.createdAt > acc[email].lastPurchase) {
            acc[email].lastPurchase = book.createdAt;
          }
          return acc;
        }, {} as Record<string, { email: string; books: Array<{ id: string; title: string; authorName: string; status: string; bookFormat: string; genre: string; createdAt: Date; completedAt: Date | null }>; firstPurchase: Date; lastPurchase: Date }>)
      ),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
