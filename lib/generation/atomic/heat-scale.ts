/**
 * Heat Scale System - Content Heat Reduction
 *
 * Intelligent content scaling for when content gets blocked by safety filters.
 * Instead of word-swapping (which produces corporate euphemisms), this system:
 * - Focuses on psychological tension over physical detail
 * - Uses sensory atmosphere (smells, sounds, textures)
 * - Implies rather than describes
 * - Maintains emotional rawness while removing explicit content
 *
 * The goal is HEAT without EXPLICIT ANATOMY.
 */

export type HeatLevel = 'blocked' | 'hot' | 'warm' | 'safe';

export type ContentType = 'violence' | 'romance' | 'horror' | 'trauma' | 'general';

export interface HeatReductionResult {
  originalHeatLevel: HeatLevel;
  targetHeatLevel: HeatLevel;
  instructions: string;
  focusAreas: string[];
  avoidAreas: string[];
}

/**
 * Corporate euphemisms to avoid and their gritty replacements.
 * After sanitization, we restore authentic language.
 */
const CORPORATE_TO_GRIT: Record<string, string> = {
  'intimate area': 'body',
  'intimate areas': 'bodies',
  'personal space': 'space',
  'physical intimacy': 'closeness',
  'made love': 'were together',
  'consummated': 'were together',
  'pleasured': 'touched',
  'stimulated': 'touched',
  'aroused state': 'tension',
  'intimate encounter': 'night together',
  'physical union': 'closeness',
  'carnal desires': 'want',
  'passionate embrace': 'embrace',
  'tender moment': 'moment',
  'special connection': 'connection',
  'private moment': 'moment',
  'adult content': 'scene',
  'mature themes': 'darkness',
  'explicit content': 'rawness',
};

/**
 * Get heat reduction instructions based on what was blocked.
 */
export function getHeatReductionInstructions(
  contentType: ContentType,
  previouslyBlocked: boolean,
  currentHeatLevel: HeatLevel
): HeatReductionResult {
  if (!previouslyBlocked) {
    return {
      originalHeatLevel: 'safe',
      targetHeatLevel: 'safe',
      instructions: '',
      focusAreas: [],
      avoidAreas: [],
    };
  }

  const result: HeatReductionResult = {
    originalHeatLevel: currentHeatLevel,
    targetHeatLevel: reduceHeatLevel(currentHeatLevel),
    instructions: '',
    focusAreas: [],
    avoidAreas: [],
  };

  switch (contentType) {
    case 'romance':
      result.instructions = getRomanceHeatInstructions(currentHeatLevel);
      result.focusAreas = [
        'Emotional tension and anticipation',
        'Sensory details: warmth, scent, texture of skin',
        'The before and after, not the during',
        'Internal emotional experience',
        'Power dynamics and vulnerability',
      ];
      result.avoidAreas = [
        'Specific anatomical references',
        'Explicit physical mechanics',
        'Step-by-step descriptions',
        'Gratuitous detail',
      ];
      break;

    case 'violence':
      result.instructions = getViolenceHeatInstructions(currentHeatLevel);
      result.focusAreas = [
        'Psychological impact on characters',
        'Sound and sensory aftermath',
        'Emotional stakes and consequences',
        'The threat more than the act',
        'Character reactions and trauma',
      ];
      result.avoidAreas = [
        'Gratuitous gore details',
        'Torture descriptions',
        'Step-by-step brutality',
        'Sadistic framing',
      ];
      break;

    case 'horror':
      result.instructions = getHorrorHeatInstructions(currentHeatLevel);
      result.focusAreas = [
        'Atmospheric dread and tension',
        'What is NOT shown (imagination fills gaps)',
        'Psychological terror over physical',
        'Sound, shadow, suggestion',
        'Character vulnerability',
      ];
      result.avoidAreas = [
        'Explicit body horror details',
        'Gratuitous creature descriptions',
        'Torture or mutilation focus',
      ];
      break;

    case 'trauma':
      result.instructions = getTraumaHeatInstructions(currentHeatLevel);
      result.focusAreas = [
        'Emotional truth and impact',
        'Character coping and survival',
        'The healing journey',
        'Supportive relationships',
        'Hope and resilience',
      ];
      result.avoidAreas = [
        'Gratuitous flashback detail',
        'Re-traumatizing descriptions',
        'Exploitation of suffering',
      ];
      break;

    default:
      result.instructions = getGeneralHeatInstructions(currentHeatLevel);
      result.focusAreas = ['Emotional authenticity', 'Character-driven narrative'];
      result.avoidAreas = ['Gratuitous content', 'Shock value over story'];
  }

  return result;
}

