/**
 * Dialogue Polish - Attribution Fixer
 *
 * Fixes common AI dialogue patterns:
 * - Overuse of fancy tags ("exclaimed", "declared", "queried")
 * - Adverb-heavy attribution ("said angrily", "said quietly")
 * - Missing action beats
 * - Name overuse in dialogue tags
 *
 * Rules:
 * - Replace fancy verbs with "said" (Elmore Leonard rule)
 * - Convert adverbs to action beats
 * - In 2-person scenes, drop some attributions entirely
 * - Add occasional action beats for rhythm
 */

export interface DialoguePolishConfig {
  maxFancyTagsPerPage: number;       // Max non-"said" tags (default: 2)
  removeAdverbs: boolean;            // Convert adverbs to action beats (default: true)
  dropAttributionIn2Person: boolean; // Remove some tags in 2-person scenes (default: true)
  preserveWhisperShout: boolean;     // Keep "whispered" and "shouted" (default: true)
  applyUnderstatement: boolean;      // Detect high-tension and inject dry observations (default: true)
}

export interface DialoguePolishResult {
  content: string;
  changes: DialogueChange[];
  metrics: {
    fancyTagsReplaced: number;
    adverbsConverted: number;
    attributionsDropped: number;
    actionBeatsAdded: number;
    understatementsApplied: number;
  };
}

interface DialogueChange {
  type: 'fancy_tag' | 'adverb' | 'drop_attribution' | 'action_beat' | 'understatement';
  original: string;
  replacement: string;
  reason: string;
}

const DEFAULT_CONFIG: DialoguePolishConfig = {
  maxFancyTagsPerPage: 2,
  removeAdverbs: true,
  dropAttributionIn2Person: true,
  preserveWhisperShout: true,
  applyUnderstatement: true,
};

// Fancy dialogue tags to replace with "said"
const FANCY_TAGS: Record<string, string> = {
  'exclaimed': 'said',
  'declared': 'said',
  'announced': 'said',
  'proclaimed': 'said',
  'stated': 'said',
  'remarked': 'said',
  'noted': 'said',
  'observed': 'said',
  'commented': 'said',
  'mentioned': 'said',
  'added': 'said',
  'continued': 'said',
  'went on': 'said',
  'responded': 'said',
  'replied': 'said',
  'answered': 'said',
  'retorted': 'said',
  'countered': 'said',
  'interjected': 'said',
  'interrupted': 'said',
  'queried': 'asked',
  'inquired': 'asked',
  'questioned': 'asked',
  'demanded': 'asked',
  'wondered aloud': 'asked',
  'admitted': 'said',
  'confessed': 'said',
  'revealed': 'said',
  'disclosed': 'said',
  'conceded': 'said',
  'agreed': 'said',
  'acknowledged': 'said',
  'asserted': 'said',
  'insisted': 'said',
  'maintained': 'said',
  'affirmed': 'said',
  'confirmed': 'said',
  'objected': 'said',
  'protested': 'said',
  'argued': 'said',
  'snapped': 'said',
  'barked': 'said',
  'growled': 'said',
  'snarled': 'said',
  'hissed': 'said',
  'spat': 'said',
  'muttered': 'said',
  'mumbled': 'said',
  'murmured': 'said',
  'breathed': 'said',
  'sighed': 'said',
  'groaned': 'said',
  'moaned': 'said',
  'gasped': 'said',
  'choked': 'said',
  'stammered': 'said',
  'stuttered': 'said',
  'blurted': 'said',
  'gushed': 'said',
  'cooed': 'said',
  'purred': 'said',
  'chirped': 'said',
  'sang': 'said',
  'chanted': 'said',
  'recited': 'said',
  'quoted': 'said',
  'joked': 'said',
  'teased': 'said',
  'mocked': 'said',
  'taunted': 'said',
  'sneered': 'said',
  'scoffed': 'said',
  'laughed': 'said',
  'chuckled': 'said',
  'giggled': 'said',
  'snickered': 'said',
  'bellowed': 'shouted',
  'yelled': 'shouted',
  'screamed': 'shouted',
  'shrieked': 'shouted',
  'cried': 'said',
  'wailed': 'said',
  'sobbed': 'said',
  'whimpered': 'said',
  'pleaded': 'said',
  'begged': 'said',
  'implored': 'said',
  'urged': 'said',
  'encouraged': 'said',
  'reassured': 'said',
  'comforted': 'said',
  'soothed': 'said',
  'cautioned': 'said',
  'warned': 'said',
  'threatened': 'said',
  'promised': 'said',
  'vowed': 'said',
  'swore': 'said',
  'lied': 'said',
  'fibbed': 'said',
  'boasted': 'said',
  'bragged': 'said',
  'exaggerated': 'said',
  'elaborated': 'said',
  'explained': 'said',
  'clarified': 'said',
  'specified': 'said',
  'pointed out': 'said',
  'reminded': 'said',
  'recalled': 'said',
  'remembered': 'said',
  'reflected': 'said',
  'mused': 'said',
  'pondered': 'said',
  'considered': 'said',
  'speculated': 'said',
  'theorized': 'said',
  'hypothesized': 'said',
  'suggested': 'said',
  'proposed': 'said',
  'offered': 'said',
  'volunteered': 'said',
};

