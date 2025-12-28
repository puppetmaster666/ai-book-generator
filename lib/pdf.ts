import PDFDocument from 'pdfkit';
import { FONT_STYLES } from './constants';
import path from 'path';
import fs from 'fs';

interface Illustration {
  imageUrl: string;
  altText?: string;
  position: number;
}

interface Chapter {
  number: number;
  title: string;
  content: string;
  illustrations?: Illustration[];
}

interface BookData {
  title: string;
  authorName: string;
  genre: string;
  chapters: Chapter[];
  fontStyle: keyof typeof FONT_STYLES;
  coverImageUrl?: string;
  bookFormat?: string;
  dialogueStyle?: string;
}

// Convert base64 data URL to Buffer
function base64ToBuffer(dataUrl: string): Buffer | null {
  try {
    const matches = dataUrl.match(/^data:image\/([a-z]+);base64,(.+)$/i);
    if (!matches) return null;
    return Buffer.from(matches[2], 'base64');
  } catch {
    return null;
  }
}

// Load font as buffer - works in both dev and Vercel serverless
function loadFontBuffer(fontName: string): Buffer | null {
  const possiblePaths = [
    // Assets folder (bundled with serverless function)
    path.join(process.cwd(), 'assets', 'fonts', fontName),
    // Public folder (development)
    path.join(process.cwd(), 'public', 'fonts', fontName),
    // Vercel serverless paths
    path.join(__dirname, '..', 'assets', 'fonts', fontName),
    path.join(__dirname, '..', '..', 'assets', 'fonts', fontName),
  ];

  for (const fontPath of possiblePaths) {
    try {
      if (fs.existsSync(fontPath)) {
        return fs.readFileSync(fontPath);
      }
    } catch {
      continue;
    }
  }

  console.warn(`Font not found: ${fontName}, tried paths:`, possiblePaths);
  return null;
}

export async function generatePdf(bookData: BookData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const isComic = bookData.dialogueStyle === 'bubbles';
      const chunks: Buffer[] = [];

      // Create PDF document - landscape for visual books
      const doc = new PDFDocument({
        size: [1024, 768], // 4:3 landscape
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        info: {
          Title: bookData.title,
          Author: bookData.authorName,
        },
      });

      // Register custom fonts to avoid AFM file issues on Vercel
      const regularFontBuffer = loadFontBuffer('WorkSans-Regular.ttf');
      const boldFontBuffer = loadFontBuffer('Raleway-Bold.ttf');

      if (regularFontBuffer && boldFontBuffer) {
        doc.registerFont('Regular', regularFontBuffer);
        doc.registerFont('Bold', boldFontBuffer);
      } else {
        // Fonts not found - this will fail, but let's provide a clear error
        throw new Error('Required fonts not found. Ensure WorkSans-Regular.ttf and Raleway-Bold.ttf are in assets/fonts/');
      }

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Cover Page - Full page cover image if available
      if (bookData.coverImageUrl) {
        const coverBuffer = base64ToBuffer(bookData.coverImageUrl);
        if (coverBuffer) {
          try {
            doc.image(coverBuffer, 0, 0, {
              width: 1024,
              height: 768,
              fit: [1024, 768],
              align: 'center',
              valign: 'center',
            });
            doc.addPage(); // Add new page for title page
          } catch (coverError) {
            console.error('Error adding cover to PDF:', coverError);
            // Continue without cover
          }
        }
      }

      // Title Page - Light theme
      doc.rect(0, 0, 1024, 768).fill('#FAFAFA');
      doc.fillColor('#0a0a0a')
         .fontSize(48)
         .font('Bold')
         .text(bookData.title, 50, 280, { width: 924, align: 'center' });

      doc.fillColor('#737373')
         .fontSize(24)
         .font('Regular')
         .text(isComic ? 'A Comic Story' : 'A Picture Book', 50, 360, { width: 924, align: 'center' });

      doc.fillColor('#0a0a0a')
         .fontSize(20)
         .text('by', 50, 420, { width: 924, align: 'center' });

      doc.fontSize(28)
         .font('Bold')
         .text(bookData.authorName, 50, 460, { width: 924, align: 'center' });

      // Add each chapter/panel as a full page
      for (const chapter of bookData.chapters) {
        doc.addPage();

        // If chapter has illustrations, use the first one as full page
        if (chapter.illustrations && chapter.illustrations.length > 0) {
          const illustration = chapter.illustrations[0];
          const imageBuffer = base64ToBuffer(illustration.imageUrl);

          if (imageBuffer) {
            try {
              // Full page image
              doc.image(imageBuffer, 0, 0, {
                width: 1024,
                height: 768,
                fit: [1024, 768],
                align: 'center',
                valign: 'center',
              });
            } catch (imgError) {
              console.error('Error adding image to PDF:', imgError);
              // Fallback: gray background with text
              doc.rect(0, 0, 1024, 768).fill('#1a1a1a');
              doc.fillColor('#666666')
                 .fontSize(16)
                 .text('Image could not be loaded', 50, 350, { width: 924, align: 'center' });
            }
          }
        } else {
          // No illustration - show text content on light background
          doc.rect(0, 0, 1024, 768).fill('#FAFAFA');
        }

        // For children's books (prose), add text below image or as overlay
        if (!isComic && chapter.content) {
          // Light footer for text
          doc.rect(0, 620, 1024, 148).fill('rgba(250, 250, 250, 0.95)');

          doc.fillColor('#0a0a0a')
             .fontSize(16)
             .font('Regular')
             .text(chapter.content, 50, 640, {
               width: 924,
               align: 'center',
               lineGap: 6,
             });
        }
      }

      // End page
      doc.addPage();
      doc.rect(0, 0, 1024, 768).fill('#FAFAFA');
      doc.fillColor('#0a0a0a')
         .fontSize(24)
         .font('Bold')
         .text('The End', 50, 340, { width: 924, align: 'center' });

      doc.fillColor('#737373')
         .fontSize(14)
         .font('Regular')
         .text(`Created with draftmybook.com`, 50, 400, { width: 924, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
