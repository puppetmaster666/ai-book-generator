/**
 * AI Cliché Remover - Post-Processing Layer
 *
 * Removes common AI-generated filler phrases that scream "AI wrote this".
 * These are sentence openers and transitions that LLMs overuse.
 *
 * CRITICAL: This must run BEFORE other post-processing to clean the slate.
 */

export interface AIClicheRemoverConfig {
  enabled: boolean;
  removeOpeners: boolean;      // "With a sigh,", "After a moment,", etc.
  removeTransitions: boolean;  // "Moreover", "Furthermore", etc.
  removeFillers: boolean;      // "It's worth noting", etc.
}

export interface AIClicheRemoverResult {
  text: string;
  changes: AIClicheChange[];
  totalRemoved: number;
  categories: {
    openers: number;
    transitions: number;
    fillers: number;
  };
}

export interface AIClicheChange {
  original: string;
  replacement: string;
  category: 'opener' | 'transition' | 'filler';
}

export const AI_CLICHE_REMOVER_DEFAULTS: AIClicheRemoverConfig = {
  enabled: true,
  removeOpeners: true,
  removeTransitions: true,
  removeFillers: true,
};

// AI opener clichés - these start sentences and are massive AI tells
const AI_OPENERS: Array<{ pattern: RegExp; category: 'opener' }> = [
  // High frequency AI openers (the worst offenders)
  { pattern: /(?<=^|[.!?]\s*)With a sigh,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)After a moment,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)Without hesitation,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)Slowly,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)Quietly,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)Finally,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)At last,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)Suddenly,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)Carefully,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)Gently,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)Reluctantly,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)Hesitantly,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)Instinctively,\s*/gim, category: 'opener' },
  { pattern: /(?<=^|[.!?]\s*)Determinedly,\s*/gim, category: 'opener' },
];

// Academic transitions - out of place in narrative/casual writing
const AI_TRANSITIONS: Array<{ pattern: RegExp; replacement: string; category: 'transition' }> = [
  { pattern: /\bMoreover,\s*/gi, replacement: '', category: 'transition' },
  { pattern: /\bFurthermore,\s*/gi, replacement: '', category: 'transition' },
  { pattern: /\bAdditionally,\s*/gi, replacement: '', category: 'transition' },
  { pattern: /\bSubsequently,\s*/gi, replacement: '', category: 'transition' },
  { pattern: /\bConsequently,\s*/gi, replacement: '', category: 'transition' },
  { pattern: /\bNevertheless,\s*/gi, replacement: 'But ', category: 'transition' },
  { pattern: /\bNonetheless,\s*/gi, replacement: 'Still, ', category: 'transition' },
];

