import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

const ASPECT_RATIO_CONFIGS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1024, height: 576 },
  '9:16': { width: 576, height: 1024 },
  '4:3': { width: 1024, height: 768 },
  '3:2': { width: 1024, height: 683 },
};

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio, style } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const ratio = aspectRatio || '1:1';
    const dimensions = ASPECT_RATIO_CONFIGS[ratio] || ASPECT_RATIO_CONFIGS['1:1'];

    // Build prompt with aspect ratio guidance
    const fullPrompt = `${prompt}

Image specifications:
- Aspect ratio: ${ratio} (${dimensions.width}x${dimensions.height})
- High quality, detailed illustration
- Professional artwork suitable for commercial use
- No text, words, letters, or numbers in the image`;

    // Generate image using Gemini Image model
    const model = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
    });

    const result = await model.generateContent(fullPrompt);
    const response = result.response;

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts || [];
    let imageData = null;

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageData = {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        };
        break;
      }
    }

    if (!imageData) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    // Return as data URL for direct use
    const imageUrl = `data:${imageData.mimeType};base64,${imageData.base64}`;

    return NextResponse.json({
      imageUrl,
      style,
      aspectRatio: ratio,
    });
  } catch (error) {
    console.error('Error generating style image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
