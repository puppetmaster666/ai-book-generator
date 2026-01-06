/**
 * Outline Requirements Generator
 *
 * Generates prompt injections for outline/chapter planning based on
 * the story's dynamism profile. These prompts guide the AI to create
 * outlines that have the RIGHT kind of dynamism for THIS story.
 *
 * - Confined story? Requirements focus on internal variety, phone calls
 * - Road trip? Requirements mandate new locations
 * - Ensemble? Requirements rotate characters
 *
 * The prompts are injected into:
 * 1. Book outline generation (chapter-level planning)
 * 2. Chapter outline generation (beat-level planning)
 * 3. Comic page planning (panel-level)
 * 4. Screenplay sequence planning (scene-level)
 */

import { type DynamismProfile, getChapterRequirements } from './dynamism-profile';
import { type StoryDNA } from './story-dna';
import { type BookFormat } from '../atomic/format-config';

// =============================================================================
// BOOK OUTLINE PROMPT (Chapter-Level)
// =============================================================================

/**
 * Generate the dynamism requirements prompt for BOOK OUTLINE generation.
 * This is injected when planning ALL chapters at once.
 */
export function buildBookOutlinePrompt(
  profile: DynamismProfile,
  dna: StoryDNA,
  totalChapters: number
): string {
  const lines: string[] = [];

  lines.push('=== STORY DYNAMISM REQUIREMENTS ===');
  lines.push('These requirements are SPECIFIC to your story premise.\n');

  // LOCATION SECTION
  lines.push('LOCATION VARIETY:');
  switch (profile.locations.type) {
    case 'confined':
      lines.push(`Your story is CONFINED to: ${dna.locationProfile.primarySetting}`);
      lines.push('This constraint is INTENTIONAL. Do NOT break it.');
      lines.push('');
      lines.push('Dynamism within constraint:');
      for (const source of profile.locations.varietySources) {
        lines.push(`  ✓ ${source.description}`);
      }
      lines.push('');
      lines.push('The confined space must CHANGE across chapters:');
      lines.push('  - Lighting changes (day/night, power failure, fire)');
      lines.push('  - Physical degradation (damage, flooding, collapse)');
      lines.push('  - Temperature shifts (heat, cold, ventilation)');
      lines.push('  - New discoveries (objects, hidden spaces, messages)');
      break;

    case 'limited':
      lines.push(`Your story uses a LIMITED set of key locations.`);
      lines.push(`Target: ${profile.locations.minDistinctLocationsPerBook} distinct locations total.`);
      lines.push('');
      lines.push('Requirements:');
      lines.push(`  - At least ${profile.locations.minLocationsPerChapter} location(s) per chapter`);
      lines.push('  - Rotate between locations - don\'t get stuck');
      lines.push('  - Each location has distinct atmosphere');
      break;

    case 'multiple':
    case 'epic':
      lines.push(`Your story demands LOCATION VARIETY.`);
      lines.push(`Target: ${profile.locations.minDistinctLocationsPerBook} distinct locations total.`);
      lines.push('');
      lines.push('Requirements:');
      lines.push(`  - At least ${profile.locations.minLocationsPerChapter} locations per chapter`);
      lines.push('  - Mix: indoor/outdoor, public/private, safe/dangerous');
      lines.push('  - No more than 2 consecutive chapters in same primary location');
      break;

    case 'traveling':
      lines.push(`Your story is a JOURNEY. Movement is mandatory.`);
      lines.push(`Target: ${profile.locations.minDistinctLocationsPerBook} distinct locations total.`);
      lines.push('');
      lines.push('Requirements:');
      lines.push(`  - NEW location(s) every chapter`);
      lines.push('  - Travel itself is a scene (not just arrivals)');
      lines.push('  - Each stop has local flavor and purpose');
      lines.push('  - Don\'t skip the journey - show the road');
      break;
  }

  // CHARACTER SECTION
  lines.push('');
  lines.push('CHARACTER VARIETY:');
  switch (profile.characters.scope) {
    case 'solo':
      lines.push(`Your protagonist is ISOLATED. They cannot physically meet new people.`);
      lines.push('');
      lines.push('Dynamism within constraint:');
      for (const source of profile.characters.varietySources) {
        lines.push(`  ✓ ${source.description}`);
      }
      lines.push('');
      lines.push('EVERY chapter must include external voices:');
      lines.push('  - Phone calls (different callers)');
      lines.push('  - Radio/intercom/PA system');
      lines.push('  - Memories featuring other people');
      lines.push('  - Letters, recordings, found media');
      break;

    case 'duo':
      lines.push(`Your story centers on TWO characters.`);
      lines.push('');
      lines.push('Requirements:');
      lines.push('  - Split them occasionally (separate scenes, phone calls)');
      lines.push('  - Introduce other characters via encounters or calls');
      lines.push(`  - ${profile.characters.minNewCharactersPerBook} supporting characters minimum`);
      break;

    case 'small_group':
      lines.push(`Your story has a SMALL GROUP of characters.`);
      lines.push('');
      lines.push('Requirements:');
      lines.push('  - Rotate which characters are "on screen" - not always all');
      lines.push('  - Characters can exit temporarily (subplot, errand, conflict)');
      lines.push(`  - Introduce ${profile.characters.minNewCharactersPerBook} new characters across the book`);
      lines.push('  - Each chapter should have different character combinations');
      break;

    case 'ensemble':
    case 'rotating':
      lines.push(`Your story has an ENSEMBLE CAST.`);
      lines.push('');
      lines.push('Requirements:');
      lines.push('  - Rotate POV or focus between characters');
      lines.push('  - Each chapter features different combinations');
      lines.push(`  - ${profile.characters.minNewCharactersPerBook} new characters across the book`);
      lines.push('  - Characters can leave and return');
      break;
  }

  // PACING SECTION
  lines.push('');
  lines.push('PACING & STAKES:');

  if (profile.pacing.requiresEscalation) {
    lines.push(`Stakes MUST escalate (${profile.pacing.escalationFrequency.replace(/_/g, ' ')})`);
    lines.push('  - Things get worse before they get better');
    lines.push('  - Each setback is bigger than the last');
  }

  if (dna.timeProfile.hasDeadline) {
    lines.push('');
    lines.push('COUNTDOWN PRESSURE:');
    lines.push('  - Time limit must be felt in every chapter');
    lines.push('  - Show the clock ticking (literally or metaphorically)');
    lines.push('  - Decisions are forced by time pressure');
  }

  lines.push('');
  lines.push(`Interruptions (${Math.round(profile.pacing.interruptionFrequency * 100)}% of chapters):`);
  lines.push('  Types: ' + profile.pacing.interruptionTypes.join(', '));

  lines.push('');
  lines.push(`Chapter endings: ${profile.pacing.chapterEndingRequirement.toUpperCase()}`);

  // FORBIDDEN SECTION
  if (profile.forbidden.length > 0) {
    lines.push('');
    lines.push('FORBIDDEN (Would break premise):');
    for (const item of profile.forbidden) {
      lines.push(`  ❌ ${item}`);
    }
  }

  // REQUIRED SECTION
  lines.push('');
  lines.push('REQUIRED (Every chapter):');
  for (const item of profile.required) {
    lines.push(`  ✓ ${item}`);
  }

  // ANTI-STAGNATION
  lines.push('');
  lines.push('ANTI-STAGNATION RULES:');
  lines.push('  ❌ NO: Extended solo internal monologue without external interaction');
  lines.push('  ❌ NO: Two characters talking without physical action or movement');
  lines.push('  ❌ NO: "They discussed the problem" scenes (show don\'t summarize)');
  lines.push('  ❌ NO: Same emotional state at chapter end as chapter start');
  lines.push('');
  lines.push('  ✓ YES: Something CHANGES in every chapter');
  lines.push('  ✓ YES: External input (calls, visitors, discoveries, news)');
  lines.push('  ✓ YES: Character entrances and exits');
  lines.push('  ✓ YES: Environment shifts (time, weather, damage)');

  return lines.join('\n');
}

