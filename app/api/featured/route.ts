import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/featured - Get featured books for homepage showcase
export async function GET() {
  try {
    const items = await prisma.book.findMany({
      where: {
        isFeaturedSample: true,
        status: 'completed',
        // Must have either a cover image or be a screenplay
        OR: [
          { coverImageUrl: { not: null } },
          { bookFormat: 'screenplay' },
        ],
      },
      select: {
        id: true,
        title: true,
        genre: true,
        bookType: true,
        bookFormat: true,
        bookPreset: true,
        coverImageUrl: true,
        authorName: true,
        totalWords: true,
        totalChapters: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 8, // Max 8 items for showcase
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Fetch featured error:', error);
    return NextResponse.json({ items: [] });
  }
}
