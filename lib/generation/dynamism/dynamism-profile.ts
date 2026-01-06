/**
 * Dynamism Profile Generator
 *
 * Takes the Story DNA and generates concrete, measurable requirements
 * for location variety, character flux, pacing, etc.
 *
 * The profile is IDEA-SPECIFIC:
 * - "Buried" → No physical travel, but phone calls mandatory
 * - Road trip → New location each chapter mandatory
 * - Courtroom → Limited locations, rotating witnesses
 *
 * These requirements get injected into outline prompts and
 * validated during beat generation.
 */

import { type StoryDNA } from './story-dna';
import { type BookFormat } from '../atomic/format-config';

// =============================================================================
// DYNAMISM PROFILE TYPES
// =============================================================================

export interface DynamismProfile {
  // Location requirements (idea-specific)
  locations: LocationRequirements;

  // Character requirements (idea-specific)
  characters: CharacterRequirements;

  // Pacing requirements
  pacing: PacingRequirements;

  // What's FORBIDDEN for this story (to maintain premise integrity)
  forbidden: string[];

  // What's REQUIRED for this story (to inject life)
  required: string[];

  // Format-specific adjustments
  formatAdjustments: FormatAdjustments;
}

export interface LocationRequirements {
  // Core constraints
  type: 'confined' | 'limited' | 'multiple' | 'traveling' | 'epic';
  canPhysicallyTravel: boolean;

  // Numerical requirements
  minLocationsPerChapter: number;        // 0 for confined, 2+ for traveling
  maxConsecutiveBeatsInSame: number;     // How long can we stay in one place?
  minDistinctLocationsPerBook: number;   // Total unique locations expected

  // How to achieve variety if constrained
  varietySources: LocationVarietySource[];

  // Location-specific instructions
  instructions: string[];
}

export interface LocationVarietySource {
  type: 'physical_travel' | 'phone_location' | 'memory_location' | 'video_call' |
        'environment_change' | 'discovery' | 'camera_cut' | 'parallel_scene';
  description: string;
  frequency: 'required_per_chapter' | 'every_few_chapters' | 'optional';
}

export interface CharacterRequirements {
  // Core constraints
  scope: 'solo' | 'duo' | 'small_group' | 'ensemble' | 'rotating';
  canMeetNewPeople: boolean;

  // Numerical requirements
  minCharactersPerChapter: number;       // 1 for solo, 2+ for others
  maxConsecutiveBeatsWithSameCast: number;
  minNewCharactersPerBook: number;       // Beyond the main cast

  // How to achieve variety if constrained
  varietySources: CharacterVarietySource[];

  // Character-specific instructions
  instructions: string[];
}

export interface CharacterVarietySource {
  type: 'physical_appearance' | 'phone_call' | 'video_call' | 'memory' |
        'hallucination' | 'voice' | 'letter' | 'found_media' | 'mention';
  description: string;
  frequency: 'required_per_chapter' | 'every_few_chapters' | 'optional';
}

export interface PacingRequirements {
  // Stakes management
  requiresEscalation: boolean;
  escalationFrequency: 'every_chapter' | 'every_few_chapters' | 'key_moments';

  // Interruptions and complications
  interruptionFrequency: number;         // 0-1: Chance per chapter
  interruptionTypes: string[];           // What kind of interruptions fit this story

  // Time structure
  timeStructure: 'linear' | 'flashbacks' | 'parallel' | 'countdown' | 'nonlinear';
  flashbackFrequency: number;            // 0-1: If flashbacks allowed

  // Chapter ending requirements
  chapterEndingRequirement: 'cliffhanger' | 'revelation' | 'shift' | 'flexible';

  // Instructions
  instructions: string[];
}

export interface FormatAdjustments {
  // Comics need more visual variety
  comic?: {
    minLocationsPerPage: number;
    maxPanelsInSameLocation: number;
    requiresVisualVariety: boolean;
  };

  // Screenplays need visual scene changes
  screenplay?: {
    minScenesPerSequence: number;
    maxPagesInSameLocation: number;
    requiresVisualContrast: boolean;
  };
}

// =============================================================================
// PROFILE GENERATION
// =============================================================================

