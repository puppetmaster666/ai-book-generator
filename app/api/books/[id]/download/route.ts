import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateEpub } from '@/lib/epub';
import { generatePdf } from '@/lib/pdf';
import { generateTextPdf } from '@/lib/pdf-text';
import { generateScreenplayPdf } from '@/lib/screenplay-pdf';
import { FontStyleKey } from '@/lib/constants';

/**
 * Generate a plain text version of the book for easy copy-paste
 */
// Helper to strip chapter heading from content (since we add our own header)
function stripChapterHeading(content: string, chapterNum: number): string {
  const lines = content.split('\n');
  const chapterPattern = new RegExp(`^\\s*(CHAPTER\\s+${chapterNum}|Chapter\\s+${chapterNum})\\s*[:.]?.*$`, 'i');

  let startIndex = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if (chapterPattern.test(lines[i].trim())) {
      startIndex = i + 1;
      while (startIndex < lines.length && lines[startIndex].trim() === '') {
        startIndex++;
      }
      break;
    }
  }

  return lines.slice(startIndex).join('\n');
}

// Check if content ends with "The End"
function contentHasTheEnd(content: string): boolean {
  return /\b(The\s+End|THE\s+END)\s*$/i.test(content.trim());
}

function generateTxt(bookData: {
  title: string;
  authorName: string;
  chapters: Array<{ number: number; title: string; content: string }>;
}): string {
  const lines: string[] = [];

  // Title page
  lines.push(bookData.title.toUpperCase());
  lines.push('');
  // Only show author if provided
  if (bookData.authorName && bookData.authorName.trim()) {
    lines.push(`by ${bookData.authorName}`);
    lines.push('');
  }
  lines.push('─'.repeat(50));
  lines.push('');

  let hasTheEndInContent = false;

  // Chapters
  for (const chapter of bookData.chapters) {
    lines.push('');
    lines.push(`CHAPTER ${chapter.number}: ${chapter.title.toUpperCase()}`);
    lines.push('');
    // Strip duplicate chapter heading from content
    const cleanedContent = stripChapterHeading(chapter.content, chapter.number);
    lines.push(cleanedContent);
    lines.push('');
    lines.push('─'.repeat(50));

    if (contentHasTheEnd(cleanedContent)) {
      hasTheEndInContent = true;
    }
  }

  // Only add THE END if content doesn't already have it
  if (!hasTheEndInContent) {
    lines.push('');
    lines.push('THE END');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate a plain text version of a screenplay
 * Preserves screenplay formatting for easy copy-paste to screenwriting software
 */
function generateScreenplayTxt(bookData: {
  title: string;
  authorName: string;
  chapters: Array<{ number: number; title: string; content: string }>;
}): string {
  const lines: string[] = [];

  // Title page
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push(bookData.title.toUpperCase());
  lines.push('');
  lines.push('');
  // Only show author if provided
  if (bookData.authorName && bookData.authorName.trim()) {
    lines.push('Written by');
    lines.push('');
    lines.push(bookData.authorName);
    lines.push('');
  }
  lines.push('');
  lines.push('═'.repeat(60));
  lines.push('');
  lines.push('');

  let hasTheEndInContent = false;

  // Sequences (chapters in screenplay terms)
  for (const chapter of bookData.chapters) {
    // Add sequence content directly - it should already be in screenplay format
    lines.push(chapter.content);
    lines.push('');

    if (contentHasTheEnd(chapter.content)) {
      hasTheEndInContent = true;
    }
  }

  // Only add ending if content doesn't already have it
  if (!hasTheEndInContent) {
    lines.push('');
    lines.push('FADE OUT.');
    lines.push('');
    lines.push('THE END');
    lines.push('');
  }

  return lines.join('\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const requestedFormat = searchParams.get('format'); // 'txt', 'epub', 'pdf', 'marketing', or null (auto)

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

    // Allow download for completed books AND preview books (free samples)
    // Preview books have limited content but should still be downloadable
    const isDownloadable = book.status === 'completed' || book.status === 'preview';
    if (!isDownloadable) {
      return NextResponse.json(
        { error: 'Book generation not complete' },
        { status: 400 }
      );
    }

    const isPreview = book.status === 'preview';
    if (isPreview) {
      console.log(`[Download] Generating preview download for book ${id} (free sample)`);
    }

    // Handle marketing materials download separately
    if (requestedFormat === 'marketing') {
      const metadata = book.metadata as {
        logline?: string;
        backCoverCopy?: string;
        amazonKeywords?: string[];
      } | null;

      if (!metadata) {
        return NextResponse.json(
          { error: 'Marketing materials not available for this book' },
          { status: 404 }
        );
      }

      const safeFilename = book.title.replace(/[^a-z0-9]/gi, '_');
      const isScreenplay = book.bookFormat === 'screenplay';
      const lines: string[] = [];

      if (isScreenplay) {
        // Screenplay pitch materials
        lines.push('═'.repeat(60));
        lines.push(`PITCH MATERIALS FOR: ${book.title.toUpperCase()}`);
        lines.push('═'.repeat(60));
        lines.push('');

        if (metadata.logline) {
          lines.push('LOGLINE');
          lines.push('─'.repeat(40));
          lines.push(metadata.logline);
          lines.push('');
        }

        if (metadata.backCoverCopy) {
          lines.push('SYNOPSIS / TREATMENT');
          lines.push('─'.repeat(40));
          lines.push(metadata.backCoverCopy);
          lines.push('');
        }

        if (metadata.amazonKeywords && metadata.amazonKeywords.length > 0) {
          lines.push('INDUSTRY TAGS & COMPARABLES');
          lines.push('─'.repeat(40));
          metadata.amazonKeywords.forEach((tag, index) => {
            lines.push(`${index + 1}. ${tag}`);
          });
          lines.push('');
        }

        lines.push('═'.repeat(60));
        lines.push('Generated by DraftMyBook.com');
        lines.push('═'.repeat(60));

        return new NextResponse(lines.join('\n'), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${safeFilename}_Pitch.txt"`,
          },
        });
      } else {
        // Book marketing materials
        lines.push('═'.repeat(60));
        lines.push(`AMAZON PUBLISHING MATERIALS FOR: ${book.title.toUpperCase()}`);
        lines.push('═'.repeat(60));
        lines.push('');

        if (metadata.logline) {
          lines.push('LOGLINE (One-Sentence Hook)');
          lines.push('─'.repeat(40));
          lines.push(metadata.logline);
          lines.push('');
        }

        if (metadata.backCoverCopy) {
          lines.push('BACK COVER COPY / AMAZON DESCRIPTION');
          lines.push('─'.repeat(40));
          lines.push(metadata.backCoverCopy);
          lines.push('');
        }

        if (metadata.amazonKeywords && metadata.amazonKeywords.length > 0) {
          lines.push('AMAZON KEYWORDS (copy each into a separate field)');
          lines.push('─'.repeat(40));
          metadata.amazonKeywords.forEach((keyword, index) => {
            lines.push(`${index + 1}. ${keyword}`);
          });
          lines.push('');
        }

        lines.push('═'.repeat(60));
        lines.push('Generated by DraftMyBook.com');
        lines.push('═'.repeat(60));

        return new NextResponse(lines.join('\n'), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="${safeFilename}_Marketing.txt"`,
          },
        });
      }
    }

    // Determine if this is a visual book (comic or children's picture book)
    const isVisualBook = book.dialogueStyle === 'bubbles' ||
                         book.dialogueStyle === 'prose' ||
                         book.bookFormat === 'picture_book';
    const isTextOnly = book.bookFormat === 'text_only';
    const isScreenplay = book.bookFormat === 'screenplay';

    // Sanitize dashes for screenplays (replace em/en dashes with regular hyphens)
    const sanitizeDashes = (text: string): string => {
      return text
        .replace(/—/g, '-')  // em dash
        .replace(/–/g, '-')  // en dash
        .replace(/−/g, '-'); // minus sign
    };

    // Prepare book data for generation
    // Filter out failed illustrations (those with null imageUrl)
    const bookData = {
      title: book.title,
      authorName: book.authorName,
      genre: book.genre,
      chapters: book.chapters.map((ch) => ({
        number: ch.number,
        title: ch.title,
        content: isScreenplay ? sanitizeDashes(ch.content) : ch.content,
        illustrations: ch.illustrations
          ?.filter((ill) => ill.imageUrl !== null)
          .map((ill) => ({
            imageUrl: ill.imageUrl as string,
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
    // All book types support TXT, EPUB, and PDF downloads
    // Screenplays default to PDF, visual books default to PDF, text books default to EPUB
    let downloadFormat: 'txt' | 'epub' | 'pdf';
    if (requestedFormat === 'txt') {
      downloadFormat = 'txt';
    } else if (requestedFormat === 'pdf') {
      // Explicit PDF request - supported for all book types
      downloadFormat = 'pdf';
    } else if (requestedFormat === 'epub') {
      // Explicit EPUB request - supported for all book types (though screenplays may look odd)
      downloadFormat = 'epub';
    } else if (isScreenplay) {
      // Screenplays default to PDF
      downloadFormat = 'pdf';
    } else if (isVisualBook && !isTextOnly) {
      // Visual books default to PDF
      downloadFormat = 'pdf';
    } else {
      // Text-only books default to EPUB
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
      console.log(`Generating TXT for book ${id}, isScreenplay=${isScreenplay}`);

      const txtContent = isScreenplay
        ? generateScreenplayTxt(bookData)
        : generateTxt(bookData);

      return new NextResponse(txtContent, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFilename}.txt"`,
        },
      });
    }

    // Use PDF for visual books and screenplays, EPUB for text-only novels
    if (downloadFormat === 'pdf') {
      // Use screenplay-specific PDF generator for screenplays
      if (isScreenplay) {
        console.log(`Generating screenplay PDF for book ${id}`);

        // Combine all sequence content into one screenplay
        const fullContent = bookData.chapters.map(ch => ch.content).join('\n\n');
        const pdfBuffer = await generateScreenplayPdf({
          title: bookData.title,
          authorName: bookData.authorName,
          content: fullContent,
        });

        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
          },
        });
      }

      // Use text PDF generator for text-only books (novels, non-fiction, lead magnets)
      if (isTextOnly) {
        console.log(`Generating text PDF for book ${id}: format=${book.bookFormat}`);

        const pdfBuffer = await generateTextPdf({
          title: bookData.title,
          authorName: bookData.authorName,
          chapters: bookData.chapters,
          fontStyle: bookData.fontStyle,
          metadata: book.metadata as { backCoverCopy?: string; includeBackCoverInPdf?: boolean } | undefined,
        });

        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
          },
        });
      }

      // Use visual PDF generator for picture books and comics
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
