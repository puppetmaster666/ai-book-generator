import { getGeminiFlash } from '../shared/api-client';
import { parseJSONFromResponse } from '../shared/json-utils';
import { generateIllustrationWithRetry } from '@/lib/illustration-utils';

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
  const isNoir = data.artStyle.toLowerCase().includes('noir');
  const colorInstruction = isNoir
    ? 'NOIR BLACK AND WHITE ONLY: This is a noir/monochrome style. Use ONLY grayscale values (black, white, and shades of gray). NO colors whatsoever.'
    : '';

  const prompt = `You are an art director creating a character design guide for a ${data.genre} book titled "${data.title}".

The illustrations will be in ${data.artStyle} style.
${colorInstruction}

CHARACTERS TO DESIGN:
${data.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

DESIGN PRINCIPLES - Create distinctive, memorable characters:
- Give each character a UNIQUE silhouette that's instantly recognizable
- Vary body types, heights, and builds realistically
- Match character ethnicity and features to the SETTING and GENRE (Japanese characters for manga set in Japan, French characters for European settings, etc.)
- For anime/manga: use classic anime aesthetics appropriate to the genre (shounen, shoujo, seinen, 80s/90s City Hunter style, modern isekai, etc.)
- Clothing should reflect personality, era, and setting - not generic outfits
- If a character has powers, show it through subtle visual cues (not just glowing marks)

COPYRIGHT PROTECTION - CRITICAL:
- Create 100% ORIGINAL character designs - NEVER copy from existing media, cartoons, anime, comics, or films
- Even if a character's NAME matches a famous character (Velma, Daphne, Batman, Spider-Man, Naruto, etc.), you MUST create a COMPLETELY UNIQUE visual design
- DO NOT use signature features from copyrighted characters (Scooby-Doo's collar, Spider-Man's web pattern, Batman's cape, anime character hairstyles from existing shows, etc.)
- DO NOT make characters look like actors, celebrities, or existing fictional characters
- If you suspect a character name is from existing media, deliberately design them to look NOTHING like the famous version
- Example: A character named "Velma" should NOT have orange turtleneck, bob haircut, or glasses similar to Scooby-Doo's Velma - create a completely different look

Create EXTREMELY DETAILED visual descriptions for each character that an illustrator can follow consistently across ALL illustrations. These must be specific enough that the character is INSTANTLY recognizable in every single image.

For each character provide:

1. Physical Description (BE EXTREMELY SPECIFIC):
   - EXACT hair color (e.g., "golden blonde", "jet black", "auburn red", "chocolate brown" - NOT just "brown" or "blonde")
   - EXACT hair style and length (e.g., "shoulder-length wavy hair with side-swept bangs", "short spiky hair", "long straight hair in a ponytail")
   - Face shape (oval, round, square, heart-shaped, angular)
   - Eye color AND eye shape (almond-shaped, round, etc.)
   - Skin tone (fair, olive, tan, dark brown, etc.)
   - Age appearance (child around 6, teenager, young adult in 20s, etc.)
   - Height/build (tall and lanky, short and stocky, average height with athletic build)
   - Nose shape and any notable facial features

2. Clothing: Their CONSISTENT outfit throughout the story (${isNoir ? 'grayscale shading' : 'colors'}, style, accessories they always wear)

3. Distinctive Features: Unique visual identifiers that make them INSTANTLY recognizable (glasses, freckles, a specific accessory, a scar, etc.)

4. ${isNoir ? 'Grayscale Palette' : 'Color Palette'}: ${isNoir ? '3-4 SPECIFIC grayscale values (like "pure black", "charcoal gray", "light gray", "pure white") - ABSOLUTELY NO COLORS' : '3-4 SPECIFIC hex-describable colors (like "bright red #E74C3C", "navy blue", "sunny yellow")'}

5. Expression Notes: Their default facial expression and how they typically emote

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

/**
 * Generate canonical character portrait images for consistent reference across all panels.
 * This creates dedicated portrait images (face + full body) that are used as references
 * when generating story panels, ensuring characters look identical throughout the book.
 *
 * Benefits:
 * - Better quality references than using first appearance from a scene
 * - Focused portraits with clean backgrounds and neutral poses
 * - Both face and full-body shots for comprehensive reference
 * - Avoids the "first appearance might be bad" problem
 */
export async function generateCharacterPortraits(data: {
  title: string;
  genre: string;
  artStyle: string;
  bookFormat: string;
  characterVisualGuide: {
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
}): Promise<Array<{
  characterName: string;
  facePortrait: string;  // Base64 data URL
  fullBodyPortrait: string;  // Base64 data URL
}>> {
  const portraits = [];

  console.log(`[Portrait Gen] Generating ${data.characterVisualGuide.characters.length} character portraits...`);

  for (const character of data.characterVisualGuide.characters) {
    console.log(`[Portrait Gen] Creating portraits for "${character.name}"...`);

    // Generate face portrait (head and shoulders, neutral expression)
    const faceScene = `Professional character portrait - CLOSE-UP of head and shoulders only, facing forward directly at camera, neutral calm expression, clean solid color background.

