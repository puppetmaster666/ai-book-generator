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
 * Causal Bridge - Forces THEREFORE/BUT logic instead of AND THEN
 * This is the key to preventing sequence loops and story drift
 */
export interface CausalBridge {
  triggerEvent: string;           // "Elias discovered the letter"
  therefore: string;              // "He must confront Sarah"
  but: string;                    // "She's already left for the airport"
  nextSequenceMustAddress: string; // "The airport confrontation"
}

/**
 * Anchor Context - Permanent reference to Sequence 1
 * Prevents theme amnesia and character drift
 */
export interface AnchorContext {
  openingImage: string;           // Visual from Seq 1
  themeStated: string;            // Theme dialogue from Seq 1
  setupSummary: string;           // 200-word Seq 1 summary
  protagonistStartState: string;  // Where protagonist began emotionally
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
  causalBridge?: CausalBridge; // NEW: Forces THEREFORE/BUT logic for next sequence
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

  // NEW: Permanent anchor - never removed from context (prevents theme amnesia)
  anchorContext?: AnchorContext;

  // NEW: Track tic usage across entire screenplay (enforced limits)
  ticCredits: Record<string, number>; // { 'glasses': 1, 'sigh': 2, etc. }

  // NEW: Track object prop usage across entire screenplay (global limits)
  objectCredits: Record<string, number>; // { 'watch_check': 2, 'gun_mention': 5, etc. }

  // NEW: Track exit cliché usage across entire screenplay
  exitCredits: Record<string, number>; // { 'rain_exit': 1, 'door_close': 2, etc. }

  // NEW Phase 2: Track last word position of each prop for cooldown enforcement
  propLastPosition: Record<string, number>; // { 'watch': 1500, 'gun': 3200, etc. }

