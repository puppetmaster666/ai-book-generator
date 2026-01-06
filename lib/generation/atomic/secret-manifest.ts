/**
 * Secret Manifest System
 *
 * Manages plot twists and ensures fair-play reveals.
 * ENFORCES: Minimum breadcrumbs before any reveal (no deus ex machina).
 *
 * FORMAT-AWARE:
 * - TEXT (novels): Minimum 3 breadcrumbs required
 * - VISUAL (comics): Minimum 2 breadcrumbs (visual clues are powerful)
 * - SCREENPLAY: Minimum 2 breadcrumbs (action-based reveals preferred)
 *
 * Every secret must have:
 * - Setup: When the secret is planted in the story
 * - Breadcrumbs: Hints that point to the secret
 * - Reveal: When the secret is exposed to the reader
 *
 * This prevents:
 * - Out-of-nowhere plot twists
 * - Unearned revelations
 * - Deus ex machina resolutions
 */

import { FormatCategory } from './format-behavioral';

// Format-specific breadcrumb requirements
const FORMAT_BREADCRUMB_REQUIREMENTS: Record<FormatCategory, {
  minBreadcrumbs: number;
  preferredTypes: BreadcrumbType[];
  notes: string;
}> = {
  text: {
    minBreadcrumbs: 3,
    preferredTypes: ['verbal_slip', 'behavioral', 'backstory_hint', 'third_party', 'document', 'foreshadowing'],
    notes: 'Breadcrumbs can be subtle. Internal monologue can hint at secrets.',
  },
  visual: {
    minBreadcrumbs: 2,
    preferredTypes: ['physical_clue', 'symbolic', 'behavioral', 'foreshadowing'],
    notes: 'Visual clues in art count as breadcrumbs. One powerful image can replace verbal hints.',
  },
  screenplay: {
    minBreadcrumbs: 2,
    preferredTypes: ['behavioral', 'physical_clue', 'verbal_slip', 'foreshadowing'],
    notes: 'Plant clues in action lines. Reveals should be action-based, not exposition.',
  },
};

export type SecretType =
  | 'identity'      // Character is not who they seem
  | 'affair'        // Hidden relationship
  | 'betrayal'      // Character working against others
  | 'crime'         // Past or ongoing criminal activity
  | 'illness'       // Hidden health condition
  | 'lineage'       // Hidden family connection
  | 'survival'      // Character thought dead is alive
  | 'motivation'    // True reason for actions
  | 'conspiracy'    // Larger plot at work
  | 'supernatural'  // Hidden magical/supernatural element
  | 'other';

export type BreadcrumbType =
  | 'verbal_slip'        // Character almost reveals truth
  | 'physical_clue'      // Object or visual hint
  | 'behavioral'         // Unusual behavior that hints at truth
  | 'backstory_hint'     // Past reference that connects
  | 'third_party'        // Another character mentions something
  | 'document'           // Letter, photo, record
  | 'dream_memory'       // Dream or flashback hint
  | 'foreshadowing'      // Narrative foreshadowing
  | 'symbolic';          // Symbolic imagery

export interface Breadcrumb {
  id: string;
  chapter: number;
  type: BreadcrumbType;
  description: string;
  obviousness: 'subtle' | 'moderate' | 'obvious';
  connectedTo: string;      // Secret ID this breadcrumb hints at
  wasNoticed?: boolean;     // Did characters notice this in-story?
  retroactivelyObvious: boolean;  // Will reader see this in hindsight?
}

export interface Secret {
  id: string;
  type: SecretType;
  description: string;
  truthSummary: string;         // What the actual truth is
  heldBy: string[];             // Characters who know
  hiddenFrom: string[];         // Characters in the dark
  stakes: string;               // Why this matters
  setupChapter: number;         // When secret was established
  breadcrumbs: Breadcrumb[];    // Hints planted
  revealChapter?: number;       // When revealed (if revealed)
  revealMethod?: string;        // How it was revealed
  isRevealed: boolean;
}

export interface RevealValidation {
  canReveal: boolean;
  breadcrumbCount: number;
  minimumRequired: number;
  missingBreadcrumbTypes: BreadcrumbType[];
  warnings: string[];
  suggestions: string[];
}

