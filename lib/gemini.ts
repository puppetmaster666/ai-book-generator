import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Helper to clean and parse JSON from LLM responses
function parseJSONFromResponse(response: string): object {
  console.log('Raw LLM response length:', response.length);
  console.log('Raw LLM response start:', response.substring(0, 300));
  console.log('Raw LLM response end:', response.substring(response.length - 200));

  // Remove markdown code blocks if present
  let cleaned = response
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Extract JSON object or array
  const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('No JSON found. Full response:', response);
    throw new Error('No JSON found in response');
  }

  cleaned = jsonMatch[0];

  // Fix common LLM JSON errors
  cleaned = cleaned
    // Fix trailing commas before } or ]
    .replace(/,(\s*[}\]])/g, '$1');

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try with newline cleanup
    cleaned = cleaned.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      console.error('JSON parse failed. Cleaned:', cleaned.substring(0, 1500));
      throw e2;
    }
  }
}

// Lazy initialization to avoid errors during build
let genAI: GoogleGenerativeAI | null = null;
let _geminiPro: GenerativeModel | null = null;
let _geminiFlash: GenerativeModel | null = null;
let _geminiImage: GenerativeModel | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Gemini 3 Pro for main generation
function getGeminiPro(): GenerativeModel {
  if (!_geminiPro) {
    _geminiPro = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-preview',
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
  }
  return _geminiPro;
}

// Gemini 3 Flash for summarization (cheaper)
function getGeminiFlash(): GenerativeModel {
  if (!_geminiFlash) {
    _geminiFlash = getGenAI().getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 8192,
      },
    });
  }
  return _geminiFlash;
}

// Gemini 3 Pro Image for cover generation
function getGeminiImage(): GenerativeModel {
  if (!_geminiImage) {
    _geminiImage = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
    });
  }
  return _geminiImage;
}

// Check if text ends with proper punctuation (complete sentence)
function isCompleteSentence(text: string): boolean {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) && trimmed.length > 50;
}

