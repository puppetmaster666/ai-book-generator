/**
 * Genre-Specific Narrative Types
 *
 * Comprehensive type definitions for tracking genre-specific elements:
 * - Romance arcs and chemistry
 * - Mystery clues and suspects
 * - Comedy jokes and sarcasm
 * - Drama confrontations and secrets
 * - Crime investigations
 * - Dialogue sophistication
 */

// ============================================================================
// ROMANCE TYPES
// ============================================================================

export type RomanceStage =
  | 'strangers'           // Haven't met yet
  | 'first_encounter'     // Meet-cute or first meeting
  | 'awareness'           // Mutual attraction noticed
  | 'resistance'          // One or both resisting attraction
  | 'growing_tension'     // Unresolved sexual/romantic tension
  | 'near_miss'           // Almost-kiss, interrupted moment
  | 'first_intimacy'      // First kiss or intimate moment
  | 'complications'       // External or internal obstacles
  | 'black_moment'        // All seems lost
  | 'grand_gesture'       // Declaration or big romantic moment
  | 'resolution'          // HEA (Happily Ever After) or HFN (Happy For Now)
  | 'established';        // Ongoing relationship

export interface RomanceChemistry {
  pairName: string;        // "Elena & Marcus"
  character1: string;
  character2: string;
  chemistryLevel: number;  // 1-10
  tensionType: 'sexual' | 'emotional' | 'intellectual' | 'mixed';
  dynamicType: 'equals' | 'mentor_student' | 'rivals' | 'forbidden' | 'slow_burn' | 'enemies_to_lovers';
}

export interface RomanceBeat {
  chapter: number;
  type: 'glance' | 'touch' | 'conversation' | 'argument' | 'confession' | 'kiss' | 'intimacy' | 'separation' | 'reunion';
  characters: string[];
  intensity: 1 | 2 | 3 | 4 | 5;  // How emotionally charged
  isEscalation: boolean;        // Does this advance the romance?
  description: string;
}

export interface RomanceObstacle {
  type: 'external' | 'internal' | 'misunderstanding' | 'rival' | 'circumstance' | 'secret';
  description: string;
  blocksCharacter: string;
  introducedChapter: number;
  resolvedChapter?: number;
  severity: 'minor' | 'significant' | 'major';
}

export interface RomanceArc {
  id: string;
  couple: RomanceChemistry;
  currentStage: RomanceStage;
  stageHistory: { stage: RomanceStage; chapter: number }[];
  beats: RomanceBeat[];
  obstacles: RomanceObstacle[];
  heatLevel: number;           // 1-5, how explicit/steamy
  isPrimary: boolean;          // Main romance or subplot
  intimacyMilestones: {
    firstTouch: number | null;
    firstKiss: number | null;
    loveDeclaration: number | null;
    physicalIntimacy: number | null;
  };
}

export interface RomanceTrackingState {
  arcs: RomanceArc[];
  unpairedCharacters: string[];
  romanticMoments: RomanceBeat[];
  chemistryScore: Record<string, number>;  // "char1_char2" -> score
}

// ============================================================================
// MYSTERY TYPES
// ============================================================================

export type ClueType =
  | 'physical'        // Physical evidence
  | 'testimony'       // Witness statement
  | 'behavioral'      // Suspicious behavior
  | 'documentary'     // Written/recorded evidence
  | 'forensic'        // Scientific evidence
  | 'circumstantial'  // Indirect evidence
  | 'psychological';  // Character-based insight

export interface MysteryClue {
  id: string;
  description: string;
  clueType: ClueType;
  introducedChapter: number;
  foundBy: string;           // Character who discovered it
  pointsTo: string[];        // Who it implicates (can be red herring)
  isRedHerring: boolean;
  wasNoticed: boolean;       // Did the narrative emphasize it?
  significance: 'minor' | 'moderate' | 'major' | 'crucial';
  connectionToOtherClues: string[];
}

export interface Suspect {
  name: string;
  motive: string | null;
  opportunity: string | null;
  means: string | null;      // Murder weapon, method, etc.
  alibi: string | null;
  alibiStrength: 'none' | 'weak' | 'moderate' | 'strong' | 'airtight';
  suspicionLevel: number;    // 0-10
  cluesPointingTo: string[];
  cluesExonerating: string[];
  isGuilty: boolean | null;  // Only set when revealed
  introducedChapter: number;
}