/**
 * Generate a dynamism profile from Story DNA.
 */
export function generateDynamismProfile(
  dna: StoryDNA,
  format?: BookFormat,
  totalChapters?: number
): DynamismProfile {
  const locations = generateLocationRequirements(dna, totalChapters);
  const characters = generateCharacterRequirements(dna, totalChapters);
  const pacing = generatePacingRequirements(dna);

  // Determine forbidden actions (premise-breaking)
  const forbidden = generateForbiddenList(dna);

  // Determine required elements (life-giving)
  const required = generateRequiredList(dna);

  // Format-specific adjustments
  const formatAdjustments = generateFormatAdjustments(dna, format);

  return {
    locations,
    characters,
    pacing,
    forbidden,
    required,
    formatAdjustments,
  };
}

/**
 * Generate location requirements based on DNA.
 */
function generateLocationRequirements(
  dna: StoryDNA,
  totalChapters?: number
): LocationRequirements {
  const { locationProfile } = dna;
  const varietySources: LocationVarietySource[] = [];
  const instructions: string[] = [];

  let minLocationsPerChapter = 1;
  let maxConsecutiveBeatsInSame = 4;
  let minDistinctLocationsPerBook = 5;

  switch (locationProfile.type) {
    case 'confined':
      minLocationsPerChapter = 0;  // No physical travel required
      maxConsecutiveBeatsInSame = 6;  // Can stay longer, but must vary internally
      minDistinctLocationsPerBook = 1;  // Just the primary location

      // Add alternate variety sources
      varietySources.push({
        type: 'environment_change',
        description: 'The confined space itself changes (light, temperature, damage, discovery)',
        frequency: 'required_per_chapter',
      });
      varietySources.push({
        type: 'phone_location',
        description: 'Phone calls reveal what\'s happening elsewhere',
        frequency: 'required_per_chapter',
      });
      varietySources.push({
        type: 'memory_location',
        description: 'Flashbacks to other places',
        frequency: 'every_few_chapters',
      });

      instructions.push('The primary location must FEEL different each chapter (lighting, damage, protagonist\'s state)');
      instructions.push('External world must come IN via calls, radio, sounds, vibrations');
      instructions.push('Discoveries within the space create "new" locations (finding a hidden object, wall collapses)');
      break;

    case 'limited':
      minLocationsPerChapter = 1;
      maxConsecutiveBeatsInSame = 3;
      minDistinctLocationsPerBook = Math.min(8, (totalChapters || 10) * 0.8);

      varietySources.push({
        type: 'physical_travel',
        description: 'Move between the key locations',
        frequency: 'required_per_chapter',
      });
      varietySources.push({
        type: 'phone_location',
        description: 'Calls from characters in other places',
        frequency: 'every_few_chapters',
      });

      instructions.push('Rotate between the key locations - don\'t get stuck');
      instructions.push('Each location should have distinct atmosphere and purpose');
      break;

    case 'multiple':
      minLocationsPerChapter = 2;
      maxConsecutiveBeatsInSame = 2;
      minDistinctLocationsPerBook = Math.min(15, (totalChapters || 10) * 1.5);

      varietySources.push({
        type: 'physical_travel',
        description: 'Active movement between locations',
        frequency: 'required_per_chapter',
      });
      varietySources.push({
        type: 'parallel_scene',
        description: 'Cut to what\'s happening elsewhere',
        frequency: 'every_few_chapters',
      });

      instructions.push('Each chapter visits at least 2 distinct locations');
      instructions.push('Variety: indoor/outdoor, public/private, safe/dangerous');
      break;

    case 'traveling':
      minLocationsPerChapter = 2;
      maxConsecutiveBeatsInSame = 2;
      minDistinctLocationsPerBook = Math.min(20, (totalChapters || 10) * 2);

      varietySources.push({
        type: 'physical_travel',
        description: 'Journey to new places is the story engine',
        frequency: 'required_per_chapter',
      });
      varietySources.push({
        type: 'camera_cut',
        description: 'What\'s happening back home or with pursuers',
        frequency: 'every_few_chapters',
      });

      instructions.push('NEW locations are mandatory - this is a journey');
      instructions.push('Travel itself is a scene opportunity (vehicle, route, getting lost)');
      instructions.push('Each stop should have unique local flavor');
      break;

    case 'epic':
      minLocationsPerChapter = 2;
      maxConsecutiveBeatsInSame = 2;
      minDistinctLocationsPerBook = Math.min(30, (totalChapters || 10) * 3);

      varietySources.push({
        type: 'physical_travel',
        description: 'World-spanning movement',
        frequency: 'required_per_chapter',
      });
      varietySources.push({
        type: 'parallel_scene',
        description: 'Multiple storylines in different locations',
        frequency: 'required_per_chapter',
      });

      instructions.push('World-building through location variety');
      instructions.push('Each location represents a different aspect of the world');
      instructions.push('Parallel storylines can show simultaneous events');
      break;
  }

  return {
    type: locationProfile.type,
    canPhysicallyTravel: locationProfile.canTravelPhysically,
    minLocationsPerChapter,
    maxConsecutiveBeatsInSame,
    minDistinctLocationsPerBook,
    varietySources,
    instructions,
  };
}

