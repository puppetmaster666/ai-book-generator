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
// HOLLYWOOD COMPLIANCE DETECTION (Phase 6: Pacing Killers)
// ============================================================================

/**
 * Time jump patterns that destroy pacing
 * Hollywood readers HATE these - they're lazy storytelling
 */
const TIME_JUMP_PATTERNS = [
  /\b(THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|SEVERAL|MANY)\s+(DAYS?|WEEKS?|MONTHS?|YEARS?)\s+LATER\b/gi,
  /\bONE\s+(WEEK|MONTH|YEAR)\s+LATER\b/gi,
  /\bTWO\s+(DAYS?|WEEKS?|MONTHS?|YEARS?)\s+LATER\b/gi,
  /\bMONTHS?\s+PASS(ES)?\b/gi,
  /\bTIME\s+PASSES?\b/gi,
  /\bYEARS?\s+LATER\b/gi,
  /\bA\s+(WEEK|MONTH|YEAR)\s+LATER\b/gi,
];

/**
 * Montage patterns - the ultimate lazy device
 * ANY montage = hard reject
 */
const MONTAGE_PATTERNS = [
  /\bMONTAGE\b/gi,
  /\bSERIES\s+OF\s+SHOTS\b/gi,
  /\bQUICK\s+CUTS?\b/gi,
  /\bRAPID\s+MONTAGE\b/gi,
  /\bTIME\s+LAPSE\b/gi,
];

/**
 * Detect time jumps in content
 * Returns count and specific matches for surgical feedback
 */
export function detectTimeJumps(content: string): {
  count: number;
  matches: string[];
  isHardReject: boolean;
} {
  const allMatches: string[] = [];

  for (const pattern of TIME_JUMP_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = content.match(pattern) || [];
    allMatches.push(...matches);
  }

  // Deduplicate
  const uniqueMatches = [...new Set(allMatches)];

  return {
    count: uniqueMatches.length,
    matches: uniqueMatches,
    isHardReject: uniqueMatches.length > 2, // More than 2 = lazy storytelling
  };
}

/**
 * Detect montages in content
 * ANY montage = hard reject (dramatize instead)
 */
export function detectMontages(content: string): {
  count: number;
  matches: string[];
  isHardReject: boolean;
} {
  const allMatches: string[] = [];

  for (const pattern of MONTAGE_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = content.match(pattern) || [];
    allMatches.push(...matches);
  }

  const uniqueMatches = [...new Set(allMatches)];

  return {
    count: uniqueMatches.length,
    matches: uniqueMatches,
    isHardReject: uniqueMatches.length > 0, // ANY montage = reject
  };
}

/**
 * Count scenes (INT./EXT. sluglines)
 * Target: 50-70 for feature, >100 = ADD editing
 */
export function countScenes(content: string): {
  total: number;
  interiors: number;
  exteriors: number;
  interiorRatio: number;
  isOverScened: boolean;
  isInteriorHeavy: boolean;
} {
  const interiorPattern = /^INT\./gm;
  const exteriorPattern = /^EXT\./gm;

  const interiors = (content.match(interiorPattern) || []).length;
  const exteriors = (content.match(exteriorPattern) || []).length;
  const total = interiors + exteriors;

  const interiorRatio = total > 0 ? (interiors / total) * 100 : 0;

  return {
    total,
    interiors,
    exteriors,
    interiorRatio,
    isOverScened: total > 100, // >100 scenes = ADD editing
    isInteriorHeavy: interiorRatio > 85, // >85% interiors = TV, not film
  };
}

/**
 * Detect generic dialogue responses
 * Single-word "Yeah", "No", "Okay" = amateur writing
 */
const GENERIC_RESPONSE_PATTERNS = [
  /^Yeah\.?$/gm,
  /^No\.?$/gm,
  /^Okay\.?$/gm,
  /^Sure\.?$/gm,
  /^Right\.?$/gm,
  /^Fine\.?$/gm,
  /^What\?$/gm,
  /^Really\?$/gm,
  /^I don't know\.?$/gmi,
  /^I guess\.?$/gmi,
];

export function detectGenericResponses(content: string): {
  count: number;
  matches: string[];
  isHardReject: boolean;
} {
  const allMatches: string[] = [];

  // Extract dialogue only
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
      for (const pattern of GENERIC_RESPONSE_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(trimmed)) {
          allMatches.push(trimmed);
        }
      }
    }
  }

  return {
    count: allMatches.length,
    matches: allMatches.slice(0, 10), // First 10 examples
    isHardReject: allMatches.length > 20, // >20 generic responses = too lazy
  };
}

/**
 * Kill summary endings (AI tells)
 * "which said everything", "not that it mattered", "somehow"
 */
export function killSummaryEndings(content: string): {
  content: string;
  removedCount: number;
} {
  const summaryPatterns = [
    { pattern: /,\s*which said everything\.?/gi, replacement: '.' },
    { pattern: /--\s*not that it mattered\.?/gi, replacement: '.' },
    { pattern: /,\s*somehow\.(?=\s|$)/gm, replacement: '.' },
    { pattern: /\.\s*It was enough\.?/gi, replacement: '.' },
    { pattern: /\.\s*And that was that\.?/gi, replacement: '.' },
    { pattern: /,\s*in a way\.(?=\s|$)/gm, replacement: '.' },
    { pattern: /\.\s*But still\.?/gi, replacement: '.' },
    { pattern: /,\s*for what it was worth\.?/gi, replacement: '.' },
    { pattern: /\.\s*Or something like that\.?/gi, replacement: '.' },
    { pattern: /,\s*if that made sense\.?/gi, replacement: '.' },
  ];

  let processed = content;
  let removedCount = 0;

  for (const { pattern, replacement } of summaryPatterns) {
    const matches = processed.match(pattern) || [];
    removedCount += matches.length;
    processed = processed.replace(pattern, replacement);
  }

  // Clean up double periods
  processed = processed.replace(/\.{2,}/g, '.').replace(/\.\s+\./g, '.');

  return { content: processed, removedCount };
}

/**
 * Detect word repetition patterns (AI tells)
 * "Fine. Fine." - "I'm scared. I'm scared." - repetitive patterns
 * >8 instances = hard reject
 */
const WORD_REPETITION_PATTERNS = [
  /(\b\w{3,})\.\s*\1\./gi,  // "Fine. Fine." (words 3+ chars)
  /(\b\w{3,})\?\s*\1\?/gi,  // "What? What?"
  /\b(I'm|I am)\s+\w+\.\s*(I'm|I am)\s+\w+\./gi,  // "I'm fine. I'm fine."
  /(\b\w+)\s+\1\s+\1\b/gi,  // "very very very"
  /\b(no|yes|yeah|okay|fine)\b[,.]?\s*\b\1\b[,.]?\s*\b\1\b/gi,  // "no, no, no"
];