export interface SecretManifestState {
  secrets: Secret[];
  revealedSecrets: Secret[];
  upcomingReveals: { secretId: string; targetChapter: number }[];
}

/**
 * Store for secret manifests per book
 */
const SECRET_MANIFESTS: Map<string, SecretManifestState> = new Map();

/**
 * Minimum breadcrumbs required before reveal
 */
const MIN_BREADCRUMBS = 3;

/**
 * Recommended breadcrumb type distribution for fair reveals
 */
const BREADCRUMB_DIVERSITY_MIN = 2;  // At least 2 different types

/**
 * Initialize or get secret manifest for a book
 */
export function getSecretManifest(bookId: string): SecretManifestState {
  if (!SECRET_MANIFESTS.has(bookId)) {
    SECRET_MANIFESTS.set(bookId, {
      secrets: [],
      revealedSecrets: [],
      upcomingReveals: [],
    });
  }
  return SECRET_MANIFESTS.get(bookId)!;
}

/**
 * Register a new secret
 */
export function registerSecret(
  bookId: string,
  secret: Omit<Secret, 'id' | 'breadcrumbs' | 'isRevealed'>
): Secret {
  const manifest = getSecretManifest(bookId);

  const newSecret: Secret = {
    ...secret,
    id: `secret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    breadcrumbs: [],
    isRevealed: false,
  };

  manifest.secrets.push(newSecret);
  return newSecret;
}

/**
 * Get a secret by ID
 */
export function getSecret(bookId: string, secretId: string): Secret | undefined {
  const manifest = getSecretManifest(bookId);
  return manifest.secrets.find(s => s.id === secretId);
}

/**
 * Get all unrevealed secrets
 */
export function getUnrevealedSecrets(bookId: string): Secret[] {
  const manifest = getSecretManifest(bookId);
  return manifest.secrets.filter(s => !s.isRevealed);
}

/**
 * Add a breadcrumb for a secret
 */
export function addBreadcrumb(
  bookId: string,
  secretId: string,
  breadcrumb: Omit<Breadcrumb, 'id' | 'connectedTo'>
): Breadcrumb | null {
  const secret = getSecret(bookId, secretId);
  if (!secret) return null;

  const newBreadcrumb: Breadcrumb = {
    ...breadcrumb,
    id: `bc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    connectedTo: secretId,
  };

  secret.breadcrumbs.push(newBreadcrumb);
  return newBreadcrumb;
}

/**
 * Validate if a secret can be revealed
 * This is the CORE ENFORCEMENT function
 * Optional format parameter for format-aware requirements
 */
