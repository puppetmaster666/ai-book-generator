import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Gemini 3 Pro for main generation
export const geminiPro = genAI.getGenerativeModel({
  model: 'gemini-3-pro-preview',
  generationConfig: {
    temperature: 0.8,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  },
});

// Gemini 3 Flash for summarization (cheaper)
export const geminiFlash = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview',
  generationConfig: {
    temperature: 0.3,
    topP: 0.9,
    maxOutputTokens: 1024,
  },
});

// Gemini 3 Pro Image for cover generation
export const geminiImage = genAI.getGenerativeModel({
  model: 'gemini-3-pro-image-preview',
});

export async function generateOutline(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
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
  const prompt = `You are a professional book outliner. Create a detailed chapter-by-chapter outline.

BOOK DETAILS:
- Title: ${bookData.title}
- Genre: ${bookData.genre}
- Type: ${bookData.bookType}
- Premise: ${bookData.premise}
- Characters: ${JSON.stringify(bookData.characters)}
- Beginning: ${bookData.beginning}
- Key Plot Points/Middle: ${bookData.middle}
- Ending: ${bookData.ending}
- Writing Style: ${bookData.writingStyle}
- Target Length: ${bookData.targetWords} words (${bookData.targetChapters} chapters)

Create an outline with exactly ${bookData.targetChapters} chapters. For each chapter provide:
1. Chapter number
2. Chapter title (engaging, evocative)
3. 2-3 sentence summary of what happens
4. Which characters appear (for POV tracking)
5. Approximate word count target (distribute ${bookData.targetWords} words across chapters)

Output ONLY valid JSON in this exact format:
{
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title Here",
      "summary": "2-3 sentence summary of events",
      "pov": "Main character name for this chapter",
      "targetWords": 3500
    }
  ]
}`;

  const result = await geminiPro.generateContent(prompt);
  const response = result.response.text();

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse outline response');
  }

  return JSON.parse(jsonMatch[0]);
}

export async function generateChapter(data: {
  title: string;
  genre: string;
  bookType: string;
  writingStyle: string;
  outline: object;
  storySoFar: string;
  characterStates: object;
  chapterNumber: number;
  chapterTitle: string;
  chapterPlan: string;
  chapterPov?: string;
  targetWords: number;
  chapterFormat: string;
}): Promise<string> {
  const formatInstruction = {
    numbers: `Start with "Chapter ${data.chapterNumber}"`,
    titles: `Start with "${data.chapterTitle}"`,
    both: `Start with "Chapter ${data.chapterNumber}: ${data.chapterTitle}"`,
    pov: `Start with "${data.chapterPov?.toUpperCase() || 'NARRATOR'}\n\nChapter ${data.chapterNumber}"`,
  }[data.chapterFormat] || `Start with "Chapter ${data.chapterNumber}: ${data.chapterTitle}"`;

  const prompt = `You are a novelist writing in ${data.writingStyle} style. Write a complete chapter.

BOOK: "${data.title}" (${data.genre} ${data.bookType})

FULL OUTLINE:
${JSON.stringify(data.outline, null, 2)}

STORY SO FAR:
${data.storySoFar || 'This is the beginning of the story.'}

CHARACTER STATES:
${JSON.stringify(data.characterStates || {}, null, 2)}

NOW WRITE CHAPTER ${data.chapterNumber}: "${data.chapterTitle}"

Chapter plan: ${data.chapterPlan}
Target words: ${data.targetWords}
${data.chapterPov ? `Point of view: ${data.chapterPov}` : ''}

FORMATTING: ${formatInstruction}

Write the complete chapter. Include:
- Vivid descriptions and sensory details
- Natural dialogue with character voice
- Internal thoughts and emotions
- Scene transitions
- End at a natural breaking point

Write approximately ${data.targetWords} words. Do NOT include any meta-commentary or notes - only the actual chapter content.`;

  const result = await geminiPro.generateContent(prompt);
  return result.response.text();
}

export async function summarizeChapter(chapterContent: string): Promise<string> {
  const prompt = `Summarize this chapter in exactly 150 words. Focus on:
- Key plot events that happened
- Character development or revelations
- Any setups that need payoff later
- Where characters ended up (location, emotional state)

Be factual and precise. This summary will be used to maintain story continuity.

CHAPTER TEXT:
${chapterContent}`;

  const result = await geminiFlash.generateContent(prompt);
  return result.response.text();
}

export async function updateCharacterStates(
  currentStates: Record<string, object>,
  chapterContent: string,
  chapterNumber: number
): Promise<Record<string, object>> {
  const prompt = `Based on this chapter, update the character state tracking.

CURRENT CHARACTER STATES:
${JSON.stringify(currentStates, null, 2)}

CHAPTER ${chapterNumber} CONTENT:
${chapterContent}

For each character that appeared or was mentioned, update their state with:
- last_seen: chapter number
- status: current situation (location, condition)
- knows: array of important knowledge they have
- goal: their current motivation

Output ONLY valid JSON with the updated character states.`;

  const result = await geminiFlash.generateContent(prompt);
  const response = result.response.text();

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return currentStates;
  }

  return JSON.parse(jsonMatch[0]);
}

export async function generateCoverPrompt(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  authorName: string;
}): Promise<string> {
  const prompt = `Create a detailed image generation prompt for a professional book cover.

BOOK DETAILS:
- Title: "${bookData.title}"
- Author: "${bookData.authorName}"
- Genre: ${bookData.genre}
- Type: ${bookData.bookType}
- Premise: ${bookData.premise}

Create a prompt for generating a book cover that:
1. Visually represents the book's theme and genre
2. Is professional and suitable for Amazon KDP
3. Works well at thumbnail size
4. Has appropriate visual hierarchy

The cover MUST include:
- The title "${bookData.title}" prominently displayed
- The author name "${bookData.authorName}" at the bottom

The cover must NOT include:
- Any other text besides title and author name
- Faces with unclear features
- Copyright-infringing elements

${bookData.bookType === 'non-fiction' ? 'For this non-fiction book, a subtitle may be appropriate if it helps convey the value proposition.' : 'This is fiction - focus on mood, atmosphere, and genre conventions.'}

Output ONLY the image generation prompt, nothing else.`;

  const result = await geminiFlash.generateContent(prompt);
  return result.response.text();
}

export async function generateCoverImage(coverPrompt: string): Promise<string> {
  const fullPrompt = `Professional book cover, high quality, 1600x2560 aspect ratio, suitable for Amazon KDP. ${coverPrompt}`;

  const result = await geminiImage.generateContent(fullPrompt);

  // Extract image URL or base64 from response
  const response = result.response;

  // Handle the image response based on Gemini 3 Pro Image API format
  // This may need adjustment based on actual API response structure
  if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
    const imageData = response.candidates[0].content.parts[0].inlineData;
    return `data:${imageData.mimeType};base64,${imageData.data}`;
  }

  throw new Error('Failed to generate cover image');
}
