/**
 * Burstiness Engine - Sentence Length Variance Injection
 *
 * Human writing has HIGH burstiness (variance in sentence length).
 * AI writing has LOW burstiness (uniform 8-12 word sentences).
 *
 * This engine:
 * - Measures burstiness score (stdDev / mean)
 * - Adds short punchy sentences (< 8 words) at dramatic moments
 * - Combines related sentences into longer flowing ones
 * - Targets: 15-25% short, 10-20% long, rest medium
 */

export interface BurstinessConfig {
  minScore: number;                 // Minimum burstiness (default: 0.4)
  targetShortRatio: number;         // Target % of short sentences (default: 0.18)
  targetLongRatio: number;          // Target % of long sentences (default: 0.15)
  shortThreshold: number;           // Words to qualify as "short" (default: 8)
  longThreshold: number;            // Words to qualify as "long" (default: 20)
  enableShortInjection: boolean;    // Add short sentences (default: true)
  enableLongCreation: boolean;      // Combine into long sentences (default: true)
}

export interface BurstinessResult {
  content: string;
  changes: BurstinessChange[];
  metrics: {
    originalScore: number;
    finalScore: number;
    originalShortRatio: number;
    finalShortRatio: number;
    originalLongRatio: number;
    finalLongRatio: number;
    shortSentencesAdded: number;
    sentencesCombined: number;
  };
}

interface BurstinessChange {
  type: 'short_injection' | 'combination' | 'split';
  original: string;
  replacement: string;
  reason: string;
}

interface SentenceLengthAnalysis {
  sentences: string[];
  lengths: number[];
  mean: number;
  stdDev: number;
  burstinessScore: number;
  shortCount: number;
  longCount: number;
  shortRatio: number;
  longRatio: number;
}

const DEFAULT_CONFIG: BurstinessConfig = {
  minScore: 0.4,
  targetShortRatio: 0.18,
  targetLongRatio: 0.15,
  shortThreshold: 8,
  longThreshold: 20,
  enableShortInjection: true,
  enableLongCreation: true,
};

/**
 * Enforce burstiness by adding sentence length variety.
 */
export function enforceBurstiness(
  text: string,
  config: Partial<BurstinessConfig> = {}
): BurstinessResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const changes: BurstinessChange[] = [];

  // Analyze current burstiness
  const original = analyzeBurstiness(text, cfg);

  // If already good, return unchanged
  if (original.burstinessScore >= cfg.minScore &&
      original.shortRatio >= cfg.targetShortRatio * 0.7 &&
      original.longRatio >= cfg.targetLongRatio * 0.7) {
    return {
      content: text,
      changes: [],
      metrics: {
        originalScore: original.burstinessScore,
        finalScore: original.burstinessScore,
        originalShortRatio: original.shortRatio,
        finalShortRatio: original.shortRatio,
        originalLongRatio: original.longRatio,
        finalLongRatio: original.longRatio,
        shortSentencesAdded: 0,
        sentencesCombined: 0,
      },
    };
  }

  // Process paragraph by paragraph
  const paragraphs = text.split(/\n\n+/);
  const processedParagraphs: string[] = [];
  let shortAdded = 0;
  let combined = 0;

  for (const para of paragraphs) {
    // Skip short paragraphs
    if (para.trim().length < 50) {
      processedParagraphs.push(para);
      continue;
    }

    const result = processParagraph(para, cfg, original);
    processedParagraphs.push(result.content);
    changes.push(...result.changes);
    shortAdded += result.shortAdded;
    combined += result.combined;
  }

  const finalText = processedParagraphs.join('\n\n');
  const final = analyzeBurstiness(finalText, cfg);

  return {
    content: finalText,
    changes,
    metrics: {
      originalScore: original.burstinessScore,
      finalScore: final.burstinessScore,
      originalShortRatio: original.shortRatio,
      finalShortRatio: final.shortRatio,
      originalLongRatio: original.longRatio,
      finalLongRatio: final.longRatio,
      shortSentencesAdded: shortAdded,
      sentencesCombined: combined,
    },
  };
}

/**
 * Analyze text for burstiness metrics.
 */
function analyzeBurstiness(text: string, config: BurstinessConfig): SentenceLengthAnalysis {
  const sentences = splitSentences(text);
  const lengths = sentences.map(s => countWords(s));

  if (lengths.length === 0) {
    return {
      sentences,
      lengths,
      mean: 0,
      stdDev: 0,
      burstinessScore: 0,
      shortCount: 0,
      longCount: 0,
      shortRatio: 0,
      longRatio: 0,
    };
  }

  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const burstinessScore = mean > 0 ? stdDev / mean : 0;

  const shortCount = lengths.filter(l => l < config.shortThreshold).length;
  const longCount = lengths.filter(l => l > config.longThreshold).length;

  return {
    sentences,
    lengths,
    mean,
    stdDev,
    burstinessScore,
    shortCount,
    longCount,
    shortRatio: shortCount / lengths.length,
    longRatio: longCount / lengths.length,
  };
}

