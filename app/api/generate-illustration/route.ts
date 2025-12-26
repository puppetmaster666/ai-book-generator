import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ART_STYLES, type ArtStyleKey } from '@/lib/constants';

// Lazy initialization
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Important: For illustrations, we need to be very specific about text
// DO NOT include any text, words, letters, or numbers in the image
const NO_TEXT_INSTRUCTION = `CRITICAL: Do NOT include any text, words, letters, numbers, signs, labels, or written characters anywhere in the image. The image must be purely visual with no readable text elements whatsoever.`;

export async function POST(request: NextRequest) {
  try {
    const { scene, artStyle, characters, setting, bookTitle } = await request.json();

    if (!scene) {
      return NextResponse.json(
        { error: 'Scene description is required' },
        { status: 400 }
      );
    }

    // Get art style prompt addition
    const styleConfig = artStyle ? ART_STYLES[artStyle as ArtStyleKey] : null;
    const stylePrompt = styleConfig?.prompt || 'professional book illustration';

    // Build a detailed prompt for the illustration
    const prompt = buildIllustrationPrompt({
      scene,
      stylePrompt,
      characters,
      setting,
      bookTitle,
    });

    // Generate image using Gemini Image model
    const model = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
    });

    const result = await model.generateContent(prompt);
    const response = result.response;

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts || [];
    let imageData = null;
    let altText = '';

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageData = {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        };
      } else if (part.text) {
        altText = part.text;
      }
    }

    if (!imageData) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      image: imageData,
      altText: altText || scene.slice(0, 100),
      prompt,
    });
  } catch (error) {
    console.error('Error generating illustration:', error);
    return NextResponse.json(
      { error: 'Failed to generate illustration' },
      { status: 500 }
    );
  }
}

function buildIllustrationPrompt({
  scene,
  stylePrompt,
  characters,
  setting,
  bookTitle,
}: {
  scene: string;
  stylePrompt: string;
  characters?: Array<{ name: string; description: string }>;
  setting?: string;
  bookTitle?: string;
}): string {
  let prompt = `Create a beautiful book illustration in ${stylePrompt} style.\n\n`;

  prompt += `${NO_TEXT_INSTRUCTION}\n\n`;

  prompt += `Scene to illustrate: ${scene}\n\n`;

  if (characters && characters.length > 0) {
    prompt += `Characters that may appear:\n`;
    characters.forEach((char) => {
      prompt += `- ${char.name}: ${char.description}\n`;
    });
    prompt += '\n';
  }

  if (setting) {
    prompt += `Setting/Environment: ${setting}\n\n`;
  }

  prompt += `Requirements:
- Create a single cohesive illustration that captures the emotional essence of the scene
- Use expressive, dynamic composition
- Maintain consistent character appearances if they appear in multiple illustrations
- The illustration should be suitable for a ${bookTitle ? `book titled "${bookTitle}"` : 'published book'}
- Focus on visual storytelling without any text elements
- High quality, professional book illustration suitable for print`;

  return prompt;
}
