/**
 * Comic Book Generation Pipeline (4-Step)
 *
 * Step 1: WRITER - Generate a full comic script with character voice profiles and dialogue
 * Step 2: DIRECTOR - Break script into exactly N scenes with visual direction
 * Step 3: EDITOR - Quality review pass to catch issues
 * Step 4: Image generation (handled by existing pipeline)
 *
 * This replaces the old 2-step approach (generate story -> break into pages)
 * which produced incoherent stories with generic dialogue.
 */

import { getGeminiPro, getGeminiFlash } from '../shared/api-client';
import { parseJSONFromResponse } from '../shared/json-utils';
import { ContentRating, getContentRatingInstructions, detectLanguageInstruction } from '../shared/writing-quality';
import { buildNameGuidancePrompt } from '../shared/name-variety';
import { VisualChapter, SceneDescription, DialogueEntry, PanelLayout } from './types';

// ============================================================================
// TYPES
// ============================================================================

interface ComicCharacter {
  name: string;
  description: string;
}

interface CharacterVoiceProfile {
  name: string;
  role: string;
  voiceStyle: string;       // How they talk (vocabulary, sentence length, verbal tics)
  emotionalDefault: string; // Their baseline emotional state
  speechExample: string;    // Example line in their voice
}

interface ComicScript {
  voiceProfiles: CharacterVoiceProfile[];
  script: string;           // The full comic script text
}

interface ScenePlan {
  chapters: VisualChapter[];
}

interface QualityIssue {
  page: number;
  issue: string;
  fix: string;
}

interface QualityReview {
  passed: boolean;
  issues: QualityIssue[];
  chapters?: VisualChapter[];
}

// ============================================================================
// STEP 1: WRITER - Generate comic script with character voices
// ============================================================================

async function generateComicScript(bookData: {
  title: string;
  genre: string;
  premise: string;
  originalIdea?: string;
  characters: ComicCharacter[];
  beginning: string;
  middle: string;
  ending: string;
  targetChapters: number;
  contentRating?: ContentRating;
}): Promise<ComicScript> {
  const contentGuidelines = getContentRatingInstructions(bookData.contentRating || 'general');
  const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + bookData.premise);

  const characterList = bookData.characters.map(c => `- ${c.name}: ${c.description}`).join('\n');

  const originalIdeaSection = bookData.originalIdea
    ? `\nORIGINAL AUTHOR VISION (incorporate these specific details faithfully):\n${bookData.originalIdea}\n`
    : '';

  const prompt = `You are a comic book writer. Your job is to write a complete comic script - a story told through action and dialogue, ready to be drawn.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
${contentGuidelines}
${originalIdeaSection}

STORY DETAILS:
Title: "${bookData.title}"
Genre: ${bookData.genre}
Premise: ${bookData.premise}

CHARACTERS:
${characterList}

STORY ARC:
- Beginning: ${bookData.beginning}
- Middle: ${bookData.middle}
- Ending: ${bookData.ending}

${buildNameGuidancePrompt(bookData.premise, bookData.title, bookData.genre)}

YOUR TASK: Output a JSON object with two parts:

PART 1 - "voiceProfiles": Create a voice profile for each character that makes them sound DISTINCT.

Think about:
- A tough street kid talks differently than a wise old mentor
- A nervous scientist talks differently than a confident warrior
- Vocabulary, sentence length, verbal quirks, how they handle stress

PART 2 - "script": Write the FULL comic script. This is the creative heart of the book.

SCRIPT FORMAT (write it exactly like this):
\`\`\`
PAGE 1:
[Location: Forest clearing, dawn. Mist curls between ancient trees.]
NOVA crouches behind a fallen log, scanning the treeline. Her hand rests on her knife.
NOVA: (whispering) "They came through here. An hour ago, maybe less."
KAI drops beside her, winded and pale.
KAI: "Or... maybe we could just... not chase the thing that eats people?"
NOVA shoots him a look.
NOVA: "You volunteered."
KAI: "I volunteered for 'recon.' This is definitely not recon."
A branch SNAPS. They both freeze.
SFX: CRACK!

PAGE 2:
[Location: Same clearing - camera pulls back to reveal a massive shadow between the trees.]
...
\`\`\`

SCRIPT RULES:

STORY STRUCTURE:
- Write for exactly ${bookData.targetChapters} pages (roughly - the director will finalize page breaks)
- Every scene must be a CONSEQUENCE of the previous one (Therefore/But logic, never "And then")
- Build real tension with stakes the reader cares about
- Characters must have goals that drive their actions - no "just because the plot needs it"
- Include a clear climax and satisfying resolution
- The story should make sense if you read just the dialogue aloud

DIALOGUE:
- Each character MUST sound different (use the voice profiles)
- Max 60 words of dialogue per page (some pages can have zero dialogue)
- Dialogue reveals character - what they say AND what they avoid saying
- NEVER have characters state emotions: NO "I'm so angry!" YES: "You knew. This whole time."
- Use silence, interruptions, trailing off, and subtext
- Sarcasm, deflection, and half-truths make dialogue feel real
- The 50/50 rule: if the image shows an action (falling, fighting), dialogue should NOT describe that action

BANNED AI DIALOGUE:
Never write these robotic patterns:
- "I need you to understand..." / "Here's the thing..." / "Let me be clear..."
- "I have to tell you something..." / "The truth is..." / "You need to know that..."
- "I feel [emotion]" / "I am [emotion]" (show through actions instead)
- Characters narrating what's already visible ("Look, he's running!" while art shows running)

ACTION & VISUAL DIRECTION:
- Write what we SEE: physical actions, expressions, body language
- Use specific verbs: "slams", "flinches", "grips" - not "reacts" or "responds"
- Include environment interaction (leaning on walls, kicking debris, gripping railings)
- Mark sound effects: SFX: CRASH!, SFX: WHOOSH!, etc.
- Each page should end with a hook that makes you want to turn the page

TARGET: ~1500-2000 words for the full script. Quality over quantity - a tight, well-paced story beats a padded one.

Output ONLY valid JSON:
{
  "voiceProfiles": [
    {
      "name": "Character Name",
      "role": "protagonist/antagonist/sidekick/mentor/etc",
      "voiceStyle": "How they talk - vocabulary level, sentence length, verbal habits. Be specific.",
      "emotionalDefault": "Their baseline state (anxious, cocky, weary, curious, etc.)",
      "speechExample": "An example line that captures their voice perfectly"
    }
  ],
  "script": "The full script text with PAGE markers, locations, actions, dialogue, and SFX"
}`;

  const result = await getGeminiPro().generateContent(prompt);
  const response = result.response.text();
  const parsed = parseJSONFromResponse(response) as ComicScript;

  console.log(`[ComicPipeline] Step 1 WRITER complete - ${parsed.voiceProfiles?.length || 0} voice profiles, script length: ${parsed.script?.length || 0} chars`);
  return parsed;
}

