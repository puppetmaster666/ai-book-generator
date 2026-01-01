import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';
import { ART_STYLES, ILLUSTRATION_DIMENSIONS, type ArtStyleKey } from '@/lib/constants';
import {
  buildIllustrationPromptFromScene,
  SceneDescription,
  type PanelLayout,
  rotateApiKey,
  switchToLastWorkingKey,
  markKeyAsWorking,
  getCurrentKeyIndex,
  type ContentRating,
  SAFETY_SETTINGS
} from '@/lib/gemini';

// Get API key by index
const API_KEY_ENV_NAMES = [
  'GEMINI_API_KEY',
  'GEMINI_API_KEY_BACKUP1',
  'GEMINI_API_BACKUP2'
];

// Lazy initialization - recreated when key changes
let genAI: GoogleGenerativeAI | null = null;
let _currentKeyIndexLocal = -1; // Track which key we're using locally

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
    console.log(`[Panel Gen] Using API key index ${currentKeyIndex}`);
  }

  return genAI;
}

// No text instruction for illustrations without dialogue
const NO_TEXT_INSTRUCTION = `CRITICAL: Do NOT include any text, words, letters, numbers, signs, labels, or written characters anywhere in the image. The image must be purely visual with no readable text elements whatsoever.`;

// Interface for dialogue bubbles
interface DialogueBubble {
  speaker: string;
  text: string;
  position: string;
  type?: 'speech' | 'thought' | 'shout';
}

// Build speech bubble instructions for the AI to draw
function buildSpeechBubblePrompt(dialogue: DialogueBubble[]): string {
  if (!dialogue || dialogue.length === 0) return '';

  const bubbleInstructions = dialogue.map((d, i) => {
    const bubbleType = d.type === 'thought' ? 'thought bubble (cloud-shaped)' :
      d.type === 'shout' ? 'jagged/spiky speech bubble' :
        'speech bubble';
    const position = d.position.replace('-', ' '); // "top-left" -> "top left"

    return `Speech Bubble ${i + 1}: Draw a ${bubbleType} in the ${position} area of the image. Inside the bubble, write the text: "${d.text}" (spoken by ${d.speaker})`;
  }).join('\n');

  return `
SPEECH BUBBLES - IMPORTANT:
This is a comic panel. You MUST include the following speech bubbles with the EXACT text written inside them:

${bubbleInstructions}

Speech bubble style guidelines:
- Draw clear white speech bubbles with black outlines
- Each bubble should have a tail/pointer aimed toward the speaker
- Text should be clearly readable, using a comic-style font
- Position bubbles so they don't cover character faces
- Keep the bubble text EXACTLY as specified above - do not change or abbreviate it
`;
}

// Build story text instructions for children's picture books
// The text appears at the bottom of the image, integrated into the illustration
function buildPictureBookTextPrompt(storyText: string): string {
  if (!storyText || storyText.trim().length === 0) return '';

  // Clean up the text - keep it short for picture books
  const cleanText = storyText.trim().slice(0, 200);

  return `
STORY TEXT - CHILDREN'S PICTURE BOOK:
This is a children's picture book page. You MUST include the story text as part of the illustration.

TEXT TO INCLUDE (write this EXACTLY):
"${cleanText}"

Text placement and style:
- Place the text at the BOTTOM of the image, in a clear readable area
- Use a clean, child-friendly font style (rounded, friendly letterforms)
- Text should be large enough to read easily (suitable for young children)
- Text color should contrast well with the background (use white text with dark outline if on complex background)
- Leave adequate padding/margin around the text
- The text area can have a subtle semi-transparent background if needed for readability
- DO NOT abbreviate or modify the text - use it EXACTLY as provided
- The illustration should occupy approximately the top 70-80% of the image, with text below
`;
}

