import { getGeminiFlash, FAST_TASK_TIMEOUT, withTimeout } from '../shared/api-client';
import { parseJSONFromResponse } from '../shared/json-utils';

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

  try {
    const result = await withTimeout(
      () => getGeminiFlash().generateContent(prompt),
      FAST_TASK_TIMEOUT,
      'Character state update'
    );
    const response = result.response.text();
    return parseJSONFromResponse(response) as Record<string, object>;
  } catch (error) {
    console.error('Character state update failed, keeping current:', error);
    return currentStates;
  }
}