/**
 * Process a single paragraph for burstiness.
 */
function processParagraph(
  para: string,
  config: BurstinessConfig,
  globalAnalysis: SentenceLengthAnalysis
): {
  content: string;
  changes: BurstinessChange[];
  shortAdded: number;
  combined: number;
} {
  const changes: BurstinessChange[] = [];
  let shortAdded = 0;
  let combined = 0;

  let sentences = splitSentences(para);
  let lengths = sentences.map(s => countWords(s));

  // Strategy 1: If too few short sentences, add punchy ones
  if (config.enableShortInjection) {
    const shortCount = lengths.filter(l => l < config.shortThreshold).length;
    const targetShort = Math.ceil(sentences.length * config.targetShortRatio);

    if (shortCount < targetShort) {
      const result = injectShortSentences(sentences, lengths, targetShort - shortCount, config);
      sentences = result.sentences;
      lengths = sentences.map(s => countWords(s));
      changes.push(...result.changes);
      shortAdded = result.added;
    }
  }

  // Strategy 2: If too few long sentences, combine some
  if (config.enableLongCreation) {
    const longCount = lengths.filter(l => l > config.longThreshold).length;
    const targetLong = Math.ceil(sentences.length * config.targetLongRatio);

    if (longCount < targetLong) {
      const result = createLongSentences(sentences, lengths, targetLong - longCount, config);
      sentences = result.sentences;
      changes.push(...result.changes);
      combined = result.combined;
    }
  }

  return {
    content: sentences.join(' '),
    changes,
    shortAdded,
    combined,
  };
}

/**
 * Inject short punchy sentences.
 */
function injectShortSentences(
  sentences: string[],
  lengths: number[],
  targetCount: number,
  config: BurstinessConfig
): {
  sentences: string[];
  changes: BurstinessChange[];
  added: number;
} {
  const changes: BurstinessChange[] = [];
  const result = [...sentences];
  let added = 0;

  // Find good spots for short sentences (after long ones, at dramatic moments)
  for (let i = 0; i < result.length && added < targetCount; i++) {
    // Skip if already short
    if (lengths[i] < config.shortThreshold) continue;

    // Check if this is a dramatic moment (contains certain words)
    const sentence = result[i];
    const isDramatic = /\b(suddenly|realized|knew|saw|heard|felt|stopped|froze|died|screamed|whispered)\b/i.test(sentence);

    if (isDramatic && lengths[i] > 15) {
      // Try to extract a short punchy followup
      const short = createShortFollowup(sentence);
      if (short) {
        result.splice(i + 1, 0, short);
        changes.push({
          type: 'short_injection',
          original: sentence,
          replacement: `${sentence} ${short}`,
          reason: 'Adding punchy short sentence after dramatic moment',
        });
        added++;
        i++; // Skip the added sentence
      }
    }
  }

  // If we still need more, split some medium sentences
  if (added < targetCount) {
    for (let i = 0; i < result.length && added < targetCount; i++) {
      const length = countWords(result[i]);
      if (length >= 12 && length <= 18) {
        const split = trySplitSentence(result[i]);
        if (split) {
          const original = result[i];
          result[i] = split.first;
          result.splice(i + 1, 0, split.second);
          changes.push({
            type: 'split',
            original,
            replacement: `${split.first} ${split.second}`,
            reason: 'Split medium sentence for variety',
          });
          added++;
          i++;
        }
      }
    }
  }

  return { sentences: result, changes, added };
}

/**
 * Create a short punchy followup sentence.
 */
function createShortFollowup(sentence: string): string | null {
  const lowerSentence = sentence.toLowerCase();

  // Patterns for short followups
  if (/\b(realized|understood|knew)\b/.test(lowerSentence)) {
    return pickRandom(['Everything changed.', 'Now he knew.', 'It all made sense.', 'The truth was clear.']);
  }

  if (/\b(stopped|froze|paused)\b/.test(lowerSentence)) {
    return pickRandom(['Silence.', 'Nothing moved.', 'Time stopped.', 'Complete stillness.']);
  }

  if (/\b(saw|looked|noticed)\b/.test(lowerSentence)) {
    return pickRandom(['There it was.', 'Unmistakable.', 'No doubt about it.']);
  }

  if (/\b(heard|listened)\b/.test(lowerSentence)) {
    return pickRandom(['Then silence.', 'Nothing more.', 'It was enough.']);
  }

  if (/\b(died|dead|kill)\b/.test(lowerSentence)) {
    return pickRandom(['Gone.', 'Forever.', 'No going back.']);
  }

  return null;
}

