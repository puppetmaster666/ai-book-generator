import { NextResponse } from 'next/server';
import { generateBookIdea } from '@/lib/gemini';

export async function POST() {
  try {
    const idea = await generateBookIdea();
    return NextResponse.json({ idea });
  } catch (error) {
    console.error('Error generating idea:', error);
    return NextResponse.json(
      { error: 'Failed to generate idea. Please try again.' },
      { status: 500 }
    );
  }
}
