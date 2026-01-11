/**
 * Format Configuration System
 *
 * Each format (Books, Screenplays, Comics) has completely different rules.
 * This file defines format-specific:
 * - Beat sizes and structure
 * - Validation thresholds
 * - Post-processing rules
 * - Context window settings
 */

export type BookFormat =
  | 'novel'
  | 'fiction'
  | 'non-fiction'
  | 'screenplay'
  | 'comic'
  | 'picture_book'
  | 'children';

export interface BeatSizeConfig {
  min: number;          // Minimum words per beat
  max: number;          // Maximum words per beat
  target: number;       // Ideal words per beat
}

export interface ValidationConfig {
  sentenceVariance: {
    min: number;        // Minimum stdDev for Gary Provost rhythm
    enabled: boolean;
  };
  nameDensity: {
    max: number;        // Maximum names per 100 words
    enabled: boolean;
  };
  staccatoThreshold: number;   // Max percentage of same-length sentences
  loopSimilarity: {
    max: number;        // Max Jaccard similarity before flagging loop
    enabled: boolean;
  };
}

export interface PostProcessingConfig {
  nameFrequency: {
    enabled: boolean;
    targetWordsPerMention: number;   // How many words between name uses
    usePronouns: boolean;
    useEpithets: boolean;            // "the detective", "the older woman"
  };
  sentenceVariety: {
    enabled: boolean;
    maxConsecutiveSameStarter: number;
    maxPronounStartPercent: number;
  };
  burstiness: {
    enabled: boolean;
    minScore: number;                // Minimum burstiness score
    targetShortRatio: number;        // Target % of short sentences (< 8 words)
    targetLongRatio: number;         // Target % of long sentences (> 20 words)
  };
  dialoguePolish: {
    enabled: boolean;
    maxFancyTags: number;            // Max non-"said" dialogue tags
    removeAdverbs: boolean;
  };
}

export interface ContextWindowConfig {
  includeAnchor: boolean;           // Always include Chapter 1 summary
  recentChaptersCount: number;      // Rolling window of recent chapters
  characterFactLock: boolean;       // Inject immutable character facts
  includeBeatSheet: boolean;        // Include overall story structure
}

export interface FormatConfig {
  format: BookFormat;
  beatSize: BeatSizeConfig;
  validation: ValidationConfig;
  postProcessing: PostProcessingConfig;
  contextWindow: ContextWindowConfig;
  formatSpecific: Record<string, unknown>;
}

// =============================================================================
// BOOK CONFIGURATION (Novels, Fiction, Non-Fiction)
// =============================================================================

const BOOK_CONFIG: FormatConfig = {
  format: 'novel',
  beatSize: {
    min: 300,
    max: 500,
    target: 400,
  },
  validation: {
    sentenceVariance: {
      min: 4.2,           // Gary Provost rhythm - AI typically hits 1.5-3.0
      enabled: true,
    },
    nameDensity: {
      max: 2.5,           // Per 100 words - AI typically hits 4-5
      enabled: true,
    },
    staccatoThreshold: 0.6,  // Max 60% same-length sentences
    loopSimilarity: {
      max: 0.4,           // 40% keyword overlap = loop
      enabled: true,
    },
  },
  postProcessing: {
    nameFrequency: {
      enabled: true,
      targetWordsPerMention: 120,   // 1 name per 120 words
      usePronouns: true,
      useEpithets: true,
    },
    sentenceVariety: {
      enabled: true,
      maxConsecutiveSameStarter: 2,
      maxPronounStartPercent: 0.20,
    },
    burstiness: {
      enabled: true,
      minScore: 0.4,
      targetShortRatio: 0.18,       // 18% under 8 words
      targetLongRatio: 0.15,        // 15% over 20 words
    },
    dialoguePolish: {
      enabled: true,
      maxFancyTags: 2,              // Max 2 non-"said" per page
      removeAdverbs: true,
    },
  },
  contextWindow: {
    includeAnchor: true,            // Always include Chapter 1
    recentChaptersCount: 3,         // Last 3 chapters in context
    characterFactLock: true,
    includeBeatSheet: false,
  },
  formatSpecific: {
    allowSceneBreaks: true,
    maxDialogueRunLength: 4,        // Max exchanges before action beat
  },
};

