import { SAFETY_SETTINGS, sanitizeContentForSafety, isSafetyBlockError } from '../shared/safety';
import { getGeminiPro, getGeminiFlash } from '../shared/api-client';
import { parseJSONFromResponse } from '../shared/json-utils';
import { detectLanguageInstruction } from '../shared/writing-quality';
import { buildNameGuidancePrompt, BANNED_OVERUSED_NAMES } from '../shared/name-variety';

// Threshold for chunked outline generation - books with more chapters use chunked approach
const CHUNK_THRESHOLD = 16;
const CHAPTERS_PER_CHUNK = 8;

export type OutlineChapter = {
  number: number;
  title: string;
  summary: string;
  pov?: string;
  targetWords: number;
};

export type OutlineResult = {
  chapters: OutlineChapter[];
};

export async function generateOutline(bookData: {
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
  onProgress?: (status: string, chaptersCompleted: number, totalChapters: number) => void;
}): Promise<OutlineResult> {
  // Use chunked generation for large books to avoid timeouts
  if (bookData.targetChapters > CHUNK_THRESHOLD) {
    console.log(`[Outline] Large book (${bookData.targetChapters} chapters) - using chunked generation`);
    return generateChunkedOutline(bookData);
  }

  // Standard outline generation for smaller books
  return generateOutlineStandard(bookData);
}

