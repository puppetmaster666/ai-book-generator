import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ART_STYLES, ILLUSTRATION_DIMENSIONS, type ArtStyleKey } from '@/lib/constants';
import {
  rotateApiKey,
  switchToLastWorkingKey,
  markKeyAsWorking,
  getCurrentKeyIndex,
  SAFETY_SETTINGS
} from '@/lib/gemini';
import { rephraseBlockedScene } from '@/lib/generation/scene-rephraser';

/**
 * Character Consistency with Reference Images
 *
 * This endpoint supports maintaining visual consistency across illustrations by using
 * reference images from previous illustrations.
 *
 * How it works:
 * 1. When a character appears for the first time, that illustration becomes their "reference"
 * 2. For subsequent illustrations, pass the character's first appearance as a reference image
 * 3. Gemini will match the character's appearance to the reference image
 *
 * Usage from client:
 * - Track which characters appear in which illustrations (store in state/database)
 * - When generating a new illustration, check if any characters have appeared before
 * - Pass those previous illustrations as referenceImages array
 *
 * Example:
 * ```
 * const referenceImages = [
 *   { characterName: "Alice", imageData: "data:image/png;base64,..." },
 *   { characterName: "Bob", imageData: "data:image/png;base64,..." }
 * ];
 *
 * fetch('/api/generate-illustration', {
 *   method: 'POST',
 *   body: JSON.stringify({ scene, referenceImages, ... })
 * });
 * ```
 */

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

