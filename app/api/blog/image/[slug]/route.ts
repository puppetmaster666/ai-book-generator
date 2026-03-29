import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Serves blog cover images with proper caching.
 * Avoids embedding large base64 strings in HTML.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: { coverImageUrl: true },
  });

  if (!post?.coverImageUrl) {
    return new NextResponse(null, { status: 404 });
  }

  // Parse data URL: data:image/png;base64,<data>
  const match = post.coverImageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return new NextResponse(null, { status: 404 });
  }

  const [, mimeType, base64Data] = match;
  const buffer = Buffer.from(base64Data, 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
