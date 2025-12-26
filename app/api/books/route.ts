import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GENRES, GenreKey } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title,
      authorName,
      genre,
      bookType,
      premise,
      characters,
      beginning,
      middle,
      ending,
      writingStyle,
      chapterFormat,
      fontStyle,
      targetWords,
      targetChapters,
      email,
      userId,
      // New illustration fields
      bookFormat,
      artStyle,
      bookPreset,
    } = body;

    // Validate required fields
    if (!title || !genre || !premise || !beginning || !middle || !ending) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get genre settings as fallback
    const genreConfig = GENRES[genre as GenreKey];

    // Create book record
    const book = await prisma.book.create({
      data: {
        id: uuidv4(),
        title,
        authorName: authorName || 'Anonymous',
        genre,
        bookType: bookType || genreConfig?.type || 'fiction',
        premise,
        characters: characters || [],
        beginning,
        middle,
        ending,
        writingStyle: writingStyle || 'literary',
        chapterFormat: chapterFormat || 'both',
        fontStyle: fontStyle || 'classic',
        targetWords: targetWords || genreConfig?.targetWords || 60000,
        targetChapters: targetChapters || genreConfig?.chapters || 20,
        email: email || null,
        userId: userId || null,
        status: 'pending',
        // Illustration settings
        bookFormat: bookFormat || 'text_only',
        artStyle: artStyle || null,
        bookPreset: bookPreset || null,
      },
    });

    return NextResponse.json({ bookId: book.id, book });
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'userId or email required' },
        { status: 400 }
      );
    }

    const books = await prisma.book.findMany({
      where: userId ? { userId } : { email },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        genre: true,
        status: true,
        currentChapter: true,
        totalChapters: true,
        totalWords: true,
        coverImageUrl: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({ books });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}