// =============================================================================
// CHAPTER OUTLINE PROMPT (Beat-Level)
// =============================================================================

/**
 * Generate the dynamism requirements prompt for a SINGLE CHAPTER.
 * This is injected when planning beats within a chapter.
 */
export function buildChapterOutlinePrompt(
  profile: DynamismProfile,
  dna: StoryDNA,
  chapterNumber: number,
  totalChapters: number,
  previousChapterSummary?: string
): string {
  const lines: string[] = [];
  const requirements = getChapterRequirements(profile, chapterNumber, totalChapters);

  lines.push(`=== CHAPTER ${chapterNumber} DYNAMISM REQUIREMENTS ===\n`);

  // Context from previous chapter
  if (previousChapterSummary) {
    lines.push('Previous chapter ended:');
    lines.push(`  "${previousChapterSummary}"`);
    lines.push('');
    lines.push('This chapter must BUILD on that - don\'t reset.\n');
  }

  // Location requirements
  if (requirements.locationRequirements.length > 0) {
    lines.push('LOCATION REQUIREMENTS:');
    for (const req of requirements.locationRequirements) {
      lines.push(`  ✓ ${req}`);
    }
    lines.push('');
  }

  // Character requirements
  if (requirements.characterRequirements.length > 0) {
    lines.push('CHARACTER REQUIREMENTS:');
    for (const req of requirements.characterRequirements) {
      lines.push(`  ✓ ${req}`);
    }
    lines.push('');
  }

  // Pacing requirements
  if (requirements.pacingRequirements.length > 0) {
    lines.push('PACING REQUIREMENTS:');
    for (const req of requirements.pacingRequirements) {
      lines.push(`  ✓ ${req}`);
    }
    lines.push('');
  }

  // Beat-level anti-stagnation
  lines.push('BEAT-LEVEL RULES:');
  lines.push(`  - Max ${profile.locations.maxConsecutiveBeatsInSame} consecutive beats in same location`);
  lines.push(`  - Max ${profile.characters.maxConsecutiveBeatsWithSameCast} consecutive beats with exact same characters`);
  lines.push('  - Each beat should have ACTION, not just dialogue/thinking');

  return lines.join('\n');
}