  // NEW Phase 2: Running word count across screenplay for cooldown calculation
  totalWordCount: number;
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
 * Sequence mapping to beats (Save the Cat structure) - DEFAULT 8 sequences
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
 * Format-specific beat distribution configurations
 * Maps number of sequences to how beats should be distributed
 */
export const FORMAT_BEAT_DISTRIBUTIONS: Record<number, { beats: string[]; actRatio: number[] }[]> = {
  // 3 sequences - TV Comedy (30 pages, ~10 pages each)
  3: [
    { beats: ['openingImage', 'themeStated', 'setup', 'catalyst'], actRatio: [1] },
    { beats: ['debate', 'breakIntoTwo', 'bStory', 'funAndGames', 'midpoint', 'badGuysCloseIn'], actRatio: [2] },
    { beats: ['allIsLost', 'darkNightOfSoul', 'breakIntoThree', 'finale', 'finalImage'], actRatio: [3] },
  ],
  // 4 sequences - Short Film (40 pages, ~10 pages each)
  4: [
    { beats: ['openingImage', 'themeStated', 'setup', 'catalyst'], actRatio: [1] },
    { beats: ['debate', 'breakIntoTwo', 'bStory', 'funAndGames'], actRatio: [2] },
    { beats: ['midpoint', 'badGuysCloseIn', 'allIsLost', 'darkNightOfSoul'], actRatio: [2] },
    { beats: ['breakIntoThree', 'finale', 'finalImage'], actRatio: [3] },
  ],
  // 5 sequences - TV Drama (50-60 pages, ~10-12 pages each)
  5: [
    { beats: ['openingImage', 'themeStated', 'setup', 'catalyst'], actRatio: [1] },
    { beats: ['debate', 'breakIntoTwo', 'bStory'], actRatio: [1, 2] },
    { beats: ['funAndGames', 'midpoint', 'badGuysCloseIn'], actRatio: [2] },
    { beats: ['allIsLost', 'darkNightOfSoul', 'breakIntoThree'], actRatio: [2, 3] },
    { beats: ['finale', 'finalImage'], actRatio: [3] },
  ],
  // 8 sequences - Feature Film (100 pages, ~12-14 pages each) - DEFAULT
  8: [
    { beats: ['openingImage', 'themeStated', 'setup'], actRatio: [1] },
    { beats: ['catalyst', 'debate', 'breakIntoTwo'], actRatio: [1] },
    { beats: ['bStory', 'funAndGames'], actRatio: [2] },
    { beats: ['funAndGames', 'midpoint'], actRatio: [2] },
    { beats: ['badGuysCloseIn'], actRatio: [2] },
    { beats: ['allIsLost', 'darkNightOfSoul'], actRatio: [2] },
    { beats: ['breakIntoThree', 'finale'], actRatio: [3] },
    { beats: ['finale', 'finalImage'], actRatio: [3] },
  ],
  // 10 sequences - Epic Film (135 pages, ~13-14 pages each)
  10: [
    { beats: ['openingImage', 'themeStated'], actRatio: [1] },
    { beats: ['setup', 'catalyst'], actRatio: [1] },
    { beats: ['debate', 'breakIntoTwo'], actRatio: [1] },
    { beats: ['bStory', 'funAndGames'], actRatio: [2] },
    { beats: ['funAndGames'], actRatio: [2] },
    { beats: ['midpoint', 'badGuysCloseIn'], actRatio: [2] },
    { beats: ['badGuysCloseIn', 'allIsLost'], actRatio: [2] },
    { beats: ['darkNightOfSoul', 'breakIntoThree'], actRatio: [2, 3] },
    { beats: ['finale'], actRatio: [3] },
    { beats: ['finale', 'finalImage'], actRatio: [3] },
  ],
};

/**
 * Generate sequence-to-beats mapping dynamically based on format
 * @param totalSequences - Number of sequences (3, 4, 5, 8, or 10)
 * @param targetPages - Total target page count
 * @returns Dynamic sequence-to-beats mapping
 */
export function generateSequenceToBeats(
  totalSequences: number,
  targetPages: number
): Record<number, { beats: string[]; pageRange: string; act: number; targetWords: number }> {
  const distribution = FORMAT_BEAT_DISTRIBUTIONS[totalSequences];

  if (!distribution) {
    // Fallback to 8-sequence distribution if format not found
    console.warn(`No beat distribution found for ${totalSequences} sequences, falling back to 8`);
    return generateSequenceToBeats(8, targetPages);
  }

  const pagesPerSequence = Math.round(targetPages / totalSequences);
  const wordsPerSequence = pagesPerSequence * 250; // 250 words per screenplay page
  const result: Record<number, { beats: string[]; pageRange: string; act: number; targetWords: number }> = {};

  let currentPage = 1;
  for (let i = 0; i < distribution.length; i++) {
    const seqConfig = distribution[i];
    const seqNum = i + 1;
    const endPage = Math.min(currentPage + pagesPerSequence - 1, targetPages);

    // Determine act (use first value from actRatio for primary act)
    const act = seqConfig.actRatio[0];

    result[seqNum] = {
      beats: seqConfig.beats,
      pageRange: `${currentPage}-${endPage}`,
      act,
      targetWords: wordsPerSequence,
    };

    currentPage = endPage + 1;
  }

  return result;
}

/**
 * Get the appropriate sequence info for a given sequence number and format
 */
export function getSequenceInfo(
  sequenceNumber: number,
  totalSequences: number,
  targetPages: number
): { beats: string[]; pageRange: string; act: number; targetWords: number } | null {
  const mapping = generateSequenceToBeats(totalSequences, targetPages);
  return mapping[sequenceNumber] || null;
}

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
 * Clinical vocabulary - triggers HARD REJECT when found in dialogue
 * These make characters sound like robots, especially "Professor" archetype
 */
export const SCREENPLAY_CLINICAL_VOCABULARY = [
  // Formal constructions (Professor archetype failure mode)
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
  'spatial logistics',
  // Robotic responses
  'affirmative',
  'negative',
  'acknowledged',
  'understood',
  'that is correct',
  // Overly formal speech
  'I am aware',
  'it shall subside',
  'my stock is',
  'ocular',
  'commence',
  'proceed with',
  'indeed so',
];

/**
 * Tic patterns with enforced limits per sequence
 * Post-processing will REMOVE excess occurrences
 */
export const SCREENPLAY_TIC_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  maxPerSequence: number;
}> = [
  { name: 'glasses', pattern: /(clean|wipe|polish|adjust|push|remove)s?\s+(his|her|their)\s*(glasses|spectacles)/gi, maxPerSequence: 1 },
  { name: 'wrist', pattern: /rub(s|bing|bed)?\s+(his|her|their)\s+wrist/gi, maxPerSequence: 1 },
  { name: 'throat', pattern: /clear(s|ing|ed)?\s+(his|her|their)\s+throat/gi, maxPerSequence: 1 },
  { name: 'jaw', pattern: /clench(es|ing|ed)?\s+(his|her|their)\s+jaw/gi, maxPerSequence: 2 },
  { name: 'fist', pattern: /ball(s|ing|ed)?\s+(his|her|their)\s+fist/gi, maxPerSequence: 2 },
  { name: 'sigh', pattern: /\bsigh(s|ed|ing)?\b/gi, maxPerSequence: 2 },
  { name: 'nod', pattern: /\bnod(s|ded|ding)?\b/gi, maxPerSequence: 3 },
  { name: 'shrug', pattern: /\bshrug(s|ged|ging)?\b/gi, maxPerSequence: 2 },
  { name: 'zippo', pattern: /(click|flip|snap)s?\s+(his|her|their)\s*(zippo|lighter)/gi, maxPerSequence: 1 },
  { name: 'lighter', pattern: /(zippo|lighter)\s+(click|flip|snap)s?/gi, maxPerSequence: 1 },
  { name: 'pen_click', pattern: /(click|tap)s?\s+(his|her|their)\s*(pen|pencil)/gi, maxPerSequence: 1 },
  { name: 'finger_drum', pattern: /drum(s|ming|med)?\s+(his|her|their)\s*fingers/gi, maxPerSequence: 1 },
  { name: 'deep_breath', pattern: /take(s)?\s+a\s+deep\s+breath/gi, maxPerSequence: 2 },
  { name: 'eye_contact', pattern: /(break|avoid|hold)s?\s+(eye\s+)?contact/gi, maxPerSequence: 2 },
  { name: 'runs_hand', pattern: /runs?\s+(a\s+)?(his|her|their)\s*hand\s+through/gi, maxPerSequence: 1 },
];

