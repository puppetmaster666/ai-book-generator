import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { parseScreenplayElements, ParsedElement } from './screenplay';

/**
 * Sanitize text for WinAnsi encoding (used by standard PDF fonts)
 * Replaces non-WinAnsi characters with ASCII equivalents
 */
function sanitizeForWinAnsi(text: string): string {
  const charMap: Record<string, string> = {
    // Polish characters
    'ł': 'l', 'Ł': 'L', 'ą': 'a', 'Ą': 'A', 'ę': 'e', 'Ę': 'E',
    'ć': 'c', 'Ć': 'C', 'ń': 'n', 'Ń': 'N', 'ś': 's', 'Ś': 'S',
    'ź': 'z', 'Ź': 'Z', 'ż': 'z', 'Ż': 'Z', 'ó': 'o', 'Ó': 'O',
    // Czech/Slovak/Turkish/Romanian
    'ř': 'r', 'Ř': 'R', 'ě': 'e', 'Ě': 'E', 'ů': 'u', 'Ů': 'U',
    'ď': 'd', 'Ď': 'D', 'ť': 't', 'Ť': 'T', 'ň': 'n', 'Ň': 'N',
    'ğ': 'g', 'Ğ': 'G', 'ş': 's', 'Ş': 'S', 'ı': 'i', 'İ': 'I',
    'ț': 't', 'Ț': 'T', 'ș': 's', 'Ș': 'S', 'ă': 'a', 'Ă': 'A',
    'đ': 'd', 'Đ': 'D', 'ơ': 'o', 'Ơ': 'O', 'ư': 'u', 'Ư': 'U',
    // Smart quotes and dashes
    '"': '"', '"': '"', "\u2018": "'", "\u2019": "'",
    '–': '-', '—': '-', '…': '...', '×': 'x', '÷': '/',
    '•': '*', '′': "'", '″': '"',
  };

  let result = '';
  for (const char of text) {
    if (charMap[char]) {
      result += charMap[char];
    } else {
      const code = char.charCodeAt(0);
      if (code <= 255) {
        result += char;
      } else {
        const normalized = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalized && normalized.charCodeAt(0) <= 127) {
          result += normalized;
        } else {
          result += '?';
        }
      }
    }
  }
  return result;
}

// Industry-standard screenplay page dimensions (US Letter)
const PAGE_WIDTH = 612; // 8.5 inches at 72 DPI
const PAGE_HEIGHT = 792; // 11 inches at 72 DPI

// Industry-standard margins (in points, 72 points = 1 inch)
const MARGIN_LEFT = 108; // 1.5 inches
const MARGIN_RIGHT = 72; // 1 inch
const MARGIN_TOP = 72; // 1 inch
const MARGIN_BOTTOM = 72; // 1 inch

// Content area
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

// Font size (industry standard is 12pt Courier)
const FONT_SIZE = 12;
const LINE_HEIGHT = 12; // Single-spaced

// Element-specific indents (from left margin)
const ELEMENT_INDENTS = {
  slugline: 0,
  action: 0,
  character: 144, // 2 inches from left margin (centered name)
  parenthetical: 108, // 1.5 inches from left margin
  dialogue: 72, // 1 inch from left margin
  transition: 0, // Right-aligned
};

// Element-specific widths
const ELEMENT_WIDTHS = {
  slugline: CONTENT_WIDTH,
  action: CONTENT_WIDTH,
  character: 216, // Character names are centered in ~3 inch area
  parenthetical: 144, // 2 inches wide
  dialogue: 252, // 3.5 inches wide
  transition: CONTENT_WIDTH, // Will be right-aligned
};

interface ScreenplayPdfData {
  title: string;
  authorName: string;
  content: string; // Full screenplay text
  pageCount?: number;
}

/**
 * Wrap text to fit within a maximum width
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
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

/**
 * Generate a title page for the screenplay
 */
async function addTitlePage(
  pdfDoc: PDFDocument,
  font: PDFFont,
  title: string,
  authorName: string
): Promise<void> {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Title - centered, 1/3 from top
  const titleY = PAGE_HEIGHT - 264; // ~3.67 inches from top
  const titleWidth = font.widthOfTextAtSize(title.toUpperCase(), FONT_SIZE);
  page.drawText(title.toUpperCase(), {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: titleY,
    size: FONT_SIZE,
    font,
    color: rgb(0, 0, 0),
  });

  // "Written by" and author name - only if author is provided
  if (authorName && authorName.trim()) {
    const writtenByY = titleY - LINE_HEIGHT * 4;
    const writtenByText = 'Written by';
    const writtenByWidth = font.widthOfTextAtSize(writtenByText, FONT_SIZE);
    page.drawText(writtenByText, {
      x: (PAGE_WIDTH - writtenByWidth) / 2,
      y: writtenByY,
      size: FONT_SIZE,
      font,
      color: rgb(0, 0, 0),
    });

    // Author name - centered below "Written by"
    const authorY = writtenByY - LINE_HEIGHT * 2;
    const authorWidth = font.widthOfTextAtSize(authorName, FONT_SIZE);
    page.drawText(authorName, {
      x: (PAGE_WIDTH - authorWidth) / 2,
      y: authorY,
      size: FONT_SIZE,
      font,
      color: rgb(0, 0, 0),
    });
  }
}

