/**
 * Chaos Seed System - Controlled Randomness for Human Feel
 *
 * AI is predictable because it calculates the "most probable" next word.
 * This system introduces controlled noise - random sensory distractions
 * and irrational impulses that have nothing to do with the plot.
 *
 * The goal: Force characters to notice the "messy" parts of reality.
 */

import { type BookFormat } from './format-config';

export interface ChaosSeed {
  type: 'sensory' | 'memory' | 'physical' | 'environmental';
  content: string;
  promptInjection: string;
  intensity: 'subtle' | 'noticeable' | 'intrusive';
}

export interface ChaosConfig {
  enabled: boolean;
  frequency: number;           // 0-1: Probability of including a chaos seed per beat
  maxPerChapter: number;       // Don't overdo it
  preferredTypes: ChaosSeed['type'][];
  intensity: ChaosSeed['intensity'];
}

// =============================================================================
// CHAOS SEED POOLS BY TYPE
// =============================================================================

const SENSORY_SEEDS: Omit<ChaosSeed, 'promptInjection'>[] = [
  // Smell
  { type: 'sensory', content: 'the smell of burnt toast', intensity: 'subtle' },
  { type: 'sensory', content: 'a whiff of gasoline', intensity: 'noticeable' },
  { type: 'sensory', content: 'the faint scent of someone else\'s perfume', intensity: 'subtle' },
  { type: 'sensory', content: 'the smell of rain on hot concrete', intensity: 'subtle' },
  { type: 'sensory', content: 'a metallic taste in the mouth', intensity: 'noticeable' },
  { type: 'sensory', content: 'the smell of old books', intensity: 'subtle' },
  { type: 'sensory', content: 'cigarette smoke from somewhere nearby', intensity: 'noticeable' },
  { type: 'sensory', content: 'the smell of fresh paint', intensity: 'noticeable' },
  { type: 'sensory', content: 'coffee that\'s been sitting too long', intensity: 'subtle' },
  { type: 'sensory', content: 'the smell of chlorine', intensity: 'subtle' },

  // Touch/Texture
  { type: 'sensory', content: 'a tightness in the left boot', intensity: 'subtle' },
  { type: 'sensory', content: 'a persistent itch on the ankle', intensity: 'noticeable' },
  { type: 'sensory', content: 'the steering wheel sticky with old coffee', intensity: 'subtle' },
  { type: 'sensory', content: 'a shirt tag scratching the neck', intensity: 'subtle' },
  { type: 'sensory', content: 'cold sweat between shoulder blades', intensity: 'noticeable' },
  { type: 'sensory', content: 'grit under fingernails', intensity: 'subtle' },
  { type: 'sensory', content: 'a loose thread on the cuff', intensity: 'subtle' },
  { type: 'sensory', content: 'the rough texture of unshaved skin', intensity: 'subtle' },
  { type: 'sensory', content: 'a splinter just under the skin', intensity: 'noticeable' },
  { type: 'sensory', content: 'the cold metal of a belt buckle', intensity: 'subtle' },

  // Sound
  { type: 'sensory', content: 'a distant dog barking in a specific rhythm', intensity: 'subtle' },
  { type: 'sensory', content: 'a fluorescent light humming overhead', intensity: 'subtle' },
  { type: 'sensory', content: 'someone\'s stomach growling nearby', intensity: 'noticeable' },
  { type: 'sensory', content: 'a car alarm in the distance that no one turns off', intensity: 'noticeable' },
  { type: 'sensory', content: 'the ticking of a clock that shouldn\'t be audible', intensity: 'subtle' },
  { type: 'sensory', content: 'a phone vibrating somewhere in the room', intensity: 'noticeable' },
  { type: 'sensory', content: 'the sound of water in old pipes', intensity: 'subtle' },
  { type: 'sensory', content: 'footsteps in the floor above', intensity: 'subtle' },
  { type: 'sensory', content: 'a helicopter passing overhead', intensity: 'noticeable' },
  { type: 'sensory', content: 'static from an old radio', intensity: 'subtle' },

  // Temperature
  { type: 'sensory', content: 'a draft from somewhere unseen', intensity: 'subtle' },
  { type: 'sensory', content: 'the heat of the sun on the back of the neck', intensity: 'noticeable' },
  { type: 'sensory', content: 'cold air from a vent directly overhead', intensity: 'noticeable' },
  { type: 'sensory', content: 'the warmth of a recently vacated chair', intensity: 'subtle' },
  { type: 'sensory', content: 'feet going numb from the cold floor', intensity: 'noticeable' },
];

