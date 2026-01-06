/**
 * Story DNA Analyzer
 *
 * Analyzes the book premise/synopsis to extract the story's inherent constraints.
 * This determines what KIND of dynamism is appropriate for THIS specific story.
 *
 * Examples:
 * - "Buried" (guy in coffin) → Single location, but phone calls bring characters
 * - Road trip → Many locations required, characters at each stop
 * - Courtroom drama → Limited locations, rotating witness characters
 * - Heist → Multiple locations, ensemble cast, parallel action
 *
 * The idea dictates the dynamism profile, not a one-size-fits-all rule.
 */

import { type BookFormat } from '../atomic/format-config';

// =============================================================================
// STORY DNA TYPES
// =============================================================================

export interface StoryDNA {
  // Location constraints extracted from premise
  locationProfile: {
    type: 'confined' | 'limited' | 'multiple' | 'traveling' | 'epic';
    primarySetting: string;           // "a coffin", "a small town", "across Europe"
    settingConstraints: string[];     // Explicit constraints from premise
    canTravelPhysically: boolean;     // Can protagonist physically move to new places?
    alternateAccess: string[];        // How to access other "locations" if confined
  };

  // Character scope extracted from premise
  characterProfile: {
    scope: 'solo' | 'duo' | 'small_group' | 'ensemble' | 'rotating';
    primaryCharacters: number;        // Main cast size
    canMeetNewPeople: boolean;        // Can new characters physically appear?
    alternateAccess: string[];        // How to bring in characters if confined
  };

  // Time structure
  timeProfile: {
    structure: 'linear' | 'flashbacks' | 'parallel' | 'countdown' | 'nonlinear';
    hasDeadline: boolean;             // Ticking clock element?
    realTimeConstraint: boolean;      // Story happens in hours/day vs weeks/months?
    allowsTimeJumps: boolean;         // Can skip forward/back in time?
  };

  // Genre conventions
  genreProfile: {
    primaryGenre: string;
    requiresEscalation: boolean;      // Stakes must increase?
    requiresTwists: boolean;          // Plot reversals expected?
    conventionalBeats: string[];      // Genre-expected moments
  };

  // What makes THIS story dynamic
  dynamismSources: string[];          // Where does the life come from?
}

// =============================================================================
// PREMISE ANALYSIS PATTERNS
// =============================================================================

