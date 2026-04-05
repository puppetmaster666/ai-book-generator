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
   - EXACT hair color (e.g., "golden blonde", "jet black", "auburn red", "chocolate brown" -- NOT just "brown" or "blonde")
   - EXACT hair style and length (e.g., "shoulder-length wavy hair with side-swept bangs", "short spiky hair", "long straight hair in a ponytail")
   - Face shape (oval, round, square, heart-shaped, angular)
   - Eye color AND eye shape (almond-shaped, round, etc.)
   - Skin tone (fair, olive, tan, dark brown, etc.)
   - Age appearance (child around 6, teenager, young adult in 20s, etc.)
   - Nose shape and any notable facial features
   - FACIAL HAIR: clean-shaven, stubble, full beard, mustache, goatee, etc. Be explicit. If no facial hair, say "clean-shaven"

2. Body Type & Physique (CRITICAL for consistency):
   - Height: specific (e.g., "tall at 6'2", "petite at 5'1", "average height")
   - Build: specific (e.g., "muscular and broad-shouldered", "thin and wiry", "stocky and compact", "soft and round", "athletic and lean")
   - Posture: how they carry themselves (e.g., "stands straight with confidence", "slight slouch", "hunched over")
   - Proportions: relative to other characters (e.g., "towers over the others", "smallest in the group")

3. Clothing: Their CONSISTENT outfit throughout the story (${isNoir ? 'grayscale shading' : 'colors'}, style, accessories they always wear)

4. Distinctive Features: Unique visual identifiers that make them INSTANTLY recognizable (glasses, freckles, a specific accessory, a scar, etc.)

5. ${isNoir ? 'Grayscale Palette' : 'Color Palette'}: ${isNoir ? '3-4 SPECIFIC grayscale values (like "pure black", "charcoal gray", "light gray", "pure white") -- ABSOLUTELY NO COLORS' : '3-4 SPECIFIC hex-describable colors (like "bright red #E74C3C", "navy blue", "sunny yellow")'}

6. Expression Notes: Their default facial expression and how they typically emote

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
  faceOnly?: boolean; // If true, skip full body portraits (saves ~50% time for previews)
}): Promise<Array<{
  characterName: string;
  facePortrait: string;  // Base64 data URL
  fullBodyPortrait: string;  // Base64 data URL
}>> {
  const modeLabel = data.faceOnly ? '(face only mode)' : '(face + full body)';
  console.log(`[Portrait Gen] Generating ${data.characterVisualGuide.characters.length} character portraits IN PARALLEL ${modeLabel}...`);

  // Generate ALL character portraits in parallel (not sequential)
  const portraitPromises = data.characterVisualGuide.characters.map(async (character) => {
    console.log(`[Portrait Gen] Creating portraits for "${character.name}"...`);

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
      bookFormat: 'square',
      characterVisualGuide: undefined,
      visualStyleGuide: undefined,
      referenceImages: undefined,
    });

    if (!faceResult) {
      console.error(`[Portrait Gen] FAILED to generate face portrait for "${character.name}"`);
      return null;
    }

    console.log(`[Portrait Gen] Face portrait for "${character.name}"`);

    if (data.faceOnly) {
      return {
        characterName: character.name,
        facePortrait: faceResult.imageUrl,
        fullBodyPortrait: faceResult.imageUrl,
      };
    }

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
      bookFormat: 'square',
      characterVisualGuide: undefined,
      visualStyleGuide: undefined,
      referenceImages: undefined,
    });

    if (!fullBodyResult) {
      console.error(`[Portrait Gen] FAILED to generate full body portrait for "${character.name}"`);
      return {
        characterName: character.name,
        facePortrait: faceResult.imageUrl,
        fullBodyPortrait: faceResult.imageUrl,
      };
    }

    console.log(`[Portrait Gen] Full body portrait for "${character.name}"`);

    return {
      characterName: character.name,
      facePortrait: faceResult.imageUrl,
      fullBodyPortrait: fullBodyResult.imageUrl,
    };
  });

  const results = await Promise.all(portraitPromises);
  const portraits = results.filter((p): p is NonNullable<typeof p> => p !== null);

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
    'manga': "Clean G-pen inking with screentone shading, cel-shaded coloring with precise highlights, large expressive eyes with iris reflections, speed lines for motion, Makoto Shinkai atmospheric lighting, distinct anime face proportions, hair with individual strand detail and glossy highlights.",
    'anime': "Clean G-pen inking with screentone shading, cel-shaded coloring with precise highlights, large expressive eyes with iris reflections, speed lines for motion, Makoto Shinkai atmospheric lighting, distinct anime face proportions, hair with individual strand detail and glossy highlights.",
    'noir': "Heavy India ink with stark chiaroscuro, deep pooling blacks consuming 60%+ of frame, razor-sharp light edges, Frank Miller and Mike Mignola shadow blocking, German Expressionist angles, rain-slicked reflections, venetian blind shadow patterns. ZERO COLOR — pure black/white/gray only.",
    'superhero': "Bold black inking with dynamic line weight variation, dramatic foreshortening and heroic perspective, vivid saturated colors with Ben-Day halftone texture, Kirby Krackle energy effects, muscular dynamic poses with fabric flow physics, dramatic rim lighting, Jim Lee and Jack Kirby inspired.",
    'retro': "Visible halftone Ben-Day dot printing, limited CMYK four-color palette, aged yellowed newsprint texture, offset printing registration artifacts, bold simplified ink lines, Roy Lichtenstein pop art compositions, Silver Age comic aesthetic with period printing imperfections.",
    'watercolor': "Wet-on-wet technique with visible paper grain and pigment blooms, soft translucent washes bleeding at edges, warm muted palette with saturated accents, deckled soft edges, visible brushstrokes with light pencil underdrawing, atmospheric depth through layered glazes. Jerry Pinkney and Lisbeth Zwerger quality.",
    'cartoon': "Thick clean 3px black outlines, flat cel-shaded coloring with subtle gradient shadows, exaggerated expressive proportions (large heads, small bodies), vibrant saturated complementary colors, smooth vector-clean edges, dynamic squash-and-stretch poses, Pixar-meets-Cartoon-Network quality.",
    'classic': "Fine cross-hatching and ink wash technique, muted earth-tone palette (ochre, sage, dusty rose, cream), detailed naturalistic backgrounds, hand-drawn pen stroke texture, gentle dappled lighting, antique book plate quality, Beatrix Potter and Arthur Rackham craftsmanship.",
    'storybook': "Fine cross-hatching and ink wash technique, muted earth-tone palette (ochre, sage, dusty rose, cream), detailed naturalistic backgrounds, hand-drawn pen stroke texture, gentle dappled lighting, antique book plate quality, Beatrix Potter and Arthur Rackham craftsmanship.",
    'fantasy': "Luminous magical lighting with oil-on-canvas impasto texture, rich jewel-tone palette (emerald, sapphire, amethyst, gold), epic scale with atmospheric perspective, Ghibli-inspired background depth, magical particle effects (floating lights, glowing runes), dramatic chiaroscuro with warm-cool contrast. Brian Froud and Alan Lee quality."
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
