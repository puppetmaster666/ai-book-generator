import PDFDocument from 'pdfkit';

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
      const chunks: Buffer[] = [];

      // Create PDF document - landscape for visual books
      // No fonts needed - all content is in images
      const doc = new PDFDocument({
        size: [1024, 768], // 4:3 landscape
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        info: {
          Title: bookData.title,
          Author: bookData.authorName,
        },
        autoFirstPage: false, // We'll add pages manually
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Cover Page - Full page cover image if available
      if (bookData.coverImageUrl) {
        const coverBuffer = base64ToBuffer(bookData.coverImageUrl);
        if (coverBuffer) {
          try {
            doc.addPage();
            doc.image(coverBuffer, 0, 0, {
              width: 1024,
              height: 768,
              fit: [1024, 768],
              align: 'center',
              valign: 'center',
            });
          } catch (coverError) {
            console.error('Error adding cover to PDF:', coverError);
          }
        }
      }

      // Add each chapter/panel as a full page image
      for (const chapter of bookData.chapters) {
        if (chapter.illustrations && chapter.illustrations.length > 0) {
          const illustration = chapter.illustrations[0];
          const imageBuffer = base64ToBuffer(illustration.imageUrl);

          if (imageBuffer) {
            try {
              doc.addPage();
              doc.image(imageBuffer, 0, 0, {
                width: 1024,
                height: 768,
                fit: [1024, 768],
                align: 'center',
                valign: 'center',
              });
            } catch (imgError) {
              console.error('Error adding image to PDF:', imgError);
              // Skip pages with failed images
            }
          }
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
