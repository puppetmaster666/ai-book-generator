import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';
import { ART_STYLES, ILLUSTRATION_DIMENSIONS, type ArtStyleKey } from '@/lib/constants';
import { addSpeechBubbles, DialogueBubble } from '@/lib/bubbles';
import { buildIllustrationPromptFromScene, SceneDescription } from '@/lib/gemini';

// Lazy initialization
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// No text instruction for all illustrations
const NO_TEXT_INSTRUCTION = `CRITICAL: Do NOT include any text, words, letters, numbers, signs, labels, or written characters anywhere in the image. The image must be purely visual with no readable text elements whatsoever.`;

export async function POST(request: NextRequest) {
  try {
    const {
      bookId,
      panelNumber,
      scene,
      dialogue,
      artStyle,
      bookFormat,
      characterVisualGuide,
      visualStyleGuide,
      chapterTitle,
      chapterText,
    } = await request.json();

    // Validate required fields
    if (!bookId || !panelNumber || !scene) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, panelNumber, scene' },
        { status: 400 }
      );
    }

    // Get art style prompt
    const styleConfig = artStyle ? ART_STYLES[artStyle as ArtStyleKey] : null;
    const artStylePrompt = styleConfig?.prompt || 'professional book illustration';

    // Get dimensions for this book format
    const formatKey = (bookFormat || 'picture_book') as keyof typeof ILLUSTRATION_DIMENSIONS;
    const dimensions = ILLUSTRATION_DIMENSIONS[formatKey] || ILLUSTRATION_DIMENSIONS.picture_book;

    // Build the illustration prompt using scene description
    let prompt = '';
    if (typeof scene === 'object' && scene.description) {
      // Scene is a SceneDescription object
      prompt = buildIllustrationPromptFromScene(
        scene as SceneDescription,
        artStylePrompt,
        characterVisualGuide,
        visualStyleGuide
      );
    } else {
      // Scene is a string
      prompt = `${artStylePrompt}. ${scene}. ${NO_TEXT_INSTRUCTION}`;
    }

    // Add format and no-text instructions
    prompt += `\n\nFORMAT: ${dimensions.prompt}\n${NO_TEXT_INSTRUCTION}`;

    console.log(`[Panel ${panelNumber}] Generating illustration for book ${bookId}`);

    // Generate image using Gemini Image model
    const model = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
    });

    const result = await model.generateContent(prompt);
    const response = result.response;

    // Check for content policy blocks
    const candidate = response.candidates?.[0];
    if (!candidate) {
      const blockReason = response.promptFeedback?.blockReason;
      console.error(`[Panel ${panelNumber}] No candidates. Block reason:`, blockReason);
      return NextResponse.json(
        { error: 'Content blocked by safety filter', blocked: true, panelNumber },
        { status: 400 }
      );
    }

    if (candidate.finishReason === 'SAFETY') {
      console.error(`[Panel ${panelNumber}] Safety block:`, candidate.safetyRatings);
      return NextResponse.json(
        { error: 'Image blocked by content policy', blocked: true, panelNumber },
        { status: 400 }
      );
    }

    // Extract image from response
    const parts = candidate.content?.parts || [];
    let imageData: { base64: string; mimeType: string } | null = null;

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageData = {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        };
        break;
      }
    }

    if (!imageData) {
      console.error(`[Panel ${panelNumber}] No image in response`);
      return NextResponse.json(
        { error: 'No image generated', panelNumber },
        { status: 500 }
      );
    }

    // Store original image URL
    const originalImageUrl = `data:${imageData.mimeType};base64,${imageData.base64}`;
    let finalImageUrl = originalImageUrl;

    // Apply speech bubbles if dialogue is provided (for comics)
    if (dialogue && Array.isArray(dialogue) && dialogue.length > 0) {
      try {
        console.log(`[Panel ${panelNumber}] Adding ${dialogue.length} speech bubbles`);
        const processedBase64 = await addSpeechBubbles(
          imageData.base64,
          dialogue as DialogueBubble[]
        );
        finalImageUrl = `data:image/png;base64,${processedBase64}`;
      } catch (bubbleError) {
        console.error(`[Panel ${panelNumber}] Failed to add speech bubbles:`, bubbleError);
        // Continue with original image if bubble overlay fails
      }
    }

    // Create or find chapter for this panel
    const chapter = await prisma.chapter.upsert({
      where: {
        bookId_number: {
          bookId,
          number: panelNumber,
        },
      },
      update: {
        sceneDescription: scene,
        dialogue: dialogue || null,
      },
      create: {
        bookId,
        number: panelNumber,
        title: chapterTitle || `Panel ${panelNumber}`,
        content: chapterText || '',
        summary: typeof scene === 'object' ? scene.description : scene.slice(0, 200),
        wordCount: (chapterText || '').split(/\s+/).filter(Boolean).length,
        sceneDescription: scene,
        dialogue: dialogue || null,
      },
    });

    // Save illustration to database
    const illustration = await prisma.illustration.create({
      data: {
        bookId,
        chapterId: chapter.id,
        imageUrl: finalImageUrl,
        originalUrl: dialogue?.length ? originalImageUrl : null,
        prompt,
        altText: typeof scene === 'object' ? scene.description : scene.slice(0, 100),
        position: 0,
        width: dimensions.width,
        height: dimensions.height,
        style: artStyle || null,
      },
    });

    console.log(`[Panel ${panelNumber}] Successfully generated and saved`);

    return NextResponse.json({
      success: true,
      panelNumber,
      illustrationId: illustration.id,
      chapterId: chapter.id,
      imageUrl: finalImageUrl,
      hasDialogue: !!dialogue?.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating panel:', errorMessage);

    return NextResponse.json(
      { error: `Failed to generate panel: ${errorMessage}` },
      { status: 500 }
    );
  }
}
