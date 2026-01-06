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
  generateMetadataAndMarketing,
  checkOutlineConsistency,
  applyThematicPolish,
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
  detectSequenceLoop,
  flagExcessiveTics,
  validateSequenceContinuity,
} from '@/lib/screenplay';
import {
  runPostProcessingPipeline,
  extractCharacterInfo,
  type PostProcessingConfig,
} from '@/lib/generation/post-processing';
import { detectFormat, getFormatConfig } from '@/lib/generation/atomic/format-config';
import { runScreenplayPostProcessing } from '@/lib/generation/screenplay/post-processing';
import {
  detectFictionBannedPhrases,
  detectNonfictionClinicalPhrases,
} from '@/lib/generation/shared/writing-quality';
import { detectOnTheNoseDialogue } from '@/lib/generation/validators/narrative-validator';

// Maximum regeneration attempts for hard reject patterns
const MAX_REGENERATION_ATTEMPTS = 2;

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
          // Mark book as preview_complete so user can see their sample
          if (book.status !== 'preview_complete') {
            await prisma.book.update({
              where: { id },
              data: {
                status: 'preview_complete',
                completedAt: new Date(),
              },
            });
            console.log(`[Generate Next] Marked book ${id} as preview_complete (${chaptersGenerated} chapters)`);
          }

          return NextResponse.json({
            error: 'preview_limit',
            done: true,
            status: 'preview_complete',
            message: `Preview complete! You've generated ${chaptersGenerated} chapter(s). Upgrade to unlock the full book!`,
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

    // Extract any corrective instructions from previous consistency check
    // These are stored in characterStates under a special key to persist between API calls
    const correctiveInstructions = (characterStates as Record<string, unknown>).__correctiveInstructions as string | undefined;
    if (correctiveInstructions) {
      console.log(`[Consistency] Applying corrective instructions from previous check: ${correctiveInstructions.substring(0, 100)}...`);
      // Clear after reading (will be re-added if another consistency check runs)
      delete (characterStates as Record<string, unknown>).__correctiveInstructions;
    }

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
          // Mark book as preview_complete so user can see their sample
          if (book.status !== 'preview_complete') {
            await prisma.book.update({
              where: { id },
              data: {
                status: 'preview_complete',
                completedAt: new Date(),
              },
            });
            console.log(`[Generate Next] Marked screenplay ${id} as preview_complete (${screenplayContext.totalPagesGenerated} pages)`);
          }

          return NextResponse.json({
            error: 'preview_limit',
            done: true,
            status: 'preview_complete',
            message: `Preview complete! You've generated ${screenplayContext.totalPagesGenerated} pages. Upgrade to unlock the full screenplay!`,
            pagesGenerated: screenplayContext.totalPagesGenerated,
            limit,
            upgradeUrl: `/book/${id}?upgrade=true`,
          }, { status: 402 });
        }
      }

      // Filter subplots active in this sequence
      const activeSubplots = screenplayOutline.beatSheet.subplots?.filter(s =>
        s.intersectionPoints.includes(nextChapterNum)
      ) || [];

      // Track last DB update time to throttle writes for screenplay live preview
      let lastScreenplayPreviewUpdate = 0;
      const SCREENPLAY_PREVIEW_UPDATE_INTERVAL = 1500; // Update DB every 1.5 seconds max

      // Callback for live preview updates during screenplay streaming
      const onScreenplayProgress = async (accumulatedText: string) => {
        const now = Date.now();
        if (now - lastScreenplayPreviewUpdate > SCREENPLAY_PREVIEW_UPDATE_INTERVAL) {
          try {
            await prisma.book.update({
              where: { id },
              data: { livePreview: accumulatedText },
            });
            lastScreenplayPreviewUpdate = now;
          } catch (e) {
            // Ignore errors - live preview is non-critical
            console.log(`[LivePreview] Failed to update: ${(e as Error).message}`);
          }
        }
      };

      // Generate the next sequence with streaming for live preview
      let sequenceResult: { content: string; pageCount: number };
      try {
        sequenceResult = await generateScreenplaySequence({
          beatSheet: screenplayOutline.beatSheet,
          characters: screenplayOutline.characters,
          sequenceNumber: nextChapterNum,
          context: screenplayContext,
          genre: book.genre,
          title: book.title,
          activeSubplots, // Inject active subplots for this sequence
          onProgress: onScreenplayProgress, // Live preview streaming callback
        });
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

      // Loop detection - check if AI is rehashing previous sequences
      if (nextChapterNum > 1 && screenplayContext.sequenceSummaries.length > 0) {
        const loopAnalysis = detectSequenceLoop(
          sequenceContent,
          screenplayContext.sequenceSummaries
        );

        if (loopAnalysis.isLoop) {
          console.warn(`[LOOP DETECTED] Sequence ${nextChapterNum} - Score: ${loopAnalysis.score}. Beats: ${loopAnalysis.repeatedBeats.join(', ')}`);

          // Regenerate with corrective instructions by adding to context
          const correctiveContext: ScreenplayContext = {
            ...screenplayContext,
            lastSequenceSummary: `${screenplayContext.lastSequenceSummary}

CRITICAL ERROR DETECTED: Your previous attempt repeated beats from earlier sequences.
REPEATED BEATS: ${loopAnalysis.repeatedBeats.join('; ')}
DO NOT REWRITE THESE SCENES. THE STORY MUST MOVE FORWARD.
Pick up AFTER the last event and push toward the next beat sheet milestone.`,
          };

          try {
            const correctedResult = await generateScreenplaySequence({
              beatSheet: screenplayOutline.beatSheet,
              characters: screenplayOutline.characters,
              sequenceNumber: nextChapterNum,
              context: correctiveContext,
              genre: book.genre,
              title: book.title,
              activeSubplots,
              onProgress: onScreenplayProgress, // Continue streaming for corrective generation
            });

            // Re-check after corrective generation
            const secondCheck = detectSequenceLoop(
              correctedResult.content,
              screenplayContext.sequenceSummaries
            );

            if (secondCheck.isLoop) {
              console.error(`[LOOP PERSISTS] Sequence ${nextChapterNum} still looping after correction. Score: ${secondCheck.score}`);
              // Continue with original content but log the issue
            } else {
              sequenceContent = correctedResult.content;
              console.log(`[LOOP FIXED] Sequence ${nextChapterNum} corrective generation succeeded`);
            }
          } catch (correctionError) {
            console.error(`Failed to regenerate sequence ${nextChapterNum}:`, correctionError);
            // Continue with original content
          }
        }

        // Validate continuity patterns
        const continuityCheck = validateSequenceContinuity(sequenceContent, nextChapterNum);
        if (!continuityCheck.valid) {
          console.warn(`[CONTINUITY WARNING] Sequence ${nextChapterNum}: ${continuityCheck.issues.join(', ')}`);
        }
      }

      // === HARD REJECT LOOP (Code Fortress) ===
      // Run post-processing pipeline with hard reject detection
      // If patterns are too egregious, regenerate with surgical prompt
      let regenerationAttempts = 0;
      let needsPolish = false;

      while (regenerationAttempts < MAX_REGENERATION_ATTEMPTS) {
        const postProcessed = runScreenplayPostProcessing(
          sequenceContent,
          screenplayContext,
          nextChapterNum,
          screenplayContext.sequenceSummaries
        );

        if (postProcessed.hardReject) {
          console.warn(`[HARD REJECT] Sequence ${nextChapterNum} (attempt ${regenerationAttempts + 1}): ${postProcessed.report.clinicalFound.length} clinical, ${postProcessed.report.onTheNoseFound.length} on-the-nose`);

          try {
            const regeneratedResult = await generateScreenplaySequence({
              beatSheet: screenplayOutline.beatSheet,
              characters: screenplayOutline.characters,
              sequenceNumber: nextChapterNum,
              context: {
                ...screenplayContext,
                lastSequenceSummary: `${screenplayContext.lastSequenceSummary}

${postProcessed.surgicalPrompt}`,
              },
              genre: book.genre,
              title: book.title,
              activeSubplots,
              onProgress: onScreenplayProgress, // Continue streaming for hard reject regeneration
            });

            sequenceContent = regeneratedResult.content;
            regenerationAttempts++;
            continue; // Check again
          } catch (regenError) {
            console.error(`[HARD REJECT] Regeneration failed:`, regenError);
            needsPolish = true;
            break; // Accept with flag
          }
        }

        // Accept the processed content
        sequenceContent = postProcessed.content;
        screenplayContext = postProcessed.updatedContext;

        // Log post-processing report
        console.log(`[POST-PROCESS] Sequence ${nextChapterNum}: Variance=${postProcessed.report.varianceScore.toFixed(1)}, Sentences combined=${postProcessed.report.sentencesCombined}, Tics removed=${postProcessed.report.ticsRemoved.length}`);

        break; // Success
      }

      if (regenerationAttempts >= MAX_REGENERATION_ATTEMPTS) {
        console.warn(`[HARD REJECT] Sequence ${nextChapterNum} exceeded max regeneration attempts, flagging for polish`);
        needsPolish = true;
      }
      // === END HARD REJECT LOOP ===

      // Flag excessive tics (last line of defense - legacy check)
      const ticCheck = flagExcessiveTics(sequenceContent);
      if (ticCheck.warnings.length > 0) {
        console.warn(`[TIC WARNING] Sequence ${nextChapterNum}: ${ticCheck.warnings.join(', ')}`);
      }

      // Review and polish - ALWAYS runs (ruthless pacing editor)
      try {
        sequenceContent = await reviewScreenplaySequence(
          sequenceContent,
          screenplayOutline.characters,
          nextChapterNum
        );
        console.log(`Sequence ${nextChapterNum} polished by script doctor`);
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

      // Save sequence as a chapter (use upsert to handle retries gracefully)
      const wordCount = countWords(sequenceContent);
      totalWords += wordCount;

      const savedChapter = await prisma.chapter.upsert({
        where: {
          bookId_number: {
            bookId: id,
            number: nextChapterNum,
          },
        },
        update: {
          title: chapterPlan.title,
          content: sequenceContent,
          summary: screenplayContext.lastSequenceSummary,
          wordCount,
        },
        create: {
          bookId: id,
          number: nextChapterNum,
          title: chapterPlan.title,
          content: sequenceContent,
          summary: screenplayContext.lastSequenceSummary,
          wordCount,
        },
      });
      console.log(`Sequence ${nextChapterNum} saved. Page count: ~${pageCount}`);

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
    // Generate chapter content with streaming for live preview
    let chapterContent: string;

    // Track last DB update time to throttle writes
    let lastLivePreviewUpdate = 0;
    const LIVE_PREVIEW_UPDATE_INTERVAL = 1500; // Update DB every 1.5 seconds max

    // Callback for live preview updates during streaming
    const onProgress = async (accumulatedText: string) => {
      const now = Date.now();
      if (now - lastLivePreviewUpdate > LIVE_PREVIEW_UPDATE_INTERVAL) {
        try {
          await prisma.book.update({
            where: { id },
            data: { livePreview: accumulatedText },
          });
          lastLivePreviewUpdate = now;
        } catch (e) {
          // Ignore errors - live preview is non-critical
          console.log(`[LivePreview] Failed to update: ${(e as Error).message}`);
        }
      }
    };

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
          correctiveInstructions, // From consistency check - steering to fix narrative drift
          onProgress, // Live preview streaming callback
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

    // === HARD REJECT CHECK FOR PROSE (Code Fortress) ===
    // Check for egregious patterns that require regeneration
    let proseNeedsPolish = false;
    let proseRegenerationAttempts = 0;

    while (proseRegenerationAttempts < MAX_REGENERATION_ATTEMPTS) {
      const hardRejectReasons: string[] = [];
      const surgicalFixes: string[] = [];

      // Check based on book type
      if (book.bookType === 'non-fiction') {
        // Non-fiction: Check for clinical/academic phrases
        const clinicalCheck = detectNonfictionClinicalPhrases(chapterContent);
        if (clinicalCheck.severity === 'hard_reject') {
          hardRejectReasons.push(`Clinical phrases: ${clinicalCheck.patterns.slice(0, 3).join(', ')}`);
          surgicalFixes.push(
            `CRITICAL FIX: Your writing sounds like an AI textbook. Remove all clinical phrases like "${clinicalCheck.patterns[0]}". Write like a human expert explaining to a friend, not an academic paper.`
          );
        }
      } else {
        // Fiction: Check for banned phrases and on-the-nose dialogue
        const bannedCheck = detectFictionBannedPhrases(chapterContent);
        if (bannedCheck.patterns.length >= 3) {
          hardRejectReasons.push(`Banned AI phrases: ${bannedCheck.patterns.slice(0, 3).join(', ')}`);
          surgicalFixes.push(
            `CRITICAL FIX: Remove all clichéd AI phrases like "${bannedCheck.patterns[0]}". Use fresh, specific language that fits your characters.`
          );
        }

        const onTheNoseCheck = detectOnTheNoseDialogue(chapterContent);
        if (onTheNoseCheck.severity === 'hard_reject') {
          hardRejectReasons.push(`On-the-nose dialogue: ${onTheNoseCheck.patterns.slice(0, 2).map(p => p.match).join(', ')}`);
          surgicalFixes.push(
            `CRITICAL FIX: Characters must NEVER state their feelings directly ("I feel angry", "I'm scared"). Show emotion through ACTIONS and BEHAVIOR, not declarations.`
          );
        }
      }

      // If hard reject triggered, regenerate
      if (hardRejectReasons.length > 0) {
        console.warn(`[HARD REJECT] Chapter ${nextChapterNum} (attempt ${proseRegenerationAttempts + 1}): ${hardRejectReasons.join('; ')}`);

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
              chapterKeyPoints: chapterPlan.keyPoints,
              contentRating: (book.contentRating || 'general') as ContentRating,
              totalChapters,
              correctiveInstructions: surgicalFixes.join('\n\n'),
            }),
            CHAPTER_TIMEOUT_MS,
            `Chapter ${nextChapterNum} hard reject regeneration`
          );

          proseRegenerationAttempts++;
          continue; // Check again
        } catch (regenError) {
          console.error(`[HARD REJECT] Regeneration failed:`, regenError);
          proseNeedsPolish = true;
          break; // Accept with flag
        }
      }

      // No hard reject issues, continue
      break;
    }

    if (proseRegenerationAttempts >= MAX_REGENERATION_ATTEMPTS) {
      console.warn(`[HARD REJECT] Chapter ${nextChapterNum} exceeded max regeneration attempts, flagging for polish`);
      proseNeedsPolish = true;
    }
    // === END HARD REJECT CHECK ===

    // === POST-PROCESSING PIPELINE (Layer 2) ===
    // Pure code-based fixes: name→pronoun, sentence variety, burstiness, dialogue polish
    // Zero extra AI tokens - all via regex and algorithms
    try {
      const format = detectFormat(book.bookType);

      console.log(`[PostProcessing] Running pipeline for chapter ${nextChapterNum} (format: ${format})`);

      // Run the pipeline - it uses default config based on format
      const pipelineResult = await runPostProcessingPipeline(
        chapterContent,
        characters, // Pass raw character data, pipeline extracts info
        { format }  // Format determines all config defaults
      );

      // Use processed content
      chapterContent = pipelineResult.content;

      // Log improvements
      const { metrics } = pipelineResult;
      if (metrics.totalChanges > 0) {
        console.log(`[PostProcessing] Chapter ${nextChapterNum}: ${metrics.totalChanges} changes made in ${metrics.processingTimeMs}ms`);
        if (metrics.nameFrequency) {
          console.log(`[PostProcessing] Names: ${metrics.nameFrequency.originalNameCount} → ${metrics.nameFrequency.finalNameCount} (${metrics.nameFrequency.namesReplaced} replaced with pronouns)`);
        }
        if (metrics.burstiness) {
          console.log(`[PostProcessing] Burstiness: ${metrics.burstiness.originalScore.toFixed(2)} → ${metrics.burstiness.finalScore.toFixed(2)}`);
        }
        if (metrics.dialoguePolish) {
          console.log(`[PostProcessing] Dialogue: ${metrics.dialoguePolish.fancyTagsReplaced} fancy tags fixed, ${metrics.dialoguePolish.adverbsConverted} adverbs converted`);
        }
      } else {
        console.log(`[PostProcessing] Chapter ${nextChapterNum}: No changes needed (${metrics.processingTimeMs}ms)`);
      }
    } catch (postProcessError) {
      // Post-processing is an enhancement, not critical - continue with original content
      console.error(`[PostProcessing] Failed for chapter ${nextChapterNum} (using original):`, postProcessError);
    }
    // === END POST-PROCESSING ===

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

    // Run consistency check every 5 chapters to prevent narrative drift
    // This runs in parallel with other operations and stores corrective instructions
    if (nextChapterNum % 5 === 0 && nextChapterNum < totalChapters) {
      try {
        console.log(`[Consistency] Running outline consistency check at chapter ${nextChapterNum}`);
        const consistencyResult = await checkOutlineConsistency({
          title: book.title,
          originalPlan: {
            premise: book.premise || '',
            beginning: (outline.chapters[0] as { summary?: string })?.summary || '',
            middle: (outline.chapters[Math.floor(totalChapters / 2)] as { summary?: string })?.summary || '',
            ending: (outline.chapters[totalChapters - 1] as { summary?: string })?.summary || '',
            characters: characters,
          },
          storySoFar,
          characterStates: characterStates as Record<string, { lastSeen: string; currentState: string }>,
          currentChapter: nextChapterNum,
          totalChapters,
        });

        // Log the drift analysis and corrective instructions
        console.log(`[Consistency] Drift analysis: ${consistencyResult.driftAnalysis.substring(0, 200)}...`);
        if (consistencyResult.correctiveInstructions) {
          console.log(`[Consistency] Corrective instructions: ${consistencyResult.correctiveInstructions.substring(0, 200)}...`);
          // Store corrective instructions in characterStates for the NEXT chapter to use
          // This persists between API calls via the database
          (characterStates as Record<string, unknown>).__correctiveInstructions = consistencyResult.correctiveInstructions;
        }
      } catch (consistencyError) {
        console.error(`[Consistency] Check failed (non-blocking):`, consistencyError);
        // Continue without consistency check - it's an enhancement, not critical
      }
    }

    // Apply thematic polish to the final chapter for satisfying conclusion
    const isLastChapter = nextChapterNum >= totalChapters;
    if (isLastChapter) {
      try {
        console.log(`[ThematicPolish] Applying final chapter polish...`);
        // Get first chapter summary for bookend effect
        const firstChapter = await prisma.chapter.findFirst({
          where: { bookId: id, number: 1 },
          select: { summary: true },
        });

        const polishResult = await applyThematicPolish({
          title: book.title,
          genre: book.genre,
          bookType: book.bookType,
          originalPlan: {
            premise: book.premise || '',
            beginning: (outline.chapters[0] as { summary?: string })?.summary || '',
            ending: (outline.chapters[totalChapters - 1] as { summary?: string })?.summary || '',
            characters: characters,
          },
          firstChapterSummary: firstChapter?.summary || 'The story begins...',
          finalChapterContent: chapterContent,
          characterArcs: characterStates as Record<string, { startState: string; endState: string }>,
        });

        // Use polished content if available
        if (polishResult.polishedContent && polishResult.polishedContent.length > chapterContent.length * 0.5) {
          chapterContent = polishResult.polishedContent;
          console.log(`[ThematicPolish] Applied: ${polishResult.thematicNotes.substring(0, 150)}...`);
        }
      } catch (polishError) {
        console.error(`[ThematicPolish] Failed (using original):`, polishError);
        // Continue with original content - polish is enhancement, not critical
      }
    }

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

    // Save chapter (use upsert to handle retries gracefully)
    const savedChapter = await prisma.chapter.upsert({
      where: {
        bookId_number: {
          bookId: id,
          number: nextChapterNum,
        },
      },
      update: {
        title: chapterPlan.title,
        content: chapterContent,
        summary,
        wordCount,
      },
      create: {
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

    // Update book progress and clear live preview
    await prisma.book.update({
      where: { id },
      data: {
        currentChapter: nextChapterNum,
        totalChapters,
        totalWords,
        storySoFar,
        characterStates,
        livePreview: null, // Clear live preview after chapter complete
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
  bookType: string;
  bookFormat: string;
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
        bookType: book.bookType,
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

  // Generate marketing metadata (back cover copy, logline, keywords)
  try {
    // Get all chapter summaries for context
    const chapters = await prisma.chapter.findMany({
      where: { bookId: id },
      orderBy: { number: 'asc' },
      select: { summary: true },
    });
    const chapterSummaries = chapters.map(c => c.summary).join('\n\n');

    const metadata = await generateMetadataAndMarketing({
      title: book.title,
      genre: book.genre,
      bookType: book.bookType,
      bookFormat: book.bookFormat, // Pass format for screenplay-specific prompts
      authorName: book.authorName,
      chapterSummaries,
      originalIdea: book.premise,
    });

    // Save metadata with default setting to include in PDF
    await prisma.book.update({
      where: { id },
      data: {
        metadata: {
          ...metadata,
          includeBackCoverInPdf: true, // Default: checked
        },
      },
    });
    console.log(`[Metadata] Generated marketing metadata for book ${id}`);
  } catch (metadataError) {
    console.error('Failed to generate marketing metadata:', metadataError);
    // Continue - metadata is optional enhancement
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
