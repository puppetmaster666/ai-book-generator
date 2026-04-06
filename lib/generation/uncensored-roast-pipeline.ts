/**
 * Uncensored Roast Pipeline
 * Uses Mistral for text (uncensored) + RunPod/ComfyUI for images (uncensored).
 * Replaces the Gemini-based pipeline for roast books to avoid content blocks.
 *
 * Flow:
 * 1. Mistral writes the full comic script (12 panels with dialogue, narration, scene descriptions)
 * 2. RunPod/ComfyUI generates panel art (NO text in images)
 * 3. Sharp composites speech bubbles and narration onto images
 */

import { generateJsonWithMistral, isMistralConfigured } from '@/lib/mistral';
import { runComfyWorkflow, isRunPodConfigured } from '@/lib/runpod';
import { buildComicPanelWorkflow, buildPonyPrompt } from '@/lib/comfyui-workflows';
import { overlayTextOnImage, mapDialoguePosition } from '@/lib/text-overlay';

export interface RoastCharacterInput {
  name: string;
  personality: string;
  photos?: string[]; // base64 data URLs
}

export interface RoastPanelOutput {
  number: number;
  title: string;
  narration: string;
  dialogue: Array<{ speaker: string; text: string; position: string }>;
  sceneDescription: string;
  characterDescription: string;
  imageBase64?: string; // Final image with text overlaid
  error?: string;
}

export interface RoastScriptOutput {
  title: string;
  panels: RoastPanelOutput[];
}

// ─── STEP 1: Generate the roast script with Mistral ───

export async function generateRoastScriptWithMistral(
  characters: RoastCharacterInput[],
  severity: number,
  scenario: string,
  targetPanels: number = 12
): Promise<RoastScriptOutput> {
  const mainTarget = characters[0];

  const severityDescriptions: Record<number, string> = {
    1: 'Light and playful teasing. Think best man speech energy. Funny but kind.',
    2: 'Embarrassing and boundary-pushing. Make them blush but keep it funny. Backhanded compliments.',
    3: 'Savage and unapologetic. Dark humor, confidence destruction, no softening. Make it sting.',
    4: 'Absolutely unhinged. Maximum cruelty. Attack their identity, their confidence, their future. Zero mercy. Crude, vulgar, devastating. Jokes they will think about at 3 AM.',
  };

  const severityLabel = severity === 1 ? 'Friendly' : severity === 2 ? 'Spicy' : severity === 3 ? 'Brutal' : 'Nuclear';
  const severityDesc = severityDescriptions[severity] || severityDescriptions[3];

  const charDescriptions = characters.map((c, i) =>
    `${i === 0 ? 'MAIN TARGET' : `Friend ${i + 1}`}: ${c.name}${c.personality ? ` (personality: ${c.personality})` : ''}`
  ).join('\n');

  const systemPrompt = `You are a comedy writer creating a ${targetPanels}-panel comic book that makes fun of a real person. You write simple, punchy, conversational humor. Not literary, not intellectual. Like a funny friend who talks shit.

CRITICAL RULES:
- This is NOT a story about a roast event or ceremony. The comic itself IS the roast. Put the target in embarrassing situations.
- The narrator is mean and sarcastic, talking about the target like they are not there.
- Do NOT invent specific cities or countries. Use everyday settings.
- Do NOT use flowery or intellectual language. Simple words. Short sentences.
- Every panel must have at least one joke or embarrassing moment.
- Panel 1 must clearly introduce the main character.
- Panel ${targetPanels} must be a devastating final punchline. The story must feel finished.
- Use the target's NAME and PERSONALITY TRAITS in the jokes.

You must output valid JSON only, no other text.`;

  const userPrompt = `Create a ${targetPanels}-panel comic roasting ${mainTarget.name}.

Meanness level: ${severityLabel}
${severityDesc}

${scenario ? `Scenario: ${scenario}\n` : ''}Characters:
${charDescriptions}

Output this exact JSON format:
{
  "title": "A funny, mean title for the comic",
  "panels": [
    {
      "number": 1,
      "title": "Panel title",
      "narration": "Narrator's sarcastic text for this panel (1-2 sentences). Talks about the character in third person.",
      "dialogue": [
        {"speaker": "${mainTarget.name}", "text": "What they say", "position": "top-left"},
        {"speaker": "Other character", "text": "Their response", "position": "top-right"}
      ],
      "sceneDescription": "Detailed visual description of what is happening. 40-60 words. Describe the setting, what characters are doing, their expressions, body language, objects in scene. Be specific enough to generate an image from this.",
      "characterDescription": "Physical description of characters in this scene for the image generator. Include clothing, hair, expression, pose."
    }
  ]
}

REQUIREMENTS:
- Exactly ${targetPanels} panels
- Every panel has narration (the mean narrator voice)
- At least 8 panels have dialogue
- Scene descriptions must be detailed enough to generate images (40-60 words each)
- Character descriptions must be specific (clothing, hair, pose, expression)
- Panel 1 introduces ${mainTarget.name} clearly
- Panel ${targetPanels} is the devastating finale
- Dialogue should sound natural, not written. Like real people talking.`;

  const result = await generateJsonWithMistral(systemPrompt, userPrompt, {
    temperature: 0.9,
    maxTokens: 8192,
  }) as RoastScriptOutput;

  // Validate and fix panel numbers
  if (result.panels) {
    result.panels = result.panels.map((p, i) => ({
      ...p,
      number: i + 1,
      narration: p.narration || '',
      dialogue: p.dialogue || [],
      sceneDescription: p.sceneDescription || p.title || `Panel ${i + 1}`,
      characterDescription: p.characterDescription || '',
    }));
  }

  console.log(`[UncensoredRoast] Script generated: "${result.title}" with ${result.panels?.length || 0} panels`);
  return result;
}