/**
 * Build the heat scale prompt injection.
 */
export function buildHeatScalePrompt(
  contentType: ContentType,
  currentHeatLevel: HeatLevel,
  blockedAttempts: number
): string {
  if (blockedAttempts === 0) {
    return '';
  }

  const targetLevel = reduceHeatLevel(currentHeatLevel);
  const reductionInfo = getHeatReductionInstructions(contentType, true, currentHeatLevel);

  let prompt = `
=== CONTENT HEAT ADJUSTMENT (Attempt ${blockedAttempts + 1}) ===

The previous version was blocked by safety filters.
Target heat level: ${targetLevel.toUpperCase()}

${reductionInfo.instructions}

FOCUS ON:
${reductionInfo.focusAreas.map(f => `✓ ${f}`).join('\n')}

AVOID:
${reductionInfo.avoidAreas.map(a => `✗ ${a}`).join('\n')}

WRITING QUALITY REMINDERS:
- Keep emotional rawness intact: fear, desire, anger, desperation are allowed
- Visceral language is fine: sweat, blood, raw, ache, hunger, need
- DO NOT use corporate euphemisms like "intimate area" or "personal space"
- Implication is MORE powerful than description
- Trust the reader's imagination

`;

  // Add specific guidance based on attempt number
  if (blockedAttempts >= 2) {
    prompt += `
=== SIGNIFICANT DIAL-BACK REQUIRED ===
Multiple attempts have been blocked. Use maximum restraint:
- Fade to black is acceptable
- Focus entirely on emotional aftermath
- Time skip past the blocked content if necessary
- "The night was long and neither of them slept" = acceptable
`;
  }

  return prompt;
}

/**
 * Restore gritty language after AI sanitization.
 * Removes corporate euphemisms while keeping content safe.
 */
