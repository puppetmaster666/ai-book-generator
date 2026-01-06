/**
 * Genre Controller
 *
 * Master orchestration layer for genre-specific behavioral enforcement.
 * Coordinates all genre systems and injects appropriate guardrails.
 *
 * Now FORMAT-AWARE: Adapts behavior for text books, visual books, and screenplays.
 *
 * Responsibilities:
 * 1. Detect active genres from book metadata
 * 2. Apply format-specific rules (text vs visual vs screenplay)
 * 3. Coordinate validation across all behavioral systems
 * 4. Generate unified context/guardrails for prompt injection
 * 5. Provide genre-specific generation guidance
 */

import {
  CharacterVoiceProfile,
  registerVoiceProfile,
  getVoiceProfile,
  getAllVoiceProfiles,
  buildVoiceProfile,
  validateCharacterVoice,
  validateAllDialogue,
  generateVoiceProfileSummary,
} from './voice-profiles';

import {
  TensionArc,
  TensionType,
  registerTensionArc,
  getTensionArcs,
  getTensionBetween,
  validateTensionChange,
  updateTensionLevel,
  validateContentTension,
  generateTensionSummary,
  getPacingSuggestions,
  generateSensoryAnchors,
} from './tension-slider';

import {
  Secret,
  SecretType,
  registerSecret,
  getSecret,
  getUnrevealedSecrets,
  addBreadcrumb,
  validateReveal,
  revealSecret,
  getSecretsPendingBreadcrumbs,
  detectBreadcrumbsInContent,
  generateSecretManifestSummary,
  generateBreadcrumbSuggestions,
} from './secret-manifest';

import {
  DomainType,
  getDomainFacts,
  getDomainTimeline,
  validateDomainAccuracy,
  generateDomainFactSheet,
  getCommonMistakes,
} from './domain-facts';

import {
  FormatCategory,
  getFormatCategory,
  getFormatBehaviorConfig,
  generateFormatBehaviorInjection,
  FormatBehaviorConfig,
} from './format-behavioral';

import { BookFormat } from './format-config';

// ============================================
// TYPES
// ============================================

export type GenreType =
  | 'romance'
  | 'mystery'
  | 'thriller'
  | 'drama'
  | 'comedy'
  | 'crime'
  | 'horror'
  | 'fantasy'
  | 'sci-fi'
  | 'literary'
  | 'historical';

export interface GenreControllerConfig {
  bookId: string;
  primaryGenre: GenreType;
  secondaryGenres: GenreType[];
  domains: DomainType[];
  characters: { name: string; description: string; backstory?: string }[];
  strictMode: boolean;  // If true, violations block generation
  format: BookFormat | string;  // Content format: novel, comic, screenplay, etc.
}

export interface GenreValidationResult {
  valid: boolean;
  voiceViolations: { character: string; violations: string[] }[];
  tensionViolations: string[];
  secretViolations: string[];
  domainViolations: { rule: string; violation: string; correction: string }[];
  formatViolations: string[];  // Format-specific rule violations
  suggestions: string[];
  overallFeedback: string;
  formatCategory: FormatCategory;  // What format rules were applied
}

export interface GenreGuardrails {
  voiceProfiles: string;
  tensionArcs: string;
  secretManifest: string;
  domainFacts: string;
  genreGuidelines: string;
  formatRules: string;  // Format-specific behavioral rules
  combinedInjection: string;
}

// ============================================
// GENRE-SPECIFIC GUIDELINES
// ============================================