export interface MysteryReveal {
  chapter: number;
  type: 'clue_discovery' | 'connection_made' | 'suspect_eliminated' | 'suspect_added' | 'twist' | 'solution';
  description: string;
  changesInvestigation: boolean;
  surpriseFactor: 1 | 2 | 3 | 4 | 5;
}

export interface InvestigationThread {
  id: string;
  description: string;
  status: 'active' | 'cold' | 'solved' | 'abandoned';
  relatedClues: string[];
  leadingTo: string;         // What this thread is uncovering
  investigator: string;
}

export interface MysteryTrackingState {
  centralMystery: string;                    // Main question (who killed X?)
  clues: MysteryClue[];
  suspects: Suspect[];
  reveals: MysteryReveal[];
  investigationThreads: InvestigationThread[];
  redHerringCount: number;
  solutionRevealed: boolean;
  fairPlayScore: number;                     // How fairly clues were presented
  tensionLevel: number;                      // Current suspense level (1-10)
  tickingClock?: {
    deadline: string;
    chaptersRemaining: number;
  };
}

// ============================================================================
// COMEDY TYPES
// ============================================================================

export type HumorType =
  | 'witty_dialogue'      // Clever wordplay in conversation
  | 'situational'         // Funny situations
  | 'physical'            // Slapstick or physical comedy
  | 'ironic'              // Dramatic irony played for laughs
  | 'absurdist'           // Absurd or surreal humor
  | 'dark'                // Dark/gallows humor
  | 'self_deprecating'    // Character makes fun of themselves
  | 'sarcasm'             // Sarcastic remarks
  | 'deadpan'             // Delivered with no emotion
  | 'callback'            // Reference to earlier joke
  | 'running_gag'         // Repeated joke
  | 'character_trait';    // Humor from character quirks

export interface JokeBeat {
  id: string;
  chapter: number;
  type: HumorType;
  setup: string;          // The setup line/situation
  punchline: string;      // The payoff
  deliveredBy: string;    // Character who delivers it
  targetOf?: string;      // Who's the butt of the joke (if any)
  effectiveness: 'flat' | 'mild' | 'good' | 'great' | 'killer';
  isCallback: boolean;    // References earlier joke
  callsBackTo?: string;   // ID of original joke
}

export interface RunningGag {
  id: string;
  description: string;
  firstAppearance: number;
  occurrences: { chapter: number; variation: string }[];
  peakChapter?: number;   // When it was funniest
  isExhausted: boolean;   // Has it worn out its welcome?
  escalates: boolean;     // Does it get bigger each time?
}

export interface SarcasmInstance {
  chapter: number;
  speaker: string;
  statement: string;
  actualMeaning: string;  // What they really mean
  target?: string;        // Who it's aimed at
  subtlety: 'obvious' | 'moderate' | 'subtle';
  isAffectionate: boolean; // Friendly ribbing vs hostile
}

export interface CharacterComedyProfile {
  name: string;
  comedyStyle: HumorType[];
  catchPhrases: string[];
  frequentTargets: string[];  // Who they joke about
  selfAwareness: 'oblivious' | 'partial' | 'self_aware';
  deliveryStyle: 'deadpan' | 'animated' | 'sardonic' | 'earnest';
  isComedyRelief: boolean;
}

export interface ComedyTrackingState {
  jokes: JokeBeat[];
  runningGags: RunningGag[];
  sarcasmInstances: SarcasmInstance[];
  characterProfiles: CharacterComedyProfile[];
  overallTone: 'light' | 'dark' | 'mixed';
  comedyDensity: number;      // Jokes per 1000 words
  callbackOpportunities: {
    joke: string;
    suggestedCallback: string;
    idealChapter: number;
  }[];
}

// ============================================================================
// DRAMA TYPES
// ============================================================================

