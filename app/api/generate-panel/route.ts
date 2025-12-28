import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';
import { ART_STYLES, ILLUSTRATION_DIMENSIONS, type ArtStyleKey } from '@/lib/constants';
import { buildIllustrationPromptFromScene, SceneDescription, type PanelLayout } from '@/lib/gemini';

// Retry utility with exponential backoff for rate limit handling
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 5000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message?.toLowerCase() || '';

      // Check if it's a rate limit or quota error
      const isRateLimitError =
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('429') ||
        errorMessage.includes('resource exhausted') ||
        errorMessage.includes('too many requests');

      if (!isRateLimitError || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 5s, 10s, 20s
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`Rate limit hit, retrying in ${delay/1000}s (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

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

// No text instruction for illustrations without dialogue
const NO_TEXT_INSTRUCTION = `CRITICAL: Do NOT include any text, words, letters, numbers, signs, labels, or written characters anywhere in the image. The image must be purely visual with no readable text elements whatsoever.`;

// Interface for dialogue bubbles
interface DialogueBubble {
  speaker: string;
  text: string;
  position: string;
  type?: 'speech' | 'thought' | 'shout';
}

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
      panelLayout,
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

    // Check if we have dialogue (comic mode with speech bubbles)
    const hasDialogue = dialogue && Array.isArray(dialogue) && dialogue.length > 0;

    // Build the illustration prompt using scene description
    let prompt = '';
    if (typeof scene === 'object' && scene.description) {
      // Scene is a SceneDescription object
      prompt = buildIllustrationPromptFromScene(
        scene as SceneDescription,
        artStylePrompt,
        characterVisualGuide,
        visualStyleGuide,
        panelLayout // Pass panel layout for multi-panel comics
      );
    } else {
      // Scene is a string - add panel layout instructions if provided
      prompt = `${artStylePrompt}. ${scene}.`;
      if (panelLayout && panelLayout !== 'splash') {
        const layoutInstructions: Record<string, string> = {
          'two-panel': 'Draw this as a COMIC PAGE with 2 PANELS arranged vertically or horizontally. Each panel shows a different moment in the sequence.',
          'three-panel': 'Draw this as a COMIC PAGE with 3 PANELS. Each panel shows a sequential moment.',
          'four-panel': 'Draw this as a COMIC PAGE with 4 PANELS in a 2x2 grid layout.',
        };
        prompt += ` ${layoutInstructions[panelLayout] || ''} `;
      }
    }

    // Add format instructions
    prompt += `\n\nFORMAT: ${dimensions.prompt}`;

    // For comics with dialogue: add speech bubble instructions
    // For non-dialogue images: add no-text instruction
    if (hasDialogue) {
      prompt += buildSpeechBubblePrompt(dialogue as DialogueBubble[]);
    } else {
      prompt += `\n${NO_TEXT_INSTRUCTION}`;
    }

    console.log(`[Panel ${panelNumber}] Generating illustration for book ${bookId}`);

    // Generate image using Gemini Image model with retry for rate limits
    const model = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
    });

    const result = await withRetry(() => model.generateContent(prompt));
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

    // Create image URL from base64
    const imageUrl = `data:${imageData.mimeType};base64,${imageData.base64}`;

    if (hasDialogue) {
      console.log(`[Panel ${panelNumber}] Generated comic panel with ${dialogue.length} speech bubbles`);
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
        imageUrl,
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
      imageUrl,
      hasDialogue,
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
