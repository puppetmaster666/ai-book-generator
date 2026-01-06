/**
 * Format-Specific Behavioral Configuration
 *
 * This file defines how the behavioral simulation systems (voice profiles,
 * tension slider, secret manifest) adapt for different content formats:
 * - TEXT (novels, fiction, non-fiction)
 * - VISUAL (comics, picture books, children's illustrated)
 * - SCREENPLAY (movies, TV series)
 *
 * Each format has fundamentally different storytelling mechanics.
 */

import { BookFormat } from './format-config';

// ============================================
// FORMAT CATEGORIES
// ============================================

export type FormatCategory = 'text' | 'visual' | 'screenplay';

/**
 * Map BookFormat to FormatCategory
 */
export function getFormatCategory(format: BookFormat | string): FormatCategory {
  const lower = format.toLowerCase();

  // Visual formats
  if (
    lower.includes('comic') ||
    lower.includes('picture') ||
    lower.includes('graphic') ||
    lower.includes('illustrated') ||
    lower === 'adult_comic'
  ) {
    return 'visual';
  }

  // Screenplay formats
  if (
    lower.includes('screenplay') ||
    lower.includes('script') ||
    lower.includes('tv_series') ||
    lower.includes('movie')
  ) {
    return 'screenplay';
  }

  // Default: text
  return 'text';
}

// ============================================
// VOICE PROFILE FORMAT CONFIG
// ============================================

export interface VoiceProfileFormatConfig {
  // Whether to track detailed voice fingerprints
  enableDetailedFingerprinting: boolean;

  // Maximum words per dialogue segment
  maxDialogueWords: number;

  // Whether to enforce vocabulary tier matching
  enforceVocabularyTier: boolean;

  // Whether to track action line voice (screenplays)
  trackActionLineVoice: boolean;

  // Whether dialogue should be brief/punchy
  preferPunchyDialogue: boolean;

  // Whether to allow thought bubbles/internal monologue
  allowInternalMonologue: boolean;

  // Special rules
  specialRules: string[];
}

export const VOICE_PROFILE_FORMAT_CONFIGS: Record<FormatCategory, VoiceProfileFormatConfig> = {
  text: {
    enableDetailedFingerprinting: true,
    maxDialogueWords: 150,              // Novel dialogue can be lengthy
    enforceVocabularyTier: true,
    trackActionLineVoice: false,        // Not applicable
    preferPunchyDialogue: false,
    allowInternalMonologue: true,       // Full internal thoughts allowed
    specialRules: [
      'Dialogue can include internal reactions',
      'Long speeches should be broken with action beats',
      'Voice should remain consistent across chapters',
    ],
  },

  visual: {
    enableDetailedFingerprinting: false, // Simpler profiles for minimal text
    maxDialogueWords: 25,               // Speech bubble limit
    enforceVocabularyTier: false,       // Less critical with short text
    trackActionLineVoice: false,
    preferPunchyDialogue: true,         // Comics need punchy dialogue
    allowInternalMonologue: false,      // Thought bubbles are limited
    specialRules: [
      'Maximum 25 words per speech bubble',
      'Avoid lengthy exposition in dialogue',
      'Character voice shown through WHAT they say, not HOW MUCH',
      'Use visual cues (art direction) to convey tone',
      'Thought bubbles should be very brief (10 words max)',
    ],
  },

  screenplay: {
    enableDetailedFingerprinting: true,  // Voice is CRITICAL in scripts
    maxDialogueWords: 50,                // Scripts need concise dialogue
    enforceVocabularyTier: true,         // Characters must sound distinct
    trackActionLineVoice: true,          // Action lines have their own voice
    preferPunchyDialogue: true,          // Screen dialogue should be punchy
    allowInternalMonologue: false,       // No internal thoughts (show don't tell)
    specialRules: [
      'Dialogue must be SPEAKABLE (read aloud test)',
      'No internal thoughts - characters reveal through action and subtext',
      'Each character should be identifiable by dialogue alone',
      'Avoid on-the-nose dialogue (characters saying exactly what they feel)',
      'Subtext is more important than text',
      'Action lines are separate from character voice',
    ],
  },
};

// ============================================
// TENSION SLIDER FORMAT CONFIG
// ============================================

export interface TensionSliderFormatConfig {
  // Unit of tension tracking
  tensionUnit: 'chapter' | 'page' | 'scene' | 'act';

