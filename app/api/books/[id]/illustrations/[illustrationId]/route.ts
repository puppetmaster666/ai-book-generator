import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; illustrationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id, illustrationId } = await params;

    // Verify the book exists and check ownership
    const book = await prisma.book.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (book.userId && book.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    // Check if illustration has an image (could be null if failed)
    if (!illustration.imageUrl) {
      return NextResponse.json({ error: 'Illustration image not available (generation failed)' }, { status: 404 });
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
