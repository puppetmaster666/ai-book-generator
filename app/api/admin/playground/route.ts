/**
 * Admin AI Playground API
 * POST /api/admin/playground
 *
 * Test text and image generation with any configured provider.
 * Admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const maxDuration = 300;

async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return user?.isAdmin || false;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { provider, mode, prompt, model, nsfw } = body as {
      provider: 'gemini' | 'mistral' | 'runpod';
      mode: 'text' | 'image';
      prompt: string;
      model?: string;
      nsfw?: boolean;
    };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // ─── TEXT GENERATION ───
    if (mode === 'text') {
      if (provider === 'mistral') {
        const { generateWithMistral, isMistralConfigured } = await import('@/lib/mistral');
        if (!isMistralConfigured()) {
          return NextResponse.json({ error: 'MISTRAL_API_KEY not configured' }, { status: 503 });
        }
        const result = await generateWithMistral(
          [{ role: 'user', content: prompt }],
          { model: model || 'mistral-large-latest', temperature: 0.8, maxTokens: 4096 }
        );
        return NextResponse.json({ result, provider: 'mistral', model: model || 'mistral-large-latest' });

      } else if (provider === 'gemini') {
        const { getGeminiFlash } = await import('@/lib/generation/shared/api-client');
        const gemini = getGeminiFlash();
        const result = await gemini.generateContent(prompt);
        return NextResponse.json({ result: result.response.text(), provider: 'gemini', model: 'gemini-3-flash-preview' });

      } else {
        return NextResponse.json({ error: 'Text generation not supported for this provider' }, { status: 400 });
      }
    }

    // ─── IMAGE GENERATION ───
    if (mode === 'image') {
      if (provider === 'runpod') {
        const { runComfyWorkflow, isRunPodConfigured } = await import('@/lib/runpod');
        const { buildComicPanelWorkflow, buildFluxPrompt, buildPonyPrompt } = await import('@/lib/comfyui-workflows');

        if (!isRunPodConfigured()) {
          return NextResponse.json({ error: 'RUNPOD_API_KEY and RUNPOD_COMFYUI_ENDPOINT_ID not configured' }, { status: 503 });
        }

        // Use Pony V6 for NSFW (fully explicit capable), Flux for SFW
        const useModel = nsfw ? 'sdxl' : 'flux';
        const imgPrompt = nsfw
          ? buildPonyPrompt(prompt, '', 'realistic', '', true)
          : buildFluxPrompt(prompt, '', 'realistic');
        const { workflow, images } = buildComicPanelWorkflow({
          prompt: imgPrompt,
          width: nsfw ? 1024 : 832,
          height: nsfw ? 1024 : 1216,
          steps: nsfw ? 25 : 20,
          cfg: nsfw ? 7 : 1,
          model: useModel,
          checkpoint: nsfw ? 'ponyDiffusionV6XL.safetensors' : undefined,
        });

        const results = await runComfyWorkflow(workflow, images, 120000);

        if (results.length === 0) {
          return NextResponse.json({ error: 'No image generated' }, { status: 500 });
        }

        const base64 = results[0];
        const imageUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
        return NextResponse.json({ imageUrl, provider: 'runpod', model: 'flux1-dev-fp8' });

      } else if (provider === 'gemini') {
        const { getGeminiImage } = await import('@/lib/generation/shared/api-client');
        const geminiImage = getGeminiImage();
        const result = await geminiImage.generateContent(prompt);
        const candidate = result.response.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        let imageData = null;
        for (const part of parts) {
          if (part.inlineData?.mimeType?.startsWith('image/')) {
            imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }

        if (!imageData) {
          return NextResponse.json({ error: 'Gemini returned no image (possibly blocked by content policy)' }, { status: 400 });
        }

        return NextResponse.json({ imageUrl: imageData, provider: 'gemini', model: 'gemini-3-pro-image-preview' });

      } else {
        return NextResponse.json({ error: 'Image generation not supported for this provider' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid mode. Use "text" or "image"' }, { status: 400 });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Playground] Error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
