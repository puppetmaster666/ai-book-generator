import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';
import { ART_STYLES, type ArtStyleKey } from '@/lib/constants';
import { switchToBackupKey, SAFETY_SETTINGS } from '@/lib/gemini';

// Lazy initialization with backup key support
let genAI: GoogleGenerativeAI | null = null;
let _useBackupKey = false;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (_useBackupKey && process.env.GEMINI_API_KEY_BACKUP1) {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_BACKUP1);
      return genAI;
    }
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_Gemini2026;
    if (!apiKey) {
      throw new Error('No Gemini API key environment variable is set');
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
    const body = await request.json();

    // Support both old format (single image) and new format (array of images)
    const images: { imageBase64: string; mimeType: string }[] = body.images
      ? body.images
      : body.imageBase64
        ? [{ imageBase64: body.imageBase64, mimeType: body.mimeType || 'image/jpeg' }]
        : [];

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
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

    console.log(`[Stylize Protagonist] Stylizing ${images.length} protagonist photo(s) for book ${bookId} in ${styleConfig.label} style`);

    // Get the main character name if available
    const characters = book.characters as Array<{ name: string; description: string }> | null;
    const mainCharacterName = characters?.[0]?.name || 'the protagonist';

    const model = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      safetySettings: SAFETY_SETTINGS,
    });

    // Stylize each photo
    const styledImages: { base64: string; mimeType: string }[] = [];
    for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
      const img = images[imgIdx];
      const angleHint = imgIdx === 0 ? 'front-facing portrait (shoulders up)' : imgIdx === 1 ? 'side or 3/4 angle view' : 'full body showing complete outfit and build';

      const stylizePrompt = `You are creating a character reference for an illustrated book. Transform this photograph into ${styleConfig.label} illustration style.

ART STYLE TO USE: ${styleConfig.prompt}

TRANSFORMATION REQUIREMENTS:
1. Transform this person into ${styleConfig.label} style illustration
2. Maintain the person's key identifying features (face shape, hair style, eye shape, distinctive features)
3. Use the exact art style colors and rendering technique: ${styleConfig.prompt}
4. Create a ${angleHint} image
5. The character should have a neutral or friendly expression
6. Background should be simple/neutral to focus on the character
7. Keep their EXACT clothing, accessories, and glasses (or lack of glasses) from the photo

CRITICAL: The transformed image must be recognizable as the same person, just rendered in ${styleConfig.label} art style. This is reference image ${imgIdx + 1} of ${images.length} for "${mainCharacterName}".

DO NOT include any text, words, or labels in the image.`;

      try {
        const result = await withRetry(async () => {
          return await model.generateContent([
            { inlineData: { mimeType: img.mimeType || 'image/jpeg', data: img.imageBase64 } },
            stylizePrompt,
          ]);
        });

        const candidate = result.response.candidates?.[0];
        if (!candidate || candidate.finishReason === 'SAFETY') {
          console.warn(`[Stylize Protagonist] Image ${imgIdx + 1} blocked, skipping`);
          continue;
        }

        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.mimeType?.startsWith('image/')) {
            styledImages.push({ base64: part.inlineData.data, mimeType: part.inlineData.mimeType });
            break;
          }
        }
      } catch (err) {
        console.warn(`[Stylize Protagonist] Failed to stylize image ${imgIdx + 1}:`, err instanceof Error ? err.message : err);
      }
    }

    if (styledImages.length === 0) {
      return NextResponse.json({ error: 'Failed to stylize any images' }, { status: 500 });
    }

    // Generate description from ALL styled images for maximum accuracy
    const descriptionModel = getGenAI().getGenerativeModel({
      model: 'gemini-3-flash-preview',
      safetySettings: SAFETY_SETTINGS,
    });

    const descriptionContent: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
    descriptionContent.push({ text: `You are analyzing ${styledImages.length} reference image(s) of the SAME character from different angles. Provide a single, comprehensive visual description that covers everything needed to draw this character consistently in every panel of a comic book.

Focus ONLY on physical features that stay the same regardless of outfit:
1. Face shape and features (eyes, nose, mouth, eyebrows, jaw)
2. Hair color, style, length, and specific details (bangs, parting, texture)
3. Skin tone (specific shade)
4. Glasses: Does the character wear glasses? YES or NO. If yes, describe them. If NO, state "Does NOT wear glasses."
5. Distinctive features (freckles, dimples, scars, facial hair, beard, mustache, etc.)
6. Body type, height impression, and build
7. Approximate age appearance

DO NOT describe their clothing or outfit. The character will wear different clothes depending on the scene (gym clothes, work clothes, pajamas, etc). Only describe their FACE and BODY features that never change.

Format as a single detailed paragraph. Be extremely specific about facial features, hair, and body type. This description will be used to keep the character's FACE consistent across panels where they wear different outfits.` });

    for (const styled of styledImages) {
      descriptionContent.push({ inlineData: { data: styled.base64, mimeType: styled.mimeType } });
    }

    const descriptionResult = await withRetry(async () => {
      return await descriptionModel.generateContent(descriptionContent);
    });

    const protagonistDescription = descriptionResult.response.text() || '';

    // Save to database: primary styled image + all styled images array
    const primaryStyled = styledImages[0];
    const primaryDataUrl = `data:${primaryStyled.mimeType};base64,${primaryStyled.base64}`;
    const firstOriginalDataUrl = `data:${images[0].mimeType || 'image/jpeg'};base64,${images[0].imageBase64}`;
    const allStyledDataUrls = styledImages.map(s => `data:${s.mimeType};base64,${s.base64}`);

    await prisma.book.update({
      where: { id: bookId },
      data: {
        protagonistPhoto: firstOriginalDataUrl,
        protagonistStyled: primaryDataUrl,
        protagonistStyledAll: allStyledDataUrls,
        protagonistDescription,
      },
    });

    console.log(`[Stylize Protagonist] Successfully stylized ${styledImages.length} image(s) for book ${bookId}`);

    return NextResponse.json({
      success: true,
      styledImage: primaryDataUrl,
      styledImageCount: styledImages.length,
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
