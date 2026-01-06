/**
 * Genre-Aware Validator
 *
 * Extends the narrative validator with genre-specific rules.
 * Integrates voice profiles, tension arcs, secret manifests, and domain facts.
 *
 * This validator answers:
 * - Does dialogue match character voice profiles?
 * - Is tension progression appropriate (max ±1)?
 * - Are secrets ready for reveal (3+ breadcrumbs)?
 * - Is procedural content accurate (police, medical, legal)?
 */

import { NarrativeValidator, ValidationReport } from './narrative-validator';
import {
  GenreController,
  GenreType,
  GenreValidationResult,
} from '../atomic/genre-controller';
import {
  validateAllDialogue,
  VoiceValidationResult,
} from '../atomic/voice-profiles';
import {
  validateContentTension,
  getTensionArcs,
  TensionArc,
} from '../atomic/tension-slider';
import {
  validateReveal,
  getUnrevealedSecrets,
  getSecretsPendingBreadcrumbs,
  Secret,
} from '../atomic/secret-manifest';
import {
  validateDomainAccuracy,
  DomainType,
} from '../atomic/domain-facts';

// ============================================
// TYPES
// ============================================

export interface GenreValidationReport extends ValidationReport {
  // Voice profile validation
  voiceValidation: {
    valid: boolean;
    violations: { character: string; violations: string[] }[];
  };

  // Tension arc validation
  tensionValidation: {
    valid: boolean;
    violations: string[];
    currentArcs: { participants: string[]; level: number; type: string }[];
  };

  // Secret/breadcrumb validation
  secretValidation: {
    valid: boolean;
    warnings: string[];
    pendingBreadcrumbs: { secret: string; urgency: string }[];
    revealableSecrets: string[];
  };

  // Domain accuracy validation
  domainValidation: {
    valid: boolean;
    violations: { rule: string; violation: string; correction: string }[];
  };

  // Genre-specific suggestions
  genreSuggestions: string[];

  // Combined genre validation result
  genreValid: boolean;
}

export interface GenreValidationConfig {
  bookId: string;
  chapter: number;
  characterNames: string[];
  primaryGenre: GenreType;
  secondaryGenres: GenreType[];
  domains: DomainType[];
  strictMode: boolean;
}

// ============================================
// GENRE-SPECIFIC VALIDATION RULES
// ============================================

