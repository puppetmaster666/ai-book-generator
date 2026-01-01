import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ART_STYLES, ILLUSTRATION_DIMENSIONS, type ArtStyleKey } from '@/lib/constants';
import { switchToBackupKey, SAFETY_SETTINGS } from '@/lib/gemini';

// Types for visual consistency guides
type CharacterVisualGuide = {
  characters: Array<{
    name: string;
    physicalDescription: string;
    clothing: string;
    distinctiveFeatures: string;
    colorPalette: string;
    expressionNotes: string;
  }>;
  styleNotes: string;
};

type VisualStyleGuide = {
  overallStyle: string;
  colorPalette: string;
  lightingStyle: string;
  lineWeight: string;
  backgroundTreatment: string;
  moodAndAtmosphere: string;
  consistencyRules: string[];
};

// Lazy initialization with backup key support
let genAI: GoogleGenerativeAI | null = null;
let _useBackupKey = false;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    // Try backup key first if flagged
    if (_useBackupKey && process.env.GEMINI_API_KEY_BACKUP1) {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_BACKUP1);
      return genAI;
    }
    // Use primary key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Retry utility with backup key failover
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

      // Check if it's a rate limit or quota error
      const isRateLimitError =
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('429') ||
        errorMessage.includes('resource exhausted') ||
        errorMessage.includes('too many requests');

      if (!isRateLimitError) {
        throw lastError;
      }

      // Try switching to backup key
      if (!triedBackupKey && attempt >= 1) {
        const switched = switchToBackupKey();
        if (switched) {
          triedBackupKey = true;
          _useBackupKey = true;
          genAI = null; // Reset to pick up new key
          console.log('[Illustration] Retrying with backup API key...');
          attempt--;
          continue;
        }
      }

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`[Illustration] Rate limit hit, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Important: For illustrations, we need to be very specific about text
// DO NOT include any text, words, letters, or numbers in the image
const NO_TEXT_INSTRUCTION = `CRITICAL: Do NOT include any text, words, letters, numbers, signs, labels, or written characters anywhere in the image. The image must be purely visual with no readable text elements whatsoever.`;

export async function POST(request: NextRequest) {
  try {
    const {
      scene,
      artStyle,
      characters,
      setting,
      bookTitle,
      characterVisualGuide,
      visualStyleGuide,
      bookFormat,
    } = await request.json();

    if (!scene) {
      return NextResponse.json(
        { error: 'Scene description is required' },
        { status: 400 }
      );
    }

    // Get art style prompt addition
    const styleConfig = artStyle ? ART_STYLES[artStyle as ArtStyleKey] : null;
    const stylePrompt = styleConfig?.prompt || 'professional book illustration';

    // Get aspect ratio for this book format
    const formatKey = bookFormat as keyof typeof ILLUSTRATION_DIMENSIONS;
    const dimensions = ILLUSTRATION_DIMENSIONS[formatKey] || ILLUSTRATION_DIMENSIONS.picture_book;

    // Build a detailed prompt for the illustration with consistency guides
    const prompt = buildIllustrationPrompt({
      scene,
      stylePrompt,
      characters,
      setting,
      bookTitle,
      characterVisualGuide: characterVisualGuide as CharacterVisualGuide | undefined,
      visualStyleGuide: visualStyleGuide as VisualStyleGuide | undefined,
      aspectRatioPrompt: dimensions.prompt,
    });

    // Execute with retry logic that handles safety blocks
    let useSafeMode = false;

    const generateWithSafeMode = async () => {
      // If in safe mode, sanitize the prompt
      let currentPrompt = prompt;
      if (useSafeMode) {
        console.log('[Illustration] Using SAFE MODE prompt due to previous block');
        // Add strong safety override instruction
        currentPrompt = prompt + `\n\nIMPORTANT SAFETY OVERRIDE: The previous attempt was blocked by content filters. Re-generate this scene to be completely safe for general audiences. Use euphemisms, remove any violence/gore/sexual themes, and focus on atmosphere/mood instead of explicit details. Make it PG-rated.`;

        // If a mature context was added, remove it
        currentPrompt = currentPrompt.replace(/MATURE VISUAL STYLE:.*$/m, '');
      }

      const model = getGenAI().getGenerativeModel({
        model: 'gemini-3-pro-image-preview',
        safetySettings: SAFETY_SETTINGS,
      });

      const result = await model.generateContent(currentPrompt);
      const response = result.response;

      // Check for content policy blocks
      const candidate = response.candidates?.[0];
      if (!candidate) {
        const blockReason = response.promptFeedback?.blockReason;
        // This could be a rate limit OR a block
        if (blockReason === 'SAFETY' || blockReason === 'OTHER') {
          return { blocked: true, reason: blockReason };
        }
        throw new Error(`No candidates - possible rate limit. Reason: ${blockReason || 'unknown'}`);
      }

      // Check if generation was blocked due to safety
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'OTHER') {
        return { blocked: true, reason: candidate.finishReason };
      }

      // Extract image from response
      const parts = candidate.content?.parts || [];

      // If parts is empty, this is often a rate limit issue - throw to retry
      if (parts.length === 0) {
        throw new Error('Empty response - possible rate limit');
      }

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

      return { imageData, altText };
    };

    // Retry utility modified to handle safety blocks
    const attemptGeneration = async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= 3; attempt++) {
        try {
          // If we had a safety block previously, enable safe mode for retries
          // We don't reset useSafeMode here so it persists across retries

          const result = await generateWithSafeMode();

          // Check if blocked
          if ('blocked' in result && result.blocked) {
            console.warn(`[Illustration] Blocked by ${result.reason} (attempt ${attempt + 1}/4)`);

            // If we get blocked, enable safe mode for next attempt
            if (!useSafeMode && attempt < 3) {
              useSafeMode = true;
              console.log('[Illustration] Enabling SAFE MODE for retry...');
              // Don't wait for rate limit delay if it's just a safety block, retry immediately
              continue;
            }

            // If we're already in safe mode and still blocked, or out of retries, return the block
            if (attempt === 3) return result;

            // If standard block, continue to next retry
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }

          return result;

        } catch (error) {
          // Standard error handling (rate limits, etc)
          lastError = error as Error;
          const errorMessage = lastError.message?.toLowerCase() || '';

          const isRateLimitError =
            errorMessage.includes('rate limit') ||
            errorMessage.includes('quota') ||
            errorMessage.includes('429') ||
            errorMessage.includes('resource exhausted') ||
            errorMessage.includes('too many requests');

          if (!isRateLimitError) throw lastError;

          // Rate limit handling
          if (attempt < 3) {
            const delay = 3000 * Math.pow(2, attempt);
            console.log(`[Illustration] Rate limit hit, retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
      }
      throw lastError || new Error('Failed to generate after retries');
    };

    const result = await attemptGeneration();

    // Check if blocked by safety
    if ('blocked' in result && result.blocked) {
      return NextResponse.json(
        {
          error: 'Image blocked by content policy',
          reason: result.reason,
          blocked: true
        },
        { status: 400 }
      );
    }

    const { imageData, altText } = result as { imageData: { base64: string; mimeType: string } | null; altText: string };

    if (!imageData) {
      console.error('[Illustration] No image data extracted from response');
      return NextResponse.json(
        { error: 'No image generated - model returned text only' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      image: imageData,
      altText: altText || scene.slice(0, 100),
      prompt,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating illustration:', errorMessage);
    console.error('Full error:', error);

    // Check if it's a content policy error from Gemini
    if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
      return NextResponse.json(
        { error: 'Content blocked by safety policy', blocked: true },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Failed to generate illustration: ${errorMessage}` },
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
  characterVisualGuide,
  visualStyleGuide,
  aspectRatioPrompt,
}: {
  scene: string;
  stylePrompt: string;
  characters?: Array<{ name: string; description: string }>;
  setting?: string;
  bookTitle?: string;
  characterVisualGuide?: CharacterVisualGuide;
  visualStyleGuide?: VisualStyleGuide;
  aspectRatioPrompt?: string;
}): string {
  let prompt = `Create a beautiful book illustration in ${stylePrompt} style.\n\n`;

  prompt += `${NO_TEXT_INSTRUCTION}\n\n`;

  // Add aspect ratio instruction
  if (aspectRatioPrompt) {
    prompt += `FORMAT: ${aspectRatioPrompt}\n\n`;
  }

  prompt += `Scene to illustrate: ${scene}\n\n`;

  // Use detailed character visual guide if available, otherwise fall back to basic descriptions
  if (characterVisualGuide && characterVisualGuide.characters.length > 0) {
    prompt += `CHARACTERS (use these EXACT visual descriptions for consistency):\n`;
    characterVisualGuide.characters.forEach((char) => {
      prompt += `\n${char.name}:\n`;
      prompt += `  - Physical: ${char.physicalDescription}\n`;
      prompt += `  - Clothing: ${char.clothing}\n`;
      prompt += `  - Distinctive Features: ${char.distinctiveFeatures}\n`;
      prompt += `  - Color Palette: ${char.colorPalette}\n`;
      prompt += `  - Expression Style: ${char.expressionNotes}\n`;
    });
    prompt += `\nStyle Notes: ${characterVisualGuide.styleNotes}\n\n`;
  } else if (characters && characters.length > 0) {
    prompt += `Characters that may appear:\n`;
    characters.forEach((char) => {
      prompt += `- ${char.name}: ${char.description}\n`;
    });
    prompt += '\n';
  }

  // Add visual style guide for consistency
  if (visualStyleGuide) {
    prompt += `VISUAL STYLE GUIDE (maintain consistency with other illustrations):\n`;
    prompt += `- Overall Style: ${visualStyleGuide.overallStyle}\n`;
    prompt += `- Color Palette: ${visualStyleGuide.colorPalette}\n`;
    prompt += `- Lighting: ${visualStyleGuide.lightingStyle}\n`;
    prompt += `- Line Weight: ${visualStyleGuide.lineWeight}\n`;
    prompt += `- Backgrounds: ${visualStyleGuide.backgroundTreatment}\n`;
    prompt += `- Mood: ${visualStyleGuide.moodAndAtmosphere}\n`;
    if (visualStyleGuide.consistencyRules.length > 0) {
      prompt += `- Consistency Rules:\n`;
      visualStyleGuide.consistencyRules.forEach((rule) => {
        prompt += `  * ${rule}\n`;
      });
    }
    prompt += '\n';
  }

  if (setting) {
    prompt += `Setting/Environment: ${setting}\n\n`;
  }

  prompt += `CRITICAL REQUIREMENTS:
- Create a single cohesive illustration that captures the emotional essence of the scene
- Use expressive, dynamic composition
- MAINTAIN ABSOLUTE CONSISTENCY in character appearances across all illustrations
- Characters must look EXACTLY as described in the character guide
- Use the SAME color palette and style throughout
- The illustration should be suitable for a ${bookTitle ? `book titled "${bookTitle}"` : 'published book'}
- Focus on visual storytelling without any text elements
- High quality, professional book illustration suitable for print
- Ensure characters are instantly recognizable from other illustrations in the book`;

  return prompt;
}
