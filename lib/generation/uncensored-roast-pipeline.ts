/**
 * Uncensored Roast Pipeline (v2)
 * Uses Mistral (text) + RunPod/ComfyUI (images) + Sharp (text overlay).
 *
 * Now matches the quality of the regular comic pipeline with a proper
 * multi-step process: Script -> Director -> Image Gen -> Text Overlay.
 */

import { generateJsonWithMistral, generateRoastScript, isMistralConfigured } from '@/lib/mistral';
import { runComfyWorkflow, isRunPodConfigured } from '@/lib/runpod';
import { buildComicPanelWorkflow, buildFluxPrompt, buildPonyPrompt } from '@/lib/comfyui-workflows';
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
  location: string;
  characterActions: Record<string, string>;
  background: string;
  mood: string;
  cameraAngle: string;
  charactersInScene: string[];
  imageBase64?: string;
  error?: string;
}

export interface RoastScriptOutput {
  title: string;
  panels: RoastPanelOutput[];
}

// ─── STEP 1: WRITER - Generate the script ───

async function generateScript(
  characters: RoastCharacterInput[],
  severity: number,
  scenario: string,
  targetPanels: number
): Promise<RoastScriptOutput> {
  const mainTarget = characters[0];
  const allNames = characters.map(c => c.name).join(', ');

  const nuclearAddOn = severity === 4 ? `
NUCLEAR MODE CONTENT (18+ ONLY, USER HAS CONFIRMED THEIR AGE):
- Include explicit sexual humor, crude jokes about their body, genitalia references
- Drug and alcohol humor is fair game (show them wasted, hungover, making terrible decisions)
- Graphic embarrassment: caught naked, walked in on, wardrobe malfunctions
- Toilet humor, bodily functions, the most juvenile and crude jokes possible
- References to their sex life (or lack thereof), fetishes, browser history
- Nothing is off limits. This is adults-only content. Go as far as possible.
- The goal is to make their friends cry-laughing and the target want to disappear.` : '';

  const severityDesc: Record<number, string> = {
    1: 'Light teasing. Playful, kind, best-man-speech energy.',
    2: 'Embarrassing. Backhanded compliments, cringe situations, blush-inducing.',
    3: 'Savage. Dark humor, confidence destruction, no mercy, no softening.',
    4: `Completely unhinged 18+ content. Maximum vulgarity, maximum cruelty, maximum embarrassment. Nothing is sacred.${nuclearAddOn}`,
  };

  const systemPrompt = `You are a comedy writer creating a ${targetPanels}-panel comic. Write simple, punchy, conversational humor. Like a funny friend who talks shit, not a novelist.

You must output valid JSON only, no other text.`;

  const userPrompt = `Create a ${targetPanels}-panel comic roasting ${mainTarget.name}.

Meanness level: ${severityDesc[severity] || severityDesc[3]}

${scenario ? `Scenario: ${scenario}\n` : ''}Characters:
${characters.map((c, i) => `${i === 0 ? 'MAIN TARGET' : `Friend ${i + 1}`}: ${c.name}${c.personality ? ` (${c.personality})` : ''}`).join('\n')}

CRITICAL RULES:
1. The comic IS the roast. Put ${mainTarget.name} in embarrassing, humiliating situations. Do NOT write about a "roast event."
2. USE AT LEAST 6 DIFFERENT LOCATIONS across the ${targetPanels} panels. Examples: their apartment, a bar, a date gone wrong, the gym, work/office, a party, a grocery store, their car, a restaurant, a doctor's office, a job interview. NEVER use the same location more than twice.
3. VARY which characters appear in each panel. Not every panel needs all characters. Some panels should have ${mainTarget.name} alone, some with one friend, some with strangers. Mix it up.
4. The narrator is mean and sarcastic. Talks about ${mainTarget.name} like they are not there.
5. Panel 1: Clear introduction of ${mainTarget.name} and what makes them ridiculous.
6. Panel ${targetPanels}: Devastating final punchline. Story feels finished.
7. Do NOT use flowery language. Simple words. Short sentences. Punchy.
8. Do NOT invent clothing for ${mainTarget.name} based on assumptions. Describe them in whatever the scene requires (gym clothes at gym, work clothes at work, pajamas at home, etc.)

Output this JSON:
{
  "title": "A funny, mean title",
  "panels": [
    {
      "number": 1,
      "title": "Panel title",
      "narration": "Narrator's sarcastic voice. 1-2 sentences about ${mainTarget.name} in third person.",
      "dialogue": [
        {"speaker": "${mainTarget.name}", "text": "What they say", "position": "top-left"},
        {"speaker": "Other", "text": "Response", "position": "top-right"}
      ],
      "location": "Specific place (e.g. cramped studio apartment with pizza boxes on the floor)",
      "sceneDescription": "50-70 words. What is physically happening. Character positions, expressions, body language, objects in scene. Be extremely specific.",
      "charactersInScene": ["${mainTarget.name}", "other character names in this panel"],
      "characterActions": {
        "${mainTarget.name}": "Physical description: pose, expression, gesture. 15-25 words.",
        "OtherCharacter": "Their pose, expression. 15-25 words."
      },
      "background": "Time of day, lighting, key objects, atmosphere. 20-30 words.",
      "mood": "emotional tone of the scene",
      "cameraAngle": "wide shot / medium shot / close-up / over-shoulder / low angle / bird's eye"
    }
  ]
}

PANEL VARIETY REQUIREMENTS:
- At least 6 different locations
- At least 3 different camera angles
- At least 2 panels where ${mainTarget.name} is alone
- At least 2 panels with a character other than the main group (stranger, coworker, date, bartender)
- Never the same mood 3 panels in a row
- Panel layouts should alternate: some close-ups, some wide establishing shots`;

  const result = await generateJsonWithMistral(systemPrompt, userPrompt, {
    temperature: 0.9,
    maxTokens: 12000,
  }) as RoastScriptOutput;

  // Validate and fix
  if (result.panels) {
    result.panels = result.panels.map((p, i) => ({
      ...p,
      number: i + 1,
      narration: p.narration || '',
      dialogue: Array.isArray(p.dialogue) ? p.dialogue.filter(d => d && typeof d.text === 'string' && d.text.trim()) : [],
      sceneDescription: p.sceneDescription || p.title || `Panel ${i + 1}`,
      location: p.location || 'unspecified',
      charactersInScene: p.charactersInScene || [mainTarget.name],
      characterActions: p.characterActions || {},
      background: p.background || 'default setting',
      mood: p.mood || 'neutral',
      cameraAngle: p.cameraAngle || 'medium shot',
    }));
  }

  console.log(`[UncensoredRoast] Script: "${result.title}" - ${result.panels?.length || 0} panels`);
  return result;
}

