import { NextRequest, NextResponse } from 'next/server';
import { generateBookIdea, type IdeaCategory } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    // Parse category from request body (optional)
    let category: IdeaCategory = 'random';
    try {
      const body = await request.json();
      if (body.category && ['novel', 'childrens', 'comic', 'adult_comic', 'random'].includes(body.category)) {
        category = body.category;
      }
    } catch {
      // No body or invalid JSON - use random
    }

    const idea = await generateBookIdea(category);
    return NextResponse.json({ idea });
  } catch (error) {
    console.error('Error generating idea:', error);
    return NextResponse.json(
      { error: 'Failed to generate idea. Please try again.' },
      { status: 500 }
    );
  }
}
