import { getGeminiPro } from '../shared/api-client';
import { parseJSONFromResponse } from '../shared/json-utils';
import { ContentRating, getContentRatingInstructions, detectLanguageInstruction } from '../shared/writing-quality';
import { buildNameGuidancePrompt, BANNED_OVERUSED_NAMES } from '../shared/name-variety';
import { VisualChapter } from './types';

// Step 1: Generate a complete narrative story FIRST
// This ensures the story is coherent before breaking into pages
async function generateVisualStoryNarrative(bookData: {
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
  targetChapters: number;
  dialogueStyle: 'prose' | 'bubbles';
  contentRating?: ContentRating;
}): Promise<string> {
  const isComicStyle = bookData.dialogueStyle === 'bubbles';
  const targetWords = bookData.targetChapters * (isComicStyle ? 30 : 50); // Shorter for comics

  // Get content rating instructions
  const contentGuidelines = getContentRatingInstructions(bookData.contentRating || (isComicStyle ? 'general' : 'childrens'));

  // Detect language from title and premise
  const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + bookData.premise);

  const characterList = bookData.characters.map(c => `- ${c.name}: ${c.description}`).join('\n');

  const originalIdeaSection = bookData.originalIdea
    ? `\nORIGINAL AUTHOR VISION (incorporate these specific details):\n${bookData.originalIdea}\n`
    : '';

  const prompt = `You are a master storyteller. Write a complete, engaging ${isComicStyle ? 'action-packed' : 'heartwarming'} short story.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
${contentGuidelines}
${originalIdeaSection}

STORY REQUIREMENTS:
Title: "${bookData.title}"
Genre: ${bookData.genre}
Premise: ${bookData.premise}

CHARACTERS:
${characterList}

STORY STRUCTURE (follow this arc):
- Beginning: ${bookData.beginning}
- Middle: ${bookData.middle}
- Ending: ${bookData.ending}

CRITICAL WRITING GUIDELINES:
1. Write a COMPLETE story with a clear beginning, middle, climax, and resolution
2. Show character growth and emotional moments
3. Include specific dialogue exchanges between characters (at least 5-8 distinct dialogue moments)
4. Create VISUAL action scenes that can be illustrated (describe what characters DO, not just think)
5. Vary the locations/settings throughout the story (at least 3-4 different places)
6. Build tension and release it satisfyingly
7. Make each scene distinct and memorable
8. NO repetitive phrases or descriptions
9. Every paragraph should move the story forward
10. Include sensory details (sights, sounds, feelings)

${buildNameGuidancePrompt(bookData.premise, bookData.title, bookData.genre)}

${isComicStyle ? `
COMIC-STYLE REQUIREMENTS:
- More action, less internal monologue
- Snappy, punchy dialogue (each line under 15 words)
- Visual comedy and dramatic moments
- Clear action beats that translate to panels
- Sound effects where appropriate (CRASH! WHOOSH! etc.)

=== CAUSAL CHAIN LOGIC (CRITICAL FOR STORY SENSE) ===
- NEVER use "And then" logic where scenes just happen in sequence
- Every scene MUST follow "Therefore/But" structure:
  * "Action A happens, THEREFORE Action B must happen. BUT a new obstacle arises, THEREFORE Action C occurs."
- MOTIVATION ANCHOR: Every character action must be driven by their established "Want" or "Internal Conflict"
- If a character does something "just because the plot needs it," readers will feel it's nonsense
- Each scene must be a CONSEQUENCE of the previous one - cause and effect chain
- Ask: "Why does this scene happen?" The answer must come from the previous scene.

=== DIALOGUE SUBTEXT (CRITICAL) ===
- Characters must NEVER state their internal emotions directly (NO "I am angry", "I feel sad")
- Instead, use sarcasm, evasion, deflection, or silence to convey emotional states
- Show emotions through ACTIONS: gripping a glass tightly, turning away, forced laughter
- Subtext makes dialogue feel REAL - what characters say vs. what they mean should differ
- Example BAD: "I'm so scared right now!"
- Example GOOD: "It's fine. Everything's fine." (while hands tremble)

