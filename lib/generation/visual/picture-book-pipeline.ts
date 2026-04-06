/**
 * Picture Book Generation Pipeline (3-Step)
 *
 * Step 1: WRITER - Generate a complete story with character voices and emotional beats
 * Step 2: DIRECTOR - Break into pages with layout variety, text positioning, and scene direction
 * Step 3: EDITOR - Quality review for visual variety and pacing
 *
 * This replaces the old 2-step approach that produced flat scenes with "text at bottom."
 */

import { getGeminiPro, getGeminiFlash } from '../shared/api-client';
import { parseJSONFromResponse } from '../shared/json-utils';
import { ContentRating, getContentRatingInstructions, detectLanguageInstruction, PUNCTUATION_RULES } from '../shared/writing-quality';
import { buildNameGuidancePrompt } from '../shared/name-variety';
import { VisualChapter, SceneDescription } from './types';

// ============================================================================
// TYPES
// ============================================================================

interface PictureBookCharacter {
  name: string;
  description: string;
}

interface CharacterVoiceProfile {
  name: string;
  role: string;
  personality: string;
  speechStyle: string;
  emotionalArc: string;
}

interface PictureBookStory {
  voiceProfiles: CharacterVoiceProfile[];
  story: string;
  emotionalBeats: string[];
}

// ============================================================================
// STEP 1: WRITER - Generate the story with character depth
// ============================================================================