// Generate a random book idea with retry logic
export async function generateBookIdea(): Promise<string> {
  const prompt = `Generate a 2-sentence book idea. End with a period.

Examples:
- A marine biologist discovers an underwater city older than any known civilization. When she tries to document it, she realizes the inhabitants are still watching.
- A retired hitman opens a bakery in a small town. His past catches up when a former target walks in asking for a wedding cake.

Write ONE new idea (2 sentences, end with period):`;

  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await getGeminiFlash().generateContent(prompt);
    let idea = result.response.text().trim();

    // Remove any quotes or prefixes
    idea = idea.replace(/^["']|["']$/g, '').trim();
    idea = idea.replace(/^(Here's an idea:|Book idea:|Idea:)\s*/i, '').trim();

    // Check if it's a complete sentence
    if (isCompleteSentence(idea)) {
      return idea;
    }

    // If incomplete, try to salvage by finding the last complete sentence
    const sentences = idea.match(/[^.!?]*[.!?]/g);
    if (sentences && sentences.length >= 1) {
      const salvaged = sentences.join('').trim();
      if (salvaged.length > 50) {
        return salvaged;
      }
    }
  }

  // Fallback if all retries fail
  return "A bookstore owner discovers that the rare first editions in her shop contain hidden messages from authors who predicted the future. When the next prediction points to an imminent catastrophe, she must decide whether to warn the world or protect the secret.";
}

// NEW: Expand a simple idea into a full book plan
export async function expandIdea(idea: string): Promise<{
  title: string;
  genre: string;
  bookType: 'fiction' | 'non-fiction';
  premise: string;
  characters: { name: string; description: string }[];
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
}> {
  const prompt = `Create a book plan from this idea: "${idea}"

STRICT RULES:
- Output ONLY valid JSON, no other text
- Keep ALL string values under 100 words each
- Use exactly 2-3 characters, not more
- No special characters that break JSON
- Complete the entire JSON structure

JSON format:
{"title":"Title","genre":"mystery","bookType":"fiction","premise":"Short premise","characters":[{"name":"Name","description":"Brief desc"}],"beginning":"Start","middle":"Middle","ending":"End","writingStyle":"commercial","targetWords":70000,"targetChapters":20}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  return parseJSONFromResponse(response) as {
    title: string;
    genre: string;
    bookType: 'fiction' | 'non-fiction';
    premise: string;
    characters: { name: string; description: string }[];
    beginning: string;
    middle: string;
    ending: string;
    writingStyle: string;
    targetWords: number;
    targetChapters: number;
  };
}

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

STRICT STYLE RULES:
- NEVER use em dashes (—) or en dashes (–). Use commas, periods, or rewrite sentences instead.
- NEVER add "[END OF BOOK]", "[THE END]", or any ending markers
- NEVER add author notes, meta-commentary, or markdown formatting
- Use simple, natural punctuation only

Write approximately ${data.targetWords} words. Output ONLY the chapter text.`;

  const result = await getGeminiPro().generateContent(prompt);
  let content = result.response.text();

  // Post-process: remove AI artifacts
  content = content
    // Remove end markers
    .replace(/\*?\*?\[?(THE )?END( OF BOOK)?\]?\*?\*?/gi, '')
    .replace(/\*\*\[END OF BOOK\]\*\*/gi, '')
    // Replace em dashes and en dashes with commas or nothing
    .replace(/—/g, ', ')
    .replace(/–/g, ', ')
    .replace(/ , /g, ', ')
    .replace(/,\s*,/g, ',')
    // Clean up any trailing whitespace
    .trim();

  return content;
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

  const result = await getGeminiFlash().generateContent(prompt);
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

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    return parseJSONFromResponse(response) as Record<string, object>;
  } catch {
    return currentStates;
  }
}

export async function generateCoverPrompt(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  authorName: string;
  artStyle?: string;
  artStylePrompt?: string;
  characterVisualGuide?: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
      colorPalette: string;
    }>;
    styleNotes: string;
  };
  visualStyleGuide?: {
    overallStyle: string;
    colorPalette: string;
    lightingStyle: string;
    moodAndAtmosphere: string;
  };
}): Promise<string> {
  const styleInstruction = bookData.artStylePrompt
    ? `Art Style: ${bookData.artStylePrompt}`
    : '';

  // Build character descriptions for cover from visual guide
  let characterSection = '';
  if (bookData.characterVisualGuide && bookData.characterVisualGuide.characters.length > 0) {
    characterSection = `
MAIN CHARACTERS (if featuring characters on cover, use these EXACT descriptions):
${bookData.characterVisualGuide.characters.slice(0, 2).map(c =>
  `- ${c.name}: ${c.physicalDescription}. Wearing: ${c.clothing}. Distinctive: ${c.distinctiveFeatures}. Colors: ${c.colorPalette}`
).join('\n')}
`;
  }

  // Build style consistency section
  let styleConsistencySection = '';
  if (bookData.visualStyleGuide) {
    styleConsistencySection = `
STYLE CONSISTENCY (match interior illustrations):
- Overall Style: ${bookData.visualStyleGuide.overallStyle}
- Color Palette: ${bookData.visualStyleGuide.colorPalette}
- Lighting: ${bookData.visualStyleGuide.lightingStyle}
- Mood: ${bookData.visualStyleGuide.moodAndAtmosphere}
`;
  }

  const prompt = `Create a detailed image generation prompt for a professional book cover.

BOOK DETAILS:
- Title: "${bookData.title}"
- Author: "${bookData.authorName}"
- Genre: ${bookData.genre}
- Type: ${bookData.bookType}
- Premise: ${bookData.premise}
${styleInstruction}
${characterSection}
${styleConsistencySection}

Create a prompt for generating a book cover that:
1. Visually represents the book's theme and genre
2. Is professional and suitable for Amazon KDP (1600x2560 portrait)
3. Works well at thumbnail size
4. Has appropriate visual hierarchy
${bookData.artStylePrompt ? `5. Uses the ${bookData.artStyle} art style CONSISTENTLY with interior illustrations` : ''}
${bookData.visualStyleGuide ? '6. Matches the color palette and mood of the interior illustrations' : ''}

The cover MUST include:
- The title "${bookData.title}" prominently displayed
- The author name "${bookData.authorName}" at the bottom

The cover must NOT include:
- Any other text besides title and author name
- Faces with unclear features
- Copyright-infringing elements

${bookData.bookType === 'non-fiction' ? 'For this non-fiction book, a subtitle may be appropriate if it helps convey the value proposition.' : 'This is fiction - focus on mood, atmosphere, and genre conventions.'}

CRITICAL: If this is an illustrated book, the cover art style MUST match the interior illustrations.

Output ONLY the image generation prompt, nothing else.`;

  const result = await getGeminiFlash().generateContent(prompt);
  return result.response.text();
}

