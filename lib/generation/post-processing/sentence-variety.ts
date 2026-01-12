/**
 * Sentence Variety Enforcer
 *
 * Detects and fixes repetitive sentence starters and structures:
 * - Consecutive same-word starters (max 2 allowed)
 * - Excessive pronoun starts (max 20%)
 * - Repetitive sentence patterns
 *
 * Fix strategies:
 * - Merge short sentences with dependent clauses
 * - Use prepositional phrase openers
 * - Invert to object-first structures
 */

export interface SentenceVarietyConfig {
  maxConsecutiveSameStarter: number;    // Default: 2
  maxPronounStartPercent: number;       // Default: 0.20 (20%)
  enableMerging: boolean;               // Merge short consecutive sentences
  enableInversion: boolean;             // Invert sentence structures
}

export interface SentenceVarietyResult {
  content: string;
  changes: SentenceChange[];
  metrics: {
    originalPronounStartPercent: number;
    finalPronounStartPercent: number;
    consecutiveFixed: number;
    sentencesMerged: number;
    sentencesInverted: number;
  };
}

interface SentenceChange {
  type: 'merge' | 'invert' | 'rephrase';
  original: string;
  replacement: string;
  reason: string;
}

interface SentenceInfo {
  text: string;
  startWord: string;
  wordCount: number;
  startsWithPronoun: boolean;
  position: number;
}

const DEFAULT_CONFIG: SentenceVarietyConfig = {
  maxConsecutiveSameStarter: 2,
  maxPronounStartPercent: 0.20,
  enableMerging: true,
  enableInversion: true,
};

// Subject pronouns that indicate repetitive starts
const SUBJECT_PRONOUNS = new Set(['he', 'she', 'it', 'they', 'we', 'i', 'you']);

// Connecting words for merging
const CONNECTORS = {
  contrast: ['but', 'yet', 'although', 'though', 'however', 'while'],
  cause: ['because', 'since', 'as', 'for'],
  addition: ['and', 'moreover', 'furthermore', 'also'],
  sequence: ['then', 'afterwards', 'later', 'meanwhile'],
  condition: ['if', 'unless', 'when', 'whenever'],
};

// Prepositional phrase starters for variety
const PREPOSITIONAL_STARTERS = [
  'With',
  'In',
  'At',
  'Through',
  'Behind',
  'Before',
  'After',
  'During',
  'Without',
  'Despite',
  'Beyond',
  'Against',
  'Among',
  'Across',
  'Outside',
  'Inside',
  'Near',
  'Above',
  'Below',
  'Between',
];

/**
 * Enforce sentence variety by fixing repetitive starters.
 */
export function enforceSentenceVariety(
  text: string,
  config: Partial<SentenceVarietyConfig> = {}
): SentenceVarietyResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const changes: SentenceChange[] = [];

  // Split into paragraphs to preserve structure
  const paragraphs = text.split(/\n\n+/);
  const processedParagraphs: string[] = [];

  let totalSentences = 0;
  let originalPronounStarts = 0;
  let consecutiveFixed = 0;
  let sentencesMerged = 0;
  let sentencesInverted = 0;

  for (const para of paragraphs) {
    // Skip very short paragraphs (likely scene breaks)
    if (para.trim().length < 20) {
      processedParagraphs.push(para);
      continue;
    }

    // Skip dialogue-heavy paragraphs
    const quoteCount = (para.match(/"/g) || []).length;
    if (quoteCount > 4) {
      processedParagraphs.push(para);
      continue;
    }

    const sentences = splitIntoSentences(para);
    totalSentences += sentences.length;

    // Analyze sentences
    const analyzed = sentences.map((s, i) => analyzeSentence(s, i));
    originalPronounStarts += analyzed.filter(s => s.startsWithPronoun).length;

    // Fix consecutive same starters
    const fixedConsecutive = fixConsecutiveStarters(analyzed, cfg.maxConsecutiveSameStarter);
    consecutiveFixed += fixedConsecutive.fixCount;
    changes.push(...fixedConsecutive.changes);

    // Fix excessive pronoun starts (if still too high)
    const pronounPercent = fixedConsecutive.sentences.filter(s => s.startsWithPronoun).length / fixedConsecutive.sentences.length;

    if (pronounPercent > cfg.maxPronounStartPercent && cfg.enableInversion) {
      const fixedPronouns = reducePronounStarts(
        fixedConsecutive.sentences,
        cfg.maxPronounStartPercent
      );
      sentencesInverted += fixedPronouns.inverted;
      changes.push(...fixedPronouns.changes);
      processedParagraphs.push(fixedPronouns.sentences.map(s => s.text).join(' '));
    } else {
      processedParagraphs.push(fixedConsecutive.sentences.map(s => s.text).join(' '));
    }
  }

  const result = processedParagraphs.join('\n\n');
  const finalAnalysis = analyzePronounStarts(result);

  return {
    content: result,
    changes,
    metrics: {
      originalPronounStartPercent: totalSentences > 0 ? originalPronounStarts / totalSentences : 0,
      finalPronounStartPercent: finalAnalysis.percent,
      consecutiveFixed,
      sentencesMerged,
      sentencesInverted,
    },
  };
}

/**
 * Split text into sentences while preserving dialogue.
 */
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    current += char;

    if (char === '"') {
      inQuote = !inQuote;
    }

    // End of sentence (outside quotes)
    if (!inQuote && (char === '.' || char === '!' || char === '?')) {
      // Check if it's actually end of sentence (not Mr. Dr. etc.)
      const trimmed = current.trim();
      const lastWord = trimmed.split(/\s+/).pop() || '';

      if (!isAbbreviation(lastWord)) {
        sentences.push(current.trim());
        current = '';
      }
    }
  }

  // Add remaining text
  if (current.trim()) {
    sentences.push(current.trim());
  }

  return sentences;
}