async function generatePictureBookStory(bookData: {
  title: string;
  genre: string;
  premise: string;
  originalIdea?: string;
  characters: PictureBookCharacter[];
  beginning: string;
  middle: string;
  ending: string;
  targetChapters: number;
  contentRating?: ContentRating;
}): Promise<PictureBookStory> {
  const contentGuidelines = getContentRatingInstructions(bookData.contentRating || 'general');
  const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + bookData.premise);

  const characterList = bookData.characters.map(c => `- ${c.name}: ${c.description}`).join('\n');

  const originalIdeaSection = bookData.originalIdea
    ? `\nORIGINAL AUTHOR VISION (incorporate faithfully):\n${bookData.originalIdea}\n`
    : '';

  const prompt = `You are a children's picture book author known for heartfelt stories with beautiful visual moments. Your job is to write a complete story, page by page, ready to be illustrated.
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

YOUR TASK: Output a JSON object with three parts:

PART 1 - "voiceProfiles": Give each character a DISTINCT personality and way of speaking.
Think about:
- A shy rabbit talks differently than a brave fox
- A grumpy troll sounds different from a cheerful fairy
- Vocabulary, sentence length, verbal quirks, catchphrases
- How they handle stress or excitement differently

PART 2 - "story": Write the FULL story as a PAGE-BY-PAGE visual script.
Each page MUST specify: LOCATION, what we SEE, and what characters SAY/DO.

FORMAT (follow exactly):

PAGE 1:
[Location: Sunny kitchen, morning light streaming through yellow curtains]
Luna stands on tiptoe at the counter, flour on her nose. A bowl of batter wobbles near the edge.
LUNA: "Almost... got it..."
The spoon slips. Batter splashes across the table.

PAGE 2:
[Location: Front porch, bright afternoon]
Luna sits on the steps, chin in her hands. A trail of flour footprints leads out the door behind her.
LUNA: "Maybe pancakes are just too hard."
A shadow falls over her. Old Mr. Badger peers down, holding a whisk.
MR. BADGER: "Hard? Nonsense. You just need the right tool."

=== STORY STRUCTURE RULES (CRITICAL) ===
- Write EXACTLY ${bookData.targetChapters} pages with PAGE markers
- PAGE 1 must CLEARLY introduce the main character and set up the story. The reader should immediately understand who this is about and what is happening. Do not start mid-action or with confusing context.
- THE LAST PAGE (page ${bookData.targetChapters}) must be a CLEAR, SATISFYING ENDING. The story must feel FINISHED. Include a final line that wraps everything up. Do not end mid-scene or on a cliffhanger.
- Each page: 2-4 sentences of story text PLUS at least 1 line of dialogue
- EVERY page starts with [Location: specific place, time of day, key visual detail]
- EVERY page must be a CONSEQUENCE of the previous one (Therefore/But logic)
  BAD: "Luna went to the forest. And then she found a cave. And then she met a bear."
  GOOD: "Luna followed the tracks into the forest. But instead of a deer, she found a cave. Therefore, she crept closer..."

=== LOCATION VARIETY (CRITICAL FOR VISUAL DIVERSITY) ===
- Use AT LEAST ${Math.max(4, Math.floor(bookData.targetChapters * 0.4))} DIFFERENT locations across the story
- NEVER use the same location more than 3 times
- Change something visual EVERY page: different room, different outdoor area, different time of day, different weather
- Example locations: kitchen, garden, riverside, hilltop, bedroom, market, bridge, treehouse, pond, cave, meadow, workshop

=== CHARACTER VARIETY ===
- The protagonist should NOT appear alone on every single page
- Include at least 2-3 pages where supporting characters are prominent
- Show different character GROUPINGS: solo moments, pairs, full group
- Characters should be in DIFFERENT POSES and ACTIONS on every page (never standing still twice)

=== PACING ===
- Characters must have GOALS that drive their actions
- Build REAL tension with stakes the reader cares about
- Include a clear CLIMAX (page ${Math.floor(bookData.targetChapters * 0.75)}-${Math.floor(bookData.targetChapters * 0.85)}) and satisfying RESOLUTION
- Each page should end with a HOOK that makes you want to turn the page

=== DIALOGUE RULES ===
- Include dialogue on at least 70% of pages (this is critical; without text the pages feel empty)
- Each character MUST sound different (use the voice profiles)
- Mix dialogue with narration: "Come on!" called Fox, his tail swishing through the tall grass.
- NEVER have characters state emotions: NO "I'm scared!" YES: She gripped the branch tighter.
- SHOW don't tell: NOT "She was sad" YES "Her ears drooped. She turned away from the window."

BANNED AI DIALOGUE (never write these):
- "I need you to understand..." / "Here's the thing..." / "Let me be clear..."
- "I believe in you" / "You can do this" (show support through actions instead)
- "I feel [emotion]" / "I am [emotion]"
- Any character stating the theme or moral directly

=== VISUAL DIRECTION PER PAGE ===
- Describe what we SEE: physical actions, expressions, body language
- Include environment interaction (climbing trees, splashing puddles, hiding behind things)
- Vary camera perspective: wide shots showing the environment, close-ups on faces, overhead views
- Each page MUST suggest a VISUALLY DISTINCT illustration (different location, different action, different composition)
- If two pages look like they'd produce the same illustration, REWRITE one of them

TARGET: ~${bookData.targetChapters * 35} words for the full story. Quality over quantity.

PART 3 - "emotionalBeats": List the emotional journey, one beat per page.
Example: ["curiosity", "excitement", "worry", "determination", "fear", "courage", "joy", "peace"]

${PUNCTUATION_RULES}

Output ONLY valid JSON:
{
  "voiceProfiles": [
    {
      "name": "Character Name",
      "role": "protagonist/friend/mentor/obstacle",
      "personality": "Core personality traits",
      "speechStyle": "How they talk: vocabulary, tone, verbal quirks, catchphrases",
      "emotionalArc": "How they change through the story"
    }
  ],
  "story": "PAGE 1:\\nThe story begins...\\n\\nPAGE 2:\\nThe story continues...",
  "emotionalBeats": ["curiosity", "wonder", "worry", "courage", "joy"]
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();
  const parsed = parseJSONFromResponse(response) as PictureBookStory;

  console.log(`[PictureBookPipeline] Step 1 WRITER complete - ${parsed.voiceProfiles?.length || 0} voices, story: ${parsed.story?.length || 0} chars, ${parsed.emotionalBeats?.length || 0} beats`);
  return parsed;
}

// ============================================================================
// STEP 2: DIRECTOR - Break into pages with visual direction
// ============================================================================

async function planPages(
  story: PictureBookStory,
  bookData: {
    title: string;
    genre: string;
    targetChapters: number;
    characters: PictureBookCharacter[];
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
): Promise<{ chapters: VisualChapter[] }> {
  const contentGuidelines = getContentRatingInstructions(bookData.contentRating || 'general');
  const languageInstruction = detectLanguageInstruction(bookData.title);

  const characterRef = bookData.characterVisualGuide
    ? bookData.characterVisualGuide.characters.map(c =>
      `${c.name}: ${c.physicalDescription}. Wears: ${c.clothing}. Distinct: ${c.distinctiveFeatures}`
    ).join('\n')
    : bookData.characters.map(c => `${c.name}: ${c.description}`).join('\n');

  const prompt = `You are an art director for a children's picture book. You have a finished story and your job is to break it into exactly ${bookData.targetChapters} illustrated pages with precise visual direction.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
