import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateOutline,
  generateNonFictionOutline,
  generateIllustratedOutline,
  buildIllustrationPromptFromScene,
  generateChapter,
  summarizeChapter,
  updateCharacterStates,
  generateCoverPrompt,
  generateCoverImage,
  generateIllustrationPrompts,
  generateChildrensIllustrationPrompts,
  generateCharacterVisualGuide,
  generateVisualStyleGuide,
  type VisualChapter,
  type SceneDescription,
  type DialogueEntry,
  type PanelLayout,
  type ContentRating,
} from '@/lib/gemini';
import { countWords } from '@/lib/epub';
import { BOOK_FORMATS, ART_STYLES, ILLUSTRATION_DIMENSIONS, BOOK_PRESETS, type BookFormatKey, type ArtStyleKey, type BookPresetKey } from '@/lib/constants';
import { sendEmail, getBookReadyEmail } from '@/lib/email';

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
      const hasDialogue = bookData.dialogueStyle === 'bubbles' && chapter.dialogue && chapter.dialogue.length > 0;
      const isPictureBook = bookData.bookFormat === 'picture_book' && !hasDialogue;
      const hasStoryText = isPictureBook && !!chapter.text && chapter.text.trim().length > 0;
      const needsTextBaking = !!(hasDialogue || hasStoryText);

      // Build prompt from scene description (with panel layout for comics)
      // Skip the "NO TEXT" instruction if we need to bake text into the image
      let illustrationPrompt = buildIllustrationPromptFromScene(
        chapter.scene,
        bookData.artStylePrompt,
        bookData.characterVisualGuide,
        bookData.visualStyleGuide,
        chapter.panelLayout, // Pass panel layout for multi-panel comics
        { skipNoTextInstruction: needsTextBaking }
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
        console.log(`Generating illustration with ${bubbles.length} speech bubbles for page ${chapter.number}...`);
      } else if (hasStoryText) {
        // Picture book with story text - bake text at bottom of image
        illustrationPrompt += buildPictureBookTextPrompt(chapter.text);
        console.log(`Generating illustration with story text for page ${chapter.number}...`);
      } else {
        // No text needed - add explicit no-text instruction
        illustrationPrompt += `\n${NO_TEXT_INSTRUCTION}`;
        console.log(`Generating illustration for page ${chapter.number}...`);
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

  // Check preset
  if (bookPreset === 'childrens_picture' || bookPreset === 'comic_story') return true;

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

    // Check for outlineOnly mode (for comics - client handles parallel panel generation)
    let outlineOnly = false;
    try {
      const body = await request.json();
      outlineOnly = body.outlineOnly === true;
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

    // Check payment OR free tier eligibility
    if (book.paymentStatus !== 'completed') {
      // Check if user has free book available
      if (book.userId) {
        const user = await prisma.user.findUnique({
          where: { id: book.userId },
          select: { freeBookUsed: true, plan: true, credits: true },
        });

        if (user && !user.freeBookUsed) {
          // User has free book available - mark as used and allow generation
          await prisma.user.update({
            where: { id: book.userId },
            data: { freeBookUsed: true },
          });
          // Mark book as paid via free tier
          await prisma.book.update({
            where: { id },
            data: { paymentStatus: 'completed' },
          });
          console.log(`Free book used for user ${book.userId}, book ${id}`);
        } else {
          // No free book available
          return NextResponse.json({ error: 'Payment required' }, { status: 402 });
        }
      } else {
        // Anonymous user - must pay
        return NextResponse.json({ error: 'Payment required' }, { status: 402 });
      }
    }

    // Block if already completed
    if (book.status === 'completed') {
      return NextResponse.json({ error: 'Book already generated' }, { status: 400 });
    }

    // Check if user already has another book generating (non-admins only)
    if (book.userId) {
      const userCheck = await prisma.user.findUnique({
        where: { id: book.userId },
        select: { isAdmin: true },
      });

      if (!userCheck?.isAdmin) {
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
      const bookFormatCheck = book.bookFormat || 'text_only';
      const isTextOnlyBook = bookFormatCheck === 'text_only';
      const hasProgress = book.currentChapter > 0 || book.chapters.length > 0;

      if (isTextOnlyBook && hasProgress && book.outline) {
        console.log(`SAFEGUARD: Text book ${id} has ${book.chapters.length} chapters and outline. Refusing to delete. Use /resume instead.`);
        return NextResponse.json({
          error: 'Book has existing progress. Use /resume endpoint to continue generation.',
          currentChapter: book.currentChapter,
          existingChapters: book.chapters.length,
        }, { status: 400 });
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
    let outline = book.outline as { chapters: Array<{
      number: number;
      title: string;
      summary: string;
      pov?: string;
      targetWords: number;
      text?: string;
      dialogue?: DialogueEntry[];
      scene?: SceneDescription;
    }> } | null;

    if (!outline) {
      if (useVisualFlow && dialogueStyle) {
        // Use enhanced illustrated outline for visual books
        console.log('Generating illustrated outline with scene descriptions...');
        const visualOutline = await generateIllustratedOutline({
          title: book.title,
          genre: book.genre,
          bookType: book.bookType,
          premise: book.premise,
          characters: book.characters as { name: string; description: string }[],
          beginning: book.beginning,
          middle: book.middle,
          ending: book.ending,
          writingStyle: book.writingStyle,
          targetWords: book.targetWords,
          targetChapters: book.targetChapters,
          dialogueStyle: dialogueStyle,
          characterVisualGuide: book.characterVisualGuide as CharacterVisualGuide | undefined,
          contentRating: (book.contentRating || 'general') as ContentRating,
        });
        outline = visualOutline;
      } else if (book.bookType === 'non-fiction') {
        // Use non-fiction outline for non-fiction books
        console.log('Generating non-fiction outline with topic structure...');
        const nfOutline = await generateNonFictionOutline({
          title: book.title,
          genre: book.genre,
          bookType: book.bookType,
          premise: book.premise,
          beginning: book.beginning,
          middle: book.middle,
          ending: book.ending,
          writingStyle: book.writingStyle,
          targetWords: book.targetWords,
          targetChapters: book.targetChapters,
        });
        // Map non-fiction outline to standard format (keyPoints → summary for compatibility)
        outline = {
          chapters: nfOutline.chapters.map(ch => ({
            ...ch,
            summary: ch.summary,
            pov: undefined, // Non-fiction doesn't have POV
          })),
        };
      } else {
        // Use standard outline for fiction text-based books
        outline = await generateOutline({
          title: book.title,
          genre: book.genre,
          bookType: book.bookType,
          premise: book.premise,
          characters: book.characters as { name: string; description: string }[],
          beginning: book.beginning,
          middle: book.middle,
          ending: book.ending,
          writingStyle: book.writingStyle,
          targetWords: book.targetWords,
          targetChapters: book.targetChapters,
        });
      }

      await prisma.book.update({
        where: { id },
        data: {
          outline: outline as object,
          totalChapters: outline.chapters.length,
          status: 'generating',
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

        // Store the guides in the database
        await prisma.book.update({
          where: { id },
          data: {
            characterVisualGuide: characterVisualGuide as object,
            visualStyleGuide: visualStyleGuide as object,
          },
        });

        console.log('Visual guides generated and saved for book:', id);
      } catch (guideError) {
        console.error('Failed to generate visual guides:', guideError);
        // Continue without guides - illustrations will use basic character descriptions
      }
    }

    // For outlineOnly mode, return here after generating the outline
    // For comics: client will fire parallel /api/generate-panel requests
    // For text books: client will call /api/books/[id]/generate-next repeatedly
    if (outlineOnly) {
      const isComicFlow = dialogueStyle === 'bubbles';
      console.log(`OutlineOnly mode: returning outline with ${outline.chapters.length} ${isComicFlow ? 'panels' : 'chapters'} for client-side ${isComicFlow ? 'parallel panel' : 'sequential chapter'} generation`);

      // Status is already 'generating' from the outline save above

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
        book: updatedBook,
        totalPanels: outline.chapters.length,
        totalChapters: outline.chapters.length,
        message: isComicFlow
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

      // Step 2a: Generate all illustrations in parallel (using scene descriptions from outline)
      console.log('Generating all illustrations in parallel...');
      const illustrationResults = await generateIllustrationsInParallel(
        visualChapters.slice(startChapter - 1), // Start from where we left off
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
        }
      );

      console.log(`Generated ${illustrationResults.size} illustrations`);

      // Step 2b: Save chapters with their illustrations
      for (let i = startChapter; i <= outline.chapters.length; i++) {
        const chapterPlan = visualChapters[i - 1];

        // For visual books, the text is already in the outline
        const chapterContent = chapterPlan.text || chapterPlan.summary;
        const wordCount = countWords(chapterContent);
        totalWords += wordCount;

        // Save chapter with scene description and dialogue
        const chapter = await prisma.chapter.create({
          data: {
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

        // Save illustration if generated
        const illustration = illustrationResults.get(i);
        if (illustration) {
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
      // Visual books MUST have all illustrations before being marked complete
      const expectedPanels = outline.chapters.length;
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
        });

        const wordCount = countWords(chapterContent);
        totalWords += wordCount;

        // Generate chapter summary (with fallback)
        let summary: string;
        try {
          summary = await summarizeChapter(chapterContent);
        } catch (summaryError) {
          console.error(`Failed to summarize chapter ${i}:`, summaryError);
          summary = chapterContent.substring(0, 500) + '...'; // Fallback to truncated content
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

        // Save chapter
        const chapter = await prisma.chapter.create({
          data: {
            bookId: id,
            number: i,
            title: chapterPlan.title,
            content: chapterContent,
            summary,
            wordCount,
          },
        });
        console.log(`Chapter ${i} saved successfully. Word count: ${wordCount}`);

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

    const { id } = await params;

    // Check if this is a content moderation block
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isContentBlocked = errorMessage.includes('PROHIBITED_CONTENT') ||
                             errorMessage.includes('blocked') ||
                             errorMessage.includes('safety');

    await prisma.book.update({
      where: { id },
      data: {
        status: 'failed',
        errorMessage: isContentBlocked
          ? 'content_blocked'
          : errorMessage,
      },
    });

    return NextResponse.json(
      {
        error: isContentBlocked
          ? 'Content was blocked by AI safety filters. Please try with different content.'
          : 'Failed to generate book',
        contentBlocked: isContentBlocked,
      },
      { status: isContentBlocked ? 400 : 500 }
    );
  }
}