CHARACTER: ${character.name}
Physical Description: ${character.physicalDescription}
Clothing (shoulders visible): ${character.clothing}
Distinctive Features: ${character.distinctiveFeatures}
Color Palette: ${character.colorPalette}

CRITICAL REQUIREMENTS:
- This is a REFERENCE PORTRAIT for character consistency - make it clear and well-lit
- Character facing directly forward at camera (front view)
- Neutral, calm expression (no extreme emotions)
- Clean, simple background - solid color or subtle gradient
- Focus on facial features, hair, and distinctive characteristics
- Show head, neck, and shoulders only
- Professional portrait quality - this will be the canonical reference for this character`;

    const faceResult = await generateIllustrationWithRetry({
      scene: faceScene,
      artStyle: data.artStyle,
      bookTitle: data.title,
      chapterTitle: `${character.name} Portrait`,
      bookFormat: 'square', // Square format for portraits
      characterVisualGuide: undefined, // Don't pass guide to avoid recursion
      visualStyleGuide: undefined,
      referenceImages: undefined, // No references for portraits - this IS the reference
    });

    if (!faceResult) {
      console.error(`[Portrait Gen] FAILED to generate face portrait for "${character.name}"`);
      continue;
    }

    console.log(`[Portrait Gen] Face portrait for "${character.name}"`);

    // Generate full body portrait (standing pose, neutral stance)
    const fullBodyScene = `Professional character reference sheet - FULL BODY shot showing character from head to toe, standing in neutral pose, facing forward, clean solid color background.

CHARACTER: ${character.name}
Physical Description: ${character.physicalDescription}
Clothing (full outfit): ${character.clothing}
Distinctive Features: ${character.distinctiveFeatures}
Color Palette: ${character.colorPalette}
Body Type/Build: (as described above)

