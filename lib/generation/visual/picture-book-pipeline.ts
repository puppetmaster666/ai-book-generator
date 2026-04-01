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

  const prompt = `You are a children's picture book author known for heartfelt stories with beautiful visual moments. Write a complete story ready to be illustrated.
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

PART 1 - "voiceProfiles": Give each character a distinct personality and way of speaking.
Think about: how a shy rabbit talks differently than a brave fox, how a grumpy troll sounds different from a cheerful fairy.

PART 2 - "story": Write the FULL story as a flowing narrative.
This is a picture book — every sentence should paint a picture. Think about what the ILLUSTRATION will show.

STORY RULES:
- Write for ${bookData.targetChapters} pages (each page = 2-4 sentences of text)
- Total story: ${bookData.targetChapters * 3} sentences approximately
- Use sensory language: colors, sounds, textures, weather, light
- Mix dialogue with narration: "Come on!" called Fox, his tail swishing through the tall grass.
- SHOW don't tell: NOT "She was sad" → "Her ears drooped. She turned away from the window."
- Create VISUAL CONTRAST between pages: a quiet indoor moment → an action outdoors → a close-up emotional beat
- Build to a satisfying emotional climax and resolution
- Each paragraph should naturally correspond to one illustration
- Include page-turn hooks: end sections with curiosity or suspense

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
      "speechStyle": "How they talk - vocabulary, tone, catchphrases",
      "emotionalArc": "How they change: starts shy → becomes brave"
    }
  ],
  "story": "The full story text, with natural paragraph breaks between pages. Include dialogue mixed with narration.",
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
- Vary camera distances:
  - Wide/establishing shots: show the environment (at least 3 pages)
  - Medium shots: characters interacting (most pages)
  - Close-ups: emotional moments, important details (at least 2 pages)
  - Bird's eye view: show scale, journeys (1-2 pages)
- Include sensory details: lighting (golden hour, moonlight, dappled shade), weather, textures
- Characters should DO things: running, climbing, reaching, hugging — not just standing
- Use 4+ different locations across the book

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

REVIEW CHECKLIST:

1. VISUAL VARIETY:
   - Are pageStyles varied? (not same style 3x in a row)
   - Are camera angles varied? (not all "medium shot")
   - Are there enough different locations? (minimum 4)
   - Is there at least 1 close-up and 1 wide shot?
   - Do characters DO things (not just stand/sit)?

2. TEXT LAYOUT:
   - Are textPositions varied? (not all "bottom-banner")
   - Is there at least 1 "minimal" or wordless page?
   - Does text position match the illustration composition?

3. EMOTIONAL PACING:
   - Does the visual intensity build toward the climax?
   - Is the climax page a "full-bleed" or "spread"?
   - Does the ending feel gentle and satisfying?
   - Are there quiet moments between exciting ones?

4. STORY CLARITY:
   - Can you follow the story from illustrations alone?
   - Does each page logically follow from the previous?
   - Are transitions clear?

Fix any issues by outputting a revised "chapters" array. If everything looks good, return it unchanged.

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
  characterVisualGuide?: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
    }>;
  };
}): Promise<{ chapters: VisualChapter[] }> {

  console.log(`[PictureBookPipeline] Starting 3-step pipeline for "${bookData.title}" (${bookData.targetChapters} pages)`);
  const pipelineStart = Date.now();

  // ── Step 1: WRITER ──
  console.log('[PictureBookPipeline] Step 1: WRITER - Generating story with character depth...');
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
    targetChapters: bookData.targetChapters,
    contentRating: bookData.contentRating,
  });

  console.log(`[PictureBookPipeline] Step 1 took ${Date.now() - step1Start}ms`);

  if (!story.story || story.story.length < 100) {
    throw new Error('Picture book story generation produced insufficient content');
  }

  // ── Step 2: DIRECTOR ──
  console.log('[PictureBookPipeline] Step 2: DIRECTOR - Planning pages with visual direction...');
  const step2Start = Date.now();

  const pagePlan = await planPages(story, {
    title: bookData.title,
    genre: bookData.genre,
    targetChapters: bookData.targetChapters,
    characters: bookData.characters,
    contentRating: bookData.contentRating,
    characterVisualGuide: bookData.characterVisualGuide,
  });

  console.log(`[PictureBookPipeline] Step 2 took ${Date.now() - step2Start}ms`);

  if (!pagePlan.chapters || pagePlan.chapters.length === 0) {
    throw new Error('Page planning produced no pages');
  }

  // ── Step 3: EDITOR ──
  const elapsedSoFar = Date.now() - pipelineStart;
  let finalPlan = pagePlan;

  if (elapsedSoFar < 120000) {
    console.log('[PictureBookPipeline] Step 3: EDITOR - Quality review...');
    const step3Start = Date.now();

    finalPlan = await reviewPictureBookQuality(pagePlan, story, {
      title: bookData.title,
      genre: bookData.genre,
      targetChapters: bookData.targetChapters,
      characters: bookData.characters,
    });

    console.log(`[PictureBookPipeline] Step 3 took ${Date.now() - step3Start}ms`);
  } else {
    console.log(`[PictureBookPipeline] Step 3 EDITOR skipped (${(elapsedSoFar / 1000).toFixed(0)}s elapsed)`);
  }

  // ── Validate and fix scene data ──
  finalPlan.chapters = finalPlan.chapters.map((ch, idx) => {
    if (!ch.scene) {
      ch.scene = {
        location: 'unspecified',
        description: ch.summary || ch.text || `Page ${idx + 1}`,
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
