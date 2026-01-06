/**
 * Atomic Beat Engine - Core Generation Loop
 *
 * Generates chapters in small, validated chunks (250-500 words) instead of
 * one massive generation. Each beat is validated before proceeding.
 *
 * Flow:
 * 1. Split chapter plan into 5-6 logical beats
 * 2. For each beat:
 *    a. Build context (anchor, recent history, character facts, logic bridge)
 *    b. Generate beat (~300 words)
 *    c. Validate with math (sentence variance, name density, loop detection)
 *    d. If fail: retry with surgical feedback (max 3 attempts)
 *    e. If pass: lock and proceed to next beat
 * 3. Assemble chapter from validated beats
 */

import { NarrativeValidator, type ValidationReport } from '../validators/narrative-validator';
import { validateBookBeat, type BookValidationReport } from '../validators/book-validator';
import { validateScreenplayBeat, type ScreenplayValidationReport } from '../validators/screenplay-validator';
import { validateComicBeat, type ComicValidationReport } from '../validators/comic-validator';
import {
  buildCharacterFactSheet,
  validateCharacterConsistency,
  updateCharacterFacts,
  type CharacterFact,
} from './character-lock';
import {
  buildLogicBridge,
  detectBeatLoop,
  suggestMomentumDirection,
  buildFrictionPrompt,
  type FrictionConfig,
} from './logic-bridge';
import { buildHeatScalePrompt, type ContentType, type HeatLevel } from './heat-scale';
import {
  buildChaosSeedPrompt,
  getDefaultChaosConfig,
  type ChaosConfig,
} from './chaos-seed';
import {
  getFormatConfig,
  type BookFormat,
  type FormatConfig,
} from './format-config';

// Types

export interface BeatPlan {
  beatNumber: number;
  totalBeats: number;
  summary: string;              // What should happen in this beat
  targetWords: number;
  momentumDirection: 'escalate' | 'complicate' | 'resolve' | 'reveal';
  requiredElements?: string[]; // Must-include elements
  forbiddenElements?: string[]; // Must-avoid elements
}

export interface BeatContext {
  anchor: string;               // Chapter 1 summary (never changes)
  synopsis: string;             // Book premise (the North Star)
  recentHistory: string;        // Last 2-3 beat summaries
  characterFactSheet: string;   // Immutable character facts
  logicBridge: string;          // Therefore/But connector
  heatScalePrompt: string;      // Content heat adjustment (if needed)
  chaosSeedPrompt: string;      // Random sensory distraction (human feel)
  frictionPrompt: string;       // Minor physical failures (human feel)
  surgicalFeedback?: string;    // Corrections from failed attempt
  previousBeats: string[];      // Full text of previous beats (for loop detection)
}

export interface BeatGenerationRequest {
  beatPlan: BeatPlan;
  context: BeatContext;
  previousText: string;         // Last ~1000 chars for continuity
  attempt: number;              // Current attempt number (0-based)
}

export interface BeatGenerationResult {
  content: string;
  wordCount: number;
  validationReport: ValidationReport | BookValidationReport | ScreenplayValidationReport | ComicValidationReport;
  passed: boolean;
  attempts: number;
  beatNumber: number;
}

export interface ChapterGenerationData {
  format: BookFormat;
  chapterNumber: number;
  chapterPlan: string;          // What should happen in this chapter
  targetWords: number;
  anchorSummary: string;        // Chapter 1 summary for continuity
  synopsis: string;             // Book premise
  characterStates: Record<string, CharacterFact>;
  characterNames: string[];
  previousChapterSummary?: string;
  heatLevel?: HeatLevel;
  contentType?: ContentType;
}

export interface ChapterGenerationResult {
  content: string;
  wordCount: number;
  beats: BeatGenerationResult[];
  characterStates: Record<string, CharacterFact>;  // Updated after generation
  metrics: {
    totalBeats: number;
    passedOnFirstTry: number;
    totalRetries: number;
    averageVariance: number;
    averageNameDensity: number;
  };
}