// Tags to preserve (they carry meaning)
const PRESERVE_TAGS = new Set(['whispered', 'shouted', 'asked', 'said']);

// Adverbs that should be converted to action beats
const ADVERB_CONVERSIONS: Record<string, string> = {
  'angrily': 'His jaw tightened.',
  'quietly': 'Her voice dropped.',
  'nervously': 'He shifted his weight.',
  'sadly': 'Her eyes glistened.',
  'happily': 'A smile crossed her face.',
  'excitedly': 'He leaned forward.',
  'softly': 'Her voice was barely audible.',
  'loudly': 'His voice carried across the room.',
  'quickly': 'The words tumbled out.',
  'slowly': 'He took his time.',
  'hesitantly': 'She paused before speaking.',
  'firmly': 'Her voice held steady.',
  'coldly': 'There was no warmth in the words.',
  'warmly': 'Kindness softened the words.',
  'bitterly': 'The words held an edge.',
  'sarcastically': 'The tone was unmistakable.',
  'wearily': 'Exhaustion colored the words.',
  'impatiently': 'Frustration crept into the voice.',
  'dismissively': 'A wave of the hand accompanied the words.',
  'thoughtfully': 'A pause preceded the words.',
  'carefully': 'Each word was measured.',
  'urgently': 'There was no time to waste.',
  'pleadingly': 'Desperation filled the words.',
  'mockingly': 'The tone dripped with disdain.',
  'defensively': 'His shoulders stiffened.',
  'accusingly': 'Her eyes narrowed.',
  'apologetically': 'His gaze dropped.',
  'confidently': 'She met his eyes.',
  'uncertainly': 'Doubt crept into the voice.',
  'hopefully': 'Something lifted in the words.',
  'desperately': 'Need colored every syllable.',
  'triumphantly': 'Victory rang in the words.',
  'reluctantly': 'The words came slowly.',
  'enthusiastically': 'Energy filled the response.',
  'curiously': 'Interest sparked in the eyes.',
  'suspiciously': 'Wariness crept into the tone.',
  'tenderly': 'Gentleness softened the words.',
  'harshly': 'The words cut like glass.',
  'gently': 'The voice was soft.',
  'fiercely': 'Intensity blazed in the words.',
  'casually': 'The tone was light.',
  'seriously': 'Weight settled over the words.',
  'playfully': 'Mischief danced in the tone.',
  'dryly': 'The voice was flat.',
  'smoothly': 'The words flowed easily.',
  'gruffly': 'The voice was rough.',
  'sweetly': 'Honey coated the words.',
};

// =============================================================================
// UNDERSTATEMENT FILTER - Dry Humor & British Wit
// =============================================================================
// AI writing tends toward melodrama: "Tears streamed! Hearts pounded!"
// Human writing often undercuts high emotion with dry observation.
// The understatement creates dark humor and trusts readers to infer emotion.

