import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Get real counts from database
    const [userCount, bookCount, completedBooks] = await Promise.all([
      prisma.user.count(),
      prisma.book.count(),
      // Get completed books with generation timestamps to calculate avg time
      prisma.book.findMany({
        where: {
          status: 'completed',
          generationStartedAt: { not: null },
          completedAt: { not: null },
        },
        select: {
          generationStartedAt: true,
          completedAt: true,
        },
        take: 100, // Sample last 100 completed books
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    // Calculate average generation time in minutes
    let avgTimeMinutes = 2; // Default fallback
    if (completedBooks.length > 0) {
      const totalSeconds = completedBooks.reduce((sum, book) => {
        if (book.generationStartedAt && book.completedAt) {
          const diff = (book.completedAt.getTime() - book.generationStartedAt.getTime()) / 1000;
          return sum + diff;
        }
        return sum;
      }, 0);
      avgTimeMinutes = Math.round(totalSeconds / completedBooks.length / 60) || 2;
    }

    return NextResponse.json({
      users: userCount,
      books: bookCount,
      avgTimeMinutes,
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json(
      { users: 0, books: 0, avgTimeMinutes: 2 },
      { status: 200 }
    );
  }
}