${contentGuidelines}

THE STORY:
---
${story.story}
---

EMOTIONAL JOURNEY:
${story.emotionalBeats?.join(' → ') || 'Build from calm to exciting to warm resolution'}

CHARACTER VISUAL REFERENCES:
${characterRef}

YOUR TASK: Create EXACTLY ${bookData.targetChapters} pages. For each page:

FIRST AND LAST PAGE (CRITICAL):
- PAGE 1 must clearly introduce the main character and set the scene. The reader should immediately understand who this story is about. Use narration that establishes context.
- PAGE ${bookData.targetChapters} (LAST PAGE) must wrap up the story with a clear ending. Include a final line that feels conclusive. The story must feel COMPLETE and FINISHED, not cut off.

1. **text**: The story text for this page (2-4 sentences from the story above). This text appears ON or NEAR the illustration.
2. **textPosition**: WHERE the text goes on the page — this is critical for visual design:
   - "top-banner": Text in a clean band across the top (good for establishing shots)
   - "bottom-banner": Text in a clean band across the bottom (most common)
   - "left-side": Text panel on the left, illustration on the right (dialogue-heavy pages)
   - "right-side": Text panel on the right, illustration on the left
   - "overlay-top": Text overlaid on the illustration with semi-transparent background (dramatic moments)
   - "overlay-center": Centered text over the illustration (title pages, emotional peaks)
   - "minimal": Very short text (1 line) tucked in a corner (action pages, mostly visual)
   - "none": Wordless page — let the illustration tell the story (use 1-2 times max)
3. **scene**: Full visual direction for the illustrator
4. **pageStyle**: The visual treatment:
   - "full-bleed": Illustration fills the entire page (most impactful, use for key moments)
   - "bordered": Illustration with a white/colored border (traditional picture book look)
   - "vignette": Illustration fades to white at edges (gentle, intimate moments)
   - "spot": Smaller illustration on a white page with text around it (text-heavy pages)
   - "spread": This illustration extends across two pages conceptually (big reveals, landscapes)

PAGE LAYOUT PACING (this creates visual rhythm — essential for a good picture book):
- Pages 1-2: "bordered" or "full-bleed" — establish the world
- Pages 3-5: Mix of "full-bleed" and "spot" — build the story
- Middle pages: Vary between all types — keep visual interest
- Climax: "full-bleed" or "spread" — maximum visual impact
- Resolution: "vignette" or "bordered" — gentle, warm ending
- NEVER use the same pageStyle 3 times in a row
- Include at least 1 "spot" page and 1 wordless/minimal-text page

SCENE DIRECTION FOR ILLUSTRATOR:
- Describe what we SEE, not what characters feel
  BAD: "Luna felt nervous about the dark cave"
  GOOD: "Luna peeks around a mossy boulder, one paw gripping the rock. The cave mouth yawns ahead, dark and dripping."

=== VISUAL VARIETY RULES (CRITICAL; DUPLICATE IMAGES = FAILURE) ===

LOCATIONS & SETTINGS:
- Use AT LEAST ${Math.max(4, Math.floor(bookData.targetChapters * 0.4))} DIFFERENT LOCATIONS
- Each location should appear only 2-3 times maximum
- Even within the same location, change the specific area, angle, time of day, or weather
- If two pages have the same location, they MUST have completely different compositions

CAMERA ANGLES (must vary dramatically):
- Wide/establishing shots: at least 3 pages (show full environment)
- Medium shots: characters interacting (but vary left/right/center framing)
- Close-ups: emotional moments, facial expressions (at least 2 pages)
- Bird's eye / overhead view: 1-2 pages (show scale, paths, journeys)
- Low angle (looking up): 1 page (makes characters look powerful or environment imposing)
- NEVER use the same camera angle more than 3 times in a row

CHARACTER VARIETY:
- The protagonist should NOT appear in every single illustration; show supporting characters in 2-3 panels alone
- Vary character groupings: solo, pairs, full group
- Characters must be in DIFFERENT POSES on every page (never standing still or in the same position twice)
- Show characters INTERACTING with the environment: climbing, splashing, hiding, reaching, running, jumping, sitting, lying down

COMPOSITION:
- Each page MUST be visually distinct from every other page
- Alternate character position in frame: left, right, center, foreground, background
- Vary the visual weight: some pages busy and detailed, others simple and spacious
- Include sensory details: lighting (golden hour, moonlight, dappled shade), weather, textures

