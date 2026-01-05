import { getGeminiFlash } from '../shared/api-client';
import { parseJSONFromResponse } from '../shared/json-utils';
import { ContentRating } from '../shared/writing-quality';
import { SceneDescription, PanelLayout } from './types';

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

COPYRIGHT PROTECTION - CRITICAL:
- Create 100% ORIGINAL visual descriptions - NEVER reference existing copyrighted characters, shows, movies, or comics
- Even if character names match famous characters (Velma, Daphne, Spider-Man, etc.), describe completely UNIQUE visuals
- DO NOT describe copyrighted visual elements (specific costumes, logos, signature poses, or iconic designs from existing media)
- Focus on original character designs, settings, and compositions

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
    const parsed = parseJSONFromResponse(response) as {
      illustrations: Array<{
        scene: string;
        description: string;
        characters: string[];
        emotion: string;
      }>
    };
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

COPYRIGHT PROTECTION - CRITICAL:
- Create 100% ORIGINAL visual descriptions - NEVER reference existing copyrighted characters, shows, movies, or comics
- Even if character names match famous characters (Velma, Daphne, Spider-Man, etc.), describe completely UNIQUE visuals
- DO NOT describe copyrighted visual elements (specific costumes, logos, signature poses, or iconic designs from existing media)
- Focus on original character designs, settings, and compositions

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