/**
 * Generate character requirements based on DNA.
 */
function generateCharacterRequirements(
  dna: StoryDNA,
  totalChapters?: number
): CharacterRequirements {
  const { characterProfile } = dna;
  const varietySources: CharacterVarietySource[] = [];
  const instructions: string[] = [];

  let minCharactersPerChapter = 2;
  let maxConsecutiveBeatsWithSameCast = 3;
  let minNewCharactersPerBook = 3;

  switch (characterProfile.scope) {
    case 'solo':
      minCharactersPerChapter = 1;  // Can be just protagonist
      maxConsecutiveBeatsWithSameCast = 4;  // Longer alone, but needs variety
      minNewCharactersPerBook = 0;  // May not meet anyone

      // Add alternate variety sources
      varietySources.push({
        type: 'phone_call',
        description: 'Voices from elsewhere bring other characters in',
        frequency: 'required_per_chapter',
      });
      varietySources.push({
        type: 'memory',
        description: 'Flashbacks featuring other people',
        frequency: 'every_few_chapters',
      });
      varietySources.push({
        type: 'voice',
        description: 'Radio, PA system, recording, shouting from distance',
        frequency: 'every_few_chapters',
      });
      if (dna.genreProfile.primaryGenre === 'horror' || dna.genreProfile.primaryGenre === 'thriller') {
        varietySources.push({
          type: 'hallucination',
          description: 'Stress-induced visions of people',
          frequency: 'optional',
        });
      }

      instructions.push('External voices MUST appear - phone calls, radio, memories');
      instructions.push('Each chapter should feature at least one non-protagonist voice');
      instructions.push('Isolation is the constraint, not an excuse for monotony');
      break;

    case 'duo':
      minCharactersPerChapter = 2;
      maxConsecutiveBeatsWithSameCast = 3;
      minNewCharactersPerBook = 2;  // Some outside interaction

      varietySources.push({
        type: 'physical_appearance',
        description: 'Encounters with other people',
        frequency: 'every_few_chapters',
      });
      varietySources.push({
        type: 'phone_call',
        description: 'Calls to/from others',
        frequency: 'every_few_chapters',
      });
      varietySources.push({
        type: 'mention',
        description: 'Discussion of people not present',
        frequency: 'optional',
      });

      instructions.push('The duo dynamic drives the story, but others should appear');
      instructions.push('Split the duo occasionally - they don\'t have to be together always');
      instructions.push('Phone calls and encounters add texture');
      break;

    case 'small_group':
      minCharactersPerChapter = 2;
      maxConsecutiveBeatsWithSameCast = 2;
      minNewCharactersPerBook = 3;

      varietySources.push({
        type: 'physical_appearance',
        description: 'New characters entering the story',
        frequency: 'every_few_chapters',
      });
      varietySources.push({
        type: 'phone_call',
        description: 'Contact with outside world',
        frequency: 'optional',
      });

      instructions.push('Rotate which characters are "on screen" - don\'t always use all of them');
      instructions.push('Introduce at least one new character every 3-4 chapters');
      instructions.push('Characters can exit temporarily (subplot, errand, conflict)');
      break;

    case 'ensemble':
      minCharactersPerChapter = 3;
      maxConsecutiveBeatsWithSameCast = 2;
      minNewCharactersPerBook = 5;

      varietySources.push({
        type: 'physical_appearance',
        description: 'Large cast rotation',
        frequency: 'required_per_chapter',
      });
      varietySources.push({
        type: 'parallel_scene',
        description: 'Different characters in different scenes',
        frequency: 'required_per_chapter',
      });

      instructions.push('Rotate POV or focus between ensemble members');
      instructions.push('Each chapter should feature different character combinations');
      instructions.push('New characters should enter regularly');
      break;

    case 'rotating':
      minCharactersPerChapter = 2;
      maxConsecutiveBeatsWithSameCast = 2;
      minNewCharactersPerBook = (totalChapters || 10) * 0.5;

      varietySources.push({
        type: 'physical_appearance',
        description: 'Constant new faces',
        frequency: 'required_per_chapter',
      });

      instructions.push('New characters are the engine of this story');
      instructions.push('Each chapter should introduce someone new');
      instructions.push('Some characters recur, but new blood is constant');
      break;
  }

  return {
    scope: characterProfile.scope,
    canMeetNewPeople: characterProfile.canMeetNewPeople,
    minCharactersPerChapter,
    maxConsecutiveBeatsWithSameCast,
    minNewCharactersPerBook,
    varietySources,
    instructions,
  };
}