export function detectWordRepetition(content: string): {
  count: number;
  examples: string[];
  isHardReject: boolean;
} {
  const allMatches: string[] = [];

  for (const pattern of WORD_REPETITION_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = content.match(pattern) || [];
    allMatches.push(...matches);
  }

  // Deduplicate
  const uniqueMatches = [...new Set(allMatches)];

  return {
    count: uniqueMatches.length,
    examples: uniqueMatches.slice(0, 10), // First 10 examples
    isHardReject: uniqueMatches.length > 8, // >8 = lazy AI writing
  };
}

/**
 * Detect purple prose patterns (AI tells)
 * "dust motes dance", "cathedral of trees", "velvet silence"
 * >5 instances = hard reject
 */
const PURPLE_PROSE_PATTERNS = [
  // Core AI clichés
  /dust motes? (dance|float|drift|swirl|hang)/gi,
  /cathedral of/gi,
  /velvet (hammer|voice|darkness|silence|night)/gi,
  /(golden|amber|honey|honeyed) (light|glow|hue|sunlight)/gi,
  /fingers? of (light|shadow|dawn|dusk|darkness)/gi,
  /tapestry of/gi,
  /symphony of/gi,
  /weight of (the world|history|time|silence|eternity)/gi,
  /ghost of a (smile|laugh|memory|thought)/gi,
  /pregnant (pause|silence|moment)/gi,
  /deafening silence/gi,
  /palpable tension/gi,
  /ocean of (emotion|feeling|sorrow|grief)/gi,
  /cascade of (emotion|feeling|thought|memory)/gi,
  /kaleidoscope of/gi,
  /mosaic of/gi,
  /dance of (shadow|light|flame|death|life)/gi,
  /canvas of/gi,
  /blanket of (silence|darkness|snow|mist)/gi,
  /river of (tears|emotion|time)/gi,
  // Additional patterns from scorer
  /silk(en|y)? (voice|tone|thread)/gi,
  /ballet of/gi,
  /with the grace of/gi,
  /like a (wounded|dying|fallen) (animal|bird|angel)/gi,
  /electric (silence|tension|atmosphere)/gi,
];

export function detectPurpleProse(content: string): {
  count: number;
  examples: string[];
  isHardReject: boolean;
} {
  const allMatches: string[] = [];

  for (const pattern of PURPLE_PROSE_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = content.match(pattern) || [];
    allMatches.push(...matches);
  }

  const uniqueMatches = [...new Set(allMatches)];

  return {
    count: uniqueMatches.length,
    examples: uniqueMatches.slice(0, 10),
    isHardReject: uniqueMatches.length > 5, // >5 = purple AI prose
  };
}

/**
 * Replace generic dialogue responses with character-specific alternatives
 * Auto-replacement (not just detection) - transforms the output
 */
const GENERIC_REPLACEMENTS: { pattern: RegExp; replacements: string[] }[] = [
  { pattern: /^Yeah\.$/gm, replacements: ['If you say so.', 'Guess so.', 'Works for me.', 'Sure.'] },
  { pattern: /^No\.$/gm, replacements: ['Not a chance.', 'Forget it.', "That's not happening.", 'I don\'t think so.'] },
  { pattern: /^Okay\.$/gm, replacements: ['Fine.', 'Whatever.', 'If that\'s what you want.', 'I suppose.'] },
  { pattern: /^What\?$/gm, replacements: ['I\'m sorry?', 'Come again?', 'Excuse me?', 'Say that again.'] },
  { pattern: /^Really\?$/gm, replacements: ['You\'re serious.', 'You\'re kidding.', 'Is that right.', 'No kidding.'] },
  { pattern: /^Sure\.$/gm, replacements: ['If you say so.', 'I guess.', 'Why not.', 'Works for me.'] },
  { pattern: /^Right\.$/gm, replacements: ['Obviously.', 'Exactly.', 'Of course.', 'Makes sense.'] },
];

export function replaceGenericResponses(content: string): {
  content: string;
  replacementsCount: number;
} {
  let processed = content;
  let replacementsCount = 0;

  for (const { pattern, replacements } of GENERIC_REPLACEMENTS) {
    pattern.lastIndex = 0;

    // Replace each match with a random alternative
    processed = processed.replace(pattern, () => {
      replacementsCount++;
      // Pick a random replacement from the list
      return replacements[Math.floor(Math.random() * replacements.length)];
    });
  }

  return { content: processed, replacementsCount };
}

// ============================================================================
// SENSORY DETAIL INJECTION (Phase 2.7)
// ============================================================================

/**
 * Sensory detail library - environmental details to inject after sluglines
 * Grouped by sense type for variety
 */
const SENSORY_DETAILS = {
  smell: [
    'The smell of stale coffee hangs in the air.',
    'Cigarette smoke curls from an ashtray somewhere.',
    'The sharp bite of cleaning chemicals.',
    'Something cooking. Garlic, maybe onions.',
    'Rain-wet asphalt and exhaust fumes.',
    'Old paper and dust. Filing cabinet smell.',
    'Cheap air freshener barely masking something worse.',
    'Fresh paint. Someone\'s been busy.',
    'The copper tang of old pipes.',
    'Burned toast. Nobody\'s watching the kitchen.',
  ],
  sound: [
    'The AC rattles overhead.',
    'Fluorescent lights buzz and flicker.',
    'Traffic noise, muffled through glass.',
    'A phone rings somewhere, unanswered.',
    'Footsteps echo in the hallway outside.',
    'Water drips from a leaky faucet.',
    'Distant sirens. Getting closer or farther, hard to tell.',
    'The soft tick of a wall clock.',
    'Pipes groaning in the walls.',
    'A radiator clanks to life.',
  ],
  touch: [
    'Cold air seeps through the window frame.',
    'The chair squeaks against linoleum.',
    'Sticky residue on the table surface.',
    'The floor creaks with each step.',
    'Draft from under the door.',
    'The seat cushion sags, well-worn.',
    'Grit under shoe soles. Someone tracked in sand.',
    'The metal handle is ice cold.',
    'Humidity thick enough to taste.',
    'The leather seat sighs as weight settles.',
  ],
  visual_texture: [
    'Water stains spread across the ceiling tiles.',
    'Paint peels near the baseboard.',
    'Dust motes float in the light.',
    'The window is foggy with condensation.',
    'Cracks spider across the plaster.',
    'Coffee rings overlap on the desk surface.',
    'The carpet shows a worn path to the door.',
    'Fingerprints smudge the glass partition.',
    'Shadows pool in the corners.',
    'One light bulb out of three is dead.',
  ],
};

/**
 * Count sensory details already present in content
 */
function countSensoryDetails(content: string): number {
  const sensoryIndicators = [
    // Smell words
    /\b(smell|scent|odor|stench|aroma|whiff|reek)\b/gi,
    // Sound words
    /\b(buzz|hum|click|creak|rattle|tick|drip|echo|ring|clank)\b/gi,
    // Touch/texture words
    /\b(cold|warm|sticky|gritty|smooth|rough|damp|humid|draft)\b/gi,
    // Sensory verbs
    /\b(seeps|creaks|rattles|buzzes|drips|clanks|groans)\b/gi,
  ];

  let count = 0;
  for (const pattern of sensoryIndicators) {
    const matches = content.match(pattern) || [];
    count += matches.length;
  }
  return count;
}

