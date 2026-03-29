import { NextRequest, NextResponse } from 'next/server';
import { expandIdea } from '@/lib/gemini';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 50 requests per day per IP
    const ip = getClientIP(request.headers);
    const { limited } = rateLimit(`expand:${ip}`, 50, 24 * 60 * 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: 'Daily limit reached. Please try again tomorrow.' }, { status: 429 });
    }

    const { idea, bookType } = await request.json();

    if (!idea || idea.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a more detailed idea (at least 10 characters)' },
        { status: 400 }
      );
    }

    // Pass bookType to expandIdea (defaults to auto-detect if not provided)
    const bookPlan = await expandIdea(idea, bookType);

    return NextResponse.json(bookPlan);
  } catch (error) {
    console.error('Error expanding idea:', error);
    return NextResponse.json(
      { error: 'Failed to expand idea. Please try again.' },
      { status: 500 }
    );
  }
}