/**
 * Generate pacing requirements based on DNA.
 */
function generatePacingRequirements(dna: StoryDNA): PacingRequirements {
  const { timeProfile, genreProfile } = dna;
  const instructions: string[] = [];

  // Stakes escalation
  const requiresEscalation = genreProfile.requiresEscalation;
  let escalationFrequency: PacingRequirements['escalationFrequency'] = 'every_few_chapters';

  if (timeProfile.hasDeadline || timeProfile.structure === 'countdown') {
    escalationFrequency = 'every_chapter';
  }

  // Interruptions
  let interruptionFrequency = 0.3;  // Default 30% per chapter
  const interruptionTypes: string[] = [];

  switch (genreProfile.primaryGenre.toLowerCase()) {
    case 'thriller':
      interruptionFrequency = 0.5;
      interruptionTypes.push('threat_escalation', 'discovery', 'attack', 'deadline_moved_up');
      break;
    case 'romance':
      interruptionFrequency = 0.4;
      interruptionTypes.push('rival_appears', 'miscommunication', 'past_revealed', 'obstacle');
      break;
    case 'mystery':
      interruptionFrequency = 0.4;
      interruptionTypes.push('new_clue', 'witness_appears', 'alibi_broken', 'body_found');
      break;
    case 'horror':
      interruptionFrequency = 0.5;
      interruptionTypes.push('scare', 'victim_taken', 'power_loss', 'isolation_increased');
      break;
    default:
      interruptionTypes.push('phone_call', 'visitor', 'news', 'accident', 'realization');
  }

  // Flashback frequency
  let flashbackFrequency = 0;
  if (timeProfile.allowsTimeJumps || timeProfile.structure === 'flashbacks') {
    flashbackFrequency = 0.3;  // 30% of chapters
  }

  // Chapter endings
  let chapterEndingRequirement: PacingRequirements['chapterEndingRequirement'] = 'shift';
  if (genreProfile.primaryGenre.toLowerCase() === 'thriller' || timeProfile.hasDeadline) {
    chapterEndingRequirement = 'cliffhanger';
  } else if (genreProfile.primaryGenre.toLowerCase() === 'mystery') {
    chapterEndingRequirement = 'revelation';
  }

  // Instructions
  if (timeProfile.hasDeadline) {
    instructions.push('Deadline pressure should be felt in every chapter');
    instructions.push('Time is running out - remind the reader');
  }
  if (requiresEscalation) {
    instructions.push('Stakes must increase - things get worse before they get better');
  }
  if (genreProfile.requiresTwists) {
    instructions.push('Reversals and revelations should punctuate the narrative');
  }
  instructions.push(`Chapters should end with: ${chapterEndingRequirement.replace('_', ' ')}`);

  return {
    requiresEscalation,
    escalationFrequency,
    interruptionFrequency,
    interruptionTypes,
    timeStructure: timeProfile.structure,
    flashbackFrequency,
    chapterEndingRequirement,
    instructions,
  };
}