type CharacterReferenceImage = {
  characterName: string;
  imageData: string; // Base64 encoded image data (with or without data URL prefix)
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

// Get API key by index
const API_KEY_ENV_NAMES = [
  'GEMINI_API_KEY',
  'GEMINI_API_Gemini2026',
  'GEMINI_API_BACKUP1',
  'GEMINI_API_BACKUP2',
  'GEMINI_API_BACKUP3'
];

// Lazy initialization - recreated when key changes
let genAI: GoogleGenerativeAI | null = null;
let _currentKeyIndexLocal = -1;

function getGenAI(): GoogleGenerativeAI {
  const currentKeyIndex = getCurrentKeyIndex();

  // Recreate if key changed
  if (genAI === null || _currentKeyIndexLocal !== currentKeyIndex) {
    const envName = API_KEY_ENV_NAMES[currentKeyIndex];
    const apiKey = process.env[envName];

    if (!apiKey) {
      throw new Error(`API key ${envName} is not set`);
    }

    genAI = new GoogleGenerativeAI(apiKey);
    _currentKeyIndexLocal = currentKeyIndex;
    console.log(`[Illustration] Using API key index ${currentKeyIndex}`);
  }

  return genAI;
}

// Important: For illustrations, we need to be very specific about text
// DO NOT include any text, words, letters, or numbers in the image
const NO_TEXT_INSTRUCTION = `CRITICAL: Do NOT include any text, words, letters, numbers, signs, labels, or written characters anywhere in the image. The image must be purely visual with no readable text elements whatsoever.`;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 50 image generations per day per IP
    const ip = getClientIP(request.headers);
    const { limited } = rateLimit(`illustration:${ip}`, 50, 24 * 60 * 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: 'Daily limit reached. Please try again tomorrow.' }, { status: 429 });
    }

    const {
      scene,
      artStyle,
      characters,
      setting,
      bookTitle,
      characterVisualGuide,
      visualStyleGuide,
      bookFormat,
      bookPreset,
      referenceImages, // Array of { characterName: string, imageData: string (base64) }
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
    const { prompt, hasReferenceImages } = buildIllustrationPrompt({
      scene,
      stylePrompt,
      characters,
      setting,
      bookTitle,
      characterVisualGuide: characterVisualGuide as CharacterVisualGuide | undefined,
      visualStyleGuide: visualStyleGuide as VisualStyleGuide | undefined,
      aspectRatioPrompt: dimensions.prompt,
      referenceImages: referenceImages as CharacterReferenceImage[] | undefined,
    });

    // Execute with retry logic that handles safety blocks
    let useSafeMode = false;
    let safeModeLevel = 0; // 0 = off, 1 = light sanitization, 2 = heavy sanitization, 3 = fallback

    // AI-powered scene rephrasing: instead of dumb word replacement,
    // use Gemini Flash to creatively rewrite blocked scenes while preserving humor
    let rephrasedScene: string | null = null;

    // Roast books use Nano Banana 2 (cheaper, quality tradeoff acceptable for comedic panels)
    // with Nano Banana Pro as fallback. Other books do the opposite.
    const isRoast = bookPreset === 'roast_comic';
    const PRIMARY_IMAGE_MODEL = isRoast ? 'gemini-3.1-flash-image-preview' : 'gemini-3-pro-image-preview';
    const FALLBACK_IMAGE_MODEL = isRoast ? 'gemini-3-pro-image-preview' : 'gemini-3.1-flash-image-preview';
    let currentModelName: string = PRIMARY_IMAGE_MODEL;

    const generateWithSafeMode = async () => {
      // If in safe mode, use AI-rephrased scene instead of dumb word replacement
      let currentPrompt = prompt;
      if (useSafeMode) {
        console.log(`[Illustration] Using AI REPHRASER (attempt ${safeModeLevel}) due to previous block`);

        // Use the rephrased scene if we have one
        if (rephrasedScene) {
          currentPrompt = prompt.replace(scene, rephrasedScene);
        }

        // Remove mature style sections (use [\s\S] instead of 's' flag for compatibility)
        currentPrompt = currentPrompt.replace(/=== MATURE VISUAL STYLE ===[\s\S]*?=== END MATURE STYLE ===/g, '');
        currentPrompt = currentPrompt.replace(/MATURE VISUAL STYLE:.*$/gm, '');
      }

      const model = getGenAI().getGenerativeModel({
        model: currentModelName,
        safetySettings: SAFETY_SETTINGS,
        generationConfig: {
          // Generate at 1K resolution — Google charges $0.039 for 1K vs $0.134 for 2K
          imageConfig: { imageSize: '1K' },
        } as unknown as Record<string, unknown>,
      });

      // Build content array with reference images if provided
      const content: Array<string | { text: string } | { inlineData: { data: string; mimeType: string } }> = [];

      // Filter out any references with missing image data
      const validRefs = referenceImages?.filter((ref: CharacterReferenceImage) => ref.imageData);

      if (validRefs && validRefs.length > 0) {
        console.log(`[Illustration] Using ${validRefs.length} reference image(s) for character consistency`);
        content.push({ text: currentPrompt });

        // Add each reference image to the content
        validRefs.forEach((ref: CharacterReferenceImage) => {
          // Remove data URL prefix if present (e.g., "data:image/png;base64,")
          const base64Data = ref.imageData.replace(/^data:image\/\w+;base64,/, '');

          content.push({
            inlineData: {
              data: base64Data,
              mimeType: 'image/png',
            },
          });
          content.push({
            text: `REFERENCE IMAGE for "${ref.characterName}". This character MUST look IDENTICAL in this new panel: same face, same hair, same clothing, same accessories. If the reference shows no glasses, do NOT add glasses. Do NOT change their outfit. Match everything exactly.`,
          });
        });
      } else {
        content.push({ text: currentPrompt });
      }

      const result = await model.generateContent(content);
      const response = result.response;

      // Check for content policy blocks
      const candidate = response.candidates?.[0];
      if (!candidate) {
        const blockReason = response.promptFeedback?.blockReason;
        const blockReasonStr = String(blockReason || '').toUpperCase();
        // Check if this is a content policy block (not a rate limit)
        if (blockReasonStr.includes('SAFETY') || blockReasonStr.includes('OTHER') || blockReasonStr.includes('PROHIBITED') || blockReasonStr.includes('BLOCK')) {
          return { blocked: true, reason: blockReasonStr };
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

    // Retry utility with FAST key switching
    // Key rotation happens IMMEDIATELY on rate limit - no delay for first switch
    const attemptGeneration = async () => {
      let lastError: Error | null = null;
      let keysTriedThisCycle = 0;
      const totalKeys = 4;
      const maxCycles = 2;
      let currentCycle = 0;

      // Start with last working key if available
      switchToLastWorkingKey();
      genAI = null;

      for (let attempt = 0; attempt < (totalKeys * maxCycles) + 1; attempt++) {
        try {
          const result = await generateWithSafeMode();

          // Check if blocked by safety - use AI rephraser instead of dumb word replacement
          if ('blocked' in result && result.blocked) {
            console.warn(`[Illustration] Blocked by ${result.reason} (attempt ${attempt + 1})`);

            useSafeMode = true;
            safeModeLevel = Math.min(safeModeLevel + 1, 3);

            if (safeModeLevel >= 3 && attempt >= 3) {
              return result;
            }

            // AI rephrase the scene to bypass content filter while keeping humor
            try {
              rephrasedScene = await rephraseBlockedScene(scene, { title: bookTitle }, safeModeLevel);
              console.log(`[Illustration] AI rephrased scene for retry ${safeModeLevel}`);
            } catch (rephraseErr) {
              console.warn('[Illustration] Rephraser failed, will use basic sanitization');
            }
            continue;
          }

          // SUCCESS! Mark this key as working
          markKeyAsWorking();
          console.log(`[Illustration] Successfully generated with key index ${getCurrentKeyIndex()}`);

          return result;

        } catch (error) {
          lastError = error as Error;
          const errorMessage = lastError.message?.toLowerCase() || '';

          // Check if it's a content policy block (should trigger safe mode, not key rotation)
          const isContentPolicyError =
            errorMessage.includes('prohibited_content') ||
            errorMessage.includes('blocked') ||
            errorMessage.includes('safety');

          if (isContentPolicyError) {
            console.warn(`[Illustration] Content policy error: ${errorMessage}`);
            useSafeMode = true;
            safeModeLevel = Math.min(safeModeLevel + 1, 3);

            if (safeModeLevel >= 3 && attempt >= 3) {
              throw new Error('Content blocked by safety policy even after AI rephrasing');
            }

            // AI rephrase the scene
            try {
              rephrasedScene = await rephraseBlockedScene(scene, { title: bookTitle }, safeModeLevel);
              console.log(`[Illustration] AI rephrased scene for retry ${safeModeLevel}`);
            } catch (rephraseErr) {
              console.warn('[Illustration] Rephraser failed, will use basic sanitization');
            }
            continue;
          }

          const isRateLimitError =
            errorMessage.includes('rate limit') ||
            errorMessage.includes('quota') ||
            errorMessage.includes('429') ||
            errorMessage.includes('resource exhausted') ||
            errorMessage.includes('too many requests');

          if (!isRateLimitError) throw lastError;

          // Rate limit - IMMEDIATELY try next key
          keysTriedThisCycle++;
          console.log(`[Illustration] Rate limit on key ${getCurrentKeyIndex()}, trying next key (${keysTriedThisCycle}/${totalKeys})...`);

          const rotated = rotateApiKey();
          if (rotated) {
            genAI = null;
            if (keysTriedThisCycle < totalKeys) {
              continue;
            }
          }

          // All keys exhausted - add delay before next cycle
          currentCycle++;
          if (currentCycle >= maxCycles) {
            throw lastError;
          }

          keysTriedThisCycle = 0;
          const delay = 5000 * currentCycle;
          console.log(`[Illustration] All keys exhausted, waiting ${delay / 1000}s before cycle ${currentCycle + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      throw lastError || new Error('Failed to generate after retries');
    };

    let result;
    try {
      result = await attemptGeneration();
    } catch (err) {
      const errMsg = (err as Error).message?.toLowerCase() || '';
      const isRateLimitError =
        errMsg.includes('rate limit') ||
        errMsg.includes('quota') ||
        errMsg.includes('429') ||
        errMsg.includes('resource exhausted') ||
        errMsg.includes('too many requests');

      if (!isRateLimitError || currentModelName === FALLBACK_IMAGE_MODEL) throw err;

      console.warn(`[Illustration] Primary model exhausted, falling back to ${FALLBACK_IMAGE_MODEL}`);
      currentModelName = FALLBACK_IMAGE_MODEL;
      result = await attemptGeneration();
    }

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
  referenceImages,
}: {
  scene: string;
  stylePrompt: string;
  characters?: Array<{ name: string; description: string }>;
  setting?: string;
  bookTitle?: string;
  characterVisualGuide?: CharacterVisualGuide;
  visualStyleGuide?: VisualStyleGuide;
  aspectRatioPrompt?: string;
  referenceImages?: CharacterReferenceImage[];
}): { prompt: string; hasReferenceImages: boolean } {
  let prompt = `Create a beautiful book illustration in ${stylePrompt} style.\n\n`;

  prompt += `${NO_TEXT_INSTRUCTION}\n\n`;

  // COPYRIGHT PROTECTION - CRITICAL
  prompt += `
⚠️ COPYRIGHT PROTECTION - ABSOLUTELY CRITICAL:
- Create 100% ORIGINAL character designs - NEVER copy from existing media, movies, TV shows, comics, or famous characters
- Even if a character's NAME matches a famous character (Superman, Batman, Spider-Man, Wonder Woman, Iron Man, Captain America, The Flash, Green Lantern, Aquaman, etc.), you MUST create COMPLETELY UNIQUE visual designs that look NOTHING like the copyrighted character
- DO NOT use ANY signature elements from copyrighted characters:
  * NO iconic costumes or suits (Superman's blue/red suit, Batman's bat suit, Spider-Man's web pattern, Iron Man's armor, etc.)
  * NO trademarked symbols, logos, or insignias on clothing (S symbol, Bat symbol, Spider symbol, Arc Reactor, Captain America's star, etc.)
  * NO distinctive masks, helmets, or headgear from famous characters
  * NO signature colors or visual styles associated with copyrighted characters (Superman's red cape + blue suit, etc.)
  * NO capes, unless the character description explicitly requires it AND it's styled completely differently from famous characters
- If the character name is "Superman", create a unique person with NO connection to the copyrighted character - different hair, different clothes, NO cape, NO S symbol, NO red/blue color scheme, COMPLETELY ORIGINAL
- If the character name is "Batman", create a unique person - NO bat ears, NO cape, NO black suit, NO bat symbol, COMPLETELY ORIGINAL
- This is LEGALLY REQUIRED to avoid copyright infringement and potential lawsuit
- IMPORTANT: Follow the character visual guide and reference images below EXACTLY - these are ORIGINAL designs. Characters may wear costumes, unique outfits, or fantasy clothing as specified in the guide. The goal is to avoid COPYING copyrighted characters from existing media, NOT to avoid creative original designs.
⚠️ END COPYRIGHT PROTECTION

`;

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

  // Add reference image instructions if provided
  const hasReferenceImages = !!(referenceImages && referenceImages.length > 0);
  if (hasReferenceImages) {
    prompt += `CHARACTER REFERENCE IMAGES (HIGHEST PRIORITY):\n`;
    prompt += `Reference images are provided below. These characters MUST look IDENTICAL in this new panel.\n`;
    prompt += `MATCH EXACTLY:\n`;
    prompt += `- Face, hair style, hair color, skin tone\n`;
    prompt += `- SAME clothing/outfit as reference (do NOT change their clothes between panels)\n`;
    prompt += `- SAME accessories: if reference shows glasses, ALWAYS include glasses. If NO glasses in reference, NEVER add glasses.\n`;
    prompt += `- Body proportions and build\n`;
    prompt += `- Art style and color palette\n`;
    prompt += `\nDO NOT INVENT new clothing, accessories, or features not shown in the reference. The reference image is the single source of truth.\n\n`;
  }

  prompt += `CRITICAL REQUIREMENTS:
- Create a single cohesive illustration that captures the emotional essence of the scene
- Use expressive, dynamic composition
- MAINTAIN ABSOLUTE CONSISTENCY in character appearances across all illustrations
${hasReferenceImages ? '- Characters with reference images must look EXACTLY like they do in the reference images (same face, hair, clothing, proportions, colors)' : '- Characters must look EXACTLY as described in the character guide'}
- Use the SAME color palette and style throughout
- The illustration should be suitable for a ${bookTitle ? `book titled "${bookTitle}"` : 'published book'}
- Focus on visual storytelling without any text elements
- High quality, professional book illustration suitable for print
- Ensure characters are instantly recognizable from other illustrations in the book`;

  return { prompt, hasReferenceImages };
}
