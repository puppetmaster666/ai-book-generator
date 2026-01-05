import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { streamContent, getGeminiPro, markKeyAsWorking, switchToLastWorkingKey } from '@/lib/generation/shared/api-client';
import {
  ContentRating,
  getContentRatingInstructions,
  getDynamicWritingInstructions,
  getRollingContext,
  detectLanguageInstruction,
} from '@/lib/generation/shared/writing-quality';
import { countWords } from '@/lib/epub';

// Allow up to 5 minutes for streaming
export const maxDuration = 300;

// Helper to send SSE events
function sendEvent(controller: ReadableStreamDefaultController, event: string, data: unknown) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}

/**
 * Stream chapter generation via Server-Sent Events.
 * This endpoint streams the AI-generated text in real-time as it's being written.
 *
 * Events emitted:
 * - start: { chapterNum, chapterTitle } - Generation started
 * - chunk: { text, wordCount } - Text chunk received
 * - complete: { chapterNum, wordCount, success } - Generation complete
 * - error: { message } - Error occurred
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Fetch book with current state
        const book = await prisma.book.findUnique({
          where: { id },
          include: {
            chapters: {
              orderBy: { number: 'asc' },
              select: { number: true, content: true, wordCount: true },
            },
            user: {
              select: { plan: true },
            },
          },
        });

        if (!book) {
          sendEvent(controller, 'error', { message: 'Book not found' });
          controller.close();
          return;
        }

        // Check if already complete
        if (book.status === 'completed') {
          sendEvent(controller, 'complete', {
            chapterNum: book.currentChapter,
            wordCount: book.totalWords,
            success: true,
            message: 'Book already complete'
          });
          controller.close();
          return;
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

        if (!outline || !outline.chapters || outline.chapters.length === 0) {
          sendEvent(controller, 'error', { message: 'No outline found' });
          controller.close();
          return;
        }

        const totalChapters = outline.chapters.length;
        const existingChapterNumbers = new Set(book.chapters.map(c => c.number));
        let nextChapterNum = book.currentChapter + 1;

        // Skip existing chapters
        while (nextChapterNum <= totalChapters && existingChapterNumbers.has(nextChapterNum)) {
          nextChapterNum++;
        }

        if (nextChapterNum > totalChapters) {
          sendEvent(controller, 'complete', {
            chapterNum: totalChapters,
            wordCount: book.totalWords,
            success: true,
            message: 'All chapters complete'
          });
          controller.close();
          return;
        }

        const chapterPlan = outline.chapters[nextChapterNum - 1];
        const isLastChapter = nextChapterNum === totalChapters;

        // Send start event
        sendEvent(controller, 'start', {
          chapterNum: nextChapterNum,
          chapterTitle: chapterPlan.title,
          totalChapters,
        });

        // Update book status
        await prisma.book.update({
          where: { id },
          data: {
            status: 'generating',
            generationStartedAt: book.generationStartedAt || new Date(),
          },
        });

        // Build the prompt
        const characters = (book.characters as Array<{ name: string; description: string }>) || [];
        let storySoFar = book.storySoFar || '';
        const contentRating = (book.contentRating as ContentRating) || 'general';
        // Get rolling context from story summary
        const rollingContext = getRollingContext(storySoFar);

        const languageInstruction = detectLanguageInstruction(book.premise || book.title);
        const writingInstructions = getDynamicWritingInstructions(book.genre, book.bookType);
        const ratingInstructions = getContentRatingInstructions(contentRating);

        const prompt = `You are a bestselling fiction author writing Chapter ${nextChapterNum} of "${book.title}".

Genre: ${book.genre}
Author Voice: ${book.authorName}
${languageInstruction}
${ratingInstructions}

STORY PREMISE:
${book.premise || 'A compelling story'}

CHARACTERS:
${characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

CHAPTER PLAN:
Title: ${chapterPlan.title}
Summary: ${chapterPlan.summary}
${chapterPlan.pov ? `POV: ${chapterPlan.pov}` : ''}
Target Words: ${chapterPlan.targetWords}

${storySoFar ? `STORY SUMMARY SO FAR:\n${storySoFar}\n` : ''}

${rollingContext ? `RECENT CHAPTER CONTENT (for continuity):\n${rollingContext}\n` : ''}

${writingInstructions}

${isLastChapter ? 'This is the FINAL CHAPTER. Bring all plot threads to a satisfying conclusion. End with "The End".' : ''}

Write Chapter ${nextChapterNum}: ${chapterPlan.title}

Begin with the chapter heading "Chapter ${nextChapterNum}: ${chapterPlan.title}" then write the full chapter content.`;

        // Stream the generation
        let fullContent = '';
        let wordCount = 0;
        let lastSentWordCount = 0;

        // Use the streaming API
        switchToLastWorkingKey();
        const model = getGeminiPro();
        const result = await model.generateContentStream(prompt);

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            fullContent += chunkText;
            wordCount = countWords(fullContent);

            // Send chunk every time, but only update word count periodically
            sendEvent(controller, 'chunk', {
              text: chunkText,
              wordCount: wordCount,
            });

            lastSentWordCount = wordCount;
          }
        }

        // Mark API key as working
        markKeyAsWorking();

        // Clean up the content
        fullContent = fullContent.trim();

        // Normalize "The End" for final chapter
        if (isLastChapter && !fullContent.toLowerCase().includes('the end')) {
          fullContent += '\n\nThe End';
        }

        // Save the chapter to database
        const finalWordCount = countWords(fullContent);

        await prisma.chapter.create({
          data: {
            bookId: id,
            number: nextChapterNum,
            title: chapterPlan.title,
            content: fullContent,
            summary: chapterPlan.summary, // Use plan summary for now
            wordCount: finalWordCount,
          },
        });

        // Update book progress
        const newTotalWords = (book.totalWords || 0) + finalWordCount;
        const isComplete = nextChapterNum >= totalChapters;

        await prisma.book.update({
          where: { id },
          data: {
            currentChapter: nextChapterNum,
            totalWords: newTotalWords,
            status: isComplete ? 'completed' : 'generating',
            completedAt: isComplete ? new Date() : null,
          },
        });

        // Send complete event
        sendEvent(controller, 'complete', {
          chapterNum: nextChapterNum,
          wordCount: finalWordCount,
          totalWords: newTotalWords,
          success: true,
          isComplete,
        });

        controller.close();
      } catch (error) {
        console.error('Stream generation error:', error);
        sendEvent(controller, 'error', {
          message: (error as Error).message || 'Generation failed',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