ANTI-DUPLICATION CHECK:
- Before finalizing each page, mentally compare it to the previous 2 pages
- If a page would produce a similar illustration to a recent page (same location + same character + similar action), CHANGE IT
- This is the #1 quality issue. Every page must look like a unique illustration.

TEXT POSITION RULES:
- Text should NEVER cover the most important part of the illustration
- Position text where it creates natural reading flow (top→illustration→bottom)
- Short text (1 line) → "minimal" or "overlay-top"
- Dialogue-heavy text → "left-side" or "right-side"
- Establishing/mood text → "top-banner"
- Most pages → "bottom-banner" (the classic picture book look)

Output ONLY valid JSON with EXACTLY ${bookData.targetChapters} chapters:
{
  "chapters": [
    {
      "number": 1,
      "title": "Page title (short, evocative)",
      "text": "The story text for this page (2-4 sentences)",
      "textPosition": "bottom-banner",
      "pageStyle": "full-bleed",
      "summary": "What happens on this page (1 sentence)",
      "targetWords": 30,
      "scene": {
        "location": "Specific place with detail",
        "transitionNote": "How we got here (pages 2+)",
        "description": "What the illustrator should draw — action and composition focused",
        "characters": ["Characters visible on this page"],
        "characterActions": {
          "Luna": "crouching behind a log, ears perked, eyes wide"
        },
        "background": "Time of day, weather, key objects, lighting quality",
        "mood": "emotional tone of the illustration",
        "cameraAngle": "wide establishing shot / medium shot / close-up / bird's eye"
      }
    }
  ]
}`;

  const result = await getGeminiPro().generateContent(prompt);
  const response = result.response.text();
  const parsed = parseJSONFromResponse(response) as { chapters: VisualChapter[] };

  console.log(`[PictureBookPipeline] Step 2 DIRECTOR complete - ${parsed.chapters?.length || 0} pages planned`);
  return parsed;
}

// ============================================================================
// STEP 3: EDITOR - Quality review
// ============================================================================

async function reviewPictureBookQuality(
  pagePlan: { chapters: VisualChapter[] },
  story: PictureBookStory,
  bookData: {
    title: string;
    genre: string;
    targetChapters: number;
    characters: PictureBookCharacter[];
  }
): Promise<{ chapters: VisualChapter[] }> {
  const planSummary = pagePlan.chapters.map(ch => {
    const textPreview = (ch.text || '').substring(0, 80);
    return `PAGE ${ch.number} [${(ch as VisualChapter & { pageStyle?: string }).pageStyle || 'full-bleed'}, text: ${(ch as VisualChapter & { textPosition?: string }).textPosition || 'bottom'}]: ${ch.scene?.description || ch.summary || 'no description'}\n  Text: "${textPreview}..."`;
  }).join('\n\n');

  const prompt = `You are a picture book editor reviewing a ${bookData.targetChapters}-page picture book before it goes to the illustrator.

TITLE: "${bookData.title}"
GENRE: ${bookData.genre}

EMOTIONAL ARC:
${story.emotionalBeats?.join(' → ') || 'unknown'}

CURRENT PAGE PLAN:
${planSummary}

REVIEW CHECKLIST (fix ALL issues found):

1. VISUAL VARIETY (MOST IMPORTANT):
   - Are pageStyles varied? (not same style 3x in a row). If not, CHANGE the repeated ones.
   - Are camera angles varied? (not all "medium shot"). If not, CHANGE at least 3 to different angles.
   - Are there enough different locations? (minimum 4). If not, MOVE some scenes to new locations.
   - Is there at least 1 close-up and 1 wide shot? If not, ADD them.
   - Do characters DO things (not just stand/sit)? If not, ADD physical actions.
   - DUPLICATE CHECK: Would any two pages produce a similar illustration (same location + same character + similar pose)? If yes, CHANGE one of them to a different location, angle, or action.

2. TEXT CONTENT:
   - Does every page have text? If any page has empty or missing text, ADD 2-3 sentences from the story.
   - At least 70% of pages must have dialogue. If not enough, ADD character speech.
   - Are textPositions varied? (not all "bottom-banner"). If not, CHANGE some.

3. EMOTIONAL PACING:
   - Does the visual intensity build toward the climax?
   - Is the climax page a "full-bleed" or "spread"?
   - Does the ending feel gentle and satisfying?

