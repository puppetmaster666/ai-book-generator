import PDFDocument from 'pdfkit';
import { FONT_STYLES } from './constants';

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

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title Page - Light theme
      doc.rect(0, 0, 1024, 768).fill('#FAFAFA');
      doc.fillColor('#0a0a0a')
         .fontSize(48)
         .font('Helvetica-Bold')
         .text(bookData.title, 50, 280, { width: 924, align: 'center' });

      doc.fillColor('#737373')
         .fontSize(24)
         .font('Helvetica')
         .text(isComic ? 'A Comic Story' : 'A Picture Book', 50, 360, { width: 924, align: 'center' });

      doc.fillColor('#0a0a0a')
         .fontSize(20)
         .text('by', 50, 420, { width: 924, align: 'center' });

      doc.fontSize(28)
         .font('Helvetica-Bold')
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
             .font('Helvetica')
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
         .font('Helvetica-Bold')
         .text('The End', 50, 340, { width: 924, align: 'center' });

      doc.fillColor('#737373')
         .fontSize(14)
         .font('Helvetica')
         .text(`Created with draftmybook.com`, 50, 400, { width: 924, align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
