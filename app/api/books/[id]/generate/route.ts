import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import {
  generateOutline,
  generateNonFictionOutline,
  generateIllustratedOutline,
  generateComicOutline,
  generatePictureBookOutline,
  buildIllustrationPromptFromScene,
  buildPictureBookTextPrompt,
  generateChapter,
  summarizeChapter,
  updateCharacterStates,
  generateCoverPrompt,
  generateCoverImage,
  generateIllustrationPrompts,
  generateChildrensIllustrationPrompts,
  generateCharacterVisualGuide,
  generateVisualStyleGuide,
  generateCharacterPortraits,
  generateScreenplayOutline,
  type VisualChapter,
  type SceneDescription,
  type DialogueEntry,
  type PanelLayout,
  type ContentRating,
} from '@/lib/gemini';
import { createInitialContext, generateSequenceToBeats, type BeatSheet, type CharacterProfile } from '@/lib/screenplay';
import { extractAndBlacklistFromCharacters } from '@/lib/dna-blacklist';
import { countWords } from '@/lib/epub';
import { BOOK_FORMATS, ART_STYLES, ILLUSTRATION_DIMENSIONS, BOOK_PRESETS, type BookFormatKey, type ArtStyleKey, type BookPresetKey } from '@/lib/constants';
import { sendEmail, getBookReadyEmail } from '@/lib/email';

// Allow up to 5 minutes for outline generation (Vercel Pro plan max: 300s)
export const maxDuration = 800; // Vercel Fluid Compute allows up to 800s on Pro plan

// Outline generation timeout (10 minutes - leave buffer for post-outline work)
const OUTLINE_TIMEOUT_MS = 600000;

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within the timeout,
 * it rejects with a timeout error. This allows us to gracefully handle long-running
 * generations before Vercel's 5-minute timeout kills the function.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs / 1000} seconds`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// Admin emails - admins can bypass all generation limits
const ADMIN_EMAILS = ['lhllparis@gmail.com'];

// Timeout for illustration generation (30 seconds) - prevents 504 Gateway Timeout
const ILLUSTRATION_TIMEOUT_MS = 30000;

// Maximum retries for content-blocked illustrations
const MAX_ILLUSTRATION_RETRIES = 3;

// Interface for dialogue bubbles
interface DialogueBubble {
  speaker: string;
  text: string;
  position: string;
  type?: 'speech' | 'thought' | 'shout';
}

// No text instruction for illustrations without dialogue
const NO_TEXT_INSTRUCTION = `CRITICAL: Do NOT include any text, words, letters, numbers, signs, labels, or written characters anywhere in the image. The image must be purely visual with no readable text elements whatsoever.`;

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
// buildPictureBookTextPrompt is now imported from the shared prompts module

// Sanitize a scene description by removing/replacing sensitive words
function sanitizeSceneForRetry(scene: string, retryLevel: number): string {
  let sanitized = scene;

  if (retryLevel >= 1) {
    // Level 1: Replace sensitive words with milder alternatives
    const replacements: Record<string, string> = {
      'blood': 'red liquid',
      'bloody': 'stained',
      'bleeding': 'injured',
      'gore': 'mess',
      'gory': 'intense',
      'kill': 'confront',
      'killing': 'confronting',
      'murder': 'conflict',
      'murderer': 'antagonist',
      'dead': 'still',
      'death': 'end',
      'dying': 'fading',
      'knife': 'object',
      'weapon': 'tool',
      'gun': 'device',
      'stab': 'strike',
      'stabbing': 'striking',
      'horror': 'tension',
      'terrifying': 'intense',
      'terrified': 'startled',
      'scary': 'mysterious',
      'creepy': 'unusual',
      'violent': 'dramatic',
      'violence': 'conflict',
      'attack': 'approach',
      'attacking': 'approaching',
      'corpse': 'figure',
      'body': 'form',
      'victim': 'person',
      'scream': 'expression',
      'screaming': 'calling out',
      'dark': 'dim',
      'darkness': 'shadows',
      'sinister': 'mysterious',
      'fear': 'concern',
      'afraid': 'worried',
      'panic': 'urgency',
      'terror': 'suspense',
    };

    for (const [word, replacement] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      sanitized = sanitized.replace(regex, replacement);
    }
  }

  if (retryLevel >= 2) {
    // Level 2: Focus on atmosphere and setting, reduce character focus
    sanitized = `A peaceful atmospheric scene: ${sanitized.substring(0, 200)}. Focus on the environment, lighting, and mood rather than specific actions or characters.`;
  }

  return sanitized;
}

// Generate a fallback atmospheric scene based on the chapter
function generateFallbackScene(chapterTitle: string, bookTitle: string, setting: string): string {
  return `A beautiful, peaceful illustration for a book chapter titled "${chapterTitle}" from "${bookTitle}".
Show an atmospheric scene with: ${setting}.
Focus on the environment - natural lighting, interesting composition, inviting atmosphere.
No people or characters, just the setting and mood. Professional book illustration quality.`;
}

// Types for visual guides
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

// Result type for illustration attempts
type IllustrationAttemptResult = {
  success: boolean;
  blocked: boolean;
  timedOut: boolean;
  data: { imageUrl: string; altText: string; width: number; height: number } | null;
};

// Single attempt to generate an illustration
async function attemptIllustrationGeneration(data: {
  scene: string;
  artStyle: string;
  characters: { name: string; description: string }[];
  setting: string;
  bookTitle: string;
  characterVisualGuide?: CharacterVisualGuide;
  visualStyleGuide?: VisualStyleGuide;
  bookFormat?: string;
  referenceImages?: { characterName: string; imageData: string }[];
}): Promise<IllustrationAttemptResult> {
  try {
    // Build base URL - check multiple env vars in order of preference
    // VERCEL_URL doesn't include protocol, so we need to add it
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || vercelUrl || 'http://localhost:3000';
    console.log('Using base URL for illustration:', baseUrl);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ILLUSTRATION_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/generate-illustration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          characterVisualGuide: data.characterVisualGuide,
          visualStyleGuide: data.visualStyleGuide,
          bookFormat: data.bookFormat,
          referenceImages: data.referenceImages,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      const isBlocked = !!errorData.blocked;
      if (isBlocked) {
        console.warn(`Illustration blocked by content policy`);
      } else {
        console.error('Illustration API error:', errorData);
      }
      return { success: false, blocked: isBlocked, timedOut: false, data: null };
    }

    const result = await response.json();

    if (result.image?.base64 && result.image?.mimeType) {
      const formatKey = data.bookFormat as keyof typeof ILLUSTRATION_DIMENSIONS;
      const dimensions = ILLUSTRATION_DIMENSIONS[formatKey] || ILLUSTRATION_DIMENSIONS.picture_book;

      return {
        success: true,
        blocked: false,
        timedOut: false,
        data: {
          imageUrl: `data:${result.image.mimeType};base64,${result.image.base64}`,
          altText: result.altText || data.scene.substring(0, 100),
          width: dimensions.width,
          height: dimensions.height,
        },
      };
    }

    return { success: false, blocked: false, timedOut: false, data: null };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Illustration generation timed out');
      return { success: false, blocked: false, timedOut: true, data: null };
    }
    console.error('Failed to generate illustration:', error);
    return { success: false, blocked: false, timedOut: false, data: null };
  }
}

