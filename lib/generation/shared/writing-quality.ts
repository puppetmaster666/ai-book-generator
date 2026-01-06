// Content rating types
export type ContentRating = 'childrens' | 'general' | 'mature';

// Truncate text to a maximum word count (for originalIdea preservation)
export const MAX_ORIGINAL_IDEA_WORDS = 1000;

/**
 * Clinical/robotic phrases that make NON-FICTION sound AI-generated.
 * These are academic padding phrases that add no value.
 */
export const NONFICTION_CLINICAL_PHRASES: (string | RegExp)[] = [
  // Academic filler
  'it is important to note',
  'it should be noted that',
  'it is worth mentioning',
  'one must consider',
  'one might argue',
  'one could say',
  'it is evident that',
  'it is clear that',
  'it is well known that',
  'it is generally accepted',
  'it is widely believed',
  'it is commonly understood',

  // Vague research claims (without citation = AI tell)
  /studies have shown/i,
  /research indicates/i,
  /research suggests/i,
  /experts agree/i,
  /scientists believe/i,
  /according to experts/i,

  // Redundant transitions
  'in conclusion',
  'in summary',
  'to summarize',
  'as previously mentioned',
  'as mentioned above',
  'as stated earlier',
  'the aforementioned',
  'the above-mentioned',

  // Robotic constructions
  'it shall',
  'it is imperative',
  'highly irregular',
  'sufficient for',
  'I require',
  'it would appear',
  'one might suggest',
  'most certainly',
  'precisely so',
  'in my estimation',

  // Overwrought intros
  /in (today's|the modern|our current) world/i,
  /in (this|the current|our) day and age/i,
  /since the dawn of time/i,
  /throughout human history/i,

  // Lazy chapter endings
  /in the next chapter, (we will|you will|we'll)/i,
  /the following chapter (will|explores)/i,
];

/**
 * Check non-fiction text for clinical/robotic phrases.
 * These phrases make non-fiction sound AI-generated.
 */
export function detectNonfictionClinicalPhrases(text: string): {
  found: boolean;
  patterns: string[];
  severity: 'none' | 'warning' | 'hard_reject';
} {
  const foundPatterns: string[] = [];
  const lowerText = text.toLowerCase();

  for (const phrase of NONFICTION_CLINICAL_PHRASES) {
    if (phrase instanceof RegExp) {
      if (phrase.test(text)) {
        foundPatterns.push(`Pattern: "${phrase.source}"`);
      }
    } else {
      if (lowerText.includes(phrase.toLowerCase())) {
        foundPatterns.push(`Phrase: "${phrase}"`);
      }
    }
  }

  // Determine severity
  let severity: 'none' | 'warning' | 'hard_reject' = 'none';
  if (foundPatterns.length >= 3) {
    severity = 'hard_reject';
  } else if (foundPatterns.length > 0) {
    severity = 'warning';
  }

  return {
    found: foundPatterns.length > 0,
    patterns: foundPatterns,
    severity,
  };
}

/**
 * Banned AI-sounding phrases for fiction writing.
 * These are patterns that scream "AI-generated" and must be rewritten.
 * Includes regex patterns (strings) for flexible matching.
 */
export const FICTION_BANNED_PHRASES: (string | RegExp)[] = [
  // Narrative clichés that AI overuses
  /little did .* know/i,
  /couldn't help but/i,
  /before .* knew it/i,
  /as if on cue/i,
  /in that moment/i,
  /time seemed to/i,
  /it was then that/i,
  /with a sense of/i,
  /something inside .* shifted/i,
  /despite .* best efforts/i,

  // Academic/essay transitions in fiction
  'moreover',
  'furthermore',
  'additionally',
  'subsequently',
  "it's worth noting",
  'interestingly',
  'needless to say',
  'it goes without saying',
  'in conclusion',
  'as mentioned earlier',

  // Overdramatic physical reactions
  'shivers ran down',
  'blood ran cold',
  'heart skipped a beat',
  'breath caught in',
  'stomach dropped',
  'world seemed to stop',
  'knees went weak',
  'pulse quickened',

  // AI dialogue patterns
  'I need you to understand',
  "Here's the thing",
  'Let me be clear',
  'With all due respect',
  'To be honest with you',
  'At the end of the day',
  'The thing is',
  'Look, I get it',

  // Overwrought descriptions
  'a kaleidoscope of',
  'a symphony of',
  'a tapestry of',
  'a whirlwind of',
  'a cascade of',
  'a myriad of',

  // Chapter opening clichés
  /the (morning|evening|night) (sun|moon|air)/i,
  /another day had (passed|begun|dawned)/i,
];

/**
 * Check text for banned AI-sounding phrases.
 * Returns found patterns for reporting and rewriting.
 */
export function detectFictionBannedPhrases(text: string): {
  found: boolean;
  patterns: string[];
} {
  const foundPatterns: string[] = [];
  const lowerText = text.toLowerCase();

  for (const phrase of FICTION_BANNED_PHRASES) {
    if (phrase instanceof RegExp) {
      if (phrase.test(text)) {
        foundPatterns.push(`Pattern: "${phrase.source}"`);
      }
    } else {
      if (lowerText.includes(phrase.toLowerCase())) {
        foundPatterns.push(`Phrase: "${phrase}"`);
      }
    }
  }

  return {
    found: foundPatterns.length > 0,
    patterns: foundPatterns,
  };
}

export function truncateToWordLimit(text: string, maxWords: number = MAX_ORIGINAL_IDEA_WORDS): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Returns genre-specific tone and style instructions to produce human-like writing.
 * Fiction gets visceral, sensory-driven guidance; Non-fiction gets authoritative, evidence-based guidance.
 */
export function getDynamicWritingInstructions(genre: string, bookType: string): string {
  if (bookType === 'non-fiction') {
    return `
=== NON-FICTION TONE & VOICE ===
- VOICE: Authoritative but conversational. Avoid the "academic lecture" tone.
- EVIDENCE: Use specific examples (e.g., "a 2019 Stanford study") over vague "research shows".
- ACCURACY: Never fabricate statistics, studies, or citations. If uncertain, describe the principle without fake sources.
- HOOKS: Rotate through surprising facts, anecdotes, bold claims. NEVER use "Have you ever..." to open.
- NAMES: Case study names must be UNIQUE and culturally diverse. Never reuse Marcus, Sarah, David.
- STRUCTURE: Lead with a concrete example, then the theory. Specific-to-general flow.`;
  }

  return `
=== FICTION TONE & PACING ===
- VOICE: Visceral and sensory-driven. Show emotions through actions ("hands trembled") not labels ("she was terrified").
- PACING: Start "In Media Res" (in the middle of action). Jump directly into the scene.
- NO RECAPS: Do NOT summarize previous chapters in the opening. The reader knows what happened.
- DIALOGUE: Use subtext. Characters rarely say exactly what they mean. Add contractions and fragments.
- RHYTHM: Prioritize DIRECT ACTION (Subject-Verb-Object). Limit participial phrases ("Walking to the door...") to once per page.
- DESCRIPTIONS: Avoid "adjective stacking" (e.g., "the dark, gloomy, ominous shadows"). One modifier is enough.`;
}

/**
 * Returns Chapter 1 anchor + last N chapter summaries to prevent AI from doing recaps
 * while maintaining the original "Opening Image" and core conflicts.
 *
 * The anchor prevents "plot amnesia" where the AI forgets the original setup,
 * while the rolling window keeps prompts lean and focused on immediate continuity.
 */
export function getRollingContext(storySoFar: string, maxPreviousChapters: number = 3): string {
  if (!storySoFar || storySoFar.trim() === '') {
    return 'This is the beginning of the book.';
  }

  // Split by chapter summaries (usually separated by double newlines or "Chapter X:" patterns)
  const summaries = storySoFar.split(/\n\n+/).filter(s => s.trim());

  if (summaries.length === 0) {
    return storySoFar; // Fallback to original if splitting failed
  }

  // Always include the first chapter as anchor (contains the "Opening Image" and original conflicts)
  const anchor = summaries[0];

  // If we only have a few summaries, return them all
  if (summaries.length <= maxPreviousChapters + 1) {
    return storySoFar;
  }

  // Get the most recent N summaries (excluding the anchor if it would be duplicated)
  const recentSummaries = summaries.slice(-maxPreviousChapters);

  // Check if anchor is already included in recent summaries (avoid duplication)
  const anchorInRecent = recentSummaries[0] === anchor;

  if (anchorInRecent) {
    return recentSummaries.join('\n\n');
  }

  return `=== OPENING ANCHOR (Chapter 1 - DO NOT FORGET) ===
${anchor}

=== RECENT EVENTS ===
${recentSummaries.join('\n\n')}`;
}

// Get content guidelines based on content rating
// For mature content: allows swearing, suggestive violence, dark humor
// Uses euphemisms to stay within content policies
export function getContentRatingInstructions(contentRating: ContentRating): string {
  switch (contentRating) {
    case 'childrens':
      return `
CONTENT GUIDELINES (Children's - Age appropriate):
- Keep all content family-friendly and appropriate for ages 4-10
- No violence, scary content, or conflict that could frighten children
- Use simple, positive language
- Focus on friendship, kindness, and gentle lessons`;

    case 'mature':
      return `
CONTENT GUIDELINES (Adult/Mature - 18+):
THIS IS ADULT CONTENT. YOU MUST ACTIVELY MAKE IT EDGY AND MATURE:

MANDATORY - ACTIVELY ADD THESE ELEMENTS:
- ADD swearing and profanity naturally in dialogue ("damn", "shit", "bastard", "hell", "ass", etc.)
- ADD dark humor, sarcasm, cynicism, and irreverent jokes
- ADD edgy, provocative, and controversial dialogue that pushes boundaries
- ADD sexual tension, flirting, and suggestive interactions between characters
- ADD morally gray situations - no clear heroes or villains, just flawed people
- MAKE characters crude, jaded, or cynical when it fits their personality

FOR ROMANCE/ATTRACTION SCENES - BE SUGGESTIVE:
- Show physical attraction openly: lingering looks, touching, kissing
- Build sexual tension: "her fingers traced down his chest", "he pulled her hips against him"
- Imply intimacy: "they fell into bed, clothes scattered across the floor", "she woke tangled in his sheets"
- Characters can be flirtatious, seductive, and physically affectionate

FOR VIOLENCE SCENES - BE VISCERAL BUT EUPHEMISTIC:
- "pulled the trigger and watched him crumple", "blood pooled beneath the body"
- "the blade found its mark, crimson spreading across her shirt"
- "his fist connected with a satisfying crack", "she didn't get back up"

ABSOLUTELY DO NOT:
- Self-censor, soften, or tone down the content
- Add moral lessons, warnings, or lectures
- Make villains cartoonishly evil - make them human
- Skip over tense, uncomfortable, or provocative moments
- Use clinical/sterile language - make it raw and real

This is an ADULT COMIC. The reader WANTS gritty, edgy, provocative content. DELIVER IT.`;

    case 'general':
    default:
      return `
CONTENT GUIDELINES (General Audience):
- Suitable for teen and adult readers
- Mild violence is acceptable (punches, chases, tense confrontations)
- Keep romance tasteful (kissing, embracing, implied intimacy)
- Avoid excessive profanity, but occasional mild swearing is acceptable if it fits the character`;
  }
}

// Detect if text contains non-Latin scripts and return language instruction
export function detectLanguageInstruction(text: string): string {
  // Check for Arabic/Persian/Kurdish script (used for Kurdish Sorani, Arabic, Persian, Urdu)
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text)) {
    return 'IMPORTANT: Write the content in the SAME LANGUAGE as the book title and premise. If the input is in Kurdish (Sorani), Arabic, Persian, or Urdu, write the entire chapter in that language. Match the language and script exactly.';
  }
  // Check for Chinese characters
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return 'IMPORTANT: Write the content in Chinese, matching the language of the book title and premise.';
  }
  // Check for Japanese (Hiragana, Katakana, Kanji)
  if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) {
    return 'IMPORTANT: Write the content in Japanese, matching the language of the book title and premise.';
  }
  // Check for Korean (Hangul)
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) {
    return 'IMPORTANT: Write the content in Korean, matching the language of the book title and premise.';
  }
  // Check for Cyrillic (Russian, Ukrainian, etc.)
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'IMPORTANT: Write the content in the same Cyrillic language as the book title and premise (Russian, Ukrainian, etc.).';
  }
  // Check for Hebrew
  if (/[\u0590-\u05FF]/.test(text)) {
    return 'IMPORTANT: Write the content in Hebrew, matching the language of the book title and premise.';
  }
  // Check for Thai
  if (/[\u0E00-\u0E7F]/.test(text)) {
    return 'IMPORTANT: Write the content in Thai, matching the language of the book title and premise.';
  }
  // Default: no special instruction needed (Latin-based languages)
  return '';
}