// High-tension patterns to detect (melodramatic moments)
const HIGH_TENSION_PATTERNS: { pattern: RegExp; tensionType: string }[] = [
  // Screaming/shouting
  { pattern: /\b(screamed|shrieked|yelled|bellowed)\s+(in|with)?\s*(terror|fear|rage|anger|pain)/gi, tensionType: 'screaming' },
  { pattern: /\blet\s+out\s+a\s+(blood-?curdling|piercing|terrible)\s+(scream|shriek|cry)/gi, tensionType: 'screaming' },
  // Crying/weeping
  { pattern: /\b(tears|sobbed|wept)\s+(streamed|flowed|poured|ran)\s+down/gi, tensionType: 'crying' },
  { pattern: /\bcried\s+(uncontrollably|hysterically|bitterly)/gi, tensionType: 'crying' },
  { pattern: /\bburst\s+(into|out)\s+(tears|sobbing|crying)/gi, tensionType: 'crying' },
  // Physical panic
  { pattern: /\bheart\s+(pounded|raced|hammered)\s+(wildly|furiously|violently|in\s+(?:his|her)\s+chest)/gi, tensionType: 'panic' },
  { pattern: /\bcouldn't\s+(breathe|catch\s+(?:his|her)\s+breath)/gi, tensionType: 'panic' },
  { pattern: /\bblood\s+(ran\s+cold|turned\s+to\s+ice|froze)/gi, tensionType: 'fear' },
  // Extreme emotion statements
  { pattern: /\bfelt\s+like\s+(?:his|her)\s+(world|heart|soul)\s+(was\s+)?(shattering|breaking|dying|ending)/gi, tensionType: 'melodrama' },
  { pattern: /\b(agony|anguish)\s+(tore|ripped|burned)\s+through/gi, tensionType: 'melodrama' },
  { pattern: /\bevery\s+(fiber|part|inch)\s+of\s+(?:his|her)\s+(being|body|soul)/gi, tensionType: 'melodrama' },
];

// Dry observations to inject after high-tension moments (genre-aware)
const DRY_OBSERVATIONS: Record<string, string[]> = {
  // After screaming/shouting
  screaming: [
    'The sound hung in the air like bad karaoke.',
    'Somewhere, a dog barked in response.',
    'The neighbors would have opinions about this later.',
    'It was, objectively, a lot.',
    'Not the dignified exit one might have hoped for.',
  ],
  // After crying
  crying: [
    'Mascara, as always, was the first casualty.',
    'The tissue supply was insufficient.',
    "It wasn't pretty, but few breakdowns are.",
    'Snot, unfortunately, has no respect for dramatic moments.',
    'The ugly cry was in full effect.',
  ],
  // After panic/fear
  panic: [
    'This was, perhaps, an overreaction. Perhaps not.',
    'The body, as usual, had overridden good sense.',
    'Fight or flight chose flight, then reconsidered.',
    "Breathing exercises existed for situations like this. She'd never learned them.",
    'Calm was an abstract concept now.',
  ],
  fear: [
    'A reasonable response, all things considered.',
    'The survival instinct was working overtime.',
    "This was the body's way of saying: handle it.",
    'Common sense suggested leaving. Pride suggested otherwise.',
  ],
  // General melodrama deflation
  melodrama: [
    'The drama of it all would have been impressive, if anyone was watching.',
    "It felt significant. It probably wasn't.",
    'Life, unfortunately, continued regardless.',
    'The universe remained, as always, indifferent.',
    'This too would become a funny story. Eventually.',
  ],
};

/**
 * Apply understatement filter to high-tension passages.
 * Detects melodramatic moments and injects dry observations.
 */
function applyUnderstatementFilter(
  text: string,
  maxPerPage: number = 2
): { content: string; applied: number; changes: DialogueChange[] } {
  let content = text;
  let applied = 0;
  const changes: DialogueChange[] = [];

  // Count pages (rough: ~300 words per page)
  const wordCount = content.split(/\\s+/).length;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 300));
  const maxTotal = maxPerPage * estimatedPages;

  for (const { pattern, tensionType } of HIGH_TENSION_PATTERNS) {
    if (applied >= maxTotal) break;

    // Reset pattern index for global regex
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(content)) !== null && applied < maxTotal) {
      const original = match[0];

      // Get a dry observation for this tension type
      const observations = DRY_OBSERVATIONS[tensionType] || DRY_OBSERVATIONS.melodrama;
      const observation = observations[Math.floor(Math.random() * observations.length)];

      // Find the end of the sentence containing the match
      const matchEnd = match.index + original.length;
      const remainingText = content.slice(matchEnd);
      const sentenceEndMatch = remainingText.match(/^[^.!?]*[.!?]/);

      if (sentenceEndMatch) {
        // Insert the dry observation after the sentence ends
        const sentenceEnd = matchEnd + sentenceEndMatch[0].length;
        const before = content.slice(0, sentenceEnd);
        const after = content.slice(sentenceEnd);

        // Add the dry observation as a new sentence
        const replacement = `${before} ${observation}${after}`;

        // Only apply if we haven't already added an observation nearby
        if (!after.slice(0, 100).includes(observation.slice(0, 20))) {
          content = replacement;

          changes.push({
            type: 'understatement',
            original: content.slice(match.index, sentenceEnd),
            replacement: `${before.slice(match.index)} ${observation}`,
            reason: `Deflate melodrama (${tensionType}) with dry observation`,
          });

          applied++;

          // Update pattern's lastIndex due to content length change
          pattern.lastIndex = sentenceEnd + observation.length + 1;
        }
      }
    }
  }

  return { content, applied, changes };
}