const GENRE_GUIDELINES: Record<GenreType, string> = {
  romance: `
ROMANCE GUIDELINES:
- Tension builds GRADUALLY (max ±1 per chapter)
- Physical intimacy must be EARNED through emotional connection
- Use ALL senses: touch, gaze, breath, proximity, temperature
- Obstacles must be INTERNAL as much as external
- The "black moment" should feel genuinely devastating
- Resolution must address the core conflict, not just circumstance
`,

  mystery: `
MYSTERY GUIDELINES:
- Plant at least 3 genuine clues before revealing solution
- Red herrings must be distinguishable in retrospect
- The culprit must be introduced in first third of story
- Reader should be able to solve it (fair play)
- Every clue needs context that makes it memorable
- Avoid information the detective character couldn't access
`,

  thriller: `
THRILLER GUIDELINES:
- Maintain CONSTANT forward momentum
- Stakes must be clear and escalating
- Time pressure (ticking clock) amplifies tension
- Protagonist must be ACTIVE, not passive
- Twists should recontextualize, not contradict
- Every chapter should end with a question or threat
`,

  drama: `
DRAMA GUIDELINES:
- Character flaws drive conflict, not coincidence
- Confrontations need buildup (tension slider)
- Secrets must have proper breadcrumb trails
- Emotional beats need room to land (pacing)
- Show internal conflict through external action
- Resolution should feel inevitable in hindsight
`,

  comedy: `
COMEDY GUIDELINES:
- Timing is everything - setup → beat → punchline
- Running gags need variation before repetition
- Character-based humor > random jokes
- Callbacks reward attentive readers
- Comedy can coexist with serious themes
- Let characters be funny, don't force the narrative to be
`,

  crime: `
CRIME GUIDELINES:
- Procedure must be ACCURATE (see domain facts)
- Evidence chain of custody matters
- Motives must be believable and human
- Police don't solve cases alone - show the system
- Legal consequences should be realistic
- Timelines must match real-world constraints
`,

  horror: `
HORROR GUIDELINES:
- Dread > jump scares
- Build atmosphere before revealing threat
- The unknown is scarier than the known
- Characters must make decisions that make sense to THEM
- Survival horror: establish rules, then follow them
- Psychological horror: unreliable perception
`,

  fantasy: `
FANTASY GUIDELINES:
- Magic must have consistent rules and costs
- Worldbuilding serves character, not vice versa
- Fantastic elements should feel earned
- Internal consistency > external realism
- Culture and society should feel lived-in
- Chosen One narratives need earned competence
`,

  'sci-fi': `
SCI-FI GUIDELINES:
- Technology should have societal implications
- Hard SF: science should be plausible or extrapolated
- Soft SF: focus on human element
- Avoid technobabble that doesn't serve story
- Future societies should feel coherent
- Alien elements should challenge assumptions
`,

  literary: `
LITERARY GUIDELINES:
- Theme should emerge from story, not vice versa
- Subtext > text
- Language precision matters
- Character interiority is expected
- Avoid melodrama - understatement often hits harder
- Endings can be ambiguous but not arbitrary
`,

  historical: `
HISTORICAL GUIDELINES:
- Period accuracy in details (clothing, speech, technology)
- Characters should have period-appropriate worldviews
- Don't impose modern morality anachronistically
- Research shows in the texture, not exposition
- Famous events need fresh perspective
- Avoid Wikipedia-itis (info-dumping historical facts)
`,
};

// ============================================
// GENRE → DOMAIN MAPPING
// ============================================

const GENRE_DOMAIN_MAP: Record<GenreType, DomainType[]> = {
  romance: ['affair'],
  mystery: ['police', 'murder_investigation', 'forensics'],
  thriller: ['police', 'espionage', 'military'],
  drama: ['affair', 'legal', 'medical'],
  comedy: [],
  crime: ['police', 'murder_investigation', 'forensics', 'legal'],
  horror: ['medical'],
  fantasy: [],
  'sci-fi': [],
  literary: [],
  historical: [],
};

// ============================================
// GENRE CONTROLLER CLASS
// ============================================

export class GenreController {
  private config: GenreControllerConfig;
  private formatConfig: FormatBehaviorConfig;
  private formatCategory: FormatCategory;

  constructor(config: GenreControllerConfig) {
    this.config = config;
    this.formatCategory = getFormatCategory(config.format);
    this.formatConfig = getFormatBehaviorConfig(config.format);
    this.initialize();
  }

  /**
   * Initialize all genre systems
   */
  private initialize(): void {
    // Register voice profiles for all characters (format-aware)
    for (const char of this.config.characters) {
      const profile = buildVoiceProfile(
        char.name,
        char.description,
        char.backstory || ''
      );

      // Apply format-specific voice adjustments
      if (this.formatConfig.voiceProfile.preferPunchyDialogue) {
        // For visual/screenplay, prefer shorter sentence patterns
        profile.sentenceLengthAvg = Math.min(profile.sentenceLengthAvg, 12);
      }

      registerVoiceProfile(this.config.bookId, profile);
    }
  }