const MEMORY_SEEDS: Omit<ChaosSeed, 'promptInjection'>[] = [
  { type: 'memory', content: 'a childhood embarrassment', intensity: 'intrusive' },
  { type: 'memory', content: 'an unanswered text from three days ago', intensity: 'subtle' },
  { type: 'memory', content: 'a song that won\'t stop playing in the head', intensity: 'noticeable' },
  { type: 'memory', content: 'a forgotten appointment', intensity: 'intrusive' },
  { type: 'memory', content: 'the face of someone from years ago', intensity: 'subtle' },
  { type: 'memory', content: 'a dream from the night before', intensity: 'subtle' },
  { type: 'memory', content: 'something that was supposed to be brought but wasn\'t', intensity: 'noticeable' },
  { type: 'memory', content: 'an argument that could have gone differently', intensity: 'intrusive' },
  { type: 'memory', content: 'the last thing a parent said', intensity: 'intrusive' },
  { type: 'memory', content: 'a password that can\'t be remembered', intensity: 'subtle' },
  { type: 'memory', content: 'a cringe-worthy thing said at a party years ago', intensity: 'intrusive' },
  { type: 'memory', content: 'where the car is parked', intensity: 'subtle' },
];

const PHYSICAL_SEEDS: Omit<ChaosSeed, 'promptInjection'>[] = [
  { type: 'physical', content: 'a sudden craving for salt', intensity: 'subtle' },
  { type: 'physical', content: 'the need to crack knuckles', intensity: 'subtle' },
  { type: 'physical', content: 'a yawn that won\'t complete', intensity: 'noticeable' },
  { type: 'physical', content: 'dry lips', intensity: 'subtle' },
  { type: 'physical', content: 'hunger that was ignored too long', intensity: 'noticeable' },
  { type: 'physical', content: 'the urge to use the bathroom', intensity: 'noticeable' },
  { type: 'physical', content: 'a headache starting behind the eyes', intensity: 'noticeable' },
  { type: 'physical', content: 'a sneeze that won\'t come', intensity: 'subtle' },
  { type: 'physical', content: 'exhaustion in the shoulders', intensity: 'subtle' },
  { type: 'physical', content: 'a cramp threatening in the calf', intensity: 'noticeable' },
  { type: 'physical', content: 'eyes that need to be rubbed', intensity: 'subtle' },
  { type: 'physical', content: 'teeth that need to be brushed', intensity: 'subtle' },
];

const ENVIRONMENTAL_SEEDS: Omit<ChaosSeed, 'promptInjection'>[] = [
  { type: 'environmental', content: 'a fly that won\'t leave', intensity: 'noticeable' },
  { type: 'environmental', content: 'a crooked picture frame', intensity: 'subtle' },
  { type: 'environmental', content: 'a flickering light', intensity: 'noticeable' },
  { type: 'environmental', content: 'a door left slightly ajar', intensity: 'subtle' },
  { type: 'environmental', content: 'a chair with one short leg', intensity: 'subtle' },
  { type: 'environmental', content: 'a stain on the ceiling', intensity: 'subtle' },
  { type: 'environmental', content: 'a plant that needs watering', intensity: 'subtle' },
  { type: 'environmental', content: 'a window streaked with old rain', intensity: 'subtle' },
  { type: 'environmental', content: 'a pen that\'s out of ink', intensity: 'noticeable' },
  { type: 'environmental', content: 'a clock showing the wrong time', intensity: 'subtle' },
  { type: 'environmental', content: 'someone\'s belongings left behind', intensity: 'noticeable' },
  { type: 'environmental', content: 'a coffee ring on the table', intensity: 'subtle' },
];