/**
 * Generate list of forbidden actions (premise-breaking).
 */
function generateForbiddenList(dna: StoryDNA): string[] {
  const forbidden: string[] = [];

  // Location-based forbidden
  if (!dna.locationProfile.canTravelPhysically) {
    forbidden.push('Physical travel to new locations');
    forbidden.push('Protagonist leaving the confined space');
    forbidden.push('Scenes set elsewhere without a connection to protagonist');
  }

  // Character-based forbidden
  if (!dna.characterProfile.canMeetNewPeople) {
    forbidden.push('New characters physically appearing');
    forbidden.push('Crowds or public scenes');
    forbidden.push('In-person conversations with new people');
  }

  // Time-based forbidden
  if (dna.timeProfile.realTimeConstraint) {
    forbidden.push('Large time jumps (hours or days)');
    forbidden.push('Skipping over significant events');
  }
  if (!dna.timeProfile.allowsTimeJumps) {
    forbidden.push('Flashbacks (unless brief memory flashes)');
    forbidden.push('Non-linear storytelling');
  }

  // Genre-based forbidden
  if (dna.genreProfile.primaryGenre.toLowerCase() === 'thriller' && dna.genreProfile.requiresEscalation) {
    forbidden.push('Stakes decreasing without a twist');
    forbidden.push('Extended calm periods without tension');
  }

  return forbidden;
}

/**
 * Generate list of required elements (life-giving).
 */
function generateRequiredList(dna: StoryDNA): string[] {
  const required: string[] = [];

  // Always required for all stories
  required.push('At least one relationship shift per chapter');
  required.push('At least one new piece of information per chapter');
  required.push('Protagonist\'s situation changes by chapter end');

  // Location-based required
  if (dna.locationProfile.type === 'confined') {
    required.push('The confined space itself must change (light, temperature, damage)');
    required.push('External contact (phone, radio, sounds) every chapter');
    required.push('Discovery of new details within the space');
  } else if (dna.locationProfile.type === 'traveling') {
    required.push('New location every chapter');
    required.push('Local color and detail at each stop');
    required.push('Travel scenes (not just arrival at destination)');
  }

  // Character-based required
  if (dna.characterProfile.scope === 'solo') {
    required.push('External voices (phone, radio, memory) every chapter');
    required.push('Character\'s internal state visibly changes');
  } else {
    required.push('Character interaction dynamics shift');
    required.push('At least one character entrance or exit per chapter');
  }

  // Pacing-based required
  if (dna.timeProfile.hasDeadline) {
    required.push('Countdown reminder in each chapter');
    required.push('Time pressure affecting decisions');
  }
  if (dna.genreProfile.requiresEscalation) {
    required.push('Stakes escalation at least every 2 chapters');
  }

  return required;
}

/**
 * Generate format-specific adjustments.
 */