/**
 * Polish dialogue tags and attribution.
 */
export function polishDialogue(
  text: string,
  config: Partial<DialoguePolishConfig> = {}
): DialoguePolishResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const changes: DialogueChange[] = [];

  let content = text;
  let fancyReplaced = 0;
  let adverbsConverted = 0;
  let attributionsDropped = 0;
  let actionBeatsAdded = 0;

  // Count pages (rough: ~300 words per page)
  const wordCount = content.split(/\s+/).length;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 300));
  const maxFancyTotal = cfg.maxFancyTagsPerPage * estimatedPages;

  // Step 1: Replace fancy tags
  let fancyCount = 0;
  for (const [fancy, replacement] of Object.entries(FANCY_TAGS)) {
    // Skip preserved tags
    if (cfg.preserveWhisperShout && (replacement === 'whispered' || replacement === 'shouted')) {
      continue;
    }

    // Pattern to match: "dialogue," NAME fancy or NAME fancy, "dialogue"
    const patterns = [
      new RegExp(`(["'].*?["'],?\\s*\\w+\\s+)${fancy}(\\b)`, 'gi'),
      new RegExp(`(\\w+\\s+)${fancy}(,?\\s*["'])`, 'gi'),
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        fancyCount++;
        if (fancyCount > maxFancyTotal) {
          // Replace with simple tag
          const original = match[0];
          const newContent = match[0].replace(new RegExp(fancy, 'gi'), replacement);
          content = content.replace(original, newContent);
          changes.push({
            type: 'fancy_tag',
            original: fancy,
            replacement,
            reason: `Exceeded ${cfg.maxFancyTagsPerPage} fancy tags per page`,
          });
          fancyReplaced++;
        }
      }
    }
  }

  // Step 2: Convert adverbs to action beats
  if (cfg.removeAdverbs) {
    for (const [adverb, actionBeat] of Object.entries(ADVERB_CONVERSIONS)) {
      // Match patterns like "said angrily" or "angrily said"
      const patterns = [
        new RegExp(`(said|asked|replied|whispered|shouted)\\s+${adverb}(\\.?)`, 'gi'),
        new RegExp(`${adverb}\\s+(said|asked|replied|whispered|shouted)`, 'gi'),
      ];

      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Extract the base verb
            const verbMatch = match.match(/(said|asked|replied|whispered|shouted)/i);
            const verb = verbMatch ? verbMatch[1] : 'said';

            // Replace with verb + action beat
            const replacement = `${verb}. ${actionBeat}`;
            content = content.replace(match, replacement);
            changes.push({
              type: 'adverb',
              original: match,
              replacement,
              reason: 'Converting adverb to action beat',
            });
            adverbsConverted++;
          }
        }
      }
    }
  }

  // Step 3: In 2-person scenes, drop some attributions
  if (cfg.dropAttributionIn2Person) {
    // Detect 2-person dialogues (alternating speakers)
    const result = dropRedundantAttributions(content);
    content = result.content;
    attributionsDropped = result.dropped;
    changes.push(...result.changes);
  }

  // Step 4: Apply understatement filter to melodramatic passages
  let understatementsApplied = 0;
  if (cfg.applyUnderstatement) {
    const understatementResult = applyUnderstatementFilter(content);
    content = understatementResult.content;
    understatementsApplied = understatementResult.applied;
    changes.push(...understatementResult.changes);
  }

  return {
    content,
    changes,
    metrics: {
      fancyTagsReplaced: fancyReplaced,
      adverbsConverted,
      attributionsDropped,
      actionBeatsAdded,
      understatementsApplied,
    },
  };
}