// ============================================================================
// STEP 2: DIRECTOR - Break script into scenes with visual direction
// ============================================================================

async function planScenes(
  script: ComicScript,
  bookData: {
    title: string;
    genre: string;
    targetChapters: number;
    characters: ComicCharacter[];
    contentRating?: ContentRating;
    characterVisualGuide?: {
      characters: Array<{
        name: string;
        physicalDescription: string;
        clothing: string;
        distinctiveFeatures: string;
      }>;
    };
  }
): Promise<ScenePlan> {
  const contentGuidelines = getContentRatingInstructions(bookData.contentRating || 'general');
  const languageInstruction = detectLanguageInstruction(bookData.title);

  // Build character visual reference
  const characterRef = bookData.characterVisualGuide
    ? bookData.characterVisualGuide.characters.map(c =>
      `${c.name}: ${c.physicalDescription}. Wears: ${c.clothing}. Distinct: ${c.distinctiveFeatures}`
    ).join('\n')
    : bookData.characters.map(c => `${c.name}: ${c.description}`).join('\n');

  const prompt = `You are a comic book director/layout artist. You have a finished script and your job is to break it into exactly ${bookData.targetChapters} pages with precise visual direction.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
${contentGuidelines}

THE SCRIPT:
---
${script.script}
---

CHARACTER VOICE PROFILES (for reference - preserve their dialogue exactly):
${script.voiceProfiles.map(vp => `- ${vp.name} (${vp.role}): ${vp.voiceStyle}`).join('\n')}

CHARACTER VISUAL REFERENCES:
${characterRef}

YOUR TASK: Break the script into EXACTLY ${bookData.targetChapters} pages. For each page, provide:

1. **text**: Brief narration if needed (keep minimal - comics are visual)
2. **dialogue**: Extract the dialogue from the script for this page. Assign bubble positions.
3. **scene**: Full visual direction for the artist
4. **panelLayout**: How to divide the page

DIALOGUE RULES:
- Pull dialogue DIRECTLY from the script - do NOT rewrite or invent new lines
- Max 4 speech bubbles per page
- If a page has more dialogue in the script, split across pages or cut the weakest lines
- Position bubbles logically: speakers on the left get left positions, right get right
- Reading order: top-to-bottom, left-to-right

PANEL LAYOUT PACING:
- "splash" (full page): Dramatic reveals, emotional peaks, opening/closing (use 4-5 times)
- "two-panel": Most common - action/reaction, cause/effect (use 8-10 times)
- "three-panel": Good for dialogue sequences or building tension (use 5-7 times)
- "four-panel": Rapid action, chase scenes, comedy beats (use 3-4 times)
- NEVER use the same layout 3 times in a row
- Action sequences: accelerate panels (2→3→4). Emotional moments: decelerate (4→2→splash)

SCENE DIRECTION:
- "characterActions" must be PHYSICAL descriptions, never emotional labels
  BAD: "angry", "sad", "happy"
  GOOD: "clenched jaw, narrowed eyes", "shoulders slumped, staring at floor", "wide grin, arms spread"
- Vary camera angles dramatically: extreme close-up (for intensity), wide shot (for reveals), low angle (for power), over-shoulder, bird's eye
- Every page after page 1 MUST have a "transitionNote" explaining how we got here
- Use 4-6 different locations minimum across the book
- The protagonist should NOT appear on every single page

COPYRIGHT PROTECTION:
If ANY character names match famous characters from existing media, rename them to original names.
Create 100% original visual descriptions - no copyrighted costumes, logos, or signature elements.

CONCISE OUTPUT:
- Scene descriptions: MAX 25 words
- Character actions: MAX 12 words per character
- Background: MAX 15 words
- Complete the ENTIRE JSON - do not stop mid-response

Output ONLY valid JSON with EXACTLY ${bookData.targetChapters} chapters:
{
  "chapters": [
    {
      "number": 1,
      "title": "Page title",
      "text": "Brief narration if needed, otherwise empty string",
      "summary": "What happens on this page (1 sentence)",
      "targetWords": 40,
      "panelLayout": "splash",
      "dialogue": [
        {"speaker": "Character", "text": "Their exact line from the script", "position": "top-left", "type": "speech"}
      ],
      "scene": {
        "location": "Specific place",
        "transitionNote": "How we got here (required for pages 2+)",
        "description": "What's happening - action focused",
        "characters": ["Characters in this scene"],
        "characterActions": {
          "Character1": "PHYSICAL action: clenched fists, leaning forward",
          "Character2": "PHYSICAL action: backing away, hands raised"
        },
        "background": "Time of day, weather, key objects",
        "mood": "emotional tone",
        "cameraAngle": "specific angle: extreme close-up, wide shot, etc."
      }
    }
  ]
}`;

  const result = await getGeminiPro().generateContent(prompt);
  const response = result.response.text();
  const parsed = parseJSONFromResponse(response) as ScenePlan;

  console.log(`[ComicPipeline] Step 2 DIRECTOR complete - ${parsed.chapters?.length || 0} scenes planned`);
  return parsed;
}