  /**
   * Get the format category (text, visual, screenplay)
   */
  getFormatCategory(): FormatCategory {
    return this.formatCategory;
  }

  /**
   * Get the format behavior config
   */
  getFormatConfig(): FormatBehaviorConfig {
    return this.formatConfig;
  }

  /**
   * Get all active domains based on genres
   */
  getActiveDomains(): DomainType[] {
    const domains = new Set<DomainType>(this.config.domains);

    // Add domains implied by genres
    const allGenres = [this.config.primaryGenre, ...this.config.secondaryGenres];
    for (const genre of allGenres) {
      const genreDomains = GENRE_DOMAIN_MAP[genre] || [];
      genreDomains.forEach(d => domains.add(d));
    }

    return Array.from(domains);
  }

  /**
   * Generate complete guardrails for prompt injection
   */
  generateGuardrails(): GenreGuardrails {
    const bookId = this.config.bookId;

    // Voice profiles
    const voiceProfiles = generateVoiceProfileSummary(bookId);

    // Tension arcs
    const tensionArcs = generateTensionSummary(bookId);

    // Secret manifest
    const secretManifest = generateSecretManifestSummary(bookId);

    // Domain facts
    const domains = this.getActiveDomains();
    const domainFacts = generateDomainFactSheet(domains);

    // Genre guidelines
    const allGenres = [this.config.primaryGenre, ...this.config.secondaryGenres];
    let genreGuidelines = '\n=== GENRE REQUIREMENTS ===\n';
    for (const genre of allGenres) {
      genreGuidelines += GENRE_GUIDELINES[genre] || '';
    }

    // Format-specific rules (TEXT vs VISUAL vs SCREENPLAY)
    const formatRules = generateFormatBehaviorInjection(
      this.config.format,
      this.config.primaryGenre
    );

    // Combined injection
    let combinedInjection = '\n========================================\n';
    combinedInjection += '=== BEHAVIORAL ENFORCEMENT ACTIVE ===\n';
    combinedInjection += `=== FORMAT: ${this.formatCategory.toUpperCase()} ===\n`;
    combinedInjection += '========================================\n';
    combinedInjection += 'The following constraints are ENFORCED. Violations trigger rewrites.\n';
    combinedInjection += formatRules;  // Format rules first (most fundamental)
    combinedInjection += genreGuidelines;
    if (voiceProfiles) combinedInjection += voiceProfiles;
    if (tensionArcs) combinedInjection += tensionArcs;
    if (secretManifest) combinedInjection += secretManifest;
    if (domainFacts) combinedInjection += domainFacts;
    combinedInjection += '========================================\n';

    return {
      voiceProfiles,
      tensionArcs,
      secretManifest,
      domainFacts,
      genreGuidelines,
      formatRules,
      combinedInjection,
    };
  }

