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
 * Detect time jumps (Hollywood pacing killer)
 */
function detectTimeJumps(content: string): string[] {
  const patterns = [
    /\b(THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|SEVERAL|MANY)\s+(DAYS?|WEEKS?|MONTHS?|YEARS?)\s+LATER\b/gi,
    /\bONE\s+(WEEK|MONTH|YEAR)\s+LATER\b/gi,
    /\bTWO\s+(DAYS?|WEEKS?|MONTHS?|YEARS?)\s+LATER\b/gi,
    /\bMONTHS?\s+PASS(ES)?\b/gi,
    /\bTIME\s+PASSES?\b/gi,
    /\bYEARS?\s+LATER\b/gi,
  ];

  const found: string[] = [];
  for (const pattern of patterns) {
    const matches = content.match(pattern) || [];
    found.push(...matches);
  }
  return found;
}

/**
 * Detect montages (lazy storytelling)
 */
function detectMontages(content: string): string[] {
  const patterns = [
    /\bMONTAGE\b/gi,
    /\bSERIES\s+OF\s+SHOTS\b/gi,
    /\bQUICK\s+CUTS?\b/gi,
  ];

  const found: string[] = [];
  for (const pattern of patterns) {
    const matches = content.match(pattern) || [];
    found.push(...matches);
  }
  return found;
}

/**
 * Calculate interior/exterior ratio
 */
function calculateInteriorRatio(content: string): {
  interiors: number;
  exteriors: number;
  ratio: number;
} {
  const intMatches = content.match(/^\s*INT\./gim) || [];
  const extMatches = content.match(/^\s*EXT\./gim) || [];
  const total = intMatches.length + extMatches.length;
  return {
    interiors: intMatches.length,
    exteriors: extMatches.length,
    ratio: total > 0 ? intMatches.length / total : 0,
  };
}

/**
 * Detect generic dialogue responses
 */
function detectGenericResponses(content: string): string[] {
  const patterns = [
    /^\s*Yeah\.?\s*$/gim,
    /^\s*No\.?\s*$/gim,
    /^\s*Okay\.?\s*$/gim,
    /^\s*Sure\.?\s*$/gim,
    /^\s*Right\.?\s*$/gim,
    /^\s*Fine\.?\s*$/gim,
    /^\s*What\?\s*$/gim,
    /^\s*Really\?\s*$/gim,
  ];

  const found: string[] = [];
  for (const pattern of patterns) {
    const matches = content.match(pattern) || [];
    found.push(...matches.map(m => m.trim()));
  }
  return found;
}

/**
 * Detect feeling word declarations (should be displaced to objects)
 */