// Constants

const MAX_BEAT_ATTEMPTS = 3;
const BEAT_WORD_BUFFER = 50;  // Allow +/- 50 words from target

/**
 * Split a chapter plan into logical beats.
 */
export function splitIntoBeatPlans(
  chapterPlan: string,
  targetWords: number,
  format: BookFormat
): BeatPlan[] {
  const config = getFormatConfig(format);
  const beatSize = config.beatSize.target;

  // Calculate number of beats needed
  const numBeats = Math.max(3, Math.ceil(targetWords / beatSize));
  const wordsPerBeat = Math.floor(targetWords / numBeats);

  // Try to split the chapter plan into logical sections
  const planSentences = chapterPlan.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const sentencesPerBeat = Math.ceil(planSentences.length / numBeats);

  const beats: BeatPlan[] = [];

  for (let i = 0; i < numBeats; i++) {
    const startIdx = i * sentencesPerBeat;
    const endIdx = Math.min(startIdx + sentencesPerBeat, planSentences.length);
    const beatSentences = planSentences.slice(startIdx, endIdx);

    const summary = beatSentences.length > 0
      ? beatSentences.join('. ').trim() + '.'
      : `Continue the chapter narrative (beat ${i + 1} of ${numBeats})`;

    beats.push({
      beatNumber: i + 1,
      totalBeats: numBeats,
      summary,
      targetWords: i === numBeats - 1
        ? targetWords - (wordsPerBeat * (numBeats - 1)) // Last beat gets remainder
        : wordsPerBeat,
      momentumDirection: suggestMomentumDirection(i + 1, numBeats, ''),
    });
  }

  return beats;
}

/**
 * Build the complete context for beat generation.
 *
 * @param usedChaosSeeds - Previously used chaos seeds (to avoid repetition)
 * @param usedFrictions - Previously used friction events (to avoid repetition)
 */
export function buildBeatContext(
  data: ChapterGenerationData,
  beatPlan: BeatPlan,
  previousBeats: string[],
  blockedAttempts: number,
  usedChaosSeeds: string[] = [],
  usedFrictions: string[] = []
): BeatContext & { newChaosSeed: string | null; newFriction: string | null } {
  // Build character fact sheet
  const characterFactSheet = buildCharacterFactSheet(data.characterStates);

  // Build logic bridge (if not first beat)
  const previousText = previousBeats.join('\n\n');
  const logicBridge = previousBeats.length > 0
    ? buildLogicBridge(previousText.slice(-1000), beatPlan.summary, previousBeats)
    : '';

  // Build heat scale prompt (if content was blocked)
  const heatScalePrompt = buildHeatScalePrompt(
    data.contentType || 'general',
    data.heatLevel || 'safe',
    blockedAttempts
  );

  // Build recent history summary
  const recentHistory = previousBeats.length > 0
    ? `Previous beats summary:\n${previousBeats.slice(-2).map((b, i) =>
        `Beat ${previousBeats.length - 1 + i}: ${summarizeBeat(b)}`
      ).join('\n')}`
    : '';

  // === HUMANIZING FEATURES ===

  // Build chaos seed prompt (random sensory distractions)
  const chaosSeedResult = buildChaosSeedPrompt(
    data.format,
    beatPlan.beatNumber,
    usedChaosSeeds
  );
  const chaosSeedPrompt = chaosSeedResult.prompt;

  // Build friction prompt (minor physical failures)
  const frictionResult = buildFrictionPrompt(
    data.format,
    beatPlan.beatNumber,
    usedFrictions
  );
  const frictionPrompt = frictionResult.prompt;

  return {
    anchor: data.anchorSummary,
    synopsis: data.synopsis,
    recentHistory,
    characterFactSheet,
    logicBridge,
    heatScalePrompt,
    chaosSeedPrompt,
    frictionPrompt,
    previousBeats,
    // Return new seeds/frictions to track what was used
    newChaosSeed: chaosSeedResult.usedSeed,
    newFriction: frictionResult.usedFriction,
  };
}

