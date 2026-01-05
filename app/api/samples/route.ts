import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/samples - Get featured sample books for homepage
export async function GET() {
  try {
    const samples = await prisma.book.findMany({
      where: {
        isFeaturedSample: true,
        samplePdfUrl: { not: null },
      },
      select: {
        id: true,
        title: true,
        genre: true,
        bookType: true,
        bookFormat: true,
        bookPreset: true,
        artStyle: true,
        coverImageUrl: true,
        samplePdfUrl: true,
        totalWords: true,
        totalChapters: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Max 10 samples
    });

    // Group by type for display
    const grouped = {
      childrens: samples.filter(s =>
        s.bookPreset === 'childrens_picture' ||
        s.bookPreset === 'childrens_early_reader'
      ),
      comics: samples.filter(s =>
        s.bookPreset === 'graphic_novel' ||
        s.bookFormat === 'comic'
      ),
      screenplays: samples.filter(s =>
        s.bookFormat === 'screenplay'
      ),
      novels: samples.filter(s =>
        s.bookPreset === 'novel' ||
        s.bookFormat === 'text_only'
      ),
    };

    return NextResponse.json({
      samples,
      grouped,
    });
  } catch (error) {
    console.error('Fetch samples error:', error);
    return NextResponse.json({ error: 'Failed to fetch samples' }, { status: 500 });
  }
}
