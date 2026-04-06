/**
 * Uncensored Roast Generation API
 * POST /api/roast/generate
 *
 * Uses Mistral (text) + RunPod/ComfyUI (images) + Sharp (text overlay).
 * Falls back to the existing Gemini pipeline if uncensored services are not configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import {
  runUncensoredRoastPipeline,
  isUncensoredPipelineAvailable,
  type RoastCharacterInput,
} from '@/lib/generation/uncensored-roast-pipeline';

export const maxDuration = 800; // Vercel Fluid Compute

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();

    const {
      bookId,
      characters,
      severity,
      scenario,
      artStyle,
      targetPanels = 12,
    } = body as {
      bookId: string;
      characters: Array<{ name: string; personality: string; photos?: string[] }>;
      severity: number;
      scenario: string;
      artStyle: string;
      targetPanels?: number;
    };

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    if (!characters || characters.length === 0) {
      return NextResponse.json({ error: 'At least one character is required' }, { status: 400 });
    }

    // Check if uncensored pipeline is available
    if (!isUncensoredPipelineAvailable()) {
      return NextResponse.json(
        { error: 'Uncensored pipeline not configured. Set MISTRAL_API_KEY and RUNPOD_API_KEY + RUNPOD_COMFYUI_ENDPOINT_ID.' },
        { status: 503 }
      );
    }

    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, status: true, userId: true },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Update status to generating
    await prisma.book.update({
      where: { id: bookId },
      data: {
        status: 'generating',
        generationStartedAt: new Date(),
      },
    });

    console.log(`[RoastAPI] Starting uncensored roast generation for book ${bookId}`);

    // Map characters to pipeline input
    const roastCharacters: RoastCharacterInput[] = characters.map(c => ({
      name: c.name,
      personality: c.personality || '',
      photos: c.photos,
    }));

    // Default deployment uses Flux. Custom deployments can use SDXL/Pony.
    const checkpoint = 'flux1-dev-fp8.safetensors';

    try {
      // Run the full pipeline
      const result = await runUncensoredRoastPipeline({
        characters: roastCharacters,
        severity,
        scenario: scenario || '',
        artStyle: artStyle || 'comic',
        targetPanels,
        checkpoint,
      });

      // Save panels to database
      const successfulPanels = result.panels.filter(p => p.imageBase64 && !p.error);
      const failedPanels = result.panels.filter(p => p.error);

      console.log(`[RoastAPI] Generation complete: ${successfulPanels.length} successful, ${failedPanels.length} failed`);

      // Create chapter entries for each panel
      for (const panel of result.panels) {
        // Filter out any malformed dialogue entries
        const validDialogue = Array.isArray(panel.dialogue)
          ? panel.dialogue.filter(d => d && typeof d.text === 'string' && d.text.trim())
          : [];

        const chapter = await prisma.chapter.create({
          data: {
            bookId,
            number: panel.number,
            title: panel.title || `Panel ${panel.number}`,
            content: panel.narration || '',
            summary: panel.sceneDescription || '',
            wordCount: (panel.narration || '').split(/\s+/).length,
            dialogue: validDialogue,
            sceneDescription: {
              location: panel.location || 'unspecified',
              description: panel.sceneDescription || '',
              characters: panel.charactersInScene || [],
              characterActions: panel.characterActions || {},
              background: panel.background || '',
              mood: panel.mood || 'neutral',
              cameraAngle: panel.cameraAngle || 'medium shot',
            },
          },
        });

        // Save illustration if we have one
        if (panel.imageBase64) {
          await prisma.illustration.create({
            data: {
              chapterId: chapter.id,
              bookId,
              imageUrl: panel.imageBase64,
              prompt: panel.sceneDescription,
              altText: panel.sceneDescription.substring(0, 200),
              position: panel.number,
              status: 'completed',
            },
          });
        }
      }

      // Update book status
      const allSucceeded = failedPanels.length === 0;
      await prisma.book.update({
        where: { id: bookId },
        data: {
          title: result.title,
          status: allSucceeded ? 'complete' : 'preview_complete',
          errorMessage: allSucceeded ? null : `${failedPanels.length} panel(s) failed to generate`,
        },
      });

      return NextResponse.json({
        success: true,
        title: result.title,
        totalPanels: result.panels.length,
        successfulPanels: successfulPanels.length,
        failedPanels: failedPanels.length,
      });

    } catch (pipelineError) {
      const errorMsg = pipelineError instanceof Error ? pipelineError.message : 'Pipeline failed';
      console.error(`[RoastAPI] Pipeline error:`, errorMsg);

      await prisma.book.update({
        where: { id: bookId },
        data: {
          status: 'failed',
          errorMessage: errorMsg,
        },
      });

      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      );
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RoastAPI] Request error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
