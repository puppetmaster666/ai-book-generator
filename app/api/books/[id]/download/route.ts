import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateEpub } from '@/lib/epub';
import { generatePdf } from '@/lib/pdf';
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
          include: {
            illustrations: {
              orderBy: { position: 'asc' },
            },
          },
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

    // Determine if this is a visual book (comic or children's picture book)
    const isVisualBook = book.dialogueStyle === 'bubbles' ||
                         book.dialogueStyle === 'prose' ||
                         book.bookFormat === 'picture_book';
    const isTextOnly = book.bookFormat === 'text_only';

    // Prepare book data for generation
    const bookData = {
      title: book.title,
      authorName: book.authorName,
      genre: book.genre,
      chapters: book.chapters.map((ch) => ({
        number: ch.number,
        title: ch.title,
        content: ch.content,
        illustrations: ch.illustrations?.map((ill) => ({
          imageUrl: ill.imageUrl,
          altText: ill.altText || undefined,
          position: ill.position,
        })),
      })),
      fontStyle: book.fontStyle as FontStyleKey,
      coverImageUrl: book.coverImageUrl || undefined,
      bookFormat: book.bookFormat,
      dialogueStyle: book.dialogueStyle || undefined,
    };

    const safeFilename = book.title.replace(/[^a-z0-9]/gi, '_');

    // Determine download format
    const isPdf = isVisualBook && !isTextOnly;
    const downloadFormat = isPdf ? 'pdf' : 'epub';

    // Track first download (only set if not already downloaded)
    if (!book.downloadedAt) {
      await prisma.book.update({
        where: { id },
        data: {
          downloadedAt: new Date(),
          downloadFormat,
        },
      });
    }

    // Use PDF for visual books, EPUB for text-only novels
    if (isPdf) {
      console.log(`Generating PDF for visual book ${id}: format=${book.bookFormat}, dialogueStyle=${book.dialogueStyle}`);

      const pdfBuffer = await generatePdf(bookData);

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
        },
      });
    } else {
      console.log(`Generating EPUB for novel ${id}: format=${book.bookFormat}`);

      const epubBuffer = await generateEpub(bookData);

      return new NextResponse(new Uint8Array(epubBuffer), {
        headers: {
          'Content-Type': 'application/epub+zip',
          'Content-Disposition': `attachment; filename="${safeFilename}.epub"`,
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error downloading book:', errorMessage, error);
    return NextResponse.json(
      { error: `Failed to generate download: ${errorMessage}` },
      { status: 500 }
    );
  }
}
