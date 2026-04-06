/**
 * Danbooru Tag Translator
 * Converts natural language scene descriptions into Danbooru-style tags
 * that Pony V6 XL understands. Uses whichever text AI is available.
 */

import { generateTextWithProvider } from '@/lib/generation/shared/api-client';

/**
 * Convert a natural language scene description into Danbooru tags for Pony V6.
 * Uses the available text AI (Featherless > Mistral > Gemini) to translate.
 */
export async function sceneToDanbooruTags(
  sceneDescription: string,
  options?: {
    nsfw?: boolean;
    artStyle?: string;
    characterDescription?: string;
    contentRating?: string;
  }
): Promise<string> {
  const isExplicit = options?.nsfw || options?.contentRating === 'mature';

  const prompt = `Convert this scene description into Danbooru-style tags for an AI image generator (Pony Diffusion V6 XL). Output ONLY comma-separated tags, nothing else.

SCENE: "${sceneDescription}"
${options?.characterDescription ? `CHARACTER: "${options.characterDescription}"` : ''}

RULES:
- Output ONLY tags separated by commas. No sentences, no explanations.
- Use Danbooru tag format: lowercase, underscores for spaces (e.g. long_hair, blue_eyes)
- Include tags for: characters (count, gender, body type), clothing/nudity state, pose, action, expression, setting/background, camera angle, lighting
- Be SPECIFIC. "standing in kitchen" = 1girl, standing, kitchen, indoor, counter, tiles
- Include body tags: hair color, eye color, body type, skin tone
- Include composition: close-up, wide_shot, from_above, from_behind, etc.
${isExplicit ? `- This is EXPLICIT content (rating_explicit). Include anatomically correct tags. Do NOT censor or skip body parts. Use exact Danbooru tags for nude body parts, sexual positions, and acts. Examples: nude, breasts, nipples, pussy, penis, sex, vaginal, spread_legs, etc.
- Do NOT use euphemisms. Use the actual Danbooru tags.` : '- Keep it rating_safe or rating_questionable.'}

EXAMPLE INPUT: "A man standing naked in an office while coworkers point and laugh at him"
EXAMPLE OUTPUT: 1boy, nude, standing, embarrassed, blushing, covering_crotch, office, indoor, desk, computer, 2girls, 1other, pointing, laughing, business_suit, wide_shot, fluorescent_lighting

NOW CONVERT THE SCENE:`;

  try {
    const tags = await generateTextWithProvider(prompt, {
      contentRating: isExplicit ? 'mature' : 'general',
      temperature: 0.3,
      maxTokens: 512,
    });

    // Clean up: extract just the tags, remove any explanatory text
    let cleaned = tags
      .replace(/```[^`]*```/g, '') // Remove code blocks
      .replace(/^(Tags|Output|Result|Here)[:.\s]*/gi, '') // Remove prefix labels
      .split('\n')[0] // Take first line only
      .trim();

    // Validate it looks like tags (comma-separated short words)
    if (!cleaned.includes(',') || cleaned.length > 1000) {
      console.warn('[DanbooruTagger] Output does not look like tags, using fallback');
      return fallbackTags(sceneDescription, isExplicit);
    }

    console.log(`[DanbooruTagger] Translated: "${sceneDescription.substring(0, 50)}..." -> ${cleaned.substring(0, 100)}...`);
    return cleaned;
  } catch (error) {
    console.warn('[DanbooruTagger] Translation failed, using fallback:', error instanceof Error ? error.message : error);
    return fallbackTags(sceneDescription, isExplicit);
  }
}

/**
 * Simple keyword-based fallback if AI translation fails.
 */
function fallbackTags(scene: string, nsfw: boolean): string {
  const lower = scene.toLowerCase();
  const tags: string[] = [];

  // Character count
  if (lower.includes('two') || lower.includes('couple')) tags.push('2people');
  else if (lower.includes('group') || lower.includes('crowd')) tags.push('multiple_people');
  else tags.push('1person');

  // Gender
  if (lower.includes('woman') || lower.includes('girl') || lower.includes('she') || lower.includes('her')) tags.push('1girl');
  if (lower.includes('man') || lower.includes('guy') || lower.includes('boy') || lower.includes('he') || lower.includes('his')) tags.push('1boy');

  // Setting
  if (lower.includes('office') || lower.includes('work')) tags.push('office, indoor, desk');
  if (lower.includes('bar') || lower.includes('pub')) tags.push('bar, indoor, counter, bottle');
  if (lower.includes('bedroom') || lower.includes('bed')) tags.push('bedroom, bed, indoor');
  if (lower.includes('bathroom') || lower.includes('shower')) tags.push('bathroom, indoor, tiles');
  if (lower.includes('street') || lower.includes('outside')) tags.push('outdoors, street, city');
  if (lower.includes('kitchen')) tags.push('kitchen, indoor');
  if (lower.includes('gym')) tags.push('gym, indoor, exercise');

  // State
  if (lower.includes('naked') || lower.includes('nude')) tags.push('nude, completely_nude');
  if (lower.includes('embarrass')) tags.push('embarrassed, blushing');
  if (lower.includes('laugh')) tags.push('laughing, open_mouth');
  if (lower.includes('cry') || lower.includes('tears')) tags.push('crying, tears');
  if (lower.includes('angry') || lower.includes('furious')) tags.push('angry, clenched_teeth');
  if (lower.includes('drunk') || lower.includes('wasted')) tags.push('drunk, dizzy');

  if (nsfw) tags.push('rating_explicit, nsfw');
  else tags.push('rating_safe');

  tags.push('masterpiece, best quality');
  return tags.join(', ');
}