=== THE 50/50 RULE ===
- If the IMAGE shows an action (falling, fighting, running), the DIALOGUE should NOT describe that action
- Instead, dialogue should show the REACTION, a different topic, or be completely silent
- Bad: Character falls, says "I'm falling!"
- Good: Character falls, says "GRAB THE LEDGE!" or just "NO!"

=== BANNED AI-ISMS (FORBIDDEN PHRASES) ===
Never use these robotic AI dialogue patterns:
- "I need you to understand..."
- "Here's the thing..."
- "Let me be clear..."
- "I have to tell you something..."
- "You need to know that..."
- "The truth is..."
- "Can we talk about..."
These make dialogue feel artificial. Use natural speech instead.

=== VISUAL PERFORMANCE ===
- Describe what characters DO to show emotion, not how they "feel"
- Physical descriptions: "clenched jaw", "narrowed eyes", "shoulders slumped"
- Characters should interact with their environment (leaning, fidgeting, pacing)

=== PAGE TURN MOMENTUM ===
- Each story segment should end with a hook that demands the next page
- Use questions, reveals, arrivals, or visual cliffhangers
` : `
PICTURE BOOK REQUIREMENTS:
- Gentle, flowing prose suitable for reading aloud
- Rhythmic language when appropriate
- Clear emotional beats for young readers
- Wonder and discovery moments
- Satisfying, affirming ending
`}

TARGET LENGTH: ${targetWords}-${targetWords + 200} words (this will be broken into ${bookData.targetChapters} pages)

Write the complete story now. Make it engaging, unique, and memorable. Include actual dialogue with quotation marks.`;

  const result = await getGeminiPro().generateContent(prompt);
  const story = result.response.text().trim();

  console.log(`Generated narrative story: ${story.split(/\s+/).length} words`);
  return story;
}