// ─── STEP 2: DIRECTOR - Quality review and refinement ───

async function reviewScript(script: RoastScriptOutput, mainCharName: string): Promise<RoastScriptOutput> {
  const panelSummary = script.panels.map(p => {
    const dialoguePreview = p.dialogue.map(d => `${d.speaker}: "${d.text}"`).join(' | ') || '(no dialogue)';
    return `PANEL ${p.number} [${p.cameraAngle}, ${p.location}]: ${p.sceneDescription.substring(0, 80)}\n  Dialogue: ${dialoguePreview}`;
  }).join('\n\n');

  const locations = [...new Set(script.panels.map(p => p.location))];

  const reviewPrompt = `Review this ${script.panels.length}-panel comic script and FIX any problems. Output the corrected full panels array.

TITLE: "${script.title}"
MAIN TARGET: ${mainCharName}

CURRENT PANELS:
${panelSummary}

UNIQUE LOCATIONS USED: ${locations.length} (${locations.join(', ')})

CHECK AND FIX:
1. LOCATIONS: Are there at least 6 different locations? If not, change repeated locations to new ones.
2. DIALOGUE: Does every dialogue entry have a "speaker" AND "text" field? Remove any without text.
3. CHARACTERS: Are different characters featured across panels? Not just the same 2 every time?
4. CAMERA: Are camera angles varied? Not all "medium shot"?
5. PAGE 1: Does it clearly introduce ${mainCharName}?
6. LAST PAGE: Is there a devastating final punchline?
7. NARRATION: Does every panel have narrator text?

Output ONLY valid JSON: { "panels": [ ... full corrected array ... ] }`;

  try {
    const review = await generateJsonWithMistral(
      'You are a comic book editor. Fix problems in the script. Output valid JSON only.',
      reviewPrompt,
      { temperature: 0.5, maxTokens: 12000 }
    ) as { panels: RoastPanelOutput[] };

    if (review.panels && review.panels.length === script.panels.length) {
      console.log(`[UncensoredRoast] Director review complete, ${locations.length} -> ${[...new Set(review.panels.map(p => p.location))].length} locations`);
      return { ...script, panels: review.panels.map((p, i) => ({ ...p, number: i + 1 })) };
    }

    console.warn('[UncensoredRoast] Director returned wrong panel count, using original');
    return script;
  } catch (error) {
    console.warn('[UncensoredRoast] Director review failed, using original script:', error instanceof Error ? error.message : error);
    return script;
  }
}