CRITICAL REQUIREMENTS:
- This is a REFERENCE IMAGE for character consistency - make it clear and well-lit
- Show ENTIRE character from head to feet (full body visible)
- Standing in relaxed neutral stance (not action pose)
- Character facing directly forward at camera (front view)
- Arms at sides or relaxed position (not dynamic pose)
- Clean, simple background - solid color or subtle gradient
- Show complete outfit and physical proportions clearly
- Professional character sheet quality - this will be the canonical reference for this character's body and outfit`;

    const fullBodyResult = await generateIllustrationWithRetry({
      scene: fullBodyScene,
      artStyle: data.artStyle,
      bookTitle: data.title,
      chapterTitle: `${character.name} Full Body Reference`,
      bookFormat: 'square', // Square format for portraits
      characterVisualGuide: undefined,
      visualStyleGuide: undefined,
      referenceImages: undefined,
    });

    if (!fullBodyResult) {
      console.error(`[Portrait Gen] FAILED to generate full body portrait for "${character.name}"`);
      // Still save the face portrait if we have it
      if (faceResult) {
        portraits.push({
          characterName: character.name,
          facePortrait: faceResult.imageUrl,
          fullBodyPortrait: faceResult.imageUrl, // Use face as fallback
        });
      }
      continue;
    }

    console.log(`[Portrait Gen] Full body portrait for "${character.name}"`);

    portraits.push({
      characterName: character.name,
      facePortrait: faceResult.imageUrl,
      fullBodyPortrait: fullBodyResult.imageUrl,
    });
  }

  console.log(`[Portrait Gen] Completed ${portraits.length}/${data.characterVisualGuide.characters.length} character portraits`);
  return portraits;
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
  // Technical anchors - specific aesthetic rules for each art style to avoid generic "digital art" look
  const styleAnchors: Record<string, string> = {
    'manga': "Screentones, G Pen inking, 90s cel-shaded aesthetic, expressive micro-expressions, speed lines for motion.",
    'anime': "Screentones, G Pen inking, 90s cel-shaded aesthetic, expressive micro-expressions, speed lines for motion.",
    'noir': "High-contrast Chiaroscuro, ink-heavy, no mid-tones, dramatic black shadows, Sin City aesthetic.",
    'superhero': "Dynamic Foreshortening, Bold Black Inking, Kirby Krackle energy effects, Ben-Day dots, Silver Age comic aesthetic.",
    'retro': "Offset Printing Artifacts, Limited CMYK Palette, Aged Paper Texture, 1950s Silver Age aesthetic, halftone patterns.",
    'watercolor': "Wet-on-Wet Textures, Visible Paper Grain, Soft Color Bleeds, Pigment Blooms, translucent washes, deckled edges.",
    'cartoon': "Thick Clean Outlines, Flat/Cell Shading, Saturday Morning Cartoon style, expressive exaggerated proportions.",
    'classic': "Cross-Hatching, Ink Wash, Muted Earth-Tones, Beatrix Potter and Arthur Rackham inspired textures.",
    'storybook': "Cross-Hatching, Ink Wash, Muted Earth-Tones, Beatrix Potter and Arthur Rackham inspired textures.",
    'fantasy': "Luminous Lighting, Epic Scale, Painterly oil-on-canvas texture, Ghibli/Zelda background depth, magical atmosphere."
  };

  const normalizedStyle = data.artStyle.toLowerCase();
  const technicalAnchor = Object.entries(styleAnchors).find(([key]) => normalizedStyle.includes(key))?.[1] || "";

  const isNoir = normalizedStyle.includes('noir');
  const colorInstruction = isNoir
    ? 'NOIR BLACK AND WHITE ONLY: This is a noir/monochrome style. Use ONLY grayscale values (black, white, and shades of gray). NO colors whatsoever.'
    : '';

  const prompt = `You are an art director creating a visual style guide for illustrated book.

BOOK DETAILS:
- Title: "${data.title}"
- Genre: ${data.genre}
- Art Style: ${data.artStyle} (${data.artStylePrompt})
${technicalAnchor ? `- Technical Anchor: ${technicalAnchor}` : ''}
- Format: ${data.bookFormat}
- Premise: ${data.premise}
${colorInstruction}

Create a comprehensive style guide that ensures ALL illustrations in this book look like they belong together.
${technicalAnchor ? `\nIMPORTANT: This style MUST incorporate the Technical Anchor specifications. These are the defining characteristics that make this art style authentic and professional.` : ''}

Define:
1. Overall Style: How the ${data.artStyle} style should be interpreted for this specific book${technicalAnchor ? ', emphasizing the Technical Anchor specifications' : ''}
2. ${isNoir ? 'Grayscale Palette' : 'Color Palette'}: ${isNoir ? 'Grayscale values (black, white, shades of gray) to use throughout - ABSOLUTELY NO COLORS' : 'Primary, secondary, and accent colors to use throughout'}
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