// ─── STEP 2: Generate panel images with RunPod/ComfyUI ───

export async function generatePanelImage(
  panel: RoastPanelOutput,
  artStyle: string,
  referenceImages?: Array<{ name: string; base64: string }>,
  checkpoint?: string
): Promise<string> {
  const prompt = buildPonyPrompt(
    panel.sceneDescription,
    panel.characterDescription,
    artStyle,
    'no text, no speech bubbles, no words, no letters'
  );

  const { workflow, images } = buildComicPanelWorkflow({
    prompt,
    referenceImages,
    width: 832,
    height: 1216,
    steps: 25,
    cfg: 7,
    checkpoint,
  });

  const results = await runComfyWorkflow(workflow, images, 120000);

  if (results.length === 0) {
    throw new Error(`No image generated for panel ${panel.number}`);
  }

  return results[0].base64;
}

// ─── STEP 3: Overlay text onto images ───

export async function compositeTextOnPanel(
  imageBase64: string,
  panel: RoastPanelOutput
): Promise<string> {
  return overlayTextOnImage({
    imageBase64,
    dialogue: panel.dialogue?.map((d, i) => ({
      speaker: d.speaker,
      text: d.text,
      position: mapDialoguePosition(d.position, i, panel.dialogue.length),
      type: 'speech' as const,
    })),
    narration: panel.narration ? {
      text: panel.narration,
      position: 'top' as const,
    } : undefined,
  });
}

// ─── FULL PIPELINE ───

export interface UncensoredRoastOptions {
  characters: RoastCharacterInput[];
  severity: number;
  scenario: string;
  artStyle: string;
  targetPanels?: number;
  checkpoint?: string;
  onProgress?: (step: string, panelNumber: number, totalPanels: number) => void;
}

export async function runUncensoredRoastPipeline(options: UncensoredRoastOptions): Promise<{
  title: string;
  panels: RoastPanelOutput[];
}> {
  const {
    characters,
    severity,
    scenario,
    artStyle,
    targetPanels = 12,
    checkpoint,
    onProgress,
  } = options;

  // Step 1: Generate script
  onProgress?.('script', 0, targetPanels);
  console.log('[UncensoredRoast] Step 1: Generating script with Mistral...');
  const script = await generateRoastScriptWithMistral(characters, severity, scenario, targetPanels);

  if (!script.panels || script.panels.length === 0) {
    throw new Error('Mistral generated an empty script');
  }

  // Prepare reference images from character photos
  const referenceImages: Array<{ name: string; base64: string }> = [];
  const mainChar = characters[0];
  if (mainChar.photos && mainChar.photos.length > 0) {
    mainChar.photos.forEach((photo, idx) => {
      const base64 = photo.includes(',') ? photo.split(',')[1] : photo;
      referenceImages.push({
        name: `${mainChar.name}_ref_${idx}`,
        base64,
      });
    });
  }

  // Step 2 + 3: Generate images and overlay text (sequentially to manage GPU load)
  console.log(`[UncensoredRoast] Step 2+3: Generating ${script.panels.length} panels...`);
  const completedPanels: RoastPanelOutput[] = [];

  for (const panel of script.panels) {
    onProgress?.('image', panel.number, targetPanels);
    console.log(`[UncensoredRoast] Generating panel ${panel.number}/${script.panels.length}...`);

    try {
      // Generate image (no text)
      const rawImage = await generatePanelImage(
        panel,
        artStyle,
        referenceImages.length > 0 ? referenceImages : undefined,
        checkpoint
      );

      // Overlay text
      onProgress?.('text', panel.number, targetPanels);
      const finalImage = await compositeTextOnPanel(rawImage, panel);

      completedPanels.push({
        ...panel,
        imageBase64: finalImage,
      });

      console.log(`[UncensoredRoast] Panel ${panel.number} complete`);
    } catch (error) {
      console.error(`[UncensoredRoast] Panel ${panel.number} failed:`, error);
      completedPanels.push({
        ...panel,
        error: error instanceof Error ? error.message : 'Image generation failed',
      });
    }
  }

  return {
    title: script.title,
    panels: completedPanels,
  };
}

/**
 * Check if the uncensored pipeline is available (all services configured).
 */
export function isUncensoredPipelineAvailable(): boolean {
  return isMistralConfigured() && isRunPodConfigured();
}
