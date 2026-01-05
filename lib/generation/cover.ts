import { getGeminiFlash, getGeminiImage, withRetry } from './shared/api-client';

// Genre-specific cover style options for variety
const COVER_STYLE_OPTIONS: Record<string, string[]> = {
  // Fiction genres
  'romance': [
    'Silhouette of embracing couple against sunset/sunrise backdrop, soft warm tones, elegant script title',
    'Delicate floral border framing title on solid pastel background, vintage romantic aesthetic',
    'Close-up of intertwined hands or symbolic objects (roses, keys, letters), intimate mood',
    'Dreamy watercolor landscape with couple in distance, ethereal and romantic atmosphere',
    'Typography-focused with ornate lettering, subtle rose gold accents, minimalist elegance',
  ],
  'thriller': [
    'Dark atmospheric scene with single ominous element (shadow, doorway, light), high contrast',
    'Bold typography on dark background with red or yellow accent, minimalist tension',
    'Noir-style silhouette in urban setting, fog/rain effects, moody lighting',
    'Abstract geometric design with sharp angles, dark color palette, modern thriller look',
    'Close-up of symbolic object (weapon, document, key), dramatic lighting, mystery',
  ],
  'mystery': [
    'Foggy Victorian street scene, gas lamps, shadowy figure, classic mystery atmosphere',
    'Magnifying glass over map/document, vintage detective aesthetic',
    'Dark doorway or window with light streaming through, sense of unknown',
    'Silhouette holding object against moody sky, intrigue and suspense',
    'Typography-heavy design with newspaper/case file aesthetic, crime noir style',
  ],
  'fantasy': [
    'Majestic landscape with magical elements (floating islands, glowing forests), epic scope',
    'Ornate sword/artifact on decorative background, mythical metalwork aesthetic',
    'Silhouette of hero against dramatic sky with magical effects',
    'Ancient map style with decorative border, fantasy cartography look',
    'Mystical portal or doorway with magical energy, sense of wonder',
  ],
  'science_fiction': [
    'Sleek spaceship or space station against cosmic backdrop, sci-fi grandeur',
    'Futuristic cityscape with neon lights, cyberpunk/tech noir atmosphere',
    'Planet or celestial body dominating frame, cosmic scale and wonder',
    'Abstract circuit/data visualization, modern tech aesthetic',
    'Lone figure in spacesuit or against alien landscape, exploration theme',
  ],
  'horror': [
    'Decrepit building/house with ominous presence, gothic horror atmosphere',
    'Single haunting eye or face emerging from darkness, psychological terror',
    'Blood red typography on pitch black, stark and disturbing simplicity',
    'Twisted tree or dead landscape, barren and unsettling mood',
    'Vintage photograph style with supernatural element, found footage aesthetic',
  ],
  'literary_fiction': [
    'Typography-only cover with elegant serif font, classic literature aesthetic, no imagery',
    'Abstract color blocks with sophisticated typography, modern literary design',
    'Minimalist single object on solid background, symbolic and contemplative',
    'Vintage texture with embossed-style title, timeless classic feel',
    'Subtle watercolor or ink wash background, artistic and refined',
  ],
  'historical': [
    'Sepia-toned scene from the era, vintage photograph aesthetic',
    'Period-appropriate map or document as background, historical gravitas',
    'Silhouette of figure in period clothing against historical setting',
    'Ornate decorative border with era-appropriate motifs, antique book design',
    'Texture of aged paper with elegant classical typography only',
  ],
  // Non-fiction genres
  'self-help': [
    'Bright gradient background with bold modern typography, uplifting and energetic',
    'Rising sun/pathway imagery, symbolic of growth and transformation',
    'Clean geometric design with motivational color palette (blue, green, orange)',
    'Minimalist icon/symbol representing the book\'s concept, professional look',
    'Typography-focused with subtle decorative elements, clean and approachable',
  ],
  'business': [
    'Bold typography on solid color background, professional and authoritative',
    'Abstract upward graph/arrow design, success and growth theme',
    'Geometric pattern suggesting structure and organization, corporate aesthetic',
    'Minimalist icon representing business concept, clean modern design',
    'Two-tone color block design with large sans-serif title, executive style',
  ],
  'biography': [
    'Stylized portrait or silhouette of the subject, dignified presentation',
    'Symbolic object or scene from subject\'s life, narrative hook',
    'Typography-dominant with small iconic image, documentary feel',
    'Vintage photograph treatment, historical weight and authenticity',
    'Abstract representation of subject\'s achievements or era',
  ],
  'memoir': [
    'Personal photograph aesthetic, intimate and authentic feel',
    'Nostalgic landscape or setting from the story, memory trigger',
    'Single meaningful object on textured background, personal significance',
    'Handwritten-style title on warm background, intimate and personal',
    'Abstract representation of emotional journey, artistic memoir style',
  ],
  // Children's books
  'children': [
    'Bright, cheerful illustration with main character, whimsical and inviting',
    'Bold primary colors with friendly typography, playful and fun',
    'Cute animal or character portrait, appealing to young readers',
    'Scene from the story with child-friendly art style, adventure preview',
    'Interactive-looking design with fun patterns and shapes',
  ],
  // Default for unmatched genres
  'default': [
    'Typography-focused cover with elegant font on textured background, classic book design',
    'Abstract artistic design that evokes the mood of the story, sophisticated',
    'Symbolic single object or scene on clean background, minimalist impact',
    'Silhouette-based design with dramatic lighting, universal appeal',
    'Decorative border with ornate title treatment, traditional book aesthetic',
    'Modern geometric design with bold color palette, contemporary look',
  ],
};

