import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { number: 'asc' },
          include: {
            illustrations: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                altText: true,
                position: true,
                createdAt: true,
                // Don't include imageUrl (base64) - use API endpoint instead
              },
            },
          },
        },
        illustrations: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            chapterId: true,
            altText: true,
            position: true,
            createdAt: true,
            // Don't include imageUrl (base64) - use API endpoint instead
          },
        },
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Transform illustrations to use API URLs instead of inline base64
    const transformedBook = {
      ...book,
      illustrations: book.illustrations.map(ill => ({
        ...ill,
        imageUrl: `/api/books/${id}/illustrations/${ill.id}`,
      })),
      chapters: book.chapters.map(ch => ({
        ...ch,
        illustrations: ch.illustrations?.map(ill => ({
          ...ill,
          imageUrl: `/api/books/${id}/illustrations/${ill.id}`,
        })),
      })),
    };

    return NextResponse.json({ book: transformedBook });
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { email, authorName } = body;

    // Only allow updating certain fields
    const updateData: { email?: string; authorName?: string } = {};
    if (email !== undefined) updateData.email = email;
    if (authorName !== undefined) updateData.authorName = authorName;

    const book = await prisma.book.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ book });
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Failed to update book' },
      { status: 500 }
    );
  }
}
