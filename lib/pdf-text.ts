import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface Chapter {
  number: number;
  title: string;
  content: string;
}

interface BookMetadata {
  backCoverCopy?: string;
  includeBackCoverInPdf?: boolean;
}

interface BookData {
  title: string;
  authorName: string;
  chapters: Chapter[];
  fontStyle?: string;
  metadata?: BookMetadata;
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

  // Parse title for main title vs subtitle (split on colon)
  const fullTitle = sanitizedBookData.title;
  const colonIndex = fullTitle.indexOf(':');
  let bookMainTitle: string;
  let bookSubtitle: string | null = null;

  if (colonIndex > 0) {
    bookMainTitle = fullTitle.substring(0, colonIndex).trim();
    bookSubtitle = fullTitle.substring(colonIndex + 1).trim();
  } else {
    bookMainTitle = fullTitle;
  }

  // Title page layout - centered vertically
  const mainTitleSize = 36; // Larger main title
  const subtitleSize = 18; // Clearly smaller subtitle
  const authorSize = 16;

  // Calculate total height needed for title block
  const mainTitleLines = wrapText(bookMainTitle.toUpperCase(), titleFont, mainTitleSize, contentWidth - 40);
  let titleBlockHeight = mainTitleLines.length * (mainTitleSize * 1.3);

  if (bookSubtitle) {
    const subtitleLines = wrapText(bookSubtitle, italicFont, subtitleSize, contentWidth - 60);
    titleBlockHeight += 30; // Gap between title and subtitle
    titleBlockHeight += subtitleLines.length * (subtitleSize * 1.4);
  }

  if (sanitizedBookData.authorName && sanitizedBookData.authorName.trim()) {
    titleBlockHeight += 60; // Gap before author
    titleBlockHeight += authorSize * 1.3;
  }

  // Start position - center the title block vertically
  let y = (pageHeight + titleBlockHeight) / 2;