4. STORY CLARITY (CRITICAL):
   - Does PAGE 1 clearly introduce the main character and situation? If not, REWRITE the text and scene to make the opening clear.
   - Does PAGE ${bookData.targetChapters} (the LAST page) feel like a real ending? If the story feels cut off or unfinished, REWRITE the last page's text to include a proper conclusion.
   - Can you follow the story from page 1 to ${bookData.targetChapters}?
   - Does each page logically follow from the previous?
   - Are transitions clear? If not, ADD transitionNote to the scene.

You MUST fix all issues and return a corrected "chapters" array. Do NOT return the plan unchanged if there are problems.

Output ONLY valid JSON:
{
  "passed": true/false,
  "issues": [{"page": 3, "issue": "description", "fix": "what you changed"}],
  "chapters": [the full ${bookData.targetChapters}-page array]
}`;

  try {
    const result = await getGeminiFlash().generateContent(prompt);
    const response = result.response.text();
    const review = parseJSONFromResponse(response) as { passed: boolean; issues: Array<{ page: number; issue: string; fix: string }>; chapters?: VisualChapter[] };

    if (review.issues && review.issues.length > 0) {
      console.log(`[PictureBookPipeline] Step 3 EDITOR found ${review.issues.length} issues:`);
      for (const issue of review.issues) {
        console.log(`  - Page ${issue.page}: ${issue.issue} → ${issue.fix}`);
      }
    } else {
      console.log(`[PictureBookPipeline] Step 3 EDITOR - quality check passed`);
    }

    if (review.chapters && review.chapters.length === bookData.targetChapters) {
      return { chapters: review.chapters };
    }

    return pagePlan;
  } catch (error) {
    console.warn(`[PictureBookPipeline] Step 3 EDITOR failed (non-critical):`, error);
    return pagePlan;
  }
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

export async function generatePictureBookOutline(bookData: {
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

  console.log(`[PictureBookPipeline] Starting ${bookData.previewOnly ? 'PREVIEW (5 panels)' : 'FULL'} pipeline for "${bookData.title}" (${targetPanels} pages)`);
  const pipelineStart = Date.now();

  // ── Step 1: WRITER ──
  console.log('[PictureBookPipeline] Step 1: WRITER - Generating story...');
  const step1Start = Date.now();

  const story = await generatePictureBookStory({
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

  console.log(`[PictureBookPipeline] Step 1 took ${Date.now() - step1Start}ms`);

  if (!story.story || story.story.length < 100) {
    throw new Error('Picture book story generation produced insufficient content');
  }

  // ── Step 2: DIRECTOR ──
  console.log('[PictureBookPipeline] Step 2: DIRECTOR - Planning pages...');
  const step2Start = Date.now();

  const pagePlan = await planPages(story, {
    title: bookData.title,
    genre: bookData.genre,
    targetChapters: targetPanels,
    characters: bookData.characters,
    contentRating: bookData.contentRating,
    characterVisualGuide: bookData.characterVisualGuide,
  });

  console.log(`[PictureBookPipeline] Step 2 took ${Date.now() - step2Start}ms`);

  if (!pagePlan.chapters || pagePlan.chapters.length === 0) {
    throw new Error('Page planning produced no pages');
  }

  // ── Step 3: EDITOR (skip for preview - speed matters) ──
  let finalPlan = pagePlan;

  if (!bookData.previewOnly) {
    const elapsedSoFar = Date.now() - pipelineStart;
    if (elapsedSoFar < 120000) {
      console.log('[PictureBookPipeline] Step 3: EDITOR - Quality review...');
      const step3Start = Date.now();

      finalPlan = await reviewPictureBookQuality(pagePlan, story, {
        title: bookData.title,
        genre: bookData.genre,
        targetChapters: targetPanels,
        characters: bookData.characters,
      });

      console.log(`[PictureBookPipeline] Step 3 took ${Date.now() - step3Start}ms`);
    } else {
      console.log(`[PictureBookPipeline] Step 3 EDITOR skipped (${(elapsedSoFar / 1000).toFixed(0)}s elapsed)`);
    }
  } else {
    console.log('[PictureBookPipeline] Step 3 EDITOR skipped (preview mode)');
  }

  // ── Validate and fix scene data ──
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
  console.log(`[PictureBookPipeline] Pipeline complete in ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s) - ${finalPlan.chapters.length} pages`);

  return finalPlan;
}
