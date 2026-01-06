/**
 * Tension Slider System
 *
 * The "Slider" for romance and drama pacing - ENFORCES gradual progression.
 * Key rule: Tension can only move ±1 point per chapter (no sudden jumps).
 *
 * FORMAT-AWARE:
 * - TEXT (novels): Chapter-based, ±1 per chapter
 * - VISUAL (comics): Page-based, ±2 per page (faster visual pacing OK)
 * - SCREENPLAY: Scene-based, ±2 per scene
 *
 * This prevents:
 * - Characters going from strangers to lovers in one chapter
 * - Sudden emotional reversals without buildup
 * - Rushed intimacy that feels unearned
 */

import { FormatCategory } from './format-behavioral';

export type TensionType = 'romantic' | 'dramatic' | 'conflict' | 'mystery' | 'horror';

// Format-specific tension change limits
const FORMAT_TENSION_LIMITS: Record<FormatCategory, { maxChange: number; unit: string }> = {
  text: { maxChange: 1, unit: 'chapter' },
  visual: { maxChange: 2, unit: 'page' },
  screenplay: { maxChange: 2, unit: 'scene' },
};

export interface TensionPoint {
  chapter: number;
  level: number;         // 0-10 scale
  reason: string;        // What caused this level
  anchors: string[];     // Sensory/emotional anchors that justify this level
}

export interface TensionArc {
  id: string;
  type: TensionType;
  participants: string[];     // Characters involved in this tension
  currentLevel: number;       // Current tension level (0-10)
  targetLevel: number;        // Where the arc is heading
  history: TensionPoint[];    // Progression over chapters
  peakChapter?: number;       // When tension should peak
  resolutionChapter?: number; // When tension resolves
}

export interface TensionValidationResult {
  valid: boolean;
  currentLevel: number;
  proposedLevel: number;
  maxAllowedChange: number;
  violations: string[];
  suggestions: string[];
}

export interface SensoryAnchor {
  type: 'touch' | 'gaze' | 'proximity' | 'breath' | 'heartbeat' | 'temperature';
  description: string;
  intensityLevel: number;  // 1-10, must match tension level
}

/**
 * Store for tension arcs per book
 */
const TENSION_ARCS: Map<string, TensionArc[]> = new Map();

/**
 * Maximum tension change allowed per chapter
 * This is the core enforcement rule
 */
const MAX_TENSION_CHANGE_PER_CHAPTER = 1;

/**
 * Register a new tension arc
 */