// ============================================================================
// STEP 3: EDITOR - Quality review pass
// ============================================================================

async function reviewQuality(
  scenePlan: ScenePlan,
  script: ComicScript,
  bookData: {
    title: string;
    genre: string;
    targetChapters: number;
    characters: ComicCharacter[];
  }
): Promise<ScenePlan> {
  // Build a summary of the scene plan for review
  const planSummary = scenePlan.chapters.map(ch => {
    const dialogueText = ch.dialogue?.map(d => `${d.speaker}: "${d.text}"`).join(' | ') || '(no dialogue)';
    return `PAGE ${ch.number} [${ch.panelLayout || 'splash'}]: ${ch.scene?.description || ch.summary || 'no description'}\n  Dialogue: ${dialogueText}`;
  }).join('\n\n');

  const characterNames = bookData.characters.map(c => c.name);

  const prompt = `You are a comic book editor reviewing a ${bookData.targetChapters}-page comic before it goes to the artist.

TITLE: "${bookData.title}"
GENRE: ${bookData.genre}
CHARACTERS: ${characterNames.join(', ')}

CHARACTER VOICE PROFILES:
${script.voiceProfiles.map(vp => `- ${vp.name}: ${vp.voiceStyle}. Default mood: ${vp.emotionalDefault}. Example: "${vp.speechExample}"`).join('\n')}

CURRENT PAGE PLAN:
${planSummary}

REVIEW CHECKLIST - Find and fix these problems:

1. STORY COHERENCE:
   - Does page 1→2→3→...→${bookData.targetChapters} tell a coherent story?
   - Does each page follow from the previous one (cause→effect)?
   - Are there any "teleportation" jumps where characters appear somewhere without explanation?
   - Is there a clear beginning, rising action, climax, and resolution?

2. DIALOGUE QUALITY:
   - Do all characters sound DIFFERENT from each other? (compare their lines)
   - Is any dialogue generic/robotic? ("I need you to understand", "Here's the thing")
   - Does any character state their emotions directly? ("I'm angry!", "I feel sad")
   - Is there meaningful back-and-forth, or just characters making statements?

3. PACING:
   - Are panel layouts varied (not same layout 3x in a row)?
   - Are there too many dialogue-heavy pages in a row without action?
   - Does the climax get a splash page or dramatic layout?

4. VISUAL VARIETY:
   - Are camera angles varied? (not all "medium shot")
   - Are there enough different locations? (minimum 4)
   - Do characterActions use PHYSICAL descriptions, not emotional labels?

If there are issues, fix them by outputting a revised "chapters" array.
If the plan is good, output it unchanged.

Output ONLY valid JSON:
{
  "passed": true/false,
  "issues": [
    {"page": 3, "issue": "Character teleports from forest to castle with no transition", "fix": "Added transition note"},
    {"page": 7, "issue": "Both characters say 'I need you to understand' - generic AI dialogue", "fix": "Rewrote to match voice profiles"}
  ],
  "chapters": [the full revised chapters array with all ${bookData.targetChapters} pages - whether changed or not]
}`;

  try {
    const result = await getGeminiFlash().generateContent(prompt);
    const response = result.response.text();
    const review = parseJSONFromResponse(response) as QualityReview;

    if (review.issues && review.issues.length > 0) {
      console.log(`[ComicPipeline] Step 3 EDITOR found ${review.issues.length} issues:`);
      for (const issue of review.issues) {
        console.log(`  - Page ${issue.page}: ${issue.issue} → ${issue.fix}`);
      }
    } else {
      console.log(`[ComicPipeline] Step 3 EDITOR - quality check passed`);
    }

    // Use the revised chapters if provided, otherwise keep original
    if (review.chapters && review.chapters.length === bookData.targetChapters) {
      return { chapters: review.chapters };
    } else if (review.chapters && review.chapters.length > 0) {
      console.warn(`[ComicPipeline] Editor returned ${review.chapters.length} chapters instead of ${bookData.targetChapters}, using original`);
    }

    return scenePlan;
  } catch (error) {
    // Quality review is non-critical - if it fails, use the original plan
    console.warn(`[ComicPipeline] Step 3 EDITOR failed (non-critical), using original plan:`, error);
    return scenePlan;
  }
}