/**
 * Pick a random sensory detail from a specific category
 */
function pickRandomSensoryDetail(): string {
  const categories = Object.keys(SENSORY_DETAILS) as Array<keyof typeof SENSORY_DETAILS>;
  const category = categories[Math.floor(Math.random() * categories.length)];
  const details = SENSORY_DETAILS[category];
  return details[Math.floor(Math.random() * details.length)];
}

/**
 * Inject sensory details into screenplay after scene sluglines
 * Target: 4+ sensory details per 1000 words
 *
 * @param content - The screenplay content
 * @param targetDensity - Target sensory details per 1000 words (default: 4)
 */
export function injectSensoryDetails(
  content: string,
  targetDensity: number = 4
): {
  content: string;
  originalDensity: number;
  newDensity: number;
  injectionsAdded: number;
} {
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const currentCount = countSensoryDetails(content);
  const currentDensity = (currentCount / wordCount) * 1000;

  // If we already have enough sensory detail, don't inject
  if (currentDensity >= targetDensity) {
    return {
      content,
      originalDensity: currentDensity,
      newDensity: currentDensity,
      injectionsAdded: 0,
    };
  }

  // Calculate how many details we need to add
  const targetCount = Math.ceil((targetDensity * wordCount) / 1000);
  const toAdd = Math.min(targetCount - currentCount, 15); // Cap at 15 additions

  if (toAdd <= 0) {
    return {
      content,
      originalDensity: currentDensity,
      newDensity: currentDensity,
      injectionsAdded: 0,
    };
  }

  // Find all scene sluglines
  const lines = content.split('\n');
  const sluglineIndices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(INT\.|EXT\.)/i.test(lines[i])) {
      sluglineIndices.push(i);
    }
  }

  if (sluglineIndices.length === 0) {
    return {
      content,
      originalDensity: currentDensity,
      newDensity: currentDensity,
      injectionsAdded: 0,
    };
  }

  // Select random sluglines to inject after
  const shuffledIndices = [...sluglineIndices].sort(() => Math.random() - 0.5);
  const indicesToUse = shuffledIndices.slice(0, Math.min(toAdd, sluglineIndices.length));

  // Track which lines to add after (offset increases as we insert)
  const usedDetails = new Set<string>();
  let injectionsAdded = 0;

  // Sort in reverse order so insertions don't mess up indices
  indicesToUse.sort((a, b) => b - a);

  for (const sluglineIdx of indicesToUse) {
    // Pick a unique sensory detail
    let detail = pickRandomSensoryDetail();
    let attempts = 0;
    while (usedDetails.has(detail) && attempts < 20) {
      detail = pickRandomSensoryDetail();
      attempts++;
    }
    usedDetails.add(detail);

    // Find the next line after slugline that's not empty
    let insertIdx = sluglineIdx + 1;
    while (insertIdx < lines.length && lines[insertIdx].trim() === '') {
      insertIdx++;
    }

    // Insert the sensory detail as action line (with proper formatting)
    lines.splice(insertIdx, 0, '', detail);
    injectionsAdded++;
  }

  const newContent = lines.join('\n');
  const newWordCount = newContent.split(/\s+/).filter(w => w.length > 0).length;
  const newSensoryCount = countSensoryDetails(newContent);
  const newDensity = (newSensoryCount / newWordCount) * 1000;

  return {
    content: newContent,
    originalDensity: currentDensity,
    newDensity,
    injectionsAdded,
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

  // 5. Check for excessive semantic glue (AI-tell phrases)
  // If too many, hard reject - indicates AI is ignoring instructions
  const semanticGluePatterns = [
    { pattern: /which said everything/gi, name: 'which said everything' },
    { pattern: /not that it mattered/gi, name: 'not that it mattered' },
    { pattern: /,\s*somehow\./gi, name: ', somehow.' },
    { pattern: /,\s*barely\./gi, name: ', barely.' },
    { pattern: /and it showed/gi, name: 'and it showed' },
    { pattern: /if you could call it that/gi, name: 'if you could call it that' },
    { pattern: /whatever that meant/gi, name: 'whatever that meant' },
  ];

  let totalGlueCount = 0;
  const glueExamples: string[] = [];

  for (const { pattern, name } of semanticGluePatterns) {
    const matches = content.match(pattern) || [];
    if (matches.length > 0) {
      totalGlueCount += matches.length;
      if (glueExamples.length < 3) {
        glueExamples.push(`"${name}" (${matches.length}x)`);
      }
    }
  }

  // Hard reject threshold: 10+ semantic glue instances per sequence
  if (totalGlueCount >= 10) {
    reasons.push(`Excessive semantic glue: ${totalGlueCount} AI-tell phrases found`);
    surgicalFixes.push(
      `CRITICAL FIX: Remove all semantic glue phrases. Found ${totalGlueCount} instances including: ${glueExamples.join(', ')}. These phrases are AI tells that destroy authenticity. End sentences cleanly without trailing qualifiers.`
    );
  }

  // 6. Check for voice homogeneity (all characters sound the same)
  const voiceCheck = checkVoiceDistinctiveness(content);
  if (!voiceCheck.pass) {
    reasons.push(`Voice homogeneity: ${voiceCheck.issues.join('; ')}`);
    surgicalFixes.push(
      `CRITICAL FIX: Characters sound identical. ${voiceCheck.rejectReason}

DIFFERENTIATE VOICES:
- Vary sentence starters: "I don't" used ${voiceCheck.starterCounts['I don\'t'] || 0}x, "I can't" used ${voiceCheck.starterCounts['I can\'t'] || 0}x
- Give each character unique rhythm (short vs. flowing sentences)
- Blue-collar: punchy. Professional: precise. Elderly: trailing.
- If you can swap character names and dialogue still works, you've FAILED.`
    );
  }

  // 7. Check for excessive bangers (all-philosophical dialogue)
  const mundanityCheck = checkMundanityRatio(content);
  if (mundanityCheck.ratio > 0.50) {
    // More than 50% bangers = hard reject
    reasons.push(`All-banger dialogue: ${(mundanityCheck.ratio * 100).toFixed(0)}% philosophical`);
    surgicalFixes.push(
      `CRITICAL FIX: ${(mundanityCheck.ratio * 100).toFixed(0)}% of dialogue is profound/philosophical.
Human conversations are 70% logistics, 30% meaningful.

Examples of "banger" lines found:
${mundanityCheck.bangerExamples.map(b => `- "${b}"`).join('\n')}

ADD MUNDANE EXCHANGES:
- "Coffee's cold." / "Sorry."
- "Where'd you park?" / "Out back."
- "You hungry?" / "I'm fine."

These GROUND the profound moments. Without them, everything sounds like a TED talk.
MAXIMUM 1 banger per sequence.`
    );
  }

  // ===== HOLLYWOOD COMPLIANCE CHECKS (Phase 6) =====

  // 8. Check for time jumps (pacing killer)
  const timeJumpCheck = detectTimeJumps(content);
  if (timeJumpCheck.isHardReject) {
    reasons.push(`Too many time jumps: ${timeJumpCheck.count} found (${timeJumpCheck.matches.slice(0, 3).join(', ')})`);
    surgicalFixes.push(
      `CRITICAL FIX: ${timeJumpCheck.count} TIME JUMPS DETECTED - This is lazy storytelling.
Hollywood readers HATE time jumps. They destroy pacing and momentum.

Found: ${timeJumpCheck.matches.join(', ')}

INSTEAD OF TIME JUMPS:
- Show time passage through CHANGED CIRCUMSTANCES (different clothes, grown beard, new furniture)
- Use scene details to imply time (weather change, holiday decorations, newspaper headlines)
- If you MUST jump, keep it to ONE per act, and show the CONSEQUENCE of the time gap

MAXIMUM: 2 time jumps per screenplay. You have ${timeJumpCheck.count}.
REWRITE to eliminate at least ${timeJumpCheck.count - 2} time jumps.`
    );
  }

  // 9. Check for montages (the ultimate lazy device)
  const montageCheck = detectMontages(content);
  if (montageCheck.isHardReject) {
    reasons.push(`Montage detected: ${montageCheck.matches.join(', ')}`);
    surgicalFixes.push(
      `CRITICAL FIX: MONTAGE DETECTED - "${montageCheck.matches[0]}"
Montages are FORBIDDEN. They are the ultimate lazy storytelling device.

A montage says: "I don't want to write these scenes, so I'll summarize them."
Hollywood readers see this as: "The writer gave up here."

INSTEAD OF MONTAGE:
- Pick the 2-3 most dramatic moments and WRITE THEM AS FULL SCENES
- Let the audience EXPERIENCE the transformation, don't SUMMARIZE it
- If training is important, show ONE pivotal training moment that changes everything

REMOVE ALL MONTAGES. Dramatize every scene.`
    );
  }

  // 10. Check scene count (ADD editing)
  const sceneCheck = countScenes(content);
  if (sceneCheck.isOverScened) {
    reasons.push(`Too many scenes: ${sceneCheck.total} (max 100 for feature)`);
    surgicalFixes.push(
      `CRITICAL FIX: ${sceneCheck.total} SCENES DETECTED - This is ADD editing.
Feature films should have 50-70 scenes. You have ${sceneCheck.total}.

Symptoms: Rapid-fire scene hopping, no scene breathes, exhausting to watch.

FIX:
- CONSOLIDATE scenes in the same location into longer conversations
- Let scenes BREATHE (minimum 1.5 pages average)
- Cut establishing shots - jump into the action
- Combine characters who serve the same function

Target: Reduce to 50-70 scenes.`
    );
  }

  // 11. Check interior/exterior ratio (TV vs film)
  if (sceneCheck.isInteriorHeavy) {
    reasons.push(`Too many interiors: ${sceneCheck.interiorRatio.toFixed(0)}% (max 85%)`);
    surgicalFixes.push(
      `CRITICAL FIX: ${sceneCheck.interiorRatio.toFixed(0)}% INTERIORS - This looks like a TV episode, not a film.
Interior count: ${sceneCheck.interiors}
Exterior count: ${sceneCheck.exteriors}

Films need PRODUCTION VALUE. Exteriors = scope, spectacle, cinematic feel.

FIX:
- Move 2-3 conversations OUTSIDE (park bench, car, rooftop)
- Add establishing exteriors to ground locations
- If there's a chase or confrontation, move it outdoors
- Target: At least 40% exteriors for cinematic feel

Add ${Math.ceil(sceneCheck.interiors * 0.4 - sceneCheck.exteriors)} exterior scenes.`
    );
  }

  // 12. Check generic dialogue responses
  const genericCheck = detectGenericResponses(content);
  if (genericCheck.isHardReject) {
    reasons.push(`Too many generic responses: ${genericCheck.count} found`);
    surgicalFixes.push(
      `CRITICAL FIX: ${genericCheck.count} GENERIC RESPONSES - Amateur dialogue detected.
Examples: ${genericCheck.matches.slice(0, 5).join(', ')}

Single-word responses ("Yeah", "No", "Okay") are placeholder dialogue.
Real characters have distinctive ways of saying yes and no.

FIX - Character-specific alternatives:
- Instead of "Yeah" → "If you say so" / "Works for me" / "Guess that's the play"
- Instead of "No" → "Not a chance" / "Forget it" / "That's not happening"
- Instead of "Okay" → "Fine" / "Whatever" / "If that's what you want"
- Instead of "What?" → "I'm sorry?" / "Come again?" / "Excuse me?"

Every response should reveal CHARACTER. If you can swap the character name, you've FAILED.`
    );
  }

  // 13. Check for word repetition (AI tell)
  const wordRepetitionCheck = detectWordRepetition(content);
  if (wordRepetitionCheck.isHardReject) {
    reasons.push(`Too much word repetition: ${wordRepetitionCheck.count} instances found`);
    surgicalFixes.push(
      `CRITICAL FIX: ${wordRepetitionCheck.count} WORD REPETITION PATTERNS - AI writing detected.
Examples: ${wordRepetitionCheck.examples.slice(0, 5).join(', ')}

Patterns like "Fine. Fine." or "I'm scared. I'm scared." are AI tells.
Humans don't repeat themselves like broken records.

FIX:
- Remove duplicate phrases entirely
- If emphasis needed, use DIFFERENT words: "Fine. Just fine." or "I'm scared. Terrified, actually."
- Vary sentence structure instead of repeating

Maximum: 5 repetition patterns. You have ${wordRepetitionCheck.count}.`
    );
  }

  // 14. Check for purple prose (AI tell)
  const purpleProseCheck = detectPurpleProse(content);
  if (purpleProseCheck.isHardReject) {
    reasons.push(`Too much purple prose: ${purpleProseCheck.count} instances found`);
    surgicalFixes.push(
      `CRITICAL FIX: ${purpleProseCheck.count} PURPLE PROSE PATTERNS - AI writing detected.
Examples: ${purpleProseCheck.examples.slice(0, 5).join(', ')}

Phrases like "dust motes dancing", "cathedral of trees", "velvet silence" are AI clichés.
Real screenwriters use FUNCTIONAL action lines, not poetry.

FIX:
- Replace with concrete, specific details
- BAD: "Golden light filters through the cathedral of trees"
- GOOD: "Late sun. Long shadows. She squints."
- Write what a CAMERA sees, not what a novelist describes

Maximum: 3 purple phrases. You have ${purpleProseCheck.count}.`
    );
  }

  // ===== END HOLLYWOOD COMPLIANCE =====

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

/**
 * Check that characters have distinct voices (Phase 3 humanity fix)
 * Returns hard reject if dialogue is too homogeneous
 */
function checkVoiceDistinctiveness(content: string): {
  pass: boolean;
  issues: string[];
  rejectReason: string | null;
  starterCounts: Record<string, number>;
} {
  const issues: string[] = [];

  // Extract character dialogue
  const characterDialogue: Record<string, string[]> = {};
  const lines = content.split('\n');
  let currentCharacter: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for character name (all caps, less than 50 chars)
    if (/^[A-Z][A-Z\s.'()-]+$/.test(trimmed) && trimmed.length < 50 && !trimmed.startsWith('INT.') && !trimmed.startsWith('EXT.')) {
      currentCharacter = trimmed.replace(/\s*\([^)]+\)/, '').trim(); // Remove parentheticals like (V.O.)
      if (!characterDialogue[currentCharacter]) {
        characterDialogue[currentCharacter] = [];
      }
      continue;
    }

    // Skip scene headings and action lines
    if (!trimmed || /^(INT\.|EXT\.)/.test(trimmed) || trimmed.startsWith('(')) {
      currentCharacter = null;
      continue;
    }

    // Collect dialogue
    if (currentCharacter && !trimmed.startsWith('(')) {
      characterDialogue[currentCharacter].push(trimmed);
    }
  }

  // Track overused starters across ALL characters
  const starterPatterns: Record<string, RegExp> = {
    'I don\'t': /^I don'?t\b/i,
    'I can\'t': /^I can'?t\b/i,
    'I know': /^I know\b/i,
    'I just': /^I just\b/i,
    'I need': /^I need\b/i,
    'I\'m': /^I'?m\b/i,
  };

  const starterCounts: Record<string, number> = {};
  const starterLimits: Record<string, number> = {
    'I don\'t': 6,
    'I can\'t': 5,
    'I know': 5,
    'I just': 4,
    'I need': 4,
    'I\'m': 8,
  };

  // Count starters across all dialogue
  for (const [character, dialogueLines] of Object.entries(characterDialogue)) {
    for (const dialogueLine of dialogueLines) {
      for (const [starter, pattern] of Object.entries(starterPatterns)) {
        if (pattern.test(dialogueLine)) {
          starterCounts[starter] = (starterCounts[starter] || 0) + 1;
        }
      }
    }
  }

  // Check for overused starters (exceeding limits)
  let overusedStarters = 0;
  for (const [starter, count] of Object.entries(starterCounts)) {
    const limit = starterLimits[starter] || 5;
    if (count > limit) {
      issues.push(`"${starter}" used ${count}x (limit: ${limit})`);
      overusedStarters++;
    }
  }

  // Check for voice homogeneity between characters
  // Compare sentence length variance between pairs of characters
  const characterStats: Record<string, { avgLength: number; shortCount: number; longCount: number }> = {};

  for (const [character, dialogueLines] of Object.entries(characterDialogue)) {
    if (dialogueLines.length < 3) continue; // Need enough samples

    const lengths = dialogueLines.map(d => d.split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const shortCount = lengths.filter(l => l <= 5).length;
    const longCount = lengths.filter(l => l >= 15).length;

    characterStats[character] = { avgLength, shortCount, longCount };
  }

  // Compare pairs of characters for similar patterns
  const charNames = Object.keys(characterStats);
  let similarPairs = 0;

  for (let i = 0; i < charNames.length; i++) {
    for (let j = i + 1; j < charNames.length; j++) {
      const char1 = characterStats[charNames[i]];
      const char2 = characterStats[charNames[j]];

      // If both characters have very similar average sentence lengths, flag it
      const avgDiff = Math.abs(char1.avgLength - char2.avgLength);
      if (avgDiff < 2) {
        similarPairs++;
      }
    }
  }

  // Hard reject if: too many similar pairs OR too many overused starters
  const totalPairs = (charNames.length * (charNames.length - 1)) / 2;
  const similarityRatio = totalPairs > 0 ? similarPairs / totalPairs : 0;

  let rejectReason: string | null = null;

  if (overusedStarters >= 2) {
    rejectReason = `Multiple dialogue starters overused: ${Object.entries(starterCounts).filter(([s, c]) => c > (starterLimits[s] || 5)).map(([s, c]) => `"${s}"=${c}`).join(', ')}`;
  } else if (similarityRatio > 0.7 && charNames.length >= 3) {
    rejectReason = `${Math.round(similarityRatio * 100)}% of character pairs have identical speech rhythms`;
  }

  return {
    pass: rejectReason === null,
    issues,
    rejectReason,
    starterCounts,
  };
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
    // IMPORTANT: Every prop must have a replacement or text becomes corrupt
    let replacement = 'it'; // Default fallback - never leave empty
    if (toRemove.prop === 'watch') replacement = 'it';
    else if (toRemove.prop === 'gun') replacement = 'it';
    else if (toRemove.prop === 'phone') replacement = 'it';
    else if (toRemove.prop === 'cigarette') replacement = '';
    else if (toRemove.prop === 'photo') replacement = 'it';
    else if (toRemove.prop === 'glasses') replacement = 'them';
    else if (toRemove.prop === 'ring') replacement = 'it';
    else if (toRemove.prop === 'keys') replacement = 'them';

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
    example: 'I think-- I know you\'re lying.',
    // FIXED: Removed "No." - was creating detectable "word-- No. word" pattern
    // Now just uses trailing dash for hesitation
    inject: (sentence: string) => {
      const words = sentence.split(' ');
      if (words.length < 4) return sentence;
      // Just add hesitation, no "No." pattern
      return `${words[0]}-- ${sentence}`;
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

  // NOTE: Semantic glue extensions REMOVED (Phase 3 humanity fix)
  // Previously injected ", somehow", ", barely", "which said everything" etc.
  // These are AI tells that tank humanity scores. Natural variance preferred.

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
      // Only shorten - NO extension with semantic glue
      if (wordCount >= 8 && wordCount <= 14) {
        // 15% chance to break into fragments (reduced from 25% since we removed extensions)
        if (Math.random() < 0.15) {
          // Shorten: Break into fragments
          const words = sentence.split(/\s+/);
          const breakPoint = Math.floor(words.length / 2);
          const newSentence = words.slice(0, breakPoint).join(' ') + '. ' +
                             words.slice(breakPoint).join(' ');
          modifiedSentences.push(newSentence);
          modifications++;
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
// SEMANTIC GLUE & ARTIFACT STRIPPING (Phase 3 Humanity Fix)
// ============================================================================

/**
 * Remove AI-tell semantic glue phrases that tank humanity scores
 * These phrases are overused and signal machine generation
 */
export function stripSemanticGlue(content: string): {
  content: string;
  patternsRemoved: number;
  removedExamples: string[];
} {
  const gluePatterns: { pattern: RegExp; name: string }[] = [
    { pattern: /,\s*which said everything\.?/gi, name: 'which said everything' },
    { pattern: /--\s*not that it mattered\.?/gi, name: 'not that it mattered' },
    { pattern: /,\s*somehow\.(?=\s|$)/gi, name: 'trailing somehow' },
    { pattern: /,\s*barely\.(?=\s|$)/gi, name: 'trailing barely' },
    { pattern: /,\s*and it showed\.?/gi, name: 'and it showed' },
    { pattern: /,\s*if you could call it that\.?/gi, name: 'if you could call it that' },
    { pattern: /,\s*or so (he|she|they) told (himself|herself|themselves)\.?/gi, name: 'or so X told X' },
    { pattern: /,\s*whatever that meant\.?/gi, name: 'whatever that meant' },
    { pattern: /\.\s*Or something like that\.?/gi, name: 'Or something like that' },
  ];

  let processed = content;
  let totalRemoved = 0;
  const removedExamples: string[] = [];

  for (const { pattern, name } of gluePatterns) {
    const matches = processed.match(pattern);
    if (matches && matches.length > 0) {
      totalRemoved += matches.length;
      if (removedExamples.length < 5) {
        removedExamples.push(`${name} (${matches.length}x)`);
      }
      processed = processed.replace(pattern, '.');
    }
  }

  // Clean up any double periods or period-space-period
  processed = processed.replace(/\.{2,}/g, '.').replace(/\.\s+\./g, '.');

  return {
    content: processed,
    patternsRemoved: totalRemoved,
    removedExamples,
  };
}

/**
 * Remove technical artifacts that leak through from generation
 * These should never appear in final screenplay
 */
export function stripTechnicalArtifacts(content: string): {
  content: string;
  artifactsRemoved: number;
  removedTypes: string[];
} {
  const artifactPatterns: { pattern: RegExp; name: string }[] = [
    { pattern: /\s*\[SCENE (START|END)\]\s*/gi, name: 'SCENE markers' },
    { pattern: /\s*\*?\*?END OF SEQUENCE \d+\*?\*?\s*/gi, name: 'END OF SEQUENCE' },
    { pattern: /\s*\[START OF SEQUENCE \d+\]\s*/gi, name: 'START OF SEQUENCE' },
    { pattern: /\s*\[SEQUENCE \d+( (START|END|BEGINS|ENDS))?\]\s*/gi, name: 'SEQUENCE markers' },
    { pattern: /\s*SEQUENCE \d+ (START|END|BEGINS|ENDS)\s*/gi, name: 'SEQUENCE text markers' },
    { pattern: /\s*BUTTON:\s*/gi, name: 'BUTTON:' },
    { pattern: /\s*\[BUTTON\]\s*/gi, name: '[BUTTON]' },
    { pattern: /\s*\[END\]\s*/gi, name: '[END]' },
    { pattern: /\s*\[CONTINUE\]\s*/gi, name: '[CONTINUE]' },
    { pattern: /\s*---+\s*$/gm, name: 'trailing dashes' },
    { pattern: /^\s*\*\*\*+\s*$/gm, name: 'asterisk dividers' },
    // AI-generated meta-parentheticals that leak through
    { pattern: /\(Precision failing\)/gi, name: 'meta-parenthetical' },
    { pattern: /\(Armor cracking\)/gi, name: 'meta-parenthetical' },
    { pattern: /\(Composure breaking\)/gi, name: 'meta-parenthetical' },
    { pattern: /\(Breaking down\)/gi, name: 'meta-parenthetical' },
    { pattern: /\(Losing control\)/gi, name: 'meta-parenthetical' },
  ];

  let processed = content;
  let totalRemoved = 0;
  const removedTypes: string[] = [];

  for (const { pattern, name } of artifactPatterns) {
    const matches = processed.match(pattern);
    if (matches && matches.length > 0) {
      totalRemoved += matches.length;
      if (!removedTypes.includes(name)) {
        removedTypes.push(name);
      }
      processed = processed.replace(pattern, '\n\n');
    }
  }

  // Clean up excessive newlines
  processed = processed.replace(/\n{4,}/g, '\n\n\n');

  return {
    content: processed,
    artifactsRemoved: totalRemoved,
    removedTypes,
  };
}

/**
 * Limit ellipsis usage to prevent AI-tell overuse
 * Target: ~2 per 1000 words (50 max for 25k screenplay)
 * Priority: Keep ellipses in dialogue (trail-offs), reduce in action lines
 */
export function enforceEllipsisLimit(
  content: string,
  maxPerThousandWords: number = 2
): {
  content: string;
  originalCount: number;
  finalCount: number;
  ellipsesRemoved: number;
} {
  const wordCount = content.split(/\s+/).length;
  const maxEllipses = Math.ceil((wordCount / 1000) * maxPerThousandWords);

  // Count current ellipses
  const ellipsisPattern = /\.{3}|…/g;
  const allMatches = content.match(ellipsisPattern) || [];
  const originalCount = allMatches.length;

  if (originalCount <= maxEllipses) {
    return {
      content,
      originalCount,
      finalCount: originalCount,
      ellipsesRemoved: 0,
    };
  }

  // Split content into lines to prioritize dialogue ellipses
  const lines = content.split('\n');
  const result: string[] = [];
  let inDialogue = false;
  let dialogueEllipses = 0;
  let actionEllipses = 0;
  let keptCount = 0;

  // First pass: count dialogue vs action ellipses
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

    const ellipsesInLine = (line.match(ellipsisPattern) || []).length;
    if (inDialogue) {
      dialogueEllipses += ellipsesInLine;
    } else {
      actionEllipses += ellipsesInLine;
    }
  }

  // Calculate how many action ellipses to remove
  // Prioritize keeping dialogue ellipses (character trail-offs are natural)
  const dialogueKeep = Math.min(dialogueEllipses, Math.floor(maxEllipses * 0.7));
  const actionKeep = maxEllipses - dialogueKeep;
  let actionRemoved = 0;
  const actionToRemove = actionEllipses - actionKeep;

  // Second pass: selectively remove ellipses from action lines
  inDialogue = false;
  for (const line of lines) {
    const trimmed = line.trim();
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

    if (!inDialogue && actionToRemove > 0 && actionRemoved < actionToRemove) {
      // Replace ellipses in action lines with periods or em-dashes
      let processed = line;
      const ellipsesInLine = (line.match(ellipsisPattern) || []).length;
      const canRemove = Math.min(ellipsesInLine, actionToRemove - actionRemoved);

      for (let i = 0; i < canRemove; i++) {
        // Alternate between period and em-dash for variety
        const replacement = i % 2 === 0 ? '.' : '—';
        processed = processed.replace(ellipsisPattern, replacement);
        actionRemoved++;
      }
      result.push(processed);
    } else {
      result.push(line);
    }
  }

  const finalContent = result.join('\n');
  const finalMatches = finalContent.match(ellipsisPattern) || [];

  return {
    content: finalContent,
    originalCount,
    finalCount: finalMatches.length,
    ellipsesRemoved: originalCount - finalMatches.length,
  };
}

// ============================================================================
// SOMATIC MARKER INJECTION (Phase 3 Humanity Fix)
// ============================================================================

/**
 * Somatic markers by emotion - physical sensations that convey feeling
 * These replace "telling" action lines with "showing" body reactions
 */
const SOMATIC_MARKERS: Record<string, string[]> = {
  fear: [
    'stomach drops',
    'blood runs cold',
    'skin crawls',
    'chest tightens',
    'throat closes',
    'legs go weak',
    'hands won\'t stop shaking',
    'heart hammers',
  ],
  anger: [
    'jaw clenches',
    'fists ball',
    'heat rises in chest',
    'pulse pounds in temples',
    'vision narrows',
    'teeth grind',
    'muscles coil',
  ],
  grief: [
    'chest hollows',
    'throat thick',
    'weight settles on shoulders',
    'breath hitches',
    'something breaks behind eyes',
    'world goes grey',
  ],
  relief: [
    'tension drains',
    'shoulders unknot',
    'breath releases',
    'legs go rubbery',
    'head lightens',
  ],
  surprise: [
    'breath catches',
    'eyes widen',
    'body freezes',
    'pulse stutters',
  ],
  disgust: [
    'stomach turns',
    'bile rises',
    'skin prickles',
    'nose wrinkles',
  ],
};

/**
 * Patterns that tell emotion instead of showing
 * These get replaced with somatic markers
 */
const EMOTION_TELL_PATTERNS: Array<{
  pattern: RegExp;
  emotion: string;
}> = [
  { pattern: /\b(feels?|feeling)\s+(scared|afraid|terrified|frightened)\b/gi, emotion: 'fear' },
  { pattern: /\b(feels?|feeling)\s+(angry|furious|enraged|mad)\b/gi, emotion: 'anger' },
  { pattern: /\b(feels?|feeling)\s+(sad|grief|devastated|heartbroken)\b/gi, emotion: 'grief' },
  { pattern: /\b(feels?|feeling)\s+(relieved|relief)\b/gi, emotion: 'relief' },
  { pattern: /\b(feels?|feeling)\s+(shocked|surprised|stunned)\b/gi, emotion: 'surprise' },
  { pattern: /\b(feels?|feeling)\s+(disgusted|revolted|sick)\b/gi, emotion: 'disgust' },
  { pattern: /\bfear grips\b/gi, emotion: 'fear' },
  { pattern: /\banger (rises|builds|wells)\b/gi, emotion: 'anger' },
  { pattern: /\bpanic (sets in|takes over)\b/gi, emotion: 'fear' },
];

/**
 * Replace "telling" emotion lines with somatic markers
 * Transforms "He feels scared" into "His stomach drops"
 */
export function enforceSomaticMarkers(content: string): {
  content: string;
  replacementsMade: number;
  replacements: string[];
} {
  let processed = content;
  let replacementsMade = 0;
  const replacements: string[] = [];

  // Only process action lines (not dialogue)
  const lines = processed.split('\n');
  const result: string[] = [];
  let inDialogue = false;

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

    // This is an action line - check for emotion tells
    let modifiedLine = line;

    for (const { pattern, emotion } of EMOTION_TELL_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(modifiedLine)) {
        // Pick a random somatic marker for this emotion
        const markers = SOMATIC_MARKERS[emotion];
        if (markers && markers.length > 0) {
          const marker = markers[Math.floor(Math.random() * markers.length)];

          // Replace the tell with the somatic marker
          modifiedLine = modifiedLine.replace(pattern, marker);
          replacementsMade++;

          if (replacements.length < 5) {
            replacements.push(`${emotion}: ${marker}`);
          }
        }
      }
    }

    result.push(modifiedLine);
  }

  return {
    content: result.join('\n'),
    replacementsMade,
    replacements,
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

    // Check for vulnerability moments (character name + breaking patterns)
    const profNameLower = prof.name.toLowerCase();
    const vulnerabilityPatterns = [
      new RegExp(`${profNameLower}.*actually laughs`, 'i'),
      new RegExp(`${profNameLower}.*admits.*doesn't know`, 'i'),
      new RegExp(`${profNameLower}.*forgets.*word`, 'i'),
      new RegExp(`${profNameLower}.*stumbles`, 'i'),
      new RegExp(`${profNameLower}.*blushes`, 'i'),
    ];
    const hasVulnerability = vulnerabilityPatterns.some(pattern => pattern.test(content));

    if (!hasHobbyMention && !hasImperfection && !hasVulnerability) {
      warnings.push(`${prof.name} (Professor archetype) lacks humanizing details`);
      suggestions.push(
        `Add ONE of these for ${prof.name}:
        - Mundane hobby mention (crossword, gardening, old movies)
        - Physical imperfection (coffee stain on tie, messy desk)
        - Vulnerability moment (forgets a word, admits uncertainty, actually laughs)`
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
// AI DETECTION CLEANERS (Phase 4: Fix AI Tells)
// ============================================================================

/**
 * Fix lowercase letters after periods (AI generation bug)
 * Example: "She is a ghost. in a cathedral" → "She is a ghost. In a cathedral"
 */
export function fixLowercaseAfterPeriods(content: string): {
  content: string;
  fixCount: number;
} {
  let fixCount = 0;

  // Pattern: period/question/exclamation followed by space then lowercase
  // But NOT for intentional fragments in dialogue (after ellipsis)
  const processed = content.replace(
    /([.!?])\s+([a-z])/g,
    (match, punct, letter) => {
      // Don't capitalize after ellipsis (...) - that's intentional trailing
      // Check if previous chars include ellipsis
      fixCount++;
      return `${punct} ${letter.toUpperCase()}`;
    }
  );

  // Also fix double punctuation like ",." or ".,"
  const cleaned = processed
    .replace(/,\./g, '.')
    .replace(/\.,/g, '.')
    .replace(/\.\s*\./g, '.');

  return {
    content: cleaned,
    fixCount,
  };
}

/**
 * Cap ellipsis usage to prevent AI detection
 * Max 25 ellipses per sequence (roughly 1 per page)
 */
export function capEllipsisUsage(content: string, maxEllipses: number = 25): {
  content: string;
  totalFound: number;
  removed: number;
} {
  // Find all ellipses
  const ellipsisPattern = /\.\.\./g;
  const matches = content.match(ellipsisPattern) || [];
  const totalFound = matches.length;

  if (totalFound <= maxEllipses) {
    return { content, totalFound, removed: 0 };
  }

  // Need to remove excess ellipses
  // Replace from the end to preserve early uses
  let result = content;
  let removed = 0;
  const toRemove = totalFound - maxEllipses;

  // Find all positions, then remove from the last ones
  const positions: number[] = [];
  let match;
  const regex = /\.\.\./g;
  while ((match = regex.exec(content)) !== null) {
    positions.push(match.index);
  }

  // Remove from the end
  for (let i = positions.length - 1; i >= 0 && removed < toRemove; i--) {
    const pos = positions[i];
    // Check context - if it's dialogue trailing off, replace with period
    const before = result.slice(Math.max(0, pos - 20), pos);
    const after = result.slice(pos + 3, pos + 23);

    // If it's at end of line or before newline, replace with period
    if (after.trim().startsWith('\n') || after.trim() === '') {
      result = result.slice(0, pos) + '.' + result.slice(pos + 3);
    } else {
      // Mid-sentence ellipsis - replace with comma or dash
      result = result.slice(0, pos) + '--' + result.slice(pos + 3);
    }
    removed++;
  }

  return { content: result, totalFound, removed };
}

/**
 * Cap stutter usage (X-X patterns) to prevent AI detection
 * Max 8 stutters per sequence
 */
export function capStutterUsage(content: string, maxStutters: number = 8): {
  content: string;
  totalFound: number;
  removed: number;
} {
  // Pattern: letter-letter at word start (like t-this, w-what)
  const stutterPattern = /\b([a-zA-Z])-\1/gi;
  const matches = content.match(stutterPattern) || [];
  const totalFound = matches.length;

  if (totalFound <= maxStutters) {
    return { content, totalFound, removed: 0 };
  }

  // Remove excess stutters from the end
  let result = content;
  let removed = 0;
  const toRemove = totalFound - maxStutters;

  // Find all positions
  const positions: Array<{index: number, match: string}> = [];
  let match;
  const regex = /\b([a-zA-Z])-\1([a-zA-Z]*)/gi;
  while ((match = regex.exec(content)) !== null) {
    positions.push({ index: match.index, match: match[0] });
  }

  // Remove from the end (keep first maxStutters)
  for (let i = positions.length - 1; i >= maxStutters && removed < toRemove; i--) {
    const { index, match: stutterMatch } = positions[i];
    // Remove the stutter, keep just the word
    const cleanWord = stutterMatch.replace(/^([a-zA-Z])-/, '');
    result = result.slice(0, index) + cleanWord + result.slice(index + stutterMatch.length);
    removed++;
  }

  return { content: result, totalFound, removed };
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
    // Phase 3 metrics
    semanticGlueRemoved: number;
    technicalArtifactsRemoved: number;
    ellipsesRemoved: number;
    somaticMarkersInjected: number;
    // Phase 6: Hollywood compliance metrics
    summaryEndingsRemoved: number;
    timeJumpsDetected: number;
    montagesDetected: number;
    sceneCount: number;
    interiorRatio: number;
    genericResponsesDetected: number;
    genericResponsesReplaced: number;
    wordRepetitionDetected: number;
    purpleProseDetected: number;
    sensoryDetailsInjected: number;
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
        // Phase 3 metrics
        semanticGlueRemoved: 0,
        technicalArtifactsRemoved: 0,
        ellipsesRemoved: 0,
        somaticMarkersInjected: 0,
        // Phase 6: Hollywood compliance metrics
        summaryEndingsRemoved: 0,
        timeJumpsDetected: 0,
        montagesDetected: 0,
        sceneCount: 0,
        interiorRatio: 0,
        genericResponsesDetected: 0,
        genericResponsesReplaced: 0,
        wordRepetitionDetected: 0,
        purpleProseDetected: 0,
        sensoryDetailsInjected: 0,
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

  // ===== PHASE 3: HUMANITY FIXES =====

  // 9a. Strip semantic glue (AI-tell phrases)
  const glueResult = stripSemanticGlue(processedContent);
  processedContent = glueResult.content;

  // 9b. Strip technical artifacts ([SCENE END], BUTTON:, etc.)
  const artifactResult = stripTechnicalArtifacts(processedContent);
  processedContent = artifactResult.content;

  // 9c. Enforce ellipsis limit (~2 per 1000 words)
  const ellipsisResult = enforceEllipsisLimit(processedContent);
  processedContent = ellipsisResult.content;

  // 9d. Inject somatic markers (replace "feels scared" with physical sensations)
  const somaticResult = enforceSomaticMarkers(processedContent);
  processedContent = somaticResult.content;

  // 9e. Kill summary endings (AI tells like "which said everything", "somehow")
  const summaryEndingResult = killSummaryEndings(processedContent);
  processedContent = summaryEndingResult.content;

  // ===== END PHASE 3 =====

  // 10. Inject verbal friction (5% chance, max 2 per sequence)
  // REDUCED from 15%/6 - prompts already ask for verbal messiness, so post-processing
  // injection was creating DOUBLE messiness ("Right. Right. Just.", excessive stutters)
  // Now minimal injection since prompts handle the heavy lifting
  const frictionResult = injectVerbalFriction(processedContent, 0.05, 2);
  processedContent = frictionResult.content;

  // 10a. Inject sensory details (Phase 2.7: target 4+ per 1000 words)
  const sensoryResult = injectSensoryDetails(processedContent, 4);
  processedContent = sensoryResult.content;

  // ===== END PHASE 2 =====

  // ===== PHASE 4: AI DETECTION CLEANUP =====
  // These fix bugs and over-injection that cause AI detection

  // 10b. Fix lowercase after periods (generation bug)
  const lowercaseResult = fixLowercaseAfterPeriods(processedContent);
  processedContent = lowercaseResult.content;

  // 10c. Cap ellipsis usage (max 10 per sequence = ~80 total for 8 sequences)
  // Scorer flags >25 TOTAL as "high ellipsis", so keeping per-sequence low
  const ellipsisCapResult = capEllipsisUsage(processedContent, 10);
  processedContent = ellipsisCapResult.content;

  // 10d. Cap stutter usage (max 8 per sequence - was 40+ causing AI detection)
  const stutterCapResult = capStutterUsage(processedContent, 8);
  processedContent = stutterCapResult.content;

  // 10e. Replace generic dialogue responses (Yeah/No/Okay → character-specific alternatives)
  const genericReplacementResult = replaceGenericResponses(processedContent);
  processedContent = genericReplacementResult.content;

  // ===== END PHASE 4 =====

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
      // Phase 3 metrics
      semanticGlueRemoved: glueResult.patternsRemoved,
      technicalArtifactsRemoved: artifactResult.artifactsRemoved,
      ellipsesRemoved: ellipsisResult.ellipsesRemoved,
      somaticMarkersInjected: somaticResult.replacementsMade,
      // Phase 6: Hollywood compliance metrics
      summaryEndingsRemoved: summaryEndingResult.removedCount,
      timeJumpsDetected: detectTimeJumps(processedContent).count,
      montagesDetected: detectMontages(processedContent).count,
      sceneCount: countScenes(processedContent).total,
      interiorRatio: countScenes(processedContent).interiorRatio,
      genericResponsesDetected: detectGenericResponses(processedContent).count,
      genericResponsesReplaced: genericReplacementResult.replacementsCount,
      wordRepetitionDetected: detectWordRepetition(processedContent).count,
      purpleProseDetected: detectPurpleProse(processedContent).count,
      sensoryDetailsInjected: sensoryResult.injectionsAdded,
    },
  };
}