  // Maximum tension change per unit
  maxTensionChangePerUnit: number;

  // Whether to track visual tension (through art direction notes)
  trackVisualTension: boolean;

  // Whether to track scene-based tension
  trackSceneTension: boolean;

  // Act structure (for screenplays)
  actStructure?: 3 | 5;

  // Pacing guidelines
  pacingGuidelines: string[];
}

export const TENSION_SLIDER_FORMAT_CONFIGS: Record<FormatCategory, TensionSliderFormatConfig> = {
  text: {
    tensionUnit: 'chapter',
    maxTensionChangePerUnit: 1,          // ±1 per chapter (gradual build)
    trackVisualTension: false,
    trackSceneTension: false,
    pacingGuidelines: [
      'Tension builds gradually across chapters',
      'Each chapter should end with slight escalation or question',
      'Major tension peaks require buildup over 2-3 chapters',
      'Romance: physical intimacy must be earned through emotional tension',
      'Conflict: confrontations need foreshadowing',
    ],
  },

  visual: {
    tensionUnit: 'page',
    maxTensionChangePerUnit: 2,          // ±2 per page (faster pacing OK)
    trackVisualTension: true,            // Art direction affects tension
    trackSceneTension: false,
    pacingGuidelines: [
      'Tension controlled through VISUAL PACING (panel size, layout)',
      'Large panels = slow down, small panels = speed up',
      'Page turns should have cliffhangers or reveals',
      'Action sequences: many small panels',
      'Emotional moments: fewer, larger panels',
      'Splash pages for maximum dramatic impact',
    ],
  },

  screenplay: {
    tensionUnit: 'scene',
    maxTensionChangePerUnit: 2,          // ±2 per scene
    trackVisualTension: true,            // Scene setting affects tension
    trackSceneTension: true,
    actStructure: 3,                     // Traditional 3-act structure
    pacingGuidelines: [
      'Act 1 (Setup): Establish normal, introduce disruption',
      'Act 2 (Confrontation): Rising action, complications',
      'Act 2 midpoint: Major reversal or revelation',
      'Act 3 (Resolution): Climax and denouement',
      'Each scene should have its own arc (objective → obstacle → outcome)',
      'Scene tension should escalate within sequences',
      'Breaks between sequences can reset tension temporarily',
    ],
  },
};

// ============================================
// SECRET MANIFEST FORMAT CONFIG
// ============================================

export interface SecretManifestFormatConfig {
  // Minimum breadcrumbs before reveal allowed
  minBreadcrumbsForReveal: number;

  // Preferred breadcrumb types for this format
  preferredBreadcrumbTypes: string[];

  // Whether visual clues count as breadcrumbs
  allowVisualBreadcrumbs: boolean;

  // Whether action-based reveals are preferred
  preferActionBasedReveals: boolean;

  // Special rules for secrets in this format
  specialRules: string[];
}

export const SECRET_MANIFEST_FORMAT_CONFIGS: Record<FormatCategory, SecretManifestFormatConfig> = {
  text: {
    minBreadcrumbsForReveal: 3,          // Full 3+ breadcrumb requirement
    preferredBreadcrumbTypes: [
      'verbal_slip',
      'behavioral',
      'backstory_hint',
      'third_party',
      'document',
      'foreshadowing',
    ],
    allowVisualBreadcrumbs: false,       // No art in novels
    preferActionBasedReveals: false,     // Can use dialogue or narration
    specialRules: [
      'Breadcrumbs can be subtle (subtext, word choice)',
      'Internal monologue can hint at secrets',
      'Letters, documents, diary entries work well',
      'Reveals can be gradual or sudden',
      'Reader should be able to piece it together on re-read',
    ],
  },

  visual: {
    minBreadcrumbsForReveal: 2,          // Fewer needed (visual is powerful)
    preferredBreadcrumbTypes: [
      'physical_clue',
      'symbolic',
      'behavioral',
      'foreshadowing',
    ],
    allowVisualBreadcrumbs: true,        // Art can plant clues!
    preferActionBasedReveals: true,      // Show don't tell
    specialRules: [
      'Visual clues count as breadcrumbs (background details, expressions)',
      'Color symbolism can hint at secrets',
      'Panel composition can foreshadow',
      'Recurring visual motifs work well',
      'Reveals should be VISUAL (show the moment, not tell it)',
      'One powerful image can replace multiple verbal hints',
    ],
  },

  screenplay: {
    minBreadcrumbsForReveal: 2,          // Fewer needed (subtext is powerful)
    preferredBreadcrumbTypes: [
      'behavioral',
      'physical_clue',
      'verbal_slip',
      'foreshadowing',
    ],
    allowVisualBreadcrumbs: true,        // Production design, props, costumes
    preferActionBasedReveals: true,      // Always show, never tell
    specialRules: [
      'Plant clues in ACTION LINES, not dialogue',
      'Characters reveal secrets through BEHAVIOR, not words',
      'On-the-nose reveals feel cheap - use subtext',
      'Visual props and set dressing can plant clues',
      'Reveals work best through action (what character DOES)',
      'Dialogue reveals should feel earned and dramatic',
    ],
  },
};

