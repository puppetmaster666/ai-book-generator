import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; illustrationId: string }> }
) {
  try {
    const { id, illustrationId } = await params;

    // Fetch illustration first to check if it's a featured roast panel (public)
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
        isFeaturedRoastPanel: true,
      },
    });

    // Featured roast panels are public; everything else requires auth + ownership
    if (!illustration?.isFeaturedRoastPanel) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

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
    }

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

// Admin-only: toggle isFeaturedRoastPanel
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; illustrationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!adminUser?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, illustrationId } = await params;
  const body = await request.json();
  const { isFeaturedRoastPanel } = body;

  if (typeof isFeaturedRoastPanel !== 'boolean') {
    return NextResponse.json({ error: 'isFeaturedRoastPanel must be a boolean' }, { status: 400 });
  }

  const illustration = await prisma.illustration.findFirst({
    where: {
      id: illustrationId,
      OR: [{ bookId: id }, { chapter: { bookId: id } }],
    },
    select: { id: true },
  });
  if (!illustration) {
    return NextResponse.json({ error: 'Illustration not found' }, { status: 404 });
  }

  const updated = await prisma.illustration.update({
    where: { id: illustration.id },
    data: { isFeaturedRoastPanel },
    select: { id: true, isFeaturedRoastPanel: true },
  });

  return NextResponse.json(updated);
}
