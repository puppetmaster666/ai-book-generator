// Screenplay Types and Utilities
// Industry-standard screenplay format with Save the Cat beat sheet structure

/**
 * Dialogue archetype - determines how a character uses language as a weapon
 * - The Evader: Deflects with humor, changes subject, never gives straight answers
 * - The Steamroller: Bulldozes conversations, interrupts, dominates through volume
 * - The Professor: Over-explains, lectures, uses precision to maintain control
 * - The Reactor: Speaks in short bursts, responds emotionally, often monosyllabic
 */
export type DialogueArchetype = 'The Evader' | 'The Steamroller' | 'The Professor' | 'The Reactor';

/**
 * Character profile with voice traits for consistency
 * Now includes psychological depth for subtext-driven dialogue
 */
export interface CharacterProfile {
  name: string;
  age?: number; // Exact age (not range) for consistency
  physicalDescription?: string; // Locked description for consistency
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  want: string; // External goal - what they're trying to achieve
  need: string; // Internal arc - what they need to learn/become
  flaw: string; // Character flaw that creates conflict
  internalConflict: string; // NEW: The secret they're hiding - drives subtext
  dialogueArchetype: DialogueArchetype; // NEW: Their verbal strategy in conversations
  backstory: string; // Brief relevant history
  voiceTraits: {
    vocabulary: string; // e.g., "blue-collar, direct, occasional profanity"
    rhythm: string; // e.g., "short sentences, interrupts others"
    tics: string; // e.g., "says 'look' to start sentences, clears throat when lying"
  };
}

/**
 * Subplot structure
 */
export interface Subplot {
  name: string; // e.g., "B-Story: Romance", "C-Story: Mentorship"
  characters: string[]; // Character names involved
  arc: string; // Brief description of the subplot arc
  intersectionPoints: number[]; // Which sequences (1-8) it appears in
}

/**
 * Save the Cat Beat Sheet - 15 beats across 3 acts
 * Page numbers are for a ~100 page screenplay
 */
export interface BeatSheet {
  logline: string; // One sentence pitch (under 30 words)
  theme: string; // The thematic statement/question

  beats: {
    // ACT ONE (Pages 1-25)
    openingImage: string; // Page 1 - Visual that sets tone, shows "before"
    themeStated: string; // Page 5 - Someone states theme (protagonist doesn't get it yet)
    setup: string; // Pages 1-10 - Establish world, stakes, character status quo
    catalyst: string; // Page 12 - The inciting incident that changes everything
    debate: string; // Pages 12-25 - Protagonist resists/questions the call to action
    breakIntoTwo: string; // Page 25 - Active choice to enter the "new world"

    // ACT TWO (Pages 25-85)
    bStory: string; // Page 30 - Introduction of B-story (often love interest/mentor)
    funAndGames: string; // Pages 30-55 - "Promise of the premise" - what audience came to see
    midpoint: string; // Page 55 - False victory or false defeat, raises stakes
    badGuysCloseIn: string; // Pages 55-75 - Things get harder, allies doubt, enemies regroup
    allIsLost: string; // Page 75 - The lowest point, often a "death" (literal or metaphorical)
    darkNightOfSoul: string; // Pages 75-85 - Protagonist processes loss, finds inner strength

    // ACT THREE (Pages 85-110)
    breakIntoThree: string; // Page 85 - A-story and B-story combine, protagonist has epiphany
    finale: string; // Pages 85-110 - Protagonist applies lesson, confronts antagonist, wins/loses
    finalImage: string; // Page 110 - Visual mirror of opening image, shows transformation
  };

  subplots: Subplot[];
}

/**
 * Sequence summary for context continuity
 * Each sequence is ~12-15 pages
 */
export interface SequenceSummary {
  sequenceNumber: number; // 1-8
  pageRange: string; // e.g., "1-12", "13-25"
  actNumber: number; // 1, 2, or 3
  beatsCovered: string[]; // Which beats from the beat sheet
  summary: string; // 200-word summary of what happened
  closedLoops?: string[]; // SPECIFIC events that are DONE and cannot be repeated
  characterStates: Record<string, string>; // Where each character is emotionally/physically
  characterExits?: Array<{ // How characters left scenes
    character: string;
    howExited: string; // "drove away in red truck"
    lastSeenLocation: string;
  }>;
  plantedSetups: string[]; // Chekhov's guns planted in this sequence
  resolvedPayoffs: string[]; // Setups from earlier sequences paid off here
}

