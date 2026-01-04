import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { GENRES, GenreKey, BOOK_PRESETS, BookPresetKey } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

// Get IP address from request
function getIpAddress(request: NextRequest): string {
  // Try various headers (Vercel, Cloudflare, standard)
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         'unknown';
}

// Rate limiting: Check if IP or user has exceeded limits
async function checkRateLimit(ip: string, userId: string | null, email: string | null): Promise<{ allowed: boolean; error?: string }> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // IP-based limit: 5 books per hour (prevents spam attacks)
  const ipBookCount = await prisma.book.count({
    where: {
      ipAddress: ip,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (ipBookCount >= 5) {
    return {
      allowed: false,
      error: 'Rate limit exceeded: Maximum 5 books per hour from your IP. Please try again later.',
    };
  }

  // User-based limit if logged in: 10 books per day
  if (userId) {
    const userBookCount = await prisma.book.count({
      where: {
        userId,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (userBookCount >= 10) {
      return {
        allowed: false,
        error: 'Rate limit exceeded: Maximum 10 books per day. Please try again tomorrow.',
      };
    }
  }

  // Email-based limit for anonymous users: 3 books per day per email
  if (!userId && email) {
    const emailBookCount = await prisma.book.count({
      where: {
        email,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (emailBookCount >= 3) {
      return {
        allowed: false,
        error: 'Rate limit exceeded: Maximum 3 books per day for anonymous users. Please sign up for more.',
      };
    }
  }

  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId } = body;

    // Get IP address for rate limiting
    const ipAddress = getIpAddress(request);

    // Check rate limits (IP + user/email based)
    const rateLimitCheck = await checkRateLimit(ipAddress, userId || null, email || null);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.error },
        { status: 429 }
      );
    }

    // Email verification requirement for free books
    // If user is logged in and trying to use their free book, require verified email
    if (userId && !body.paymentId && !body.paymentStatus) {
      // Check if user's email is verified
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true, freeBookUsed: true },
      });

      if (user && !user.freeBookUsed && !user.emailVerified) {
        return NextResponse.json(
          { error: 'Please verify your email before generating your free book. Check your inbox for the verification link.' },
          { status: 403 }
        );
      }
    }

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
      originalIdea,
      characters,
      beginning,
      middle,
      ending,
      writingStyle,
      chapterFormat,
      fontStyle,
      targetWords,
      targetChapters,
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
        authorName: authorName || '',
        genre,
        bookType: bookType || genreConfig?.type || 'fiction',
        premise,
        originalIdea: originalIdea || null,
        characters: characters || [],
        beginning,
        middle,
        ending,
        writingStyle: writingStyle || 'literary',
        chapterFormat: chapterFormat || 'both',
        fontStyle: fontStyle || 'classic',
        targetWords: targetWords || (genreConfig && 'targetWords' in genreConfig ? genreConfig.targetWords :
                     genreConfig && 'targetPages' in genreConfig ? genreConfig.targetPages * 250 : 60000),
        targetChapters: targetChapters || (genreConfig && 'chapters' in genreConfig ? genreConfig.chapters :
                        genreConfig && 'sequences' in genreConfig ? genreConfig.sequences : 20),
        email: email || null,
        userId: userId || null,
        ipAddress, // Track IP for rate limiting
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

    // ONLY match on userId - email matching was causing admin to see user books they restarted
    // Users should claim anonymous books via /claim endpoint, not via email matching
    const books = await prisma.book.findMany({
      where: { userId: userId || undefined },
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
