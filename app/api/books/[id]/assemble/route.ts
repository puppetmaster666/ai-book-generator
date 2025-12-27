import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateCoverPrompt,
  generateCoverImage,
} from '@/lib/gemini';
import { countWords } from '@/lib/epub';
import { ART_STYLES, type ArtStyleKey } from '@/lib/constants';
import { sendEmail, getBookReadyEmail } from '@/lib/email';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { number: 'asc' },
          include: {
            illustrations: true,
          },
        },
        illustrations: true,
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Verify all panels are generated
    const expectedPanels = book.outline
      ? ((book.outline as { chapters: unknown[] }).chapters || []).length
      : book.targetChapters;

    const generatedPanels = book.chapters.filter(ch =>
      ch.illustrations && ch.illustrations.length > 0
    ).length;

    if (generatedPanels < expectedPanels) {
      return NextResponse.json(
        {
          error: 'Not all panels generated',
          expected: expectedPanels,
          generated: generatedPanels,
        },
        { status: 400 }
      );
    }

    console.log(`Assembling book ${id}: ${generatedPanels} panels complete`);

    // Calculate total words
    let totalWords = 0;
    for (const chapter of book.chapters) {
      totalWords += countWords(chapter.content);
    }

    // Get art style config
    const artStyleKey = book.artStyle as ArtStyleKey | null;
    const artStyleConfig = artStyleKey ? ART_STYLES[artStyleKey] : null;

    const characterVisualGuide = book.characterVisualGuide as CharacterVisualGuide | null;
    const visualStyleGuide = book.visualStyleGuide as VisualStyleGuide | null;

    // Generate cover
    console.log('Generating cover...');
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
        totalWords,
        totalChapters: book.chapters.length,
        currentChapter: book.chapters.length,
        completedAt: new Date(),
      },
    });

    console.log(`Book ${id} assembled and marked complete`);

    // Send email notification if email is available
    if (book.email) {
      try {
        const bookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${id}`;
        const emailContent = getBookReadyEmail(book.title, book.authorName, bookUrl);
        await sendEmail({
          to: book.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
        console.log(`Email notification sent to ${book.email}`);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the assembly for email errors
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Book assembled successfully',
      totalChapters: book.chapters.length,
      totalWords,
      hasCover: !!coverImageUrl,
    });
  } catch (error) {
    console.error('Error assembling book:', error);

    const { id } = await params;
    await prisma.book.update({
      where: { id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error during assembly',
      },
    });

    return NextResponse.json(
      { error: 'Failed to assemble book' },
      { status: 500 }
    );
  }
}
