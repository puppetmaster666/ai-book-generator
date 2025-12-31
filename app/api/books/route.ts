import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GENRES, GenreKey, BOOK_PRESETS, BookPresetKey } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Debug: log what we're receiving
    console.log('Creating book with:', {
      bookPreset: body.bookPreset,
      bookFormat: body.bookFormat,
      artStyle: body.artStyle,
      dialogueStyle: body.dialogueStyle,
      targetChapters: body.targetChapters,
    });

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
      dialogueStyle,
      contentRating: providedContentRating,
    } = body;

    // Determine content rating: use provided value, or look up from preset, or default to 'general'
    let contentRating = providedContentRating || 'general';
    if (!providedContentRating && bookPreset && BOOK_PRESETS[bookPreset as BookPresetKey]) {
      const preset = BOOK_PRESETS[bookPreset as BookPresetKey];
      if ('contentRating' in preset) {
        contentRating = preset.contentRating;
      }
    }

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
        dialogueStyle: dialogueStyle || null,
        // Content maturity settings
        contentRating,
      },
    });

    console.log('Book created:', {
      id: book.id,
      bookPreset: book.bookPreset,
      dialogueStyle: book.dialogueStyle,
      bookFormat: book.bookFormat,
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

    // Search by BOTH userId AND email to catch books created before user association
    const whereConditions = [];
    if (userId) whereConditions.push({ userId });
    if (email) whereConditions.push({ email });

    const books = await prisma.book.findMany({
      where: whereConditions.length > 1 ? { OR: whereConditions } : whereConditions[0],
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
