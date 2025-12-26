import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateOutline,
  generateChapter,
  summarizeChapter,
  updateCharacterStates,
  generateCoverPrompt,
  generateCoverImage,
  generateIllustrationPrompts,
  generateChildrensIllustrationPrompts,
  generateCharacterVisualGuide,
  generateVisualStyleGuide,
} from '@/lib/gemini';
import { countWords } from '@/lib/epub';
import { BOOK_FORMATS, ART_STYLES, ILLUSTRATION_DIMENSIONS, type BookFormatKey, type ArtStyleKey } from '@/lib/constants';
import { sendEmail, getBookReadyEmail } from '@/lib/email';

// Timeout for illustration generation (30 seconds) - prevents 504 Gateway Timeout
const ILLUSTRATION_TIMEOUT_MS = 30000;

// Maximum retries for content-blocked illustrations
const MAX_ILLUSTRATION_RETRIES = 3;

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
      const dimensions = ILLUSTRATION_DIMENSIONS[formatKey] || ILLUSTRATION_DIMENSIONS.illustrated;

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: { chapters: true },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (book.paymentStatus !== 'completed') {
      return NextResponse.json({ error: 'Payment required' }, { status: 402 });
    }

    // Allow retry for failed books, resume for stuck generating books
    // Only block if truly completed
    if (book.status === 'completed') {
      return NextResponse.json({ error: 'Book already generated' }, { status: 400 });
    }

    // If resuming from failed, reset and clean up partial data
    if (book.status === 'failed') {
      console.log(`Retrying failed book generation for book ${id}`);

      // Delete any existing chapters and illustrations from failed attempt
      await prisma.illustration.deleteMany({ where: { bookId: id } });
      await prisma.chapter.deleteMany({ where: { bookId: id } });

      await prisma.book.update({
        where: { id },
        data: {
          status: 'generating',
          errorMessage: null,
          currentChapter: 0,
          totalWords: 0,
          storySoFar: null,
          characterStates: null,
        },
      });
    }

    // Start generation process
    await prisma.book.update({
      where: { id },
      data: { status: 'outlining' },
    });

    // Step 1: Generate outline if not exists
    let outline = book.outline as { chapters: Array<{
      number: number;
      title: string;
      summary: string;
      pov?: string;
      targetWords: number;
    }> } | null;

    if (!outline) {
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
    const bookFormat = book.bookFormat as BookFormatKey || 'text_only';
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

    // Step 2: Generate chapters
    let storySoFar = book.storySoFar || '';
    let characterStates = (book.characterStates as Record<string, object>) || {};
    let totalWords = book.totalWords || 0;

    const startChapter = book.currentChapter + 1;

    for (let i = startChapter; i <= outline.chapters.length; i++) {
      const chapterPlan = outline.chapters[i - 1];

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
      const emailContent = getBookReadyEmail(book.title, book.authorName, bookUrl);
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
    await prisma.book.update({
      where: { id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      { error: 'Failed to generate book' },
      { status: 500 }
    );
  }
}
