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

import { getGeminiPro, getGeminiFlash, generateTextWithProvider } from '../shared/api-client';
import { parseJSONFromResponse } from '../shared/json-utils';
import { ContentRating, getContentRatingInstructions, detectLanguageInstruction, PUNCTUATION_RULES } from '../shared/writing-quality';
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

STORY STRUCTURE (CRITICAL - the reader must understand the story from page 1 to page ${bookData.targetChapters}):
- PAGE 1 must be a CLEAR OPENING that establishes who the main character is, where they are, and what is happening. The reader should immediately understand the setup. Do not start mid-action or with confusing context.
- THE LAST PAGE (page ${bookData.targetChapters}) must be a CLEAR ENDING with a punchline, conclusion, or final moment. The story must feel FINISHED, not cut off mid-scene. The reader should think "that was a complete story."
- Write for exactly ${bookData.targetChapters} pages (roughly, the director will finalize page breaks)
- Every scene must be a CONSEQUENCE of the previous one (Therefore/But logic, never "And then")
- Build real tension with stakes the reader cares about
- Characters must have goals that drive their actions - no "just because the plot needs it"
- Include a clear climax and satisfying resolution
- The story should make sense if you read just the dialogue aloud${bookData.targetChapters <= 12 ? `

CONDENSED FORMAT (${bookData.targetChapters} PAGES ONLY - CRITICAL PACING):
- Pages 1-2: SETUP. Introduce the character and establish who they are. The reader must care (or love to hate them) by page 2.
- Pages 3-${Math.floor(bookData.targetChapters * 0.75)}: ESCALATION. Each page must show a DIFFERENT situation that builds on the last. Never repeat the same type of scene twice. Vary locations, characters involved, and the nature of the conflict/humor.
- Pages ${Math.floor(bookData.targetChapters * 0.75) + 1}-${bookData.targetChapters}: CLIMAX + ENDING. The biggest moment, then a satisfying conclusion or final twist.
- With limited pages, EVERY page must advance the story. No filler, no repeated jokes, no scenes that could be cut without losing anything.
- Each page should feel like a mini-chapter: setup within the page, a beat, then a hook to the next page.` : ''}

DIALOGUE & NARRATION (CRITICAL - readers need text to follow the story):
- EVERY page must have EITHER dialogue OR narration OR both. NO silent pages with only SFX.
- Each character MUST sound different (use the voice profiles)
- Aim for 2-4 speech bubbles per page on dialogue-heavy pages
- Include NARRATION BOXES on at least 60% of pages. These are the narrator's voice:
  NARRATION: "Three hours earlier, before everything went wrong..."
  NARRATION: "The city had never felt so quiet."
  NARRATION: "She didn't know it yet, but this was the last time she'd see him."
- Narration boxes set the scene, provide context, show time passing, and guide the reader
- Dialogue reveals character - what they say AND what they avoid saying
- NEVER have characters state emotions: NO "I'm so angry!" YES: "You knew. This whole time."
- Sound effects (SFX) are fine but NEVER as the only text on a page - always pair with dialogue or narration

BANNED AI DIALOGUE:
Never write these robotic patterns:
- "I need you to understand..." / "Here's the thing..." / "Let me be clear..."
- "I have to tell you something..." / "The truth is..." / "You need to know that..."
- "I feel [emotion]" / "I am [emotion]" (show through actions instead)

ACTION & VISUAL DIRECTION:
- Write what we SEE: physical actions, expressions, body language
- Use specific verbs: "slams", "flinches", "grips" - not "reacts" or "responds"
- Include environment interaction (leaning on walls, kicking debris, gripping railings)
- SFX are welcome where they add energy (CRASH!, WHOOSH!, BANG!) - use them naturally
- Each page should end with a hook that makes you want to turn the page

TARGET: ${bookData.targetChapters <= 12 ? '~800-1200 words for the full script. With only ' + bookData.targetChapters + ' pages, every page must count. Keep dialogue punchy (1-2 bubbles per page), use narration to move the story fast, and never repeat a joke or scene.' : '~1500-2000 words for the full script. Quality over quantity - a tight, well-paced story beats a padded one.'}
${PUNCTUATION_RULES}

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

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text() || '';
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

FIRST AND LAST PAGE RULES (CRITICAL):
- PAGE 1 MUST set up the story clearly. The narration and scene should establish WHO the main character is and WHAT is about to happen. The reader should not be confused. Use a "splash" layout for impact.
- PAGE ${bookData.targetChapters} (THE LAST PAGE) MUST feel like a clear ending. It needs a final punchline, conclusion, or closing moment. The narration should feel like a final statement. Use a "splash" layout. The story must feel COMPLETE, not abruptly cut off.
- If the script does not have a clear ending, WRITE ONE. Add a final narration line that closes the story.

