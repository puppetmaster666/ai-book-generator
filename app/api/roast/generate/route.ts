/**
 * Uncensored Roast Generation API
 * POST /api/roast/generate
 *
 * Uses Mistral (text) + RunPod/ComfyUI/Flux (images) + Sharp (text overlay).
 * Same 4-step architecture as the regular comic pipeline.
 * Progressive saves: each panel saved to DB as it completes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import {
  runUncensoredRoastPipeline,
  isUncensoredPipelineAvailable,
  type RoastCharacterInput,
} from '@/lib/generation/uncensored-roast-pipeline';
import type { VisualChapter } from '@/lib/generation/visual/types';

export const maxDuration = 800;

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
    if (!isUncensoredPipelineAvailable()) {
      return NextResponse.json(
        { error: 'Uncensored pipeline not configured. Set MISTRAL_API_KEY, RUNPOD_API_KEY, RUNPOD_COMFYUI_ENDPOINT_ID.' },
        { status: 503 }
      );
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, status: true, userId: true, region: true },
    });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    await prisma.book.update({
      where: { id: bookId },
      data: { status: 'generating', generationStartedAt: new Date() },
    });

    console.log(`[RoastAPI] Starting uncensored generation for book ${bookId}`);

    const roastCharacters: RoastCharacterInput[] = characters.map(c => ({
      name: c.name,
      personality: c.personality || '',
      photos: c.photos,
    }));

    try {
      const result = await runUncensoredRoastPipeline({
        characters: roastCharacters,
        severity,
        scenario: scenario || '',
        artStyle: artStyle || 'comic',
        region: book.region,
        targetPanels,
        checkpoint: 'flux1-dev-fp8.safetensors',

        // Progressive save: each panel saved to DB as it completes
        onPanelComplete: async (panel: VisualChapter & { imageBase64?: string; error?: string }) => {
          const validDialogue = (panel.dialogue || []).filter(
            d => d && typeof d.text === 'string' && d.text.trim()
          );

          const chapter = await prisma.chapter.create({
            data: {
              bookId,
              number: panel.number,
              title: panel.title || `Panel ${panel.number}`,
              content: panel.text || '',
              summary: panel.summary || panel.scene?.description || '',
              wordCount: (panel.text || '').split(/\s+/).filter(Boolean).length,
              dialogue: validDialogue as unknown as any,
              sceneDescription: (panel.scene || {}) as unknown as any,
            },
          });

          if (panel.imageBase64 && !panel.error) {
            await prisma.illustration.create({
              data: {
                chapterId: chapter.id,
                bookId,
                imageUrl: panel.imageBase64,
                prompt: panel.scene?.description || '',
                altText: (panel.scene?.description || '').substring(0, 200),
                position: panel.number,
                status: 'completed',
              },
            });
          } else if (panel.error) {
            await prisma.illustration.create({
              data: {
                chapterId: chapter.id,
                bookId,
                prompt: panel.scene?.description || '',
                altText: (panel.scene?.description || '').substring(0, 200),
                position: panel.number,
                status: 'failed',
                errorMessage: panel.error,
              },
            });
          }

          console.log(`[RoastAPI] Panel ${panel.number} saved to DB${panel.error ? ' (FAILED)' : ''}`);
        },
      });

      // Count results
      const successCount = [...result.completedImages.values()].filter(v => !v.error).length;
      const failCount = [...result.completedImages.values()].filter(v => v.error).length;

      // Update book status
      await prisma.book.update({
        where: { id: bookId },
        data: {
          title: result.title,
          status: failCount === 0 ? 'complete' : 'preview_complete',
          errorMessage: failCount > 0 ? `${failCount} panel(s) failed` : null,
        },
      });

      return NextResponse.json({
        success: true,
        title: result.title,
        totalPanels: result.chapters.length,
        successfulPanels: successCount,
        failedPanels: failCount,
      });

    } catch (pipelineError) {
      const errorMsg = pipelineError instanceof Error ? pipelineError.message : 'Pipeline failed';
      console.error(`[RoastAPI] Pipeline error:`, errorMsg);

      await prisma.book.update({
        where: { id: bookId },
        data: { status: 'failed', errorMessage: errorMsg },
      });

      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RoastAPI] Request error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