// ============================================
// DOMAIN FACTS FORMAT CONFIG
// ============================================

export interface DomainFactsFormatConfig {
  // Strictness of procedural accuracy
  strictness: 'strict' | 'moderate' | 'loose';

  // Whether to allow procedural shortcuts for pacing
  allowProceduralShortcuts: boolean;

  // Domain-specific notes
  notes: string[];
}

export const DOMAIN_FACTS_FORMAT_CONFIGS: Record<FormatCategory, DomainFactsFormatConfig> = {
  text: {
    strictness: 'strict',
    allowProceduralShortcuts: false,
    notes: [
      'Readers of genre fiction expect procedural accuracy',
      'Crime/mystery readers will catch errors',
      'Medical/legal details should be researched',
      'Timeline accuracy matters (DNA takes weeks, not hours)',
    ],
  },

  visual: {
    strictness: 'moderate',
    allowProceduralShortcuts: true,      // Visual pacing can compress time
    notes: [
      'Visual storytelling can abstract procedural details',
      'Panel transitions can skip boring procedure',
      'Focus on key dramatic moments',
      'Accuracy in IMPORTANT details, abstraction elsewhere',
    ],
  },

  screenplay: {
    strictness: 'moderate',
    allowProceduralShortcuts: true,      // Films compress time
    notes: [
      'Screen time compresses real time',
      '"Hollywooding" of procedure is accepted to some degree',
      'But CRITICAL errors break suspension of disbelief',
      'Consultants often catch major errors in production',
      'Focus on emotional truth over procedural accuracy',
    ],
  },
};

// ============================================
// GENRE GUIDELINES FORMAT ADJUSTMENTS
// ============================================

export interface GenreFormatAdjustments {
  romance: string[];
  mystery: string[];
  thriller: string[];
  drama: string[];
  comedy: string[];
  crime: string[];
  horror: string[];
}

export const GENRE_FORMAT_ADJUSTMENTS: Record<FormatCategory, Partial<GenreFormatAdjustments>> = {
  text: {
    // Default novel guidelines apply
  },

  visual: {
    romance: [
      'Romance in comics: VISUAL language of intimacy',
      'Use panel layout to control pacing of romantic tension',
      'Close-ups on expressions, hands, eyes',
      'Silence (panels without dialogue) can be powerful',
      'Page turn reveals for romantic milestones',
    ],
    mystery: [
      'Visual clues that can be spotted on re-read',
      'Background details matter',
      'Character expressions can be unreliable (lying faces)',
      'Use color to hint at truth vs deception',
    ],
    thriller: [
      'Rapid panel sequences for action',
      'Uncomfortable close-ups for tension',
      'Negative space for dread',
      'Page turn cliffhangers essential',
    ],
    horror: [
      'What you DON\'T show is scarier',
      'Shadows, partial views, implied threats',
      'Splash pages for maximum horror reveals',
      'Panel bleeds for unsettling effect',
    ],
  },

  screenplay: {
    romance: [
      'Show attraction through LOOKS and GESTURES, not words',
      'Characters don\'t say "I love you" until it\'s earned',
      'Subtext: what they don\'t say matters more',
      'Physical proximity and blocking tells the story',
    ],
    mystery: [
      'Plant clues in production design, not exposition',
      'Audience should be able to solve it (fair play)',
      'Reveals through ACTION, not explanation',
      'Avoid detective explaining everything at the end',
    ],
    thriller: [
      'Ticking clock - always visible stakes',
      'Cross-cutting between threats and protagonist',
      'Action set pieces need clear geography',
      'Every scene should move the plot forward',
    ],
    horror: [
      'Sound design hints at threat (can be noted in script)',
      'Less is more - suggestion over gore',
      'Build dread before release',
      'Characters must make decisions that make sense to THEM',
    ],
  },
};