// Generate illustration prompts for a chapter
export async function generateIllustrationPrompts(data: {
  chapterNumber: number;
  chapterTitle: string;
  chapterContent: string;
  characters: { name: string; description: string }[];
  artStyle: string;
  illustrationsCount: number;
  bookTitle: string;
}): Promise<Array<{
  scene: string;
  description: string;
  characters: string[];
  emotion: string;
}>> {
  const prompt = `You are an illustrator planning illustrations for a book chapter.

BOOK: "${data.bookTitle}"
CHAPTER ${data.chapterNumber}: "${data.chapterTitle}"

CHARACTERS:
${data.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

ART STYLE: ${data.artStyle}

CHAPTER CONTENT:
${data.chapterContent.substring(0, 3000)}...

Create ${data.illustrationsCount} illustration descriptions for key moments in this chapter.

For each illustration, identify:
1. A specific scene/moment to illustrate
2. A detailed visual description (what to draw, composition, lighting)
3. Which characters appear in the scene
4. The emotional tone

IMPORTANT: The illustrations will NOT have any text. Describe only visual elements.

Output ONLY valid JSON:
{
  "illustrations": [
    {
      "scene": "Brief scene identifier (3-5 words)",
      "description": "Detailed visual description for the artist (50-100 words)",
      "characters": ["character names that appear"],
      "emotion": "primary emotion (joyful, tense, mysterious, etc.)"
    }
  ]
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    const parsed = parseJSONFromResponse(response) as { illustrations: Array<{
      scene: string;
      description: string;
      characters: string[];
      emotion: string;
    }> };
    return parsed.illustrations;
  } catch {
    // Return a single default illustration if parsing fails
    return [{
      scene: `Chapter ${data.chapterNumber} scene`,
      description: `An illustration capturing the essence of chapter ${data.chapterNumber}: ${data.chapterTitle}`,
      characters: data.characters.map(c => c.name),
      emotion: 'engaging',
    }];
  }
}

// Generate illustration for children's book (more detailed, scene-focused)
export async function generateChildrensIllustrationPrompts(data: {
  pageNumber: number;
  pageText: string;
  characters: { name: string; description: string }[];
  setting: string;
  artStyle: string;
  bookTitle: string;
}): Promise<{
  scene: string;
  visualDescription: string;
  characterPositions: string;
  backgroundDetails: string;
  colorMood: string;
}> {
  const prompt = `You are a children's book illustrator planning a full-page illustration.

BOOK: "${data.bookTitle}"
PAGE ${data.pageNumber}

PAGE TEXT:
"${data.pageText}"

CHARACTERS:
${data.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

SETTING: ${data.setting}
ART STYLE: ${data.artStyle}

Create a detailed illustration plan for this page. Children's book illustrations should:
- Be visually engaging and age-appropriate
- Support the text without duplicating it
- Show characters with expressive faces and body language
- Have clear, readable compositions
- Use the full page effectively

CRITICAL: NO TEXT should appear in the illustration. The text will be added separately.

Output ONLY valid JSON:
{
  "scene": "Brief description of the moment (5-10 words)",
  "visualDescription": "Detailed description of what to draw (100+ words)",
  "characterPositions": "Where each character is positioned and what they're doing",
  "backgroundDetails": "Setting elements, objects, environmental details",
  "colorMood": "Color palette and emotional mood (warm, cool, vibrant, etc.)"
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    return parseJSONFromResponse(response) as {
      scene: string;
      visualDescription: string;
      characterPositions: string;
      backgroundDetails: string;
      colorMood: string;
    };
  } catch {
    return {
      scene: `Page ${data.pageNumber} illustration`,
      visualDescription: `A charming illustration for page ${data.pageNumber} showing the scene described in the text`,
      characterPositions: 'Characters centered in the scene',
      backgroundDetails: data.setting,
      colorMood: 'warm and inviting',
    };
  }
}

export async function generateCoverImage(coverPrompt: string): Promise<string> {
  const fullPrompt = `Professional book cover, high quality, 1600x2560 aspect ratio, suitable for Amazon KDP. ${coverPrompt}`;

  const result = await getGeminiImage().generateContent(fullPrompt);

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

// Generate detailed visual character sheets for consistent illustrations
export async function generateCharacterVisualGuide(data: {
  title: string;
  genre: string;
  artStyle: string;
  characters: { name: string; description: string }[];
}): Promise<{
  characters: Array<{
    name: string;
    physicalDescription: string;
    clothing: string;
    distinctiveFeatures: string;
    colorPalette: string;
    expressionNotes: string;
  }>;
  styleNotes: string;
}> {
  const prompt = `You are an art director creating a character design guide for a ${data.genre} book titled "${data.title}".

The illustrations will be in ${data.artStyle} style.

CHARACTERS TO DESIGN:
${data.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Create DETAILED visual descriptions for each character that an illustrator can follow consistently across all illustrations. For each character provide:

1. Physical Description: Age appearance, height/build, face shape, hair (color, style, length), eye color, skin tone
2. Clothing: Their typical outfit in detail (colors, style, accessories)
3. Distinctive Features: Unique identifying marks, props they carry, signature poses/gestures
4. Color Palette: 3-4 specific colors associated with this character
5. Expression Notes: How this character typically expresses emotion, their default expression

Also provide overall style notes for maintaining consistency across illustrations.

CRITICAL: These descriptions will be used to generate AI illustrations. Be VERY specific about visual details. If a character is a child, specify apparent age. If they have a pet or companion, describe it too.

Output ONLY valid JSON:
{
  "characters": [
    {
      "name": "Character Name",
      "physicalDescription": "Detailed physical traits...",
      "clothing": "Typical outfit description...",
      "distinctiveFeatures": "Unique visual identifiers...",
      "colorPalette": "Primary colors for this character...",
      "expressionNotes": "How they show emotion..."
    }
  ],
  "styleNotes": "Overall style guidance for consistency..."
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    return parseJSONFromResponse(response) as {
      characters: Array<{
        name: string;
        physicalDescription: string;
        clothing: string;
        distinctiveFeatures: string;
        colorPalette: string;
        expressionNotes: string;
      }>;
      styleNotes: string;
    };
  } catch {
    // Return a basic guide if parsing fails
    return {
      characters: data.characters.map(c => ({
        name: c.name,
        physicalDescription: c.description,
        clothing: 'Appropriate attire for the story setting',
        distinctiveFeatures: 'As described in character description',
        colorPalette: 'Warm, inviting colors',
        expressionNotes: 'Natural, story-appropriate expressions',
      })),
      styleNotes: `Maintain consistent ${data.artStyle} style throughout all illustrations.`,
    };
  }
}

// Generate a visual style guide for the book's illustrations
export async function generateVisualStyleGuide(data: {
  title: string;
  genre: string;
  artStyle: string;
  artStylePrompt: string;
  premise: string;
  bookFormat: string;
}): Promise<{
  overallStyle: string;
  colorPalette: string;
  lightingStyle: string;
  lineWeight: string;
  backgroundTreatment: string;
  moodAndAtmosphere: string;
  consistencyRules: string[];
}> {
  const prompt = `You are an art director creating a visual style guide for illustrated book.

BOOK DETAILS:
- Title: "${data.title}"
- Genre: ${data.genre}
- Art Style: ${data.artStyle} (${data.artStylePrompt})
- Format: ${data.bookFormat}
- Premise: ${data.premise}

Create a comprehensive style guide that ensures ALL illustrations in this book look like they belong together.

Define:
1. Overall Style: How the ${data.artStyle} style should be interpreted for this specific book
2. Color Palette: Primary, secondary, and accent colors to use throughout
3. Lighting Style: How light and shadow should be rendered
4. Line Weight: Thick/thin lines, outline style, edge treatment
5. Background Treatment: How backgrounds should be handled
6. Mood & Atmosphere: The emotional tone all illustrations should convey
7. Consistency Rules: 5-7 specific rules to maintain visual consistency

Output ONLY valid JSON:
{
  "overallStyle": "Description of the overall visual approach...",
  "colorPalette": "Specific colors and their usage...",
  "lightingStyle": "How to handle light and shadow...",
  "lineWeight": "Line treatment approach...",
  "backgroundTreatment": "How to handle backgrounds...",
  "moodAndAtmosphere": "Emotional tone...",
  "consistencyRules": ["Rule 1", "Rule 2", "Rule 3", "Rule 4", "Rule 5"]
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    return parseJSONFromResponse(response) as {
      overallStyle: string;
      colorPalette: string;
      lightingStyle: string;
      lineWeight: string;
      backgroundTreatment: string;
      moodAndAtmosphere: string;
      consistencyRules: string[];
    };
  } catch {
    return {
      overallStyle: `${data.artStyle} style illustration`,
      colorPalette: 'Harmonious colors appropriate for the genre',
      lightingStyle: 'Natural, consistent lighting',
      lineWeight: 'Medium line weight with clean edges',
      backgroundTreatment: 'Detailed but not distracting backgrounds',
      moodAndAtmosphere: `Appropriate for ${data.genre}`,
      consistencyRules: [
        'Maintain consistent character proportions',
        'Use the same color palette throughout',
        'Keep lighting direction consistent within scenes',
        `Apply ${data.artStyle} style consistently`,
        'Ensure all characters are recognizable across illustrations',
      ],
    };
  }
}
