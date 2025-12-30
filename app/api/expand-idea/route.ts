import { NextRequest, NextResponse } from 'next/server';
import { expandIdea } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
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