export type DramaticMomentType =
  | 'confrontation'       // Two characters face off
  | 'revelation'          // Secret is revealed
  | 'betrayal'            // Trust is broken
  | 'sacrifice'           // Character gives something up
  | 'death'               // Character dies
  | 'near_death'          // Character almost dies
  | 'affair_discovery'    // Infidelity revealed
  | 'power_shift'         // Control/authority changes
  | 'ultimatum'           // Character forces a choice
  | 'breakdown'           // Emotional collapse
  | 'reconciliation'      // Relationship healed
  | 'separation';         // Characters part ways

export interface Confrontation {
  id: string;
  chapter: number;
  participants: string[];
  subject: string;         // What they're confronting about
  instigator: string;
  winner?: string;         // Who "won" the confrontation
  escalationLevel: 1 | 2 | 3 | 4 | 5;
  turnsViolent: boolean;
  unresolved: boolean;     // Still simmering?
  consequences: string[];
}

export interface Secret {
  id: string;
  description: string;
  heldBy: string[];        // Who knows the secret
  hiddenFrom: string[];    // Who doesn't know
  stakes: string;          // What happens if revealed
  introducedChapter: number;
  revealedChapter?: number;
  revealedTo?: string[];
  discoveryMethod?: 'confession' | 'caught' | 'investigation' | 'accident' | 'third_party';
  severity: 'embarrassing' | 'damaging' | 'devastating' | 'life_altering';
}

export interface Affair {
  id: string;
  participants: string[];
  betrayedParty: string;
  startChapter: number;
  discoveryChapter?: number;
  status: 'ongoing' | 'ended' | 'discovered' | 'confessed';
  emotionalNature: 'physical_only' | 'emotional_only' | 'both';
  consequences: string[];
}

export interface CharacterDeath {
  character: string;
  chapter: number;
  type: 'natural' | 'accident' | 'murder' | 'suicide' | 'sacrifice' | 'violence';
  isOnPage: boolean;       // Shown or reported
  witnessedBy: string[];
  emotionalImpact: 'minor' | 'significant' | 'devastating';
  wasExpected: boolean;
  finalWords?: string;
  unfinishedBusiness: string[];
}

export interface PowerDynamic {
  characters: string[];
  type: 'hierarchical' | 'financial' | 'emotional' | 'physical' | 'social';
  dominantParty: string;
  submissiveParty: string;
  isHealthy: boolean;
  shifts: { chapter: number; description: string }[];
}

export interface DramaTrackingState {
  confrontations: Confrontation[];
  secrets: Secret[];
  affairs: Affair[];
  deaths: CharacterDeath[];
  powerDynamics: PowerDynamic[];
  dramaticMoments: {
    chapter: number;
    type: DramaticMomentType;
    description: string;
    impact: number;  // 1-10
  }[];
  tensionPoints: string[];  // Unresolved tensions
  upcomingPayoffs: { setup: string; idealChapter: number }[];
}

// ============================================================================
// CRIME TYPES
// ============================================================================

export interface Evidence {
  id: string;
  type: 'physical' | 'digital' | 'testimonial' | 'documentary' | 'forensic';
  description: string;
  foundAt: string;          // Location
  foundBy: string;          // Character
  chapter: number;
  chainOfCustody: string[]; // Who handled it
  isAdmissible: boolean;
  supports: string;         // What it proves
  contradicts?: string;     // What it disproves
}

export interface Witness {
  name: string;
  credibility: 'unreliable' | 'questionable' | 'credible' | 'highly_credible';
  statement: string;
  inconsistencies: string[];
  interviewChapter: number;
  relationshipToCase: string;
  motiveToLie?: string;
}

export interface Investigation {
  id: string;
  type: 'murder' | 'theft' | 'fraud' | 'assault' | 'kidnapping' | 'missing_person' | 'other';
  leadInvestigator: string;
  status: 'active' | 'cold' | 'solved' | 'closed_unsolved';
  evidence: Evidence[];
  witnesses: Witness[];
  suspects: string[];
  timeline: { event: string; chapter: number }[];
}

export interface CrimeTrackingState {
  investigations: Investigation[];
  activeLeads: string[];
  deadEnds: string[];
  proceduralAccuracy: 'realistic' | 'dramatized' | 'fantasy';
}

// ============================================================================
// DIALOGUE TYPES
// ============================================================================