  // Draw decorative line above title
  const lineWidth = 150;
  page.drawLine({
    start: { x: (pageWidth - lineWidth) / 2, y: y + 40 },
    end: { x: (pageWidth + lineWidth) / 2, y: y + 40 },
    thickness: 1.5,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Draw main title - large, bold, uppercase
  for (const titleLine of mainTitleLines) {
    const textWidth = titleFont.widthOfTextAtSize(titleLine, mainTitleSize);
    page.drawText(titleLine, {
      x: (pageWidth - textWidth) / 2,
      y,
      size: mainTitleSize,
      font: titleFont,
      color: textColor,
    });
    y -= mainTitleSize * 1.3;
  }

  // Draw subtitle if present - smaller, italic, different style
  if (bookSubtitle) {
    y -= 20; // Gap between main title and subtitle
    const subtitleLines = wrapText(bookSubtitle, italicFont, subtitleSize, contentWidth - 60);

    for (const line of subtitleLines) {
      const textWidth = italicFont.widthOfTextAtSize(line, subtitleSize);
      page.drawText(line, {
        x: (pageWidth - textWidth) / 2,
        y,
        size: subtitleSize,
        font: italicFont,
        color: rgb(0.25, 0.25, 0.25), // Slightly lighter
      });
      y -= subtitleSize * 1.4;
    }
  }

  // Draw decorative line below title/subtitle
  y -= 20;
  page.drawLine({
    start: { x: (pageWidth - lineWidth) / 2, y },
    end: { x: (pageWidth + lineWidth) / 2, y },
    thickness: 1.5,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Draw author name (only if provided)
  if (sanitizedBookData.authorName && sanitizedBookData.authorName.trim()) {
    y -= 50; // Space after decorative line
    const byLine = `by ${sanitizedBookData.authorName}`;
    const byLineWidth = italicFont.widthOfTextAtSize(byLine, authorSize);
    page.drawText(byLine, {
      x: (pageWidth - byLineWidth) / 2,
      y,
      size: authorSize,
      font: italicFont,
      color: rgb(0.35, 0.35, 0.35),
    });
  }

  // Add each chapter
  for (const chapter of sanitizedBookData.chapters) {
    // Start new page for each chapter
    page = addPage();

    // Chapter title - handle subtitles (text after colon in title)
    // e.g., "Shadow Cities: Life at Bletchley Park" becomes:
    //   "Chapter 4" (small, centered)
    //   "Shadow Cities" (large, centered)
    //   "Life at Bletchley Park" (smaller italic, centered)
    const chapterColonIndex = chapter.title.indexOf(':');
    let chapterMainTitle: string;
    let chapterSubtitle: string | null = null;

    if (chapterColonIndex > 0) {
      chapterMainTitle = chapter.title.substring(0, chapterColonIndex).trim();
      chapterSubtitle = chapter.title.substring(chapterColonIndex + 1).trim();
    } else {
      chapterMainTitle = chapter.title;
    }

    // Chapter page layout - title block starts 1/3 down the page
    y = pageHeight - 200;

    // Draw "Chapter X" - smaller, centered, all caps
    const chapterNumText = `CHAPTER ${chapter.number}`;
    const chapterNumSize = 12;
    const chapterNumWidth = bodyFont.widthOfTextAtSize(chapterNumText, chapterNumSize);
    page.drawText(chapterNumText, {
      x: (pageWidth - chapterNumWidth) / 2,
      y,
      size: chapterNumSize,
      font: bodyFont,
      color: rgb(0.4, 0.4, 0.4), // Gray
    });
    y -= 30;

    // Draw decorative line
    const chapterLineWidth = 60;
    page.drawLine({
      start: { x: (pageWidth - chapterLineWidth) / 2, y: y + 5 },
      end: { x: (pageWidth + chapterLineWidth) / 2, y: y + 5 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 25;

    // Draw main chapter title - large, bold, centered
    const chapterTitleFontSize = 24;
    const chapterTitleLines = wrapText(chapterMainTitle, titleFont, chapterTitleFontSize, contentWidth - 40);

    for (const line of chapterTitleLines) {
      const textWidth = titleFont.widthOfTextAtSize(line, chapterTitleFontSize);
      page.drawText(line, {
        x: (pageWidth - textWidth) / 2,
        y,
        size: chapterTitleFontSize,
        font: titleFont,
        color: textColor,
      });
      y -= chapterTitleFontSize * 1.4;
    }

    // Draw subtitle if present (smaller, italic, centered)
    if (chapterSubtitle) {
      y -= 8; // Small gap
      const chapterSubtitleSize = 14;
      const chapterSubtitleLines = wrapText(chapterSubtitle, italicFont, chapterSubtitleSize, contentWidth - 60);

      for (const line of chapterSubtitleLines) {
        const textWidth = italicFont.widthOfTextAtSize(line, chapterSubtitleSize);
        page.drawText(line, {
          x: (pageWidth - textWidth) / 2,
          y,
          size: chapterSubtitleSize,
          font: italicFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= chapterSubtitleSize * 1.4;
      }
    }

    y -= 50; // Space after chapter title block before content

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

  // Add final page with "The End" centered with decorative lines
  page = addPage();
  const endY = pageHeight / 2;
  const endLineWidth = 80;

  // Decorative line above
  page.drawLine({
    start: { x: (pageWidth - endLineWidth) / 2, y: endY + 35 },
    end: { x: (pageWidth + endLineWidth) / 2, y: endY + 35 },
    thickness: 1,
    color: rgb(0.4, 0.4, 0.4),
  });

  // "The End" text
  const endText = 'The End';
  const endWidth = italicFont.widthOfTextAtSize(endText, 28);
  page.drawText(endText, {
    x: (pageWidth - endWidth) / 2,
    y: endY,
    size: 28,
    font: italicFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Decorative line below
  page.drawLine({
    start: { x: (pageWidth - endLineWidth) / 2, y: endY - 25 },
    end: { x: (pageWidth + endLineWidth) / 2, y: endY - 25 },
    thickness: 1,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Add back cover page if enabled and available
  if (sanitizedBookData.metadata?.includeBackCoverInPdf && sanitizedBookData.metadata?.backCoverCopy) {
    page = addPage();

    // Back cover layout
    const backCoverY = pageHeight - margin - 80;
    let backY = backCoverY;

    // "About This Book" header
    const aboutHeader = 'About This Book';
    const aboutHeaderSize = 18;
    const aboutHeaderWidth = titleFont.widthOfTextAtSize(aboutHeader, aboutHeaderSize);
    page.drawText(aboutHeader, {
      x: (pageWidth - aboutHeaderWidth) / 2,
      y: backY,
      size: aboutHeaderSize,
      font: titleFont,
      color: textColor,
    });
    backY -= 30;

    // Decorative line under header
    const backLineWidth = 60;
    page.drawLine({
      start: { x: (pageWidth - backLineWidth) / 2, y: backY + 5 },
      end: { x: (pageWidth + backLineWidth) / 2, y: backY + 5 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });
    backY -= 35;

    // Back cover copy text
    const backCoverText = sanitizedBookData.metadata.backCoverCopy;
    const backCoverSize = 11;
    const backCoverLineHeight = backCoverSize * 1.6;

    // Split into paragraphs
    const backParagraphs = backCoverText.split(/\n\n+|\n/).filter((p: string) => p.trim());

    for (const paragraph of backParagraphs) {
      const wrappedLines = wrapText(paragraph.trim(), italicFont, backCoverSize, contentWidth - 40);

      for (const line of wrappedLines) {
        if (backY < margin + 80) {
          // Would overflow, stop here
          break;
        }
        // Center the text for a more elegant back cover look
        const lineWidth = italicFont.widthOfTextAtSize(line, backCoverSize);
        page.drawText(line, {
          x: (pageWidth - lineWidth) / 2,
          y: backY,
          size: backCoverSize,
          font: italicFont,
          color: rgb(0.25, 0.25, 0.25),
        });
        backY -= backCoverLineHeight;
      }

      backY -= 8; // Paragraph spacing
    }
  }

  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
