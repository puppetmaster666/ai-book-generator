/**
 * Name Frequency Enforcer - Pronoun Replacement System
 *
 * Programmatically replaces excessive character names with pronouns.
 * Target: 1 name per 120-150 words (aggressive setting).
 *
 * Rules:
 * - First mention in scene: ALWAYS use name
 * - After scene break (*** or blank line): Reset, use name
 * - Dialogue attribution: Keep names for clarity
 * - Same-gender characters in scene: Use names more, or epithets
 * - Solo character scenes: Aggressive pronoun use
 */

import { type CharacterInfo } from './character-extractor';

export interface NameEnforcerConfig {
  targetWordsPerMention: number;    // Default: 120 words between name uses
  minContextWindow: number;         // Minimum words before allowing pronoun (default: 15)
  clarityThreshold: number;         // When multiple same-gender chars (default: 50)
  useEpithets: boolean;             // Use "the detective" etc. (default: true)
  preserveDialogueAttribution: boolean; // Keep names in dialogue tags (default: true)
}

export interface NameEnforcerResult {
  content: string;
  changes: NameChange[];
  metrics: {
    originalNameCount: number;
    finalNameCount: number;
    namesReplaced: number;
    pronounsAdded: number;
    epithetsUsed: number;
  };
}

interface NameChange {
  position: number;
  original: string;
  replacement: string;
  reason: string;
}

interface CharacterMention {
  name: string;
  original: string;  // The actual matched text (may differ in capitalization)
  position: number;
  endPosition: number;
  context: 'narrative' | 'dialogue' | 'attribution' | 'scene_start';
  wordsSinceLast: number;
  canReplace: boolean;
}

const DEFAULT_CONFIG: NameEnforcerConfig = {
  targetWordsPerMention: 120,
  minContextWindow: 15,
  clarityThreshold: 50,
  useEpithets: true,
  preserveDialogueAttribution: true,
};

/**
 * Enforce name frequency by replacing names with pronouns.
 */
export function enforceNameFrequency(
  text: string,
  characters: CharacterInfo[],
  config: Partial<NameEnforcerConfig> = {}
): NameEnforcerResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const changes: NameChange[] = [];

  // Track metrics
  let originalNameCount = 0;
  let pronounsAdded = 0;
  let epithetsUsed = 0;

  // Split text into segments (separated by scene breaks)
  const segments = splitIntoSegments(text);
  const processedSegments: string[] = [];

  for (const segment of segments) {
    const result = processSegment(segment, characters, cfg);
    processedSegments.push(result.content);
    changes.push(...result.changes.map(c => ({
      ...c,
      position: c.position + text.indexOf(segment),
    })));
    originalNameCount += result.originalCount;
    pronounsAdded += result.pronounsAdded;
    epithetsUsed += result.epithetsUsed;
  }

  const finalContent = processedSegments.join('\n\n***\n\n');
  const finalNameCount = countTotalNames(finalContent, characters);

  return {
    content: finalContent,
    changes,
    metrics: {
      originalNameCount,
      finalNameCount,
      namesReplaced: originalNameCount - finalNameCount,
      pronounsAdded,
      epithetsUsed,
    },
  };
}

/**
 * Split text into segments at scene breaks.
 */
