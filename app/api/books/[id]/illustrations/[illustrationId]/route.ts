import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; illustrationId: string }> }
) {
  try {
    const { id, illustrationId } = await params;

    // Verify the book exists
    const book = await prisma.book.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Get the illustration (check both direct bookId and chapter.bookId)
    const illustration = await prisma.illustration.findFirst({
      where: {
        id: illustrationId,
        OR: [
          { bookId: id },
          { chapter: { bookId: id } },
        ],
      },
      select: {
        imageUrl: true,
        altText: true,
      },
    });

    if (!illustration) {
      return NextResponse.json({ error: 'Illustration not found' }, { status: 404 });
    }

    // Parse the base64 data URL
    const matches = illustration.imageUrl.match(/^data:image\/([a-z]+);base64,(.+)$/i);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    const [, format, base64Data] = matches;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Return the image with proper content type
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': `image/${format}`,
        'Content-Disposition': `inline; filename="illustration-${illustrationId}.${format}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving illustration:', error);
    return NextResponse.json({ error: 'Failed to serve illustration' }, { status: 500 });
  }
}