/**
 * Running context for screenplay generation
 * Updated after each sequence to maintain continuity
 */
export interface ScreenplayContext {
  currentSequence: number; // Which sequence we're generating next (1-8)
  totalPagesGenerated: number; // Approximate page count so far
  targetPages: number; // Target total pages (90-120)

  // Character tracking
  characterStates: Record<string, string>; // Current state of each character
  characterLocations: Record<string, string>; // Where each character currently is

  // World state
  establishedLocations: string[]; // Locations already described in detail
  timeOfDay: string; // Current time in story
  storyDay: number; // Which day in the story (for multi-day stories)

  // Setup/payoff tracking
  plantedSetups: string[]; // Things that need payoff later
  resolvedPayoffs: string[]; // Things already paid off

  // Previous sequence summaries
  sequenceSummaries: SequenceSummary[];

  // The last 200-word summary for context window
  lastSequenceSummary: string;
}

/**
 * Screenplay element types for formatting
 */
export type ScreenplayElement =
  | 'slugline' // INT. LOCATION - DAY
  | 'action' // Scene description
  | 'character' // Character name before dialogue
  | 'parenthetical' // (beat), (O.S.), etc.
  | 'dialogue' // Character's spoken words
  | 'transition'; // CUT TO:, FADE OUT.

/**
 * Parsed screenplay element for PDF formatting
 */
export interface ParsedElement {
  type: ScreenplayElement;
  content: string;
  characterName?: string; // For dialogue elements
}

/**
 * Sequence mapping to beats (Save the Cat structure)
 */
export const SEQUENCE_TO_BEATS: Record<number, { beats: string[]; pageRange: string; act: number }> = {
  1: { beats: ['openingImage', 'themeStated', 'setup'], pageRange: '1-12', act: 1 },
  2: { beats: ['catalyst', 'debate', 'breakIntoTwo'], pageRange: '13-25', act: 1 },
  3: { beats: ['bStory', 'funAndGames'], pageRange: '26-40', act: 2 },
  4: { beats: ['funAndGames', 'midpoint'], pageRange: '41-55', act: 2 },
  5: { beats: ['badGuysCloseIn'], pageRange: '56-70', act: 2 },
  6: { beats: ['allIsLost', 'darkNightOfSoul'], pageRange: '71-85', act: 2 },
  7: { beats: ['breakIntoThree', 'finale'], pageRange: '86-100', act: 3 },
  8: { beats: ['finale', 'finalImage'], pageRange: '101-110', act: 3 },
};

/**
 * Banned AI-sounding phrases for dialogue
 */
export const SCREENPLAY_BANNED_PHRASES = [
  'I need you to understand',
  "Here's the thing",
  'Let me be clear',
  'With all due respect',
  'To be honest with you',
  'I have to say',
  'Look, I get it, but',
  'The thing is',
  'I mean, think about it',
  'You have to understand',
  'At the end of the day',
  'It is what it is',
];

/**
 * Banned mathematical/mechanical metaphors (AI detection risk)
 */
export const SCREENPLAY_BANNED_METAPHORS = [
  'with (perfect |mathematical |precise )?geometry',
  'like a (well-oiled |precision )?machine',
  'clockwork precision',
  'calculated (grace|movement|precision)',
  'algorithmic',
  'binary (choice|decision)',
  'systematic(ally)?',
  'geometric (precision|perfection)',
  'mathematically (precise|perfect)',
  'with surgical precision',
  'like an equation',
  'variables in (the|an) equation',
];

/**
 * Banned training-set clichés (AI detection risk)
 */
export const SCREENPLAY_BANNED_CLICHES = [
  'skin like (cured |old )?leather',
  'eyes (that )?tell(ing)? (a |the )?(thousand |million )?(stories|tales)',
  'weight of the world',
  'heart (of gold|skipped a beat)',
  'time stood still',
  'pregnant pause',
  'deafening silence',
  'steely (gaze|determination)',
  'piercing (eyes|stare|gaze)',
  'golden (light|sun|rays|glow)', // The "golden ending" tell
  'bathed in (golden |warm )?light',
  'sun turn(ed|ing|s) .* (to |into )?gold',
  'hung heavy in the air',
  'thick with tension',
  'could cut the tension with a knife',
  'exchanged a look',
  'shared a knowing (glance|look)',
];

