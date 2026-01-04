import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface Chapter {
  number: number;
  title: string;
  content: string;
}

interface BookData {
  title: string;
  authorName: string;
  chapters: Chapter[];
  fontStyle?: string;
}

/**
 * Generate a PDF for text-only books (novels, non-fiction, lead magnets)
 * Uses standard PDF fonts for maximum compatibility
 */
export async function generateTextPdf(bookData: BookData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  // Set document metadata
  pdfDoc.setTitle(bookData.title);
  pdfDoc.setAuthor(bookData.authorName);
  pdfDoc.setCreator('Draft My Book');

  // Embed fonts
  const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // Page settings (US Letter size)
  const pageWidth = 612; // 8.5 inches
  const pageHeight = 792; // 11 inches
  const margin = 72; // 1 inch margins
  const contentWidth = pageWidth - (margin * 2);

  // Font sizes
  const titleSize = 28;
  const chapterTitleSize = 18;
  const bodySize = 11;
  const lineHeight = bodySize * 1.5;

  // Colors
  const textColor = rgb(0.1, 0.1, 0.1);

  // Helper to add a page
  function addPage() {
    return pdfDoc.addPage([pageWidth, pageHeight]);
  }

  // Helper to wrap text into lines
  function wrapText(text: string, font: typeof bodyFont, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  // Create title page
  let page = addPage();
  let y = pageHeight - 250; // Start lower for title page

  // Draw title centered
  const titleWidth = titleFont.widthOfTextAtSize(bookData.title.toUpperCase(), titleSize);
  page.drawText(bookData.title.toUpperCase(), {
    x: (pageWidth - titleWidth) / 2,
    y,
    size: titleSize,
    font: titleFont,
    color: textColor,
  });

  // Draw author name
  y -= 50;
  const byLine = `by ${bookData.authorName}`;
  const byLineWidth = italicFont.widthOfTextAtSize(byLine, 14);
  page.drawText(byLine, {
    x: (pageWidth - byLineWidth) / 2,
    y,
    size: 14,
    font: italicFont,
    color: textColor,
  });

  // Draw footer
  const footerText = 'Created with DraftMyBook.com';
  const footerWidth = italicFont.widthOfTextAtSize(footerText, 10);
  page.drawText(footerText, {
    x: (pageWidth - footerWidth) / 2,
    y: margin + 20,
    size: 10,
    font: italicFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Add each chapter
  for (const chapter of bookData.chapters) {
    // Start new page for each chapter
    page = addPage();
    y = pageHeight - margin - 50;

    // Chapter title
    const chapterTitle = `Chapter ${chapter.number}: ${chapter.title}`;
    page.drawText(chapterTitle, {
      x: margin,
      y,
      size: chapterTitleSize,
      font: titleFont,
      color: textColor,
    });

    y -= 40; // Space after chapter title

    // Process chapter content
    // Split by paragraphs (double newline or single newline)
    const paragraphs = chapter.content.split(/\n\n+|\n/).filter(p => p.trim());

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) continue;

      // First line indent for fiction
      const firstLineIndent = 20;

      // Wrap paragraph into lines
      const lines = wrapText(trimmedParagraph, bodyFont, bodySize, contentWidth - firstLineIndent);

      for (let i = 0; i < lines.length; i++) {
        // Check if we need a new page
        if (y < margin + lineHeight) {
          // Add page number to bottom of current page
          const pageNum = pdfDoc.getPageCount().toString();
          const pageNumWidth = bodyFont.widthOfTextAtSize(pageNum, 10);
          page.drawText(pageNum, {
            x: (pageWidth - pageNumWidth) / 2,
            y: margin - 20,
            size: 10,
            font: bodyFont,
            color: rgb(0.5, 0.5, 0.5),
          });

          page = addPage();
          y = pageHeight - margin;
        }

        const xOffset = i === 0 ? margin + firstLineIndent : margin;

        page.drawText(lines[i], {
          x: xOffset,
          y,
          size: bodySize,
          font: bodyFont,
          color: textColor,
        });

        y -= lineHeight;
      }

      // Add paragraph spacing
      y -= lineHeight * 0.5;
    }

    // Add page number to bottom of page
    const pageNum = pdfDoc.getPageCount().toString();
    const pageNumWidth = bodyFont.widthOfTextAtSize(pageNum, 10);
    page.drawText(pageNum, {
      x: (pageWidth - pageNumWidth) / 2,
      y: margin - 20,
      size: 10,
      font: bodyFont,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Add final page with "The End"
  page = addPage();
  y = pageHeight / 2;

  const endText = 'The End';
  const endWidth = italicFont.widthOfTextAtSize(endText, 24);
  page.drawText(endText, {
    x: (pageWidth - endWidth) / 2,
    y,
    size: 24,
    font: italicFont,
    color: textColor,
  });

  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