// ─── STEP 3: Generate panel images ───

export async function generatePanelImage(
  panel: RoastPanelOutput,
  artStyle: string,
  referenceImages?: Array<{ name: string; base64: string }>,
  checkpoint?: string
): Promise<string> {
  const isFlux = !checkpoint || checkpoint.includes('flux');

  // Build a rich prompt from all the structured scene data
  const scenePrompt = [
    `Setting: ${panel.location}.`,
    panel.sceneDescription,
    panel.background ? `Environment: ${panel.background}.` : '',
    panel.mood ? `Mood: ${panel.mood}.` : '',
    panel.cameraAngle ? `Camera: ${panel.cameraAngle}.` : '',
    // Per-character actions
    ...Object.entries(panel.characterActions || {}).map(([name, action]) =>
      `${name}: ${action}.`
    ),
  ].filter(Boolean).join(' ');

  const prompt = isFlux
    ? buildFluxPrompt(scenePrompt, '', artStyle)
    : buildPonyPrompt(scenePrompt, '', artStyle, 'no text, no speech bubbles, no words, no letters');

  const { workflow, images } = buildComicPanelWorkflow({
    prompt,
    referenceImages,
    width: 832,
    height: 1216,
    steps: isFlux ? 20 : 25,
    cfg: isFlux ? 1 : 7,
    checkpoint: checkpoint || 'flux1-dev-fp8.safetensors',
    model: isFlux ? 'flux' : 'sdxl',
  });

  const results = await runComfyWorkflow(workflow, images, 120000);

  if (results.length === 0) {
    throw new Error(`No image generated for panel ${panel.number}`);
  }

  return results[0];
}

// ─── STEP 4: Overlay text onto images ───

export async function compositeTextOnPanel(
  imageBase64: string,
  panel: RoastPanelOutput
): Promise<string> {
  // Filter out any dialogue with undefined/empty text
  const validDialogue = (panel.dialogue || []).filter(
    d => d && typeof d.text === 'string' && d.text.trim().length > 0 && typeof d.speaker === 'string'
  );

  return overlayTextOnImage({
    imageBase64,
    dialogue: validDialogue.length > 0 ? validDialogue.map((d, i) => ({
      speaker: d.speaker,
      text: d.text,
      position: mapDialoguePosition(d.position, i, validDialogue.length),
      type: 'speech' as const,
    })) : undefined,
    narration: panel.narration && panel.narration.trim() ? {
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

  // Step 1: WRITER - Generate script with Mistral
  onProgress?.('script', 0, targetPanels);
  console.log('[UncensoredRoast] Step 1: WRITER - Generating script...');
  let script = await generateScript(characters, severity, scenario, targetPanels);

  if (!script.panels || script.panels.length === 0) {
    throw new Error('Mistral generated an empty script');
  }

  // Step 2: DIRECTOR - Review and fix quality issues
  console.log('[UncensoredRoast] Step 2: DIRECTOR - Reviewing script...');
  script = await reviewScript(script, characters[0].name);

  // Prepare reference images (face only, not clothing)
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

  // Step 3 + 4: Generate images and overlay text
  console.log(`[UncensoredRoast] Steps 3+4: Generating ${script.panels.length} panels...`);
  const completedPanels: RoastPanelOutput[] = [];

  for (const panel of script.panels) {
    onProgress?.('image', panel.number, targetPanels);
    console.log(`[UncensoredRoast] Panel ${panel.number}/${script.panels.length}: ${panel.location}`);

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
 * Check if the uncensored pipeline is available.
 */
export function isUncensoredPipelineAvailable(): boolean {
  return isMistralConfigured() && isRunPodConfigured();
}