/**
 * Try to split a sentence into two shorter ones.
 */
function trySplitSentence(sentence: string): { first: string; second: string } | null {
  // Look for natural split points
  const splitPatterns = [
    /^(.+?),\s*(and|but)\s+(.+)$/i,
    /^(.+?)\s*;\s*(.+)$/,
    /^(.+?)\s*—\s*(.+)$/,
    /^(.+?\s(?:and|but)\s.+?),\s*(.+)$/i,
  ];

  for (const pattern of splitPatterns) {
    const match = sentence.match(pattern);
    if (match) {
      let first = match[1].trim();
      let second = (match[3] || match[2]).trim();

      // Add periods if needed
      if (!/[.!?]$/.test(first)) first += '.';

      // Capitalize second sentence
      second = second.charAt(0).toUpperCase() + second.slice(1);
      if (!/[.!?]$/.test(second)) second += '.';

      // Check lengths
      if (countWords(first) >= 4 && countWords(second) >= 4) {
        return { first, second };
      }
    }
  }

  return null;
}

/**
 * Create long sentences by combining short ones.
 */
function createLongSentences(
  sentences: string[],
  lengths: number[],
  targetCount: number,
  config: BurstinessConfig
): {
  sentences: string[];
  changes: BurstinessChange[];
  combined: number;
} {
  const changes: BurstinessChange[] = [];
  const result: string[] = [];
  let combined = 0;
  let i = 0;

  while (i < sentences.length) {
    // Look for consecutive medium sentences that could be combined
    if (combined < targetCount && i + 1 < sentences.length) {
      const len1 = lengths[i];
      const len2 = lengths[i + 1];

      // Both medium length, could be combined
      if (len1 >= 8 && len1 <= 14 && len2 >= 8 && len2 <= 14) {
        const combined_sentence = combineSentences(sentences[i], sentences[i + 1]);
        if (combined_sentence && countWords(combined_sentence) > config.longThreshold) {
          result.push(combined_sentence);
          changes.push({
            type: 'combination',
            original: `${sentences[i]} ${sentences[i + 1]}`,
            replacement: combined_sentence,
            reason: 'Combined sentences for flow and length variety',
          });
          combined++;
          i += 2;
          continue;
        }
      }
    }

    result.push(sentences[i]);
    i++;
  }

  return { sentences: result, changes, combined };
}

/**
 * Combine two sentences into one longer sentence.
 */
function combineSentences(first: string, second: string): string | null {
  // Remove trailing punctuation from first
  const cleanFirst = first.replace(/[.!?]+$/, '');

  // Check if they share a subject (starts with same pronoun)
  const firstStart = first.split(/\s+/)[0]?.toLowerCase();
  const secondStart = second.split(/\s+/)[0]?.toLowerCase();

  if (firstStart === secondStart && ['he', 'she', 'they', 'it'].includes(firstStart)) {
    // Remove the pronoun from second and combine with connector
    const secondWithoutPronoun = second.replace(/^(He|She|They|It)\s+/i, '');
    const connector = pickRandom(['and', 'while', 'before', 'as']);

    return `${cleanFirst}, ${connector} ${secondWithoutPronoun.charAt(0).toLowerCase()}${secondWithoutPronoun.slice(1)}`;
  }

  // Try simple semicolon combination
  const lowerSecond = second.charAt(0).toLowerCase() + second.slice(1);
  return `${cleanFirst}; ${lowerSecond}`;
}

/**
 * Split text into sentences.
 */
function splitSentences(text: string): string[] {
  const raw = text.split(/(?<=[.!?])\s+/);
  return raw.filter(s => s.trim().length > 0);
}

/**
 * Count words in text.
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Pick random element from array.
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Calculate burstiness score for text.
 */
export function calculateBurstiness(text: string): number {
  const sentences = splitSentences(text);
  const lengths = sentences.map(s => countWords(s));

  if (lengths.length < 3) return 0;

  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  return mean > 0 ? stdDev / mean : 0;
}

export { DEFAULT_CONFIG as BURSTINESS_DEFAULTS };
// Note: BurstinessConfig and BurstinessResult are exported at their definitions
export type { BurstinessChange };