export function validateReveal(
  bookId: string,
  secretId: string,
  proposedChapter: number,
  format: FormatCategory = 'text'
): RevealValidation {
  const secret = getSecret(bookId, secretId);
  const formatReqs = FORMAT_BREADCRUMB_REQUIREMENTS[format];
  const minRequired = formatReqs.minBreadcrumbs;

  if (!secret) {
    return {
      canReveal: false,
      breadcrumbCount: 0,
      minimumRequired: minRequired,
      missingBreadcrumbTypes: [],
      warnings: [`Secret ${secretId} not found`],
      suggestions: [],
    };
  }

  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Count valid breadcrumbs (must be before the reveal chapter)
  const validBreadcrumbs = secret.breadcrumbs.filter(b => b.chapter < proposedChapter);
  const breadcrumbCount = validBreadcrumbs.length;

  // Check minimum count (format-specific)
  if (breadcrumbCount < minRequired) {
    warnings.push(
      `CANNOT REVEAL: Only ${breadcrumbCount} breadcrumbs planted. ` +
      `Minimum ${minRequired} required for ${format} format. This would be a deus ex machina.`
    );

    const remaining = minRequired - breadcrumbCount;
    suggestions.push(`Plant ${remaining} more breadcrumb(s) in earlier chapters before revealing.`);

    // Add format-specific suggestions
    if (format === 'visual') {
      suggestions.push('For comics: Visual clues in art (background details, expressions) count as breadcrumbs.');
    } else if (format === 'screenplay') {
      suggestions.push('For scripts: Plant clues in action lines and production design, not dialogue.');
    }
  }

  // Check breadcrumb diversity
  const breadcrumbTypes = new Set(validBreadcrumbs.map(b => b.type));
  if (breadcrumbTypes.size < BREADCRUMB_DIVERSITY_MIN && breadcrumbCount >= minRequired) {
    warnings.push(
      `Low breadcrumb diversity: Only ${breadcrumbTypes.size} type(s) used. ` +
      `Consider using at least ${BREADCRUMB_DIVERSITY_MIN} different types.`
    );
  }

  // Check for at least one obvious breadcrumb
  const hasObvious = validBreadcrumbs.some(b => b.obviousness !== 'subtle');
  if (!hasObvious && breadcrumbCount >= minRequired) {
    suggestions.push(
      'All breadcrumbs are subtle. Consider adding at least one moderate/obvious hint ' +
      'so readers don\'t feel cheated.'
    );
  }

  // Check spacing (breadcrumbs shouldn't all be in same chapter) - less strict for visual/screenplay
  const chapters = new Set(validBreadcrumbs.map(b => b.chapter));
  const minSpacing = format === 'text' ? 3 : 2;
  if (chapters.size < Math.min(minSpacing, breadcrumbCount)) {
    warnings.push(
      'Breadcrumbs are clustered too close together. ' +
      `Spread them across more ${format === 'text' ? 'chapters' : format === 'visual' ? 'pages' : 'scenes'} for better buildup.`
    );
  }

  // Check recency (at least one breadcrumb should be recent)
  const recentBreadcrumb = validBreadcrumbs.some(b => proposedChapter - b.chapter <= 3);
  if (!recentBreadcrumb && breadcrumbCount >= minRequired) {
    suggestions.push(
      'No recent breadcrumbs. Add a hint in the last 3 chapters to keep the reveal fresh.'
    );
  }

  // Suggest format-preferred breadcrumb types
  const preferredTypes = formatReqs.preferredTypes;
  const unusedPreferredTypes = preferredTypes.filter(t => !breadcrumbTypes.has(t));

  return {
    canReveal: breadcrumbCount >= minRequired,
    breadcrumbCount,
    minimumRequired: minRequired,
    missingBreadcrumbTypes: unusedPreferredTypes.slice(0, 3),  // Suggest format-preferred types
    warnings,
    suggestions,
  };
}

/**
 * Get format-specific breadcrumb requirements
 */
export function getFormatBreadcrumbRequirements(format: FormatCategory): {
  minBreadcrumbs: number;
  preferredTypes: BreadcrumbType[];
  notes: string;
} {
  return FORMAT_BREADCRUMB_REQUIREMENTS[format];
}

/**
 * Execute a reveal (only if validation passes)
 */
export function revealSecret(
  bookId: string,
  secretId: string,
  chapter: number,
  method: string
): { success: boolean; validation: RevealValidation } {
  const validation = validateReveal(bookId, secretId, chapter);

  if (!validation.canReveal) {
    return { success: false, validation };
  }

  const secret = getSecret(bookId, secretId);
  if (secret) {
    secret.isRevealed = true;
    secret.revealChapter = chapter;
    secret.revealMethod = method;

    // Move to revealed list
    const manifest = getSecretManifest(bookId);
    manifest.revealedSecrets.push(secret);

    // Remove from upcoming reveals if scheduled
    manifest.upcomingReveals = manifest.upcomingReveals.filter(
      ur => ur.secretId !== secretId
    );
  }

  return { success: true, validation };
}

/**
 * Schedule a reveal for a future chapter
 */
