import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateOutline,
  generateChapter,
  summarizeChapter,
  updateCharacterStates,
  generateCoverPrompt,
  generateCoverImage,
} from '@/lib/gemini';
import { countWords } from '@/lib/epub';

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

    if (book.status === 'completed') {
      return NextResponse.json({ error: 'Book already generated' }, { status: 400 });
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

      // Generate chapter summary
      const summary = await summarizeChapter(chapterContent);

      // Update character states
      characterStates = await updateCharacterStates(
        characterStates,
        chapterContent,
        i
      );

      // Update story so far
      storySoFar += `\n\nChapter ${i}: ${chapterPlan.title}\n${summary}`;

      // Save chapter
      await prisma.chapter.create({
        data: {
          bookId: id,
          number: i,
          title: chapterPlan.title,
          content: chapterContent,
          summary,
          wordCount,
        },
      });

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

    // Step 3: Generate cover
    const coverPrompt = await generateCoverPrompt({
      title: book.title,
      genre: book.genre,
      bookType: book.bookType,
      premise: book.premise,
      authorName: book.authorName,
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