// =============================================================================
// COMIC PAGE PROMPT (Panel-Level)
// =============================================================================

/**
 * Generate dynamism requirements for comic page planning.
 */
export function buildComicPagePrompt(
  profile: DynamismProfile,
  dna: StoryDNA,
  pageNumber: number,
  chapterNumber: number
): string {
  const lines: string[] = [];
  const comicAdjust = profile.formatAdjustments.comic;

  lines.push(`=== PAGE ${pageNumber} DYNAMISM REQUIREMENTS ===\n`);

  lines.push('VISUAL VARIETY (MANDATORY):');

  if (profile.locations.type === 'confined') {
    lines.push('Your story is CONFINED - but panels must vary visually:');
    lines.push('  - Angle changes (close-up, medium, wide)');
    lines.push('  - Lighting changes (shadows, highlights, darkness)');
    lines.push('  - Character position changes (sitting, standing, moving)');
    lines.push('  - Environmental details shift (damage, objects, atmosphere)');
    lines.push('');
    lines.push(`  Max ${comicAdjust?.maxPanelsInSameLocation || 4} panels with identical background`);
  } else {
    lines.push(`  - At least ${comicAdjust?.minLocationsPerPage || 1} location change per page`);
    lines.push(`  - Max ${comicAdjust?.maxPanelsInSameLocation || 2} consecutive panels in same spot`);
    lines.push('  - Vary: close-up → medium → wide → new location');
  }

  lines.push('');
  lines.push('PANEL COMPOSITION:');
  lines.push('  ❌ NO: 4+ panels of talking heads');
  lines.push('  ❌ NO: Identical poses across panels');
  lines.push('  ❌ NO: Static backgrounds throughout page');
  lines.push('');
  lines.push('  ✓ YES: Movement between panels');
  lines.push('  ✓ YES: Background details that change');
  lines.push('  ✓ YES: Page ends with visual hook (page-turner)');

  // Character variety for comics
  if (profile.characters.scope === 'solo') {
    lines.push('');
    lines.push('CHARACTER (Isolated protagonist):');
    lines.push('  - Vary the protagonist\'s expression and pose');
    lines.push('  - Show phone/device screens with other characters');
    lines.push('  - Memory panels can show other people');
    lines.push('  - Environmental storytelling (photos, objects, shadows)');
  }

  return lines.join('\n');
}

// =============================================================================
// SCREENPLAY SEQUENCE PROMPT (Scene-Level)
// =============================================================================

/**
 * Generate dynamism requirements for screenplay sequence planning.
 */
