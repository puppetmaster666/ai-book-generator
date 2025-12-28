import { PDFDocument } from 'pdf-lib';

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

// Convert base64 data URL to Uint8Array
function base64ToUint8Array(dataUrl: string): { data: Uint8Array; format: string } | null {
  try {
    const matches = dataUrl.match(/^data:image\/([a-z]+);base64,(.+)$/i);
    if (!matches) return null;
    const format = matches[1].toLowerCase();
    const base64Data = matches[2];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return { data: bytes, format };
  } catch {
    return null;
  }
}

export async function generatePdf(bookData: BookData): Promise<Buffer> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Set document metadata
  pdfDoc.setTitle(bookData.title);
  pdfDoc.setAuthor(bookData.authorName);
  pdfDoc.setCreator('Draft My Book');

  // Page dimensions (landscape 4:3)
  const pageWidth = 1024;
  const pageHeight = 768;

  // Helper function to embed and add an image page
  async function addImagePage(imageDataUrl: string): Promise<boolean> {
    const imageData = base64ToUint8Array(imageDataUrl);
    if (!imageData) return false;

    try {
      let image;
      if (imageData.format === 'png') {
        image = await pdfDoc.embedPng(imageData.data);
      } else if (imageData.format === 'jpeg' || imageData.format === 'jpg') {
        image = await pdfDoc.embedJpg(imageData.data);
      } else {
        // Try PNG first, then JPG
        try {
          image = await pdfDoc.embedPng(imageData.data);
        } catch {
          image = await pdfDoc.embedJpg(imageData.data);
        }
      }

      // Calculate scaling to fit the page while maintaining aspect ratio
      const imgWidth = image.width;
      const imgHeight = image.height;
      const scale = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;

      // Center the image on the page
      const x = (pageWidth - scaledWidth) / 2;
      const y = (pageHeight - scaledHeight) / 2;

      // Add a new page and draw the image
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(image, {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      });

      return true;
    } catch (error) {
      console.error('Error embedding image in PDF:', error);
      return false;
    }
  }

  // Add cover page if available
  if (bookData.coverImageUrl) {
    await addImagePage(bookData.coverImageUrl);
  }

  // Add each chapter/panel as a full page image
  for (const chapter of bookData.chapters) {
    if (chapter.illustrations && chapter.illustrations.length > 0) {
      const illustration = chapter.illustrations[0];
      await addImagePage(illustration.imageUrl);
    }
  }

  // Generate the PDF bytes
  const pdfBytes = await pdfDoc.save();

  return Buffer.from(pdfBytes);
}
