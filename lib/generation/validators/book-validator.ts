/**
 * Book Validator - Prose Quality Validation
 *
 * Validates book/novel content for:
 * - Gary Provost rhythm (sentence variance)
 * - Name density and pronoun usage
 * - Staccato detection (robotic rhythm)
 * - Loop/repetition detection
 * - Dialogue quality
 */

import {
  NarrativeValidator,
  ValidationReport as BaseValidationReport,
} from './narrative-validator';
import { getFormatConfig, type BookFormat } from '../atomic/format-config';

export interface BookValidationReport extends BaseValidationReport {
  format: 'book';
  dialogueMetrics: {
    dialogueRatio: number;           // % of text that is dialogue
    averageExchangeLength: number;   // Average words per dialogue exchange
    attributionQuality: number;      // 0-1 score for dialogue tag quality
  };
  paragraphMetrics: {
    averageLength: number;           // Average words per paragraph
    shortParagraphRatio: number;     // % of paragraphs under 50 words
    longParagraphRatio: number;      // % of paragraphs over 150 words
  };
  sceneMetrics: {
    hasSceneBreak: boolean;
    transitionQuality: number;       // 0-1 score for scene transitions
  };
}

/**
 * Validate a book/novel beat.
 */
export function validateBookBeat(
  text: string,
  characterNames: string[],
  previousContent: string,
  format: BookFormat = 'novel'
): BookValidationReport {
  const config = getFormatConfig(format);

  // Run base narrative validation
  const baseReport = NarrativeValidator.validate(
    text,
    characterNames,
    previousContent,
    {
      minSentenceVariance: config.validation.sentenceVariance.min,
      maxNameDensity: config.validation.nameDensity.max,
      maxStaccatoRatio: config.validation.staccatoThreshold,
      maxLoopSimilarity: config.validation.loopSimilarity.max,
    }
  );

  // Additional book-specific validation
  const dialogueMetrics = analyzeDialogue(text);
  const paragraphMetrics = analyzeParagraphs(text);
  const sceneMetrics = analyzeSceneStructure(text);

  // Add book-specific corrections
  const additionalCorrections: string[] = [];

  // Check dialogue quality
  if (dialogueMetrics.attributionQuality < 0.6) {
    additionalCorrections.push(
      `DIALOGUE TAGS: ${((1 - dialogueMetrics.attributionQuality) * 100).toFixed(0)}% of dialogue uses fancy tags ` +
      `("exclaimed", "declared", etc.). Replace with "said" or action beats.`
    );
  }

  // Check dialogue ratio (too much or too little)
  if (dialogueMetrics.dialogueRatio > 0.7) {
    additionalCorrections.push(
      `TOO MUCH DIALOGUE: ${(dialogueMetrics.dialogueRatio * 100).toFixed(0)}% dialogue. ` +
      `Add more action, description, or internal thought to balance.`
    );
  } else if (dialogueMetrics.dialogueRatio < 0.1 && hasCharacterInteraction(text, characterNames)) {
    additionalCorrections.push(
      `TOO LITTLE DIALOGUE: Only ${(dialogueMetrics.dialogueRatio * 100).toFixed(0)}% dialogue ` +
      `in a scene with character interaction. Let characters speak.`
    );
  }

  // Check paragraph balance
  if (paragraphMetrics.longParagraphRatio > 0.5) {
    additionalCorrections.push(
      `WALL OF TEXT: ${(paragraphMetrics.longParagraphRatio * 100).toFixed(0)}% of paragraphs exceed 150 words. ` +
      `Break up long paragraphs for readability. Use dialogue and action to create white space.`
    );
  }

  // Check for consecutive same-word paragraph starters
  const paragraphStarters = checkParagraphStarters(text);
  if (paragraphStarters.maxConsecutive > 2) {
    additionalCorrections.push(
      `REPETITIVE PARAGRAPHS: ${paragraphStarters.maxConsecutive} consecutive paragraphs start with "${paragraphStarters.word}". ` +
      `Vary paragraph openings.`
    );
  }

  // Combine corrections
  const allCorrections = [...baseReport.corrections, ...additionalCorrections];

  return {
    ...baseReport,
    format: 'book',
    isValid: allCorrections.length === 0,
    corrections: allCorrections,
    dialogueMetrics,
    paragraphMetrics,
    sceneMetrics,
  };
}

/**
 * Analyze dialogue in the text.
 */