// Generate outline for visual books (picture books, comics)
// Uses a TWO-STEP approach:
// 1. First generates a complete narrative story
// 2. Then breaks that story into pages with scenes and dialogue
export async function generateIllustratedOutline(bookData: {
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
  contentRating?: ContentRating; // Content maturity level
  characterVisualGuide?: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
    }>;
  };
}): Promise<{
  chapters: VisualChapter[];
}> {
  // STEP 1: Generate a complete narrative story FIRST
  // This ensures the story is coherent, engaging, and well-structured
  console.log('[IllustratedOutline] Step 1: Generating complete narrative story...');
  let narrativeStory: string;
  try {
    narrativeStory = await generateVisualStoryNarrative({
      title: bookData.title,
      genre: bookData.genre,
      bookType: bookData.bookType,
      premise: bookData.premise,
      originalIdea: bookData.originalIdea,
      characters: bookData.characters,
      beginning: bookData.beginning,
      middle: bookData.middle,
      ending: bookData.ending,
      writingStyle: bookData.writingStyle,
      targetChapters: bookData.targetChapters,
      dialogueStyle: bookData.dialogueStyle,
      contentRating: bookData.contentRating,
    });
    console.log('[IllustratedOutline] Step 1 complete - story generated');
  } catch (storyError) {
    console.error('[IllustratedOutline] Failed to generate narrative story:', storyError);
    // Fall back to old behavior if story generation fails
    narrativeStory = '';
  }

  // STEP 2: Break the story into pages with scenes and dialogue
  console.log('[IllustratedOutline] Step 2: Breaking story into pages with scenes...');

  // Detect language from title and premise
  const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + bookData.premise);

  const isComicStyle = bookData.dialogueStyle === 'bubbles';
  const wordsPerPage = Math.ceil(bookData.targetWords / bookData.targetChapters);

  // Get content rating instructions
  const contentGuidelines = getContentRatingInstructions(bookData.contentRating || (isComicStyle ? 'general' : 'childrens'));

  const dialogueInstructions = isComicStyle
    ? `
For each page, include "dialogue" array with speech bubbles:
- 1-4 dialogue entries per page (short, punchy comic dialogue)
- Each entry has: speaker (character name), text (the speech), position (where on image), type (speech/thought/shout)
- Positions: "top-left", "top-right", "bottom-left", "bottom-right", "top-center", "bottom-center"
- Comic dialogue is SHORT - max 15 words per bubble

PANEL LAYOUTS - IMPORTANT FOR COMICS:
Each page should specify a "panelLayout" to vary the visual pacing:
- "splash" - Full page single image (use for dramatic moments: 4-5 pages)
- "two-panel" - Split into 2 panels showing a sequence (most common: 8-10 pages)
- "three-panel" - 3 panels showing action/reaction (good for dialogue: 5-6 pages)
- "four-panel" - 4 panels for rapid sequences (action scenes: 3-4 pages)

For multi-panel pages, the scene description should describe what happens ACROSS all panels in sequence.
Example: "Panel 1: Hero spots danger. Panel 2: Hero leaps into action. Panel 3: Villain turns in surprise."

=== VISUAL PERFORMANCE (ACTING) ===
- NO EMOTIONAL LABELS: In "characterActions", use physical descriptions NOT emotional labels.
  BAD: "angry", "sad", "happy"
  GOOD: "clenched jaw, narrowed eyes", "shoulders slumped, gaze fixed on floor", "wide grin, eyes crinkled"
- MICRO-EXPRESSIONS: Describe specific facial muscle movements and body language.
- INTERACTIVE SETTINGS: Characters should interact with the environment (leaning against a pillar, kicking a stone, gripping a glass).
- CAMERA ANGLES: Vary angles for dramatic effect. Low angles = power/threat. High angles = vulnerability. Extreme close-ups = secrets/intensity.

=== PAGE TURN HOOKS ===
- The FINAL panel of every page MUST end on a micro-cliffhanger, a question, or a visual hook.
- Examples: A shadow appearing behind a character, a hand reaching for something, a character's expression shifting, an unexpected arrival.
- This creates rhythm and urgency - readers MUST turn the page.

=== GUTTER LOGIC (TRANSITIONS BETWEEN PAGES) ===
- The "gutter" is the space between panels/pages - readers fill in missing action here
- For EVERY page after page 1, include a "transitionNote" explaining how characters got here
- If a character is in a NEW location, the first panel MUST be an establishing shot
- Bad: Page 1 shows kitchen, Page 2 shows forest with no explanation
- Good: Page 2's first panel shows character walking into forest, or a transition note: "After breakfast, they set out..."
- This prevents the "teleportation" problem where characters jump between scenes nonsensically

=== CAUSAL CHAIN (THEREFORE/BUT) ===
- NEVER use "And then" logic - scenes must connect causally
- Each page's events must be a CONSEQUENCE of the previous page
- Structure: "Page A happens, THEREFORE Page B. BUT obstacle arises, THEREFORE Page C."
- Every character action must be driven by their established want/goal

=== BANNED AI-ISMS ===
NEVER use these robotic dialogue patterns:
- "I need you to understand...", "Here's the thing...", "Let me be clear..."
- "I have to tell you something...", "The truth is..."
- "You need to know that...", "Can we talk about..."
Use natural, subtext-driven speech instead.

=== SOUND EFFECTS (SFX) ===
- Include SFX where they add kinetic energy: CRASH!, WHOOSH!, ZAP!, THWACK!
- Describe the typography style: "Jagged, electric-yellow 'ZAP!'", "Bold red 'CRASH!' with debris fragments"
- SFX should integrate with the action, not float in corners.

=== PANEL VARIETY ENFORCEMENT (CRITICAL) ===
- NEVER use the same panel layout 3 times in a row
- Vary panel counts across the comic: splash → three-panel → two-panel → four-panel
- Action sequences should ACCELERATE panel count (2→3→4 panels)
- Emotional moments should DECELERATE (4→2→splash)
- Every 4-5 pages MUST include at least one splash page
- Track your layout usage and vary it consciously

=== VISUAL TIC WARNING (CODE ENFORCED) ===
These physical actions are LIMITED across the comic:
- Crossed arms: Max 3x total (AVOID - it's defensive and overused)
- Clenched fists: Max 4x total
- Pointing fingers: Max 3x total
- Hands on hips: Max 3x total
- Arms raised: Max 4x total (triumphant poses)

Use VARIED body language:
- Leaning, slouching, perching, crouching
- Hands in pockets, touching hair, adjusting clothing
- Interacting with environment: gripping railings, leaning on walls

=== ON-THE-NOSE DIALOGUE (HARD REJECT) ===
Characters NEVER state their feelings directly in speech bubbles:
BAD: "I feel so angry!" / "I'm scared!" / "I am happy now!"
GOOD: "You knew. This whole time." / "Just go." / [silent panel with trembling hands]

If a character needs to EXPRESS emotion:
- Show it in the ART (facial expression, body language)
- Use SUBTEXT in dialogue (says something else, tone conveys emotion)
- Use SILENCE (dramatic pause panels)
`
    : `
For each page, the "text" field contains the prose that appears under/around the image.
Keep text short and age-appropriate (${wordsPerPage} words average per page).
`;

  // Retry logic for truncation and safety blocks (prompt built inside loop with sanitized data)
  const maxAttempts = 3;
  let lastError: Error | null = null;
  let useSafeMode = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`generateIllustratedOutline: attempt ${attempt}/${maxAttempts}${useSafeMode ? ' (SAFE MODE)' : ''}`);

      // Sanitize INPUT data on retries (not just prompt instructions)
      let sanitizedBookData = bookData;
      if (useSafeMode) {
        console.log(`[IllustratedOutline] Retry ${attempt}: Sanitizing book data to avoid content policy...`);

        // Sanitization function - removes potentially offensive words
        const sanitizeText = (text: string, aggressive: boolean = false): string => {
          let sanitized = text
            // Violence & weapons
            .replace(/\b(kill|murder|death|dead|die|dying|blood|bloody|violence|violent|weapon|gun|knife|sword|blade|gore|brutal|brutally|torture|wound|stab|shoot|shooting|shot)\b/gi, '')
            // Sexual content
            .replace(/\b(sex|sexy|nude|naked|porn|explicit|erotic|sensual|seductive|aroused)\b/gi, '')
            // Drugs & substances
            .replace(/\b(drug|cocaine|heroin|meth|marijuana|weed|addict)\b/gi, '')
            // Clean up extra whitespace
            .replace(/\s+/g, ' ')
            .trim();

          // More aggressive on later attempts
          if (aggressive) {
            sanitized = sanitized.substring(0, 200) + '...';
          }

          return sanitized;
        };

        const isAggressive = attempt > 2;

        sanitizedBookData = {
          ...bookData,
          premise: sanitizeText(bookData.premise, isAggressive),
          beginning: sanitizeText(bookData.beginning, isAggressive),
          middle: sanitizeText(bookData.middle, isAggressive),
          ending: sanitizeText(bookData.ending, isAggressive),
          originalIdea: bookData.originalIdea ? sanitizeText(bookData.originalIdea, isAggressive) : undefined,
          characters: bookData.characters.map(c => ({
            name: c.name,
            description: sanitizeText(c.description, isAggressive),
          })),
          characterVisualGuide: bookData.characterVisualGuide ? {
            characters: bookData.characterVisualGuide.characters.map(c => ({
              name: c.name,
              physicalDescription: sanitizeText(c.physicalDescription, isAggressive),
              clothing: sanitizeText(c.clothing, isAggressive),
              distinctiveFeatures: sanitizeText(c.distinctiveFeatures, isAggressive),
            })),
          } : undefined,
        };
      }

      // Rebuild prompt with sanitized data
      const characterRefSanitized = sanitizedBookData.characterVisualGuide
        ? sanitizedBookData.characterVisualGuide.characters.map(c =>
          `${c.name}: ${c.physicalDescription}. Wears: ${c.clothing}. Distinct: ${c.distinctiveFeatures}`
        ).join('\n')
        : sanitizedBookData.characters.map(c => `${c.name}: ${c.description}`).join('\n');

      // Include the narrative story if available
      const narrativeSection = narrativeStory
        ? `
THE COMPLETE STORY (break this into ${sanitizedBookData.targetChapters} pages):
---
${narrativeStory}
---

YOUR TASK: Break the above story into exactly ${sanitizedBookData.targetChapters} pages. Each page should:
1. Cover a portion of the story above - preserve the dialogue and action from the story
2. The "text" field should contain that page's portion of the narrative (for prose) or narration (for comics)
3. The "dialogue" field should use the actual dialogue from the story
4. Scene descriptions should match what's happening in that part of the story

CRITICAL: Do NOT invent new story content. Break down and adapt the story above into pages.
`
        : '';

      let currentPrompt = `You are breaking a story into page-by-page format for an illustrated ${isComicStyle ? 'comic/graphic story' : 'picture book'}.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
${contentGuidelines}
${narrativeSection}

BOOK DETAILS:
- Title: "${sanitizedBookData.title}"
- Genre: ${sanitizedBookData.genre}
- Total pages: ${sanitizedBookData.targetChapters}
${!narrativeStory ? `
- Premise: ${sanitizedBookData.premise}
- Beginning: ${sanitizedBookData.beginning}
- Middle: ${sanitizedBookData.middle}
- Ending: ${sanitizedBookData.ending}
` : ''}

CHARACTERS (use these EXACT visual descriptions for consistency):
${characterRefSanitized}

COPYRIGHT PROTECTION - CHARACTER NAMES:
CRITICAL: If ANY character names match famous characters from existing media, YOU MUST RENAME THEM to completely original names.
Prohibited names include: Superman, Batman, Spider-Man, Velma, Scooby, Mickey, SpongeBob, Naruto, Harry Potter, etc.
If found, rename to original names (e.g., "Velma" -> "Sarah Martinez").

CRITICAL PAGE COUNT REQUIREMENT
You MUST create EXACTLY ${sanitizedBookData.targetChapters} pages - no more, no less.
- Do NOT create ${sanitizedBookData.targetChapters - 1} pages
- Do NOT create ${sanitizedBookData.targetChapters + 1} pages
- Create PRECISELY ${sanitizedBookData.targetChapters} pages

The output MUST have exactly ${sanitizedBookData.targetChapters} items in the "chapters" array.
Each page needs BOTH the text/dialogue AND a scene description.
${narrativeStory ? '\nPRESERVE the story, dialogue, and emotional beats from the narrative above.' : ''}

${dialogueInstructions}

COPYRIGHT PROTECTION - VISUAL CONTENT:
- Create 100% ORIGINAL scene descriptions - NEVER reference existing copyrighted characters, shows, movies, comics, or anime
- Even if you renamed characters above, describe completely UNIQUE visual designs and poses (NO iconic costumes, logos, or trademark elements)
- DO NOT describe copyrighted visual elements (specific costumes, logos, signature poses, iconic character designs from existing media)
- DO NOT use settings, locations, or props that are distinctive to existing copyrighted works
- Focus on original character designs, unique settings, and original compositions

For EVERY page's "scene", provide:
- location: The specific place/setting (e.g., "castle kitchen", "forest clearing", "city rooftop") - VARY THIS!
- description: What's happening in this specific moment (1-2 sentences, UNIQUE to this page)
- characters: Array of character names appearing in this scene (don't include protagonist on every page!)
- characterActions: Object mapping each character to their specific action/pose/expression in THIS scene
- background: Environmental details, objects, atmosphere, time of day
- mood: The emotional tone (tense, joyful, mysterious, peaceful, exciting, etc.)
- cameraAngle: How to "shoot" this scene - be specific! ("extreme close-up of eyes", "wide establishing shot", "low angle looking up", "bird's eye view", "over-shoulder shot")

CRITICAL RULES FOR VISUAL VARIETY:

LOCATIONS & SETTINGS:
1. Use AT LEAST 4-6 DIFFERENT LOCATIONS throughout the story (not the same room/place!)
2. Each location should appear only 2-3 times maximum
3. Locations can include: different rooms, outdoor areas, vehicles, fantasy spaces, etc.
4. Even within the same location, change the specific area (different corner, angle, time of day)

CHARACTER VARIETY:
5. The protagonist should NOT appear in every single image - show supporting characters alone sometimes
6. At least 3-4 pages should focus on OTHER characters without the main hero
7. Create scenes with different character groupings (solo, pairs, groups)
8. Show characters interacting with the environment, not just each other

VISUAL COMPOSITION:
9. Each page MUST be visually distinct - different actions, poses, and compositions
10. Vary camera angles dramatically: close-ups, wide shots, bird's eye, worm's eye, over-shoulder
11. Change character positions in frame (left, right, center, foreground, background)
12. Include dynamic actions: running, jumping, reaching, fighting, hiding, discovering, etc.

STORY PACING:
13. Show PROGRESSION - don't just describe states, show active moments
14. Include establishing shots (environment with small characters)
15. Include intimate moments (close-ups of faces/hands)
16. Avoid repetitive staging - no "character standing and talking" on multiple pages

CRITICAL - CONCISE OUTPUT:
17. Keep ALL descriptions SHORT (1-2 sentences max per field)
18. Scene descriptions: MAX 20 words
19. Character actions: MAX 10 words per character
20. Background: MAX 15 words
21. Do NOT pad with unnecessary words - be direct and specific
22. Complete the ENTIRE JSON structure - do not stop mid-response
23. Your "chapters" array MUST contain EXACTLY ${sanitizedBookData.targetChapters} objects

Output ONLY valid JSON with EXACTLY ${sanitizedBookData.targetChapters} chapters:
{
  "chapters": [
    {
      "number": 1,
      "title": "Page Title",
      "text": "${isComicStyle ? 'Minimal narration if needed' : 'The prose text for this page'}",
      "summary": "Brief summary of what happens",
      "targetWords": ${wordsPerPage},
      ${isComicStyle ? `"panelLayout": "two-panel",
      "dialogue": [
        {"speaker": "Character", "text": "Short speech!", "position": "top-left", "type": "speech"}
      ],` : ''}
      "scene": {
        "location": "Specific place (castle courtyard, dark alley, bedroom, etc.)",
        "transitionNote": "How characters got here from previous page (REQUIRED for pages 2+). E.g., 'After leaving the castle...', 'The next morning...'",
        "description": "What's happening - action-focused, unique to this page",
        "characters": ["Only characters IN THIS scene"],
        "characterActions": {
          "Character1": "PHYSICAL action only: clenched fists, narrowed eyes, leaning forward (NO 'angry' or 'sad')",
          "Character2": "different PHYSICAL action: trembling hands, forced smile, backing away"
        },
        "background": "Time of day, weather, objects, atmosphere",
        "mood": "emotional tone",
        "cameraAngle": "specific: extreme close-up, wide shot, low angle, over-shoulder, bird's eye"
      }
    }
  ]
}`;

      if (useSafeMode) {
        currentPrompt += `\n\nIMPORTANT SAFETY OVERRIDE: The previous attempt was blocked by content safety filters. You MUST write family-friendly scene descriptions. Use euphemisms and focus on atmosphere rather than graphic details. Keep all content suitable for a general audience.`;
      }

      const result = await getGeminiPro().generateContent(currentPrompt);
      const response = result.response.text();

      // Log finish reason for debugging
      const candidate = result.response.candidates?.[0];
      if (candidate?.finishReason) {
        console.log(`Finish reason: ${candidate.finishReason}`);
        if (candidate.finishReason === 'MAX_TOKENS') {
          console.warn('Response hit MAX_TOKENS limit - may be truncated');
        }
      }

      return parseJSONFromResponse(response) as {
        chapters: VisualChapter[];
      };
    } catch (error) {
      lastError = error as Error;
      const errorMsg = lastError.message || '';

      // Check for PROHIBITED_CONTENT or safety blocks
      const isSafetyBlock = errorMsg.includes('PROHIBITED_CONTENT') ||
        errorMsg.includes('safety') ||
        errorMsg.includes('blocked');

      // Retry on truncation or safety errors
      if ((errorMsg.includes('JSON_TRUNCATED') || isSafetyBlock) && attempt < maxAttempts) {
        console.log(`Error detected: ${isSafetyBlock ? 'SAFETY BLOCK' : 'TRUNCATION'}, retrying (attempt ${attempt + 1}/${maxAttempts})...`);

        if (isSafetyBlock) {
          useSafeMode = true;
          console.log('Switching to SAFE MODE for retry to avoid prohibited content.');
        }

        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Failed to generate illustrated outline after retries');
}