export function registerTensionArc(
  bookId: string,
  arc: Omit<TensionArc, 'id' | 'history' | 'currentLevel'>
): TensionArc {
  if (!TENSION_ARCS.has(bookId)) {
    TENSION_ARCS.set(bookId, []);
  }

  const newArc: TensionArc = {
    ...arc,
    id: `tension_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    currentLevel: 0,
    history: [{
      chapter: 0,
      level: 0,
      reason: 'Arc initialized',
      anchors: [],
    }],
  };

  TENSION_ARCS.get(bookId)!.push(newArc);
  return newArc;
}

/**
 * Get all tension arcs for a book
 */
export function getTensionArcs(bookId: string): TensionArc[] {
  return TENSION_ARCS.get(bookId) || [];
}

/**
 * Get a specific tension arc
 */
export function getTensionArc(bookId: string, arcId: string): TensionArc | undefined {
  return TENSION_ARCS.get(bookId)?.find(a => a.id === arcId);
}

/**
 * Get tension arc between two characters
 */
export function getTensionBetween(
  bookId: string,
  char1: string,
  char2: string,
  type?: TensionType
): TensionArc | undefined {
  const arcs = TENSION_ARCS.get(bookId) || [];
  return arcs.find(a => {
    const hasChar1 = a.participants.some(p => p.toLowerCase() === char1.toLowerCase());
    const hasChar2 = a.participants.some(p => p.toLowerCase() === char2.toLowerCase());
    const typeMatch = !type || a.type === type;
    return hasChar1 && hasChar2 && typeMatch;
  });
}

/**
 * Validate a proposed tension change
 * This is the core ENFORCEMENT function
 * Optional format parameter for format-aware limits
 */
export function validateTensionChange(
  bookId: string,
  arcId: string,
  proposedLevel: number,
  chapter: number,
  reason: string,
  format: FormatCategory = 'text'
): TensionValidationResult {
  const arc = getTensionArc(bookId, arcId);
  const formatLimits = FORMAT_TENSION_LIMITS[format];
  const maxChange = formatLimits.maxChange;
  const unit = formatLimits.unit;

  if (!arc) {
    return {
      valid: false,
      currentLevel: 0,
      proposedLevel,
      maxAllowedChange: maxChange,
      violations: [`Tension arc ${arcId} not found`],
      suggestions: [],
    };
  }

  const violations: string[] = [];
  const suggestions: string[] = [];
  const change = Math.abs(proposedLevel - arc.currentLevel);

  // CORE RULE: Max change per unit (format-specific)
  if (change > maxChange) {
    violations.push(
      `Tension change too rapid: ${arc.currentLevel} → ${proposedLevel} (change of ${change}). ` +
      `Maximum allowed change is ±${maxChange} per ${unit}.`
    );

    // Suggest the maximum allowed level
    const direction = proposedLevel > arc.currentLevel ? 1 : -1;
    const maxAllowed = arc.currentLevel + (direction * maxChange);
    suggestions.push(`Maximum tension level for this ${unit}: ${maxAllowed}`);

    if (proposedLevel > arc.currentLevel) {
      if (format === 'visual') {
        suggestions.push('Use visual pacing (panel size, layout) to build tension more gradually.');
      } else if (format === 'screenplay') {
        suggestions.push('Build tension through scene beats and action.');
      } else {
        suggestions.push('Build tension more gradually with sensory anchors and emotional beats.');
        suggestions.push(`Add an intermediate ${unit} to bridge the gap.`);
      }
    } else {
      suggestions.push(`Cool down the tension gradually. Sudden drops feel unearned.`);
    }
  }

  // Check for level bounds
  if (proposedLevel < 0 || proposedLevel > 10) {
    violations.push(`Tension level must be between 0 and 10. Proposed: ${proposedLevel}`);
  }

  // Check for sensory anchor requirements at high levels
  if (proposedLevel >= 7 && arc.type === 'romantic') {
    suggestions.push('High romantic tension (7+) requires multiple sensory anchors.');
    suggestions.push('Include: touch, proximity, breath awareness, heartbeat, temperature.');
  }

  // Check for dramatic escalation rules
  if (arc.type === 'dramatic' && proposedLevel >= 8) {
    suggestions.push('Extreme dramatic tension (8+) should be earned through conflict buildup.');
  }

  return {
    valid: violations.length === 0,
    currentLevel: arc.currentLevel,
    proposedLevel,
    maxAllowedChange: MAX_TENSION_CHANGE_PER_CHAPTER,
    violations,
    suggestions,
  };
}

/**
 * Update tension level (only if validation passes)
 */
export function updateTensionLevel(
  bookId: string,
  arcId: string,
  newLevel: number,
  chapter: number,
  reason: string,
  anchors: string[] = []
): { success: boolean; result: TensionValidationResult } {
  const validation = validateTensionChange(bookId, arcId, newLevel, chapter, reason);

  if (!validation.valid) {
    return { success: false, result: validation };
  }

  const arc = getTensionArc(bookId, arcId);
  if (arc) {
    arc.currentLevel = newLevel;
    arc.history.push({
      chapter,
      level: newLevel,
      reason,
      anchors,
    });
  }

  return { success: true, result: validation };
}

/**
 * Generate sensory anchors appropriate for a tension level
 */
export function generateSensoryAnchors(
  tensionLevel: number,
  type: TensionType
): SensoryAnchor[] {
  const anchors: SensoryAnchor[] = [];

  if (type === 'romantic') {
    if (tensionLevel >= 2) {
      anchors.push({
        type: 'gaze',
        description: 'Eyes meeting across the room',
        intensityLevel: 2,
      });
    }
    if (tensionLevel >= 3) {
      anchors.push({
        type: 'proximity',
        description: 'Standing closer than necessary',
        intensityLevel: 3,
      });
    }
    if (tensionLevel >= 4) {
      anchors.push({
        type: 'touch',
        description: 'Accidental brush of hands',
        intensityLevel: 4,
      });
    }
    if (tensionLevel >= 5) {
      anchors.push({
        type: 'breath',
        description: 'Awareness of each other\'s breathing',
        intensityLevel: 5,
      });
    }
    if (tensionLevel >= 6) {
      anchors.push({
        type: 'heartbeat',
        description: 'Racing heart, pulse visible in throat',
        intensityLevel: 6,
      });
    }
    if (tensionLevel >= 7) {
      anchors.push({
        type: 'temperature',
        description: 'Heat between bodies, flushed skin',
        intensityLevel: 7,
      });
    }
    if (tensionLevel >= 8) {
      anchors.push({
        type: 'touch',
        description: 'Deliberate, lingering contact',
        intensityLevel: 8,
      });
    }
  }

  if (type === 'dramatic' || type === 'conflict') {
    if (tensionLevel >= 3) {
      anchors.push({
        type: 'gaze',
        description: 'Hard stare, eye contact that doesn\'t break',
        intensityLevel: 3,
      });
    }
    if (tensionLevel >= 5) {
      anchors.push({
        type: 'breath',
        description: 'Breath held, controlled breathing',
        intensityLevel: 5,
      });
    }
    if (tensionLevel >= 7) {
      anchors.push({
        type: 'proximity',
        description: 'Invading personal space, squaring up',
        intensityLevel: 7,
      });
    }
  }

  if (type === 'horror' || type === 'mystery') {
    if (tensionLevel >= 2) {
      anchors.push({
        type: 'temperature',
        description: 'Cold creeping in, goosebumps',
        intensityLevel: 2,
      });
    }
    if (tensionLevel >= 4) {
      anchors.push({
        type: 'heartbeat',
        description: 'Heart pounding, blood rushing in ears',
        intensityLevel: 4,
      });
    }
    if (tensionLevel >= 6) {
      anchors.push({
        type: 'breath',
        description: 'Shallow breathing, afraid to make noise',
        intensityLevel: 6,
      });
    }
  }

  return anchors.filter(a => a.intensityLevel <= tensionLevel);
}

/**
 * Check if content has appropriate sensory anchors for its tension level
 */
export function validateSensoryAnchors(
  content: string,
  tensionLevel: number,
  type: TensionType
): { valid: boolean; missing: string[]; found: string[] } {
  const requiredAnchors = generateSensoryAnchors(tensionLevel, type);
  const found: string[] = [];
  const missing: string[] = [];

  // Sensory patterns to detect
  const patterns: Record<SensoryAnchor['type'], RegExp[]> = {
    gaze: [/\b(eyes|gaze|stare|look|glance|watch)\b/i, /\bmet (his|her|their) eyes\b/i],
    proximity: [/\b(close|near|beside|next to|inches away)\b/i, /\bpersonal space\b/i],
    touch: [/\b(touch|brush|graze|finger|hand|skin)\b/i, /\bcontact\b/i],
    breath: [/\b(breath|breathe|breathing|exhale|inhale|sigh)\b/i],
    heartbeat: [/\b(heart|pulse|pounding|racing|thump|beat)\b/i],
    temperature: [/\b(heat|warm|cold|chill|flush|burn|hot)\b/i],
  };

  for (const anchor of requiredAnchors) {
    const anchorPatterns = patterns[anchor.type] || [];
    const hasAnchor = anchorPatterns.some(pattern => pattern.test(content));

    if (hasAnchor) {
      found.push(anchor.type);
    } else {
      missing.push(anchor.type);
    }
  }

  // For high tension, we need at least 50% of required anchors
  const requiredRatio = tensionLevel >= 7 ? 0.5 : 0.3;
  const foundRatio = found.length / Math.max(1, requiredAnchors.length);

  return {
    valid: foundRatio >= requiredRatio,
    missing,
    found,
  };
}

/**
 * Generate tension summary for prompt injection
 */
export function generateTensionSummary(bookId: string): string {
  const arcs = getTensionArcs(bookId);
  if (arcs.length === 0) return '';

  let summary = '\n=== TENSION ARCS ===\n';
  summary += 'Tension changes are LIMITED to ±1 per chapter. Build gradually.\n\n';

  for (const arc of arcs) {
    const participants = arc.participants.join(' & ');
    summary += `${arc.type.toUpperCase()} TENSION: ${participants}\n`;
    summary += `  Current Level: ${arc.currentLevel}/10\n`;
    summary += `  Target Level: ${arc.targetLevel}/10\n`;

    if (arc.peakChapter) {
      summary += `  Peak Expected: Chapter ${arc.peakChapter}\n`;
    }

    // Show recent history
    const recentHistory = arc.history.slice(-3);
    if (recentHistory.length > 1) {
      summary += `  Recent progression:\n`;
      for (const point of recentHistory) {
        summary += `    Ch${point.chapter}: Level ${point.level} - ${point.reason}\n`;
      }
    }

    // Show allowed next level
    const maxNext = Math.min(10, arc.currentLevel + 1);
    const minNext = Math.max(0, arc.currentLevel - 1);
    summary += `  ALLOWED NEXT CHAPTER: ${minNext} to ${maxNext}\n`;

    // Show required anchors for next level up
    if (arc.currentLevel < arc.targetLevel) {
      const nextAnchors = generateSensoryAnchors(arc.currentLevel + 1, arc.type);
      if (nextAnchors.length > 0) {
        summary += `  To increase tension, include: ${nextAnchors.map(a => a.type).join(', ')}\n`;
      }
    }

    summary += '\n';
  }

  return summary;
}

/**
 * Get pacing suggestions for the next chapter
 */
export function getPacingSuggestions(
  bookId: string,
  currentChapter: number
): string[] {
  const arcs = getTensionArcs(bookId);
  const suggestions: string[] = [];

  for (const arc of arcs) {
    // Check if approaching peak
    if (arc.peakChapter && arc.peakChapter === currentChapter + 1) {
      suggestions.push(`${arc.type} tension between ${arc.participants.join(' & ')} should peak next chapter.`);
    }

    // Check if tension is stuck
    const recentHistory = arc.history.slice(-3);
    if (recentHistory.length >= 3) {
      const levels = recentHistory.map(h => h.level);
      if (levels[0] === levels[1] && levels[1] === levels[2]) {
        suggestions.push(`${arc.type} tension has been static for 3 chapters. Consider movement.`);
      }
    }

    // Check if behind target
    if (arc.peakChapter && arc.targetLevel > arc.currentLevel) {
      const chaptersToGo = arc.peakChapter - currentChapter;
      const levelsToGo = arc.targetLevel - arc.currentLevel;
      if (levelsToGo > chaptersToGo) {
        suggestions.push(
          `WARNING: ${arc.type} tension needs ${levelsToGo} more levels but only ` +
          `${chaptersToGo} chapters until peak. Increase every chapter.`
        );
      }
    }

    // Check if resolution is approaching
    if (arc.resolutionChapter && arc.resolutionChapter === currentChapter + 1) {
      suggestions.push(`${arc.type} arc between ${arc.participants.join(' & ')} should resolve next chapter.`);
    }
  }

  return suggestions;
}

/**
 * Validate that content doesn't skip tension levels
 * Optional format parameter for format-aware validation
 */
export function validateContentTension(
  content: string,
  bookId: string,
  chapter: number,
  format: FormatCategory = 'text'
): { valid: boolean; violations: string[] } {
  const arcs = getTensionArcs(bookId);
  const violations: string[] = [];

  // Check for sudden intimacy markers without buildup
  const suddenIntimacyPatterns = [
    { pattern: /\b(kiss|kissed|kissing)\b/i, minTension: 6 },
    { pattern: /\b(embrace|embraced|embracing)\b/i, minTension: 5 },
    { pattern: /\b(bed|bedroom|sheets|naked|undress)\b/i, minTension: 8 },
    { pattern: /\b(love|I love you)\b/i, minTension: 7 },
  ];

  for (const arc of arcs.filter(a => a.type === 'romantic')) {
    for (const { pattern, minTension } of suddenIntimacyPatterns) {
      if (pattern.test(content) && arc.currentLevel < minTension) {
        // Check if both participants are mentioned
        const bothPresent = arc.participants.every(p =>
          new RegExp(`\\b${p}\\b`, 'i').test(content)
        );
        if (bothPresent) {
          violations.push(
            `Content includes "${pattern.source}" but romantic tension between ` +
            `${arc.participants.join(' & ')} is only ${arc.currentLevel}/10. ` +
            `This requires tension level ${minTension}+.`
          );
        }
      }
    }
  }

  // Check for sudden conflict escalation
  const conflictPatterns = [
    { pattern: /\b(punch|punched|hit|struck|slapped)\b/i, minTension: 7 },
    { pattern: /\b(scream|screamed|yelled|shouted)\b/i, minTension: 5 },
    { pattern: /\b(fight|fighting|attacked)\b/i, minTension: 8 },
  ];

  for (const arc of arcs.filter(a => a.type === 'conflict' || a.type === 'dramatic')) {
    for (const { pattern, minTension } of conflictPatterns) {
      if (pattern.test(content) && arc.currentLevel < minTension) {
        const bothPresent = arc.participants.every(p =>
          new RegExp(`\\b${p}\\b`, 'i').test(content)
        );
        if (bothPresent) {
          violations.push(
            `Content includes "${pattern.source}" but conflict tension between ` +
            `${arc.participants.join(' & ')} is only ${arc.currentLevel}/10. ` +
            `This requires tension level ${minTension}+.`
          );
        }
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Clear all tension arcs for a book (for cleanup/reset)
 */
export function clearTensionArcs(bookId: string): void {
  TENSION_ARCS.delete(bookId);
}