/**
 * Build the prompt for generating a single beat.
 * This returns the context/instructions to prepend to the generation call.
 */
export function buildBeatPrompt(
  request: BeatGenerationRequest,
  format: BookFormat
): string {
  const { beatPlan, context, attempt } = request;
  const config = getFormatConfig(format);

  let prompt = '';

  // 1. Character fact sheet (always first)
  if (context.characterFactSheet) {
    prompt += context.characterFactSheet + '\n\n';
  }

  // 2. Logic bridge (if not first beat)
  if (context.logicBridge) {
    prompt += context.logicBridge + '\n\n';
  }

  // 3. Heat scale instructions (if blocked)
  if (context.heatScalePrompt) {
    prompt += context.heatScalePrompt + '\n\n';
  }

  // 4. Surgical feedback from previous failed attempt
  if (context.surgicalFeedback && attempt > 0) {
    prompt += `
=== SURGICAL CORRECTIONS REQUIRED (Attempt ${attempt + 1}/${MAX_BEAT_ATTEMPTS}) ===
Your previous attempt was REJECTED for these reasons:

${context.surgicalFeedback}

Fix these SPECIFIC issues. The validation is MATHEMATICAL - it will reject again if the numbers don't pass.
===

`;
  }

  // 5. Beat instructions
  prompt += `
=== BEAT ${beatPlan.beatNumber} OF ${beatPlan.totalBeats} ===
Goal: ${beatPlan.summary}
Target: ${beatPlan.targetWords} words (+/- ${BEAT_WORD_BUFFER})
Momentum: ${beatPlan.momentumDirection.toUpperCase()}

`;

  // 6. Format-specific reminders
  if (format === 'novel' || format === 'fiction' || format === 'non-fiction') {
    prompt += `
PROSE REQUIREMENTS:
- Vary sentence length dramatically: some 3-5 words, some 20-30 words
- Use character names sparingly (target: 1 per 120 words)
- No more than 2 consecutive sentences starting with the same word
- Show emotion through action and dialogue, not "He felt X"
`;
  } else if (format === 'screenplay') {
    prompt += `
SCREENPLAY REQUIREMENTS:
- Action blocks: max 3 sentences each
- No camera directions ("we see", "pan to", etc.)
- Dialogue: max 4 lines per speech
- Use subtext - characters don't say what they mean directly
`;
  } else if (format === 'comic' || format === 'picture_book') {
    prompt += `
COMIC REQUIREMENTS:
- 3-7 panels per page
- Max 25 words per speech bubble
- Max 2 bubbles per panel
- Show action visually, don't describe internal thoughts
- End on a page-turner hook
`;
  }

  // 7. Chaos seed (random sensory distraction for human feel)
  if (context.chaosSeedPrompt) {
    prompt += context.chaosSeedPrompt + '\n';
  }

  // 8. Friction injection (minor physical failures for human feel)
  if (context.frictionPrompt) {
    prompt += context.frictionPrompt + '\n';
  }

  // 9. Recent context reminder
  if (context.recentHistory) {
    prompt += `\n${context.recentHistory}\n`;
  }

  prompt += `
BEGIN WRITING BEAT ${beatPlan.beatNumber}:
`;

  return prompt;
}

/**
 * Validate a generated beat based on format.
 */
export function validateBeat(
  content: string,
  characterNames: string[],
  previousContent: string,
  format: BookFormat
): ValidationReport | BookValidationReport | ScreenplayValidationReport | ComicValidationReport {
  switch (format) {
    case 'screenplay':
      return validateScreenplayBeat(content, characterNames, previousContent);
    case 'comic':
    case 'picture_book':
      return validateComicBeat(content, characterNames, previousContent);
    default:
      return validateBookBeat(content, characterNames, previousContent, format);
  }
}

