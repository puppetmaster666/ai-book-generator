import {
  CharacterProfile,
  SCREENPLAY_BANNED_PHRASES,
  SCREENPLAY_BANNED_ACTION_STARTS,
  SCREENPLAY_BANNED_METAPHORS,
  SCREENPLAY_BANNED_CLICHES,
  SCREENPLAY_SCIENCE_IN_EMOTION,
} from '@/lib/screenplay';
import { SAFETY_SETTINGS } from '../shared/safety';
import { getGeminiFlash, withTimeout } from '../shared/api-client';

/**
 * Count character tics using regex (AI can't count reliably)
 * Returns tics that exceed the limit for the Editor AI to replace
 */
function detectExcessiveTics(content: string, maxPerTic: number = 2): {
  tic: string;
  count: number;
  occurrences: string[];
}[] {
  const ticPatterns: Record<string, RegExp> = {
    'glasses': /(clean|wipe|polish|adjust|push|remove)s?\s+(his|her|their)?\s*(glasses|spectacles)/gi,
    'wrist': /rub(s|bing)?\s+(his|her|their)?\s*wrist/gi,
    'throat': /clears?\s+(his|her|their)?\s*throat/gi,
    'jaw': /clench(es|ing)?\s+(his|her|their)?\s*jaw/gi,
    'fist': /clench(es|ing)?\s+(his|her|their)?\s*(fist|hand)/gi,
    'sighs': /\b(sighs|sigh(ed|ing)?)\b/gi,
    'nods': /\b(nods|nodded|nodding)\b/gi,
    'shrugs': /\b(shrugs|shrugged|shrugging)\b/gi,
  };

  const excessive: { tic: string; count: number; occurrences: string[] }[] = [];

  for (const [name, pattern] of Object.entries(ticPatterns)) {
    const matches = content.match(pattern) || [];
    if (matches.length > maxPerTic) {
      excessive.push({
        tic: name,
        count: matches.length,
        occurrences: matches.slice(maxPerTic), // The ones to replace
      });
    }
  }
  return excessive;
}

/**
 * Detect staccato rhythm patterns (AI tell)
 * Short, choppy sentences with metronome regularity
 */
function detectStaccatoRhythm(content: string): {
  hasIssue: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const paragraphs = content.split(/\n\n+/);

  for (const para of paragraphs) {
    // Skip dialogue (starts with character name in caps)
    if (/^[A-Z]{2,}/.test(para.trim())) continue;

    const sentences = para.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 3) continue;

    // Check for metronome (all sentences similar length)
    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const allSimilar = lengths.every(l => Math.abs(l - avgLength) < 3);

    if (sentences.length >= 3 && allSimilar && avgLength < 8) {
      issues.push(`Metronome detected: ${sentences.length} sentences averaging ${avgLength.toFixed(1)} words`);
    }

    // Check for consecutive same-pronoun starts
    const starts = sentences.map(s => s.trim().split(/\s+/)[0]?.toLowerCase());
    for (let i = 0; i < starts.length - 2; i++) {
      if (starts[i] === starts[i + 1] && starts[i + 1] === starts[i + 2]) {
        if (['she', 'he', 'it', 'the', 'they'].includes(starts[i])) {
          issues.push(`Triple pronoun start: "${starts[i]}... ${starts[i]}... ${starts[i]}..."`);
        }
      }
    }

    // Check for excessive 2-word fragments
    const fragments = sentences.filter(s => s.trim().split(/\s+/).length <= 2);
    if (fragments.length >= 3) {
      issues.push(`Excessive fragments: ${fragments.length} two-word sentences in one paragraph`);
    }
  }

  return { hasIssue: issues.length > 0, issues };
}

/**
 * Detect banned clichés and metaphors using regex
 */
function detectBannedPatterns(content: string): string[] {
  const found: string[] = [];
  const lowerContent = content.toLowerCase();

  // Check metaphors (regex patterns)
  for (const pattern of SCREENPLAY_BANNED_METAPHORS) {
    const regex = new RegExp(pattern, 'gi');
    if (regex.test(content)) {
      found.push(`Metaphor: "${pattern}"`);
    }
  }

  // Check clichés (regex patterns)
  for (const pattern of SCREENPLAY_BANNED_CLICHES) {
    const regex = new RegExp(pattern, 'gi');
    if (regex.test(content)) {
      found.push(`Cliché: "${pattern}"`);
    }
  }

  // Check science-speak in emotional contexts
  for (const phrase of SCREENPLAY_SCIENCE_IN_EMOTION) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      found.push(`Science-speak: "${phrase}"`);
    }
  }

  return found;
}

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

  // Detect excessive tics (regex-based - AI can't count reliably)
  const excessiveTics = detectExcessiveTics(sequenceContent);

  // Detect staccato rhythm issues
  const rhythmIssues = detectStaccatoRhythm(sequenceContent);

  // Detect banned clichés and metaphors
  const bannedPatterns = detectBannedPatterns(sequenceContent);

  // Build issues section
  let issuesSection = '';

  if (bannedDialogue.length > 0 || bannedActions.length > 0) {
    issuesSection += `\n=== DETECTED AI-ISMS TO FIX ===
${bannedDialogue.length > 0 ? `Banned dialogue: ${bannedDialogue.join(', ')}` : ''}
${bannedActions.length > 0 ? `Banned action starts: ${bannedActions.join(', ')}` : ''}`;
  }

  if (excessiveTics.length > 0) {
    issuesSection += `\n\n=== TIC OVERFLOW (REPLACE THESE) ===`;
    for (const tic of excessiveTics) {
      issuesSection += `\n"${tic.tic}" appears ${tic.count}x (max 2). Replace occurrences 3+ with NEW physical actions.`;
    }
  }

  if (rhythmIssues.hasIssue) {
    issuesSection += `\n\n=== RHYTHM ISSUES DETECTED ===\n${rhythmIssues.issues.join('\n')}`;
  }

  if (bannedPatterns.length > 0) {
    issuesSection += `\n\n=== CLICHÉS/METAPHORS TO REPLACE ===\n${bannedPatterns.join('\n')}`;
  }

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

8. CLICHÉ PURGE (AI DETECTION RISK)
   - NO mathematical metaphors: "with geometry", "clockwork precision", "calculated grace"
   - NO training-set descriptors: "skin like leather", "eyes that tell stories", "golden light"
   - NO "golden ending": If final scene has sun/gold imagery, REWRITE with harder edge
   - Replace with SPECIFIC sensory details unique to THIS character/setting

9. TIC FREQUENCY LIMIT
   - Each character tic (glasses cleaning, wrist rubbing, throat clearing) MAX 2x per sequence
   - If a tic appears more than 2 times, REPLACE subsequent instances with NEW specific actions
   - Example: Instead of 3rd "cleans glasses", use "presses thumb against bridge of nose"
   - Variety = human. Repetition = AI.

10. RHYTHM VARIATION (ANTI-STACCATO)
    - If 3+ consecutive sentences are under 8 words, REWRITE as a single complex sentence
    - BAD: "She turns. The water bites. She doesn't flinch."
    - GOOD: "She turns as the water bites, but she doesn't flinch."
    - Check pronoun starts: "She... She... She..." = REWRITE with varied subjects
    - Apply Gary Provost principle: writing should BREATHE, not tap like a metronome

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
