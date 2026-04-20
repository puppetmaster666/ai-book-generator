import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/roast-samples - Featured roast panels for homepage + /roast page
export async function GET() {
  try {
    const panels = await prisma.illustration.findMany({
      where: {
        isFeaturedRoastPanel: true,
        status: 'completed',
        imageUrl: { not: null },
      },
      select: {
        id: true,
        bookId: true,
        altText: true,
        book: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    const samples = panels.map(p => ({
      id: p.id,
      bookId: p.bookId,
      title: p.book?.title || 'Roast',
      altText: p.altText,
      imageUrl: `/api/books/${p.bookId}/illustrations/${p.id}`,
    }));

    return NextResponse.json({ samples });
  } catch (error) {
    console.error('Fetch roast samples error:', error);
    return NextResponse.json({ error: 'Failed to fetch roast samples' }, { status: 500 });
  }
}