// ============================================
// COMBINED FORMAT BEHAVIOR CONFIG
// ============================================

export interface FormatBehaviorConfig {
  category: FormatCategory;
  voiceProfile: VoiceProfileFormatConfig;
  tensionSlider: TensionSliderFormatConfig;
  secretManifest: SecretManifestFormatConfig;
  domainFacts: DomainFactsFormatConfig;
  genreAdjustments: Partial<GenreFormatAdjustments>;
}

/**
 * Get the complete behavioral configuration for a format
 */
export function getFormatBehaviorConfig(format: BookFormat | string): FormatBehaviorConfig {
  const category = getFormatCategory(format);

  return {
    category,
    voiceProfile: VOICE_PROFILE_FORMAT_CONFIGS[category],
    tensionSlider: TENSION_SLIDER_FORMAT_CONFIGS[category],
    secretManifest: SECRET_MANIFEST_FORMAT_CONFIGS[category],
    domainFacts: DOMAIN_FACTS_FORMAT_CONFIGS[category],
    genreAdjustments: GENRE_FORMAT_ADJUSTMENTS[category],
  };
}

/**
 * Generate format-aware behavioral injection for prompts
 */
export function generateFormatBehaviorInjection(
  format: BookFormat | string,
  genre?: string
): string {
  const config = getFormatBehaviorConfig(format);
  let injection = `\n=== FORMAT-SPECIFIC BEHAVIORAL RULES (${config.category.toUpperCase()}) ===\n\n`;

  // Voice profile rules
  injection += 'DIALOGUE RULES:\n';
  injection += config.voiceProfile.specialRules.map(r => `  - ${r}`).join('\n');
  injection += `\n  - Max dialogue words: ${config.voiceProfile.maxDialogueWords}\n`;
  if (config.voiceProfile.preferPunchyDialogue) {
    injection += '  - Dialogue should be PUNCHY and CONCISE\n';
  }
  if (!config.voiceProfile.allowInternalMonologue) {
    injection += '  - NO internal monologue - show through action\n';
  }

  // Tension rules
  injection += '\nTENSION PACING:\n';
  injection += `  - Tension tracked per: ${config.tensionSlider.tensionUnit}\n`;
  injection += `  - Max tension change: ±${config.tensionSlider.maxTensionChangePerUnit} per ${config.tensionSlider.tensionUnit}\n`;
  injection += config.tensionSlider.pacingGuidelines.map(g => `  - ${g}`).join('\n');
  injection += '\n';

  // Secret/reveal rules
  injection += '\nSECRET & REVEAL RULES:\n';
  injection += `  - Minimum ${config.secretManifest.minBreadcrumbsForReveal} breadcrumbs before any reveal\n`;
  if (config.secretManifest.allowVisualBreadcrumbs) {
    injection += '  - Visual elements (art direction, props) can serve as breadcrumbs\n';
  }
  if (config.secretManifest.preferActionBasedReveals) {
    injection += '  - Reveals should be ACTION-BASED, not exposition\n';
  }
  injection += config.secretManifest.specialRules.map(r => `  - ${r}`).join('\n');
  injection += '\n';

  // Domain accuracy
  injection += '\nPROCEDURAL ACCURACY:\n';
  injection += `  - Strictness level: ${config.domainFacts.strictness}\n`;
  injection += config.domainFacts.notes.map(n => `  - ${n}`).join('\n');
  injection += '\n';

  // Genre-specific format adjustments
  if (genre && config.genreAdjustments) {
    const genreKey = genre.toLowerCase() as keyof GenreFormatAdjustments;
    const adjustments = config.genreAdjustments[genreKey];
    if (adjustments && adjustments.length > 0) {
      injection += `\n${genre.toUpperCase()} FORMAT SPECIFICS:\n`;
      injection += adjustments.map(a => `  - ${a}`).join('\n');
      injection += '\n';
    }
  }

  return injection;
}