function splitIntoSegments(text: string): string[] {
  // Scene breaks: ***, ---, ###, or multiple blank lines
  return text.split(/\n\s*(\*{3}|-{3}|#{3}|~~~)\s*\n|\n{3,}/).filter(s => s && s.trim().length > 0 && !/^(\*{3}|-{3}|#{3}|~~~)$/.test(s.trim()));
}

/**
 * Process a single segment (between scene breaks).
 */
function processSegment(
  segment: string,
  characters: CharacterInfo[],
  config: NameEnforcerConfig
): {
  content: string;
  changes: NameChange[];
  originalCount: number;
  pronounsAdded: number;
  epithetsUsed: number;
} {
  const changes: NameChange[] = [];
  let content = segment;
  let pronounsAdded = 0;
  let epithetsUsed = 0;

  // Find all character mentions
  const mentions = findAllMentions(content, characters);
  const originalCount = mentions.length;

  // Determine which characters are in this segment
  const presentCharacters = [...new Set(mentions.map(m => m.name))];
  const charactersByGender = groupByGender(presentCharacters, characters);

  // Track last mention position for each character
  const lastMentionPosition: Record<string, number> = {};
  const currentReferent: Record<string, string> = {}; // gender -> current name being referred to

  // Process mentions in reverse order (to preserve positions)
  const sortedMentions = [...mentions].sort((a, b) => b.position - a.position);

  for (const mention of sortedMentions) {
    const charInfo = characters.find(c => c.name === mention.name || c.firstName === mention.name);
    if (!charInfo) continue;

    // Calculate words since last mention
    const lastPos = lastMentionPosition[mention.name] || 0;
    const wordsBetween = countWordsBetween(content, lastPos, mention.position);

    // Determine if we should replace
    const shouldReplace = shouldReplaceName(
      mention,
      charInfo,
      wordsBetween,
      charactersByGender,
      currentReferent,
      config
    );

    if (shouldReplace.replace && shouldReplace.type !== 'none') {
      const replacement = chooseReplacement(
        charInfo,
        shouldReplace.type,
        mention.context,
        config
      );

      // Apply replacement
      const before = content.slice(0, mention.position);
      const after = content.slice(mention.endPosition);

      // Handle capitalization
      const finalReplacement = matchCapitalization(mention.original, replacement);
      content = before + finalReplacement + after;

      changes.push({
        position: mention.position,
        original: mention.original,
        replacement: finalReplacement,
        reason: shouldReplace.reason,
      });

      if (shouldReplace.type === 'pronoun') pronounsAdded++;
      if (shouldReplace.type === 'epithet') epithetsUsed++;
    }

    // Update tracking (use original position since we're going backwards)
    lastMentionPosition[mention.name] = mention.position;
    if (charInfo.gender !== 'unknown') {
      currentReferent[charInfo.gender] = mention.name;
    }
  }

  return { content, changes, originalCount, pronounsAdded, epithetsUsed };
}

/**
 * Find all character name mentions in text.
 */
function findAllMentions(text: string, characters: CharacterInfo[]): CharacterMention[] {
  const mentions: CharacterMention[] = [];

  for (const char of characters) {
    // Search for full name and first name
    const namesToFind = [char.name];
    if (char.firstName !== char.name) {
      namesToFind.push(char.firstName);
    }

    for (const name of namesToFind) {
      const pattern = new RegExp(`\\b${escapeRegex(name)}\\b`, 'gi');
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const context = determineContext(text, match.index);
        const wordsSinceLast = 0; // Will be calculated during processing

        mentions.push({
          name: char.name,
          original: match[0],  // Capture actual matched text for capitalization
          position: match.index,
          endPosition: match.index + match[0].length,
          context,
          wordsSinceLast,
          canReplace: context !== 'scene_start',
        });
      }
    }
  }

  // Sort by position
  return mentions.sort((a, b) => a.position - b.position);
}

/**
 * Determine the context of a name mention.
 */
function determineContext(text: string, position: number): CharacterMention['context'] {
  // Check if it's the start of a segment (first name in text)
  const textBefore = text.slice(0, position);
  const significantTextBefore = textBefore.replace(/\s+/g, ' ').trim();
  if (significantTextBefore.length < 20) {
    return 'scene_start';
  }

  // Check if inside dialogue (within quotes)
  const quotesBefore = (textBefore.match(/"/g) || []).length;
  if (quotesBefore % 2 === 1) {
    return 'dialogue';
  }

  // Check if dialogue attribution (after closing quote)
  const nearbyText = text.slice(Math.max(0, position - 30), position + 30);
  if (/"\s*(said|asked|replied|whispered|shouted|called|muttered|murmured)\b/i.test(nearbyText) &&
      position > textBefore.lastIndexOf('"')) {
    return 'attribution';
  }

  // Check for attribution pattern: "dialogue," [NAME] said
  if (/"\s*$/.test(textBefore.slice(-20)) || /,"\s*$/.test(textBefore.slice(-20))) {
    const after = text.slice(position, position + 50);
    if (/^\w+\s+(said|asked|replied|whispered|shouted|called|muttered|murmured)/i.test(after)) {
      return 'attribution';
    }
  }

  return 'narrative';
}

/**
 * Group characters by gender for ambiguity checking.
 */
function groupByGender(
  presentNames: string[],
  allCharacters: CharacterInfo[]
): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    male: [],
    female: [],
    nonbinary: [],
    unknown: [],
  };

  for (const name of presentNames) {
    const char = allCharacters.find(c => c.name === name);
    if (char) {
      groups[char.gender].push(name);
    }
  }

  return groups;
}

/**
 * Determine if a name should be replaced.
 */
function shouldReplaceName(
  mention: CharacterMention,
  charInfo: CharacterInfo,
  wordsSinceLast: number,
  charactersByGender: Record<string, string[]>,
  currentReferent: Record<string, string>,
  config: NameEnforcerConfig
): { replace: boolean; type: 'pronoun' | 'epithet' | 'none'; reason: string } {
  // Never replace scene starts
  if (mention.context === 'scene_start') {
    return { replace: false, type: 'none', reason: 'Scene start' };
  }

  // Never replace dialogue attribution if configured
  if (mention.context === 'attribution' && config.preserveDialogueAttribution) {
    return { replace: false, type: 'none', reason: 'Dialogue attribution' };
  }

  // Never replace inside dialogue
  if (mention.context === 'dialogue') {
    return { replace: false, type: 'none', reason: 'Inside dialogue' };
  }

  // Don't replace if it's been a while since last mention
  if (wordsSinceLast > config.targetWordsPerMention) {
    return { replace: false, type: 'none', reason: 'Exceeded word threshold' };
  }

  // Don't replace if too soon (need some context)
  if (wordsSinceLast < config.minContextWindow) {
    // Check if there's ambiguity
    const sameGenderChars = charactersByGender[charInfo.gender] || [];
    if (sameGenderChars.length === 1) {
      // Safe to replace with pronoun
      return { replace: true, type: 'pronoun', reason: 'Recent mention, clear referent' };
    } else if (sameGenderChars.length > 1) {
      // Multiple same-gender characters - might need to keep name or use epithet
      if (currentReferent[charInfo.gender] === charInfo.name) {
        // We're the current referent, pronoun is safe
        return { replace: true, type: 'pronoun', reason: 'Current referent' };
      } else {
        // Ambiguous - use epithet if available
        if (config.useEpithets && charInfo.epithets.length > 0) {
          return { replace: true, type: 'epithet', reason: 'Ambiguous, using epithet' };
        }
        return { replace: false, type: 'none', reason: 'Ambiguous, keeping name' };
      }
    }
    return { replace: false, type: 'none', reason: 'Too soon' };
  }

  // Check for ambiguity with same-gender characters
  const sameGenderChars = charactersByGender[charInfo.gender] || [];

  if (sameGenderChars.length === 1) {
    // Unambiguous - prefer pronoun
    return { replace: true, type: 'pronoun', reason: 'Single character of gender' };
  }

  if (sameGenderChars.length > 1) {
    // Multiple same-gender characters
    if (currentReferent[charInfo.gender] === charInfo.name) {
      // We're the current referent
      if (wordsSinceLast < config.clarityThreshold) {
        return { replace: true, type: 'pronoun', reason: 'Current referent, recent' };
      }
      // Use epithet for variety
      if (config.useEpithets && charInfo.epithets.length > 0) {
        return { replace: true, type: 'epithet', reason: 'Variety' };
      }
      return { replace: true, type: 'pronoun', reason: 'Current referent' };
    } else {
      // Not the current referent - name establishes new referent
      return { replace: false, type: 'none', reason: 'Establishing new referent' };
    }
  }

  // Default: replace with pronoun
  return { replace: true, type: 'pronoun', reason: 'Default replacement' };
}

/**
 * Choose the appropriate replacement.
 */
function chooseReplacement(
  charInfo: CharacterInfo,
  type: 'pronoun' | 'epithet',
  context: CharacterMention['context'],
  config: NameEnforcerConfig
): string {
  if (type === 'epithet' && charInfo.epithets.length > 0) {
    // Rotate through epithets
    return charInfo.epithets[Math.floor(Math.random() * charInfo.epithets.length)];
  }

  // Use pronoun - need to determine which form
  // Default to subject form, but context might require object form
  return charInfo.pronouns.subject;
}

/**
 * Match the capitalization of the original word.
 */
function matchCapitalization(original: string, replacement: string): string {
  if (!original || !replacement) return replacement;

  // If original was all caps, make replacement all caps
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }

  // If original started with capital, capitalize replacement
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }

  return replacement;
}

/**
 * Count words between two positions.
 */
function countWordsBetween(text: string, startPos: number, endPos: number): number {
  const segment = text.slice(startPos, endPos);
  const words = segment.split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

/**
 * Count total name occurrences.
 */
function countTotalNames(text: string, characters: CharacterInfo[]): number {
  let count = 0;
  for (const char of characters) {
    const pattern = new RegExp(`\\b${escapeRegex(char.name)}\\b`, 'gi');
    const matches = text.match(pattern) || [];
    count += matches.length;

    if (char.firstName !== char.name) {
      const firstNamePattern = new RegExp(`\\b${escapeRegex(char.firstName)}\\b`, 'gi');
      const firstNameMatches = text.match(firstNamePattern) || [];
      count += firstNameMatches.length;
    }
  }
  return count;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { DEFAULT_CONFIG as NAME_ENFORCER_DEFAULTS };
// Note: NameEnforcerConfig and NameEnforcerResult are exported at their definitions
export type { NameChange };