// =============================================================================
// NON-FICTION CONFIGURATION
// =============================================================================

const NON_FICTION_CONFIG: FormatConfig = {
  ...BOOK_CONFIG,
  format: 'non-fiction',
  validation: {
    ...BOOK_CONFIG.validation,
    sentenceVariance: {
      min: 3.5,           // Slightly lower for formal writing
      enabled: true,
    },
  },
  postProcessing: {
    ...BOOK_CONFIG.postProcessing,
    burstiness: {
      enabled: true,
      minScore: 0.3,                // Less burstiness for formal tone
      targetShortRatio: 0.12,
      targetLongRatio: 0.20,        // More long sentences OK
    },
    dialoguePolish: {
      enabled: false,               // No dialogue in most non-fiction
      maxFancyTags: 0,
      removeAdverbs: false,
    },
  },
  formatSpecific: {
    allowTransitions: true,         // "Furthermore", "However", etc.
    allowLists: true,
    allowHeadings: true,
  },
};

// =============================================================================
// SCREENPLAY CONFIGURATION
// =============================================================================

const SCREENPLAY_CONFIG: FormatConfig = {
  format: 'screenplay',
  beatSize: {
    min: 200,
    max: 400,
    target: 300,            // 1-2 pages per beat
  },
  validation: {
    sentenceVariance: {
      min: 3.0,             // Action lines should be punchy, less variance OK
      enabled: true,
    },
    nameDensity: {
      max: 3.5,             // More names OK in scripts (CHARACTER: dialogue)
      enabled: true,
    },
    staccatoThreshold: 0.7, // Action lines SHOULD be short and punchy
    loopSimilarity: {
      max: 0.35,            // Tighter loop detection for scripts
      enabled: true,
    },
  },
  postProcessing: {
    nameFrequency: {
      enabled: true,
      targetWordsPerMention: 80,    // More frequent in action lines
      usePronouns: true,
      useEpithets: true,
    },
    sentenceVariety: {
      enabled: false,               // Scripts have different rules
      maxConsecutiveSameStarter: 3,
      maxPronounStartPercent: 0.30,
    },
    burstiness: {
      enabled: false,               // Not applicable to scripts
      minScore: 0,
      targetShortRatio: 0,
      targetLongRatio: 0,
    },
    dialoguePolish: {
      enabled: false,               // Script dialogue is formatted differently
      maxFancyTags: 0,
      removeAdverbs: false,
    },
  },
  contextWindow: {
    includeAnchor: true,            // Opening image/sequence
    recentChaptersCount: 2,         // Last 2 sequences
    characterFactLock: true,
    includeBeatSheet: true,         // Story structure is critical
  },
  formatSpecific: {
    // Script-specific validation
    actionLineMaxSentences: 3,      // Action blocks should be short
    dialogueMaxLines: 4,            // No monologues
    parentheticalLimit: 2,          // Max 2 per page
    forbiddenTerms: [
      'we see',
      'we hear',
      'camera',
      'pan to',
      'close on',
      'wide shot',
      'angle on',
      'cut to',
    ],
    requireSluglines: true,
    sluglineFormat: /^(INT\.|EXT\.|INT\.\/EXT\.)\s+.+\s+-\s+(DAY|NIGHT|CONTINUOUS|LATER|MORNING|EVENING|DUSK|DAWN)$/,
  },
};

// =============================================================================
// COMIC CONFIGURATION
// =============================================================================