/**
 * Check if a word ending in period is an abbreviation.
 */
function isAbbreviation(word: string): boolean {
  const abbrevs = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Jr.', 'Sr.', 'vs.', 'etc.', 'i.e.', 'e.g.', 'St.', 'Lt.', 'Sgt.', 'Capt.', 'Gen.', 'Col.', 'Rev.', 'Hon.'];
  return abbrevs.some(a => word.toLowerCase() === a.toLowerCase());
}

/**
 * Analyze a sentence for metrics.
 */
function analyzeSentence(text: string, position: number): SentenceInfo {
  const words = text.trim().split(/\s+/);
  const firstWord = words[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';

  return {
    text,
    startWord: firstWord,
    wordCount: words.length,
    startsWithPronoun: SUBJECT_PRONOUNS.has(firstWord),
    position,
  };
}

/**
 * Fix consecutive same-word starters.
 */
function fixConsecutiveStarters(
  sentences: SentenceInfo[],
  maxConsecutive: number
): {
  sentences: SentenceInfo[];
  fixCount: number;
  changes: SentenceChange[];
} {
  const result = [...sentences];
  const changes: SentenceChange[] = [];
  let fixCount = 0;

  let i = 0;
  while (i < result.length) {
    // Find consecutive sentences with same starter
    let consecutiveCount = 1;
    const startWord = result[i].startWord;

    while (i + consecutiveCount < result.length &&
           result[i + consecutiveCount].startWord === startWord) {
      consecutiveCount++;
    }

    // If we have more than allowed consecutive, fix them
    if (consecutiveCount > maxConsecutive) {
      // Fix sentences after the first `maxConsecutive`
      for (let j = maxConsecutive; j < consecutiveCount; j++) {
        const sentenceIdx = i + j;
        const original = result[sentenceIdx].text;
        const fixed = rewriteSentenceStart(result[sentenceIdx], result[sentenceIdx - 1]);

        if (fixed !== original) {
          result[sentenceIdx] = analyzeSentence(fixed, sentenceIdx);
          changes.push({
            type: 'rephrase',
            original,
            replacement: fixed,
            reason: `${consecutiveCount} consecutive sentences starting with "${startWord}"`,
          });
          fixCount++;
        }
      }
    }

    i += consecutiveCount;
  }

  return { sentences: result, fixCount, changes };
}

/**
 * Rewrite a sentence to start with a different word.
 */
function rewriteSentenceStart(sentence: SentenceInfo, previousSentence: SentenceInfo): string {
  const text = sentence.text;

  // Strategy 1: For "Subject Verb Object" sentences, try prepositional start
  if (sentence.startsWithPronoun) {
    const rewritten = tryPrependPrepositionalPhrase(text);
    if (rewritten) return rewritten;
  }

  // Strategy 2: For short sentences, try combining with previous
  if (sentence.wordCount < 8 && previousSentence.wordCount < 8) {
    const combined = tryCombineSentences(previousSentence.text, text);
    if (combined) return combined;
  }

  // Strategy 3: Try inverting with dependent clause
  const inverted = tryInvertWithClause(text);
  if (inverted) return inverted;

  // Fallback: return original
  return text;
}

/**
 * Try to prepend a prepositional phrase.
 */
function tryPrependPrepositionalPhrase(sentence: string): string | null {
  // Match pattern: "He/She [verb] [rest]"
  const match = sentence.match(/^(He|She|They|It|We|I)\s+(\w+(?:ed|ing|s)?)\s+(.+)/i);
  if (!match) return null;

  const [, pronoun, verb, rest] = match;

  // For some verbs, we can create prepositional starters
  const verbLower = verb.toLowerCase();

  // Movement verbs
  if (['walked', 'ran', 'moved', 'stepped', 'went', 'came'].includes(verbLower)) {
    const prep = PREPOSITIONAL_STARTERS[Math.floor(Math.random() * 5)]; // First 5 are best for movement
    return `${prep} a ${getRandomEnvironment()}, ${pronoun.toLowerCase()} ${verb} ${rest}`;
  }

  // Action verbs
  if (['looked', 'stared', 'gazed', 'watched', 'saw'].includes(verbLower)) {
    return `${pronoun}'s eyes ${verb.replace(/ed$/, 'ed')} ${rest}`;
  }

  // Feeling verbs - convert to external action
  if (['felt', 'knew', 'thought', 'realized', 'understood'].includes(verbLower)) {
    // These are often "telling" not "showing" - keep original
    return null;
  }

  return null;
}

/**
 * Try to combine two short sentences.
 */
function tryCombineSentences(first: string, second: string): string | null {
  // Remove trailing punctuation from first
  const cleanFirst = first.replace(/[.!?]+$/, '');

  // Determine relationship and choose connector
  const secondLower = second.toLowerCase();

  // If second starts with "but" or similar, it's already connected
  if (/^(but|yet|however|although)/i.test(second)) {
    return null;
  }

  // Simple comma conjunction
  if (second.startsWith('He') || second.startsWith('She')) {
    const connector = CONNECTORS.addition[Math.floor(Math.random() * CONNECTORS.addition.length)];
    const lowerSecond = second.charAt(0).toLowerCase() + second.slice(1);
    return `${cleanFirst}, ${connector} ${lowerSecond}`;
  }

  return null;
}

/**
 * Try to invert sentence with dependent clause.
 */
function tryInvertWithClause(sentence: string): string | null {
  // Match: "He [verb] [object] [remainder]"
  const match = sentence.match(/^(He|She|They|It)\s+(\w+)\s+(the|a|an|his|her|their)\s+(\w+)(.*)$/i);
  if (!match) return null;

  const [, pronoun, verb, article, object, remainder] = match;

  // Create object-first version
  // "He grabbed the keys" -> "The keys jangled as he grabbed them"
  // This is complex and might not always work, so be conservative

  return null; // Conservative: don't rewrite if not confident
}

/**
 * Reduce pronoun starts to target percentage.
 */
function reducePronounStarts(
  sentences: SentenceInfo[],
  targetPercent: number
): {
  sentences: SentenceInfo[];
  inverted: number;
  changes: SentenceChange[];
} {
  const result = [...sentences];
  const changes: SentenceChange[] = [];
  let inverted = 0;

  const pronounStarts = result.filter(s => s.startsWithPronoun);
  const currentPercent = pronounStarts.length / result.length;

  if (currentPercent <= targetPercent) {
    return { sentences: result, inverted: 0, changes: [] };
  }

  // Calculate how many we need to fix
  const targetCount = Math.floor(result.length * targetPercent);
  const toFix = pronounStarts.length - targetCount;

  // Fix every Nth pronoun-starting sentence
  const fixInterval = Math.ceil(pronounStarts.length / toFix);
  let fixedCount = 0;

  for (let i = 0; i < result.length && fixedCount < toFix; i++) {
    if (result[i].startsWithPronoun) {
      if (fixedCount % fixInterval === 0) {
        const original = result[i].text;
        const fixed = addVarietyOpener(result[i]);

        if (fixed !== original) {
          result[i] = analyzeSentence(fixed, i);
          changes.push({
            type: 'invert',
            original,
            replacement: fixed,
            reason: 'Reduce pronoun-start percentage',
          });
          inverted++;
        }
      }
      fixedCount++;
    }
  }

  return { sentences: result, inverted, changes };
}

/**
 * Add variety opener to sentence.
 * IMPORTANT: Avoid AI clichés like "With a sigh," "After a moment," etc.
 * These are immediate AI tells and make text worse, not better.
 * Instead, use neutral transitions or restructure the sentence.
 */
function addVarietyOpener(sentence: SentenceInfo): string {
  const text = sentence.text;

  // GOOD openers that don't scream AI
  // These are neutral, human-sounding transitions
  const openers = [
    'Then,',           // Simple, neutral
    'Still,',          // Continuation
    'Now,',            // Immediacy
    'Yet,',            // Contrast
    'Soon,',           // Time progression
    'There,',          // Location shift
    'Here,',           // Location anchor
    'Again,',          // Repetition
    'Once,',           // Past reference
    'So,',             // Causation (informal)
  ];

  // Pick based on position for consistency
  const opener = openers[sentence.position % openers.length];

  // Lowercase the original start
  const lowerText = text.charAt(0).toLowerCase() + text.slice(1);

  return `${opener} ${lowerText}`;
}

/**
 * Get a random environment word for prepositional phrases.
 */
function getRandomEnvironment(): string {
  const environments = [
    'moment', 'breath', 'heartbeat', 'pause', 'silence',
    'movement', 'gesture', 'glance', 'look', 'step',
  ];
  return environments[Math.floor(Math.random() * environments.length)];
}

/**
 * Analyze pronoun starts in final text.
 */
function analyzePronounStarts(text: string): { count: number; total: number; percent: number } {
  const sentences = splitIntoSentences(text);
  const pronounStarts = sentences.filter(s => {
    const firstWord = s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';
    return SUBJECT_PRONOUNS.has(firstWord);
  }).length;

  return {
    count: pronounStarts,
    total: sentences.length,
    percent: sentences.length > 0 ? pronounStarts / sentences.length : 0,
  };
}

export { DEFAULT_CONFIG as SENTENCE_VARIETY_DEFAULTS };
// Note: SentenceVarietyConfig and SentenceVarietyResult are exported at their definitions
export type { SentenceChange };
