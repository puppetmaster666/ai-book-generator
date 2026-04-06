/**
 * Scene Rephraser
 * When Gemini blocks an image generation prompt, this uses Gemini Flash
 * to intelligently rephrase the scene description to bypass content filters
 * while preserving the humor and intent.
 *
 * Instead of dumb word replacement ("blood" -> "red liquid") or fallback
 * to "peaceful landscape with no people", this asks the AI to creatively
 * rewrite the scene to be visually safe while keeping the joke intact.
 */

import { getGeminiFlash } from './shared/api-client';

/**
 * Rephrase a blocked scene description to make it visually safe for image generation
 * while preserving the comedic intent and story context.
 *
 * @param originalScene - The scene description that was blocked
 * @param context - Optional context about the story/character for better rephrasing
 * @param attemptNumber - Which retry attempt (higher = more aggressive rephrasing)
 * @returns Rephrased scene description that should pass content filters
 */
export async function rephraseBlockedScene(
  originalScene: string,
  context?: { title?: string; character?: string; genre?: string },
  attemptNumber: number = 1
): Promise<string> {
  const aggressiveness = attemptNumber <= 1
    ? 'Change as little as possible. Just rephrase the parts that would trigger an AI image safety filter.'
    : attemptNumber === 2
      ? 'Be more creative with the rephrasing. Use visual metaphors, implied action, or comedic exaggeration instead of showing anything that could be flagged.'
      : 'Completely reimagine the scene to be family-friendly while keeping the same punchline or joke. Think of how a PG-rated comedy movie would show this moment.';

  const prompt = `You are rephrasing a scene description for an AI image generator. The original was blocked by content safety filters. Your job is to rewrite it so it passes the filters while keeping the humor and story intent intact.

ORIGINAL BLOCKED SCENE:
"${originalScene}"

${context?.title ? `STORY: "${context.title}"` : ''}
${context?.character ? `MAIN CHARACTER: ${context.character}` : ''}
${context?.genre ? `GENRE: ${context.genre}` : ''}

REPHRASING RULES:
1. ${aggressiveness}
2. Keep all character names and their actions/roles in the scene.
3. Keep the comedy. If someone is being embarrassed, they should still be embarrassed. Just change HOW it is shown.
4. Replace anything sexually explicit with awkward/embarrassing but clothed situations.
5. Replace graphic violence with slapstick, cartoon physics, or implied consequences.
6. Replace drug/alcohol abuse with food, energy drinks, or other harmless substitutes.
7. Keep the same location and setting.
8. The rephrased scene must still make sense as a comic panel illustration.
9. DO NOT add meta-commentary like "in a family-friendly way" to the description. Just describe the scene directly.
10. Output ONLY the rephrased scene description. Nothing else. No quotes, no explanation.

EXAMPLES OF GOOD REPHRASING:
- "Character punches someone in the face, blood everywhere" -> "Character's fist connects with a loud WHACK, the other person's toupee flying off comically"
- "Character passed out drunk in a bar" -> "Character slumped over a table surrounded by empty milkshake glasses, whipped cream on their face"
- "Character in revealing underwear" -> "Character wrapped in a towel that is slipping, desperately trying to hold it together"
- "Character with a gun threatening someone" -> "Character pointing a water gun menacingly while the other person tries not to laugh"

Rephrase the scene now:`;

  try {
    const model = getGeminiFlash();
    const result = await model.generateContent(prompt);
    const rephrased = result.response.text()?.trim();

    if (!rephrased || rephrased.length < 20) {
      console.warn('[SceneRephraser] Rephrasing returned too short, using sanitized fallback');
      return sanitizeFallback(originalScene);
    }

    console.log(`[SceneRephraser] Rephrased scene (attempt ${attemptNumber}): "${rephrased.substring(0, 100)}..."`);
    return rephrased;
  } catch (error) {
    console.warn('[SceneRephraser] Rephrasing failed, using sanitized fallback:', error instanceof Error ? error.message : error);
    return sanitizeFallback(originalScene);
  }
}

/**
 * Simple word-replacement fallback if the AI rephraser itself fails.
 */
function sanitizeFallback(text: string): string {
  const replacements: Record<string, string> = {
    'blood': 'red paint', 'bloody': 'messy', 'bleeding': 'dripping',
    'kill': 'confront', 'murder': 'prank', 'dead': 'unconscious',
    'knife': 'rubber chicken', 'weapon': 'prop', 'gun': 'water gun',
    'naked': 'in a towel', 'nude': 'in a bathrobe',
    'sexy': 'ridiculous', 'seductive': 'awkward',
    'drunk': 'sugar-crashed', 'wasted': 'exhausted',
    'violent': 'chaotic', 'attack': 'charge at',
  };

  let sanitized = text;
  for (const [word, replacement] of Object.entries(replacements)) {
    sanitized = sanitized.replace(new RegExp(`\\b${word}\\b`, 'gi'), replacement);
  }
  return sanitized;
}