// Standard outline generation (for books with <= 16 chapters)
async function generateOutlineStandard(bookData: {
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
  onProgress?: (status: string, chaptersCompleted: number, totalChapters: number) => void;
}): Promise<OutlineResult> {
  // Try with original content first, then with sanitized content if blocked
  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const useSanitized = attempt > 0;

    // Sanitize content on retry
    const premise = useSanitized ? sanitizeContentForSafety(bookData.premise) : bookData.premise;
    const originalIdea = useSanitized && bookData.originalIdea
      ? sanitizeContentForSafety(bookData.originalIdea)
      : bookData.originalIdea;
    const beginning = useSanitized ? sanitizeContentForSafety(bookData.beginning) : bookData.beginning;
    const middle = useSanitized ? sanitizeContentForSafety(bookData.middle) : bookData.middle;
    const ending = useSanitized ? sanitizeContentForSafety(bookData.ending) : bookData.ending;
    const characters = useSanitized
      ? bookData.characters.map(c => ({
          name: c.name,
          description: sanitizeContentForSafety(c.description)
        }))
      : bookData.characters;

    if (useSanitized) {
      console.log('[Outline] Retrying with sanitized content after safety block...');
    }

    // Detect language from title and premise
    const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + premise);

    // Include original idea if provided (gives AI more context from user's vision)
    const originalIdeaSection = originalIdea
      ? `\nORIGINAL AUTHOR VISION (preserve these specific details, names, and plot points):\n${originalIdea}\n`
      : '';

    const safetyNote = useSanitized
      ? '\n\nNOTE: Write a tasteful, mature story that focuses on emotional connections and character development. Avoid graphic or explicit descriptions.\n'
      : '';

    const prompt = `You are a professional book outliner. Create a detailed chapter-by-chapter outline.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
${originalIdeaSection}
BOOK DETAILS:
- Title: ${bookData.title}
- Genre: ${bookData.genre}
- Type: ${bookData.bookType}
- Premise: ${premise}
- Characters: ${JSON.stringify(characters)}
- Beginning: ${beginning}
- Key Plot Points/Middle: ${middle}
- Ending: ${ending}
- Writing Style: ${bookData.writingStyle}
- Target Length: ${bookData.targetWords} words (${bookData.targetChapters} chapters)
${safetyNote}
IMPORTANT: If an "Original Author Vision" is provided above, ensure the outline incorporates all the specific details, character names, plot elements, and unique ideas from it. The author's original vision takes priority.

WRITING QUALITY NOTES:
- Each chapter should have a distinct tone and pacing - avoid repetitive structure
- Vary chapter openings - never start multiple chapters the same way
- Use ONLY the characters provided - do not invent major characters

${buildNameGuidancePrompt(bookData.premise, bookData.title, bookData.genre)}

NAME USAGE IN SUMMARIES (CRITICAL - AI tends to spam names):
- Use each character's name ONCE per summary, then switch to pronouns (he/she/they)
- WRONG: "Elena discovers the letter. Elena reads it. Elena realizes the truth."
- RIGHT: "Elena discovers the letter. She reads it and realizes the truth."
- For scenes with multiple same-gender characters, use role/description: "the detective", "the younger woman"
- Maximum 2 name mentions per character per summary - use pronouns for the rest

Create an outline with exactly ${bookData.targetChapters} chapters. For each chapter provide:
1. Chapter number
2. Chapter title (engaging, evocative)
3. 2-3 sentence summary of what happens (use pronouns after first name mention!)
4. Which characters appear (for POV tracking)
5. Approximate word count target (distribute ${bookData.targetWords} words across chapters)

Output ONLY valid JSON in this exact format (targetWords should be approximately ${Math.round(bookData.targetWords / bookData.targetChapters)} per chapter):
{
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title Here",
      "summary": "2-3 sentence summary of events",
      "pov": "Main character name for this chapter",
      "targetWords": ${Math.round(bookData.targetWords / bookData.targetChapters)}
    }
  ]
}`;

    try {
      // Report progress
      if (bookData.onProgress) {
        bookData.onProgress('Generating outline...', 0, bookData.targetChapters);
      }

      // Use streaming for live preview
      const model = getGeminiPro();
      let accumulated = '';
      let lastProgressUpdate = 0;

      const streamResult = await model.generateContentStream(prompt);
      for await (const chunk of streamResult.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          accumulated += chunkText;
          // Update progress every ~1000 characters
          if (accumulated.length - lastProgressUpdate > 1000 && bookData.onProgress) {
            // Estimate progress by counting chapter entries in the JSON
            const chapterMatches = accumulated.match(/"number":\s*\d+/g);
            const chaptersFound = chapterMatches ? chapterMatches.length : 0;
            bookData.onProgress(`Planning chapter ${chaptersFound + 1}...`, chaptersFound, bookData.targetChapters);
            lastProgressUpdate = accumulated.length;
          }
        }
      }

      const result = parseJSONFromResponse(accumulated) as OutlineResult;

      // Final progress update
      if (bookData.onProgress) {
        bookData.onProgress('Outline complete!', result.chapters.length, bookData.targetChapters);
      }

      return result;
    } catch (error) {
      lastError = error as Error;
      if (isSafetyBlockError(error) && attempt < maxAttempts - 1) {
        console.log('[Outline] Safety block detected, will retry with sanitized content');
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Failed to generate outline');
}

// Chunked outline generation for large books (> 16 chapters)
// Generates outline in parts to avoid timeouts on epic novels
async function generateChunkedOutline(bookData: {
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
  onProgress?: (status: string, chaptersCompleted: number, totalChapters: number) => void;
}): Promise<OutlineResult> {
  const allChapters: OutlineChapter[] = [];
  const numChunks = Math.ceil(bookData.targetChapters / CHAPTERS_PER_CHUNK);
  const wordsPerChapter = Math.round(bookData.targetWords / bookData.targetChapters);

  console.log(`[Outline] Generating ${bookData.targetChapters} chapters in ${numChunks} chunks of ${CHAPTERS_PER_CHUNK}`);

  // Step 1: Generate high-level story arc first
  if (bookData.onProgress) {
    bookData.onProgress('Planning story arc...', 0, bookData.targetChapters);
  }

  const storyArc = await generateStoryArc(bookData);
  console.log(`[Outline] Story arc generated with ${storyArc.acts.length} acts`);

  // Step 2: Generate each chunk of chapters
  for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
    const startChapter = chunkIndex * CHAPTERS_PER_CHUNK + 1;
    const endChapter = Math.min((chunkIndex + 1) * CHAPTERS_PER_CHUNK, bookData.targetChapters);

    // Determine which act this chunk is in
    const actIndex = Math.floor(chunkIndex / Math.ceil(numChunks / storyArc.acts.length));
    const currentAct = storyArc.acts[Math.min(actIndex, storyArc.acts.length - 1)];

    if (bookData.onProgress) {
      bookData.onProgress(`Planning chapters ${startChapter}-${endChapter}...`, allChapters.length, bookData.targetChapters);
    }

    // Generate this chunk of chapters
    const chunkChapters = await generateOutlineChunk({
      ...bookData,
      startChapter,
      endChapter,
      wordsPerChapter,
      storyArc,
      currentAct,
      previousChapters: allChapters,
    });

    // Add to full list
    allChapters.push(...chunkChapters);
    console.log(`[Outline] Chunk ${chunkIndex + 1}/${numChunks} complete. Total chapters: ${allChapters.length}`);

    if (bookData.onProgress) {
      bookData.onProgress(`Chapters ${startChapter}-${endChapter} planned`, allChapters.length, bookData.targetChapters);
    }
  }

  // Ensure chapter numbers are sequential
  allChapters.forEach((ch, i) => {
    ch.number = i + 1;
  });

  if (bookData.onProgress) {
    bookData.onProgress('Outline complete!', allChapters.length, bookData.targetChapters);
  }

  return { chapters: allChapters };
}

