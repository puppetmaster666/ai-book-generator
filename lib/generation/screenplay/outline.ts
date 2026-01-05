import {
  BeatSheet,
  CharacterProfile,
  SEQUENCE_TO_BEATS,
} from '@/lib/screenplay';
import { SAFETY_SETTINGS } from '../shared/safety';
import { getGeminiFlash, withTimeout } from '../shared/api-client';
import { parseJSONFromResponse } from '../shared/json-utils';

/**
 * Generate a complete beat sheet (outline) for a screenplay
 * Uses Save the Cat 15-beat structure
 */
export async function generateScreenplayOutline(data: {
  idea: string;
  genre: string;
  title: string;
  targetPages?: number;
}): Promise<{
  beatSheet: BeatSheet;
  characters: CharacterProfile[];
  estimatedPages: number;
}> {
  const targetPages = data.targetPages || 100;

  const prompt = `You are a Hollywood screenwriter creating a feature film beat sheet using the Save the Cat structure.

MOVIE CONCEPT:
Title: "${data.title}"
Genre: ${data.genre}
Premise: ${data.idea}
Target Length: ${targetPages} pages (approximately ${targetPages} minutes)

Create a detailed beat sheet with the 15 Save the Cat beats. Each beat should be specific and detailed, not generic.

BEAT SHEET REQUIREMENTS:
- Logline: One sentence pitch under 30 words
- Theme: The thematic question/statement the movie explores
- All 15 beats with specific plot points (not generic descriptions)
- 1-2 subplots that intersect with the main plot

ALSO CREATE 3-5 main character profiles with:
- Name and role (protagonist/antagonist/supporting)
- Want: External goal they're pursuing
- Need: Internal lesson they must learn
- Flaw: Character flaw that creates conflict
- Internal Conflict: The SECRET they're hiding (drives all subtext)
- Dialogue Archetype: How they use language as a weapon:
  * "The Evader" - deflects with humor, changes subject, never gives straight answers
  * "The Steamroller" - bulldozes conversations, interrupts, dominates through volume
  * "The Professor" - over-explains, lectures, uses precision to maintain control
  * "The Reactor" - speaks in short bursts, responds emotionally, often monosyllabic
- Brief backstory
- Voice traits: vocabulary style, speech rhythm, verbal tics

CRITICAL FORMAT RULES:
- Be SPECIFIC. "Jack discovers his wife is having an affair" not "Protagonist faces a challenge"
- Each beat should be 2-3 sentences describing the actual scene/moment
- Characters should be named, not described generically

Output ONLY valid JSON:
{
  "beatSheet": {
    "logline": "One sentence pitch...",
    "theme": "The thematic statement...",
    "beats": {
      "openingImage": "Page 1 visual that sets tone...",
      "themeStated": "Page 5 - Someone states the theme...",
      "setup": "Pages 1-10 - Establish world and character...",
      "catalyst": "Page 12 - The inciting incident...",
      "debate": "Pages 12-25 - Protagonist resists...",
      "breakIntoTwo": "Page 25 - Active choice to enter new world...",
      "bStory": "Page 30 - B-story introduction...",
      "funAndGames": "Pages 30-55 - Promise of the premise...",
      "midpoint": "Page 55 - False victory or defeat...",
      "badGuysCloseIn": "Pages 55-75 - Things get harder...",
      "allIsLost": "Page 75 - Lowest point...",
      "darkNightOfSoul": "Pages 75-85 - Processing loss...",
      "breakIntoThree": "Page 85 - A and B stories combine...",
      "finale": "Pages 85-110 - Confrontation and resolution...",
      "finalImage": "Page 110 - Visual mirror of opening..."
    },
    "subplots": [
      {
        "name": "B-Story: Romance/Mentorship",
        "characters": ["Character1", "Character2"],
        "arc": "Brief description of subplot arc...",
        "intersectionPoints": [3, 4, 6, 7]
      }
    ]
  },
  "characters": [
    {
      "name": "CHARACTER NAME",
      "role": "protagonist",
      "want": "External goal...",
      "need": "Internal lesson...",
      "flaw": "Character flaw...",
      "internalConflict": "The secret they're hiding...",
      "dialogueArchetype": "The Evader",
      "backstory": "Brief relevant history...",
      "voiceTraits": {
        "vocabulary": "blue-collar, direct, occasional profanity",
        "rhythm": "short sentences, interrupts others",
        "tics": "says 'look' to start sentences"
      }
    }
  ]
}`;

  const result = await withTimeout(
    () => getGeminiFlash().generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 8192,
      },
      safetySettings: SAFETY_SETTINGS,
    }),
    120000,
    'generateScreenplayOutline'
  );

  const response = result.response.text();
  const parsed = parseJSONFromResponse(response) as {
    beatSheet: BeatSheet;
    characters: CharacterProfile[];
  };

  return {
    beatSheet: parsed.beatSheet,
    characters: parsed.characters,
    estimatedPages: targetPages,
  };
}