// Helper function to generate an illustration with retry logic for content blocks
async function generateIllustrationImage(data: {
  scene: string;
  artStyle: string;
  characters: { name: string; description: string }[];
  setting: string;
  bookTitle: string;
  chapterTitle?: string;
  characterVisualGuide?: CharacterVisualGuide;
  visualStyleGuide?: VisualStyleGuide;
  bookFormat?: string;
  referenceImages?: { characterName: string; imageData: string }[];
}): Promise<{ imageUrl: string; altText: string; width: number; height: number } | null> {
  let currentScene = data.scene;

  for (let attempt = 0; attempt <= MAX_ILLUSTRATION_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`Retry attempt ${attempt} with sanitized prompt...`);
    }

    const result = await attemptIllustrationGeneration({
      ...data,
      scene: currentScene,
    });

    if (result.success && result.data) {
      if (attempt > 0) {
        console.log(`Illustration succeeded on retry attempt ${attempt}`);
      }
      return result.data;
    }

    // If blocked, try with sanitized version
    if (result.blocked && attempt < MAX_ILLUSTRATION_RETRIES) {
      if (attempt < 2) {
        // Retries 1-2: Progressively sanitize the original prompt
        currentScene = sanitizeSceneForRetry(data.scene, attempt + 1);
        console.log(`Sanitizing prompt (level ${attempt + 1}) and retrying...`);
      } else {
        // Final retry: Use a completely safe fallback scene
        currentScene = generateFallbackScene(
          data.chapterTitle || 'Chapter',
          data.bookTitle,
          data.setting
        );
        console.log(`Using fallback atmospheric scene for final retry...`);
      }
      continue;
    }

    // If timed out, try one more time with simpler prompt
    if (result.timedOut && attempt === 0) {
      currentScene = sanitizeSceneForRetry(data.scene, 2);
      console.log(`Timed out, retrying with simplified prompt...`);
      continue;
    }

    // Other errors or final failure - stop retrying
    break;
  }

  console.warn(`Failed to generate illustration after ${MAX_ILLUSTRATION_RETRIES + 1} attempts`);
  return null;
}

// Character portrait type for reference images
type CharacterPortrait = {
  characterName: string;
  facePortrait: string;
  fullBodyPortrait: string;
};

// Generate all illustrations in parallel for visual books
async function generateIllustrationsInParallel(
  chapters: VisualChapter[],
  bookData: {
    id: string;
    title: string;
    artStyle: string;
    artStylePrompt: string;
    bookFormat: string;
    dialogueStyle: string | null;
    characters: { name: string; description: string }[];
    premise: string;
    characterVisualGuide?: CharacterVisualGuide;
    visualStyleGuide?: VisualStyleGuide;
    contentRating?: ContentRating;
    characterPortraits?: CharacterPortrait[];
  }
): Promise<Map<number, { imageUrl: string; altText: string; width: number; height: number }>> {
  const results = new Map<number, { imageUrl: string; altText: string; width: number; height: number }>();

  // Process in batches of 3 to avoid overwhelming the API
  const batchSize = 3;
  for (let i = 0; i < chapters.length; i += batchSize) {
    const batch = chapters.slice(i, i + batchSize);
    const batchPromises = batch.map(async (chapter) => {
      if (!chapter.scene) {
        console.warn(`No scene description for chapter ${chapter.number}`);
        return null;
      }

      // Determine if we need text baked into the image
      const isComicStyle = bookData.dialogueStyle === 'bubbles';
      const hasDialogue = isComicStyle && chapter.dialogue && chapter.dialogue.length > 0;
      const hasNarration = !!chapter.text && chapter.text.trim().length > 0;
      const isPictureBook = bookData.bookFormat === 'picture_book' && !isComicStyle;
      const hasStoryText = isPictureBook && hasNarration;
      const needsTextBaking = !!(hasDialogue || hasStoryText || (isComicStyle && hasNarration));

      // Build prompt from scene description (with panel layout for comics)
      // Skip the "NO TEXT" instruction if we need to bake text into the image
      let illustrationPrompt = buildIllustrationPromptFromScene(
        chapter.scene,
        bookData.artStylePrompt,
        bookData.characterVisualGuide,
        bookData.visualStyleGuide,
        chapter.panelLayout, // Pass panel layout for multi-panel comics
        { skipNoTextInstruction: needsTextBaking, contentRating: bookData.contentRating }
      );

      // Append text instructions based on book type
      if (hasDialogue && chapter.dialogue) {
        // Comic with speech bubbles - bake bubbles into the AI image
        const bubbles: DialogueBubble[] = chapter.dialogue.map(d => ({
          speaker: d.speaker,
          text: d.text,
          position: d.position,
          type: d.type,
        }));
        illustrationPrompt += buildSpeechBubblePrompt(bubbles);

        // Also add narration box if this page has narration text
        if (isComicStyle && hasNarration) {
          illustrationPrompt += `\n\nNARRATION BOX (IMPORTANT):\nInclude a rectangular narration caption box at the TOP of the image with this text:\n"${chapter.text.trim().slice(0, 150)}"\n\nStyle: Clean rectangular box with subtle background (yellow/cream or white), dark text, positioned at the top of the image. This is the narrator's voice guiding the reader.`;
        }

        console.log(`Generating illustration with ${bubbles.length} speech bubbles${hasNarration ? ' + narration' : ''} for page ${chapter.number}...`);
      } else if (isComicStyle && hasNarration) {
        // Comic page with narration but no dialogue - add narration caption box
        illustrationPrompt += `\n\nNARRATION BOX (IMPORTANT):\nInclude a rectangular narration caption box at the TOP of the image with this text:\n"${chapter.text.trim().slice(0, 150)}"\n\nStyle: Clean rectangular box with subtle background (yellow/cream or white), dark text, positioned at the top of the image. This is the narrator's voice guiding the reader.\n\nDo NOT include any other text except this narration box.`;
        console.log(`Generating illustration with narration box for page ${chapter.number}...`);
      } else if (hasStoryText) {
        // Picture book with story text - bake text at bottom of image
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textPos = (chapter as any).textPosition as string | undefined;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageSty = (chapter as any).pageStyle as string | undefined;
        illustrationPrompt += buildPictureBookTextPrompt(chapter.text, textPos, pageSty);
        console.log(`Generating illustration with story text for page ${chapter.number} (position: ${textPos || 'default'})...`);
      } else {
        // No text needed - add explicit no-text instruction
        illustrationPrompt += `\n${NO_TEXT_INSTRUCTION}`;
        console.log(`Generating illustration for page ${chapter.number}...`);
      }

      // Build character reference images from portraits for consistency
      const referenceImages: { characterName: string; imageData: string }[] = [];
      if (bookData.characterPortraits && chapter.scene.characters) {
        const MAX_REFS = 2; // Limit to avoid payload size issues
        let refCount = 0;
        for (const charName of chapter.scene.characters) {
          if (refCount >= MAX_REFS) break;
          const portrait = bookData.characterPortraits.find(
            p => p.characterName.toLowerCase() === charName.toLowerCase()
          );
          if (portrait) {
            // Use face portrait for multi-character scenes, both for 1-2 character scenes
            referenceImages.push({
              characterName: `${charName} (face reference)`,
              imageData: portrait.facePortrait,
            });
            if (chapter.scene.characters.length <= 2 && portrait.fullBodyPortrait) {
              referenceImages.push({
                characterName: `${charName} (body reference)`,
                imageData: portrait.fullBodyPortrait,
              });
            }
            refCount++;
          }
        }
      }

      const result = await generateIllustrationImage({
        scene: illustrationPrompt,
        artStyle: bookData.artStyle,
        characters: bookData.characters.filter(c =>
          chapter.scene.characters.some(sc => sc.toLowerCase() === c.name.toLowerCase())
        ),
        setting: chapter.scene.background,
        bookTitle: bookData.title,
        chapterTitle: chapter.title,
        characterVisualGuide: bookData.characterVisualGuide,
        visualStyleGuide: bookData.visualStyleGuide,
        bookFormat: bookData.bookFormat,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
      });

      if (result) {
        return {
          chapterNumber: chapter.number,
          imageUrl: result.imageUrl,
          altText: chapter.scene.description,
          width: result.width,
          height: result.height,
        };
      }
      return null;
    });

    const batchResults = await Promise.all(batchPromises);
    for (const result of batchResults) {
      if (result) {
        results.set(result.chapterNumber, {
          imageUrl: result.imageUrl,
          altText: result.altText,
          width: result.width,
          height: result.height,
        });
      }
    }
  }

  return results;
}