  /**
   * Validate generated content against all genre and format rules
   */
  validateContent(
    content: string,
    chapter: number
  ): GenreValidationResult {
    const bookId = this.config.bookId;
    const voiceViolations: { character: string; violations: string[] }[] = [];
    const tensionViolations: string[] = [];
    const secretViolations: string[] = [];
    const formatViolations: string[] = [];
    const suggestions: string[] = [];

    // 0. Format-specific validation (most fundamental)
    this.validateFormatRules(content, formatViolations, suggestions);

    // 1. Validate character voices (format-aware)
    const dialogueValidation = validateAllDialogue(content, bookId);
    if (!dialogueValidation.valid) {
      voiceViolations.push(...dialogueValidation.allViolations);
    }

    // 2. Validate tension progression (format-aware unit)
    const tensionValidation = validateContentTension(content, bookId, chapter);
    if (!tensionValidation.valid) {
      tensionViolations.push(...tensionValidation.violations);
    }

    // 3. Check for potential breadcrumbs
    const detectedBreadcrumbs = detectBreadcrumbsInContent(content, bookId);
    if (detectedBreadcrumbs.length > 0) {
      suggestions.push(
        `Detected ${detectedBreadcrumbs.length} potential breadcrumb(s). Consider formalizing them.`
      );
    }

    // 4. Check secrets needing breadcrumbs (format-aware minimum)
    const minBreadcrumbs = this.formatConfig.secretManifest.minBreadcrumbsForReveal;
    const pendingBreadcrumbs = getSecretsPendingBreadcrumbs(bookId, chapter);
    for (const { secret, urgency } of pendingBreadcrumbs) {
      if (urgency === 'critical') {
        secretViolations.push(
          `CRITICAL: Secret "${secret.description}" needs breadcrumbs NOW (${secret.breadcrumbs.length}/${minBreadcrumbs} minimum).`
        );
      } else if (urgency === 'soon') {
        suggestions.push(
          `Secret "${secret.description}" needs breadcrumbs soon (${secret.breadcrumbs.length}/${minBreadcrumbs}).`
        );
      }
    }

    // 5. Validate domain accuracy (format-aware strictness)
    const domains = this.getActiveDomains();
    const domainValidation = validateDomainAccuracy(content, domains);
    // Filter domain violations based on format strictness
    const filteredDomainViolations = this.formatConfig.domainFacts.strictness === 'loose'
      ? domainValidation.violations.filter(v => v.rule.toLowerCase().includes('critical'))
      : domainValidation.violations;

    // 6. Get pacing suggestions
    const pacingSuggestions = getPacingSuggestions(bookId, chapter);
    suggestions.push(...pacingSuggestions);

    // 7. Get breadcrumb suggestions
    const breadcrumbSuggestions = generateBreadcrumbSuggestions(bookId, chapter);
    suggestions.push(...breadcrumbSuggestions);

    // Build overall feedback
    const allViolations = [
      ...formatViolations,
      ...voiceViolations.map(v => v.violations).flat(),
      ...tensionViolations,
      ...secretViolations,
      ...filteredDomainViolations.map(v => v.violation),
    ];

    let overallFeedback = '';
    if (allViolations.length === 0) {
      overallFeedback = `Content passes all ${this.formatCategory} format and genre validation checks.`;
    } else {
      overallFeedback = `Found ${allViolations.length} violation(s) [${this.formatCategory} format]:\n`;
      overallFeedback += allViolations.map(v => `  - ${v}`).join('\n');
    }

    const valid = this.config.strictMode
      ? allViolations.length === 0
      : filteredDomainViolations.filter(v => v.rule.includes('CRITICAL')).length === 0 &&
        formatViolations.filter(v => v.includes('CRITICAL')).length === 0;

    return {
      valid,
      voiceViolations,
      tensionViolations,
      secretViolations,
      domainViolations: filteredDomainViolations,
      formatViolations,
      suggestions,
      overallFeedback,
      formatCategory: this.formatCategory,
    };
  }