/**
 * Process a beat generation result.
 * Returns true if beat passed validation, false if retry needed.
 */
export function processBeatResult(
  content: string,
  beatPlan: BeatPlan,
  characterNames: string[],
  previousContent: string,
  format: BookFormat,
  attempt: number
): BeatGenerationResult {
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  // Validate the beat
  const validationReport = validateBeat(content, characterNames, previousContent, format);

  // Check word count
  const minWords = beatPlan.targetWords - BEAT_WORD_BUFFER;
  const maxWords = beatPlan.targetWords + BEAT_WORD_BUFFER;
  const wordCountOk = wordCount >= minWords && wordCount <= maxWords;

  // Beat passes if validation passes and word count is acceptable
  const passed = validationReport.isValid && wordCountOk;

  // If word count is off, add to corrections
  if (!wordCountOk && !validationReport.isValid) {
    validationReport.corrections.push(
      `WORD COUNT: ${wordCount} words (target: ${beatPlan.targetWords} +/- ${BEAT_WORD_BUFFER})`
    );
  }

  return {
    content,
    wordCount,
    validationReport,
    passed,
    attempts: attempt + 1,
    beatNumber: beatPlan.beatNumber,
  };
}

/**
 * Summarize a beat for context in subsequent beats.
 */
export function summarizeBeat(beatContent: string): string {
  // Extract key actions and revelations
  const sentences = beatContent.split(/[.!?]+/).filter(s => s.trim().length > 10);

  // Take first and last significant sentences
  const first = sentences[0]?.trim() || '';
  const last = sentences[sentences.length - 1]?.trim() || '';

  if (first === last) {
    return first + '.';
  }

  return `${first}... ${last}.`;
}

/**
 * Extract significant keywords from a beat for loop detection.
 */
export function extractBeatKeywords(beatContent: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'this', 'that', 'these', 'those',
    'he', 'she', 'it', 'they', 'his', 'her', 'its', 'their', 'him', 'them',
  ]);

  const words = beatContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  return [...new Set(words.filter(w => !stopWords.has(w)))];
}

/**
 * Calculate metrics from beat results.
 */
export function calculateChapterMetrics(beats: BeatGenerationResult[]): ChapterGenerationResult['metrics'] {
  let passedOnFirstTry = 0;
  let totalRetries = 0;
  let totalVariance = 0;
  let totalDensity = 0;

  for (const beat of beats) {
    if (beat.attempts === 1) {
      passedOnFirstTry++;
    }
    totalRetries += beat.attempts - 1;

    // Extract variance and density from validation report
    const report = beat.validationReport as ValidationReport;
    totalVariance += report.sentenceVariance || 0;
    totalDensity += report.nameDensity || 0;
  }

  return {
    totalBeats: beats.length,
    passedOnFirstTry,
    totalRetries,
    averageVariance: beats.length > 0 ? totalVariance / beats.length : 0,
    averageNameDensity: beats.length > 0 ? totalDensity / beats.length : 0,
  };
}

/**
 * Log beat validation result for debugging.
 */
export function logBeatResult(result: BeatGenerationResult, verbose: boolean = false): void {
  const status = result.passed ? '✓ PASS' : '✗ FAIL';
  const report = result.validationReport as ValidationReport;

  console.log(
    `[Beat ${result.beatNumber}] ${status} | ` +
    `Words: ${result.wordCount} | ` +
    `Variance: ${report.sentenceVariance?.toFixed(1) || 'N/A'} | ` +
    `NameDensity: ${report.nameDensity?.toFixed(1) || 'N/A'} | ` +
    `Attempts: ${result.attempts}`
  );

  if (!result.passed && verbose) {
    console.log('  Corrections needed:');
    for (const correction of result.validationReport.corrections) {
      console.log(`    - ${correction}`);
    }
  }
}

// Export constants (types are exported at their definitions)
export { MAX_BEAT_ATTEMPTS, BEAT_WORD_BUFFER };