1. **text**: NARRATION BOX text — the narrator's voice that guides the reader. This is CRITICAL for readability.
   - PAGE 1 MUST have narration that introduces the character/situation
   - PAGE ${bookData.targetChapters} MUST have narration that wraps up/concludes the story
   - Use narration on at least 60% of pages (${Math.ceil(bookData.targetChapters * 0.6)}+ pages out of ${bookData.targetChapters})
   - Narration sets context: "Three hours earlier...", "The city had changed since the war.", "She ran. She didn't look back."
   - Narration bridges scenes: "Meanwhile, across town...", "By the time they arrived, it was too late."
   - Narration adds emotional depth: "He wanted to say something. Anything. But the words wouldn't come."
   - Keep narration to 1-2 sentences per page (concise but meaningful)
   - Pages with NO dialogue MUST have narration — never leave a page with only SFX
2. **dialogue**: Extract the dialogue from the script for this page. Assign bubble positions.
3. **scene**: Full visual direction for the artist
4. **panelLayout**: How to divide the page

DIALOGUE RULES:
- Pull dialogue DIRECTLY from the script - do NOT rewrite or invent new lines
- Max 4 speech bubbles per page
- If a page has more dialogue in the script, split across pages or cut the weakest lines
- Position bubbles logically: speakers on the left get left positions, right get right
- Reading order: top-to-bottom, left-to-right
- At least 18 of ${bookData.targetChapters} pages should have dialogue OR narration with meaningful text

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
- EVERY page must show a UNIQUE moment. NEVER repeat the same scene, dialogue, or narration across pages. If page 1 introduces the character, page 8 must show something completely different.

COPYRIGHT PROTECTION:
If ANY character names match famous characters from existing media, rename them to original names.
Create 100% original visual descriptions - no copyrighted costumes, logos, or signature elements.

OUTPUT LENGTH:
- Scene descriptions: 30-50 words. Be specific about what is physically happening in the scene, what objects are visible, and what the characters are doing. Vague descriptions produce bad images.
- Character actions: 15-25 words per character. Describe their POSE, EXPRESSION, and what they are physically doing.
- Background: 20-30 words. Include time of day, lighting, key objects in the environment, and atmosphere.
- Location: Be SPECIFIC. Not "a room" but "a cramped studio apartment with takeout containers on the counter and clothes piled on a chair."
- Complete the ENTIRE JSON - do not stop mid-response