// Build illustration prompt from scene description (for parallel generation)
export function buildIllustrationPromptFromScene(
  scene: SceneDescription,
  artStylePrompt: string,
  characterVisualGuide?: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
      colorPalette: string;
    }>;
    styleNotes: string;
  },
  visualStyleGuide?: {
    overallStyle: string;
    colorPalette: string;
    lightingStyle: string;
    moodAndAtmosphere: string;
    consistencyRules: string[];
  },
  panelLayout?: PanelLayout,
  options?: { skipNoTextInstruction?: boolean; contentRating?: ContentRating }
): string {
  // Build character descriptions for characters in this scene - with STRONG consistency emphasis
  let characterDescriptions = '';
  let characterConsistencyReminder = '';
  let mainCharacterEmphasis = '';
  if (characterVisualGuide) {
    const sceneCharacters = scene.characters;
    const relevantChars = characterVisualGuide.characters.filter(c =>
      sceneCharacters.some(sc => sc.toLowerCase() === c.name.toLowerCase())
    );
    if (relevantChars.length > 0) {
      // Build detailed character descriptions with emphasis on recognizable features
      // Mark the first character as MAIN CHARACTER for extra emphasis
      characterDescriptions = relevantChars.map((c, index) => {
        const action = scene.characterActions[c.name] || '';
        const isMainChar = index === 0;
        const prefix = isMainChar ? 'MAIN CHARACTER - ' : '';

        // Extract hair description for triple emphasis
        const hairMatch = c.physicalDescription.match(/([\w\s-]+hair[\w\s,.-]*)/i);
        const hairDesc = hairMatch ? hairMatch[0] : '';

        // Include ALL visual details for maximum consistency
        let desc = `${prefix}${c.name}: ${c.physicalDescription}. CLOTHING: ${c.clothing}. DISTINCTIVE FEATURES: ${c.distinctiveFeatures}. COLOR PALETTE: ${c.colorPalette}${action ? `. CURRENT ACTION: ${action}` : ''}`;

        // For main character, add extra emphasis
        if (isMainChar && hairDesc) {
          desc += ` [REMEMBER: ${c.name} has ${hairDesc} - this MUST be consistent!]`;
          mainCharacterEmphasis = `The MAIN CHARACTER ${c.name} has: ${hairDesc}. ${c.distinctiveFeatures}. Draw them EXACTLY like this.`;
        }

        return desc;
      }).join('\n\n');

      // Build a specific consistency reminder for hair and face
      characterConsistencyReminder = relevantChars.map(c => {
        // Extract key identifiers from physical description for emphasis
        return `${c.name} MUST have the EXACT same: hair color, hair style, face shape, and distinctive features as described above`;
      }).join('. ');
    }
  }

  // Build the prompt
  let prompt = `${artStylePrompt}. `;

  // COPYRIGHT PROTECTION - CRITICAL: Prevent generation of famous copyrighted characters
  prompt += `
COPYRIGHT PROTECTION - ABSOLUTELY CRITICAL:
- Create 100% ORIGINAL character designs - NEVER copy from existing media, movies, TV shows, comics, or famous characters
- Even if a character's NAME matches a famous character (Superman, Batman, Spider-Man, Wonder Woman, Velma, Daphne, Scooby, Harry Potter, etc.), you MUST create COMPLETELY UNIQUE visual designs that look NOTHING like the copyrighted character
- DO NOT use ANY signature elements from copyrighted characters:
  * NO iconic costumes (Superman's blue suit with S symbol, Batman's bat suit, Spider-Man's web pattern, Wonder Woman's tiara, etc.)
  * NO trademarked symbols, logos, or insignias on clothing (S, Bat symbol, Spider symbol, etc.)
  * NO distinctive hairstyles, glasses, or accessories from famous characters
  * NO signature colors or visual styles associated with copyrighted characters
- If the character name is "Superman", create a unique person with NO connection to the copyrighted character - different hair, different clothes, NO cape, NO S symbol, COMPLETELY ORIGINAL
- This is LEGALLY REQUIRED to avoid copyright infringement and potential lawsuit
END COPYRIGHT PROTECTION

`;

  // Add location context first
  if (scene.location) {
    prompt += `Setting: ${scene.location}. `;
  }

  // Add scene description
  prompt += `${scene.description}. `;

  // Add character details with STRONG consistency emphasis
  if (characterDescriptions) {
    prompt += `

=== CRITICAL CHARACTER CONSISTENCY REQUIREMENTS ===
You MUST draw these characters EXACTLY as described. Do NOT change their hair color, hair style, face shape, or distinctive features. Each character must be INSTANTLY recognizable.

${characterDescriptions}

=== END CHARACTER DESCRIPTIONS ===

`;
  } else if (scene.characters.length > 0) {
    const actions = Object.entries(scene.characterActions)
      .map(([char, action]) => `${char}: ${action}`)
      .join(', ');
    prompt += `Characters in scene: ${actions}. `;
  }

  // Add background and mood
  prompt += `Environment: ${scene.background}. `;
  prompt += `Mood: ${scene.mood}. `;
  prompt += `Camera angle: ${scene.cameraAngle}. `;

  // Add style guide if available
  if (visualStyleGuide) {
    prompt += `Style: ${visualStyleGuide.overallStyle}. `;
    prompt += `Colors: ${visualStyleGuide.colorPalette}. `;
    prompt += `Lighting: ${visualStyleGuide.lightingStyle}. `;
  }

  // Add composition and depth directives for professional cinematography
  prompt += `
=== COMPOSITION & DEPTH ===
- FOCUS VARIATION: Use 'Deep Focus' for establishing shots (sharp background), 'Shallow Focus' (blurred background) for intimate close-ups.
- SILHOUETTES: Consider high-contrast silhouettes to build mood and atmosphere.
- VERTICALITY: Camera angle already specified, but reinforce - low angles = power/threat, high angles = vulnerability.
`;

  // Add SFX instructions for comic-style books
  if (panelLayout) {
    prompt += `
=== SOUND EFFECTS (SFX) ===
- If the scene has action, include stylized SFX typography integrated into the composition.
- SFX should have visual impact: "Jagged, bold lettering", "Explosion-style burst", "Electric crackling effect".
- Position SFX to enhance the action, not float randomly in corners.
`;
  }

  // Add panel layout instructions for comics
  if (panelLayout && panelLayout !== 'splash') {
    const layoutInstructions: Record<PanelLayout, string> = {
      'splash': '', // Full page, no special instructions
      'two-panel': 'IMPORTANT: Draw this as a COMIC PAGE with 2 PANELS arranged vertically or horizontally. Each panel shows a different moment in the sequence described. Use clear panel borders with gutters between panels.',
      'three-panel': 'IMPORTANT: Draw this as a COMIC PAGE with 3 PANELS. Can be vertical strip, horizontal strip, or 2+1 layout. Each panel shows a sequential moment. Include clear panel borders and gutters.',
      'four-panel': 'IMPORTANT: Draw this as a COMIC PAGE with 4 PANELS in a 2x2 grid layout. Each panel shows a quick sequential moment for action pacing. Use clear panel borders and consistent gutters.',
    };
    prompt += ` ${layoutInstructions[panelLayout]} `;
  }

  // Add STRONG consistency reminder for character appearances at the end
  if (characterDescriptions && characterConsistencyReminder) {
    prompt += `FINAL REMINDER - CHARACTER CONSISTENCY IS CRITICAL: ${characterConsistencyReminder}. DO NOT deviate from the described hair color, hair style, face shape, skin tone, or clothing. The characters must look IDENTICAL across all illustrations. `;
    // Add extra emphasis for main character if available
    if (mainCharacterEmphasis) {
      prompt += `${mainCharacterEmphasis} `;
    }
  }

  // Add mature content visual directives for adult comics
  if (options?.contentRating === 'mature') {
    prompt += `

=== MATURE VISUAL STYLE ===
This is an ADULT comic. Make the visuals match the mature tone:
- ATMOSPHERE: Dark, gritty, moody lighting. Shadows and noir aesthetics.
- EXPRESSIONS: Characters should show intense emotions - anger, desire, fear, lust, cynicism
- BODY LANGUAGE: Sensual poses where appropriate, aggressive stances, intimate proximity between characters
- ROMANCE SCENES: Show physical attraction openly - characters close together, touching, kissing, suggestive poses
- VIOLENCE SCENES: Show the aftermath - blood splatters, injuries, weapons, menacing poses
- OVERALL: This should look like an adult graphic novel, NOT a children's book. Make it feel mature and edgy.
=== END MATURE STYLE ===

`;
  }

  // Add critical instructions
  if (!options?.skipNoTextInstruction) {
    prompt += 'NO TEXT or letters in the image. ';
  }
  prompt += 'Full color illustration.';

  return prompt;
}