/**
 * Science-speak in emotional moments (breaks authenticity)
 */
export const SCREENPLAY_SCIENCE_IN_EMOTION = [
  "I'm not a variable",
  'the equation',
  'calculate the odds',
  'probability suggests',
  'statistically speaking',
  'data indicates',
  'the evidence shows',
  'logically speaking',
  'hypothesis',
  'correlation between',
];

/**
 * Banned AI-sounding action line starts
 */
export const SCREENPLAY_BANNED_ACTION_STARTS = [
  'We see',
  'We hear',
  'We watch',
  'We follow',
  'We pan',
  'We zoom',
  'We cut to',
  'The camera',
  'Camera pans',
  'Camera zooms',
];

/**
 * Overused parentheticals to limit
 */
export const SCREENPLAY_LIMITED_PARENTHETICALS = [
  'beat',
  'pause',
  'sighs',
  'nods',
  'smiles',
  'laughs',
  'shrugs',
];

/**
 * Initialize empty screenplay context
 */
export function createInitialContext(targetPages: number = 100): ScreenplayContext {
  return {
    currentSequence: 1,
    totalPagesGenerated: 0,
    targetPages,
    characterStates: {},
    characterLocations: {},
    establishedLocations: [],
    timeOfDay: 'DAY',
    storyDay: 1,
    plantedSetups: [],
    resolvedPayoffs: [],
    sequenceSummaries: [],
    lastSequenceSummary: '',
  };
}

/**
 * Calculate approximate page count from text
 * Industry standard: ~250 words per screenplay page
 */
export function estimatePageCount(text: string): number {
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  return Math.round(wordCount / 250);
}

/**
 * Parse screenplay text into formatted elements
 */
export function parseScreenplayElements(text: string): ParsedElement[] {
  const elements: ParsedElement[] = [];
  const lines = text.split('\n');

  let currentCharacter = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Slugline: INT. or EXT.
    if (/^(INT\.|EXT\.|INT\/EXT\.)/.test(line)) {
      elements.push({ type: 'slugline', content: line });
      continue;
    }

    // Transition: ends with : or is FADE IN/OUT
    if (/^(FADE IN:|FADE OUT\.|FADE TO:|CUT TO:|DISSOLVE TO:|SMASH CUT:|MATCH CUT:)/.test(line) ||
        /^[A-Z\s]+:$/.test(line)) {
      elements.push({ type: 'transition', content: line });
      continue;
    }

    // Character name: ALL CAPS, possibly with (V.O.) or (O.S.)
    if (/^[A-Z][A-Z\s.'()-]+$/.test(line) &&
        !line.startsWith('INT') &&
        !line.startsWith('EXT') &&
        line.length < 50) {
      currentCharacter = line.replace(/\s*\([^)]+\)\s*$/, '').trim();
      elements.push({ type: 'character', content: line, characterName: currentCharacter });
      continue;
    }

    // Parenthetical: starts and ends with parentheses
    if (/^\([^)]+\)$/.test(line)) {
      elements.push({ type: 'parenthetical', content: line, characterName: currentCharacter });
      continue;
    }

    // After character name, next non-parenthetical line is dialogue
    if (currentCharacter && elements.length > 0) {
      const lastElement = elements[elements.length - 1];
      if (lastElement.type === 'character' || lastElement.type === 'parenthetical' || lastElement.type === 'dialogue') {
        if (!line.startsWith('(')) {
          elements.push({ type: 'dialogue', content: line, characterName: currentCharacter });
          continue;
        }
      }
    }

    // Default: action line
    currentCharacter = '';
    elements.push({ type: 'action', content: line });
  }

  return elements;
}

/**
 * Check text for banned AI patterns
 */
export function detectAIPatterns(text: string): { found: boolean; patterns: string[] } {
  const foundPatterns: string[] = [];
  const lowerText = text.toLowerCase();

  // Check dialogue phrases
  for (const phrase of SCREENPLAY_BANNED_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      foundPatterns.push(`Dialogue: "${phrase}"`);
    }
  }

  // Check action line starts
  for (const start of SCREENPLAY_BANNED_ACTION_STARTS) {
    const regex = new RegExp(`(^|\\n)\\s*${start}`, 'i');
    if (regex.test(text)) {
      foundPatterns.push(`Action line: "${start}..."`);
    }
  }

  return {
    found: foundPatterns.length > 0,
    patterns: foundPatterns,
  };
}