/**
 * On-the-nose dialogue patterns - characters stating feelings directly
 * Triggers HARD REJECT when found (emotion should be shown, not stated)
 */
export const SCREENPLAY_ON_THE_NOSE_PATTERNS: RegExp[] = [
  /I feel (so )?(angry|sad|happy|scared|betrayed|hurt|confused|lost|alone)/gi,
  /I('m| am) (so )?(angry|sad|happy|scared|confused|hurt|betrayed)/gi,
  /You make me feel/gi,
  /I need you to understand/gi,
  /What I('m| am) trying to say is/gi,
  /The truth is,? I/gi,
  /I have to be honest/gi,
  /Can I be honest with you/gi,
  /I('m| am) feeling/gi,
  /My feelings are/gi,
  /I just want you to know (that )?I/gi,
  /You need to know how I feel/gi,
];

/**
 * Object-level tic tracking - Props that get overused across the ENTIRE screenplay
 * Unlike character tics (per-sequence), these are tracked GLOBALLY
 * Max values are for the ENTIRE screenplay, not per sequence
 *
 * IMPORTANT: Patterns must be comprehensive to catch ALL forms including:
 * - Noun forms (the watch, a gun)
 * - Verb forms (watches, watching, watched)
 * - Action phrases (checks watch, grips gun)
 */
export const SCREENPLAY_OBJECT_TICS: Array<{
  name: string;
  pattern: RegExp;
  maxPerScreenplay: number;
}> = [
  // Watch obsession (the "Second Breath" problem - 34 mentions)
  // SINGULAR only - does NOT match "watches" because that's almost always a verb
  // Excludes verb uses like "watch out", "watch over", "watch him"
  // Combined into single pattern with strict limit (aligned with NA-AST scoring)
  { name: 'watch', pattern: /\b(watch|wristwatch)\b(?!\s*(tower|man|woman|dog|out|over|your|my|the\s+movie|him|her|them|it|this|that|me|you|carefully|closely|for|as|while|what))/gi, maxPerScreenplay: 4 },
  // Gun/weapon fixation - combined pattern with strict limit
  { name: 'gun', pattern: /\b(gun(s)?|pistol(s)?|revolver(s)?|weapon(s)?|firearm(s)?)\b/gi, maxPerScreenplay: 6 },
  // Cigarette/smoking - combined pattern
  { name: 'cigarette', pattern: /\b(cigarette(s)?|cig(s)?|lighter(s)?|ash(es)?)\b(?!\s*(alarm|detector))/gi, maxPerScreenplay: 5 },
  // Glasses cleaning tic
  { name: 'glasses', pattern: /(clean|wipe|polish|adjust|push|remove)s?\s+(his|her|their)?\s*(glasses|spectacles)/gi, maxPerScreenplay: 8 },
  // Sighing
  { name: 'sigh', pattern: /\bsigh(s|ed|ing)?\b/gi, maxPerScreenplay: 16 },
  // Nodding
  { name: 'nod', pattern: /\bnod(s|ded|ding)?\b/gi, maxPerScreenplay: 24 },
];

/**
 * Character exit clichés - Repetitive ways characters leave scenes
 * AI tends to use the same 3-4 exit patterns throughout
 */
export const SCREENPLAY_EXIT_CLICHES: Array<{
  name: string;
  pattern: RegExp;
  maxPerScreenplay: number;
}> = [
  // "Walking into the rain/night"
  { name: 'rain_exit', pattern: /\b(walk(s|ed|ing)?|step(s|ped|ping)?|disappear(s|ed|ing)?)\s+(out\s+)?(into|through)\s+(the\s+)?(rain|downpour|storm)/gi, maxPerScreenplay: 1 },
  { name: 'night_exit', pattern: /\b(walk(s|ed|ing)?|disappear(s|ed|ing)?|vanish(es|ed|ing)?)\s+(into|through)\s+(the\s+)?(night|darkness)/gi, maxPerScreenplay: 1 },
  // "Without looking back"
  { name: 'no_look_back', pattern: /\b(without|never)\s+(once\s+)?(look(s|ed|ing)?|glanc(e|es|ed|ing)?)\s+back/gi, maxPerScreenplay: 1 },
  // "Leaves them standing there"
  { name: 'leaves_standing', pattern: /\bleav(e|es|ing)\s+(him|her|them)\s+(just\s+)?standing\s+(there|alone)/gi, maxPerScreenplay: 1 },
  // "Door closes behind"
  { name: 'door_close', pattern: /\b(door|gate)\s+(close(s|d)?|shut(s)?|slam(s|med)?)\s+(softly\s+)?(behind|after)\s+(him|her|them)/gi, maxPerScreenplay: 2 },
  // "Sunset/silhouette" exits
  { name: 'sunset_exit', pattern: /\b(silhouette(d)?|outline(d)?)\s+(against|by)\s+(the\s+)?(setting\s+sun|sunset|horizon|sky)/gi, maxPerScreenplay: 1 },
  // "Fades into distance"
  { name: 'fade_distance', pattern: /\b(fade(s|d)?|disappear(s|ed)?|dwindle(s|d)?)\s+(into\s+)?(the\s+)?distance/gi, maxPerScreenplay: 1 },
];

/**
 * Verbal messiness patterns - Signs of HUMAN dialogue
 * These should APPEAR in the screenplay to pass AI detection
 * Post-processing will flag if NONE of these appear in a sequence
 */
export const SCREENPLAY_VERBAL_MESSINESS: Array<{
  name: string;
  pattern: RegExp;
  description: string;
}> = [
  // Self-interruption (em-dash mid-sentence)
  { name: 'self_interrupt', pattern: /\w+\s*--\s*\w+/g, description: 'Character cuts themselves off mid-thought' },
  // Filler words in dialogue
  { name: 'filler_words', pattern: /\b(um|uh|look,|I mean,|you know,|anyway,|so,|well,|okay so,|right,|like,)\b/gi, description: 'Natural hesitation and filler' },
  // Trailing off (ellipsis)
  { name: 'trail_off', pattern: /\w+\.\.\.\s*$/gm, description: 'Dialogue trails off, unfinished' },
  // Repeated word stammer
  { name: 'stammer', pattern: /\b(\w+)\s+\1\b/gi, description: 'Word repetition showing stress' },
  // Abrupt topic change
  { name: 'topic_change', pattern: /\.\s+(Wait|Actually|Anyway|Never mind|Forget it|Whatever)/gi, description: 'Sudden redirect in conversation' },
  // False start
  { name: 'false_start', pattern: /^(I|He|She|They|We|You)\s*--\s*(I|He|She|They|We|You)/gmi, description: 'Starts sentence, restarts' },
  // Contradicting self
  { name: 'self_contradict', pattern: /\.\s+(No|Actually|Wait),?\s+(that's not|I didn't mean|forget that)/gi, description: 'Character corrects themselves' },
];

/**
 * Prop Cooldown - Spatial-temporal enforcement for prop mentions
 * Not just counting, but ensuring minimum word distance between mentions
 * Prevents clustering like "watch... watch... watch" in 500 words
 */
export interface PropCooldown {
  name: string;
  pattern: RegExp;
  maxGlobal: number;        // Max across entire screenplay
  cooldownWords: number;    // Minimum words between mentions
}

/**
 * Prop cooldown settings with spatial-temporal enforcement
 * These track how far apart prop mentions must be
 *
 * IMPORTANT: Patterns must match the scoring script patterns exactly
 * to ensure enforcement catches what scoring detects
 */
export const SCREENPLAY_PROP_COOLDOWNS: PropCooldown[] = [
  // Watch - SINGULAR only, excludes verb uses
  // Does NOT match "watches" because that's almost always a verb
  // maxGlobal aligned with SCREENPLAY_OBJECT_TICS and NA-AST scoring
  { name: 'watch', pattern: /\b(watch|wristwatch|timepiece)\b(?!\s*(tower|man|woman|dog|out|over|your|my|the\s+movie|him|her|them|it|this|that|me|you|carefully|closely|for|as|while|what))/gi, maxGlobal: 4, cooldownWords: 2000 },
  // Gun and weapon synonyms - aligned with scoring
  { name: 'gun', pattern: /\b(gun(s)?|pistol(s)?|revolver(s)?|weapon(s)?|firearm(s)?)\b/gi, maxGlobal: 6, cooldownWords: 1500 },
  // Cigarette and smoking props - aligned with scoring
  { name: 'cigarette', pattern: /\b(cigarette(s)?|cig(s)?|lighter(s)?|ash(es)?)\b(?!\s*(alarm|detector|screen|signal))/gi, maxGlobal: 5, cooldownWords: 1500 },
  // Phone and mobile devices
  { name: 'phone', pattern: /\b(phone(s)?|cell(s)?|mobile(s)?|smartphone(s)?)\b/gi, maxGlobal: 6, cooldownWords: 1200 },
  // Photo and picture props
  { name: 'photo', pattern: /\b(photo(s)?|photograph(s)?|picture(s)?|snapshot(s)?)\b/gi, maxGlobal: 3, cooldownWords: 2500 },
  // Ring and jewelry
  { name: 'ring', pattern: /\b(ring(s)?|wedding\s+ring|wedding\s+band|engagement\s+ring)\b(?!\s*(tone|finger|around|leader))/gi, maxGlobal: 3, cooldownWords: 2500 },
  // Keys
  { name: 'keys', pattern: /\b(key(s)?|car\s+key(s)?|house\s+key(s)?)\b(?!\s*(to|point|moment|element|factor))/gi, maxGlobal: 4, cooldownWords: 2000 },
  // Glasses/spectacles - aligned with OBJECT_TICS
  { name: 'glasses', pattern: /\b(glasses|spectacles|reading\s+glasses)\b/gi, maxGlobal: 8, cooldownWords: 1800 },
];

/**
 * Banger patterns - Profound/philosophical dialogue that AI overuses
 * Human dialogue is 70% mundane, 30% meaningful
 * Too many "bangers" makes it sound like an AI motivational speech
 */
export const SCREENPLAY_BANGER_PATTERNS: RegExp[] = [
  // Profound statements
  /The (truth|reality|problem) is[,.]?/gi,
  /What (really )?matters (most )?is/gi,
  /In the end,/gi,
  /When you (really )?think about it/gi,
  /Life is (about|like|just)/gi,
  /The thing about .+ is/gi,
  /That's (the|what) life is (really )?about/gi,
  // Philosophical questions
  /What does it (even )?mean to/gi,
  /Who are we (really|truly)/gi,
  /What makes us (truly )?human/gi,
  /Isn't that what .+ is (all )?about/gi,
  // Dramatic declarations
  /Everything (has )?changed/gi,
  /Nothing will ever be the same/gi,
  /This changes everything/gi,
  /There's no going back/gi,
  /We can never go back/gi,
  /Some things you can't (take back|undo)/gi,
  // Movie trailer speak
  /In a world where/gi,
  /When all hope (seems|is) lost/gi,
  /One (man|woman|person) must/gi,
  /The only one who can/gi,
];

/**
 * Mundane dialogue templates - What real humans say 70% of the time
 * AI underuses these logistical, everyday exchanges
 */
export const MUNDANE_DIALOGUE_TEMPLATES: string[] = [
  "You want some coffee?",
  "Did you eat?",
  "Traffic was hell.",
  "I need to pee.",
  "What time is it?",
  "My back is killing me.",
  "Where'd you park?",
  "I forgot my wallet.",
  "Is that decaf?",
  "My phone's dead.",
  "You got a charger?",
  "This chair sucks.",
  "I'm starving.",
  "It's cold in here.",
  "Did you feed the dog?",
  "Hold on, I got a text.",
  "My feet are killing me.",
  "Is there more wine?",
  "I gotta use the bathroom.",
  "What's the wifi password?",
  "My Uber's here.",
  "Can you grab my keys?",
  "I forgot to call my mom.",
  "Did we pay the check?",
  "I can't find my glasses.",
  "Is it raining?",
  "What channel?",
  "Did you lock the door?",
  "I need another drink.",
  "My allergies are acting up.",
];

/**
 * Professor archetype humanization requirements
 * When a character has 'The Professor' archetype, they need these elements
 */
export const PROFESSOR_HUMANIZATION_ELEMENTS = [
  // Mundane hobbies (mentioned at least once)
  'crossword', 'gardening', 'cooking', 'fishing', 'chess', 'baseball', 'poker', 'golf',
  'stamp collecting', 'birdwatching', 'woodworking', 'hiking', 'old movies', 'jazz', 'vinyl',
  // Physical imperfections (mentioned at least once)
  'bad knee', 'reading glasses', 'coffee stain', 'worn shoes', 'loose button', 'messy desk',
  'chipped mug', 'old sweater', 'wrinkled shirt', 'scuffed briefcase',
  // Contradictory traits (at least one moment of "armor cracking")
  'actually laughs', 'admits he doesn\'t know', 'forgets the word', 'mispronounces',
  'spills', 'drops', 'stumbles over', 'loses train of thought', 'blushes',
];

/**
 * Scene Constraint - "What You Can't Say"
 * Forces subtext by banning explicit emotion words from dialogue
 * If a scene is about fear, characters CANNOT say "scared" or "afraid"
 */
export interface SceneConstraint {
  sceneDescription: string;  // Brief scene description
  emotion: string;           // Core emotion of the scene
  bannedWords: string[];     // Words banned from dialogue
  mustConveyThrough: string; // How emotion must be shown instead
}

/**
 * Emotion to Banned Words mapping
 * When a scene is about emotion X, characters cannot SAY words related to X
 * This forces subtext - emotion must be conveyed through action/behavior
 */
export const EMOTION_TO_BANNED_WORDS: Record<string, string[]> = {
  'fear': ['scared', 'afraid', 'terrified', 'frightened', 'fear', 'fearful', 'terrifying', 'frightening', 'scary'],
  'love': ['love', 'adore', 'cherish', 'beloved', 'heart', 'loving', 'adoration', 'devotion', 'loving'],
  'anger': ['angry', 'furious', 'mad', 'rage', 'hate', 'hatred', 'enraged', 'livid', 'wrathful', 'irate'],
  'grief': ['sad', 'grief', 'mourn', 'mourning', 'loss', 'devastated', 'heartbroken', 'sorrow', 'sorrowful'],
  'betrayal': ['betray', 'betrayed', 'betrayal', 'traitor', 'trust', 'lied', 'deceive', 'deceived', 'backstab'],
  'guilt': ['guilty', 'guilt', 'fault', 'blame', 'sorry', 'forgive', 'forgiveness', 'ashamed', 'shame'],
  'jealousy': ['jealous', 'envious', 'envy', 'jealousy', 'covet', 'resentful', 'resentment'],
  'loneliness': ['lonely', 'alone', 'isolated', 'loneliness', 'solitude', 'abandoned', 'forsaken'],
  'hope': ['hope', 'hopeful', 'hopeless', 'optimistic', 'optimism', 'expectation', 'wishing'],
  'despair': ['despair', 'despairing', 'hopeless', 'futile', 'pointless', 'giving up', 'defeated'],
  'pride': ['proud', 'pride', 'prideful', 'arrogant', 'arrogance', 'ego', 'conceited'],
  'shame': ['shame', 'ashamed', 'embarrassed', 'humiliated', 'disgrace', 'disgraced', 'mortified'],
  'anxiety': ['anxious', 'anxiety', 'worried', 'worry', 'nervous', 'nervousness', 'stressed', 'panic'],
  'joy': ['happy', 'happiness', 'joy', 'joyful', 'elated', 'ecstatic', 'thrilled', 'delighted'],
  'confusion': ['confused', 'confusion', 'bewildered', 'perplexed', 'puzzled', 'lost', 'unsure'],
  'regret': ['regret', 'regretful', 'wish I hadn\'t', 'if only', 'mistake', 'wrong choice'],
};

/**
 * Generate scene constraints from beat sheet emotional context
 * @param beat - The story beat (e.g., 'allIsLost', 'midpoint')
 * @param sequenceNumber - Which sequence we're in
 * @returns Scene constraints with banned words
 */
export function generateSceneConstraints(
  beat: string,
  _sequenceNumber?: number
): SceneConstraint[] {
  const constraints: SceneConstraint[] = [];

  // Map beats to primary emotions
  const beatEmotions: Record<string, { emotion: string; description: string }> = {
    'openingImage': { emotion: 'loneliness', description: 'Establishing protagonist\'s initial state' },
    'themeStated': { emotion: 'hope', description: 'Theme introduction' },
    'setup': { emotion: 'anxiety', description: 'World establishment' },
    'catalyst': { emotion: 'fear', description: 'Inciting incident' },
    'debate': { emotion: 'confusion', description: 'Protagonist questions the call' },
    'breakIntoTwo': { emotion: 'hope', description: 'Protagonist commits to journey' },
    'bStory': { emotion: 'love', description: 'B-story relationship begins' },
    'funAndGames': { emotion: 'joy', description: 'Promise of premise' },
    'midpoint': { emotion: 'pride', description: 'False victory or false defeat' },
    'badGuysCloseIn': { emotion: 'fear', description: 'Pressure mounts' },
    'allIsLost': { emotion: 'despair', description: 'Lowest point' },
    'darkNightOfSoul': { emotion: 'grief', description: 'Protagonist processes loss' },
    'breakIntoThree': { emotion: 'hope', description: 'Epiphany moment' },
    'finale': { emotion: 'anger', description: 'Final confrontation' },
    'finalImage': { emotion: 'joy', description: 'Transformation complete' },
  };

  const beatConfig = beatEmotions[beat];
  if (beatConfig) {
    const bannedWords = EMOTION_TO_BANNED_WORDS[beatConfig.emotion] || [];
    constraints.push({
      sceneDescription: beatConfig.description,
      emotion: beatConfig.emotion,
      bannedWords,
      mustConveyThrough: 'ACTION and SUBTEXT - characters cannot name their feelings',
    });
  }

  return constraints;
}

/**
 * Build scene constraints section for sequence generation prompt
 */
export function buildSceneConstraintsSection(beats: string[]): string {
  const allConstraints: SceneConstraint[] = [];

  for (const beat of beats) {
    const constraints = generateSceneConstraints(beat, 1);
    allConstraints.push(...constraints);
  }

  if (allConstraints.length === 0) {
    return '';
  }

  const constraintLines = allConstraints.map(c => {
    return `SCENE: ${c.sceneDescription} (${c.emotion.toUpperCase()})
  BANNED FROM DIALOGUE: ${c.bannedWords.join(', ')}
  SHOW THROUGH: ${c.mustConveyThrough}`;
  }).join('\n\n');

  return `
=== SCENE CONSTRAINTS: WHAT YOU CAN'T SAY ===
For each scene, certain emotion words are BANNED from dialogue.
The audience must FEEL the emotion through behavior, not hear it stated.

${constraintLines}

EXAMPLE:
If scene emotion is FEAR, characters CANNOT say:
✗ "I'm scared" / "I'm afraid" / "This is terrifying"
✓ [Character backs against wall] / "We need to go. Now." / [hands shake]

Violating these constraints will trigger regeneration.
`;
}

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
    // anchorContext is undefined until Sequence 1 completes
    ticCredits: {}, // Track tic usage across screenplay
    objectCredits: {}, // Track object prop usage globally
    exitCredits: {}, // Track exit cliché usage globally
    propLastPosition: {}, // Track last word position of each prop for cooldown
    totalWordCount: 0, // Running word count for cooldown calculation
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
