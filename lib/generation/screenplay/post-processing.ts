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
// MAIN PIPELINE ORCHESTRATOR
// ============================================================================

/**
 * Run the complete post-processing pipeline
 * Returns processed content and updated context
 */
export function runScreenplayPostProcessing(
  content: string,
  context: ScreenplayContext,
  sequenceNumber: number,
  previousSummaries?: Array<{ summary: string; sequenceNumber: number }>
): {
  content: string;
  updatedContext: ScreenplayContext;
  hardReject: boolean;
  surgicalPrompt: string | null;
  report: {
    varianceScore: number;
    sentencesCombined: number;
    ticsRemoved: string[];
    clinicalFound: string[];
    onTheNoseFound: string[];
    bannedPhrasesFound: string[];
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
        clinicalFound: hardRejectCheck.reasons.filter(r => r.includes('Clinical')),
        onTheNoseFound: hardRejectCheck.reasons.filter(r => r.includes('On-the-nose')),
        bannedPhrasesFound: hardRejectCheck.reasons.filter(r => r.includes('Banned')),
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

  // 4. Enforce tic limits
  const ticResult = enforceTicLimits(processedContent, context.ticCredits);
  processedContent = ticResult.content;

  // 5. Update context
  const updatedContext: ScreenplayContext = {
    ...context,
    ticCredits: ticResult.updatedCredits,
  };

  // 6. Collect warnings for report
  const clinicalCheck = detectClinicalDialogue(processedContent);
  const onTheNoseCheck = detectOnTheNoseDialogue(processedContent);
  const bannedPhrases = detectBannedPhrases(processedContent);

  return {
    content: processedContent,
    updatedContext,
    hardReject: false,
    surgicalPrompt: null,
    report: {
      varianceScore: variance.stdDev,
      sentencesCombined,
      ticsRemoved: ticResult.removed.map(r => `${r.tic} (${r.count}x)`),
      clinicalFound: clinicalCheck.found.map(f => f.phrase),
      onTheNoseFound: onTheNoseCheck.found.map(f => f.dialogue),
      bannedPhrasesFound: bannedPhrases,
    },
  };
}