export async function POST(request: NextRequest) {
  try {
    const {
      bookId,
      panelNumber,
      scene,
      dialogue,
      artStyle,
      bookFormat,
      characterVisualGuide,
      visualStyleGuide,
      chapterTitle,
      chapterText,
      panelLayout,
    } = await request.json();

    // Validate required fields
    if (!bookId || !panelNumber || !scene) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, panelNumber, scene' },
        { status: 400 }
      );
    }

    // Check if book is already completed or has reached max illustrations
    // Also fetch protagonist data for character consistency
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: {
        status: true,
        bookFormat: true,
        dialogueStyle: true,
        bookPreset: true,
        protagonistDescription: true,
        characters: true,
        contentRating: true,
        _count: { select: { illustrations: true } },
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (book.status === 'completed') {
      return NextResponse.json(
        { error: 'Book is already completed. Cannot generate more panels.' },
        { status: 400 }
      );
    }

    // Check max illustrations limit based on format
    // Comics (24 panels): bookFormat=comic_book OR dialogueStyle=bubbles OR bookPreset=comic_story
    // Picture books (20 pages): everything else
    const isComic = book.bookFormat === 'comic_book' ||
      book.bookFormat === 'comic' ||
      book.dialogueStyle === 'bubbles' ||
      book.bookPreset === 'comic_story';
    const maxIllustrations = isComic ? 24 : 20;
    if (book._count.illustrations >= maxIllustrations) {
      return NextResponse.json(
        { error: `Maximum illustrations (${maxIllustrations}) reached for this book format.` },
        { status: 400 }
      );
    }

    // Get art style prompt
    const styleConfig = artStyle ? ART_STYLES[artStyle as ArtStyleKey] : null;
    const artStylePrompt = styleConfig?.prompt || 'professional book illustration';

    // Get dimensions for this book format
    const formatKey = (bookFormat || 'picture_book') as keyof typeof ILLUSTRATION_DIMENSIONS;
    const dimensions = ILLUSTRATION_DIMENSIONS[formatKey] || ILLUSTRATION_DIMENSIONS.picture_book;

    // Check if we have dialogue (comic mode with speech bubbles)
    const hasDialogue = dialogue && Array.isArray(dialogue) && dialogue.length > 0;

    // Enhance characterVisualGuide with protagonist description if available
    let enhancedCharacterGuide = characterVisualGuide;
    if (book.protagonistDescription && characterVisualGuide?.characters?.length > 0) {
      // Get the main character name (first character in the book)
      const bookCharacters = book.characters as Array<{ name: string; description: string }> | null;
      const mainCharacterName = bookCharacters?.[0]?.name;

      if (mainCharacterName) {
        // Find and enhance the main character's visual guide with protagonist description
        enhancedCharacterGuide = {
          ...characterVisualGuide,
          characters: characterVisualGuide.characters.map((char: {
            name: string;
            physicalDescription: string;
            clothing: string;
            distinctiveFeatures: string;
            colorPalette: string;
          }) => {
            if (char.name.toLowerCase() === mainCharacterName.toLowerCase()) {
              // Merge protagonist description with existing guide
              return {
                ...char,
                physicalDescription: `${book.protagonistDescription}. ${char.physicalDescription}`,
                distinctiveFeatures: `BASED ON REAL PERSON REFERENCE: ${book.protagonistDescription}. ${char.distinctiveFeatures}`,
              };
            }
            return char;
          }),
        };
        console.log(`[Panel ${panelNumber}] Enhanced ${mainCharacterName} with protagonist reference`);
      }
    }

    // Build the illustration prompt using scene description
    let prompt = '';
    if (typeof scene === 'object' && scene.description) {
      // Scene is a SceneDescription object
      prompt = buildIllustrationPromptFromScene(
        scene as SceneDescription,
        artStylePrompt,
        enhancedCharacterGuide, // Use enhanced guide with protagonist description
        visualStyleGuide,
        panelLayout, // Pass panel layout for multi-panel comics
        { contentRating: (book.contentRating as 'childrens' | 'general' | 'mature') || 'general' }
      );
    } else {
      // Scene is a string - add panel layout instructions if provided
      prompt = `${artStylePrompt}. ${scene}.`;
      if (panelLayout && panelLayout !== 'splash') {
        const layoutInstructions: Record<string, string> = {
          'two-panel': 'Draw this as a COMIC PAGE with 2 PANELS arranged vertically or horizontally. Each panel shows a different moment in the sequence.',
          'three-panel': 'Draw this as a COMIC PAGE with 3 PANELS. Each panel shows a sequential moment.',
          'four-panel': 'Draw this as a COMIC PAGE with 4 PANELS in a 2x2 grid layout.',
        };
        prompt += ` ${layoutInstructions[panelLayout] || ''} `;
      }
      // Add mature content visual directives for string scene
      if (book.contentRating === 'mature') {
        prompt += ` MATURE VISUAL STYLE: Dark, gritty, moody lighting. Show intense emotions - anger, desire, fear, cynicism. Sensual poses where appropriate, aggressive stances. This should look like an adult graphic novel. `;
      }
    }

    // Add format instructions
    prompt += `\n\nFORMAT: ${dimensions.prompt}`;

    // Determine if this is a children's picture book (not a comic with speech bubbles)
    const isPictureBook = bookFormat === 'picture_book' && !hasDialogue;

    // For comics with dialogue: add speech bubble instructions
    // For picture books with story text: add story text at bottom of image
    // For other images: add no-text instruction
    if (hasDialogue) {
      prompt += buildSpeechBubblePrompt(dialogue as DialogueBubble[]);
    } else if (isPictureBook && chapterText && chapterText.trim().length > 0) {
      prompt += buildPictureBookTextPrompt(chapterText);
    } else {
      prompt += `\n${NO_TEXT_INSTRUCTION}`;
    }

    console.log(`[Panel ${panelNumber}] Generating illustration for book ${bookId}`);

    // Execute with retry logic that handles safety blocks
    let useSafeMode = false;

    const generateWithSafeMode = async () => {
      // If in safe mode, sanitize the prompt
      let currentPrompt = prompt;
      if (useSafeMode) {
        console.log(`[Panel ${panelNumber}] Using SAFE MODE prompt due to previous block`);
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

      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          imageData = {
            base64: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          };
          break;
        }
      }

      return { imageData };
    };

    // Retry utility modified to handle safety blocks with FAST key switching
    // Key rotation happens IMMEDIATELY on rate limit - no delay for first switch
    // Only adds delay after cycling through all 3 keys
    const attemptGeneration = async () => {
      let lastError: Error | null = null;
      let keysTriedThisCycle = 0;
      const totalKeys = 3;
      const maxCycles = 2; // Try each key up to 2 times with backoff between cycles
      let currentCycle = 0;

      // Start with last working key if available
      switchToLastWorkingKey();
      genAI = null; // Reset to pick up the correct key

      for (let attempt = 0; attempt < (totalKeys * maxCycles) + 1; attempt++) {
        try {
          const result = await generateWithSafeMode();

          // Check if blocked by safety
          if ('blocked' in result && result.blocked) {
            console.warn(`[Panel ${panelNumber}] Blocked by ${result.reason} (attempt ${attempt + 1})`);

            // If we get blocked, enable safe mode for next attempt
            if (!useSafeMode) {
              useSafeMode = true;
              console.log(`[Panel ${panelNumber}] Enabling SAFE MODE for retry...`);
              continue;
            }

            // If we're already in safe mode and still blocked after a few tries, give up
            if (attempt >= 3) return result;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          // SUCCESS! Mark this key as working for future requests
          markKeyAsWorking();
          console.log(`[Panel ${panelNumber}] Successfully generated with key index ${getCurrentKeyIndex()}`);

          return result;

        } catch (error) {
          lastError = error as Error;
          const errorMessage = lastError.message?.toLowerCase() || '';

          const isRateLimitError =
            errorMessage.includes('rate limit') ||
            errorMessage.includes('quota') ||
            errorMessage.includes('429') ||
            errorMessage.includes('resource exhausted') ||
            errorMessage.includes('too many requests');

          if (!isRateLimitError) throw lastError;

          // Rate limit hit - IMMEDIATELY try next key (no delay)
          keysTriedThisCycle++;
          console.log(`[Panel ${panelNumber}] Rate limit on key ${getCurrentKeyIndex()}, trying next key (${keysTriedThisCycle}/${totalKeys} this cycle)...`);

          const rotated = rotateApiKey();
          if (rotated) {
            genAI = null; // Reset to pick up new key
            // If we haven't tried all keys in this cycle, retry immediately
            if (keysTriedThisCycle < totalKeys) {
              continue;
            }
          }

          // All keys exhausted in this cycle - add delay before next cycle
          currentCycle++;
          if (currentCycle >= maxCycles) {
            throw lastError;
          }

          keysTriedThisCycle = 0;
          const delay = 5000 * currentCycle; // 5s after first cycle, 10s after second
          console.log(`[Panel ${panelNumber}] All keys exhausted, waiting ${delay / 1000}s before retry cycle ${currentCycle + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      throw lastError || new Error('Failed to generate after retries');
    };

    const result = await attemptGeneration();

    // Check for content policy blocks
    if ('blocked' in result && result.blocked) {
      const blockReason = result.reason;
      console.error(`[Panel ${panelNumber}] No candidates. Block reason:`, blockReason);
      return NextResponse.json(
        { error: 'Content blocked by safety filter', blocked: true, panelNumber },
        { status: 400 }
      );
    }

    const { imageData } = result as { imageData: { base64: string; mimeType: string } | null; };

    if (!imageData) {
      console.error(`[Panel ${panelNumber}] No image in response`);
      return NextResponse.json(
        { error: 'No image generated', panelNumber },
        { status: 500 }
      );
    }

    // Create image URL from base64
    const imageUrl = `data:${imageData.mimeType};base64,${imageData.base64}`;

    if (hasDialogue) {
      console.log(`[Panel ${panelNumber}] Generated comic panel with ${dialogue.length} speech bubbles`);
    }

    // Create or find chapter for this panel
    const chapter = await prisma.chapter.upsert({
      where: {
        bookId_number: {
          bookId,
          number: panelNumber,
        },
      },
      update: {
        sceneDescription: scene,
        dialogue: dialogue || null,
      },
      create: {
        bookId,
        number: panelNumber,
        title: chapterTitle || `Panel ${panelNumber}`,
        content: chapterText || '',
        summary: typeof scene === 'object' ? scene.description : scene.slice(0, 200),
        wordCount: (chapterText || '').split(/\s+/).filter(Boolean).length,
        sceneDescription: scene,
        dialogue: dialogue || null,
      },
    });

    // Save illustration to database
    const illustration = await prisma.illustration.create({
      data: {
        bookId,
        chapterId: chapter.id,
        imageUrl,
        prompt,
        altText: typeof scene === 'object' ? scene.description : scene.slice(0, 100),
        position: 0,
        width: dimensions.width,
        height: dimensions.height,
        style: artStyle || null,
      },
    });

    console.log(`[Panel ${panelNumber}] Successfully generated and saved`);

    return NextResponse.json({
      success: true,
      panelNumber,
      illustrationId: illustration.id,
      chapterId: chapter.id,
      imageUrl,
      hasDialogue,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating panel:', errorMessage);

    return NextResponse.json(
      { error: `Failed to generate panel: ${errorMessage}` },
      { status: 500 }
    );
  }
}
