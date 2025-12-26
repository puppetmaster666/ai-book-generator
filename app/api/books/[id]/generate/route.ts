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
} from '@/lib/gemini';
import { countWords } from '@/lib/epub';
import { BOOK_FORMATS, ART_STYLES, type BookFormatKey, type ArtStyleKey } from '@/lib/constants';

// Helper function to generate an illustration image
async function generateIllustrationImage(data: {
  scene: string;
  artStyle: string;
  characters: { name: string; description: string }[];
  setting: string;
  bookTitle: string;
}): Promise<{ imageUrl: string; altText: string } | null> {
  try {
    // Call our illustration API endpoint
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/generate-illustration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error('Illustration API error:', await response.text());
      return null;
    }

    const result = await response.json();

    if (result.image?.base64 && result.image?.mimeType) {
      return {
        imageUrl: `data:${result.image.mimeType};base64,${result.image.base64}`,
        altText: result.altText || data.scene.substring(0, 100),
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to generate illustration:', error);
    return null;
  }
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

      // Generate illustrations if book has illustrations enabled
      const bookFormat = book.bookFormat as BookFormatKey || 'text_only';
      const formatConfig = BOOK_FORMATS[bookFormat];

      if (formatConfig && formatConfig.illustrationsPerChapter > 0 && book.artStyle) {
        const artStyleKey = book.artStyle as ArtStyleKey;
        const artStyleConfig = ART_STYLES[artStyleKey];
        const characters = book.characters as { name: string; description: string }[];

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

            // Generate the illustration image
            const illustrationResponse = await generateIllustrationImage({
              scene: illustrationPlan.visualDescription,
              artStyle: book.artStyle,
              characters,
              setting: illustrationPlan.backgroundDetails,
              bookTitle: book.title,
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

            // Generate each illustration
            for (let j = 0; j < illustrationPrompts.length; j++) {
              const illustPrompt = illustrationPrompts[j];

              const illustrationResponse = await generateIllustrationImage({
                scene: illustPrompt.description,
                artStyle: book.artStyle,
                characters: characters.filter(c => illustPrompt.characters.includes(c.name)),
                setting: book.premise.substring(0, 200),
                bookTitle: book.title,
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

    // Step 3: Generate cover
    // Get art style prompt for cover if book has an art style
    const artStyleKey = book.artStyle as ArtStyleKey | null;
    const artStyleConfig = artStyleKey ? ART_STYLES[artStyleKey] : null;

    const coverPrompt = await generateCoverPrompt({
      title: book.title,
      genre: book.genre,
      bookType: book.bookType,
      premise: book.premise,
      authorName: book.authorName,
      artStyle: book.artStyle || undefined,
      artStylePrompt: artStyleConfig?.coverStyle,
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
