import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateEpub } from '@/lib/epub';
import { generatePdf } from '@/lib/pdf';
import { FontStyleKey } from '@/lib/constants';

/**
 * Generate a plain text version of the book for easy copy-paste
 */
function generateTxt(bookData: {
  title: string;
  authorName: string;
  chapters: Array<{ number: number; title: string; content: string }>;
}): string {
  const lines: string[] = [];

  // Title page
  lines.push(bookData.title.toUpperCase());
  lines.push('');
  lines.push(`by ${bookData.authorName}`);
  lines.push('');
  lines.push('─'.repeat(50));
  lines.push('');

  // Chapters
  for (const chapter of bookData.chapters) {
    lines.push('');
    lines.push(`CHAPTER ${chapter.number}: ${chapter.title.toUpperCase()}`);
    lines.push('');
    lines.push(chapter.content);
    lines.push('');
    lines.push('─'.repeat(50));
  }

  // End
  lines.push('');
  lines.push('THE END');
  lines.push('');

  return lines.join('\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const requestedFormat = searchParams.get('format'); // 'txt', 'epub', 'pdf', or null (auto)

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
    // If explicitly requested, use that format; otherwise auto-detect
    let downloadFormat: 'txt' | 'epub' | 'pdf';
    if (requestedFormat === 'txt') {
      downloadFormat = 'txt';
    } else if (requestedFormat === 'pdf' || (isVisualBook && !isTextOnly && requestedFormat !== 'epub')) {
      downloadFormat = 'pdf';
    } else {
      downloadFormat = 'epub';
    }

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

    // Generate TXT for easy copy-paste
    if (downloadFormat === 'txt') {
      console.log(`Generating TXT for book ${id}`);

      const txtContent = generateTxt(bookData);

      return new NextResponse(txtContent, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFilename}.txt"`,
        },
      });
    }

    // Use PDF for visual books, EPUB for text-only novels
    if (downloadFormat === 'pdf') {
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