// =============================================================================
// FORMAT-SPECIFIC SEED POOLS
// =============================================================================

// Screenplays need VISUAL seeds (no internal thoughts)
const SCREENPLAY_SEEDS: Omit<ChaosSeed, 'promptInjection'>[] = [
  // Visual distractions
  { type: 'environmental', content: 'adjusts collar repeatedly', intensity: 'subtle' },
  { type: 'environmental', content: 'glances at watch three times', intensity: 'noticeable' },
  { type: 'physical', content: 'rubs the back of neck', intensity: 'subtle' },
  { type: 'physical', content: 'picks at a hangnail', intensity: 'subtle' },
  { type: 'environmental', content: 'straightens papers that don\'t need straightening', intensity: 'subtle' },
  { type: 'physical', content: 'blinks rapidly', intensity: 'subtle' },
  { type: 'environmental', content: 'checks phone, puts it back without looking', intensity: 'noticeable' },
  { type: 'physical', content: 'cracks neck', intensity: 'noticeable' },
  { type: 'environmental', content: 'moves object from one spot to another', intensity: 'subtle' },
  { type: 'physical', content: 'touches face unconsciously', intensity: 'subtle' },
];

// Comics need VISUAL + SOUND EFFECT seeds
const COMIC_SEEDS: Omit<ChaosSeed, 'promptInjection'>[] = [
  { type: 'sensory', content: '*SKRITCH* (scratching sound)', intensity: 'noticeable' },
  { type: 'sensory', content: '*KLIK KLIK* (pen clicking)', intensity: 'subtle' },
  { type: 'environmental', content: 'background character drops something', intensity: 'noticeable' },
  { type: 'sensory', content: '*BZZZZ* (phone vibrating)', intensity: 'noticeable' },
  { type: 'physical', content: 'character yawns in background', intensity: 'subtle' },
  { type: 'environmental', content: 'bird lands on windowsill', intensity: 'subtle' },
  { type: 'sensory', content: '*DRIP DRIP* (leaky faucet)', intensity: 'subtle' },
  { type: 'environmental', content: 'newspaper blows across scene', intensity: 'noticeable' },
];

// =============================================================================
// CHAOS SEED GENERATOR
// =============================================================================

/**
 * Get a random chaos seed appropriate for the format.
 */
export function getChaosSeed(
  format: BookFormat,
  config: Partial<ChaosConfig> = {},
  usedSeeds: string[] = []
): ChaosSeed | null {
  const fullConfig: ChaosConfig = {
    enabled: true,
    frequency: 0.6,                    // 60% chance per beat
    maxPerChapter: 5,
    preferredTypes: ['sensory', 'physical', 'environmental'],
    intensity: 'subtle',
    ...config,
  };

  if (!fullConfig.enabled) return null;

  // Roll for frequency
  if (Math.random() > fullConfig.frequency) return null;

  // Get format-appropriate seed pool
  let seedPool: Omit<ChaosSeed, 'promptInjection'>[];

  switch (format) {
    case 'screenplay':
      seedPool = SCREENPLAY_SEEDS;
      break;
    case 'comic':
    case 'picture_book':
      seedPool = COMIC_SEEDS;
      break;
    default:
      // Books get the full pool
      seedPool = [
        ...SENSORY_SEEDS,
        ...MEMORY_SEEDS,
        ...PHYSICAL_SEEDS,
        ...ENVIRONMENTAL_SEEDS,
      ].filter(s => fullConfig.preferredTypes.includes(s.type));
  }

  // Filter by intensity
  if (fullConfig.intensity === 'subtle') {
    seedPool = seedPool.filter(s => s.intensity === 'subtle');
  } else if (fullConfig.intensity === 'noticeable') {
    seedPool = seedPool.filter(s => s.intensity !== 'intrusive');
  }
  // 'intrusive' allows all

  // Filter out already-used seeds
  seedPool = seedPool.filter(s => !usedSeeds.includes(s.content));

  if (seedPool.length === 0) return null;

  // Random selection
  const selected = seedPool[Math.floor(Math.random() * seedPool.length)];

  // Build prompt injection based on format
  const promptInjection = buildPromptInjection(selected, format);

  return {
    ...selected,
    promptInjection,
  };
}