export function buildScreenplaySequencePrompt(
  profile: DynamismProfile,
  dna: StoryDNA,
  sequenceNumber: number
): string {
  const lines: string[] = [];
  const screenplayAdjust = profile.formatAdjustments.screenplay;

  lines.push(`=== SEQUENCE ${sequenceNumber} DYNAMISM REQUIREMENTS ===\n`);

  lines.push('SCENE VARIETY:');

  if (profile.locations.type === 'confined') {
    lines.push('Your story is CONFINED - visual variety comes from:');
    lines.push('  - Camera angles (not as direction, but as implied framing)');
    lines.push('  - Lighting changes in the space');
    lines.push('  - Character movement and positioning');
    lines.push('  - The space degrading or revealing new details');
    lines.push('  - INTERCUT with phone calls showing other locations');
    lines.push('');
    lines.push(`  Max ${screenplayAdjust?.maxPagesInSameLocation || 10} pages before visual shift`);
  } else {
    lines.push(`  - At least ${screenplayAdjust?.minScenesPerSequence || 2} distinct scenes per sequence`);
    lines.push(`  - Max ${screenplayAdjust?.maxPagesInSameLocation || 3} pages in same location`);
    lines.push('  - Alternate INT/EXT when possible');
    lines.push('  - Scene changes create visual rhythm');
  }

  lines.push('');
  lines.push('SCREENPLAY DYNAMISM:');
  lines.push('  ❌ NO: Long dialogue scenes without movement');
  lines.push('  ❌ NO: Same two characters talking for 5+ pages');
  lines.push('  ❌ NO: Static blocking (characters just standing)');
  lines.push('');
  lines.push('  ✓ YES: Characters DO things while talking');
  lines.push('  ✓ YES: Interruptions (phone, doorbell, event)');
  lines.push('  ✓ YES: Scene transitions with purpose');

  // Character variety for screenplays
  if (profile.characters.scope === 'solo') {
    lines.push('');
    lines.push('CHARACTER (Isolated protagonist):');
    lines.push('  - Phone calls bring other VOICES in (use VO)');
    lines.push('  - Show phone/screen with caller\'s location via INTERCUT');
    lines.push('  - Flashbacks can show other characters');
    lines.push('  - Environmental sounds suggest world outside');
  }

  return lines.join('\n');
}

// =============================================================================
// VALIDATION PROMPT (For Checking Outlines)
// =============================================================================

/**
 * Generate a prompt for VALIDATING an outline against dynamism requirements.
 */
export function buildOutlineValidationPrompt(
  profile: DynamismProfile,
  dna: StoryDNA
): string {
  const lines: string[] = [];

  lines.push('=== OUTLINE VALIDATION CHECKLIST ===\n');

  lines.push('Check each chapter/section against these requirements:\n');

  // Location checks
  lines.push('LOCATION VARIETY:');
  if (profile.locations.type === 'confined') {
    lines.push('  □ Does the confined space change/degrade?');
    lines.push('  □ Are there external connections (phone, radio)?');
    lines.push('  □ Are there discoveries within the space?');
  } else {
    lines.push(`  □ At least ${profile.locations.minLocationsPerChapter} location(s) per chapter?`);
    lines.push(`  □ Total distinct locations >= ${profile.locations.minDistinctLocationsPerBook}?`);
    lines.push('  □ Location variety (indoor/outdoor, public/private)?');
  }

  // Character checks
  lines.push('');
  lines.push('CHARACTER VARIETY:');
  if (profile.characters.scope === 'solo') {
    lines.push('  □ External voices in every chapter?');
    lines.push('  □ Different contacts/memories across chapters?');
  } else {
    lines.push(`  □ At least ${profile.characters.minCharactersPerChapter} characters per chapter?`);
    lines.push(`  □ ${profile.characters.minNewCharactersPerBook} new characters introduced?`);
    lines.push('  □ Character rotation (not always same combo)?');
  }

  // Pacing checks
  lines.push('');
  lines.push('PACING:');
  if (profile.pacing.requiresEscalation) {
    lines.push('  □ Stakes escalate across chapters?');
  }
  if (dna.timeProfile.hasDeadline) {
    lines.push('  □ Countdown pressure felt throughout?');
  }
  lines.push(`  □ Chapter endings are ${profile.pacing.chapterEndingRequirement}?`);

  // Forbidden check
  lines.push('');
  lines.push('FORBIDDEN VIOLATIONS:');
  for (const item of profile.forbidden) {
    lines.push(`  □ Does NOT include: ${item}`);
  }

  return lines.join('\n');
}

// =============================================================================
// EXPORT INDEX
// =============================================================================

export function buildIndex(): string {
  return `
/**
 * Index file for dynamism system
 */
export * from './story-dna';
export * from './dynamism-profile';
export * from './outline-requirements';
export * from './dynamism-tracker';
`;
}
