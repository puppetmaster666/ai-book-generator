import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateChapter,
  summarizeChapter,
  updateCharacterStates,
  generateCoverPrompt,
  generateCoverImage,
  generateScreenplaySequence,
  summarizeScreenplaySequence,
  reviewScreenplaySequence,
  type ContentRating,
} from '@/lib/gemini';
import { countWords } from '@/lib/epub';
import { sendEmail, getBookReadyEmail } from '@/lib/email';
import { FREE_TIER_LIMITS } from '@/lib/constants';
import {
  type BeatSheet,
  type CharacterProfile,
  type ScreenplayContext,
  estimatePageCount,
  createInitialContext,
} from '@/lib/screenplay';

// Allow up to 5 minutes for chapter generation (Vercel Pro plan max: 300s)
export const maxDuration = 300;

// Chapter generation timeout (4 minutes - leave 1 minute buffer for cleanup)
// This ensures we can gracefully handle failures before Vercel kills the function
const CHAPTER_TIMEOUT_MS = 240000;

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

/**
 * Generate the next chapter of a book.
 * This endpoint generates ONE chapter at a time to avoid Vercel timeout limits.
 * The client should call this repeatedly until all chapters are generated.
 *
 * Returns:
 * - { done: false, currentChapter, totalChapters } - more chapters to generate
 * - { done: true, book } - book is complete
 * - { error: string } - generation failed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Extract id outside try-catch so it's available in error handler
  const { id } = await params;

  try {

    // Fetch book with current state and user info
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { number: 'asc' },
          select: { number: true },
        },
        user: {
          select: { plan: true },
        },
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check if book is already complete
    if (book.status === 'completed') {
      return NextResponse.json({
        done: true,
        message: 'Book is already complete',
        currentChapter: book.currentChapter,
        totalChapters: book.totalChapters,
      });
    }

    // Check payment status and free tier limits
    const isPaid = book.paymentStatus === 'completed';
    const hasSubscription = book.user?.plan === 'monthly';
    const canGenerate = isPaid || hasSubscription;

    if (!canGenerate) {
      // Check free tier limits for unpaid users
      const bookFormat = book.bookFormat || 'text_only';
      const formatKey = bookFormat as keyof typeof FREE_TIER_LIMITS;
      const limit = FREE_TIER_LIMITS[formatKey] || FREE_TIER_LIMITS.text_only;

      // For text books, limit is number of chapters
      if ('chapters' in limit) {
        const chaptersGenerated = book.chapters.length;
        if (chaptersGenerated >= limit.chapters) {
          return NextResponse.json({
            error: 'preview_limit',
            message: `Preview limit reached. You've generated ${chaptersGenerated} chapter(s). Upgrade to unlock the full book!`,
            chaptersGenerated,
            limit: limit.chapters,
            upgradeUrl: `/book/${id}?upgrade=true`,
          }, { status: 402 });
        }
      }
      // For screenplays, limit is number of pages (handled separately)
    }

    const outline = book.outline as {
      chapters: Array<{
        number: number;
        title: string;
        summary: string;
        pov?: string;
        targetWords: number;
      }>;
    } | null;

    // If no outline, need to call the main generate endpoint first
    if (!outline || !outline.chapters || outline.chapters.length === 0) {
      return NextResponse.json({
        error: 'No outline found. Call /api/books/[id]/generate first to create the outline.',
        needsOutline: true,
      }, { status: 400 });
    }

    const totalChapters = outline.chapters.length;

    // Get the actual next chapter to generate based on what chapters exist
    const existingChapterNumbers = new Set(book.chapters.map(c => c.number));
    let nextChapterNum = book.currentChapter + 1;

    // Skip over any chapters that already exist (race condition protection)
    while (nextChapterNum <= totalChapters && existingChapterNumbers.has(nextChapterNum)) {
      console.log(`Chapter ${nextChapterNum} already exists, skipping to next`);
      nextChapterNum++;
    }

    // Check if all chapters are done
    if (nextChapterNum > totalChapters) {
      // All chapters complete - finalize book
      return await finalizeBook(id, book);
    }

    // Double-check this specific chapter doesn't exist (another race condition check)
    const chapterExists = await prisma.chapter.findUnique({
      where: {
        bookId_number: {
          bookId: id,
          number: nextChapterNum,
        },
      },
      select: { id: true },
    });

    if (chapterExists) {
      console.log(`Chapter ${nextChapterNum} was created by another request, skipping`);
      // Update book progress and return
      await prisma.book.update({
        where: { id },
        data: { currentChapter: nextChapterNum },
      });

      // If we skipped, we need to verify if we should jump to the next one or if we're done
      // But adhering to the protocol, we return status so client can request next
      return NextResponse.json({
        done: false,
        currentChapter: nextChapterNum,
        totalChapters,
        totalWords: book.totalWords,
        message: `Chapter ${nextChapterNum} already exists. Continuing...`,
        skipped: true,
      });
    }

    // Always update timestamp before starting chapter generation
    // This serves as a "heartbeat" so stale detection knows we're actively working
    await prisma.book.update({
      where: { id },
      data: {
        status: 'generating',
        generationStartedAt: book.generationStartedAt || new Date(),
        // updatedAt is automatically set by Prisma
      },
    });

    const chapterPlan = outline.chapters[nextChapterNum - 1] as {
      number: number;
      title: string;
      summary: string;
      pov?: string;
      targetWords: number;
      keyPoints?: string[]; // For non-fiction chapters
    };
    const characters = (book.characters as Array<{ name: string; description: string }>) || [];

    // Get current story state
    let storySoFar = book.storySoFar || '';
    let characterStates = (book.characterStates as Record<string, object>) || {};
    let totalWords = book.totalWords || 0;

    console.log(`Generating chapter ${nextChapterNum}/${totalChapters} for book ${id}`);

    // SCREENPLAY GENERATION FLOW
    if (book.bookFormat === 'screenplay') {
      console.log(`Generating screenplay sequence ${nextChapterNum}/8 for book ${id}`);

      // Get outline with beat sheet and characters
      const screenplayOutline = outline as {
        chapters: Array<{ number: number; title: string; summary: string; targetWords: number }>;
        beatSheet?: BeatSheet;
        characters?: CharacterProfile[];
      };

      if (!screenplayOutline.beatSheet || !screenplayOutline.characters) {
        return NextResponse.json({
          error: 'Screenplay missing beat sheet or characters. Regenerate the outline.',
          needsOutline: true,
        }, { status: 400 });
      }

      // Get or initialize screenplay context
      let screenplayContext = (book.screenplayContext as unknown as ScreenplayContext) || createInitialContext(100);

      // Check free tier limit for screenplays (5 pages)
      if (!canGenerate) {
        const limit = FREE_TIER_LIMITS.screenplay.pages;
        if (screenplayContext.totalPagesGenerated >= limit) {
          return NextResponse.json({
            error: 'preview_limit',
            message: `Preview limit reached. You've generated ${screenplayContext.totalPagesGenerated} pages. Upgrade to unlock the full screenplay!`,
            pagesGenerated: screenplayContext.totalPagesGenerated,
            limit,
            upgradeUrl: `/book/${id}?upgrade=true`,
          }, { status: 402 });
        }
      }

      // Generate the next sequence with timeout to prevent stale books
      let sequenceResult: { content: string; pageCount: number };
      try {
        sequenceResult = await withTimeout(
          generateScreenplaySequence({
            beatSheet: screenplayOutline.beatSheet,
            characters: screenplayOutline.characters,
            sequenceNumber: nextChapterNum,
            context: screenplayContext,
            genre: book.genre,
            title: book.title,
          }),
          CHAPTER_TIMEOUT_MS,
          `Sequence ${nextChapterNum} generation`
        );
      } catch (timeoutError) {
        console.error(`Sequence ${nextChapterNum} generation timed out:`, timeoutError);
        // Create emergency placeholder sequence
        sequenceResult = {
          content: `SEQUENCE ${nextChapterNum}

[This sequence is being regenerated. Please refresh in a moment.]`,
          pageCount: 1,
        };
        console.log(`Created placeholder for sequence ${nextChapterNum} due to timeout`);
      }

      let sequenceContent = sequenceResult.content;
      const pageCount = sequenceResult.pageCount;

      // Review and polish for AI patterns
      try {
        sequenceContent = await reviewScreenplaySequence(
          sequenceContent,
          screenplayOutline.characters
        );
        console.log(`Sequence ${nextChapterNum} reviewed for AI patterns`);
      } catch (reviewError) {
        console.error(`Failed to review sequence ${nextChapterNum}:`, reviewError);
        // Continue with unreviewed content
      }

      // Summarize the sequence for context continuity
      let sequenceSummary;
      try {
        sequenceSummary = await summarizeScreenplaySequence({
          sequenceContent,
          sequenceNumber: nextChapterNum,
          characters: screenplayOutline.characters,
        });

        // Update context
        screenplayContext.currentSequence = nextChapterNum + 1;
        screenplayContext.totalPagesGenerated += pageCount;
        screenplayContext.lastSequenceSummary = sequenceSummary.summary;
        screenplayContext.characterStates = {
          ...screenplayContext.characterStates,
          ...sequenceSummary.characterStates,
        };
        screenplayContext.plantedSetups = [
          ...screenplayContext.plantedSetups,
          ...sequenceSummary.plantedSetups,
        ];
        screenplayContext.resolvedPayoffs = [
          ...screenplayContext.resolvedPayoffs,
          ...sequenceSummary.resolvedPayoffs,
        ];
        screenplayContext.sequenceSummaries.push(sequenceSummary);
      } catch (summaryError) {
        console.error(`Failed to summarize sequence ${nextChapterNum}:`, summaryError);
        // Use simple fallback
        screenplayContext.currentSequence = nextChapterNum + 1;
        screenplayContext.totalPagesGenerated += pageCount;
        screenplayContext.lastSequenceSummary = `Sequence ${nextChapterNum} completed.`;
      }

      // Verify book still exists
      const bookStillExists = await prisma.book.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!bookStillExists) {
        console.log(`Book ${id} was deleted during generation, aborting`);
        return NextResponse.json({
          error: 'Book was deleted during generation',
          aborted: true,
        }, { status: 404 });
      }

      // Save sequence as a chapter
      const wordCount = countWords(sequenceContent);
      totalWords += wordCount;

      let savedChapter;
      try {
        savedChapter = await prisma.chapter.create({
          data: {
            bookId: id,
            number: nextChapterNum,
            title: chapterPlan.title,
            content: sequenceContent,
            summary: screenplayContext.lastSequenceSummary,
            wordCount,
          },
        });
        console.log(`Sequence ${nextChapterNum} saved. Page count: ~${pageCount}`);
      } catch (createError: unknown) {
        if (createError && typeof createError === 'object' && 'code' in createError && createError.code === 'P2002') {
          console.log(`Sequence ${nextChapterNum} already exists (race condition), skipping save`);
          await prisma.book.update({
            where: { id },
            data: { currentChapter: nextChapterNum },
          });
          return NextResponse.json({
            done: false,
            currentChapter: nextChapterNum,
            totalChapters,
            totalWords: book.totalWords,
            message: `Sequence ${nextChapterNum} already exists. Continuing...`,
            skipped: true,
          });
        }
        throw createError;
      }

      // Update book progress with screenplay context
      await prisma.book.update({
        where: { id },
        data: {
          currentChapter: nextChapterNum,
          totalChapters,
          totalWords,
          screenplayContext: screenplayContext as object,
          errorMessage: null,
        },
      });

      // Check if this was the last sequence
      if (nextChapterNum >= totalChapters) {
        return await finalizeBook(id, book);
      }

      // More sequences to generate
      return NextResponse.json({
        done: false,
        currentChapter: nextChapterNum,
        totalChapters,
        totalWords,
        pagesGenerated: screenplayContext.totalPagesGenerated,
        message: `Sequence ${nextChapterNum} complete (~${pageCount} pages). ${totalChapters - nextChapterNum} remaining.`,
      });
    }

    // STANDARD CHAPTER GENERATION FLOW
    // Generate chapter content with timeout to prevent stale books
    let chapterContent: string;
    try {
      chapterContent = await withTimeout(
        generateChapter({
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
          totalChapters, // For adding "The End" on final chapter
        }),
        CHAPTER_TIMEOUT_MS,
        `Chapter ${nextChapterNum} generation`
      );
    } catch (timeoutError) {
      console.error(`Chapter ${nextChapterNum} generation timed out:`, timeoutError);
      // Generate emergency placeholder to keep the book moving
      chapterContent = `Chapter ${nextChapterNum}: ${chapterPlan.title}

${chapterPlan.summary}

[This chapter is being regenerated. Please refresh in a moment.]`;
      console.log(`Created placeholder for chapter ${nextChapterNum} due to timeout`);
    }

    const wordCount = countWords(chapterContent);
    totalWords += wordCount;

    // Run summary and character state updates in PARALLEL with Flash Light (fast!)
    // Both now have smart fallbacks if they timeout
    const [summaryResult, characterStatesResult] = await Promise.allSettled([
      summarizeChapter(chapterContent),
      updateCharacterStates(characterStates, chapterContent, nextChapterNum),
    ]);

    // Extract summary with fallback (now uses smart extraction if AI times out)
    const summary = summaryResult.status === 'fulfilled'
      ? summaryResult.value
      : chapterContent.substring(0, 500) + '...'; // Final fallback

    // Extract character states with fallback
    if (characterStatesResult.status === 'fulfilled') {
      characterStates = characterStatesResult.value;
    } else {
      console.error(`Failed to update character states for chapter ${nextChapterNum}:`, characterStatesResult.reason);
      // Keep existing characterStates
    }

    // Update story so far
    storySoFar += `\n\nChapter ${nextChapterNum}: ${chapterPlan.title}\n${summary}`;

    // Verify book still exists before saving (user may have deleted it)
    const bookStillExists = await prisma.book.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!bookStillExists) {
      console.log(`Book ${id} was deleted during generation, aborting`);
      return NextResponse.json({
        error: 'Book was deleted during generation',
        aborted: true,
      }, { status: 404 });
    }

    // Save chapter
    let savedChapter;
    try {
      savedChapter = await prisma.chapter.create({
        data: {
          bookId: id,
          number: nextChapterNum,
          title: chapterPlan.title,
          content: chapterContent,
          summary,
          wordCount,
        },
      });
      console.log(`Chapter ${nextChapterNum} saved. Word count: ${wordCount}`);

      // Fire off async review ONLY for text-heavy books (novels, non-fiction)
      // Skip review for visual books (illustrated, picture_book, comic) - their text is minimal
      const isTextHeavyBook = book.bookFormat === 'text_only' || !book.bookFormat;
      if (isTextHeavyBook) {
        const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/books/${id}/review-chapter`;
        fetch(reviewUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterId: savedChapter.id }),
        }).catch(err => console.log(`[Review] Background review request failed for chapter ${nextChapterNum}:`, err.message));
      } else {
        console.log(`[Review] Skipping review for visual book format: ${book.bookFormat}`);
      }

    } catch (createError: unknown) {
      // Handle unique constraint violation - chapter already exists (race condition)
      if (createError && typeof createError === 'object' && 'code' in createError && createError.code === 'P2002') {
        console.log(`Chapter ${nextChapterNum} already exists (race condition), skipping save`);
        // Update progress and continue
        await prisma.book.update({
          where: { id },
          data: { currentChapter: nextChapterNum },
        });
        return NextResponse.json({
          done: false,
          currentChapter: nextChapterNum,
          totalChapters,
          totalWords: book.totalWords,
          message: `Chapter ${nextChapterNum} already exists. Continuing...`,
          skipped: true,
        });
      }
      throw createError;
    }

    // Update book progress
    await prisma.book.update({
      where: { id },
      data: {
        currentChapter: nextChapterNum,
        totalChapters,
        totalWords,
        storySoFar,
        characterStates,
        errorMessage: null, // Clear any previous error
      },
    });

    // Check if this was the last chapter
    if (nextChapterNum >= totalChapters) {
      return await finalizeBook(id, book);
    }

    // More chapters to generate
    return NextResponse.json({
      done: false,
      currentChapter: nextChapterNum,
      totalChapters,
      totalWords,
      message: `Chapter ${nextChapterNum} complete. ${totalChapters - nextChapterNum} remaining.`,
    });

  } catch (error) {
    console.error('Error generating next chapter:', error);

    // Try to update book with error status (may fail if book was deleted)
    try {
      await prisma.book.update({
        where: { id },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (updateError) {
      // Book may have been deleted, log and continue
      console.error('Failed to update book status (book may have been deleted):', updateError);
    }

    return NextResponse.json(
      { error: 'Failed to generate chapter', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Finalize a completed book - generate cover and send email
 */