const COMIC_CONFIG: FormatConfig = {
  format: 'comic',
  beatSize: {
    min: 80,
    max: 200,
    target: 150,            // Per page (very short)
  },
  validation: {
    sentenceVariance: {
      min: 2.5,             // Less text overall, variance less critical
      enabled: false,       // Disabled for comics
    },
    nameDensity: {
      max: 4.0,             // Names appear visually, less text needed
      enabled: true,
    },
    staccatoThreshold: 0.8, // Short punchy text is GOOD in comics
    loopSimilarity: {
      max: 0.25,            // Very tight - visual variety matters
      enabled: true,
    },
  },
  postProcessing: {
    nameFrequency: {
      enabled: true,
      targetWordsPerMention: 50,    // More frequent (less text overall)
      usePronouns: false,           // Visual identification instead
      useEpithets: true,            // "the woman in red" works well
    },
    sentenceVariety: {
      enabled: false,               // Not applicable
      maxConsecutiveSameStarter: 4,
      maxPronounStartPercent: 0.40,
    },
    burstiness: {
      enabled: false,               // Not applicable
      minScore: 0,
      targetShortRatio: 0,
      targetLongRatio: 0,
    },
    dialoguePolish: {
      enabled: false,               // Comic dialogue is formatted differently
      maxFancyTags: 0,
      removeAdverbs: false,
    },
  },
  contextWindow: {
    includeAnchor: false,           // Comics are more episodic
    recentChaptersCount: 1,         // Just the last page
    characterFactLock: true,
    includeBeatSheet: false,
  },
  formatSpecific: {
    // Comic-specific validation
    minPanelsPerPage: 3,
    maxPanelsPerPage: 7,
    maxWordsPerBubble: 25,
    maxBubblesPerPanel: 2,
    maxWordsPerPanelDescription: 40,
    requirePageHook: true,          // Each page ends with anticipation
    forbiddenNarrative: [
      'he thought',
      'she thought',
      'internally',
      'in his mind',
      'in her mind',
    ],
  },
};

// =============================================================================
// PICTURE BOOK CONFIGURATION
// =============================================================================

const PICTURE_BOOK_CONFIG: FormatConfig = {
  format: 'picture_book',
  beatSize: {
    min: 20,
    max: 80,
    target: 50,             // Very short per page
  },
  validation: {
    sentenceVariance: {
      min: 2.0,
      enabled: false,       // Rhythm comes from reading aloud
    },
    nameDensity: {
      max: 5.0,             // Names help young readers
      enabled: false,
    },
    staccatoThreshold: 0.9, // Short sentences are GOOD
    loopSimilarity: {
      max: 0.3,             // Some repetition is OK (pattern books)
      enabled: true,
    },
  },
  postProcessing: {
    nameFrequency: {
      enabled: false,               // Keep names for clarity
      targetWordsPerMention: 30,
      usePronouns: false,
      useEpithets: false,
    },
    sentenceVariety: {
      enabled: false,
      maxConsecutiveSameStarter: 5, // Pattern books use repetition
      maxPronounStartPercent: 0.50,
    },
    burstiness: {
      enabled: false,
      minScore: 0,
      targetShortRatio: 0,
      targetLongRatio: 0,
    },
    dialoguePolish: {
      enabled: false,
      maxFancyTags: 0,
      removeAdverbs: false,
    },
  },
  contextWindow: {
    includeAnchor: false,
    recentChaptersCount: 1,
    characterFactLock: true,
    includeBeatSheet: false,
  },
  formatSpecific: {
    maxWordsPerPage: 75,
    targetReadingAge: '3-7',
    allowRhyming: true,
    allowRepetition: true,
    maxVocabularyLevel: 'simple',
  },
};

// =============================================================================
// CHILDREN'S BOOK CONFIGURATION (Middle Grade)
// =============================================================================

const CHILDREN_CONFIG: FormatConfig = {
  ...BOOK_CONFIG,
  format: 'children',
  beatSize: {
    min: 200,
    max: 350,
    target: 275,
  },
  validation: {
    ...BOOK_CONFIG.validation,
    sentenceVariance: {
      min: 3.5,             // Slightly simpler structure
      enabled: true,
    },
    nameDensity: {
      max: 3.0,             // More names OK for younger readers
      enabled: true,
    },
  },
  postProcessing: {
    ...BOOK_CONFIG.postProcessing,
    nameFrequency: {
      enabled: true,
      targetWordsPerMention: 80,    // More frequent for clarity
      usePronouns: true,
      useEpithets: false,           // Simpler for young readers
    },
  },
  formatSpecific: {
    maxSentenceLength: 20,
    avoidComplexVocabulary: true,
    targetReadingAge: '8-12',
  },
};