// Patterns that indicate confined/single location stories
const CONFINED_PATTERNS = [
  /\b(trapped|stuck|locked|confined|buried|imprisoned|stranded)\b/i,
  /\b(can'?t (leave|escape|get out))\b/i,
  /\b(single (room|location|setting|place))\b/i,
  /\b(entire (story|book|film) (takes place|happens|unfolds) in)\b/i,
  /\b(never (leaves?|exits?))\b/i,
  /\b(one (night|day|hour|room|building))\b/i,
  /\b(bottle (episode|movie|story))\b/i,
  /\b(chamber piece|single setting)\b/i,
];

// Patterns that indicate traveling/journey stories
const TRAVELING_PATTERNS = [
  /\b(road trip|journey|quest|voyage|expedition|travels?)\b/i,
  /\b(across (the country|america|europe|the world))\b/i,
  /\b(from .+ to .+)\b/i,
  /\b(on the (road|run|move))\b/i,
  /\b(fleeing|escaping|chasing|pursuing)\b/i,
  /\b(adventure|odyssey|pilgrimage)\b/i,
  /\b(multiple (cities|countries|locations))\b/i,
];

// Patterns indicating ensemble cast
const ENSEMBLE_PATTERNS = [
  /\b(group of|team of|band of|crew of|family of)\b/i,
  /\b(friends|colleagues|classmates|neighbors)\b/i,
  /\b(ensemble|multiple (protagonists?|POVs?|perspectives?))\b/i,
  /\b(interweaving (stories|lives|fates))\b/i,
  /\b(community|town|village) (of|where)\b/i,
];

// Patterns indicating solo/isolated protagonist
const SOLO_PATTERNS = [
  /\b(alone|isolated|solitary|hermit|loner)\b/i,
  /\b(one (man|woman|person))\b/i,
  /\b(by (himself|herself|themselves))\b/i,
  /\b(survival|castaway|stranded)\b/i,
];

// Patterns indicating time pressure
const DEADLINE_PATTERNS = [
  /\b(24 hours|one (day|night|hour)|countdown|deadline)\b/i,
  /\b(before (it'?s too late|midnight|dawn|the bomb))\b/i,
  /\b(running out of (time|air|options))\b/i,
  /\b(race against (time|the clock))\b/i,
  /\b(ticking clock|time limit|must .+ by)\b/i,
];

// Patterns indicating flashback structure
const FLASHBACK_PATTERNS = [
  /\b(memories|past|flashback|remembers?)\b/i,
  /\b(looking back|years (ago|later))\b/i,
  /\b(dual timeline|parallel (stories|narratives))\b/i,
  /\b(then and now|past and present)\b/i,
  /\b(frame (story|narrative))\b/i,
];

// Genre detection patterns
const GENRE_PATTERNS: Record<string, RegExp[]> = {
  thriller: [
    /\b(thriller|suspense|tension|danger|threat)\b/i,
    /\b(chase|escape|survive|hunt|pursue)\b/i,
    /\b(killer|murderer|assassin|criminal)\b/i,
  ],
  romance: [
    /\b(love|romance|relationship|heart)\b/i,
    /\b(falls? for|attraction|chemistry)\b/i,
    /\b(meet-?cute|lovers?|soulmate)\b/i,
  ],
  mystery: [
    /\b(mystery|detective|investigation|solve)\b/i,
    /\b(clues?|evidence|suspect|whodunit)\b/i,
    /\b(murder|crime|case|body)\b/i,
  ],
  scifi: [
    /\b(sci-?fi|science fiction|space|future)\b/i,
    /\b(technology|AI|robot|alien)\b/i,
    /\b(dystopian|utopian|post-apocalyptic)\b/i,
  ],
  fantasy: [
    /\b(fantasy|magic|wizard|dragon)\b/i,
    /\b(kingdom|quest|chosen one|prophecy)\b/i,
    /\b(mythical|enchanted|supernatural)\b/i,
  ],
  horror: [
    /\b(horror|terror|fear|nightmare)\b/i,
    /\b(haunted|ghost|demon|monster)\b/i,
    /\b(creepy|scary|dread|evil)\b/i,
  ],
  literary: [
    /\b(literary|character study|introspective)\b/i,
    /\b(coming of age|identity|meaning)\b/i,
    /\b(family drama|relationships|personal)\b/i,
  ],
};

// =============================================================================
// DNA EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Analyze a premise/synopsis to extract the story's DNA.
 */
export function analyzeStoryDNA(
  synopsis: string,
  genre?: string,
  format?: BookFormat
): StoryDNA {
  const lowerSynopsis = synopsis.toLowerCase();

  // Analyze location profile
  const locationProfile = analyzeLocationProfile(synopsis);

  // Analyze character profile
  const characterProfile = analyzeCharacterProfile(synopsis);

  // Analyze time profile
  const timeProfile = analyzeTimeProfile(synopsis);

  // Analyze genre profile
  const genreProfile = analyzeGenreProfile(synopsis, genre);

  // Determine dynamism sources based on constraints
  const dynamismSources = determineDynamismSources(
    locationProfile,
    characterProfile,
    timeProfile,
    genreProfile
  );

  return {
    locationProfile,
    characterProfile,
    timeProfile,
    genreProfile,
    dynamismSources,
  };
}

/**
 * Analyze location constraints from premise.
 */
function analyzeLocationProfile(synopsis: string): StoryDNA['locationProfile'] {
  const isConfined = CONFINED_PATTERNS.some(p => p.test(synopsis));
  const isTraveling = TRAVELING_PATTERNS.some(p => p.test(synopsis));

  let type: StoryDNA['locationProfile']['type'];
  let canTravelPhysically = true;
  const alternateAccess: string[] = [];
  const settingConstraints: string[] = [];

  if (isConfined) {
    type = 'confined';
    canTravelPhysically = false;
    alternateAccess.push('phone_calls', 'memories', 'hallucinations', 'radio', 'video');
    settingConstraints.push('Must stay in primary location');
    settingConstraints.push('Bring external world IN, don\'t go OUT');
  } else if (isTraveling) {
    type = 'traveling';
    canTravelPhysically = true;
    alternateAccess.push('physical_travel');
    settingConstraints.push('Must visit new locations');
    settingConstraints.push('Each stop should have distinct character');
  } else {
    // Check for limited vs multiple
    const hasMultipleLocations = /\b(several|multiple|various|different) (places?|locations?|settings?)\b/i.test(synopsis);
    const hasEpicScope = /\b(world|globe|epic|sweeping|vast)\b/i.test(synopsis);

    if (hasEpicScope) {
      type = 'epic';
      settingConstraints.push('World-building is key');
    } else if (hasMultipleLocations) {
      type = 'multiple';
      settingConstraints.push('Variety of settings expected');
    } else {
      type = 'limited';
      settingConstraints.push('Focus on key locations');
    }
    alternateAccess.push('physical_travel', 'phone_calls', 'memories');
  }

  // Extract primary setting if mentioned
  const settingMatch = synopsis.match(/(?:in|at|on|inside|within) (?:a |an |the )?([^,.!?]+)/i);
  const primarySetting = settingMatch ? settingMatch[1].trim() : 'unspecified';

  return {
    type,
    primarySetting,
    settingConstraints,
    canTravelPhysically,
    alternateAccess,
  };
}

/**
 * Analyze character scope from premise.
 */
function analyzeCharacterProfile(synopsis: string): StoryDNA['characterProfile'] {
  const isSolo = SOLO_PATTERNS.some(p => p.test(synopsis));
  const isEnsemble = ENSEMBLE_PATTERNS.some(p => p.test(synopsis));

  let scope: StoryDNA['characterProfile']['scope'];
  let primaryCharacters: number;
  let canMeetNewPeople = true;
  const alternateAccess: string[] = [];

  if (isSolo) {
    scope = 'solo';
    primaryCharacters = 1;
    canMeetNewPeople = false;
    alternateAccess.push('phone_calls', 'memories', 'hallucinations', 'found_media', 'voices');
  } else if (isEnsemble) {
    scope = 'ensemble';
    primaryCharacters = 6; // Estimate
    canMeetNewPeople = true;
    alternateAccess.push('physical_appearance', 'phone_calls', 'memories');
  } else {
    // Check for duo or small group
    const hasDuo = /\b(two (people|friends|lovers|partners)|couple|pair|duo)\b/i.test(synopsis);
    const hasSmallGroup = /\b(three|four|five|small group|handful)\b/i.test(synopsis);

    if (hasDuo) {
      scope = 'duo';
      primaryCharacters = 2;
    } else if (hasSmallGroup) {
      scope = 'small_group';
      primaryCharacters = 4;
    } else {
      // Default to small group for most stories
      scope = 'small_group';
      primaryCharacters = 4;
    }
    alternateAccess.push('physical_appearance', 'phone_calls', 'memories');
  }

  return {
    scope,
    primaryCharacters,
    canMeetNewPeople,
    alternateAccess,
  };
}

/**
 * Analyze time structure from premise.
 */
function analyzeTimeProfile(synopsis: string): StoryDNA['timeProfile'] {
  const hasDeadline = DEADLINE_PATTERNS.some(p => p.test(synopsis));
  const hasFlashbacks = FLASHBACK_PATTERNS.some(p => p.test(synopsis));

  // Check for real-time constraint
  const realTimeConstraint = /\b(real-?time|one (hour|day|night)|24 hours|unfolds in)\b/i.test(synopsis);

  let structure: StoryDNA['timeProfile']['structure'];

  if (hasDeadline && realTimeConstraint) {
    structure = 'countdown';
  } else if (hasFlashbacks) {
    structure = 'flashbacks';
  } else if (/\b(parallel|interweaving|multiple timelines?)\b/i.test(synopsis)) {
    structure = 'parallel';
  } else if (/\b(non-?linear|fragmented|jumps? (around|through time))\b/i.test(synopsis)) {
    structure = 'nonlinear';
  } else {
    structure = 'linear';
  }

  return {
    structure,
    hasDeadline,
    realTimeConstraint,
    allowsTimeJumps: structure !== 'linear' && structure !== 'countdown',
  };
}

/**
 * Analyze genre from premise and provided genre.
 */
function analyzeGenreProfile(synopsis: string, providedGenre?: string): StoryDNA['genreProfile'] {
  // Detect genre from synopsis if not provided
  let primaryGenre = providedGenre || 'general';

  if (!providedGenre) {
    for (const [genre, patterns] of Object.entries(GENRE_PATTERNS)) {
      if (patterns.some(p => p.test(synopsis))) {
        primaryGenre = genre;
        break;
      }
    }
  }

  // Genre-specific conventions
  const conventionalBeats: string[] = [];
  let requiresEscalation = false;
  let requiresTwists = false;

  switch (primaryGenre.toLowerCase()) {
    case 'thriller':
      requiresEscalation = true;
      requiresTwists = true;
      conventionalBeats.push('inciting_danger', 'false_safety', 'escalation', 'climax_confrontation');
      break;
    case 'mystery':
      requiresTwists = true;
      conventionalBeats.push('crime_discovery', 'investigation', 'red_herrings', 'revelation');
      break;
    case 'romance':
      conventionalBeats.push('meet_cute', 'attraction', 'obstacle', 'dark_moment', 'resolution');
      break;
    case 'horror':
      requiresEscalation = true;
      conventionalBeats.push('normalcy', 'first_scare', 'investigation', 'escalation', 'confrontation');
      break;
    case 'fantasy':
    case 'scifi':
      conventionalBeats.push('ordinary_world', 'call_to_adventure', 'tests', 'ordeal', 'return');
      break;
    default:
      conventionalBeats.push('setup', 'conflict', 'complications', 'climax', 'resolution');
  }

  return {
    primaryGenre,
    requiresEscalation,
    requiresTwists,
    conventionalBeats,
  };
}

/**
 * Determine where dynamism comes from given the constraints.
 */
function determineDynamismSources(
  locationProfile: StoryDNA['locationProfile'],
  characterProfile: StoryDNA['characterProfile'],
  timeProfile: StoryDNA['timeProfile'],
  genreProfile: StoryDNA['genreProfile']
): string[] {
  const sources: string[] = [];

  // Location-based dynamism
  if (locationProfile.canTravelPhysically) {
    sources.push('physical_location_changes');
  }
  if (locationProfile.type === 'confined') {
    sources.push('environment_degradation');      // The space itself changes
    sources.push('discovery_within_space');       // Finding new things
    sources.push('external_communication');        // Phone, radio, etc.
    sources.push('sensory_changes');              // Light, temperature, sound
  }

  // Character-based dynamism
  if (characterProfile.canMeetNewPeople) {
    sources.push('new_character_introductions');
  }
  if (characterProfile.alternateAccess.includes('phone_calls')) {
    sources.push('remote_character_interaction');
  }
  if (characterProfile.alternateAccess.includes('memories')) {
    sources.push('flashback_characters');
  }
  sources.push('relationship_shifts');           // Always applicable

  // Time-based dynamism
  if (timeProfile.hasDeadline) {
    sources.push('countdown_pressure');
  }
  if (timeProfile.allowsTimeJumps) {
    sources.push('temporal_jumps');
  }
  if (timeProfile.structure === 'parallel') {
    sources.push('parallel_storylines');
  }

  // Genre-based dynamism
  if (genreProfile.requiresEscalation) {
    sources.push('stakes_escalation');
  }
  if (genreProfile.requiresTwists) {
    sources.push('plot_reversals');
    sources.push('revelations');
  }

  return sources;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get a human-readable summary of the story DNA.
 */
export function summarizeStoryDNA(dna: StoryDNA): string {
  const lines: string[] = [];

  lines.push(`LOCATION: ${dna.locationProfile.type.toUpperCase()}`);
  lines.push(`  - Primary: ${dna.locationProfile.primarySetting}`);
  lines.push(`  - Can travel: ${dna.locationProfile.canTravelPhysically ? 'Yes' : 'No'}`);
  if (!dna.locationProfile.canTravelPhysically) {
    lines.push(`  - Alternate access: ${dna.locationProfile.alternateAccess.join(', ')}`);
  }

  lines.push(`\nCHARACTERS: ${dna.characterProfile.scope.toUpperCase()}`);
  lines.push(`  - Primary cast: ~${dna.characterProfile.primaryCharacters}`);
  lines.push(`  - Can meet new people: ${dna.characterProfile.canMeetNewPeople ? 'Yes' : 'No'}`);

  lines.push(`\nTIME: ${dna.timeProfile.structure.toUpperCase()}`);
  lines.push(`  - Has deadline: ${dna.timeProfile.hasDeadline ? 'Yes' : 'No'}`);
  lines.push(`  - Real-time: ${dna.timeProfile.realTimeConstraint ? 'Yes' : 'No'}`);

  lines.push(`\nGENRE: ${dna.genreProfile.primaryGenre.toUpperCase()}`);
  lines.push(`  - Requires escalation: ${dna.genreProfile.requiresEscalation ? 'Yes' : 'No'}`);
  lines.push(`  - Requires twists: ${dna.genreProfile.requiresTwists ? 'Yes' : 'No'}`);

  lines.push(`\nDYNAMISM SOURCES:`);
  for (const source of dna.dynamismSources) {
    lines.push(`  - ${source.replace(/_/g, ' ')}`);
  }

  return lines.join('\n');
}

/**
 * Check if a premise describes a confined/bottle story.
 */
export function isConfinedStory(synopsis: string): boolean {
  return CONFINED_PATTERNS.some(p => p.test(synopsis));
}

/**
 * Check if a premise describes a traveling/journey story.
 */
export function isTravelingStory(synopsis: string): boolean {
  return TRAVELING_PATTERNS.some(p => p.test(synopsis));
}

// Export patterns for testing
export {
  CONFINED_PATTERNS,
  TRAVELING_PATTERNS,
  ENSEMBLE_PATTERNS,
  SOLO_PATTERNS,
  DEADLINE_PATTERNS,
  FLASHBACK_PATTERNS,
  GENRE_PATTERNS,
};