export function restoreGrit(text: string): string {
  let result = text;

  for (const [corporate, grit] of Object.entries(CORPORATE_TO_GRIT)) {
    // Case insensitive replacement
    const pattern = new RegExp(escapeRegex(corporate), 'gi');
    result = result.replace(pattern, grit);
  }

  // Also fix overly formal constructions
  const formalToNatural: Array<[RegExp, string]> = [
    [/engaged in (a )?passionate/gi, 'kissed'],
    [/found themselves in (a )?compromising/gi, 'were tangled together'],
    [/explored each other('s)?/gi, 'touched'],
    [/their bodies intertwined/gi, 'they were close'],
    [/physical connection deepened/gi, 'got closer'],
    [/surrendered to (the )?passion/gi, 'gave in'],
    [/the air grew thick with/gi, 'the room was heavy with'],
  ];

  for (const [pattern, replacement] of formalToNatural) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Detect if content was likely sanitized by AI safety.
 */
export function detectSanitizedContent(text: string): {
  wasSanitized: boolean;
  indicators: string[];
} {
  const indicators: string[] = [];

  // Check for corporate euphemisms
  for (const corporate of Object.keys(CORPORATE_TO_GRIT)) {
    if (text.toLowerCase().includes(corporate.toLowerCase())) {
      indicators.push(`Contains "${corporate}"`);
    }
  }

  // Check for fade-to-black markers
  const fadeMarkers = [
    /the scene faded/i,
    /time passed/i,
    /later that night/i,
    /when (she|he|they) woke/i,
    /the next morning/i,
    /afterward/i,
  ];

  for (const marker of fadeMarkers) {
    if (marker.test(text)) {
      indicators.push(`Possible fade-to-black: ${marker.source}`);
    }
  }

  // Check for overly vague intimate descriptions
  const vaguePatterns = [
    /they were together/i,
    /shared a moment/i,
    /connection between them/i,
    /things progressed/i,
    /one thing led to another/i,
  ];

  for (const pattern of vaguePatterns) {
    if (pattern.test(text)) {
      indicators.push(`Vague phrasing: ${pattern.source}`);
    }
  }

  return {
    wasSanitized: indicators.length >= 2,
    indicators,
  };
}

// === Heat Level Instructions by Content Type ===

function getRomanceHeatInstructions(level: HeatLevel): string {
  switch (level) {
    case 'blocked':
      return `
ROMANCE HEAT REDUCTION - MAXIMUM RESTRAINT

Previous version was blocked. REWRITE with focus on:
- PSYCHOLOGICAL tension, not physical detail
- SENSORY atmosphere: the smell of rain, sound of breathing, weight of silence
- IMPLICATION over description: "She woke tangled in his sheets" not explicit anatomy
- EMOTIONAL rawness is allowed: desire, hunger, need, ache
- The ANTICIPATION is often more powerful than the act

TECHNIQUES:
- Before/After framing: Show the charged moment before, cut to the quiet after
- Sensory redirect: Focus on non-explicit senses (his cologne, her heartbeat)
- Internal experience: What do they FEEL emotionally, not physically
- Power dynamics: Who has control? Who is vulnerable?
`;

    case 'hot':
      return `
ROMANCE HEAT - DIAL BACK SLIGHTLY

Keep the tension and emotional intensity, but:
- Remove specific anatomical references
- Focus on the emotional experience
- "The night was long and neither of them slept" = acceptable
- Let the reader's imagination do the work
`;

    case 'warm':
      return `
ROMANCE HEAT - SUGGESTIVE ONLY

- Suggestive atmosphere is fine
- Tension and longing are encouraged
- Focus on emotional stakes, not physical mechanics
- Fade to black is acceptable if the scene requires it
`;

    default:
      return '';
  }
}

function getViolenceHeatInstructions(level: HeatLevel): string {
  switch (level) {
    case 'blocked':
      return `
VIOLENCE HEAT REDUCTION - MAXIMUM RESTRAINT

Previous version was blocked. REWRITE with focus on:
- AFTERMATH over action: Show the result, not the process
- PSYCHOLOGICAL impact: Character trauma, shock, fear
- SOUND over sight: The crack, the thud, the silence after
- THREAT over execution: What COULD happen is scarier than what does

TECHNIQUES:
- Cut away: The camera looks away at the crucial moment
- Sensory aftermath: The smell of copper, the ringing ears
- Character reaction: Horror in a witness's eyes
- Implication: "When it was over, nothing was the same"
`;

    case 'hot':
      return `
VIOLENCE HEAT - REDUCE GRAPHIC DETAIL

Keep the stakes and tension, but:
- Less blow-by-blow description
- Focus on character emotional response
- Sound and aftermath over visual gore
- One impactful moment, not prolonged description
`;

    case 'warm':
      return `
VIOLENCE HEAT - SUGGEST AND IMPLY

- Show the lead-up and aftermath
- Minimal direct violence description
- Focus on consequences and impact
- Character survival and resilience
`;

    default:
      return '';
  }
}

function getHorrorHeatInstructions(level: HeatLevel): string {
  switch (level) {
    case 'blocked':
      return `
HORROR HEAT REDUCTION - PSYCHOLOGICAL FOCUS

Previous version was blocked. REWRITE with focus on:
- DREAD over disgust: The anticipation of horror
- SHADOW over monster: What you can't see is scarier
- SOUND and SILENCE: Footsteps, breathing, sudden quiet
- PSYCHOLOGICAL terror: Am I losing my mind?

TECHNIQUES:
- Unreliable narrator: Did that really happen?
- Environmental horror: The house itself feels wrong
- Suggestion: A glimpse, a shape, gone before you're sure
- Body horror through implication: "She couldn't look at her hands anymore"
`;

    case 'hot':
      return `
HORROR HEAT - LESS EXPLICIT IMAGERY

Keep the dread and atmosphere, but:
- Fewer graphic descriptions
- More psychological tension
- Let imagination fill in gaps
- Focus on character fear response
`;

    default:
      return '';
  }
}

function getTraumaHeatInstructions(level: HeatLevel): string {
  switch (level) {
    case 'blocked':
      return `
TRAUMA CONTENT - SENSITIVE HANDLING

Previous version was blocked. REWRITE with focus on:
- SURVIVAL and resilience, not suffering detail
- HEALING journey, not wound exploration
- SUPPORT systems and hope
- AGENCY: Character has power in their story

TECHNIQUES:
- Present tense survival: Focus on now, not flashback
- Support characters: They are not alone
- Forward momentum: Moving toward healing
- Validation without exploitation: The pain is real but not dwelt upon
`;

    default:
      return '';
  }
}

function getGeneralHeatInstructions(level: HeatLevel): string {
  return `
CONTENT ADJUSTMENT REQUIRED

Previous version was blocked. Focus on:
- Story and character over shock value
- Emotional authenticity over graphic detail
- Reader imagination over explicit description
- The implications and consequences of events
`;
}

// === Helper Functions ===

function reduceHeatLevel(current: HeatLevel): HeatLevel {
  switch (current) {
    case 'blocked':
      return 'hot';
    case 'hot':
      return 'warm';
    case 'warm':
      return 'safe';
    default:
      return 'safe';
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Note: HeatLevel, ContentType, and HeatReductionResult are exported at their definitions