function detectFeelingWords(content: string): string[] {
  const feelingPatterns = [
    /\bI('m| am) (so )?(sad|happy|scared|afraid|angry|lonely|anxious|worried)\b/gi,
    /\bI (feel|felt) (so )?(sad|happy|scared|afraid|angry|lonely|anxious|worried)\b/gi,
    /\bI (love|hate|miss|fear) (you|her|him|them)\b/gi,
  ];

  const found: string[] = [];
  for (const pattern of feelingPatterns) {
    const matches = content.match(pattern) || [];
    found.push(...matches);
  }
  return found;
}

/**
 * Detect direct question-answer pairs (should be deflected)
 */
function detectDirectAnswers(content: string): number {
  // Simple heuristic: count questions followed immediately by direct answers
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  let directAnswers = 0;

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    // If current line is a question
    if (line.endsWith('?')) {
      // Check if next non-empty, non-parenthetical line starts with direct answer
      if (/^(Yes|No|Yeah|Okay|Sure|I did|I was|I am|It's|It is|Because|That's)/i.test(nextLine)) {
        directAnswers++;
      }
    }
  }

  return directAnswers;
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

  // Hollywood compliance detections (Phase 4)
  const timeJumps = detectTimeJumps(sequenceContent);
  const montages = detectMontages(sequenceContent);
  const locationRatio = calculateInteriorRatio(sequenceContent);
  const genericResponses = detectGenericResponses(sequenceContent);
  const feelingWords = detectFeelingWords(sequenceContent);
  const directAnswers = detectDirectAnswers(sequenceContent);

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

  // Hollywood compliance issues (Phase 4)
  if (timeJumps.length > 0) {
    issuesSection += `\n\n=== TIME JUMPS TO ELIMINATE ===\nFound: ${timeJumps.join(', ')}\nREWRITE to show time passage through changed details, not title cards.`;
  }

  if (montages.length > 0) {
    issuesSection += `\n\n=== MONTAGES TO EXPAND ===\nFound: ${montages.join(', ')}\nEXPAND each into 2-3 actual dramatic scenes. Dramatize, don't summarize.`;
  }

  if (locationRatio.ratio > 0.80) {
    issuesSection += `\n\n=== TOO MANY INTERIORS (${Math.round(locationRatio.ratio * 100)}%) ===\nAdd 2+ exterior scenes. Move conversations outside when possible. This looks like TV, not film.`;
  }

  if (genericResponses.length > 5) {
    issuesSection += `\n\n=== GENERIC DIALOGUE DETECTED (${genericResponses.length} instances) ===\nExamples: ${genericResponses.slice(0, 5).join(', ')}\nReplace ALL with character-specific alternatives. No "Yeah", "No", "Okay".`;
  }

  if (feelingWords.length > 0) {
    issuesSection += `\n\n=== FEELING DECLARATIONS TO DISPLACE ===\nFound: ${feelingWords.slice(0, 5).join(', ')}\nREPLACE with physical actions on OBJECTS. Characters show emotion, they don't declare it.`;
  }

  if (directAnswers > 3) {
    issuesSection += `\n\n=== TOO MANY DIRECT ANSWERS (${directAnswers} found) ===\nCharacters DEFLECT questions in the first 1-2 lines. Questions get ignored, answered with non-sequiturs, or redirected.`;
  }

  // Calculate current word count - STRICT length preservation
  const currentWordCount = sequenceContent.split(/\s+/).filter(w => w.length > 0).length;
  const minOutputWords = Math.floor(currentWordCount * 0.85); // Max 15% reduction
  const maxOutputWords = Math.ceil(currentWordCount * 1.10); // Max 10% increase

  const prompt = `You are a Hollywood Script Doctor. Polish this sequence for professional quality.

=== CRITICAL LENGTH CONSTRAINT ===
Input: ${currentWordCount} words
Your output MUST be between ${minOutputWords} and ${maxOutputWords} words.
DO NOT cut more than 15%. REPLACE weak content with better content, don't delete it.
If you need to remove something, ADD something else of equal length.

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

2. EXPOSITION CONVERSION
   - REWRITE lines where characters explain plot into subtext or conflict
   - "As you know..." = REWRITE as character-specific dialogue
   - Characters explaining backstory = CONVERT to action or subtext (don't delete, transform)

3. BEAT CHECK
   - First paragraph: Must be a VISUAL HOOK (action, not description)
   - Last paragraph: Must be a BUTTON (sharp ending, not trailing off)
   - If either is weak, REWRITE it

4. RECAP TRANSFORMATION
   - If the FIRST PARAGRAPH summarizes previous events, REWRITE it as action
   - Transform setup into a visual hook - don't delete, convert to showing

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

11. TIME JUMP REWRITE (HOLLYWOOD COMPLIANCE)
    - REPLACE any "X WEEKS/MONTHS LATER" title cards with visual time indicators
    - Show time passage through changed physical details:
      * Different clothes, hair length, seasonal markers
      * Reference to elapsed time in dialogue ("Since the hearing...")
    - Convert title cards to action descriptions showing changed circumstances

12. MONTAGE EXPANSION
    - If ANY montage detected, EXPAND into 2-3 actual scenes
    - Each moment in the montage becomes its own mini-scene with dialogue
    - Dramatize the process instead of summarizing it
    - Replace MONTAGE label with actual INT./EXT. sluglines and scenes

13. INTERIOR ESCAPE (CINEMATIC REQUIREMENT)
    - If sequence is 80%+ interiors, ADD 2 exterior scenes
    - Move conversations outside when possible (walking, cars, rooftops)
    - Interiors = TV. Exteriors = CINEMA. Make it look expensive.

14. GENERIC DIALOGUE UPGRADE
    - Replace ALL single-word responses with character-specific alternatives:
      * "Yeah" → "If you say so" / "Guess that works" / "Sure, why not"
      * "No" → "Not a chance" / "Forget it" / "Over my dead body"
      * "Okay" → "Fine" / "Whatever you want" / "If that's what you need"
    - Every response must reveal CHARACTER, not just information

15. FEELING DISPLACEMENT
    - Characters NEVER say how they feel directly
    - BAD: "I'm scared." / "I miss her."
    - GOOD: He opens the fridge. Her yogurt is still there. He closes the fridge.
    - Replace feeling declarations with OBJECT INTERACTIONS that reveal the emotion

16. DIALOGUE DEFLECTION
    - When a question is asked, the answer should NOT come directly
    - First 1-2 responses should AVOID the question (deflect, redirect, non-sequitur)
    - BAD: "Where were you?" → "I was at the store."
    - GOOD: "Where were you?" → "The milk's expired again."
    - Humans protect themselves. They don't share information freely.

=== OUTPUT RULES ===
- Return ONLY the polished screenplay sequence
- CRITICAL: Output MUST be ${minOutputWords}-${maxOutputWords} words (±15% of input)
- Same scenes, same story beats - DO NOT DELETE SCENES
- REPLACE weak content, don't just cut it
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