Output ONLY valid JSON with EXACTLY ${bookData.targetChapters} chapters:
{
  "chapters": [
    {
      "number": 1,
      "title": "Page title",
      "text": "The city hadn't slept in three days. Neither had she.",
      "summary": "What happens on this page (1 sentence)",
      "targetWords": 40,
      "panelLayout": "splash",
      "dialogue": [
        {"speaker": "Character", "text": "Their exact line from the script", "position": "top-left", "type": "speech"}
      ],
      "scene": {
        "location": "Cramped studio apartment with takeout containers on the counter and laundry piled on a chair",
        "transitionNote": "How we got here from the previous page (required for pages 2+)",
        "description": "Character sits on the edge of a worn couch, hunched over a laptop, surrounded by empty coffee cups. A phone screen on the armrest shows 12 unread messages. The room is dimly lit by the laptop glow.",
        "characters": ["Characters in this scene"],
        "characterActions": {
          "Character1": "slouching forward, bags under eyes, one hand rubbing forehead, mouth slightly open in disbelief",
          "Character2": "leaning in doorframe with arms crossed, eyebrows raised, smirking"
        },
        "background": "Late night, blue-white laptop glow illuminating the room, empty pizza box on floor, curtains drawn",
        "mood": "emotional tone",
        "cameraAngle": "specific angle: extreme close-up, wide shot, etc."
      }
    }
  ]
}`;

  const result = await getGeminiPro().generateContent(prompt);
  const response = result.response.text() || '';
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
    contentRating?: ContentRating;
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

1. CLEAR OPENING AND ENDING (MOST IMPORTANT):
   - Does PAGE 1 clearly introduce the main character and situation? Would a reader immediately understand who this is about and what is happening? If not, rewrite page 1's narration and scene to establish context.
   - Does PAGE ${bookData.targetChapters} (the LAST page) feel like a real ending? Is there a final punchline, conclusion, or closing moment? If the story feels cut off or unfinished, add a proper ending with closing narration.
   - Page 1 and page ${bookData.targetChapters} MUST both have narration text.

2. STORY COHERENCE:
   - Does page 1→2→3→...→${bookData.targetChapters} tell a coherent story?
   - Does each page follow from the previous one (cause→effect)?
   - Are there any "teleportation" jumps where characters appear somewhere without explanation?
   - Can a reader follow the story without being confused?

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

5. DUPLICATE DETECTION (CRITICAL):
   - Compare every page against every other page. Do ANY two pages have similar dialogue, narration, or scene descriptions?
   - Each page MUST show a DIFFERENT moment in the story. No filler or repeated content.
   - If two pages have the same or very similar text/dialogue, REWRITE one of them to advance the story differently.
   - Check specifically: page 1 vs later pages, and adjacent pages vs each other.

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
    const editorResult = await getGeminiFlash().generateContent(prompt);
    const response = editorResult.response.text() || '';
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
  previewOnly?: boolean; // Phase 1: quick 5-panel outline for free preview
  characterVisualGuide?: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
    }>;
  };
}): Promise<{ chapters: VisualChapter[] }> {

  const previewPanels = 5;
  const targetPanels = bookData.previewOnly ? previewPanels : bookData.targetChapters;

  console.log(`[ComicPipeline] Starting ${bookData.previewOnly ? 'PREVIEW (5 panels)' : 'FULL'} comic generation for "${bookData.title}" (${targetPanels} pages)`);
  const pipelineStart = Date.now();

  // ── Step 1: WRITER ──
  console.log('[ComicPipeline] Step 1: WRITER - Generating comic script...');
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
    targetChapters: targetPanels,
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
    targetChapters: targetPanels,
    characters: bookData.characters,
    contentRating: bookData.contentRating,
    characterVisualGuide: bookData.characterVisualGuide,
  });

  console.log(`[ComicPipeline] Step 2 took ${Date.now() - step2Start}ms`);

  // Validate scene plan
  if (!scenePlan.chapters || scenePlan.chapters.length === 0) {
    throw new Error('Scene planning produced no pages');
  }

  // ── Step 3: EDITOR (skip for preview - speed matters) ──
  let finalPlan = scenePlan;

  if (!bookData.previewOnly) {
    const elapsedSoFar = Date.now() - pipelineStart;
    if (elapsedSoFar < 120000) {
      console.log('[ComicPipeline] Step 3: EDITOR - Quality review pass...');
      const step3Start = Date.now();

      finalPlan = await reviewQuality(scenePlan, script, {
        title: bookData.title,
        genre: bookData.genre,
        targetChapters: targetPanels,
        characters: bookData.characters,
        contentRating: bookData.contentRating,
      });

      console.log(`[ComicPipeline] Step 3 took ${Date.now() - step3Start}ms`);
    } else {
      console.log(`[ComicPipeline] Step 3: EDITOR skipped (${(elapsedSoFar / 1000).toFixed(0)}s elapsed)`);
    }
  } else {
    console.log('[ComicPipeline] Step 3: EDITOR skipped (preview mode)');
  }

  // ── Validate scene data ──
  // Ensure every chapter has a proper scene object (prevents frontend crashes)
  finalPlan.chapters = finalPlan.chapters.map((ch, idx) => {
    if (!ch.scene || typeof ch.scene === 'string') {
      const sceneStr = typeof ch.scene === 'string' ? ch.scene : '';
      ch.scene = {
        location: 'unspecified',
        description: sceneStr || ch.summary || ch.text || `Page ${idx + 1}`,
        characters: bookData.characters.map(c => c.name),
        characterActions: {},
        background: 'default setting',
        mood: 'neutral',
        cameraAngle: 'medium shot',
      };
    }
    // Ensure required scene fields exist
    if (!ch.scene.description) ch.scene.description = ch.summary || `Page ${idx + 1}`;
    if (!ch.scene.characters) ch.scene.characters = [];
    if (!ch.scene.characterActions) ch.scene.characterActions = {};
    if (!ch.scene.background) ch.scene.background = 'default';
    if (!ch.scene.mood) ch.scene.mood = 'neutral';
    if (!ch.scene.cameraAngle) ch.scene.cameraAngle = 'medium shot';
    if (!ch.scene.location) ch.scene.location = 'unspecified';
    return ch;
  });

  const totalTime = Date.now() - pipelineStart;
  console.log(`[ComicPipeline] Pipeline complete in ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s) - ${finalPlan.chapters.length} pages`);

  return finalPlan;
}