/**
 * Detects if a new sequence is rehashing story beats that already happened.
 * Returns a 'confidence score' (0 to 1). If > 0.6, it's likely a loop.
 * Uses Jaccard similarity on keywords + slugline matching.
 */
export function detectSequenceLoop(
  newContent: string,
  previousSummaries: { sequenceNumber: number; summary: string }[]
): { isLoop: boolean; score: number; repeatedBeats: string[] } {
  const repeatedBeats: string[] = [];
  let loopScore = 0;

  // 1. Extract Sluglines (Scene Headings)
  const sluglineRegex = /^(INT\.|EXT\.)\s+[A-Z\s\-]+/gm;
  const currentSluglines = newContent.match(sluglineRegex) || [];

  // 2. Extract Key Nouns/Actions (5+ char words)
  const getKeywords = (text: string) => {
    return new Set(
      text.toLowerCase()
        .replace(/[^a-zA-Z\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 5)
    );
  };

  const currentKeywords = getKeywords(newContent);

  for (const prev of previousSummaries) {
    const prevKeywords = getKeywords(prev.summary);

    // Calculate Jaccard Similarity for keywords
    const intersection = new Set([...currentKeywords].filter(x => prevKeywords.has(x)));
    const similarity = intersection.size / Math.min(currentKeywords.size, prevKeywords.size);

    // 3. Slugline matching against summary descriptions
    const slugOverlap = currentSluglines.filter(slug =>
      prev.summary.toUpperCase().includes(slug.replace(/^(INT\.|EXT\.)\s+/, ''))
    );

    if (similarity > 0.5) {
      loopScore += similarity;
      repeatedBeats.push(`Sequence ${prev.sequenceNumber} keywords detected (${(similarity * 100).toFixed(0)}% overlap)`);
    }

    if (slugOverlap.length > 0 && similarity > 0.4) {
      loopScore += 0.3;
      repeatedBeats.push(`Repeat of locations from Sequence ${prev.sequenceNumber}`);
    }
  }

  return {
    isLoop: loopScore > 0.7,
    score: Math.min(loopScore, 1),
    repeatedBeats
  };
}

/**
 * Flag excessive tics before saving (last line of defense)
 * Returns warnings if tics exceed limit
 */
export function flagExcessiveTics(text: string): {
  text: string;
  warnings: string[];
} {
  const ticPatterns: Record<string, RegExp> = {
    'glasses': /\b(glasses|spectacles)\b/gi,
    'wrists': /\bwrist/gi,
    'drip': /\bdrip(s|ping|ped)?\b/gi,
    'sigh': /\bsigh(s|ed|ing)?\b/gi,
    'nod': /\bnod(s|ded|ding)?\b/gi,
  };

  const warnings: string[] = [];

  for (const [tic, regex] of Object.entries(ticPatterns)) {
    const matches = text.match(regex) || [];
    if (matches.length > 2) {
      warnings.push(`"${tic}" appears ${matches.length}x (max 2)`);
    }
  }

  return { text, warnings };
}

/**
 * Validate sequence doesn't reset story - prevents AI loops
 */
export function validateSequenceContinuity(
  newSequence: string,
  sequenceNumber: number
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for "opening image" patterns in non-first sequences
  if (sequenceNumber > 1) {
    const openingPatterns = [
      /FADE IN:/i,
      /^INT\..+MORNING/m,
      /establishes? the world/i,
      /we (first )?meet/i,
      /introduces? (us to|the protagonist)/i,
    ];

    for (const pattern of openingPatterns) {
      if (pattern.test(newSequence)) {
        issues.push(`Sequence ${sequenceNumber} contains opening pattern: ${pattern.source}`);
      }
    }
  }

  // Check for story reset keywords
  const resetPatterns = [
    /before (all|any of) this/i,
    /it all began/i,
    /where (it|our story) (all )?(begins|started)/i,
  ];

  for (const pattern of resetPatterns) {
    if (pattern.test(newSequence)) {
      issues.push(`Story reset detected: ${pattern.source}`);
    }
  }

  return { valid: issues.length === 0, issues };
}
