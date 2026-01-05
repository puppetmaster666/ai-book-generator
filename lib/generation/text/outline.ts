import { SAFETY_SETTINGS, sanitizeContentForSafety, isSafetyBlockError } from '../shared/safety';
import { getGeminiPro } from '../shared/api-client';
import { parseJSONFromResponse } from '../shared/json-utils';
import { detectLanguageInstruction } from '../shared/writing-quality';

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
}): Promise<{
  chapters: {
    number: number;
    title: string;
    summary: string;
    pov?: string;
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

Create an outline with exactly ${bookData.targetChapters} chapters. For each chapter provide:
1. Chapter number
2. Chapter title (engaging, evocative)
3. 2-3 sentence summary of what happens
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
      const result = await getGeminiPro().generateContent(prompt);
      const response = result.response.text();

      return parseJSONFromResponse(response) as {
        chapters: {
          number: number;
          title: string;
          summary: string;
          pov?: string;
          targetWords: number;
        }[];
      };
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
- Avoid generic names like Marcus, Sarah, David, Mark - use culturally diverse names

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