function analyzeDialogue(text: string): BookValidationReport['dialogueMetrics'] {
  // Extract dialogue (text within quotes)
  const dialogueMatches = text.match(/"[^"]+"/g) || [];
  const dialogueText = dialogueMatches.join(' ');
  const dialogueWords = dialogueText.split(/\s+/).filter(w => w.length > 0).length;
  const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;

  const dialogueRatio = totalWords > 0 ? dialogueWords / totalWords : 0;
  const averageExchangeLength = dialogueMatches.length > 0
    ? dialogueWords / dialogueMatches.length
    : 0;

  // Check dialogue tag quality
  const fancyTags = [
    'exclaimed', 'declared', 'queried', 'retorted', 'interjected',
    'announced', 'proclaimed', 'bellowed', 'shrieked', 'gasped',
    'muttered', 'mumbled', 'snarled', 'snapped', 'hissed',
  ];

  const allAttributions = text.match(/"\s*(said|asked|replied|whispered|shouted|yelled|muttered|exclaimed|declared|queried|retorted|interjected|announced|proclaimed|bellowed|shrieked|gasped|mumbled|snarled|snapped|hissed)/gi) || [];
  const fancyCount = allAttributions.filter(a =>
    fancyTags.some(tag => a.toLowerCase().includes(tag))
  ).length;

  const attributionQuality = allAttributions.length > 0
    ? 1 - (fancyCount / allAttributions.length)
    : 1;

  return {
    dialogueRatio,
    averageExchangeLength,
    attributionQuality,
  };
}

/**
 * Analyze paragraph structure.
 */
function analyzeParagraphs(text: string): BookValidationReport['paragraphMetrics'] {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  if (paragraphs.length === 0) {
    return {
      averageLength: 0,
      shortParagraphRatio: 0,
      longParagraphRatio: 0,
    };
  }

  const lengths = paragraphs.map(p => p.split(/\s+/).filter(w => w.length > 0).length);
  const averageLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const shortCount = lengths.filter(len => len < 50).length;
  const longCount = lengths.filter(len => len > 150).length;

  return {
    averageLength,
    shortParagraphRatio: shortCount / lengths.length,
    longParagraphRatio: longCount / lengths.length,
  };
}

/**
 * Analyze scene structure and transitions.
 */
function analyzeSceneStructure(text: string): BookValidationReport['sceneMetrics'] {
  // Check for scene breaks
  const hasSceneBreak = /\n\s*(\*{3}|#{3}|-{3}|~~~)\s*\n/.test(text);

  // Check transition quality (soft check)
  const transitionPatterns = [
    /^(later|afterward|the next|that night|when|as|while|before|after)\b/im,
    /^(meanwhile|elsewhere|back at|across town)\b/im,
  ];

  let transitionScore = 1.0;

  // Look for abrupt location changes without transition
  const locationChanges = text.match(/\b(entered|arrived at|reached|was at|stood in)\s+(the|a)\s+\w+/gi) || [];
  if (locationChanges.length > 1 && !hasSceneBreak) {
    // Multiple location changes without scene break might indicate poor transitions
    const hasTransition = transitionPatterns.some(p => p.test(text));
    if (!hasTransition) {
      transitionScore = 0.6;
    }
  }

  return {
    hasSceneBreak,
    transitionQuality: transitionScore,
  };
}

/**
 * Check for consecutive same-word paragraph starters.
 */
function checkParagraphStarters(text: string): { maxConsecutive: number; word: string } {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  if (paragraphs.length < 2) {
    return { maxConsecutive: 0, word: '' };
  }

  const starters = paragraphs.map(p => {
    const firstWord = p.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';
    return firstWord;
  });

  let maxConsecutive = 1;
  let currentConsecutive = 1;
  let maxWord = '';

  for (let i = 1; i < starters.length; i++) {
    if (starters[i] === starters[i - 1] && starters[i].length > 0) {
      currentConsecutive++;
      if (currentConsecutive > maxConsecutive) {
        maxConsecutive = currentConsecutive;
        maxWord = starters[i];
      }
    } else {
      currentConsecutive = 1;
    }
  }

  return { maxConsecutive, word: maxWord };
}

/**
 * Check if text contains character interaction.
 */
function hasCharacterInteraction(text: string, characterNames: string[]): boolean {
  // Check if multiple characters are mentioned
  let mentionedCount = 0;
  for (const name of characterNames) {
    if (new RegExp(`\\b${escapeRegex(name)}\\b`, 'i').test(text)) {
      mentionedCount++;
      if (mentionedCount >= 2) return true;
    }
  }
  return false;
}

/**
 * Quick validation for performance-critical paths.
 */
export function quickValidateBook(
  text: string,
  characterNames: string[],
  format: BookFormat = 'novel'
): { isValid: boolean; primaryIssue: string | null } {
  const config = getFormatConfig(format);

  // Only check the most critical metrics
  const { variance } = NarrativeValidator['calculateSentenceVariance'](text);
  if (config.validation.sentenceVariance.enabled && variance < config.validation.sentenceVariance.min) {
    return {
      isValid: false,
      primaryIssue: `Sentence variance ${variance.toFixed(1)} < ${config.validation.sentenceVariance.min}`,
    };
  }

  const { density } = NarrativeValidator['checkNameDensity'](text, characterNames);
  if (config.validation.nameDensity.enabled && density > config.validation.nameDensity.max) {
    return {
      isValid: false,
      primaryIssue: `Name density ${density.toFixed(1)} > ${config.validation.nameDensity.max}`,
    };
  }

  return { isValid: true, primaryIssue: null };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Note: BookValidationReport is exported at its definition