// Helper to build prompt for speech bubbles in comics
export function buildSpeechBubblePrompt(dialogue: Array<{
  speaker: string;
  text: string;
  position: string;
  type?: string;
}>): string {
  if (!dialogue || dialogue.length === 0) return '';

  let prompt = `\n\nSPEECH BUBBLES INSTRUCTION (CRITICAL):\nThis is a comic panel. You MUST include ${dialogue.length} speech bubbles in the image containing EXACTLY the following text:\n`;

  dialogue.forEach((d, i) => {
    prompt += `${i + 1}. Speaker: "${d.speaker}" (Location: ${d.position})\n   Text inside bubble: "${d.text}"\n`;
  });

  prompt += `\nRULES FOR TEXT:\n- The text must be LEGIBLE, CLEAR, and correctly spelled.\n- Place bubbles near the speaking characters but DO NOT cover their faces.\n- Use standard comic book lettering style.\n- Ensure high contrast between text and bubble background.\n`;

  return prompt;
}

// Helper for picture book text (text at bottom)
export function buildPictureBookTextPrompt(text: string): string {
  if (!text) return '';

  // For picture books, we usually want the text distinct or we let the client render it.
  // But if we want it baked in (like a poster):
  return `\n\nTEXT INTEGRATION:\nAt the bottom of the image, include the following story text in a clear, readable storybook font:\n"${text}"\n\nEnsure the text is legible against the background (use a text box or gradient if needed).`;
}