/**
 * Build the prompt injection for a chaos seed.
 */
function buildPromptInjection(
  seed: Omit<ChaosSeed, 'promptInjection'>,
  format: BookFormat
): string {
  switch (format) {
    case 'screenplay':
      return `
GROUNDING DETAIL: Include this action beat in the scene: "${seed.content}"
This is NOT a plot point - it's human texture. Show it briefly in action lines.`;

    case 'comic':
    case 'picture_book':
      return `
PANEL TEXTURE: Include this visual/sound detail: "${seed.content}"
This grounds the scene in reality. Can be background detail or SFX.`;

    default:
      // Books
      if (seed.type === 'memory') {
        return `
INTRUSIVE THOUGHT: The POV character briefly thinks about ${seed.content}.
This is NOT narration - it's an unbidden thought that crosses their mind.
One sentence maximum. It does NOT advance the plot.`;
      }

      if (seed.type === 'physical') {
        return `
BODY AWARENESS: The POV character notices ${seed.content}.
This grounds them in their body. One brief mention, not dwelt upon.`;
      }

      if (seed.type === 'sensory') {
        return `
SENSORY ANCHOR: Include this sensory detail: "${seed.content}"
This is atmosphere, not plot. Weave it naturally into a single sentence.`;
      }

      return `
ENVIRONMENTAL TEXTURE: Include this detail: "${seed.content}"
This grounds the scene in reality. Brief mention only.`;
  }
}

/**
 * Get default chaos config for a format.
 */
export function getDefaultChaosConfig(format: BookFormat): ChaosConfig {
  switch (format) {
    case 'screenplay':
      return {
        enabled: true,
        frequency: 0.4,              // Less frequent in scripts
        maxPerChapter: 3,            // Sequences are shorter
        preferredTypes: ['physical', 'environmental'],  // Visual only
        intensity: 'subtle',
      };

    case 'comic':
    case 'picture_book':
      return {
        enabled: true,
        frequency: 0.3,              // Even less - limited panel space
        maxPerChapter: 2,
        preferredTypes: ['sensory', 'environmental'],
        intensity: 'subtle',
      };

    case 'children':
      return {
        enabled: true,
        frequency: 0.5,
        maxPerChapter: 4,
        preferredTypes: ['sensory', 'environmental'],  // No intrusive thoughts for kids
        intensity: 'subtle',
      };

    default:
      // Adult books get the full treatment
      return {
        enabled: true,
        frequency: 0.6,
        maxPerChapter: 5,
        preferredTypes: ['sensory', 'memory', 'physical', 'environmental'],
        intensity: 'noticeable',
      };
  }
}

/**
 * Build chaos seed prompt section for beat context.
 */
export function buildChaosSeedPrompt(
  format: BookFormat,
  beatNumber: number,
  usedSeeds: string[],
  config?: Partial<ChaosConfig>
): { prompt: string; usedSeed: string | null } {
  // Get config for format
  const fullConfig = { ...getDefaultChaosConfig(format), ...config };

  // Check if we've hit max for this chapter
  if (usedSeeds.length >= fullConfig.maxPerChapter) {
    return { prompt: '', usedSeed: null };
  }

  // Try to get a seed
  const seed = getChaosSeed(format, fullConfig, usedSeeds);

  if (!seed) {
    return { prompt: '', usedSeed: null };
  }

  return {
    prompt: seed.promptInjection,
    usedSeed: seed.content,
  };
}

// Export types and defaults
export { SENSORY_SEEDS, MEMORY_SEEDS, PHYSICAL_SEEDS, ENVIRONMENTAL_SEEDS };