async function finalizeBook(id: string, book: {
  title: string;
  genre: string;
  authorName: string;
  premise: string;
  characters: unknown;
  email: string | null;
  userId: string | null;
  coverImageUrl: string | null;
}) {
  console.log(`All chapters complete for book ${id}. Finalizing...`);

  // Generate cover if not already done
  if (!book.coverImageUrl) {
    try {
      const coverPrompt = await generateCoverPrompt({
        title: book.title,
        genre: book.genre,
        bookType: 'novel', // Default for text books
        premise: book.premise,
        authorName: book.authorName,
      });

      const coverImageUrl = await generateCoverImage(coverPrompt);

      if (coverImageUrl) {
        await prisma.book.update({
          where: { id },
          data: {
            coverImageUrl,
            coverPrompt,
          },
        });
      }
    } catch (coverError) {
      console.error('Failed to generate cover:', coverError);
      // Continue without cover - not critical
    }
  }

  // Mark as completed
  await prisma.book.update({
    where: { id },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  // Send completion email
  const email = book.email || (book.userId ? await getUserEmail(book.userId) : null);
  if (email) {
    try {
      const bookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.draftmybook.com'}/book/${id}`;
      const emailContent = getBookReadyEmail(book.title, book.authorName, bookUrl);
      await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    } catch (emailError) {
      console.error('Failed to send completion email:', emailError);
    }
  }

  return NextResponse.json({
    done: true,
    message: 'Book generation complete!',
    currentChapter: book.userId ? undefined : 0, // Don't expose internal state
    totalChapters: book.userId ? undefined : 0,
  });
}

async function getUserEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email || null;
}