export interface DialogueExchange {
  chapter: number;
  participants: string[];
  hasSubtext: boolean;
  subtextMeaning?: string;     // What's really being said
  tensionLevel: number;        // 1-10
  topicSurface: string;        // What they're discussing
  topicReal?: string;          // What they're really discussing
}

export interface CharacterVoice {
  character: string;
  vocabularyLevel: 'simple' | 'moderate' | 'sophisticated' | 'technical';
  sentencePatterns: string[];  // Short, long, questions, etc.
  catchPhrases: string[];
  speechQuirks: string[];      // Accent, filler words, etc.
  formality: 'casual' | 'moderate' | 'formal';
  emotionalExpressiveness: 'reserved' | 'moderate' | 'expressive';
}

export interface SubtextMoment {
  chapter: number;
  speaker: string;
  saidText: string;
  meantText: string;
  listener: string;
  understoodByListener: boolean;
  understoodByReader: boolean;
  type: 'threat' | 'flirtation' | 'deception' | 'warning' | 'emotional' | 'political';
}

export interface DialoguePattern {
  type: 'interrogation' | 'argument' | 'seduction' | 'negotiation' | 'confession' | 'small_talk' | 'exposition';
  frequency: number;
  effectiveness: 'weak' | 'moderate' | 'strong';
  examples: string[];
}

export interface DialogueTrackingState {
  exchanges: DialogueExchange[];
  characterVoices: CharacterVoice[];
  subtextMoments: SubtextMoment[];
  patterns: DialoguePattern[];
  dialogueQuality: {
    subtextRatio: number;      // % with subtext
    voiceConsistency: number;  // How distinct voices are
    expositionBalance: number; // Show vs tell balance
  };
}

// ============================================================================
// COMBINED GENRE STATE
// ============================================================================

export type GenreType =
  | 'romance'
  | 'mystery'
  | 'thriller'
  | 'noir'
  | 'comedy'
  | 'drama'
  | 'police_procedural'
  | 'legal_thriller'
  | 'medical_drama'
  | 'literary_fiction';

export interface GenreState {
  activeGenres: GenreType[];
  romance?: RomanceTrackingState;
  mystery?: MysteryTrackingState;
  comedy?: ComedyTrackingState;
  drama?: DramaTrackingState;
  crime?: CrimeTrackingState;
  dialogue?: DialogueTrackingState;
}

// ============================================================================
// GENRE EXTRACTION (for chapter processing)
// ============================================================================

export interface GenreExtraction {
  romance?: {
    romanticMoments: RomanceBeat[];
    chemistryObservations: { pair: string; observation: string }[];
    stageProgression?: { from: RomanceStage; to: RomanceStage };
  };
  mystery?: {
    cluesFound: Omit<MysteryClue, 'id'>[];
    suspectChanges: { suspect: string; change: 'added' | 'eliminated' | 'implicated' }[];
    revelations: Omit<MysteryReveal, 'chapter'>[];
  };
  comedy?: {
    jokes: Omit<JokeBeat, 'id' | 'chapter'>[];
    sarcasmInstances: Omit<SarcasmInstance, 'chapter'>[];
    runningGagOccurrences: string[];
  };
  drama?: {
    confrontations: Omit<Confrontation, 'id' | 'chapter'>[];
    secretsRevealed: string[];
    secretsIntroduced: Omit<Secret, 'id' | 'introducedChapter'>[];
    dramaticMoments: DramaticMomentType[];
  };
  dialogue?: {
    subtextMoments: Omit<SubtextMoment, 'chapter'>[];
    voiceObservations: { character: string; observation: string }[];
  };
}

// ============================================================================
// GENRE INSIGHTS (for discovery reports)
// ============================================================================

export interface GenreInsights {
  romance?: {
    activeArcs: { couple: string; stage: RomanceStage }[];
    nextRomanticBeat: string;
    tensionOpportunities: string[];
  };
  mystery?: {
    unresolvedClues: number;
    activeSuspects: string[];
    recommendedReveal: string;
    fairPlayWarnings: string[];
  };
  comedy?: {
    callbackOpportunities: string[];
    overusedGags: string[];
    humorBalance: string;
  };
  drama?: {
    unresolvedTensions: string[];
    upcomingConfrontations: string[];
    secretsTicking: string[];  // Secrets close to revelation
  };
}
