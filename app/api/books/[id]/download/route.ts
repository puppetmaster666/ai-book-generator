import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateEpub } from '@/lib/epub';
import { FontStyleKey } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (book.status !== 'completed') {
      return NextResponse.json(
        { error: 'Book generation not complete' },
        { status: 400 }
      );
    }

    // Generate EPUB
    const epubBuffer = await generateEpub({
      title: book.title,
      authorName: book.authorName,
      genre: book.genre,
      chapters: book.chapters.map(ch => ({
        number: ch.number,
        title: ch.title,
        content: ch.content,
      })),
      fontStyle: book.fontStyle as FontStyleKey,
      coverImageUrl: book.coverImageUrl || undefined,
    });

    // Return as downloadable file
    const filename = `${book.title.replace(/[^a-z0-9]/gi, '_')}.epub`;

    return new NextResponse(epubBuffer, {
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading book:', error);
    return NextResponse.json(
      { error: 'Failed to generate download' },
      { status: 500 }
    );
  }
}
