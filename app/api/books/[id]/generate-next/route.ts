import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateChapter,
  summarizeChapter,
  updateCharacterStates,
  generateCoverPrompt,
  generateCoverImage,
  type ContentRating,
} from '@/lib/gemini';
import { countWords } from '@/lib/epub';
import { sendEmail, getBookReadyEmail } from '@/lib/email';

// Allow up to 5 minutes for chapter generation (Vercel Pro plan max: 300s)
export const maxDuration = 300;

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

    // Fetch book with current state
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { number: 'asc' },
          select: { number: true },
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

    // Check if payment is complete
    if (book.paymentStatus !== 'completed') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
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
      totalChapters, // For adding "The End" on final chapter
    });

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