const GENRE_VALIDATION_RULES: Record<GenreType, {
  patterns: { pattern: RegExp; issue: string; severity: 'error' | 'warning' }[];
  requirements: { check: (text: string) => boolean; requirement: string }[];
}> = {
  romance: {
    patterns: [
      {
        pattern: /\b(instantly|immediately|suddenly)\b.*\b(loved|fell in love|knew they were meant)\b/i,
        issue: 'Instant love without buildup. Romance requires gradual tension.',
        severity: 'warning',
      },
      {
        pattern: /\b(perfect|flawless|gorgeous|stunning)\b.*\b(body|figure|face|features)\b/i,
        issue: 'Superficial attraction without emotional depth.',
        severity: 'warning',
      },
    ],
    requirements: [
      {
        check: (text) => /\b(eyes|gaze|look|glance)\b/i.test(text),
        requirement: 'Romance scenes should include eye contact/gaze.',
      },
    ],
  },

  mystery: {
    patterns: [
      {
        pattern: /\b(obviously|clearly|definitely)\b.*\b(guilty|did it|murderer|killer)\b/i,
        issue: 'Premature certainty. Mystery requires doubt and investigation.',
        severity: 'error',
      },
      {
        pattern: /\b(knew|realized|figured out)\b.*\b(everything|the truth|what happened)\b/i,
        issue: 'Sudden revelation without clue buildup.',
        severity: 'warning',
      },
    ],
    requirements: [
      {
        check: (text) => /\b(clue|evidence|witness|alibi|motive|suspect)\b/i.test(text),
        requirement: 'Mystery chapters should advance the investigation.',
      },
    ],
  },

  thriller: {
    patterns: [
      {
        pattern: /\b(safe|relaxed|calm|peaceful)\b.*\b(finally|at last|everything was)\b/i,
        issue: 'Tension release too early. Thrillers need constant threat.',
        severity: 'warning',
      },
    ],
    requirements: [
      {
        check: (text) => {
          // Check for urgency words
          return /\b(time|clock|deadline|hurry|fast|quick|now|must)\b/i.test(text);
        },
        requirement: 'Thrillers need urgency and forward momentum.',
      },
    ],
  },

  drama: {
    patterns: [
      {
        pattern: /\b(screamed|yelled|shouted)\b.*\b(suddenly|out of nowhere|for no reason)\b/i,
        issue: 'Emotional outburst without buildup. Drama requires escalation.',
        severity: 'warning',
      },
    ],
    requirements: [
      {
        check: (text) => {
          // Check for internal conflict markers
          return /\b(wanted|wished|hoped|feared|dreaded|couldn't|shouldn't)\b/i.test(text);
        },
        requirement: 'Drama needs internal conflict and emotional stakes.',
      },
    ],
  },

  comedy: {
    patterns: [
      {
        pattern: /\b(LOL|LMAO|haha|hilarious)\b/i,
        issue: 'Don\'t tell readers it\'s funny. Show through situation and timing.',
        severity: 'warning',
      },
    ],
    requirements: [],
  },

  crime: {
    patterns: [
      {
        pattern: /\bDNA\b.*\b(instant|immediate|hours?|minute)\b/i,
        issue: 'DNA results take weeks, not hours. Procedural accuracy matters.',
        severity: 'error',
      },
      {
        pattern: /\bread (him|her|them) (his|her|their) rights\b.*\b(arrest|cuff)\b/i,
        issue: 'Miranda is read before interrogation, not at arrest.',
        severity: 'warning',
      },
    ],
    requirements: [
      {
        check: (text) => /\b(procedure|protocol|chain of custody|warrant|evidence)\b/i.test(text),
        requirement: 'Crime fiction should show procedural awareness.',
      },
    ],
  },

  horror: {
    patterns: [
      {
        pattern: /\b(suddenly|out of nowhere)\b.*\b(monster|creature|ghost|demon)\b/i,
        issue: 'Jump scares without atmosphere. Horror needs dread buildup.',
        severity: 'warning',
      },
    ],
    requirements: [
      {
        check: (text) => {
          // Check for atmosphere words
          return /\b(dark|shadow|silence|cold|creep|unease|wrong)\b/i.test(text);
        },
        requirement: 'Horror needs atmospheric tension.',
      },
    ],
  },

  fantasy: {
    patterns: [],
    requirements: [],
  },

  'sci-fi': {
    patterns: [],
    requirements: [],
  },

  literary: {
    patterns: [
      {
        pattern: /\b(said|felt|thought|realized)\b.*\b(deeply|profoundly|truly|really)\b/i,
        issue: 'Show emotion through action and subtext, not adverbs.',
        severity: 'warning',
      },
    ],
    requirements: [],
  },

  historical: {
    patterns: [
      {
        pattern: /\b(okay|OK|cool|awesome|nice)\b/i,
        issue: 'Modern slang in historical setting breaks immersion.',
        severity: 'error',
      },
    ],
    requirements: [],
  },
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Full genre-aware validation
 */
export function validateWithGenreRules(
  text: string,
  config: GenreValidationConfig,
  previousText?: string
): GenreValidationReport {
  // Run base narrative validation
  const baseReport = NarrativeValidator.validate(
    text,
    config.characterNames,
    previousText,
    {}
  );

  // Voice profile validation
  const voiceResult = validateAllDialogue(text, config.bookId);
  const voiceValidation = {
    valid: voiceResult.valid,
    violations: voiceResult.allViolations,
  };

  // Tension arc validation
  const tensionResult = validateContentTension(text, config.bookId, config.chapter);
  const arcs = getTensionArcs(config.bookId);
  const tensionValidation = {
    valid: tensionResult.valid,
    violations: tensionResult.violations,
    currentArcs: arcs.map(a => ({
      participants: a.participants,
      level: a.currentLevel,
      type: a.type,
    })),
  };

  // Secret/breadcrumb validation
  const pending = getSecretsPendingBreadcrumbs(config.bookId, config.chapter);
  const unrevealed = getUnrevealedSecrets(config.bookId);
  const revealable = unrevealed.filter(s => s.breadcrumbs.length >= 3);

  const secretWarnings: string[] = [];
  for (const { secret, urgency } of pending) {
    if (urgency === 'critical') {
      secretWarnings.push(`CRITICAL: "${secret.description}" needs breadcrumbs NOW`);
    }
  }

  const secretValidation = {
    valid: pending.filter(p => p.urgency === 'critical').length === 0,
    warnings: secretWarnings,
    pendingBreadcrumbs: pending.map(p => ({
      secret: p.secret.description,
      urgency: p.urgency,
    })),
    revealableSecrets: revealable.map(s => s.description),
  };

  // Domain accuracy validation
  const domainResult = validateDomainAccuracy(text, config.domains);
  const domainValidation = {
    valid: domainResult.valid,
    violations: domainResult.violations,
  };

  // Genre-specific pattern validation
  const genreSuggestions: string[] = [];
  const allGenres = [config.primaryGenre, ...config.secondaryGenres];

  for (const genre of allGenres) {
    const rules = GENRE_VALIDATION_RULES[genre];
    if (!rules) continue;

    // Check patterns
    for (const { pattern, issue, severity } of rules.patterns) {
      if (pattern.test(text)) {
        if (severity === 'error') {
          baseReport.corrections.push(`GENRE ERROR (${genre}): ${issue}`);
        } else {
          genreSuggestions.push(`${genre.toUpperCase()}: ${issue}`);
        }
      }
    }

    // Check requirements
    for (const { check, requirement } of rules.requirements) {
      if (!check(text)) {
        genreSuggestions.push(`${genre.toUpperCase()}: ${requirement}`);
      }
    }
  }

  // Determine overall genre validity
  const genreValid = config.strictMode
    ? voiceValidation.valid &&
      tensionValidation.valid &&
      secretValidation.valid &&
      domainValidation.valid
    : domainValidation.violations.filter(v =>
        v.rule.toLowerCase().includes('critical')
      ).length === 0;

  return {
    ...baseReport,
    voiceValidation,
    tensionValidation,
    secretValidation,
    domainValidation,
    genreSuggestions,
    genreValid,
    // Update overall validity to include genre checks
    isValid: baseReport.isValid && genreValid,
  };
}

/**
 * Quick genre validation (for performance)
 */
export function quickValidateGenre(
  text: string,
  config: GenreValidationConfig
): { valid: boolean; primaryIssue: string | null } {
  // Quick narrative check
  const narrativeCheck = NarrativeValidator.quickCheck(text, config.characterNames);
  if (!narrativeCheck.isValid) {
    return narrativeCheck;
  }

  // Quick domain check (most critical)
  if (config.domains.length > 0) {
    const domainResult = validateDomainAccuracy(text, config.domains);
    const criticalViolations = domainResult.violations.filter(
      v => v.correction.toLowerCase().includes('critical')
    );
    if (criticalViolations.length > 0) {
      return {
        valid: false,
        primaryIssue: `Domain accuracy: ${criticalViolations[0].violation}`,
      };
    }
  }

  // Quick tension check
  const tensionResult = validateContentTension(text, config.bookId, config.chapter);
  if (!tensionResult.valid && tensionResult.violations.length > 0) {
    return {
      valid: false,
      primaryIssue: `Tension: ${tensionResult.violations[0]}`,
    };
  }

  return { valid: true, primaryIssue: null };
}

/**
 * Validate a specific genre's rules only
 */
export function validateGenrePatterns(
  text: string,
  genre: GenreType
): { valid: boolean; issues: string[] } {
  const rules = GENRE_VALIDATION_RULES[genre];
  if (!rules) {
    return { valid: true, issues: [] };
  }

  const issues: string[] = [];

  for (const { pattern, issue, severity } of rules.patterns) {
    if (pattern.test(text)) {
      issues.push(`[${severity.toUpperCase()}] ${issue}`);
    }
  }

  return {
    valid: issues.filter(i => i.includes('[ERROR]')).length === 0,
    issues,
  };
}

/**
 * Get genre-specific writing suggestions
 */
export function getGenreSuggestions(
  text: string,
  genre: GenreType,
  chapter: number
): string[] {
  const suggestions: string[] = [];
  const rules = GENRE_VALIDATION_RULES[genre];

  if (!rules) return suggestions;

  // Check requirements
  for (const { check, requirement } of rules.requirements) {
    if (!check(text)) {
      suggestions.push(requirement);
    }
  }

  // Genre-specific suggestions based on chapter position
  switch (genre) {
    case 'mystery':
      if (chapter <= 3) {
        suggestions.push('Early chapters: Establish the crime and initial suspects.');
      } else if (chapter >= 8) {
        suggestions.push('Late chapters: Start connecting clues. Plant final breadcrumb.');
      }
      break;

    case 'romance':
      if (chapter <= 3) {
        suggestions.push('Early chapters: First encounter and initial spark.');
      } else if (chapter >= 6 && chapter <= 8) {
        suggestions.push('Mid chapters: Build tension. Near-miss moments.');
      }
      break;

    case 'thriller':
      suggestions.push('Every chapter should end with a question or threat.');
      if (chapter >= 5) {
        suggestions.push('Stakes should be escalating. What\'s the ticking clock?');
      }
      break;

    case 'horror':
      if (chapter <= 3) {
        suggestions.push('Early chapters: Build unease. Something is wrong.');
      }
      suggestions.push('Horror tip: What\'s NOT shown is scarier than what is.');
      break;
  }

  return suggestions;
}

/**
 * Validate romance pacing specifically
 */
export function validateRomancePacing(
  bookId: string,
  chapter: number
): {
  valid: boolean;
  arcs: { participants: string[]; level: number; suggestions: string[] }[];
} {
  const arcs = getTensionArcs(bookId).filter(a => a.type === 'romantic');
  const result: {
    participants: string[];
    level: number;
    suggestions: string[];
  }[] = [];

  for (const arc of arcs) {
    const suggestions: string[] = [];

    // Check for appropriate pacing
    if (chapter <= 3 && arc.currentLevel > 4) {
      suggestions.push('Romance progressing too fast for early chapters.');
    }

    if (chapter >= 5 && arc.currentLevel < 3) {
      suggestions.push('Romance should have more tension by now.');
    }

    if (arc.peakChapter && arc.peakChapter - chapter <= 2 && arc.currentLevel < 7) {
      suggestions.push(`Peak in ${arc.peakChapter - chapter} chapters but tension is only ${arc.currentLevel}/10.`);
    }

    result.push({
      participants: arc.participants,
      level: arc.currentLevel,
      suggestions,
    });
  }

  const hasIssues = result.some(r => r.suggestions.length > 0);
  return { valid: !hasIssues, arcs: result };
}

/**
 * Validate mystery fairness
 */
export function validateMysteryFairness(
  bookId: string,
  chapter: number
): {
  valid: boolean;
  secrets: { description: string; breadcrumbs: number; canReveal: boolean }[];
  warnings: string[];
} {
  const secrets = getUnrevealedSecrets(bookId);
  const warnings: string[] = [];

  const secretStatuses = secrets.map(secret => {
    const validation = validateReveal(bookId, secret.id, chapter);
    return {
      description: secret.description,
      breadcrumbs: secret.breadcrumbs.length,
      canReveal: validation.canReveal,
    };
  });

  // Check for fair-play violations
  for (const status of secretStatuses) {
    if (status.breadcrumbs === 0 && chapter >= 5) {
      warnings.push(`Secret "${status.description}" has no breadcrumbs after ${chapter} chapters.`);
    }
  }

  return {
    valid: warnings.length === 0,
    secrets: secretStatuses,
    warnings,
  };
}