// ============================================================================
// MAIN PIPELINE - Orchestrates all steps
// ============================================================================

export async function generateComicOutline(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  originalIdea?: string;
  characters: { name: string; description: string }[];
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
  dialogueStyle: 'prose' | 'bubbles';
  contentRating?: ContentRating;
  characterVisualGuide?: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
    }>;
  };
}): Promise<{ chapters: VisualChapter[] }> {

  console.log(`[ComicPipeline] Starting 4-step comic generation for "${bookData.title}" (${bookData.targetChapters} pages)`);
  const pipelineStart = Date.now();

  // ── Step 1: WRITER ──
  console.log('[ComicPipeline] Step 1: WRITER - Generating comic script with character voices...');
  const step1Start = Date.now();

  const script = await generateComicScript({
    title: bookData.title,
    genre: bookData.genre,
    premise: bookData.premise,
    originalIdea: bookData.originalIdea,
    characters: bookData.characters,
    beginning: bookData.beginning,
    middle: bookData.middle,
    ending: bookData.ending,
    targetChapters: bookData.targetChapters,
    contentRating: bookData.contentRating,
  });

  console.log(`[ComicPipeline] Step 1 took ${Date.now() - step1Start}ms`);

  // Validate script output
  if (!script.script || script.script.length < 200) {
    console.error('[ComicPipeline] Script too short, falling back to single-step generation');
    throw new Error('Comic script generation produced insufficient content');
  }

  // ── Step 2: DIRECTOR ──
  console.log('[ComicPipeline] Step 2: DIRECTOR - Planning scenes and visual direction...');
  const step2Start = Date.now();

  const scenePlan = await planScenes(script, {
    title: bookData.title,
    genre: bookData.genre,
    targetChapters: bookData.targetChapters,
    characters: bookData.characters,
    contentRating: bookData.contentRating,
    characterVisualGuide: bookData.characterVisualGuide,
  });

  console.log(`[ComicPipeline] Step 2 took ${Date.now() - step2Start}ms`);

  // Validate scene plan
  if (!scenePlan.chapters || scenePlan.chapters.length === 0) {
    throw new Error('Scene planning produced no pages');
  }

  // ── Step 3: EDITOR ──
  console.log('[ComicPipeline] Step 3: EDITOR - Quality review pass...');
  const step3Start = Date.now();

  const finalPlan = await reviewQuality(scenePlan, script, {
    title: bookData.title,
    genre: bookData.genre,
    targetChapters: bookData.targetChapters,
    characters: bookData.characters,
  });

  console.log(`[ComicPipeline] Step 3 took ${Date.now() - step3Start}ms`);

  const totalTime = Date.now() - pipelineStart;
  console.log(`[ComicPipeline] Pipeline complete in ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s) - ${finalPlan.chapters.length} pages`);

  return finalPlan;
}