// Get a random cover style for the genre
function getRandomCoverStyle(genre: string): string {
  const normalizedGenre = genre.toLowerCase().replace(/[- ]/g, '_');
  const styles = COVER_STYLE_OPTIONS[normalizedGenre] || COVER_STYLE_OPTIONS['default'];
  return styles[Math.floor(Math.random() * styles.length)];
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

  // Get a random genre-appropriate cover style for variety
  const randomCoverStyle = getRandomCoverStyle(bookData.genre);

  // Check if it's an illustrated/visual book (should match interior style)
  const isIllustratedBook = bookData.artStyle || bookData.visualStyleGuide || bookData.characterVisualGuide;

  const prompt = `Create a detailed image generation prompt for a professional book cover.

BOOK DETAILS:
- Title: "${bookData.title}"
${bookData.authorName ? `- Author: "${bookData.authorName}"` : ''}
- Genre: ${bookData.genre}
- Type: ${bookData.bookType}
- Premise: ${bookData.premise}
${styleInstruction}
${characterSection}
${styleConsistencySection}

${isIllustratedBook ? `ILLUSTRATED BOOK - Cover MUST match interior art style exactly.` : `SUGGESTED COVER STYLE APPROACH:
${randomCoverStyle}

You may use this suggested style as inspiration, but feel free to adapt it to best represent this specific book's themes and mood. The goal is a unique, professional cover that stands out.`}

Create a prompt for generating a book cover that:
1. Visually represents the book's theme and genre authentically
2. Is professional and suitable for Amazon KDP (1600x2560 portrait)
3. Works well at thumbnail size - title must be readable
4. Has appropriate visual hierarchy
${bookData.artStylePrompt ? `5. Uses the ${bookData.artStyle} art style CONSISTENTLY with interior illustrations` : ''}
${bookData.visualStyleGuide ? '6. Matches the color palette and mood of the interior illustrations' : ''}

COVER STYLE VARIETY - Choose ONE of these approaches based on what fits the book best:
- TYPOGRAPHY-FOCUSED: Elegant title design with minimal or no imagery, decorative elements only
- SYMBOLIC: Single meaningful object or symbol representing the story's themes
- SCENIC: Atmospheric landscape or setting that evokes the mood
- CHARACTER-BASED: Silhouette or artistic representation of protagonist (no detailed faces)
- ABSTRACT: Artistic patterns, textures, or color compositions suggesting the mood
- CLASSIC: Traditional book design with ornate borders and vintage aesthetic

The cover MUST include:
- The title "${bookData.title}" prominently displayed with excellent readability
${bookData.authorName ? `- "by ${bookData.authorName}" at the bottom (include the word "by" before the author name)` : '- DO NOT include any author name (no author specified)'}

The cover must NOT include:
- Any other text besides title${bookData.authorName ? ' and author name' : ''}
- Detailed faces (use silhouettes or artistic representations instead)
- Copyright-infringing elements
- Cluttered or busy designs that compete with the title

${bookData.bookType === 'non-fiction' ? 'For this non-fiction book, favor clean, professional designs. Typography-focused or minimalist approaches work well. A subtitle may be appropriate if it helps convey the value proposition.' : 'This is fiction - focus on mood, atmosphere, and genre conventions. Create intrigue and emotional connection.'}

CRITICAL: If this is an illustrated book, the cover art style MUST match the interior illustrations exactly.

Output ONLY the image generation prompt, nothing else.`;

  const result = await getGeminiFlash().generateContent(prompt);
  return result.response.text();
}

export async function generateCoverImage(coverPrompt: string): Promise<string> {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Sanitize prompt more aggressively on retries
      let sanitizedPrompt = coverPrompt;
      if (attempt > 0) {
        console.log(`[Cover] Retry ${attempt}: Sanitizing prompt to avoid content policy...`);
        // Remove potentially offensive words and make it more generic
        sanitizedPrompt = sanitizedPrompt
          .replace(/\b(blood|violence|weapon|gun|knife|death|kill|murder|gore)\b/gi, '')
          .replace(/\b(sexy|nude|naked|provocative)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Make it even more generic on later retries
        if (attempt > 1) {
          sanitizedPrompt = `A ${sanitizedPrompt.substring(0, 100)} book cover, family-friendly, professional design`;
        }
      }

      const fullPrompt = `Professional book cover, high quality, 1600x2560 aspect ratio, suitable for Amazon KDP, family-friendly. ${sanitizedPrompt}`;

      const result = await withRetry(async () => {
        return await getGeminiImage().generateContent(fullPrompt);
      });

      // Extract image URL or base64 from response
      const response = result.response;

      // Handle the image response based on Gemini 3 Pro Image API format
      if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        const imageData = response.candidates[0].content.parts[0].inlineData;
        console.log(`[Cover] SUCCESS on attempt ${attempt + 1}`);
        return `data:${imageData.mimeType};base64,${imageData.data}`;
      }

      throw new Error('Failed to generate cover image - no image data in response');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isContentPolicyError = errorMsg.includes('PROHIBITED_CONTENT') || errorMsg.includes('blocked');

      if (isContentPolicyError && attempt < maxRetries - 1) {
        console.log(`[Cover] Content policy block on attempt ${attempt + 1}, retrying with sanitized prompt...`);
        continue; // Retry with sanitized prompt
      }

      // Not a content policy error or no retries left
      throw error;
    }
  }

  throw new Error('Failed to generate cover after all retries');
}