function generateFormatAdjustments(
  dna: StoryDNA,
  format?: BookFormat
): FormatAdjustments {
  const adjustments: FormatAdjustments = {};

  if (format === 'comic' || format === 'picture_book') {
    // Comics need more visual variety
    const isConfined = dna.locationProfile.type === 'confined';

    adjustments.comic = {
      minLocationsPerPage: isConfined ? 0 : 1,
      maxPanelsInSameLocation: isConfined ? 4 : 2,
      requiresVisualVariety: true,
    };
  }

  if (format === 'screenplay') {
    const isConfined = dna.locationProfile.type === 'confined';

    adjustments.screenplay = {
      minScenesPerSequence: isConfined ? 1 : 2,
      maxPagesInSameLocation: isConfined ? 10 : 3,
      requiresVisualContrast: true,
    };
  }

  return adjustments;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get a human-readable summary of the dynamism profile.
 */
export function summarizeDynamismProfile(profile: DynamismProfile): string {
  const lines: string[] = [];

  lines.push('=== DYNAMISM PROFILE ===\n');

  lines.push('LOCATIONS:');
  lines.push(`  Type: ${profile.locations.type}`);
  lines.push(`  Can travel: ${profile.locations.canPhysicallyTravel}`);
  lines.push(`  Min per chapter: ${profile.locations.minLocationsPerChapter}`);
  lines.push(`  Max beats in same: ${profile.locations.maxConsecutiveBeatsInSame}`);
  for (const source of profile.locations.varietySources) {
    lines.push(`  - ${source.type}: ${source.frequency}`);
  }

  lines.push('\nCHARACTERS:');
  lines.push(`  Scope: ${profile.characters.scope}`);
  lines.push(`  Can meet new: ${profile.characters.canMeetNewPeople}`);
  lines.push(`  Min per chapter: ${profile.characters.minCharactersPerChapter}`);
  for (const source of profile.characters.varietySources) {
    lines.push(`  - ${source.type}: ${source.frequency}`);
  }

  lines.push('\nPACING:');
  lines.push(`  Escalation: ${profile.pacing.requiresEscalation ? profile.pacing.escalationFrequency : 'not required'}`);
  lines.push(`  Interruptions: ${Math.round(profile.pacing.interruptionFrequency * 100)}% per chapter`);
  lines.push(`  Chapter endings: ${profile.pacing.chapterEndingRequirement}`);

  lines.push('\nFORBIDDEN:');
  for (const item of profile.forbidden) {
    lines.push(`  ❌ ${item}`);
  }

  lines.push('\nREQUIRED:');
  for (const item of profile.required) {
    lines.push(`  ✓ ${item}`);
  }

  return lines.join('\n');
}

/**
 * Check if a dynamism profile allows a specific action.
 */
export function isAllowed(profile: DynamismProfile, action: string): boolean {
  const lowerAction = action.toLowerCase();
  return !profile.forbidden.some(f => lowerAction.includes(f.toLowerCase()));
}

/**
 * Get dynamism requirements for a specific chapter.
 */
export function getChapterRequirements(
  profile: DynamismProfile,
  chapterNumber: number,
  totalChapters: number
): {
  locationRequirements: string[];
  characterRequirements: string[];
  pacingRequirements: string[];
} {
  const locationRequirements: string[] = [];
  const characterRequirements: string[] = [];
  const pacingRequirements: string[] = [];

  // Location requirements
  if (profile.locations.minLocationsPerChapter > 0) {
    locationRequirements.push(
      `Visit at least ${profile.locations.minLocationsPerChapter} distinct location(s)`
    );
  }
  for (const source of profile.locations.varietySources) {
    if (source.frequency === 'required_per_chapter') {
      locationRequirements.push(source.description);
    }
  }

  // Character requirements
  if (profile.characters.minCharactersPerChapter > 1) {
    characterRequirements.push(
      `Include at least ${profile.characters.minCharactersPerChapter} characters`
    );
  }
  for (const source of profile.characters.varietySources) {
    if (source.frequency === 'required_per_chapter') {
      characterRequirements.push(source.description);
    }
  }

  // Pacing requirements
  if (profile.pacing.requiresEscalation) {
    if (profile.pacing.escalationFrequency === 'every_chapter') {
      pacingRequirements.push('Stakes must increase in this chapter');
    } else if (chapterNumber % 2 === 0) {
      pacingRequirements.push('Stakes should increase in this chapter');
    }
  }

  // Interruption (probabilistic)
  if (Math.random() < profile.pacing.interruptionFrequency) {
    const interruptionType = profile.pacing.interruptionTypes[
      Math.floor(Math.random() * profile.pacing.interruptionTypes.length)
    ];
    pacingRequirements.push(
      `Include an interruption: ${interruptionType.replace(/_/g, ' ')}`
    );
  }

  // Chapter ending
  pacingRequirements.push(
    `End the chapter with: ${profile.pacing.chapterEndingRequirement.replace('_', ' ')}`
  );

  return {
    locationRequirements,
    characterRequirements,
    pacingRequirements,
  };
}
