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
 * Sanitize text for WinAnsi encoding (used by standard PDF fonts)
 * Replaces non-WinAnsi characters with ASCII equivalents
 */
function sanitizeForWinAnsi(text: string): string {
  // Map of non-WinAnsi characters to their ASCII equivalents
  const charMap: Record<string, string> = {
    // Polish characters
    'ł': 'l', 'Ł': 'L',
    'ą': 'a', 'Ą': 'A',
    'ę': 'e', 'Ę': 'E',
    'ć': 'c', 'Ć': 'C',
    'ń': 'n', 'Ń': 'N',
    'ś': 's', 'Ś': 'S',
    'ź': 'z', 'Ź': 'Z',
    'ż': 'z', 'Ż': 'Z',
    'ó': 'o', 'Ó': 'O',
    // Czech/Slovak characters
    'ř': 'r', 'Ř': 'R',
    'ě': 'e', 'Ě': 'E',
    'ů': 'u', 'Ů': 'U',
    'ď': 'd', 'Ď': 'D',
    'ť': 't', 'Ť': 'T',
    'ň': 'n', 'Ň': 'N',
    // Turkish characters
    'ğ': 'g', 'Ğ': 'G',
    'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I',
    // Romanian characters
    'ț': 't', 'Ț': 'T',
    'ș': 's', 'Ș': 'S',
    'ă': 'a', 'Ă': 'A',
    // Vietnamese/other diacritics (common ones)
    'đ': 'd', 'Đ': 'D',
    'ơ': 'o', 'Ơ': 'O',
    'ư': 'u', 'Ư': 'U',
    // Smart quotes and dashes (convert to ASCII equivalents)
    "\u201C": '"', "\u201D": '"',
    "\u2018": "'", "\u2019": "'",
    '–': '-', '—': '-',
    '…': '...',
    // Other common characters
    '×': 'x',
    '÷': '/',
    '•': '*',
    '′': "'",
    '″': '"',
  };

  let result = '';
  for (const char of text) {
    if (charMap[char]) {
      result += charMap[char];
    } else {
      // Check if character is in WinAnsi range (basic Latin + Latin-1 Supplement)
      const code = char.charCodeAt(0);
      if (code <= 255) {
        result += char;
      } else {
        // For other non-WinAnsi characters, try to normalize or skip
        const normalized = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalized && normalized.charCodeAt(0) <= 127) {
          result += normalized;
        } else {
          // Skip characters that can't be represented
          result += '?';
        }
      }
    }
  }
  return result;
}

/**
 * Generate a PDF for text-only books (novels, non-fiction, lead magnets)
 * Uses standard PDF fonts for maximum compatibility
 */
export async function generateTextPdf(bookData: BookData): Promise<Buffer> {
  // Sanitize all text content for WinAnsi encoding
  const sanitizedBookData = {
    ...bookData,
    title: sanitizeForWinAnsi(bookData.title),
    authorName: sanitizeForWinAnsi(bookData.authorName),
    chapters: bookData.chapters.map(ch => ({
      ...ch,
      title: sanitizeForWinAnsi(ch.title),
      content: sanitizeForWinAnsi(ch.content),
    })),
  };
  const pdfDoc = await PDFDocument.create();

  // Set document metadata
  pdfDoc.setTitle(sanitizedBookData.title);
  pdfDoc.setAuthor(sanitizedBookData.authorName);
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

  // Helper to strip duplicate chapter headings from content (since we add our own header)
  function stripChapterHeading(content: string, chapterNum: number): string {
    const lines = content.split('\n');
    // Look for chapter heading in first 5 lines
    const chapterPattern = new RegExp(`^\\s*(CHAPTER\\s+${chapterNum}|Chapter\\s+${chapterNum})\\s*[:.]?.*$`, 'i');

    let startIndex = 0;
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      if (chapterPattern.test(lines[i].trim())) {
        startIndex = i + 1;
        // Skip any empty lines after the heading
        while (startIndex < lines.length && lines[startIndex].trim() === '') {
          startIndex++;
        }
        break;
      }
    }

    return lines.slice(startIndex).join('\n');
  }

  // Helper to strip "The End" from content (we add it ourselves on a dedicated page)
  function stripTheEnd(content: string): string {
    return content.replace(/\s*\b(The\s+End|THE\s+END)\s*$/i, '').trim();
  }

  // Create title page
  let page = addPage();
  let y = pageHeight - 250; // Start lower for title page

  // Draw title centered - wrap if too long
  const titleText = sanitizedBookData.title.toUpperCase();
  const titleLines = wrapText(titleText, titleFont, titleSize, contentWidth);

  for (const titleLine of titleLines) {
    const lineWidth = titleFont.widthOfTextAtSize(titleLine, titleSize);
    page.drawText(titleLine, {
      x: (pageWidth - lineWidth) / 2,
      y,
      size: titleSize,
      font: titleFont,
      color: textColor,
    });
    y -= titleSize * 1.3; // Line height for title
  }

  // Draw author name (only if provided)
  if (sanitizedBookData.authorName && sanitizedBookData.authorName.trim()) {
    y -= 20; // Space after title
    const byLine = `by ${sanitizedBookData.authorName}`;
    const byLineWidth = italicFont.widthOfTextAtSize(byLine, 14);
    page.drawText(byLine, {
      x: (pageWidth - byLineWidth) / 2,
      y,
      size: 14,
      font: italicFont,
      color: textColor,
    });
  }

  // Add each chapter
  for (const chapter of sanitizedBookData.chapters) {
    // Start new page for each chapter
    page = addPage();
    y = pageHeight - margin - 50;

    // Chapter title - wrap if too long
    const chapterTitle = `Chapter ${chapter.number}: ${chapter.title}`;
    const chapterTitleLines = wrapText(chapterTitle, titleFont, chapterTitleSize, contentWidth);

    for (const chapterTitleLine of chapterTitleLines) {
      page.drawText(chapterTitleLine, {
        x: margin,
        y,
        size: chapterTitleSize,
        font: titleFont,
        color: textColor,
      });
      y -= chapterTitleSize * 1.3;
    }

    y -= 20; // Space after chapter title

    // Strip duplicate chapter heading and "The End" from content
    let cleanedContent = stripChapterHeading(chapter.content, chapter.number);
    cleanedContent = stripTheEnd(cleanedContent);

    // Process chapter content
    // Split by paragraphs (double newline or single newline)
    const paragraphs = cleanedContent.split(/\n\n+|\n/).filter(p => p.trim());

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

  // Add final page with "The End" centered
  page = addPage();
  const endText = 'The End';
  const endWidth = italicFont.widthOfTextAtSize(endText, 24);
  page.drawText(endText, {
    x: (pageWidth - endWidth) / 2,
    y: pageHeight / 2,
    size: 24,
    font: italicFont,
    color: textColor,
  });

  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
