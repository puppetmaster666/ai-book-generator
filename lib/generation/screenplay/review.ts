import {
  CharacterProfile,
  SCREENPLAY_BANNED_PHRASES,
  SCREENPLAY_BANNED_ACTION_STARTS,
} from '@/lib/screenplay';
import { SAFETY_SETTINGS } from '../shared/safety';
import { getGeminiFlash, withTimeout } from '../shared/api-client';

/**
 * Ruthless pacing editor - cuts 20% fluff from screenplay sequences
 * ALWAYS runs (not just when AI patterns detected)
 */
export async function reviewScreenplaySequence(
  sequenceContent: string,
  characters: CharacterProfile[],
  sequenceNumber?: number
): Promise<string> {
  // Build character psychology for maintaining distinct voices
  const characterPsychology = characters.map(c => {
    const archetype = c.dialogueArchetype || 'The Reactor';
    return `${c.name} (${archetype}): ${c.voiceTraits.vocabulary}. ${c.voiceTraits.rhythm}`;
  }).join('\n');

  // Detect issues for targeted fixes
  const bannedDialogue = SCREENPLAY_BANNED_PHRASES.filter(phrase =>
    sequenceContent.toLowerCase().includes(phrase.toLowerCase())
  );
  const bannedActions = SCREENPLAY_BANNED_ACTION_STARTS.filter(start =>
    new RegExp(`(^|\\n)\\s*${start}`, 'i').test(sequenceContent)
  );

  const issuesSection = (bannedDialogue.length > 0 || bannedActions.length > 0)
    ? `\n=== DETECTED AI-ISMS TO FIX ===
${bannedDialogue.length > 0 ? `Banned dialogue: ${bannedDialogue.join(', ')}` : ''}
${bannedActions.length > 0 ? `Banned action starts: ${bannedActions.join(', ')}` : ''}`
    : '';

  const prompt = `You are a RUTHLESS Hollywood Script Doctor. Your job: CUT 20% OF THE FLUFF.

SEQUENCE ${sequenceNumber || '?'} TO EDIT:
${sequenceContent}

CHARACTER VOICES (PRESERVE THESE):
${characterPsychology}
${issuesSection}

=== YOUR EDITING TASKS (DO ALL OF THEM) ===

1. DIALOGUE COMPRESSION
   - If a character speaks MORE THAN 3 LINES consecutively, BREAK IT UP or CUT IT
   - Other characters should interrupt, react, or the speaker should pause for action
   - Long speeches = amateur writing. Fix them.

2. EXPOSITION REMOVAL
   - DELETE any lines where characters explain the plot to each other
   - "As you know..." = DELETE
   - Characters explaining their own backstory = DELETE or convert to subtext

3. BEAT CHECK
   - First paragraph: Must be a VISUAL HOOK (action, not description)
   - Last paragraph: Must be a BUTTON (sharp ending, not trailing off)
   - If either is weak, REWRITE it

4. RECAP PURGE
   - If the FIRST PARAGRAPH summarizes the previous sequence, DELETE IT
   - Start in the action, not in the setup

5. PARENTHETICAL CLEANUP
   - Replace EVERY (beat), (pause), (a moment) with a physical action
   - Example: "(beat)" → "He cracks his knuckles."
   - KEEP: (O.S.), (V.O.), (CONT'D), (into phone)

6. VERTICAL WRITING CHECK
   - NO action paragraph longer than 3 lines
   - Break up any "wall of text" action descriptions

7. AI-ISM PURGE
   - "We see/hear/watch" → Just describe what happens
   - "I need you to understand" → Character-specific alternative
   - Clinical dialogue → Raw, genre-appropriate dialogue

=== OUTPUT RULES ===
- Return ONLY the polished screenplay sequence
- Same scenes, same story beats
- Just TIGHTER and MORE PROFESSIONAL
- No commentary or notes`;

  const result = await withTimeout(
    () => getGeminiFlash().generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4, // Lower temp for consistent editing
        maxOutputTokens: 12000,
      },
      safetySettings: SAFETY_SETTINGS,
    }),
    120000,
    'reviewScreenplaySequence'
  );

  return result.response.text();
}