/**
 * Drop redundant attributions in clear back-and-forth dialogue.
 */
function dropRedundantAttributions(text: string): {
  content: string;
  dropped: number;
  changes: DialogueChange[];
} {
  const changes: DialogueChange[] = [];
  let content = text;
  let dropped = 0;

  // Find dialogue sequences
  // Pattern: "dialogue," NAME said. "response," OTHER said.
  const dialoguePattern = /"[^"]+",?\s+(\w+)\s+(said|asked|replied)\./g;
  const matches = [...content.matchAll(dialoguePattern)];

  // Group into exchanges
  const speakers: string[] = [];
  for (const match of matches) {
    speakers.push(match[1].toLowerCase());
  }

  // If only 2 speakers alternating, we can drop some attributions
  const uniqueSpeakers = [...new Set(speakers)];
  if (uniqueSpeakers.length === 2) {
    // Drop every other attribution (keep first and last)
    let dropCount = 0;
    const droppable = matches.filter((_, i) => i > 0 && i < matches.length - 1 && i % 2 === 1);

    for (const match of droppable) {
      if (dropCount >= 2) break; // Don't drop too many

      const fullMatch = match[0];
      // Extract just the dialogue part
      const dialoguePart = fullMatch.match(/"[^"]+"/)?.[0];
      if (dialoguePart) {
        // Replace "dialogue," NAME said. with just "dialogue."
        const newText = dialoguePart.replace(/,\s*$/, '') + '.';
        content = content.replace(fullMatch, newText);
        changes.push({
          type: 'drop_attribution',
          original: fullMatch,
          replacement: newText,
          reason: 'Clear speaker in 2-person dialogue',
        });
        dropped++;
        dropCount++;
      }
    }
  }

  return { content, dropped, changes };
}

/**
 * Quick check: count fancy dialogue tags.
 */
export function countFancyTags(text: string): number {
  let count = 0;
  for (const fancy of Object.keys(FANCY_TAGS)) {
    const pattern = new RegExp(`\\b${fancy}\\b`, 'gi');
    const matches = text.match(pattern) || [];
    count += matches.length;
  }
  return count;
}

/**
 * Quick check: count dialogue adverbs.
 */
export function countDialogueAdverbs(text: string): number {
  let count = 0;
  for (const adverb of Object.keys(ADVERB_CONVERSIONS)) {
    const pattern = new RegExp(`(said|asked|replied|whispered|shouted)\\s+${adverb}\\b`, 'gi');
    const matches = text.match(pattern) || [];
    count += matches.length;
  }
  return count;
}

export { DEFAULT_CONFIG as DIALOGUE_POLISH_DEFAULTS };
// Note: DialoguePolishConfig and DialoguePolishResult are exported at their definitions
export type { DialogueChange };