// Check if book should use visual book flow (picture books, comics)
function isVisualBook(bookFormat: string, bookPreset: string | null): boolean {
  // Picture books and comics use the visual book flow
  if (bookFormat === 'picture_book') return true;

  // Check preset (includes adult_comic for mature content comics)
  if (bookPreset === 'childrens_picture' || bookPreset === 'comic_story' || bookPreset === 'adult_comic') return true;

  return false;
}

// Get dialogue style from book preset or stored value
function getDialogueStyle(book: { dialogueStyle: string | null; bookPreset: string | null }): 'prose' | 'bubbles' | null {
  if (book.dialogueStyle) {
    return book.dialogueStyle as 'prose' | 'bubbles';
  }

  // Infer from preset
  if (book.bookPreset) {
    const preset = BOOK_PRESETS[book.bookPreset as BookPresetKey];
    if (preset && 'dialogueStyle' in preset) {
      return preset.dialogueStyle as 'prose' | 'bubbles' | null;
    }
  }

  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get current session to check admin status (gracefully handle no session)
    let isAdmin = false;
    try {
      const session = await auth();
      isAdmin = !!(session?.user?.email && ADMIN_EMAILS.includes(session.user.email));
    } catch (authError) {
      // No session or auth error - treat as non-admin (allows webhooks/background jobs)
      console.log('[Generate] No auth session, treating as non-admin');
    }

    // Check for outlineOnly and serverDriven modes from request body
    let outlineOnlyFromBody = false;
    let serverDriven = false;
    try {
      const body = await request.json();
      outlineOnlyFromBody = body.outlineOnly === true;
      serverDriven = body.serverDriven === true;
    } catch {
      // No body or invalid JSON - use default
    }

    const book = await prisma.book.findUnique({
      where: { id },
      include: { chapters: true },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // CRITICAL: Text books and screenplays should ALWAYS use outlineOnly mode
    // This prevents Vercel timeout (300s) and uses the rolling context system
    // The client will call /generate-next for each chapter sequentially
    const isTextBook = book.bookFormat === 'text_only';
    const isScreenplay = book.bookFormat === 'screenplay';
    const outlineOnly = outlineOnlyFromBody || isTextBook || isScreenplay;

    if (outlineOnly && !outlineOnlyFromBody) {
      console.log(`[Generate] Auto-enabling outlineOnly for ${book.bookFormat} book (prevents timeout, uses rolling context)`);
    }

    // Check payment status - allow preview generation for unpaid books
    // Free tier limits are enforced in generate-next and generate-visual routes
    // Only paid books (or books with promo codes) can generate the full content
    const isPaid = book.paymentStatus === 'completed';

    if (!isPaid) {
      // Log that this is a preview generation
      console.log(`Starting preview generation for unpaid book ${id}`);
    }

    // Block if already completed
    if (book.status === 'completed') {
      return NextResponse.json({ error: 'Book already generated' }, { status: 400 });
    }

    // Check if user already has another book generating (non-admins only)
    // Admins can restart any book regardless of other books generating
    if (book.userId && !isAdmin) {
      const otherGeneratingBook = await prisma.book.findFirst({
        where: {
          userId: book.userId,
          id: { not: id }, // Exclude current book
          status: { in: ['generating', 'outlining'] },
        },
        select: { id: true, title: true },
      });

      if (otherGeneratingBook) {
        return NextResponse.json({
          error: 'You already have a book generating. Please wait for it to complete or cancel it first.',
          existingBookId: otherGeneratingBook.id,
          existingBookTitle: otherGeneratingBook.title,
        }, { status: 409 });
      }
    }

    // RACE CONDITION GUARD: If generation is actively in progress (updated recently), skip
    // This prevents duplicate generation from webhook + page load happening simultaneously
    // But allow retry if there's an error message (generation failed and needs to be resumed)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    if ((book.status === 'outlining' || book.status === 'generating') && book.updatedAt > twoMinutesAgo && !book.errorMessage) {
      console.log(`Generation already in progress for book ${id}, skipping duplicate request`);
      return NextResponse.json({
        message: 'Generation already in progress',
        status: book.status
      });
    }

    // If resuming from any incomplete state, reset and clean up partial data
    // This covers: outlining, generating (stale), failed - any state except pending or completed
    if (book.status !== 'pending' && book.status !== 'completed') {
      console.log(`Retrying ${book.status} book generation for book ${id}`);

      // SAFEGUARD: For text books with progress, don't delete - use /resume endpoint instead
      // This prevents accidental data loss when client incorrectly calls /generate
      // EXCEPTION: Admins can force restart any book
      const bookFormatCheck = book.bookFormat || 'text_only';
      const isTextOnlyBook = bookFormatCheck === 'text_only';
      const hasProgress = book.currentChapter > 0 || book.chapters.length > 0;

      if (isTextOnlyBook && hasProgress && book.outline && !isAdmin) {
        console.log(`SAFEGUARD: Text book ${id} has ${book.chapters.length} chapters and outline. Refusing to delete. Use /resume instead.`);
        return NextResponse.json({
          error: 'Book has existing progress. Use /resume endpoint to continue generation.',
          currentChapter: book.currentChapter,
          existingChapters: book.chapters.length,
        }, { status: 400 });
      }

      if (isAdmin && hasProgress) {
        console.log(`[Admin] Force restarting book ${id} with ${book.chapters.length} existing chapters`);
      }

      // Delete any existing chapters and illustrations from failed attempt
      // This is safe for visual books that need a fresh start
      await prisma.illustration.deleteMany({ where: { bookId: id } });
      await prisma.chapter.deleteMany({ where: { bookId: id } });

      await prisma.book.update({
        where: { id },
        data: {
          status: 'generating',
          errorMessage: null,
          currentChapter: 0,
          totalWords: 0,
          storySoFar: '',
          characterStates: {},
        },
      });
    }

    // Start generation process - set start time only if not already set (preserves original time on retry)
    await prisma.book.update({
      where: { id },
      data: {
        status: 'outlining',
        generationStartedAt: book.generationStartedAt || new Date(),
      },
    });

    // Determine if this is a visual book that uses the new parallel generation flow
    const bookFormat = book.bookFormat as BookFormatKey || 'text_only';
    const useVisualFlow = isVisualBook(bookFormat, book.bookPreset);
    const dialogueStyle = getDialogueStyle(book);

    console.log(`Book ${id}: format=${bookFormat}, preset=${book.bookPreset}, useVisualFlow=${useVisualFlow}, dialogueStyle=${dialogueStyle}`);

    // Step 1: Generate outline if not exists
    let outline = book.outline as {
      chapters: Array<{
        number: number;
        title: string;
        summary: string;
        pov?: string;
        targetWords: number;
        text?: string;
        dialogue?: DialogueEntry[];
        scene?: SceneDescription;
      }>
    } | null;

    if (!outline) {
      // Check if this is a screenplay
      if (bookFormat === 'screenplay') {
        // Get format-specific settings from preset
        const presetKey = (book.bookPreset as BookPresetKey) || 'screenplay';
        const preset = BOOK_PRESETS[presetKey] || BOOK_PRESETS.screenplay;
        const targetPages = 'targetPages' in preset ? preset.targetPages : 100;
        const totalSequences = 'sequences' in preset ? preset.sequences : 8;

        console.log(`Generating ${presetKey} screenplay: ${totalSequences} sequences, ${targetPages} pages target`);

        // Screenplay outline with progressive content softening
        const MAX_SP_OUTLINE_ATTEMPTS = 3;
        const SP_SOFTENING = [
          '',
          `\n\nCONTENT NOTE: Keep violence implied, not graphic. Intimate scenes fade to black. Focus on dialogue, tension, and character conflict. Think PG-13 rating.`,
          `\n\nSTRICT: All content must be suitable for general audiences. No graphic violence, no mature themes. Focus on emotional drama, clever dialogue, and plot twists.`,
        ];

        let screenplayResult;
        for (let spAttempt = 0; spAttempt < MAX_SP_OUTLINE_ATTEMPTS; spAttempt++) {
          try {
            if (spAttempt > 0) {
              console.log(`[Screenplay Outline] Retry ${spAttempt + 1}/${MAX_SP_OUTLINE_ATTEMPTS} with softer content...`);
            }
            screenplayResult = await withTimeout(
              generateScreenplayOutline({
                idea: book.premise + SP_SOFTENING[spAttempt],
                genre: book.genre,
                title: book.title,
                targetPages,
              }),
              OUTLINE_TIMEOUT_MS,
              `Screenplay outline generation (attempt ${spAttempt + 1})`
            );
            if (spAttempt > 0) {
              console.log(`[Screenplay Outline] Succeeded on attempt ${spAttempt + 1}`);
            }
            break;
          } catch (spError) {
            const errMsg = spError instanceof Error ? spError.message : '';
            const isContentBlock = errMsg.includes('PROHIBITED_CONTENT') || errMsg.includes('blocked') || errMsg.includes('safety');
            if (isContentBlock && spAttempt < MAX_SP_OUTLINE_ATTEMPTS - 1) {
              console.warn(`[Screenplay Outline] Content blocked on attempt ${spAttempt + 1}, retrying softer...`);
              continue;
            }
            throw spError;
          }
        }

        if (!screenplayResult) {
          throw new Error('Failed to generate screenplay outline after all attempts');
        }

        // Store beat sheet and characters in outline, plus format info for generate-next
        outline = {
          chapters: [], // Will be populated with sequences
          beatSheet: screenplayResult.beatSheet,
          characters: screenplayResult.characters,
          totalSequences, // For dynamic sequence generation
          targetPages, // For dynamic page targets
        } as { chapters: Array<{ number: number; title: string; summary: string; pov?: string; targetWords: number }>; beatSheet?: BeatSheet; characters?: CharacterProfile[]; totalSequences?: number; targetPages?: number };

        // Generate dynamic sequence mapping based on format
        const beatSheet = screenplayResult.beatSheet;
        const sequenceMapping = generateSequenceToBeats(totalSequences, targetPages);

        // Extract story-specific title from beat description
        const extractTitle = (text: string): string => {
          const cleaned = text
            .replace(/^Pages?\s+\d+[-–]\d+\s*[-–:]\s*/i, '')
            .replace(/^Page\s+\d+\s*[-–:]\s*/i, '')
            .split(/[.!?]/)[0]
            .trim();
          const words = cleaned.split(/\s+/).slice(0, 6);
          return words.join(' ').replace(/[,;:]$/, '');
        };

        // Create sequence placeholders with STORY-SPECIFIC titles
        for (let i = 1; i <= totalSequences; i++) {
          const seqInfo = sequenceMapping[i];
          // Get title from first beat in this sequence
          const firstBeat = seqInfo.beats[0] as keyof typeof beatSheet.beats;
          const beatContent = beatSheet.beats[firstBeat] || '';
          const storyTitle = extractTitle(beatContent) || `Act ${seqInfo.act} - Part ${i}`;

          outline.chapters.push({
            number: i,
            title: `Sequence ${i}: ${storyTitle}`,
            summary: beatContent || `Act ${seqInfo.act} sequence covering: ${seqInfo.beats.join(', ')}`,
            targetWords: seqInfo.targetWords,
          });
        }

        // Initialize screenplay context with target pages
        const screenplayContext = createInitialContext(targetPages);
        await prisma.book.update({
          where: { id },
          data: {
            outline: outline as object,
            totalChapters: totalSequences,
            status: 'generating',
            screenplayContext: screenplayContext as object,
          },
        });

        console.log(`Created ${totalSequences} sequence placeholders for ${presetKey} (${targetPages} pages)`);

        // Extract DNA (character names) to blacklist for cross-project uniqueness
        if (book.userId && screenplayResult.characters) {
          try {
            const blacklistedCount = await extractAndBlacklistFromCharacters(
              book.userId,
              id,
              book.title,
              screenplayResult.characters.map(c => ({
                name: c.name,
                archetype: c.dialogueArchetype,
                background: c.backstory,
              }))
            );
            console.log(`[DNA BLACKLIST] Extracted ${blacklistedCount} entries from screenplay characters`);
          } catch (dnaError) {
            console.warn(`[DNA BLACKLIST] Failed to extract DNA:`, dnaError);
            // Non-critical, continue generation
          }
        }
      } else if (useVisualFlow && dialogueStyle) {
        // Use the preset's panel count from targetChapters (20 for picture books, 24 for comics)
        const targetPanelCount = book.targetChapters;
        const isComicStyle = dialogueStyle === 'bubbles';

        // Visual outline with progressive content softening on safety blocks
        const MAX_VISUAL_OUTLINE_ATTEMPTS = 3;
        const CONTENT_SOFTENING_INSTRUCTIONS = [
          '', // Attempt 1: no modification
          `\n\nIMPORTANT CONTENT GUIDELINES: Keep all scenes suitable for general audiences. Replace any violence with dramatic tension. Replace any explicit or mature content with emotional implications. Use "fade to black" for intimate moments. Focus on emotions, atmosphere, and character expressions rather than physical actions.`,
          `\n\nSTRICT CONTENT POLICY: This must be completely family-friendly. No violence, no mature themes, no conflict descriptions. Focus entirely on positive emotions, beautiful environments, and character dialogue. Think Disney/Pixar level content. Every scene should be safe for all ages.`,
        ];

        for (let outlineAttempt = 0; outlineAttempt < MAX_VISUAL_OUTLINE_ATTEMPTS; outlineAttempt++) {
          try {
            const softeningInstruction = CONTENT_SOFTENING_INSTRUCTIONS[outlineAttempt];
            const adjustedPremise = book.premise + softeningInstruction;

            if (outlineAttempt > 0) {
              console.log(`[Visual Outline] Retry ${outlineAttempt + 1}/${MAX_VISUAL_OUTLINE_ATTEMPTS} with softer content instructions...`);
            }

            if (isComicStyle) {
              console.log(`Generating comic outline with 4-step pipeline (${targetPanelCount} panels)...`);
              const comicOutline = await withTimeout(
                generateComicOutline({
                  title: book.title,
                  genre: book.genre,
                  bookType: book.bookType,
                  premise: adjustedPremise,
                  originalIdea: book.originalIdea || undefined,
                  characters: book.characters as { name: string; description: string }[],
                  beginning: book.beginning,
                  middle: book.middle,
                  ending: book.ending,
                  writingStyle: book.writingStyle,
                  targetWords: book.targetWords,
                  targetChapters: targetPanelCount,
                  dialogueStyle: dialogueStyle,
                  contentRating: (book.contentRating || 'general') as ContentRating,
                  characterVisualGuide: book.characterVisualGuide as {
                    characters: Array<{
                      name: string;
                      physicalDescription: string;
                      clothing: string;
                      distinctiveFeatures: string;
                    }>;
                  } | undefined,
                }),
                OUTLINE_TIMEOUT_MS,
                `Comic book outline generation (attempt ${outlineAttempt + 1})`
              );
              outline = comicOutline;
            } else {
              console.log(`Generating picture book outline with 3-step pipeline (${targetPanelCount} panels)...`);
              const visualOutline = await withTimeout(
                generatePictureBookOutline({
                  title: book.title,
                  genre: book.genre,
                  bookType: book.bookType,
                  premise: adjustedPremise,
                  originalIdea: book.originalIdea || undefined,
                  characters: book.characters as { name: string; description: string }[],
                  beginning: book.beginning,
                  middle: book.middle,
                  ending: book.ending,
                  writingStyle: book.writingStyle,
                  targetWords: book.targetWords,
                  targetChapters: targetPanelCount,
                  dialogueStyle: dialogueStyle,
                  characterVisualGuide: book.characterVisualGuide as CharacterVisualGuide | undefined,
                  contentRating: (book.contentRating || 'general') as ContentRating,
                }),
                OUTLINE_TIMEOUT_MS,
                `Picture book outline generation (attempt ${outlineAttempt + 1})`
              );
              outline = visualOutline;
            }

            // Success — break out of retry loop
            if (outlineAttempt > 0) {
              console.log(`[Visual Outline] Succeeded on attempt ${outlineAttempt + 1} with softened content`);
            }
            break;
          } catch (outlineError) {
            const errMsg = outlineError instanceof Error ? outlineError.message : '';
            const isContentBlock = errMsg.includes('PROHIBITED_CONTENT') || errMsg.includes('blocked') || errMsg.includes('safety');

            if (isContentBlock && outlineAttempt < MAX_VISUAL_OUTLINE_ATTEMPTS - 1) {
              console.warn(`[Visual Outline] Content blocked on attempt ${outlineAttempt + 1}, retrying with softer content...`);
              continue;
            }
            // Not a content block or last attempt — rethrow
            throw outlineError;
          }
        }

        if (!outline) {
          throw new Error('Failed to generate visual outline after all attempts');
        }

        // ENFORCE exact panel count - AI sometimes ignores "Create EXACTLY X" instruction
        const generatedCount = outline.chapters.length;
        if (generatedCount !== targetPanelCount) {
          console.warn(`Panel count mismatch: AI generated ${generatedCount}, target was ${targetPanelCount}`);

          if (generatedCount > targetPanelCount) {
            // Trim excess panels
            console.log(`Trimming ${generatedCount - targetPanelCount} excess panels`);
            outline.chapters = outline.chapters.slice(0, targetPanelCount);
          } else if (generatedCount < targetPanelCount) {
            // AI generated too few panels - extend the story
            console.log(`Adding ${targetPanelCount - generatedCount} missing panels to reach target`);
            const lastChapter = outline.chapters[outline.chapters.length - 1];
            const lastScene = lastChapter.scene || {
              location: 'continuation',
              description: 'The story continues',
              characters: [],
              characterActions: {},
              background: 'same setting',
              mood: 'continuation',
              cameraAngle: 'medium shot',
            };
            for (let i = generatedCount + 1; i <= targetPanelCount; i++) {
              // Clone last chapter structure with incremented number
              outline.chapters.push({
                ...lastChapter,
                number: i,
                title: `Page ${i}`,
                text: lastChapter.text || 'The story continues...',
                scene: {
                  location: lastScene.location || 'same location',
                  description: `Continuation of the story - Panel ${i}`,
                  characters: lastScene.characters || [],
                  characterActions: lastScene.characterActions || {},
                  background: lastScene.background || 'continuation',
                  mood: lastScene.mood || 'same',
                  cameraAngle: lastScene.cameraAngle || 'medium shot',
                },
              });
            }
          }
        }

        console.log(`Final panel count: ${outline.chapters.length}`);

        // Renumber chapters to ensure sequential numbering
        outline.chapters = outline.chapters.map((ch, idx) => ({
          ...ch,
          number: idx + 1,
        }));

        // Validate scene data on every chapter to prevent frontend crashes
        outline.chapters = outline.chapters.map((ch) => {
          if (!ch.scene) {
            ch.scene = {
              location: 'unspecified',
              description: ch.summary || ch.text || `Page ${ch.number}`,
              characters: (book.characters as { name: string }[]).map(c => c.name),
              characterActions: {},
              background: 'default setting',
              mood: 'neutral',
              cameraAngle: 'medium shot',
            };
          }
          if (!ch.scene.description) ch.scene.description = ch.summary || `Page ${ch.number}`;
          if (!ch.scene.characters) ch.scene.characters = [];
          if (!ch.scene.characterActions) ch.scene.characterActions = {};
          return ch;
        });
      } else if (book.bookType === 'non-fiction') {
        // Use non-fiction outline for non-fiction books
        console.log('Generating non-fiction outline with topic structure...');
        const nfOutline = await withTimeout(
          generateNonFictionOutline({
            title: book.title,
            genre: book.genre,
            bookType: book.bookType,
            premise: book.premise,
            originalIdea: book.originalIdea || undefined,
            beginning: book.beginning,
            middle: book.middle,
            ending: book.ending,
            writingStyle: book.writingStyle,
            targetWords: book.targetWords,
            targetChapters: book.targetChapters,
          }),
          OUTLINE_TIMEOUT_MS,
          'Non-fiction outline generation'
        );
        outline = {
          chapters: nfOutline.chapters.map(ch => ({
            ...ch,
            summary: ch.summary,
            pov: undefined,
          })),
        };
      } else {
        // Fiction text-based books with progressive content softening on safety blocks
        const MAX_TEXT_OUTLINE_ATTEMPTS = 3;
        const TEXT_SOFTENING = [
          '',
          `\n\nCONTENT NOTE: Rewrite any mature scenes as emotional implications. Violence should be referenced but not depicted. Intimate scenes use "fade to black." Think prestige drama (HBO) not explicit.`,
          `\n\nSTRICT: Make this completely PG-13. No violence details, no mature themes. Focus on character emotions, relationships, and plot twists. Skip any scene that could trigger content filters.`,
        ];

        let lastOutlineProgressUpdate = 0;
        const onOutlineProgress = async (status: string, chaptersCompleted: number, totalChapters: number) => {
          const now = Date.now();
          if (now - lastOutlineProgressUpdate > 2000) {
            try {
              await prisma.book.update({
                where: { id },
                data: { livePreview: `📝 ${status}\n\nPlanning ${chaptersCompleted}/${totalChapters} chapters...` },
              });
              lastOutlineProgressUpdate = now;
            } catch (e) {
              // Ignore - live preview is non-critical
            }
          }
        };

        for (let textAttempt = 0; textAttempt < MAX_TEXT_OUTLINE_ATTEMPTS; textAttempt++) {
          try {
            const adjustedPremise = book.premise + TEXT_SOFTENING[textAttempt];

            if (textAttempt > 0) {
              console.log(`[Text Outline] Retry ${textAttempt + 1}/${MAX_TEXT_OUTLINE_ATTEMPTS} with softer content...`);
            }

            if (book.targetChapters > 16) {
              console.log(`[Generate] Large book (${book.targetChapters} chapters) - using chunked outline generation`);
              outline = await generateOutline({
                title: book.title,
                genre: book.genre,
                bookType: book.bookType,
                premise: adjustedPremise,
                originalIdea: book.originalIdea || undefined,
                characters: book.characters as { name: string; description: string }[],
                beginning: book.beginning,
                middle: book.middle,
                ending: book.ending,
                writingStyle: book.writingStyle,
                targetWords: book.targetWords,
                targetChapters: book.targetChapters,
                region: book.region,
                onProgress: onOutlineProgress,
              });
            } else {
              outline = await withTimeout(
                generateOutline({
                  title: book.title,
                  genre: book.genre,
                  bookType: book.bookType,
                  premise: adjustedPremise,
                  originalIdea: book.originalIdea || undefined,
                  characters: book.characters as { name: string; description: string }[],
                  beginning: book.beginning,
                  middle: book.middle,
                  ending: book.ending,
                  writingStyle: book.writingStyle,
                  targetWords: book.targetWords,
                  targetChapters: book.targetChapters,
                  region: book.region,
                  onProgress: onOutlineProgress,
                }),
                OUTLINE_TIMEOUT_MS,
                `Fiction outline generation (attempt ${textAttempt + 1})`
              );
            }

            if (textAttempt > 0) {
              console.log(`[Text Outline] Succeeded on attempt ${textAttempt + 1} with softened content`);
            }
            break;
          } catch (outlineError) {
            const errMsg = outlineError instanceof Error ? outlineError.message : '';
            const isContentBlock = errMsg.includes('PROHIBITED_CONTENT') || errMsg.includes('blocked') || errMsg.includes('safety');

            if (isContentBlock && textAttempt < MAX_TEXT_OUTLINE_ATTEMPTS - 1) {
              console.warn(`[Text Outline] Content blocked on attempt ${textAttempt + 1}, retrying softer...`);
              continue;
            }
            throw outlineError;
          }
        }

        await prisma.book.update({
          where: { id },
          data: { livePreview: null },
        });
      }

      if (!outline) {
        throw new Error('Failed to generate outline after all attempts');
      }

      await prisma.book.update({
        where: { id },
        data: {
          outline: outline as object,
          totalChapters: outline.chapters.length,
          status: 'generating',
        },
      });
    } else {
      // Outline already exists (from previous attempt) - just update status to 'generating'
      console.log(`Outline already exists with ${outline.chapters.length} chapters, skipping regeneration`);
      await prisma.book.update({
        where: { id },
        data: {
          status: 'generating',
          totalChapters: outline.chapters.length,
        },
      });
    }

    // Step 1.5: Generate visual guides for illustrated books (before any illustrations)
    const formatConfig = BOOK_FORMATS[bookFormat];
    const artStyleKey = book.artStyle as ArtStyleKey | null;
    const artStyleConfig = artStyleKey ? ART_STYLES[artStyleKey] : null;
    const characters = book.characters as { name: string; description: string }[];

    let characterVisualGuide = book.characterVisualGuide as CharacterVisualGuide | null;
    let visualStyleGuide = book.visualStyleGuide as VisualStyleGuide | null;

    // Generate visual guides for illustrated books if not already done
    if (formatConfig && formatConfig.illustrationsPerChapter > 0 && book.artStyle && !characterVisualGuide) {
      try {
        console.log('Generating character visual guide for consistency...');
        characterVisualGuide = await generateCharacterVisualGuide({
          title: book.title,
          genre: book.genre,
          artStyle: book.artStyle,
          characters,
        });

        console.log('Generating visual style guide for consistency...');
        visualStyleGuide = await generateVisualStyleGuide({
          title: book.title,
          genre: book.genre,
          artStyle: book.artStyle,
          artStylePrompt: artStyleConfig?.prompt || 'professional illustration',
          premise: book.premise,
          bookFormat: book.bookFormat,
        });

        // Generate character portraits for consistency (AFTER visual guide is created)
        // For unpaid previews: generate face-only portraits (saves ~1 min vs full portraits)
        // For paid books: generate full portraits (face + full body)
        console.log('Generating character portrait references...');
        let characterPortraits = null;
        try {
          characterPortraits = await generateCharacterPortraits({
            title: book.title,
            genre: book.genre,
            artStyle: book.artStyle,
            bookFormat: book.bookFormat,
            characterVisualGuide,
            faceOnly: !isPaid, // Face-only for previews, full portraits for paid
          });
          console.log(`Generated ${characterPortraits.length} character portraits`);
        } catch (portraitError) {
          console.error('Failed to generate character portraits:', portraitError);
          // Continue without portraits - will fall back to first appearance references
        }

        // Store the guides and portraits in the database
        await prisma.book.update({
          where: { id },
          data: {
            characterVisualGuide: characterVisualGuide as object,
            visualStyleGuide: visualStyleGuide as object,
            characterPortraits: characterPortraits ? (characterPortraits as object) : undefined,
          },
        });

        console.log('Visual guides generated and saved for book:', id);
      } catch (guideError) {
        console.error('Failed to generate visual guides:', guideError);
        // Continue without guides - illustrations will use basic character descriptions
      }
    }

    // For outlineOnly mode, return here after generating the outline
    if (outlineOnly) {
      const isComicFlow = dialogueStyle === 'bubbles';

      // If server-driven, mark the book and kick off generation automatically
      if (serverDriven) {
        await prisma.book.update({
          where: { id },
          data: { generationMode: 'server' },
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://draftmybook.com';

        if (isComicFlow || useVisualFlow) {
          // Comics/picture books: trigger visual generation
          console.log(`[Generate] Server-driven: kicking off /generate-visual for ${id}`);
          fetch(`${appUrl}/api/books/${id}/generate-visual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }).catch(err => console.error(`[Generate] Failed to kick off visual gen for ${id}:`, err));
        } else {
          // Text/screenplay: trigger chapter-by-chapter generation
          console.log(`[Generate] Server-driven: kicking off /generate-next for ${id}`);
          fetch(`${appUrl}/api/books/${id}/generate-next`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }).catch(err => console.error(`[Generate] Failed to kick off chapter gen for ${id}:`, err));
        }
      }

      console.log(`OutlineOnly mode: ${outline.chapters.length} ${isComicFlow ? 'panels' : 'chapters'} ready. ${serverDriven ? 'Server-driven generation started.' : 'Waiting for client.'}`);

      // Refetch book with updated data
      const updatedBook = await prisma.book.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          artStyle: true,
          bookFormat: true,
          dialogueStyle: true,
          characterVisualGuide: true,
          visualStyleGuide: true,
          outline: true,
          status: true,
          totalChapters: true,
          currentChapter: true,
        },
      });

      return NextResponse.json({
        success: true,
        outlineOnly: true,
        serverDriven,
        book: updatedBook,
        totalPanels: outline.chapters.length,
        totalChapters: outline.chapters.length,
        message: serverDriven
          ? 'Generation started. You can leave this page — we\'ll email you when it\'s ready.'
          : isComicFlow
            ? 'Outline generated. Ready for parallel panel generation.'
            : 'Outline generated. Ready for chapter-by-chapter generation.',
      });
    }

    // Step 2: Generate content
    let storySoFar = book.storySoFar || '';
    let characterStates = (book.characterStates as Record<string, object>) || {};
    let totalWords = book.totalWords || 0;

    const startChapter = book.currentChapter + 1;

    // VISUAL BOOK FLOW: Parallel generation for picture books and comics
    if (useVisualFlow && dialogueStyle && book.artStyle) {
      console.log('Using parallel generation flow for visual book...');

      // Cast outline to visual chapters
      const visualChapters = outline.chapters as VisualChapter[];

      // PREVIEW LIMIT: Unpaid visual books get max 5 panels (free preview)
      // This prevents Vercel timeout from trying to generate 20-24 panels
      const FREE_PREVIEW_PANELS = 5;
      const maxPanels = isPaid ? visualChapters.length : FREE_PREVIEW_PANELS;
      const chaptersToGenerate = visualChapters.slice(startChapter - 1, maxPanels);

      if (!isPaid && visualChapters.length > FREE_PREVIEW_PANELS) {
        console.log(`[Preview] Limiting unpaid visual book to ${FREE_PREVIEW_PANELS} panels (book has ${visualChapters.length} total)`);
      }

      // Load character portraits from DB for reference images (critical for consistency)
      let portraitsForGen: CharacterPortrait[] | undefined;
      try {
        const bookWithPortraits = await prisma.book.findUnique({
          where: { id },
          select: { characterPortraits: true },
        });
        if (bookWithPortraits?.characterPortraits) {
          portraitsForGen = bookWithPortraits.characterPortraits as unknown as CharacterPortrait[];
          console.log(`Loaded ${portraitsForGen.length} character portraits for reference`);
        }
      } catch (e) {
        console.warn('Failed to load character portraits for generation:', e);
      }

      // Step 2a: Generate illustrations in parallel (using scene descriptions from outline)
      console.log(`Generating ${chaptersToGenerate.length} illustrations in parallel...`);
      const illustrationResults = await generateIllustrationsInParallel(
        chaptersToGenerate,
        {
          id,
          title: book.title,
          artStyle: book.artStyle,
          artStylePrompt: artStyleConfig?.prompt || 'professional illustration',
          bookFormat: bookFormat,
          dialogueStyle: dialogueStyle,
          characters,
          premise: book.premise,
          characterVisualGuide: characterVisualGuide || undefined,
          visualStyleGuide: visualStyleGuide || undefined,
          contentRating: (book.contentRating as ContentRating) || 'general',
          characterPortraits: portraitsForGen,
        }
      );

      console.log(`Generated ${illustrationResults.size} illustrations`);

      // Step 2b: Save chapters with their illustrations
      // For unpaid books, only save up to maxPanels (preview limit)
      const panelsToSave = isPaid ? outline.chapters.length : maxPanels;
      for (let i = startChapter; i <= panelsToSave; i++) {
        const chapterPlan = visualChapters[i - 1];

        // For visual books, the text is already in the outline
        const chapterContent = chapterPlan.text || chapterPlan.summary;
        const wordCount = countWords(chapterContent);
        totalWords += wordCount;

        // Save chapter with scene description and dialogue (upsert to handle retries)
        const chapter = await prisma.chapter.upsert({
          where: {
            bookId_number: { bookId: id, number: i },
          },
          update: {
            title: chapterPlan.title,
            content: chapterContent,
            summary: chapterPlan.summary || chapterContent.substring(0, 200),
            wordCount,
            sceneDescription: chapterPlan.scene as object || null,
            dialogue: chapterPlan.dialogue as object[] || null,
          },
          create: {
            bookId: id,
            number: i,
            title: chapterPlan.title,
            content: chapterContent,
            summary: chapterPlan.summary || chapterContent.substring(0, 200),
            wordCount,
            sceneDescription: chapterPlan.scene as object || null,
            dialogue: chapterPlan.dialogue as object[] || null,
          },
        });
        console.log(`Page ${i} saved. Word count: ${wordCount}`);

        // Save illustration if generated (delete existing first to handle retries)
        const illustration = illustrationResults.get(i);
        if (illustration) {
          // Delete any existing illustrations for this chapter (from previous retry)
          await prisma.illustration.deleteMany({
            where: { chapterId: chapter.id },
          });
          await prisma.illustration.create({
            data: {
              bookId: id,
              chapterId: chapter.id,
              imageUrl: illustration.imageUrl,
              prompt: chapterPlan.scene?.description || `Page ${i} illustration`,
              altText: illustration.altText,
              position: 0,
              style: book.artStyle,
              width: illustration.width,
              height: illustration.height,
            },
          });
        }

        // Update book progress
        await prisma.book.update({
          where: { id },
          data: {
            currentChapter: i,
            totalWords,
          },
        });
      }

      // CRITICAL: Check if all illustrations were generated
      // For unpaid preview, we only expect panelsToSave illustrations
      // For paid books, we expect all outline chapters
      const expectedPanels = panelsToSave;
      const generatedPanels = illustrationResults.size;
      if (generatedPanels < expectedPanels) {
        console.error(`Visual book incomplete: ${generatedPanels}/${expectedPanels} illustrations generated`);
        await prisma.book.update({
          where: { id },
          data: {
            status: 'failed',
            errorMessage: `Only ${generatedPanels} of ${expectedPanels} illustrations were generated. Please retry to complete the remaining panels.`,
          },
        });
        return NextResponse.json({
          error: `Incomplete: ${generatedPanels}/${expectedPanels} illustrations generated`,
          generated: generatedPanels,
          expected: expectedPanels,
          message: 'Some illustrations failed to generate. Please retry.',
        }, { status: 500 });
      }

      // For unpaid preview, mark as preview_complete instead of completed
      // User needs to pay to generate all panels
      if (!isPaid && panelsToSave < outline.chapters.length) {
        console.log(`[Preview] Visual book preview complete: ${panelsToSave}/${outline.chapters.length} panels`);
        await prisma.book.update({
          where: { id },
          data: {
            status: 'preview',
            currentChapter: panelsToSave,
            totalChapters: outline.chapters.length,
          },
        });
        return NextResponse.json({
          success: true,
          preview: true,
          message: `Preview complete! ${panelsToSave} of ${outline.chapters.length} panels generated.`,
          generatedPanels: panelsToSave,
          totalPanels: outline.chapters.length,
        });
      }
    } else {
      // STANDARD FLOW: Sequential generation for text-based books
      for (let i = startChapter; i <= outline.chapters.length; i++) {
        const chapterPlan = outline.chapters[i - 1] as {
          number: number;
          title: string;
          summary: string;
          pov?: string;
          targetWords: number;
          keyPoints?: string[]; // For non-fiction chapters
        };

        // Generate chapter content
        const chapterContent = await generateChapter({
          title: book.title,
          genre: book.genre,
          bookType: book.bookType,
          writingStyle: book.writingStyle,
          outline: outline,
          storySoFar,
          characterStates,
          chapterNumber: chapterPlan.number,
          chapterTitle: chapterPlan.title,
          chapterPlan: chapterPlan.summary,
          chapterPov: chapterPlan.pov,
          targetWords: chapterPlan.targetWords,
          chapterFormat: book.chapterFormat,
          chapterKeyPoints: chapterPlan.keyPoints, // Pass key points for non-fiction
          contentRating: (book.contentRating || 'general') as ContentRating,
          totalChapters: outline.chapters.length, // For adding "The End" on final chapter
        });

        const wordCount = countWords(chapterContent);
        totalWords += wordCount;

        // Generate chapter summary (now using Flash Light with smart fallback)
        let summary: string;
        try {
          summary = await summarizeChapter(chapterContent);
        } catch (summaryError) {
          console.error(`Failed to summarize chapter ${i}:`, summaryError);
          summary = chapterContent.substring(0, 500) + '...'; // Final fallback
        }

        // Update character states (with fallback)
        try {
          characterStates = await updateCharacterStates(
            characterStates,
            chapterContent,
            i
          );
        } catch (stateError) {
          console.error(`Failed to update character states for chapter ${i}:`, stateError);
          // Continue with existing states
        }

        // Update story so far
        storySoFar += `\n\nChapter ${i}: ${chapterPlan.title}\n${summary}`;

        // Save chapter (upsert to handle edge cases)
        const chapter = await prisma.chapter.upsert({
          where: {
            bookId_number: { bookId: id, number: i },
          },
          update: {
            title: chapterPlan.title,
            content: chapterContent,
            summary,
            wordCount,
          },
          create: {
            bookId: id,
            number: i,
            title: chapterPlan.title,
            content: chapterContent,
            summary,
            wordCount,
          },
        });
        console.log(`Chapter ${i} saved successfully. Word count: ${wordCount}`);

        // Fire off async review ONLY for text-heavy books (novels, non-fiction)
        // Skip review for visual books - their text is minimal
        if (bookFormat === 'text_only') {
          const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/books/${id}/review-chapter`;
          fetch(reviewUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chapterId: chapter.id }),
          }).catch(err => console.log(`[Review] Background review request failed for chapter ${i}:`, err.message));
        }

        // Generate illustrations if book has illustrations enabled (using pre-generated visual guides)
        // Uses smart retry with sanitized prompts if content policy blocks occur
        if (formatConfig && formatConfig.illustrationsPerChapter > 0 && book.artStyle) {
          try {
            if (bookFormat === 'picture_book') {
              // Picture book: more detailed, full-page illustrations
              const illustrationPlan = await generateChildrensIllustrationPrompts({
                pageNumber: i,
                pageText: chapterContent.substring(0, 500),
                characters,
                setting: book.premise.substring(0, 200),
                artStyle: artStyleConfig?.prompt || 'storybook illustration',
                bookTitle: book.title,
              });

              // Generate the illustration image with visual consistency guides
              const illustrationResponse = await generateIllustrationImage({
                scene: illustrationPlan.visualDescription,
                artStyle: book.artStyle,
                characters,
                setting: illustrationPlan.backgroundDetails,
                bookTitle: book.title,
                chapterTitle: chapterPlan.title,
                characterVisualGuide: characterVisualGuide || undefined,
                visualStyleGuide: visualStyleGuide || undefined,
                bookFormat: bookFormat,
              });

              if (illustrationResponse) {
                await prisma.illustration.create({
                  data: {
                    bookId: id,
                    chapterId: chapter.id,
                    imageUrl: illustrationResponse.imageUrl,
                    prompt: illustrationPlan.visualDescription,
                    altText: illustrationPlan.scene,
                    position: 0,
                    style: book.artStyle,
                    width: illustrationResponse.width,
                    height: illustrationResponse.height,
                  },
                });
              }
            } else {
              // Illustrated book: 1 illustration per chapter
              const illustrationPrompts = await generateIllustrationPrompts({
                chapterNumber: i,
                chapterTitle: chapterPlan.title,
                chapterContent,
                characters,
                artStyle: artStyleConfig?.prompt || 'professional illustration',
                illustrationsCount: formatConfig.illustrationsPerChapter,
                bookTitle: book.title,
              });

              // Generate each illustration with visual consistency guides
              for (let j = 0; j < illustrationPrompts.length; j++) {
                const illustPrompt = illustrationPrompts[j];

                const illustrationResponse = await generateIllustrationImage({
                  scene: illustPrompt.description,
                  artStyle: book.artStyle,
                  characters: characters.filter(c => illustPrompt.characters.includes(c.name)),
                  setting: book.premise.substring(0, 200),
                  bookTitle: book.title,
                  chapterTitle: chapterPlan.title,
                  characterVisualGuide: characterVisualGuide || undefined,
                  visualStyleGuide: visualStyleGuide || undefined,
                  bookFormat: bookFormat,
                });

                if (illustrationResponse) {
                  await prisma.illustration.create({
                    data: {
                      bookId: id,
                      chapterId: chapter.id,
                      imageUrl: illustrationResponse.imageUrl,
                      prompt: illustPrompt.description,
                      altText: illustPrompt.scene,
                      position: j,
                      style: book.artStyle,
                      width: illustrationResponse.width,
                      height: illustrationResponse.height,
                    },
                  });
                }
              }
            }
          } catch (illustrationError) {
            console.error(`Failed to generate illustrations for chapter ${i}:`, illustrationError);
            // Continue without illustrations - don't fail the whole book
          }
        }

        // Update book progress
        await prisma.book.update({
          where: { id },
          data: {
            currentChapter: i,
            totalWords,
            storySoFar,
            characterStates: characterStates as object,
          },
        });
      }
    } // End of else block for standard flow

    // Step 3: Generate cover (using visual guides for consistency with interior)
    const coverPrompt = await generateCoverPrompt({
      title: book.title,
      genre: book.genre,
      bookType: book.bookType,
      premise: book.premise,
      authorName: book.authorName,
      artStyle: book.artStyle || undefined,
      artStylePrompt: artStyleConfig?.coverStyle,
      characterVisualGuide: characterVisualGuide || undefined,
      visualStyleGuide: visualStyleGuide || undefined,
    });

    let coverImageUrl: string | null = null;
    try {
      coverImageUrl = await generateCoverImage(coverPrompt);
    } catch (error) {
      console.error('Failed to generate cover:', error);
      // Continue without cover
    }

    // Mark as completed
    await prisma.book.update({
      where: { id },
      data: {
        status: 'completed',
        coverImageUrl,
        coverPrompt,
        completedAt: new Date(),
      },
    });

    // Send email notification if email is available
    if (book.email) {
      const bookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${id}`;

      // Check if this is the user's first completed book (for discount offer)
      let isFirstBook = false;
      if (book.userId) {
        const completedBooksCount = await prisma.book.count({
          where: {
            userId: book.userId,
            status: 'completed',
          },
        });
        isFirstBook = completedBooksCount === 1; // This book is the only completed one
      }

      const emailContent = getBookReadyEmail(book.title, book.authorName, bookUrl, { isFirstBook });
      await sendEmail({
        to: book.email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Book generation completed',
      totalChapters: outline.chapters.length,
      totalWords,
    });
  } catch (error) {
    console.error('Error generating book:', error);
    if (error instanceof Error) {
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
    }

    const { id } = await params;

    // Check if this is a content moderation block
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isContentBlocked = errorMessage.includes('PROHIBITED_CONTENT') ||
      errorMessage.includes('blocked') ||
      errorMessage.includes('safety');

    // Get book details for refund logic
    const failedBook = await prisma.book.update({
      where: { id },
      data: {
        status: 'failed',
        errorMessage: isContentBlocked
          ? 'content_blocked'
          : errorMessage,
      },
      select: { id: true, userId: true, paymentId: true, premise: true },
    });

    // Auto-refund credit for content-blocked books
    if (isContentBlocked && failedBook.userId) {
      try {
        const isPromoPayment = failedBook.paymentId?.startsWith('promo_');
        const isFreePayment = failedBook.paymentId?.startsWith('free_');

        if (isPromoPayment || isFreePayment) {
          // Refund as free credit
          await prisma.user.update({
            where: { id: failedBook.userId },
            data: { freeCredits: { increment: 1 } },
          });
        } else if (failedBook.paymentId) {
          // Paid with subscription credits — refund credit
          await prisma.user.update({
            where: { id: failedBook.userId },
            data: { credits: { increment: 1 } },
          });
        }

        // Send notification about the refund
        await prisma.notification.create({
          data: {
            userId: failedBook.userId,
            type: 'credit_refund',
            title: 'Credit refunded',
            message: 'Your book was blocked by content filters. We\'ve refunded your credit — try again with adjusted content.',
          },
        });

        console.log(`[Generate] Auto-refunded credit for content-blocked book ${id} to user ${failedBook.userId}`);
      } catch (refundErr) {
        console.error(`[Generate] Failed to auto-refund for book ${id}:`, refundErr);
      }
    }

    return NextResponse.json(
      {
        error: isContentBlocked
          ? 'Content was blocked by AI safety filters. Your credit has been refunded.'
          : 'Failed to generate book',
        contentBlocked: isContentBlocked,
      },
      { status: isContentBlocked ? 400 : 500 }
    );
  }
}