// Generate a high-level story arc for chunked generation
async function generateStoryArc(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  originalIdea?: string;
  characters: { name: string; description: string }[];
  beginning: string;
  middle: string;
  ending: string;
  targetChapters: number;
}): Promise<{
  acts: {
    name: string;
    summary: string;
    keyEvents: string[];
    chaptersRange: string;
  }[];
  majorPlotPoints: string[];
}> {
  const numActs = bookData.targetChapters >= 24 ? 4 : 3;
  const chaptersPerAct = Math.ceil(bookData.targetChapters / numActs);

  const prompt = `You are a master story architect. Create a high-level story arc for this epic novel.

BOOK DETAILS:
- Title: ${bookData.title}
- Genre: ${bookData.genre}
- Premise: ${bookData.premise}
${bookData.originalIdea ? `- Original Vision: ${bookData.originalIdea}` : ''}
- Characters: ${bookData.characters.map(c => c.name).join(', ')}
- Beginning: ${bookData.beginning}
- Middle: ${bookData.middle}
- Ending: ${bookData.ending}
- Total Chapters: ${bookData.targetChapters}

Create a ${numActs}-act structure with ~${chaptersPerAct} chapters per act.

NAME USAGE (CRITICAL): In summaries, use character names sparingly - once per summary, then pronouns.

BANNED OVERUSED NAMES (do not use): ${BANNED_OVERUSED_NAMES.slice(0, 20).join(', ')}

Output ONLY valid JSON:
{
  "acts": [
    {
      "name": "Act 1: Setup",
      "summary": "Brief summary of this act's purpose and events",
      "keyEvents": ["Event 1", "Event 2", "Event 3"],
      "chaptersRange": "1-${chaptersPerAct}"
    }
  ],
  "majorPlotPoints": ["Inciting incident", "First plot point", "Midpoint", "Crisis", "Climax", "Resolution"]
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const parsed = parseJSONFromResponse(result.response.text()) as {
    acts?: { name: string; summary: string; keyEvents: string[]; chaptersRange: string }[];
    majorPlotPoints?: string[];
  };

  // Validate and provide defaults if needed
  if (!parsed.acts || parsed.acts.length === 0) {
    // Fallback to a simple 3-act structure
    const chaptersPerAct = Math.ceil(bookData.targetChapters / 3);
    return {
      acts: [
        { name: 'Act 1: Setup', summary: 'Introduction and setup', keyEvents: ['Opening', 'Inciting incident'], chaptersRange: `1-${chaptersPerAct}` },
        { name: 'Act 2: Confrontation', summary: 'Rising action and conflict', keyEvents: ['Midpoint', 'Complications'], chaptersRange: `${chaptersPerAct + 1}-${chaptersPerAct * 2}` },
        { name: 'Act 3: Resolution', summary: 'Climax and resolution', keyEvents: ['Climax', 'Resolution'], chaptersRange: `${chaptersPerAct * 2 + 1}-${bookData.targetChapters}` },
      ],
      majorPlotPoints: ['Setup', 'Inciting incident', 'Midpoint', 'Crisis', 'Climax', 'Resolution'],
    };
  }

  return {
    acts: parsed.acts,
    majorPlotPoints: parsed.majorPlotPoints || ['Setup', 'Midpoint', 'Climax', 'Resolution'],
  };
}

// Generate a chunk of chapters based on the story arc
async function generateOutlineChunk(data: {
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
  startChapter: number;
  endChapter: number;
  wordsPerChapter: number;
  storyArc: { acts: { name: string; summary: string; keyEvents: string[] }[]; majorPlotPoints: string[] };
  currentAct: { name: string; summary: string; keyEvents: string[] };
  previousChapters: OutlineChapter[];
}): Promise<OutlineChapter[]> {
  // Build context from previous chapters
  const previousContext = data.previousChapters.length > 0
    ? `\nPREVIOUS CHAPTERS (maintain continuity):
${data.previousChapters.slice(-4).map(ch => `- Ch${ch.number}: ${ch.title} - ${ch.summary}`).join('\n')}`
    : '';

  const prompt = `You are a professional book outliner. Generate chapters ${data.startChapter} to ${data.endChapter} for this novel.

BOOK DETAILS:
- Title: ${data.title}
- Genre: ${data.genre}
- Writing Style: ${data.writingStyle}
- Characters: ${JSON.stringify(data.characters)}

STORY ARC:
- Current Act: ${data.currentAct.name}
- Act Summary: ${data.currentAct.summary}
- Key Events for this act: ${data.currentAct.keyEvents.join(', ')}
- Overall Plot Points: ${data.storyArc.majorPlotPoints.join(' → ')}
${previousContext}

Generate EXACTLY ${data.endChapter - data.startChapter + 1} chapters (${data.startChapter} to ${data.endChapter}).
Each chapter should:
- Build on the story arc and previous events
- Have a distinct tone and purpose
- Move the plot forward
- Target approximately ${data.wordsPerChapter} words

NAME USAGE IN SUMMARIES (CRITICAL):
- Use each character's name ONCE per summary, then switch to pronouns (he/she/they)
- WRONG: "Marcus confronts Sarah. Marcus demands answers. Sarah tells Marcus the truth."
- RIGHT: "Marcus confronts Sarah, demanding answers. She finally tells him the truth."
- Maximum 2 name mentions per character per summary - pronouns for the rest

Output ONLY valid JSON:
{
  "chapters": [
    {
      "number": ${data.startChapter},
      "title": "Chapter Title",
      "summary": "2-3 sentence summary of events",
      "pov": "POV character name",
      "targetWords": ${data.wordsPerChapter}
    }
  ]
}`;

  const result = await getGeminiPro().generateContent(prompt);
  const parsed = parseJSONFromResponse(result.response.text()) as { chapters: OutlineChapter[] };
  return parsed.chapters;
}

// Generate outline for non-fiction books (topic-based structure)
export async function generateNonFictionOutline(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  originalIdea?: string;
  beginning: string;  // Introduction/hook
  middle: string;     // Main topics (comma-separated)
  ending: string;     // Conclusion/takeaways
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
}): Promise<{
  chapters: {
    number: number;
    title: string;
    summary: string;
    keyPoints: string[];
    targetWords: number;
  }[];
}> {
  // Try with original content first, then with sanitized content if blocked
  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const useSanitized = attempt > 0;

    // Sanitize content on retry
    const premise = useSanitized ? sanitizeContentForSafety(bookData.premise) : bookData.premise;
    const originalIdea = useSanitized && bookData.originalIdea
      ? sanitizeContentForSafety(bookData.originalIdea)
      : bookData.originalIdea;
    const beginning = useSanitized ? sanitizeContentForSafety(bookData.beginning) : bookData.beginning;
    const middle = useSanitized ? sanitizeContentForSafety(bookData.middle) : bookData.middle;
    const ending = useSanitized ? sanitizeContentForSafety(bookData.ending) : bookData.ending;

    if (useSanitized) {
      console.log('[NF Outline] Retrying with sanitized content after safety block...');
    }

    // Detect language from title and premise
    const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + premise);

    // Parse the main topics from the middle field
    const mainTopics = middle.split(',').map(t => t.trim()).filter(t => t);

    // Include original idea if provided (gives AI more context from user's vision)
    const originalIdeaSection = originalIdea
      ? `\nORIGINAL AUTHOR VISION (preserve these specific details, topics, and insights):\n${originalIdea}\n`
      : '';

    const safetyNote = useSanitized
      ? '\n\nNOTE: Write tasteful, educational content that focuses on practical information. Avoid graphic or explicit descriptions.\n'
      : '';

    const prompt = `You are a professional non-fiction book outliner. Create a detailed chapter-by-chapter outline.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
${originalIdeaSection}
BOOK DETAILS:
- Title: ${bookData.title}
- Genre: ${bookData.genre} (non-fiction)
- Premise: ${premise}
- Introduction Hook: ${beginning}
- Main Topics to Cover: ${mainTopics.join(', ')}
- Conclusion/Takeaways: ${ending}
- Writing Style: ${bookData.writingStyle}
- Target Length: ${bookData.targetWords} words (${bookData.targetChapters} chapters)
${safetyNote}
Create an outline with exactly ${bookData.targetChapters} chapters for this NON-FICTION book.

IMPORTANT: If an "Original Author Vision" is provided above, ensure the outline incorporates all the specific topics, insights, examples, and unique perspectives from it. The author's original vision takes priority.

STRUCTURE GUIDELINES:
- Chapter 1 should be an Introduction that hooks the reader and previews what they'll learn
- Middle chapters should cover the main topics logically, building on each other
- Final chapter should be a Conclusion with actionable takeaways
- Each chapter should have a clear learning objective

ANTI-AI WRITING NOTES:
- Do NOT use "Have you ever..." to open any chapters - this is the #1 AI tell
- Each chapter must have a DIFFERENT opening style: fact, anecdote, bold statement, scene, etc.
- Case study names must be DIVERSE and UNIQUE - never reuse names across chapters

=== BANNED OVERUSED NAMES (DO NOT USE FOR CASE STUDIES) ===
${BANNED_OVERUSED_NAMES.slice(0, 30).join(', ')}
Use fresh, unique names for any case studies or examples.

For each chapter provide:
1. Chapter number
2. Chapter title (clear, descriptive, benefit-focused)
3. 2-3 sentence summary of what this chapter teaches
4. 3-5 key points or lessons covered in the chapter
5. Approximate word count target (distribute ${bookData.targetWords} words across chapters)

Output ONLY valid JSON in this exact format (targetWords should be approximately ${Math.round(bookData.targetWords / bookData.targetChapters)} per chapter):
{
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title Here",
      "summary": "What readers will learn in this chapter",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
      "targetWords": ${Math.round(bookData.targetWords / bookData.targetChapters)}
    }
  ]
}`;

    try {
      const result = await getGeminiPro().generateContent(prompt);
      const response = result.response.text();

      return parseJSONFromResponse(response) as {
        chapters: {
          number: number;
          title: string;
          summary: string;
          keyPoints: string[];
          targetWords: number;
        }[];
      };
    } catch (error) {
      lastError = error as Error;
      if (isSafetyBlockError(error) && attempt < maxAttempts - 1) {
        console.log('[NF Outline] Safety block detected, will retry with sanitized content');
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Failed to generate non-fiction outline');
}
