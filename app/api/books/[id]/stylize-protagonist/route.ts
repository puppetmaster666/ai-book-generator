import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';
import { ART_STYLES, type ArtStyleKey } from '@/lib/constants';
import { switchToBackupKey } from '@/lib/gemini';

// Lazy initialization with backup key support
let genAI: GoogleGenerativeAI | null = null;
let _useBackupKey = false;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (_useBackupKey && process.env.GEMINI_API_KEY_BACKUP1) {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_BACKUP1);
      return genAI;
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 3000
): Promise<T> {
  let lastError: Error | null = null;
  let triedBackupKey = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message?.toLowerCase() || '';

      const isRateLimitError =
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('429') ||
        errorMessage.includes('resource exhausted') ||
        errorMessage.includes('too many requests');

      if (!isRateLimitError) {
        throw lastError;
      }

      if (!triedBackupKey && attempt >= 1) {
        const switched = switchToBackupKey();
        if (switched) {
          triedBackupKey = true;
          _useBackupKey = true;
          genAI = null;
          console.log('[Stylize Protagonist] Retrying with backup API key...');
          attempt--;
          continue;
        }
      }

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`[Stylize Protagonist] Rate limit hit, retrying in ${delay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const { imageBase64, mimeType } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Get book details to find the art style
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        artStyle: true,
        bookFormat: true,
        characters: true,
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (!book.artStyle) {
      return NextResponse.json(
        { error: 'This book does not have an art style (text-only books do not support protagonist images)' },
        { status: 400 }
      );
    }

    // Get the art style configuration
    const styleConfig = ART_STYLES[book.artStyle as ArtStyleKey];
    if (!styleConfig) {
      return NextResponse.json(
        { error: 'Invalid art style' },
        { status: 400 }
      );
    }

    console.log(`[Stylize Protagonist] Stylizing protagonist photo for book ${bookId} in ${styleConfig.label} style`);

    // Get the main character name if available
    const characters = book.characters as Array<{ name: string; description: string }> | null;
    const mainCharacterName = characters?.[0]?.name || 'the protagonist';

    // Build the prompt to transform the photo into the art style
    const stylizePrompt = `You are creating a character reference for an illustrated book. Transform this photograph into ${styleConfig.label} illustration style.

ART STYLE TO USE: ${styleConfig.prompt}

TRANSFORMATION REQUIREMENTS:
1. Transform this person's face and appearance into ${styleConfig.label} style illustration
2. Maintain the person's key identifying features (face shape, hair style, eye shape, distinctive features)
3. Use the exact art style colors and rendering technique: ${styleConfig.prompt}
4. The result should look like a character from a ${styleConfig.category === 'comic' ? 'comic book' : "children's picture book"}
5. Create a portrait-style image showing the character from shoulders up
6. The character should have a friendly, approachable expression
7. Background should be simple/neutral to focus on the character

CRITICAL: The transformed image must be recognizable as the same person, just rendered in ${styleConfig.label} art style. This will be used as the character reference for "${mainCharacterName}" in all illustrations.

DO NOT include any text, words, or labels in the image.`;

    // Use Gemini to transform the image
    const model = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
    });

    const result = await withRetry(async () => {
      return await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: imageBase64,
          },
        },
        stylizePrompt,
      ]);
    });

    const response = result.response;
    const candidate = response.candidates?.[0];

    if (!candidate) {
      const blockReason = response.promptFeedback?.blockReason;
      console.error('[Stylize Protagonist] No candidates. Block reason:', blockReason);
      return NextResponse.json(
        { error: 'Failed to stylize image - content may be blocked', blocked: true },
        { status: 400 }
      );
    }

    if (candidate.finishReason === 'SAFETY') {
      console.error('[Stylize Protagonist] Safety block:', candidate.safetyRatings);
      return NextResponse.json(
        { error: 'Image blocked by content policy', blocked: true },
        { status: 400 }
      );
    }

    // Extract the stylized image
    const parts = candidate.content?.parts || [];
    let stylizedImage: { base64: string; mimeType: string } | null = null;
    let description = '';

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        stylizedImage = {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        };
      } else if (part.text) {
        description = part.text;
      }
    }

    if (!stylizedImage) {
      console.error('[Stylize Protagonist] No stylized image in response');
      return NextResponse.json(
        { error: 'Failed to generate stylized image' },
        { status: 500 }
      );
    }

    // Now analyze the stylized character to generate a text description
    // This will be used for consistency in future illustrations
    const descriptionModel = getGenAI().getGenerativeModel({
      model: 'gemini-2.0-flash',
    });

    const descriptionResult = await withRetry(async () => {
      return await descriptionModel.generateContent([
        {
          inlineData: {
            mimeType: stylizedImage!.mimeType,
            data: stylizedImage!.base64,
          },
        },
        `Analyze this character illustration and provide a detailed visual description that can be used to consistently recreate this character in other illustrations.

Include:
1. Face shape and features (eyes, nose, mouth, eyebrows)
2. Hair color, style, and length
3. Skin tone
4. Any distinctive features (freckles, dimples, etc.)
5. Expression/demeanor
6. Approximate age appearance

Format as a single paragraph that could be used as a character reference guide. Be specific about colors and proportions in ${styleConfig.label} art style terms.`
      ]);
    });

    const protagonistDescription = descriptionResult.response.text() || description;

    // Save to database
    const imageDataUrl = `data:${stylizedImage.mimeType};base64,${stylizedImage.base64}`;
    const originalDataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

    await prisma.book.update({
      where: { id: bookId },
      data: {
        protagonistPhoto: originalDataUrl,
        protagonistStyled: imageDataUrl,
        protagonistDescription,
      },
    });

    console.log(`[Stylize Protagonist] Successfully stylized and saved protagonist for book ${bookId}`);

    return NextResponse.json({
      success: true,
      styledImage: imageDataUrl,
      description: protagonistDescription,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error stylizing protagonist:', errorMessage);

    return NextResponse.json(
      { error: `Failed to stylize protagonist: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// DELETE - Remove protagonist image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;

    await prisma.book.update({
      where: { id: bookId },
      data: {
        protagonistPhoto: null,
        protagonistStyled: null,
        protagonistDescription: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing protagonist:', error);
    return NextResponse.json(
      { error: 'Failed to remove protagonist image' },
      { status: 500 }
    );
  }
}