/**
 * Add a page number to a page (top right, starting from page 2)
 */
function addPageNumber(page: PDFPage, font: PDFFont, pageNumber: number): void {
  if (pageNumber < 2) return; // No number on title page

  const pageNumText = `${pageNumber}.`;
  const textWidth = font.widthOfTextAtSize(pageNumText, FONT_SIZE);

  page.drawText(pageNumText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - textWidth,
    y: PAGE_HEIGHT - 36, // 0.5 inch from top
    size: FONT_SIZE,
    font,
    color: rgb(0, 0, 0),
  });
}

/**
 * Generate a properly formatted screenplay PDF
 */
export async function generateScreenplayPdf(data: ScreenplayPdfData): Promise<Buffer> {
  // Sanitize all text content for WinAnsi encoding
  const sanitizedData = {
    ...data,
    title: sanitizeForWinAnsi(data.title),
    authorName: sanitizeForWinAnsi(data.authorName),
    content: sanitizeForWinAnsi(data.content),
  };

  const pdfDoc = await PDFDocument.create();

  // Use Courier (industry standard for screenplays)
  const font = await pdfDoc.embedFont(StandardFonts.Courier);

  // Set document metadata
  pdfDoc.setTitle(sanitizedData.title);
  pdfDoc.setAuthor(sanitizedData.authorName);
  pdfDoc.setCreator('Draft My Book');
  pdfDoc.setSubject('Screenplay');

  // Add title page
  await addTitlePage(pdfDoc, font, sanitizedData.title, sanitizedData.authorName);

  // Parse screenplay elements
  const elements = parseScreenplayElements(sanitizedData.content);

  // Track current position
  let currentPage: PDFPage | null = null;
  let currentY = 0;
  let pageNumber = 1; // Title page is page 1

  // Helper to start a new page
  function startNewPage(): PDFPage {
    pageNumber++;
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    addPageNumber(page, font, pageNumber);
    currentY = PAGE_HEIGHT - MARGIN_TOP;
    return page;
  }

  // Helper to check if we need a new page
  function ensureSpace(linesNeeded: number): void {
    const spaceNeeded = linesNeeded * LINE_HEIGHT;
    if (!currentPage || currentY - spaceNeeded < MARGIN_BOTTOM) {
      currentPage = startNewPage();
    }
  }

  // Draw each element
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const indent = ELEMENT_INDENTS[element.type];
    const maxWidth = ELEMENT_WIDTHS[element.type];

    // Calculate wrapped lines
    const lines = wrapText(element.content, font, FONT_SIZE, maxWidth);

    // Add spacing before certain elements
    let spaceBefore = 0;
    if (element.type === 'slugline') {
      spaceBefore = 2; // Double space before sluglines
    } else if (element.type === 'character' && i > 0 && elements[i - 1].type !== 'parenthetical') {
      spaceBefore = 1; // Space before character names
    } else if (element.type === 'action' && i > 0 && elements[i - 1].type === 'dialogue') {
      spaceBefore = 1; // Space after dialogue
    }

    // Ensure we have space for this element plus spacing
    ensureSpace(lines.length + spaceBefore);

    // Apply spacing
    if (spaceBefore > 0) {
      currentY -= LINE_HEIGHT * spaceBefore;
    }

    // Draw each line
    for (const line of lines) {
      if (currentY < MARGIN_BOTTOM) {
        currentPage = startNewPage();
      }

      let x = MARGIN_LEFT + indent;

      // Right-align transitions
      if (element.type === 'transition') {
        const textWidth = font.widthOfTextAtSize(line, FONT_SIZE);
        x = PAGE_WIDTH - MARGIN_RIGHT - textWidth;
      }

      currentPage!.drawText(line, {
        x,
        y: currentY,
        size: FONT_SIZE,
        font,
        color: rgb(0, 0, 0),
      });

      currentY -= LINE_HEIGHT;
    }

    // Action lines get extra spacing after if they're multi-line
    if (element.type === 'action' && lines.length > 1) {
      currentY -= LINE_HEIGHT * 0.5;
    }
  }

  // Generate the PDF bytes
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Calculate estimated page count for screenplay text
 * Based on industry standard of ~250 words per page
 */
export function estimateScreenplayPages(content: string): number {
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  return Math.ceil(wordCount / 250);
}