// =============================================================================
// FORMAT DETECTION AND RETRIEVAL
// =============================================================================

const FORMAT_CONFIGS: Record<BookFormat, FormatConfig> = {
  novel: BOOK_CONFIG,
  fiction: BOOK_CONFIG,
  'non-fiction': NON_FICTION_CONFIG,
  screenplay: SCREENPLAY_CONFIG,
  comic: COMIC_CONFIG,
  picture_book: PICTURE_BOOK_CONFIG,
  children: CHILDREN_CONFIG,
};

/**
 * Get the configuration for a specific format.
 */
export function getFormatConfig(format: BookFormat | string): FormatConfig {
  // Normalize format string
  const normalizedFormat = format.toLowerCase().replace(/[-\s]/g, '_') as BookFormat;

  // Check for direct match
  if (FORMAT_CONFIGS[normalizedFormat]) {
    return { ...FORMAT_CONFIGS[normalizedFormat] };
  }

  // Map common variations
  const formatMap: Record<string, BookFormat> = {
    book: 'novel',
    fiction_book: 'fiction',
    nonfiction: 'non-fiction',
    non_fiction: 'non-fiction', // normalized from "non-fiction" (hyphen → underscore)
    script: 'screenplay',
    movie_script: 'screenplay',
    tv_script: 'screenplay',
    comics: 'comic',
    graphic_novel: 'comic',
    illustrated: 'comic',
    kids: 'children',
    middle_grade: 'children',
    ya: 'novel',
    young_adult: 'novel',
    picture: 'picture_book',
    childrens: 'children',
  };

  const mappedFormat = formatMap[normalizedFormat];
  if (mappedFormat && FORMAT_CONFIGS[mappedFormat]) {
    return { ...FORMAT_CONFIGS[mappedFormat] };
  }

  // Default to novel
  console.warn(`Unknown format "${format}", defaulting to novel`);
  return { ...BOOK_CONFIG };
}

/**
 * Detect format from book type string.
 */
export function detectFormat(bookType: string): BookFormat {
  const lower = bookType.toLowerCase();

  if (lower.includes('screenplay') || lower.includes('script')) {
    return 'screenplay';
  }
  if (lower.includes('comic') || lower.includes('graphic')) {
    return 'comic';
  }
  if (lower.includes('picture') && lower.includes('book')) {
    return 'picture_book';
  }
  if (lower.includes('children') || lower.includes('middle grade')) {
    return 'children';
  }
  if (lower.includes('non-fiction') || lower.includes('nonfiction')) {
    return 'non-fiction';
  }

  return 'novel';
}

/**
 * Get validation thresholds adjusted for a specific format.
 */
export function getValidationThresholds(format: BookFormat): {
  minSentenceVariance: number;
  maxNameDensity: number;
  maxStaccatoRatio: number;
  maxLoopSimilarity: number;
} {
  const config = getFormatConfig(format);

  return {
    minSentenceVariance: config.validation.sentenceVariance.min,
    maxNameDensity: config.validation.nameDensity.max,
    maxStaccatoRatio: config.validation.staccatoThreshold,
    maxLoopSimilarity: config.validation.loopSimilarity.max,
  };
}

/**
 * Check if a specific validation is enabled for a format.
 */
export function isValidationEnabled(
  format: BookFormat,
  validationType: 'sentenceVariance' | 'nameDensity' | 'loopSimilarity'
): boolean {
  const config = getFormatConfig(format);

  switch (validationType) {
    case 'sentenceVariance':
      return config.validation.sentenceVariance.enabled;
    case 'nameDensity':
      return config.validation.nameDensity.enabled;
    case 'loopSimilarity':
      return config.validation.loopSimilarity.enabled;
    default:
      return true;
  }
}

// Export configs for testing
export {
  BOOK_CONFIG,
  NON_FICTION_CONFIG,
  SCREENPLAY_CONFIG,
  COMIC_CONFIG,
  PICTURE_BOOK_CONFIG,
  CHILDREN_CONFIG,
};