  /**
   * Validate format-specific rules
   */
  private validateFormatRules(
    content: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const voiceConfig = this.formatConfig.voiceProfile;
    const tensionConfig = this.formatConfig.tensionSlider;

    // Check dialogue length for visual/screenplay formats
    if (voiceConfig.maxDialogueWords < 100) {
      // Extract dialogue and check lengths
      const dialoguePattern = /"([^"]+)"/g;
      let match;
      while ((match = dialoguePattern.exec(content)) !== null) {
        const dialogue = match[1];
        const wordCount = dialogue.split(/\s+/).length;
        if (wordCount > voiceConfig.maxDialogueWords) {
          violations.push(
            `Dialogue too long for ${this.formatCategory} format: "${dialogue.slice(0, 30)}..." has ${wordCount} words (max: ${voiceConfig.maxDialogueWords})`
          );
        }
      }
    }

    // Check for internal monologue in formats that don't allow it
    if (!voiceConfig.allowInternalMonologue) {
      const internalPatterns = [
        /\b(he|she)\s+thought\b/gi,
        /\b(he|she)\s+wondered\b/gi,
        /\b(he|she)\s+realized\b/gi,
        /\bin\s+(his|her)\s+mind\b/gi,
        /\binternally\b/gi,
      ];

      for (const pattern of internalPatterns) {
        if (pattern.test(content)) {
          violations.push(
            `Internal monologue not allowed in ${this.formatCategory} format. Show through action, not thoughts.`
          );
          break;
        }
      }
    }

    // Visual format specific checks
    if (this.formatCategory === 'visual') {
      // Check for excessive text per panel (if we can detect panel structure)
      if (content.includes('PANEL') || content.includes('Panel')) {
        const panels = content.split(/PANEL\s*\d+/i);
        for (let i = 1; i < panels.length; i++) {
          const panelText = panels[i].split(/PANEL/i)[0] || panels[i];
          const wordCount = panelText.split(/\s+/).length;
          if (wordCount > 60) {
            suggestions.push(`Panel ${i} may have too much text (${wordCount} words). Comics are visual-first.`);
          }
        }
      }
    }

    // Screenplay format specific checks
    if (this.formatCategory === 'screenplay') {
      // Check for camera directions (should be avoided)
      const cameraPatterns = [
        /\bwe see\b/gi,
        /\bwe hear\b/gi,
        /\bcamera\b/gi,
        /\bpan to\b/gi,
        /\bclose on\b/gi,
        /\bwide shot\b/gi,
        /\bangle on\b/gi,
      ];

      for (const pattern of cameraPatterns) {
        if (pattern.test(content)) {
          suggestions.push(
            `Avoid camera directions in spec scripts. Found: "${content.match(pattern)?.[0]}". Describe what IS, not what the camera sees.`
          );
        }
      }

      // Check for on-the-nose dialogue
      const onTheNosePatterns = [
        /I feel (so )?(angry|sad|happy|scared)/i,
        /I am (really )?(angry|sad|happy|scared)/i,
        /You make me feel/i,
        /I need you to understand/i,
      ];

      for (const pattern of onTheNosePatterns) {
        if (pattern.test(content)) {
          suggestions.push(
            `On-the-nose dialogue detected. Characters shouldn't state their feelings directly. Use subtext.`
          );
          break;
        }
      }
    }
  }

  /**
   * Process a chapter after generation
   */
  processChapter(
    content: string,
    chapter: number
  ): {
    validation: GenreValidationResult;
    autoDetectedBreadcrumbs: ReturnType<typeof detectBreadcrumbsInContent>;
    sensoryAnchorsNeeded: ReturnType<typeof generateSensoryAnchors>[];
  } {
    const validation = this.validateContent(content, chapter);
    const autoDetectedBreadcrumbs = detectBreadcrumbsInContent(content, this.config.bookId);

    // Check if any tension arcs need sensory anchors
    const sensoryAnchorsNeeded: ReturnType<typeof generateSensoryAnchors>[] = [];
    const arcs = getTensionArcs(this.config.bookId);
    for (const arc of arcs) {
      if (arc.currentLevel >= 5) {
        const anchors = generateSensoryAnchors(arc.currentLevel, arc.type);
        if (anchors.length > 0) {
          sensoryAnchorsNeeded.push(anchors);
        }
      }
    }

    return {
      validation,
      autoDetectedBreadcrumbs,
      sensoryAnchorsNeeded,
    };
  }

  /**
   * Register a romance arc
   */
  registerRomanceArc(
    character1: string,
    character2: string,
    peakChapter?: number
  ): TensionArc {
    return registerTensionArc(this.config.bookId, {
      type: 'romantic',
      participants: [character1, character2],
      targetLevel: 10,
      peakChapter,
    });
  }

  /**
   * Register a conflict arc
   */
  registerConflictArc(
    character1: string,
    character2: string,
    peakChapter?: number
  ): TensionArc {
    return registerTensionArc(this.config.bookId, {
      type: 'conflict',
      participants: [character1, character2],
      targetLevel: 8,
      peakChapter,
    });
  }

  /**
   * Register a secret
   */
  registerPlotSecret(
    type: SecretType,
    description: string,
    truthSummary: string,
    heldBy: string[],
    hiddenFrom: string[],
    stakes: string,
    setupChapter: number
  ): Secret {
    return registerSecret(this.config.bookId, {
      type,
      description,
      truthSummary,
      heldBy,
      hiddenFrom,
      stakes,
      setupChapter,
    });
  }

  /**
   * Update voice profile for a character
   */
  updateVoiceProfile(
    characterName: string,
    updates: Partial<CharacterVoiceProfile>
  ): void {
    const profile = getVoiceProfile(this.config.bookId, characterName);
    if (profile) {
      Object.assign(profile, updates);
    }
  }

  /**
   * Add banned words for a character
   */
  addBannedWords(characterName: string, words: string[]): void {
    const profile = getVoiceProfile(this.config.bookId, characterName);
    if (profile) {
      profile.bannedWords.push(...words);
    }
  }

  /**
   * Add catch phrases for a character
   */
  addCatchPhrases(characterName: string, phrases: string[]): void {
    const profile = getVoiceProfile(this.config.bookId, characterName);
    if (profile) {
      profile.catchPhrases.push(...phrases);
    }
  }

  /**
   * Get generation tips for current state
   */
  getGenerationTips(chapter: number): string[] {
    const tips: string[] = [];
    const bookId = this.config.bookId;

    // Romance tips
    if (this.config.primaryGenre === 'romance' || this.config.secondaryGenres.includes('romance')) {
      const romanceArcs = getTensionArcs(bookId).filter(a => a.type === 'romantic');
      for (const arc of romanceArcs) {
        if (arc.currentLevel >= 5 && arc.currentLevel < 8) {
          tips.push(`Romance between ${arc.participants.join(' & ')}: Ready for intimate moments. Use sensory anchors.`);
        }
        if (arc.peakChapter === chapter) {
          tips.push(`Romance between ${arc.participants.join(' & ')}: PEAK CHAPTER. Major romantic milestone expected.`);
        }
      }
    }

    // Mystery tips
    if (this.config.primaryGenre === 'mystery' || this.config.secondaryGenres.includes('mystery')) {
      const unrevealed = getUnrevealedSecrets(bookId);
      if (unrevealed.length > 0) {
        const readyToReveal = unrevealed.filter(s => s.breadcrumbs.length >= 3);
        if (readyToReveal.length > 0) {
          tips.push(`Secrets ready for reveal: ${readyToReveal.map(s => s.description).join(', ')}`);
        }
      }
    }

    // Drama tips
    const conflictArcs = getTensionArcs(bookId).filter(a => a.type === 'conflict' || a.type === 'dramatic');
    for (const arc of conflictArcs) {
      if (arc.currentLevel >= 7) {
        tips.push(`Conflict between ${arc.participants.join(' & ')}: High tension (${arc.currentLevel}/10). Confrontation imminent.`);
      }
    }

    return tips;
  }

  /**
   * Get config
   */
  getConfig(): GenreControllerConfig {
    return this.config;
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

/**
 * Create a genre controller for a book
 */
export function createGenreController(config: GenreControllerConfig): GenreController {
  return new GenreController(config);
}

/**
 * Quick setup for common genre combinations
 */
export function createQuickGenreController(
  bookId: string,
  genre: 'romance' | 'mystery' | 'thriller' | 'drama' | 'crime',
  characters: { name: string; description: string }[],
  format: BookFormat | string = 'novel'
): GenreController {
  const presets: Record<string, { primary: GenreType; secondary: GenreType[]; domains: DomainType[] }> = {
    romance: {
      primary: 'romance',
      secondary: ['drama'],
      domains: ['affair'],
    },
    mystery: {
      primary: 'mystery',
      secondary: ['thriller'],
      domains: ['police', 'murder_investigation', 'forensics'],
    },
    thriller: {
      primary: 'thriller',
      secondary: ['mystery'],
      domains: ['police', 'espionage'],
    },
    drama: {
      primary: 'drama',
      secondary: ['literary'],
      domains: ['legal', 'medical', 'affair'],
    },
    crime: {
      primary: 'crime',
      secondary: ['drama', 'thriller'],
      domains: ['police', 'murder_investigation', 'forensics', 'legal'],
    },
  };

  const preset = presets[genre];

  return createGenreController({
    bookId,
    primaryGenre: preset.primary,
    secondaryGenres: preset.secondary,
    domains: preset.domains,
    characters,
    strictMode: false,
    format,
  });
}

/**
 * Create a format-specific controller with minimal configuration
 */
export function createFormatController(
  bookId: string,
  format: BookFormat | string,
  genre: GenreType,
  characters: { name: string; description: string }[]
): GenreController {
  // Infer likely domains from genre
  const genreDomains = GENRE_DOMAIN_MAP[genre] || [];

  return createGenreController({
    bookId,
    primaryGenre: genre,
    secondaryGenres: [],
    domains: genreDomains,
    characters,
    strictMode: false,
    format,
  });
}
