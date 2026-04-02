import { NextRequest, NextResponse } from 'next/server';
import { expandIdea } from '@/lib/gemini';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { getRegionFromCountryCode } from '@/lib/generation/shared/name-variety';

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

    // Detect user's region from Vercel geo headers
    const countryCode = request.headers.get('x-vercel-ip-country');
    const detectedRegion = getRegionFromCountryCode(countryCode);

    // Pass bookType and region to expandIdea
    const bookPlan = await expandIdea(idea, bookType, detectedRegion);

    // Include detected region in response so frontend can store it
    return NextResponse.json({ ...bookPlan, detectedRegion });
  } catch (error) {
    console.error('Error expanding idea:', error);
    return NextResponse.json(
      { error: 'Failed to expand idea. Please try again.' },
      { status: 500 }
    );
  }
}