// Filler phrases - add nothing to the text
const AI_FILLERS: Array<{ pattern: RegExp; replacement: string; category: 'filler' }> = [
  { pattern: /It's worth noting that\s*/gi, replacement: '', category: 'filler' },
  { pattern: /It is worth noting that\s*/gi, replacement: '', category: 'filler' },
  { pattern: /Interestingly,\s*/gi, replacement: '', category: 'filler' },
  { pattern: /Needless to say,\s*/gi, replacement: '', category: 'filler' },
  { pattern: /It goes without saying that\s*/gi, replacement: '', category: 'filler' },
  { pattern: /As mentioned earlier,\s*/gi, replacement: '', category: 'filler' },
  { pattern: /As we discussed,\s*/gi, replacement: '', category: 'filler' },
  { pattern: /In essence,\s*/gi, replacement: '', category: 'filler' },
  { pattern: /At the end of the day,\s*/gi, replacement: '', category: 'filler' },
];

/**
 * Remove AI clichés from text.
 * Strips filler phrases and fixes capitalization.
 */
export function removeAICliches(
  text: string,
  config: Partial<AIClicheRemoverConfig> = {}
): AIClicheRemoverResult {
  const cfg = { ...AI_CLICHE_REMOVER_DEFAULTS, ...config };

  if (!cfg.enabled) {
    return {
      text,
      changes: [],
      totalRemoved: 0,
      categories: { openers: 0, transitions: 0, fillers: 0 },
    };
  }

  let result = text;
  const changes: AIClicheChange[] = [];
  const categories = { openers: 0, transitions: 0, fillers: 0 };

  // Remove openers (just delete them and capitalize next letter)
  if (cfg.removeOpeners) {
    for (const { pattern, category } of AI_OPENERS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(result)) !== null) {
        changes.push({
          original: match[0].trim(),
          replacement: '',
          category,
        });
        categories.openers++;
      }
      // Remove and fix capitalization
      result = result.replace(pattern, (m, offset) => {
        // Get the next character after the match
        const nextCharIndex = offset + m.length;
        if (nextCharIndex < result.length) {
          const nextChar = result[nextCharIndex];
          // If next char is lowercase, we need to capitalize it
          if (nextChar && /[a-z]/.test(nextChar)) {
            // The replacement will be handled by fixing caps after
            return '';
          }
        }
        return '';
      });
    }
  }

  // Remove transitions (some get simple replacements)
  if (cfg.removeTransitions) {
    for (const { pattern, replacement, category } of AI_TRANSITIONS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(result)) !== null) {
        changes.push({
          original: match[0].trim(),
          replacement: replacement.trim(),
          category,
        });
        categories.transitions++;
      }
      result = result.replace(pattern, replacement);
    }
  }

  // Remove fillers
  if (cfg.removeFillers) {
    for (const { pattern, replacement, category } of AI_FILLERS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(result)) !== null) {
        changes.push({
          original: match[0].trim(),
          replacement: replacement.trim(),
          category,
        });
        categories.fillers++;
      }
      result = result.replace(pattern, replacement);
    }
  }

  // Fix capitalization after removals
  // Pattern: period/exclamation/question + space + lowercase letter
  result = result.replace(/([.!?]\s+)([a-z])/g, (_, punct, letter) => {
    return punct + letter.toUpperCase();
  });

  // Fix start of text if it begins with lowercase
  result = result.replace(/^([a-z])/, (_, letter) => letter.toUpperCase());

  // Fix double spaces created by removals
  result = result.replace(/\s{2,}/g, ' ');

  // Fix space before period
  result = result.replace(/\s+([.!?,])/g, '$1');

  return {
    text: result,
    changes,
    totalRemoved: changes.length,
    categories,
  };
}

/**
 * Count AI clichés without removing them (for analysis).
 */
export function countAICliches(text: string): {
  total: number;
  openers: number;
  transitions: number;
  fillers: number;
  details: Array<{ phrase: string; count: number; category: string }>;
} {
  const details: Array<{ phrase: string; count: number; category: string }> = [];
  let openers = 0;
  let transitions = 0;
  let fillers = 0;

  // Count openers
  for (const { pattern } of AI_OPENERS) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern) || [];
    if (matches.length > 0) {
      openers += matches.length;
      details.push({
        phrase: pattern.source.replace(/\\s\*/g, '').replace(/\(\?<=[^)]+\)/g, ''),
        count: matches.length,
        category: 'opener',
      });
    }
  }

  // Count transitions
  for (const { pattern } of AI_TRANSITIONS) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern) || [];
    if (matches.length > 0) {
      transitions += matches.length;
      details.push({
        phrase: pattern.source.replace(/\\[bs]\*/g, '').replace(/\\s\*/g, ''),
        count: matches.length,
        category: 'transition',
      });
    }
  }

  // Count fillers
  for (const { pattern } of AI_FILLERS) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern) || [];
    if (matches.length > 0) {
      fillers += matches.length;
      details.push({
        phrase: pattern.source.replace(/\\s\*/g, ''),
        count: matches.length,
        category: 'filler',
      });
    }
  }

  return {
    total: openers + transitions + fillers,
    openers,
    transitions,
    fillers,
    details: details.sort((a, b) => b.count - a.count),
  };
}
