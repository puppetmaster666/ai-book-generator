/**
 * Screenplay Post-Processing Pipeline
 * Pure-code enforcement (no AI tokens) for quality control
 *
 * Philosophy: The AI will ignore suggestions. It cannot ignore math and logic.
 */

import {
  ScreenplayContext,
  SCREENPLAY_CLINICAL_VOCABULARY,
  SCREENPLAY_TIC_PATTERNS,
  SCREENPLAY_ON_THE_NOSE_PATTERNS,
  SCREENPLAY_BANNED_PHRASES,
  SCREENPLAY_OBJECT_TICS,
  SCREENPLAY_EXIT_CLICHES,
  SCREENPLAY_VERBAL_MESSINESS,
  SCREENPLAY_PROP_COOLDOWNS,
  SCREENPLAY_BANGER_PATTERNS,
  PropCooldown,
  CharacterProfile,
} from '@/lib/screenplay';

// ============================================================================
// SENTENCE VARIANCE AUDITOR (Gary Provost Enforcement)
// ============================================================================

/**
 * Calculate standard deviation of sentence lengths
 * Human writing: stdDev > 4.5
 * AI metronome: stdDev < 3.0
 */
export function calculateSentenceVariance(content: string): {
  stdDev: number;
  isMetric: boolean;
  avgLength: number;
  shortCount: number;
  longCount: number;
  sentenceCount: number;
} {
  // Extract action lines only (not dialogue - dialogue can be short)
  const actionLines = extractActionLines(content);
  const sentences = actionLines
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.split(/\s+/).length >= 2);

  if (sentences.length < 10) {
    // Not enough sentences to calculate meaningful variance
    return {
      stdDev: 5.0, // Assume acceptable
      isMetric: false,
      avgLength: 0,
      shortCount: 0,
      longCount: 0,
      sentenceCount: sentences.length,
    };
  }

  const lengths = sentences.map(s => s.split(/\s+/).length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;

  // Standard deviation
  const squaredDiffs = lengths.map(len => Math.pow(len - avgLength, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / lengths.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  const shortCount = lengths.filter(len => len < 6).length;
  const longCount = lengths.filter(len => len > 20).length;

  return {
    stdDev,
    isMetric: stdDev < 4.5,
    avgLength,
    shortCount,
    longCount,
    sentenceCount: sentences.length,
  };
}

/**
 * Extract action lines from screenplay (skip dialogue)
 */
function extractActionLines(content: string): string {
  const lines = content.split('\n');
  const actionLines: string[] = [];
  let inDialogue = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Detect character name (ALL CAPS, starts dialogue)
    if (/^[A-Z][A-Z\s.'()-]+$/.test(trimmed) && trimmed.length < 50) {
      inDialogue = true;
      continue;
    }

    // Skip sluglines
    if (/^(INT\.|EXT\.)/.test(trimmed)) continue;

    // Skip transitions
    if (/^(FADE|CUT|DISSOLVE|SMASH|MATCH)/.test(trimmed)) continue;

    // Skip parentheticals
    if (/^\([^)]+\)$/.test(trimmed)) continue;

    // If we hit a non-dialogue line after dialogue, we're back to action
    if (inDialogue && !trimmed.startsWith('(') && !/^[A-Z][A-Z\s.'()-]+$/.test(trimmed)) {
      // Could be continued dialogue or action - check if it looks like action
      if (trimmed.length > 60 || /^[A-Z][a-z]/.test(trimmed)) {
        inDialogue = false;
      }
    }

    if (!inDialogue) {
      actionLines.push(trimmed);
    }
  }

  return actionLines.join(' ');
}

/**
 * Fix staccato rhythm by combining short sentences
 * Target: stdDev > 4.5
 */
export function enforceSentenceVariance(content: string): {
  content: string;
  sentencesCombined: number;
} {
  // Only process action lines, preserve dialogue structure
  const lines = content.split('\n');
  const result: string[] = [];
  let sentencesCombined = 0;
  let actionBuffer: string[] = [];

  const flushActionBuffer = () => {
    if (actionBuffer.length === 0) return;

    // Check for staccato pattern in buffer
    const combined = combineStaccatoSentences(actionBuffer.join(' '));
    sentencesCombined += combined.count;
    result.push(combined.text);
    actionBuffer = [];
  };

  let inDialogue = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line - flush and preserve
    if (!trimmed) {
      flushActionBuffer();
      result.push('');
      continue;
    }

    // Character name
    if (/^[A-Z][A-Z\s.'()-]+$/.test(trimmed) && trimmed.length < 50) {
      flushActionBuffer();
      inDialogue = true;
      result.push(line);
      continue;
    }

    // Slugline or transition
    if (/^(INT\.|EXT\.|FADE|CUT|DISSOLVE)/.test(trimmed)) {
      flushActionBuffer();
      inDialogue = false;
      result.push(line);
      continue;
    }

    // Parenthetical or dialogue
    if (inDialogue) {
      result.push(line);
      if (!trimmed.startsWith('(') && !/^[A-Z][A-Z\s.'()-]+$/.test(trimmed)) {
        // Check if next line looks like action
        // For now, stay in dialogue mode
      }
      continue;
    }

    // Action line - buffer it
    actionBuffer.push(trimmed);
  }

  flushActionBuffer();

  return {
    content: result.join('\n'),
    sentencesCombined,
  };
}

/**
 * Combine short consecutive sentences to fix staccato rhythm
 */
function combineStaccatoSentences(text: string): { text: string; count: number } {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const result: string[] = [];
  let count = 0;
  let i = 0;

  while (i < sentences.length) {
    const current = sentences[i];
    const currentWords = current.split(/\s+/).length;

    // If we have 3+ consecutive short sentences (< 7 words each), combine them
    if (currentWords < 7 && i + 2 < sentences.length) {
      const next = sentences[i + 1];
      const nextNext = sentences[i + 2];
      const nextWords = next?.split(/\s+/).length || 0;
      const nextNextWords = nextNext?.split(/\s+/).length || 0;

      if (nextWords < 7 && nextNextWords < 7) {
        // Combine with conjunctions
        const combined = `${current.replace(/[.!?]$/, '')}—${next.toLowerCase().replace(/[.!?]$/, '')}, and ${nextNext.toLowerCase()}`;
        result.push(combined);
        count += 2;
        i += 3;
        continue;
      }
    }

    result.push(current);
    i++;
  }

  return { text: result.join(' '), count };
}

// ============================================================================
// TIC CREDIT SYSTEM (Enforced Removal)
// ============================================================================

/**
 * Replacement phrases for removed tics
 */
const TIC_REPLACEMENTS = [
  'He pauses.',
  'A beat.',
  'She hesitates.',
  'Silence.',
  '', // Delete entirely
];

/**
 * Enforce tic limits using the credit system
 * Excess occurrences are REMOVED or replaced
 */
export function enforceTicLimits(
  content: string,
  ticCredits: Record<string, number>
): {
  content: string;
  updatedCredits: Record<string, number>;
  removed: Array<{ tic: string; count: number; replacement: string }>;
} {
  let processedContent = content;
  const removed: Array<{ tic: string; count: number; replacement: string }> = [];
  const updatedCredits = { ...ticCredits };

  for (const ticPattern of SCREENPLAY_TIC_PATTERNS) {
    // Reset the regex (global flag)
    ticPattern.pattern.lastIndex = 0;

    const matches = processedContent.match(ticPattern.pattern) || [];
    const currentCount = updatedCredits[ticPattern.name] || 0;
    const allowedThisSequence = ticPattern.maxPerSequence;

    if (matches.length > allowedThisSequence) {
      // Need to remove excess
      const excessCount = matches.length - allowedThisSequence;
      let removedCount = 0;

      // Replace excess occurrences
      processedContent = processedContent.replace(
        ticPattern.pattern,
        (match) => {
          if (removedCount < allowedThisSequence) {
            removedCount++;
            return match; // Keep first N occurrences
          }

          // Replace with varied alternatives
          const replacementIndex = Math.min(
            removedCount - allowedThisSequence,
            TIC_REPLACEMENTS.length - 1
          );
          removedCount++;
          return TIC_REPLACEMENTS[replacementIndex];
        }
      );

      removed.push({
        tic: ticPattern.name,
        count: excessCount,
        replacement: 'varied',
      });
    }

    // Update credits for tracking across sequences
    updatedCredits[ticPattern.name] = currentCount + Math.min(matches.length, allowedThisSequence);
  }

  return {
    content: processedContent,
    updatedCredits,
    removed,
  };
}

// ============================================================================
// HARD REJECT DETECTION
// ============================================================================

/**
 * Check for patterns that require regeneration
 * These are too egregious for post-processing to fix
 */
export function checkHardRejectPatterns(
  content: string,
  previousSummaries?: Array<{ summary: string; sequenceNumber: number }>
): {
  mustRegenerate: boolean;
  reasons: string[];
  surgicalPrompt: string;
} {
  const reasons: string[] = [];
  const surgicalFixes: string[] = [];

  // 1. Check clinical vocabulary in dialogue
  const clinicalFound = detectClinicalDialogue(content);
  if (clinicalFound.severity === 'hard_reject') {
    reasons.push(`Clinical dialogue: ${clinicalFound.found.slice(0, 3).map(f => f.phrase).join(', ')}`);
    surgicalFixes.push(
      `CRITICAL FIX: Remove all clinical/robotic dialogue. Replace phrases like "${clinicalFound.found[0]?.phrase}" with natural human speech. Characters under stress speak in fragments, not formal prose.`
    );
  }

  // 2. Check on-the-nose dialogue
  const onTheNoseFound = detectOnTheNoseDialogue(content);
  if (onTheNoseFound.severity === 'hard_reject') {
    reasons.push(`On-the-nose dialogue: ${onTheNoseFound.found.slice(0, 3).map(f => f.dialogue).join(', ')}`);
    surgicalFixes.push(
      `CRITICAL FIX: Characters must NEVER state their emotions directly. Replace "I feel X" with BEHAVIOR that shows the emotion. Show, don't tell.`
    );
  }

  // 3. Check banned phrases
  const bannedFound = detectBannedPhrases(content);
  if (bannedFound.length >= 3) {
    reasons.push(`Banned AI phrases: ${bannedFound.slice(0, 3).join(', ')}`);
    surgicalFixes.push(
      `CRITICAL FIX: Remove all AI-sounding phrases like "${bannedFound[0]}". Use character-specific voice instead.`
    );
  }

  // 4. Check for sequence loops (if we have previous summaries)
  if (previousSummaries && previousSummaries.length > 0) {
    const loopCheck = checkForLoops(content, previousSummaries);
    if (loopCheck.isLooping) {
      reasons.push(`Sequence loop detected: ${loopCheck.issue}`);
      surgicalFixes.push(
        `CRITICAL FIX: This sequence is repeating content from earlier. The story must MOVE FORWARD. Do not reintroduce characters or restart scenes.`
      );
    }
  }

  const mustRegenerate = reasons.length > 0;
  const surgicalPrompt = surgicalFixes.join('\n\n');

  return {
    mustRegenerate,
    reasons,
    surgicalPrompt,
  };
}

/**
 * Check for loops against previous sequences
 */
function checkForLoops(
  content: string,
  previousSummaries: Array<{ summary: string; sequenceNumber: number }>
): { isLooping: boolean; issue: string } {
  // Check for "FADE IN:" after first sequence
  if (previousSummaries.length > 0 && /FADE IN:/i.test(content)) {
    return {
      isLooping: true,
      issue: 'Contains "FADE IN:" which should only appear in Sequence 1',
    };
  }

  // Check for reintroduction patterns
  const reintroPatterns = [
    /we (first )?meet/i,
    /introduces? (us to|the protagonist)/i,
    /for the first time/i,
  ];

  for (const pattern of reintroPatterns) {
    if (pattern.test(content)) {
      return {
        isLooping: true,
        issue: `Contains reintroduction pattern: ${pattern.source}`,
      };
    }
  }

  return { isLooping: false, issue: '' };
}

// ============================================================================
// CLINICAL DIALOGUE DETECTION
// ============================================================================

/**
 * Detect clinical/robotic vocabulary in dialogue
 */
export function detectClinicalDialogue(content: string): {
  found: Array<{ phrase: string; context: string; lineNumber: number }>;
  severity: 'none' | 'warning' | 'hard_reject';
} {
  const found: Array<{ phrase: string; context: string; lineNumber: number }> = [];
  const lines = content.split('\n');

  // Only check dialogue sections
  let inDialogue = false;
  let currentLineNum = 0;

  for (const line of lines) {
    currentLineNum++;
    const trimmed = line.trim();

    // Character name starts dialogue
    if (/^[A-Z][A-Z\s.'()-]+$/.test(trimmed) && trimmed.length < 50) {
      inDialogue = true;
      continue;
    }

    // Empty line or slugline ends dialogue
    if (!trimmed || /^(INT\.|EXT\.)/.test(trimmed)) {
      inDialogue = false;
      continue;
    }

    // Check dialogue for clinical phrases
    if (inDialogue && !trimmed.startsWith('(')) {
      const lowerLine = trimmed.toLowerCase();
      for (const phrase of SCREENPLAY_CLINICAL_VOCABULARY) {
        if (lowerLine.includes(phrase.toLowerCase())) {
          found.push({
            phrase,
            context: trimmed.substring(0, 80),
            lineNumber: currentLineNum,
          });
        }
      }
    }
  }

  let severity: 'none' | 'warning' | 'hard_reject' = 'none';
  if (found.length >= 3) {
    severity = 'hard_reject';
  } else if (found.length > 0) {
    severity = 'warning';
  }

  return { found, severity };
}

// ============================================================================
// ON-THE-NOSE DIALOGUE DETECTION
// ============================================================================

/**
 * Detect on-the-nose dialogue (characters stating feelings directly)
 */
export function detectOnTheNoseDialogue(content: string): {
  found: Array<{ pattern: string; dialogue: string; character: string }>;
  severity: 'none' | 'warning' | 'hard_reject';
} {
  const found: Array<{ pattern: string; dialogue: string; character: string }> = [];
  const lines = content.split('\n');

  let inDialogue = false;
  let currentCharacter = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Character name
    if (/^[A-Z][A-Z\s.'()-]+$/.test(trimmed) && trimmed.length < 50) {
      inDialogue = true;
      currentCharacter = trimmed.replace(/\s*\([^)]+\)\s*$/, '');
      continue;
    }

    // Empty line or slugline ends dialogue
    if (!trimmed || /^(INT\.|EXT\.)/.test(trimmed)) {
      inDialogue = false;
      continue;
    }

    // Check dialogue for on-the-nose patterns
    if (inDialogue && !trimmed.startsWith('(')) {
      for (const pattern of SCREENPLAY_ON_THE_NOSE_PATTERNS) {
        // Reset regex
        pattern.lastIndex = 0;
        if (pattern.test(trimmed)) {
          found.push({
            pattern: pattern.source,
            dialogue: trimmed.substring(0, 80),
            character: currentCharacter,
          });
        }
      }
    }
  }

  let severity: 'none' | 'warning' | 'hard_reject' = 'none';
  if (found.length >= 2) {
    severity = 'hard_reject';
  } else if (found.length > 0) {
    severity = 'warning';
  }

  return { found, severity };
}

// ============================================================================
// BANNED PHRASES DETECTION
// ============================================================================

/**
 * Detect banned AI phrases in content
 */
export function detectBannedPhrases(content: string): string[] {
  const found: string[] = [];
  const lowerContent = content.toLowerCase();

  for (const phrase of SCREENPLAY_BANNED_PHRASES) {
    if (lowerContent.includes(phrase.toLowerCase())) {
      found.push(phrase);
    }
  }

  return found;
}

// ============================================================================
// OBJECT TIC TRACKING (Global Prop Limits)
// ============================================================================

/**
 * Track and enforce object-level tic limits (watch, gun, cigarette, etc.)
 * These are tracked GLOBALLY across the entire screenplay
 */
export function enforceObjectTicLimits(
  content: string,
  objectCredits: Record<string, number>
): {
  content: string;
  updatedCredits: Record<string, number>;
  warnings: string[];
} {
  let processedContent = content;
  const warnings: string[] = [];
  const updatedCredits = { ...objectCredits };

  for (const objTic of SCREENPLAY_OBJECT_TICS) {
    // Reset the regex
    objTic.pattern.lastIndex = 0;

    const matches = processedContent.match(objTic.pattern) || [];
    const currentGlobalCount = updatedCredits[objTic.name] || 0;
    const remainingAllowed = Math.max(0, objTic.maxPerScreenplay - currentGlobalCount);

    if (matches.length > remainingAllowed) {
      // We've exceeded the global limit for this object
      const excessCount = matches.length - remainingAllowed;
      warnings.push(`"${objTic.name}" appears ${matches.length}x in this sequence but only ${remainingAllowed} more allowed (global limit: ${objTic.maxPerScreenplay})`);

      // Remove excess occurrences
      let keptCount = 0;
      processedContent = processedContent.replace(
        objTic.pattern,
        (match) => {
          if (keptCount < remainingAllowed) {
            keptCount++;
            return match;
          }
          // Replace with generic action or delete
          if (objTic.name.includes('check') || objTic.name.includes('stare')) {
            return 'pauses';
          }
          return ''; // Delete mentions entirely
        }
      );
    }

    // Update global credits
    updatedCredits[objTic.name] = currentGlobalCount + Math.min(matches.length, remainingAllowed);
  }

  return {
    content: processedContent,
    updatedCredits,
    warnings,
  };
}

// ============================================================================
// EXIT CLICHE TRACKING (Global Limits)
// ============================================================================

/**
 * Track and enforce exit cliché limits
 * "Walking into the rain" should only happen ONCE per screenplay
 */
export function enforceExitClicheLimits(
  content: string,
  exitCredits: Record<string, number>
): {
  content: string;
  updatedCredits: Record<string, number>;
  warnings: string[];
} {
  let processedContent = content;
  const warnings: string[] = [];
  const updatedCredits = { ...exitCredits };

  for (const exitCliche of SCREENPLAY_EXIT_CLICHES) {
    exitCliche.pattern.lastIndex = 0;

    const matches = processedContent.match(exitCliche.pattern) || [];
    const currentGlobalCount = updatedCredits[exitCliche.name] || 0;
    const remainingAllowed = Math.max(0, exitCliche.maxPerScreenplay - currentGlobalCount);

    if (matches.length > remainingAllowed) {
      warnings.push(`Exit cliché "${exitCliche.name}" appears ${matches.length}x but only ${remainingAllowed} more allowed (global limit: ${exitCliche.maxPerScreenplay})`);

      // Replace excess with varied exits
      let keptCount = 0;
      const alternativeExits = [
        'walks out',
        'leaves',
        'exits',
        'is gone',
        'heads out',
      ];

      processedContent = processedContent.replace(
        exitCliche.pattern,
        (match) => {
          if (keptCount < remainingAllowed) {
            keptCount++;
            return match;
          }
          return alternativeExits[keptCount % alternativeExits.length];
        }
      );
    }

    updatedCredits[exitCliche.name] = currentGlobalCount + Math.min(matches.length, remainingAllowed);
  }

  return {
    content: processedContent,
    updatedCredits,
    warnings,
  };
}

// ============================================================================
// PROP COOLDOWN ENFORCEMENT (Phase 2: Spatial-Temporal)
// ============================================================================

/**
 * Enforce minimum word distance between prop mentions
 * Not just counting - prevents clustering like "watch... watch... watch" in 500 words
 */
export function enforcePropCooldown(
  content: string,
  propLastPosition: Record<string, number>,
  currentWordCount: number
): {
  content: string;
  updatedPositions: Record<string, number>;
  violations: Array<{ prop: string; distance: number; required: number }>;
  newWordCount: number;
} {
  const words = content.split(/\s+/);
  const violations: Array<{ prop: string; distance: number; required: number }> = [];
  const updatedPositions = { ...propLastPosition };
  let processedContent = content;

  // Track positions within this content
  interface PropMatch {
    prop: string;
    wordIndex: number;
    match: string;
    startIndex: number;
  }

  const allMatches: PropMatch[] = [];

  // Find all prop mentions with their word positions
  for (const propCooldown of SCREENPLAY_PROP_COOLDOWNS) {
    // Reset regex
    propCooldown.pattern.lastIndex = 0;

    let match;
    while ((match = propCooldown.pattern.exec(content)) !== null) {
      // Count words up to this position
      const textBefore = content.slice(0, match.index);
      const wordIndex = currentWordCount + textBefore.split(/\s+/).filter(w => w.length > 0).length;

      allMatches.push({
        prop: propCooldown.name,
        wordIndex,
        match: match[0],
        startIndex: match.index,
      });
    }
  }

  // Sort by position (process in order)
  allMatches.sort((a, b) => a.startIndex - b.startIndex);

  // Track which matches to remove (process from end to preserve indices)
  const matchesToRemove: PropMatch[] = [];

  for (const propMatch of allMatches) {
    const cooldown = SCREENPLAY_PROP_COOLDOWNS.find(p => p.name === propMatch.prop);
    if (!cooldown) continue;

    const lastPosition = updatedPositions[propMatch.prop];

    if (lastPosition !== undefined) {
      const distance = propMatch.wordIndex - lastPosition;

      if (distance < cooldown.cooldownWords) {
        // Violation! Mark for removal
        violations.push({
          prop: propMatch.prop,
          distance,
          required: cooldown.cooldownWords,
        });
        matchesToRemove.push(propMatch);
        continue; // Don't update position for removed matches
      }
    }

    // Update position for this prop
    updatedPositions[propMatch.prop] = propMatch.wordIndex;
  }

  // Remove violations from end to start (preserve indices)
  matchesToRemove.sort((a, b) => b.startIndex - a.startIndex);
  for (const toRemove of matchesToRemove) {
    // Replace with a generic term or empty based on context
    const before = processedContent.slice(0, toRemove.startIndex);
    const after = processedContent.slice(toRemove.startIndex + toRemove.match.length);

    // Choose replacement based on prop type
    let replacement = '';
    if (toRemove.prop === 'watch') replacement = 'it';
    else if (toRemove.prop === 'gun') replacement = 'it';
    else if (toRemove.prop === 'phone') replacement = 'it';
    else if (toRemove.prop === 'cigarette') replacement = '';
    else if (toRemove.prop === 'photo') replacement = 'it';

    processedContent = before + replacement + after;
  }

  const newWordCount = currentWordCount + words.filter(w => w.length > 0).length;

  return {
    content: processedContent,
    updatedPositions,
    violations,
    newWordCount,
  };
}

// ============================================================================
// MUNDANITY RATIO ENFORCER (Phase 2: Banger De-Escalator)
// ============================================================================

/**
 * Check if dialogue has too many "bangers" (profound philosophical lines)
 * Human dialogue is 70% mundane, 30% meaningful
 */
export function checkMundanityRatio(content: string): {
  bangerCount: number;
  dialogueLineCount: number;
  ratio: number;
  isOverPhilosophical: boolean;
  bangerExamples: string[];
  surgicalPrompt: string | null;
} {
  // Extract dialogue lines
  const dialogueLines: string[] = [];
  const lines = content.split('\n');
  let inDialogue = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[A-Z][A-Z\s.'()-]+$/.test(trimmed) && trimmed.length < 50) {
      inDialogue = true;
      continue;
    }
    if (!trimmed || /^(INT\.|EXT\.)/.test(trimmed)) {
      inDialogue = false;
      continue;
    }
    if (inDialogue && !trimmed.startsWith('(')) {
      dialogueLines.push(trimmed);
    }
  }

  // Count bangers
  let bangerCount = 0;
  const bangerExamples: string[] = [];

  for (const line of dialogueLines) {
    for (const pattern of SCREENPLAY_BANGER_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        bangerCount++;
        if (bangerExamples.length < 3) {
          bangerExamples.push(line.substring(0, 60) + (line.length > 60 ? '...' : ''));
        }
        break; // Only count once per line
      }
    }
  }

  const ratio = dialogueLines.length > 0 ? bangerCount / dialogueLines.length : 0;
  const isOverPhilosophical = ratio > 0.30; // Max 30% "deep" dialogue

  const surgicalPrompt = isOverPhilosophical ? `
DIALOGUE PROBLEM: ${(ratio * 100).toFixed(0)}% of dialogue is philosophical/profound.
Human conversations are 70% mundane logistics, 30% meaningful.

Bangers found:
${bangerExamples.map(b => `- "${b}"`).join('\n')}

REWRITE with more mundane exchanges:
- "You want coffee?"
- "Where'd you park?"
- "My phone's dead."
- "Traffic was hell."
- "Did you eat?"

LIMIT: Maximum 1 profound "banger" line per sequence.
The mundane lines GROUND the profound moments.
` : null;

  return {
    bangerCount,
    dialogueLineCount: dialogueLines.length,
    ratio,
    isOverPhilosophical,
    bangerExamples,
    surgicalPrompt,
  };
}

// ============================================================================
// VERBAL FRICTION ENGINE (Phase 2: Stochastic Injection)
// ============================================================================

/**
 * Types of verbal friction to inject
 */
const VERBAL_FRICTION_TYPES = {
  stutter: {
    description: 'Character stutters on a word',
    example: 'I w-wanted to say',
    inject: (word: string) => `${word.charAt(0)}-${word}`,
  },
  false_start: {
    description: 'Character starts, stops, restarts',
    example: 'I think-- No. I know you\'re lying.',
    inject: (sentence: string) => {
      const words = sentence.split(' ');
      if (words.length < 4) return sentence;
      return `${words.slice(0, 2).join(' ')}-- No. ${sentence}`;
    },
  },
  filler: {
    description: 'Natural filler words',
    example: 'I, um, wanted to tell you',
    words: ['um', 'uh', 'like', 'you know', 'I mean', 'so', 'well', 'look'],
    inject: (sentence: string, filler: string) => {
      const words = sentence.split(' ');
      if (words.length < 3) return sentence;
      const insertAt = Math.min(2, Math.floor(words.length / 3));
      words.splice(insertAt, 0, filler + ',');
      return words.join(' ');
    },
  },
  trail_off: {
    description: 'Dialogue trails off unfinished',
    example: 'I thought you would...',
    inject: (sentence: string) => {
      const words = sentence.split(' ');
      if (words.length < 4) return sentence + '...';
      return words.slice(0, -2).join(' ') + '...';
    },
  },
  self_correction: {
    description: 'Character corrects themselves',
    example: 'She\'s my--our responsibility.',
    inject: (sentence: string) => {
      const words = sentence.split(' ');
      if (words.length < 3) return sentence;
      // Find possessive pronoun and switch
      const pronounSwaps: Record<string, string> = {
        'my': 'our', 'I': 'we', 'me': 'us',
        'his': 'their', 'her': 'their', 'he': 'they', 'she': 'they',
      };
      for (let i = 0; i < Math.min(3, words.length); i++) {
        const cleanWord = words[i].replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (pronounSwaps[cleanWord]) {
          const original = words[i];
          words[i] = original + '--' + pronounSwaps[cleanWord];
          break;
        }
      }
      return words.join(' ');
    },
  },
  interruption_yield: {
    description: 'Character gets cut off or yields',
    example: 'But I thought--',
    inject: (sentence: string) => sentence.replace(/[.!?]$/, '') + '--',
  },
};

/**
 * Inject verbal friction into dialogue with stochastic chance
 * @param frictionChance - Probability (0-1) of injecting friction per line
 */
export function injectVerbalFriction(
  content: string,
  frictionChance: number = 0.15,
  maxInjectionsPerSequence: number = 4
): {
  content: string;
  injectionsCount: number;
  injectionTypes: string[];
} {
  const lines = content.split('\n');
  const result: string[] = [];
  let injectionsCount = 0;
  const injectionTypes: string[] = [];
  let inDialogue = false;
  let currentCharacter = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Character name starts dialogue
    if (/^[A-Z][A-Z\s.'()-]+$/.test(trimmed) && trimmed.length < 50) {
      inDialogue = true;
      currentCharacter = trimmed;
      result.push(line);
      continue;
    }

    // Empty line or slugline ends dialogue
    if (!trimmed || /^(INT\.|EXT\.)/.test(trimmed)) {
      inDialogue = false;
      result.push(line);
      continue;
    }

    // Skip parentheticals
    if (trimmed.startsWith('(')) {
      result.push(line);
      continue;
    }

    // Check if this is dialogue and should get friction
    if (inDialogue && injectionsCount < maxInjectionsPerSequence) {
      // Random chance to inject friction
      if (Math.random() < frictionChance) {
        const frictionType = pickRandomFrictionType();
        const modifiedLine = applyFriction(trimmed, frictionType);

        if (modifiedLine !== trimmed) {
          result.push(modifiedLine);
          injectionsCount++;
          injectionTypes.push(frictionType);
          continue;
        }
      }
    }

    result.push(line);
  }

  return {
    content: result.join('\n'),
    injectionsCount,
    injectionTypes,
  };
}

/**
 * Pick a random friction type
 */
function pickRandomFrictionType(): string {
  const types = Object.keys(VERBAL_FRICTION_TYPES);
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Apply friction to a dialogue line
 */
function applyFriction(dialogue: string, type: string): string {
  switch (type) {
    case 'stutter': {
      const words = dialogue.split(' ');
      // Pick a word in the first half to stutter
      const targetIdx = Math.floor(Math.random() * Math.min(4, words.length));
      const word = words[targetIdx];
      if (word && word.length > 2 && /^[a-zA-Z]/.test(word)) {
        words[targetIdx] = VERBAL_FRICTION_TYPES.stutter.inject(word);
        return words.join(' ');
      }
      return dialogue;
    }
    case 'filler': {
      const fillers = VERBAL_FRICTION_TYPES.filler.words;
      const filler = fillers[Math.floor(Math.random() * fillers.length)];
      return VERBAL_FRICTION_TYPES.filler.inject(dialogue, filler);
    }
    case 'false_start':
      return VERBAL_FRICTION_TYPES.false_start.inject(dialogue);
    case 'trail_off':
      return VERBAL_FRICTION_TYPES.trail_off.inject(dialogue);
    case 'self_correction':
      return VERBAL_FRICTION_TYPES.self_correction.inject(dialogue);
    case 'interruption_yield':
      return VERBAL_FRICTION_TYPES.interruption_yield.inject(dialogue);
    default:
      return dialogue;
  }
}

// ============================================================================
// EXTREME VARIANCE ENFORCEMENT (Phase 2: σ > 5.5)
// ============================================================================

/**
 * Enforce extreme sentence length variance (σ > 5.5)
 * Modifies "boring" medium-length sentences to add variance
 */
export function enforceExtremeVariance(content: string): {
  content: string;
  originalStdDev: number;
  newStdDev: number;
  sentencesModified: number;
} {
  const TARGET_STDDEV = 5.5;

  const stats = calculateSentenceVariance(content);

  // If already has enough variance, don't modify
  if (stats.stdDev >= TARGET_STDDEV) {
    return {
      content,
      originalStdDev: stats.stdDev,
      newStdDev: stats.stdDev,
      sentencesModified: 0,
    };
  }

  // Only process action lines (preserve dialogue structure)
  const lines = content.split('\n');
  const result: string[] = [];
  let modifications = 0;
  let inDialogue = false;

  const extensions = [
    ', and it showed',
    ', which said everything',
    '-- not that it mattered',
    ', if you could call it that',
    ', somehow',
    ', barely',
  ];

  for (const line of lines) {
    const trimmed = line.trim();

    // Track dialogue state
    if (/^[A-Z][A-Z\s.'()-]+$/.test(trimmed) && trimmed.length < 50) {
      inDialogue = true;
      result.push(line);
      continue;
    }
    if (!trimmed || /^(INT\.|EXT\.)/.test(trimmed)) {
      inDialogue = false;
      result.push(line);
      continue;
    }

    // Skip dialogue and parentheticals
    if (inDialogue || trimmed.startsWith('(')) {
      result.push(line);
      continue;
    }

    // This is an action line - check for medium-length sentences
    const sentences = trimmed.split(/(?<=[.!?])\s+/);
    const modifiedSentences: string[] = [];

    for (const sentence of sentences) {
      const wordCount = sentence.split(/\s+/).length;

      // Target "boring" medium-length sentences (8-14 words)
      if (wordCount >= 8 && wordCount <= 14) {
        // 25% chance to modify
        if (Math.random() < 0.25) {
          if (Math.random() < 0.5) {
            // Shorten: Break into fragments
            const words = sentence.split(/\s+/);
            const breakPoint = Math.floor(words.length / 2);
            const newSentence = words.slice(0, breakPoint).join(' ') + '. ' +
                               words.slice(breakPoint).join(' ');
            modifiedSentences.push(newSentence);
            modifications++;
          } else {
            // Extend: Add clause
            const ext = extensions[Math.floor(Math.random() * extensions.length)];
            const newSentence = sentence.replace(/([.!?]+)$/, ext + '$1');
            modifiedSentences.push(newSentence);
            modifications++;
          }
          continue;
        }
      }
      modifiedSentences.push(sentence);
    }

    result.push(modifiedSentences.join(' '));
  }

  const modifiedContent = result.join('\n');
  const newStats = calculateSentenceVariance(modifiedContent);

  return {
    content: modifiedContent,
    originalStdDev: stats.stdDev,
    newStdDev: newStats.stdDev,
    sentencesModified: modifications,
  };
}

// ============================================================================
// VERBAL MESSINESS DETECTION (Should EXIST for human-like dialogue)
// ============================================================================

/**
 * Check that dialogue contains at least some verbal messiness
 * If dialogue is TOO POLISHED, it reads as AI-generated
 * Returns warnings if the sequence lacks human speech patterns
 */
export function checkVerbalMessiness(content: string): {
  hasMessiness: boolean;
  score: number; // 0-100, higher is more human-like
  found: string[];
  missing: string[];
} {
  const found: string[] = [];
  const missing: string[] = [];

  // Extract dialogue only
  const dialogueLines: string[] = [];
  const lines = content.split('\n');
  let inDialogue = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[A-Z][A-Z\s.'()-]+$/.test(trimmed) && trimmed.length < 50) {
      inDialogue = true;
      continue;
    }
    if (!trimmed || /^(INT\.|EXT\.)/.test(trimmed)) {
      inDialogue = false;
      continue;
    }
    if (inDialogue && !trimmed.startsWith('(')) {
      dialogueLines.push(trimmed);
    }
  }

  const dialogueText = dialogueLines.join(' ');

  // Check each messiness pattern
  for (const pattern of SCREENPLAY_VERBAL_MESSINESS) {
    pattern.pattern.lastIndex = 0;
    const matches = dialogueText.match(pattern.pattern) || [];
    if (matches.length > 0) {
      found.push(`${pattern.name}: ${matches.length}x`);
    } else {
      missing.push(pattern.description);
    }
  }

  // Calculate score: each found pattern adds points
  const score = Math.min(100, (found.length / SCREENPLAY_VERBAL_MESSINESS.length) * 100);
  const hasMessiness = found.length >= 2; // Need at least 2 types of messiness

  return {
    hasMessiness,
    score,
    found,
    missing,
  };
}

/**
 * Generate a prompt to add verbal messiness if missing
 */
export function generateVerbalMessinessPrompt(missing: string[]): string {
  if (missing.length === 0) return '';

  const suggestions = missing.slice(0, 3).map(m => `- ${m}`).join('\n');

  return `VERBAL MESSINESS REQUIRED (Anti-AI Detection):
Your dialogue is TOO POLISHED. Real people:
${suggestions}

Add at least 2 of these to your dialogue. Example:
- "I just-- I don't know what to--" (self-interrupt)
- "Look, it's not... it's complicated." (filler + trail off)
- "No, wait, that's not what I meant." (self-correction)`;
}

// ============================================================================
// PROFESSOR ARCHETYPE HUMANIZATION CHECK
// ============================================================================

/**
 * Check if Professor archetype characters have humanizing elements
 * Returns warnings if they're too robotic
 */
export function checkProfessorHumanization(
  content: string,
  characters: CharacterProfile[]
): {
  needsHumanization: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const professorCharacters = characters.filter(
    c => c.dialogueArchetype === 'The Professor'
  );

  if (professorCharacters.length === 0) {
    return { needsHumanization: false, warnings: [], suggestions: [] };
  }

  const warnings: string[] = [];
  const suggestions: string[] = [];

  for (const prof of professorCharacters) {
    const lowerContent = content.toLowerCase();

    // Check for mundane hobby mentions
    const hobbies = ['crossword', 'gardening', 'cooking', 'fishing', 'chess', 'baseball', 'poker'];
    const hasHobbyMention = hobbies.some(h => lowerContent.includes(h));

    // Check for physical imperfections
    const imperfections = ['coffee stain', 'worn shoes', 'messy desk', 'chipped mug'];
    const hasImperfection = imperfections.some(i => lowerContent.includes(i));

    // Check for armor-cracking moments (character name + breaking patterns)
    const profNameLower = prof.name.toLowerCase();
    const armorCracks = [
      new RegExp(`${profNameLower}.*actually laughs`, 'i'),
      new RegExp(`${profNameLower}.*admits.*doesn't know`, 'i'),
      new RegExp(`${profNameLower}.*forgets.*word`, 'i'),
      new RegExp(`${profNameLower}.*stumbles`, 'i'),
      new RegExp(`${profNameLower}.*blushes`, 'i'),
    ];
    const hasArmorCrack = armorCracks.some(pattern => pattern.test(content));

    if (!hasHobbyMention && !hasImperfection && !hasArmorCrack) {
      warnings.push(`${prof.name} (Professor archetype) lacks humanizing details`);
      suggestions.push(
        `Add ONE of these for ${prof.name}:
        - Mundane hobby mention (crossword, gardening, old movies)
        - Physical imperfection (coffee stain on tie, messy desk)
        - Armor-cracking moment (forgets a word, admits uncertainty, actually laughs)`
      );
    }
  }

  return {
    needsHumanization: warnings.length > 0,
    warnings,
    suggestions,
  };
}

// ============================================================================
// NOIR DIALOGUE TEMPLATE DETECTION
// ============================================================================

/**
 * Detect overly pithy "noir slogan" dialogue
 * Good noir has mess, not just cool one-liners
 */
export function detectNoirTemplate(content: string): {
  hasProblem: boolean;
  tooManyOneLiners: boolean;
  suggestions: string[];
} {
  // Extract dialogue
  const dialogueLines: string[] = [];
  const lines = content.split('\n');
  let inDialogue = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[A-Z][A-Z\s.'()-]+$/.test(trimmed) && trimmed.length < 50) {
      inDialogue = true;
      continue;
    }
    if (!trimmed || /^(INT\.|EXT\.)/.test(trimmed)) {
      inDialogue = false;
      continue;
    }
    if (inDialogue && !trimmed.startsWith('(')) {
      dialogueLines.push(trimmed);
    }
  }

  // Count one-liner patterns (short, punchy, end with period)
  const oneLinerPatterns = [
    /^.{5,40}\.$/, // Short declarative sentence
    /^(You|I|We|They|He|She|It) (don't|won't|can't|shouldn't|couldn't) .{5,30}\.$/i,
    /^That's .{5,25}\.$/i,
    /^Some(one|thing|times) .{5,25}\.$/i,
  ];

  let oneLinerCount = 0;
  for (const line of dialogueLines) {
    if (line.split(/\s+/).length <= 8) {
      for (const pattern of oneLinerPatterns) {
        if (pattern.test(line)) {
          oneLinerCount++;
          break;
        }
      }
    }
  }

  const oneLinerRatio = dialogueLines.length > 0
    ? oneLinerCount / dialogueLines.length
    : 0;

  const tooManyOneLiners = oneLinerRatio > 0.4 && oneLinerCount > 5;

  const suggestions: string[] = [];
  if (tooManyOneLiners) {
    suggestions.push(
      `Too many pithy one-liners (${oneLinerCount}/${dialogueLines.length} = ${(oneLinerRatio * 100).toFixed(0)}%).
      Add messier exchanges:
      - Characters talking past each other
      - Incomplete thoughts
      - Interruptions
      - Mundane small talk before the "cool" line`
    );
  }

  return {
    hasProblem: tooManyOneLiners,
    tooManyOneLiners,
    suggestions,
  };
}

// ============================================================================
// MAIN PIPELINE ORCHESTRATOR
// ============================================================================

/**
 * Run the complete post-processing pipeline
 * Returns processed content and updated context
 *
 * Phase 2 additions:
 * - Prop cooldown enforcement (spatial-temporal)
 * - Mundanity ratio check
 * - Verbal friction injection
 * - Extreme variance enforcement (σ > 5.5)
 */
export function runScreenplayPostProcessing(
  content: string,
  context: ScreenplayContext,
  sequenceNumber: number,
  previousSummaries?: Array<{ summary: string; sequenceNumber: number }>,
  characters?: CharacterProfile[]
): {
  content: string;
  updatedContext: ScreenplayContext;
  hardReject: boolean;
  surgicalPrompt: string | null;
  report: {
    varianceScore: number;
    sentencesCombined: number;
    ticsRemoved: string[];
    objectTicsWarnings: string[];
    exitClicheWarnings: string[];
    verbalMessinessScore: number;
    verbalMessinessMissing: string[];
    noirTemplateWarnings: string[];
    professorWarnings: string[];
    clinicalFound: string[];
    onTheNoseFound: string[];
    bannedPhrasesFound: string[];
    // Phase 2 metrics
    propCooldownViolations: Array<{ prop: string; distance: number; required: number }>;
    mundanityRatio: number;
    bangerCount: number;
    verbalFrictionInjected: number;
    extremeVarianceApplied: boolean;
  };
} {
  // 1. Check for hard reject patterns FIRST
  const hardRejectCheck = checkHardRejectPatterns(content, previousSummaries);

  if (hardRejectCheck.mustRegenerate) {
    return {
      content,
      updatedContext: context,
      hardReject: true,
      surgicalPrompt: hardRejectCheck.surgicalPrompt,
      report: {
        varianceScore: 0,
        sentencesCombined: 0,
        ticsRemoved: [],
        objectTicsWarnings: [],
        exitClicheWarnings: [],
        verbalMessinessScore: 0,
        verbalMessinessMissing: [],
        noirTemplateWarnings: [],
        professorWarnings: [],
        clinicalFound: hardRejectCheck.reasons.filter(r => r.includes('Clinical')),
        onTheNoseFound: hardRejectCheck.reasons.filter(r => r.includes('On-the-nose')),
        bannedPhrasesFound: hardRejectCheck.reasons.filter(r => r.includes('Banned')),
        propCooldownViolations: [],
        mundanityRatio: 0,
        bangerCount: 0,
        verbalFrictionInjected: 0,
        extremeVarianceApplied: false,
      },
    };
  }

  // 2. Calculate sentence variance
  const variance = calculateSentenceVariance(content);

  // 3. Fix staccato rhythm if needed
  let processedContent = content;
  let sentencesCombined = 0;

  if (variance.isMetric && variance.sentenceCount >= 10) {
    const varianceFix = enforceSentenceVariance(content);
    processedContent = varianceFix.content;
    sentencesCombined = varianceFix.sentencesCombined;
  }

  // 4. Enforce tic limits (per-sequence)
  const ticResult = enforceTicLimits(processedContent, context.ticCredits);
  processedContent = ticResult.content;

  // 5. Enforce object tic limits (GLOBAL across screenplay)
  const objectTicResult = enforceObjectTicLimits(processedContent, context.objectCredits || {});
  processedContent = objectTicResult.content;

  // 6. Enforce exit cliché limits (GLOBAL across screenplay)
  const exitResult = enforceExitClicheLimits(processedContent, context.exitCredits || {});
  processedContent = exitResult.content;

  // ===== PHASE 2: NEW ENFORCEMENT =====

  // 7. Enforce prop cooldown (spatial-temporal)
  const propCooldownResult = enforcePropCooldown(
    processedContent,
    context.propLastPosition || {},
    context.totalWordCount || 0
  );
  processedContent = propCooldownResult.content;

  // 8. Check mundanity ratio (detect over-philosophical dialogue)
  const mundanityCheck = checkMundanityRatio(processedContent);

  // 9. Enforce extreme variance (σ > 5.5)
  const extremeVarianceResult = enforceExtremeVariance(processedContent);
  processedContent = extremeVarianceResult.content;
  const extremeVarianceApplied = extremeVarianceResult.sentencesModified > 0;

  // 10. Inject verbal friction (15% chance, max 4 per sequence)
  const frictionResult = injectVerbalFriction(processedContent, 0.15, 4);
  processedContent = frictionResult.content;

  // ===== END PHASE 2 =====

  // 11. Check verbal messiness (should EXIST)
  const messinessCheck = checkVerbalMessiness(processedContent);

  // 12. Check noir template issues
  const noirCheck = detectNoirTemplate(processedContent);

  // 13. Check Professor archetype humanization (if characters provided)
  const professorCheck = characters
    ? checkProfessorHumanization(processedContent, characters)
    : { needsHumanization: false, warnings: [], suggestions: [] };

  // 14. Build surgical prompt for issues
  let surgicalPrompt: string | null = null;
  const surgicalIssues: string[] = [];

  if (!messinessCheck.hasMessiness) {
    surgicalIssues.push(generateVerbalMessinessPrompt(messinessCheck.missing));
  }

  if (noirCheck.hasProblem) {
    surgicalIssues.push(noirCheck.suggestions.join('\n'));
  }

  if (professorCheck.needsHumanization) {
    surgicalIssues.push(professorCheck.suggestions.join('\n'));
  }

  // Phase 2: Add mundanity ratio surgical prompt if too philosophical
  if (mundanityCheck.isOverPhilosophical && mundanityCheck.surgicalPrompt) {
    surgicalIssues.push(mundanityCheck.surgicalPrompt);
  }

  if (surgicalIssues.length > 0) {
    surgicalPrompt = surgicalIssues.join('\n\n');
  }

  // 15. Update context with all tracking
  const updatedContext: ScreenplayContext = {
    ...context,
    ticCredits: ticResult.updatedCredits,
    objectCredits: objectTicResult.updatedCredits,
    exitCredits: exitResult.updatedCredits,
    // Phase 2: Update prop positions and word count
    propLastPosition: propCooldownResult.updatedPositions,
    totalWordCount: propCooldownResult.newWordCount,
  };

  // 16. Collect warnings for report
  const clinicalCheck = detectClinicalDialogue(processedContent);
  const onTheNoseCheck = detectOnTheNoseDialogue(processedContent);
  const bannedPhrases = detectBannedPhrases(processedContent);

  return {
    content: processedContent,
    updatedContext,
    hardReject: false,
    surgicalPrompt,
    report: {
      varianceScore: extremeVarianceResult.newStdDev,
      sentencesCombined,
      ticsRemoved: ticResult.removed.map(r => `${r.tic} (${r.count}x)`),
      objectTicsWarnings: objectTicResult.warnings,
      exitClicheWarnings: exitResult.warnings,
      verbalMessinessScore: messinessCheck.score,
      verbalMessinessMissing: messinessCheck.missing,
      noirTemplateWarnings: noirCheck.suggestions,
      professorWarnings: professorCheck.warnings,
      clinicalFound: clinicalCheck.found.map(f => f.phrase),
      onTheNoseFound: onTheNoseCheck.found.map(f => f.dialogue),
      bannedPhrasesFound: bannedPhrases,
      // Phase 2 metrics
      propCooldownViolations: propCooldownResult.violations,
      mundanityRatio: mundanityCheck.ratio,
      bangerCount: mundanityCheck.bangerCount,
      verbalFrictionInjected: frictionResult.injectionsCount,
      extremeVarianceApplied,
    },
  };
}