export function scheduleReveal(
  bookId: string,
  secretId: string,
  targetChapter: number
): { scheduled: boolean; warnings: string[] } {
  const manifest = getSecretManifest(bookId);
  const secret = getSecret(bookId, secretId);

  if (!secret) {
    return { scheduled: false, warnings: [`Secret ${secretId} not found`] };
  }

  const warnings: string[] = [];

  // Check if enough breadcrumbs will exist
  const currentBreadcrumbs = secret.breadcrumbs.length;
  const chaptersUntilReveal = targetChapter - (secret.breadcrumbs[secret.breadcrumbs.length - 1]?.chapter || 0);

  if (currentBreadcrumbs < MIN_BREADCRUMBS) {
    const needed = MIN_BREADCRUMBS - currentBreadcrumbs;
    warnings.push(
      `Need ${needed} more breadcrumb(s) before chapter ${targetChapter}. ` +
      `Current: ${currentBreadcrumbs}/${MIN_BREADCRUMBS}`
    );
  }

  manifest.upcomingReveals.push({ secretId, targetChapter });

  return { scheduled: true, warnings };
}

/**
 * Get secrets that need breadcrumbs soon
 */
export function getSecretsPendingBreadcrumbs(
  bookId: string,
  currentChapter: number
): { secret: Secret; urgency: 'critical' | 'soon' | 'normal' }[] {
  const manifest = getSecretManifest(bookId);
  const pending: { secret: Secret; urgency: 'critical' | 'soon' | 'normal' }[] = [];

  for (const scheduled of manifest.upcomingReveals) {
    const secret = getSecret(bookId, scheduled.secretId);
    if (!secret || secret.isRevealed) continue;

    const chaptersRemaining = scheduled.targetChapter - currentChapter;
    const breadcrumbsNeeded = MIN_BREADCRUMBS - secret.breadcrumbs.length;

    if (breadcrumbsNeeded > 0) {
      let urgency: 'critical' | 'soon' | 'normal' = 'normal';

      if (breadcrumbsNeeded >= chaptersRemaining) {
        urgency = 'critical';
      } else if (breadcrumbsNeeded >= chaptersRemaining - 2) {
        urgency = 'soon';
      }

      pending.push({ secret, urgency });
    }
  }

  return pending.sort((a, b) => {
    const urgencyOrder = { critical: 0, soon: 1, normal: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
}

/**
 * Auto-detect breadcrumbs in generated content
 */
export function detectBreadcrumbsInContent(
  content: string,
  bookId: string
): { secretId: string; potentialBreadcrumb: string; type: BreadcrumbType }[] {
  const manifest = getSecretManifest(bookId);
  const detected: { secretId: string; potentialBreadcrumb: string; type: BreadcrumbType }[] = [];

  for (const secret of manifest.secrets.filter(s => !s.isRevealed)) {
    // Check for verbal slips (character almost saying something)
    const verbalSlipPatterns = [
      /\b(almost|nearly|started to) (said|mentioned|revealed|told)\b/i,
      /\b(caught|stopped) (himself|herself|themselves)\b/i,
      /\b"I..."|"Well, I..."\b/,
    ];

    for (const pattern of verbalSlipPatterns) {
      if (pattern.test(content)) {
        // Check if any secret holder is mentioned
        const holderMentioned = secret.heldBy.some(h =>
          new RegExp(`\\b${h}\\b`, 'i').test(content)
        );
        if (holderMentioned) {
          detected.push({
            secretId: secret.id,
            potentialBreadcrumb: 'Verbal slip detected near secret holder',
            type: 'verbal_slip',
          });
        }
      }
    }

    // Check for behavioral hints
    const behavioralPatterns = [
      /\b(nervously|anxiously|guiltily|evasively)\b/i,
      /\b(avoided|deflected|changed the subject)\b/i,
      /\b(flinched|paled|froze) (when|at)\b/i,
    ];

    for (const pattern of behavioralPatterns) {
      if (pattern.test(content)) {
        const holderMentioned = secret.heldBy.some(h =>
          new RegExp(`\\b${h}\\b`, 'i').test(content)
        );
        if (holderMentioned) {
          detected.push({
            secretId: secret.id,
            potentialBreadcrumb: 'Behavioral hint from secret holder',
            type: 'behavioral',
          });
        }
      }
    }

    // Check for document/physical clue mentions
    const physicalPatterns = [
      /\b(letter|document|photo|photograph|file|folder|envelope)\b/i,
      /\b(hidden|secret|concealed|tucked away)\b/i,
    ];

    for (const pattern of physicalPatterns) {
      if (pattern.test(content)) {
        detected.push({
          secretId: secret.id,
          potentialBreadcrumb: 'Physical clue mentioned',
          type: 'physical_clue',
        });
        break;
      }
    }
  }

  return detected;
}

/**
 * Generate secret manifest summary for prompt injection
 */
export function generateSecretManifestSummary(bookId: string): string {
  const manifest = getSecretManifest(bookId);

  if (manifest.secrets.length === 0) return '';

  let summary = '\n=== SECRET MANIFEST ===\n';
  summary += 'RULE: Every reveal requires MINIMUM 3 breadcrumbs. No deus ex machina.\n\n';

  // Active secrets
  const activeSecrets = manifest.secrets.filter(s => !s.isRevealed);
  if (activeSecrets.length > 0) {
    summary += 'ACTIVE SECRETS:\n';
    for (const secret of activeSecrets) {
      summary += `\n  "${secret.description}" (${secret.type})\n`;
      summary += `    Known by: ${secret.heldBy.join(', ')}\n`;
      summary += `    Hidden from: ${secret.hiddenFrom.join(', ')}\n`;
      summary += `    Breadcrumbs planted: ${secret.breadcrumbs.length}/${MIN_BREADCRUMBS}\n`;

      if (secret.breadcrumbs.length < MIN_BREADCRUMBS) {
        summary += `    STATUS: NEEDS ${MIN_BREADCRUMBS - secret.breadcrumbs.length} MORE BREADCRUMB(S)\n`;
      } else {
        summary += `    STATUS: CAN BE REVEALED\n`;
      }

      // List breadcrumbs
      if (secret.breadcrumbs.length > 0) {
        summary += `    Breadcrumbs:\n`;
        for (const bc of secret.breadcrumbs) {
          summary += `      - Ch${bc.chapter}: ${bc.type} (${bc.obviousness})\n`;
        }
      }
    }
    summary += '\n';
  }

  // Upcoming reveals
  if (manifest.upcomingReveals.length > 0) {
    summary += 'SCHEDULED REVEALS:\n';
    for (const ur of manifest.upcomingReveals) {
      const secret = getSecret(bookId, ur.secretId);
      if (secret) {
        const needed = MIN_BREADCRUMBS - secret.breadcrumbs.length;
        summary += `  - "${secret.description}" → Chapter ${ur.targetChapter}`;
        if (needed > 0) {
          summary += ` (NEEDS ${needed} more breadcrumbs!)`;
        }
        summary += '\n';
      }
    }
    summary += '\n';
  }

  // Recently revealed
  const recentlyRevealed = manifest.revealedSecrets.slice(-3);
  if (recentlyRevealed.length > 0) {
    summary += 'RECENTLY REVEALED:\n';
    for (const secret of recentlyRevealed) {
      summary += `  - "${secret.description}" (Ch${secret.revealChapter})\n`;
    }
  }

  return summary;
}

/**
 * Generate breadcrumb suggestions for a chapter
 */
export function generateBreadcrumbSuggestions(
  bookId: string,
  currentChapter: number
): string[] {
  const suggestions: string[] = [];
  const pending = getSecretsPendingBreadcrumbs(bookId, currentChapter);

  for (const { secret, urgency } of pending) {
    const prefix = urgency === 'critical' ? 'CRITICAL: ' :
                   urgency === 'soon' ? 'SOON: ' : '';

    // Get unused breadcrumb types for this secret
    const usedTypes = new Set(secret.breadcrumbs.map(b => b.type));
    const allTypes: BreadcrumbType[] = ['verbal_slip', 'behavioral', 'physical_clue', 'backstory_hint', 'third_party'];
    const unusedTypes: BreadcrumbType[] = allTypes.filter(t => !usedTypes.has(t));

    const suggestedType = unusedTypes[0] || 'behavioral';

    suggestions.push(
      `${prefix}"${secret.description}" needs breadcrumb. ` +
      `Try: ${suggestedType} from ${secret.heldBy[0]}.`
    );
  }

  return suggestions;
}

/**
 * Clear all secrets for a book (for cleanup/reset)
 */
export function clearSecretManifest(bookId: string): void {
  SECRET_MANIFESTS.delete(bookId);
}
