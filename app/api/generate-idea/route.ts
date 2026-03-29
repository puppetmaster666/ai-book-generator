import { NextRequest, NextResponse } from 'next/server';
import { generateBookIdea, type IdeaCategory } from '@/lib/gemini';
import { rateLimit, rateLimitPeek, getClientIP } from '@/lib/rate-limit';

const MONTHLY_IDEA_LIMIT = 5;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// GET: Check remaining idea generations without consuming one
export async function GET(request: NextRequest) {
  const ip = getClientIP(request.headers);
  const { remaining } = rateLimitPeek(`gen-idea:${ip}`, MONTHLY_IDEA_LIMIT, ONE_MONTH_MS);
  return NextResponse.json({ remaining, limit: MONTHLY_IDEA_LIMIT });
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request.headers);

    // Check monthly limit: 5 idea generations per IP per month
    const { limited, remaining } = rateLimit(`gen-idea:${ip}`, MONTHLY_IDEA_LIMIT, ONE_MONTH_MS);
    if (limited) {
      return NextResponse.json({
        error: 'You\'ve used all 5 free idea generations this month. Try again next month, or type your own idea!',
        remaining: 0,
        limit: MONTHLY_IDEA_LIMIT,
      }, { status: 429 });
    }

    // Parse category from request body (optional)
    let category: IdeaCategory = 'random';
    try {
      const body = await request.json();
      if (body.category && ['novel', 'childrens', 'comic', 'nonfiction', 'screenplay', 'adult_comic', 'tv_series', 'short_story', 'random'].includes(body.category)) {
        category = body.category;
      }
    } catch {
      // No body or invalid JSON - use random
    }

    const idea = await generateBookIdea(category);
    return NextResponse.json({
      idea,
      remaining,
      limit: MONTHLY_IDEA_LIMIT,
    });
  } catch (error) {
    console.error('Error generating idea:', error);
    return NextResponse.json(
      { error: 'Failed to generate idea. Please try again.' },
      { status: 500 }
    );
  }
}
