import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/featured - Get featured books for homepage showcase
export async function GET() {
  try {
    const items = await prisma.book.findMany({
      where: {
        isFeaturedSample: true,
        status: 'completed',
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
        metadata: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 8, // Max 8 items for showcase
    });

    // Extract logline from metadata JSON
    const itemsWithLogline = items.map(item => ({
      ...item,
      logline: (item.metadata as { logline?: string } | null)?.logline || null,
      metadata: undefined, // Don't expose full metadata
    }));

    return NextResponse.json({ items: itemsWithLogline });
  } catch (error) {
    console.error('Fetch featured error:', error);
    return NextResponse.json({ items: [] });
  }
}
