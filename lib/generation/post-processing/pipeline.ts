/**
 * Post-Processing Pipeline - Orchestration
 *
 * Runs all post-processing modules in the correct order:
 * 1. Sentence variety (structural changes)
 * 2. Burstiness (adds short/long sentences)
 * 3. Dialogue polish (attribution fixes)
 * 4. Name frequency (pronoun replacement - LAST, needs stable text)
 *
 * All processing is pure code - ZERO AI tokens used.
 */

import {
  extractCharacterInfo,
  type CharacterInfo,
  type CharacterExtractionResult,
} from './character-extractor';
import {
  enforceNameFrequency,
  type NameEnforcerConfig,
  type NameEnforcerResult,
} from './name-enforcer';
import {
  enforceSentenceVariety,
  type SentenceVarietyConfig,
  type SentenceVarietyResult,
} from './sentence-variety';
import {
  enforceBurstiness,
  calculateBurstiness,
  type BurstinessConfig,
  type BurstinessResult,
} from './burstiness';
import {
  polishDialogue,
  countFancyTags,
  countDialogueAdverbs,
  type DialoguePolishConfig,
  type DialoguePolishResult,
} from './dialogue-polish';
import {
  removeAICliches,
  type AIClicheRemoverResult,
} from './ai-cliche-remover';
import { getFormatConfig, type BookFormat } from '../atomic/format-config';
import { restoreGrit } from '../atomic/heat-scale';

// Pipeline configuration
export interface PostProcessingConfig {
  format: BookFormat;

  aiClicheRemover: {
    enabled: boolean;
    removeOpeners: boolean;
    removeTransitions: boolean;
    removeFillers: boolean;
  };

  nameFrequency: {
    enabled: boolean;
    targetWordsPerMention: number;
  };

  sentenceVariety: {
    enabled: boolean;
    maxConsecutiveSameStarter: number;
    maxPronounStartPercent: number;
  };

  burstiness: {
    enabled: boolean;
    minScore: number;
    targetShortRatio: number;
    targetLongRatio: number;
  };

  dialoguePolish: {
    enabled: boolean;
    maxFancyTagsPerPage: number;
    removeAdverbs: boolean;
  };

  restoreGrit: boolean;  // Remove corporate euphemisms
}

// Pipeline results
export interface PostProcessingResult {
  content: string;
  originalContent: string;

  metrics: {
    // Overall
    processingTimeMs: number;
    totalChanges: number;

    // AI Cliché removal
    aiClicheRemover?: {
      totalRemoved: number;
      openers: number;
      transitions: number;
      fillers: number;
    };

    // Name frequency
    nameFrequency?: NameEnforcerResult['metrics'];

    // Sentence variety
    sentenceVariety?: SentenceVarietyResult['metrics'];

    // Burstiness
    burstiness?: BurstinessResult['metrics'];

    // Dialogue
    dialoguePolish?: DialoguePolishResult['metrics'];
  };

  // Detailed change logs
  changes: {
    nameFrequency: NameEnforcerResult['changes'];
    sentenceVariety: SentenceVarietyResult['changes'];
    burstiness: BurstinessResult['changes'];
    dialoguePolish: DialoguePolishResult['changes'];
  };
}

// Pre-processing analysis
export interface ContentAnalysis {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;

  burstinessScore: number;
  estimatedNameDensity: number;
  fancyTagCount: number;
  dialogueAdverbCount: number;

  needsProcessing: boolean;
  recommendedProcessing: string[];
}

/**
 * Get default post-processing config based on format.
 */
export function getDefaultPostProcessingConfig(format: BookFormat): PostProcessingConfig {
  const formatConfig = getFormatConfig(format);
  const pp = formatConfig.postProcessing;

  return {
    format,
    aiClicheRemover: {
      enabled: true,  // ALWAYS enabled - critical for AI detection
      removeOpeners: true,
      removeTransitions: true,
      removeFillers: true,
    },
    nameFrequency: {
      enabled: pp.nameFrequency.enabled,
      targetWordsPerMention: pp.nameFrequency.targetWordsPerMention,
    },
    sentenceVariety: {
      enabled: pp.sentenceVariety.enabled,
      maxConsecutiveSameStarter: pp.sentenceVariety.maxConsecutiveSameStarter,
      maxPronounStartPercent: pp.sentenceVariety.maxPronounStartPercent,
    },
    burstiness: {
      enabled: pp.burstiness.enabled,
      minScore: pp.burstiness.minScore,
      targetShortRatio: pp.burstiness.targetShortRatio,
      targetLongRatio: pp.burstiness.targetLongRatio,
    },
    dialoguePolish: {
      enabled: pp.dialoguePolish.enabled,
      maxFancyTagsPerPage: pp.dialoguePolish.maxFancyTags,
      removeAdverbs: pp.dialoguePolish.removeAdverbs,
    },
    restoreGrit: true,
  };
}

/**
 * Analyze content before processing.
 */
export function analyzeContent(
  content: string,
  characters: CharacterInfo[],
  config: PostProcessingConfig
): ContentAnalysis {
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);

  // Calculate burstiness
  const burstinessScore = calculateBurstiness(content);

  // Estimate name density
  let nameCount = 0;
  for (const char of characters) {
    const pattern = new RegExp(`\\b${escapeRegex(char.name)}\\b`, 'gi');
    const matches = content.match(pattern) || [];
    nameCount += matches.length;
  }
  const estimatedNameDensity = words.length > 0 ? (nameCount / words.length) * 100 : 0;

  // Count dialogue issues
  const fancyTagCount = countFancyTags(content);
  const dialogueAdverbCount = countDialogueAdverbs(content);

  // Determine what needs processing
  const recommendedProcessing: string[] = [];

  if (config.burstiness.enabled && burstinessScore < config.burstiness.minScore) {
    recommendedProcessing.push('burstiness');
  }

  if (config.nameFrequency.enabled && estimatedNameDensity > 2.5) {
    recommendedProcessing.push('nameFrequency');
  }

  if (config.dialoguePolish.enabled && (fancyTagCount > 5 || dialogueAdverbCount > 3)) {
    recommendedProcessing.push('dialoguePolish');
  }

  if (config.sentenceVariety.enabled) {
    // Check for repetitive starters
    const starters = sentences.map(s => s.trim().split(/\s+/)[0]?.toLowerCase() || '');
    const starterCounts: Record<string, number> = {};
    for (const s of starters) {
      starterCounts[s] = (starterCounts[s] || 0) + 1;
    }
    const maxConsecutive = findMaxConsecutive(starters);
    if (maxConsecutive > config.sentenceVariety.maxConsecutiveSameStarter) {
      recommendedProcessing.push('sentenceVariety');
    }
  }

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    burstinessScore,
    estimatedNameDensity,
    fancyTagCount,
    dialogueAdverbCount,
    needsProcessing: recommendedProcessing.length > 0,
    recommendedProcessing,
  };
}

/**
 * Run the full post-processing pipeline.
 */
export async function runPostProcessingPipeline(
  content: string,
  characters: Array<{ name: string; description: string; role?: string }>,
  config: Partial<PostProcessingConfig> = {}
): Promise<PostProcessingResult> {
  const startTime = Date.now();
  const originalContent = content;

  // Get full config with defaults
  const format = config.format || 'novel';
  const fullConfig = { ...getDefaultPostProcessingConfig(format), ...config };

  // Extract character info for name enforcement
  const { characters: characterInfo } = extractCharacterInfo(characters);

  let processedContent = content;
  const changes: PostProcessingResult['changes'] = {
    nameFrequency: [],
    sentenceVariety: [],
    burstiness: [],
    dialoguePolish: [],
  };
  const metrics: PostProcessingResult['metrics'] = {
    processingTimeMs: 0,
    totalChanges: 0,
  };

  // Pre-analyze content
  const analysis = analyzeContent(processedContent, characterInfo, fullConfig);

  // Run pipeline in order

  // 0. AI Cliché removal FIRST (clean slate before other processing)
  if (fullConfig.aiClicheRemover.enabled) {
    const result = removeAICliches(processedContent, {
      removeOpeners: fullConfig.aiClicheRemover.removeOpeners,
      removeTransitions: fullConfig.aiClicheRemover.removeTransitions,
      removeFillers: fullConfig.aiClicheRemover.removeFillers,
    });
    processedContent = result.text;
    metrics.aiClicheRemover = {
      totalRemoved: result.totalRemoved,
      openers: result.categories.openers,
      transitions: result.categories.transitions,
      fillers: result.categories.fillers,
    };
    metrics.totalChanges += result.totalRemoved;

    if (result.totalRemoved > 0) {
      console.log(`[PostProcessing] Removed ${result.totalRemoved} AI clichés (${result.categories.openers} openers, ${result.categories.transitions} transitions, ${result.categories.fillers} fillers)`);
    }
  }

  // 1. Sentence variety (structural changes first)
  if (fullConfig.sentenceVariety.enabled) {
    const result = enforceSentenceVariety(processedContent, {
      maxConsecutiveSameStarter: fullConfig.sentenceVariety.maxConsecutiveSameStarter,
      maxPronounStartPercent: fullConfig.sentenceVariety.maxPronounStartPercent,
    });
    processedContent = result.content;
    changes.sentenceVariety = result.changes;
    metrics.sentenceVariety = result.metrics;
    metrics.totalChanges += result.changes.length;
  }

  // 2. Burstiness (adds short/long sentences)
  if (fullConfig.burstiness.enabled) {
    const result = enforceBurstiness(processedContent, {
      minScore: fullConfig.burstiness.minScore,
      targetShortRatio: fullConfig.burstiness.targetShortRatio,
      targetLongRatio: fullConfig.burstiness.targetLongRatio,
    });
    processedContent = result.content;
    changes.burstiness = result.changes;
    metrics.burstiness = result.metrics;
    metrics.totalChanges += result.changes.length;
  }

  // 3. Dialogue polish (attribution fixes)
  if (fullConfig.dialoguePolish.enabled) {
    const result = polishDialogue(processedContent, {
      maxFancyTagsPerPage: fullConfig.dialoguePolish.maxFancyTagsPerPage,
      removeAdverbs: fullConfig.dialoguePolish.removeAdverbs,
    });
    processedContent = result.content;
    changes.dialoguePolish = result.changes;
    metrics.dialoguePolish = result.metrics;
    metrics.totalChanges += result.changes.length;
  }

  // 4. Name frequency LAST (needs stable text)
  if (fullConfig.nameFrequency.enabled) {
    const result = enforceNameFrequency(processedContent, characterInfo, {
      targetWordsPerMention: fullConfig.nameFrequency.targetWordsPerMention,
    });
    processedContent = result.content;
    changes.nameFrequency = result.changes;
    metrics.nameFrequency = result.metrics;
    metrics.totalChanges += result.changes.length;
  }

  // 5. Restore grit (remove corporate euphemisms)
  if (fullConfig.restoreGrit) {
    processedContent = restoreGrit(processedContent);
  }

  metrics.processingTimeMs = Date.now() - startTime;

  return {
    content: processedContent,
    originalContent,
    metrics,
    changes,
  };
}

/**
 * Quick post-processing for real-time preview.
 * Only runs the most critical fixes.
 */
export function quickPostProcess(
  content: string,
  characterInfo: CharacterInfo[],
  format: BookFormat = 'novel'
): string {
  let result = content;

  // Only run name enforcement for quick preview
  const config = getDefaultPostProcessingConfig(format);
  if (config.nameFrequency.enabled) {
    const enforced = enforceNameFrequency(result, characterInfo, {
      targetWordsPerMention: config.nameFrequency.targetWordsPerMention,
    });
    result = enforced.content;
  }

  // Always restore grit
  result = restoreGrit(result);

  return result;
}

/**
 * Analyze pipeline results and generate summary.
 */
export function summarizePipelineResults(result: PostProcessingResult): string {
  const lines: string[] = [
    '=== Post-Processing Summary ===',
    `Processing time: ${result.metrics.processingTimeMs}ms`,
    `Total changes: ${result.metrics.totalChanges}`,
    '',
  ];

  if (result.metrics.nameFrequency) {
    const nf = result.metrics.nameFrequency;
    lines.push(
      'Name Frequency:',
      `  - Original name count: ${nf.originalNameCount}`,
      `  - Final name count: ${nf.finalNameCount}`,
      `  - Names replaced with pronouns: ${nf.namesReplaced}`,
      ''
    );
  }

  if (result.metrics.sentenceVariety) {
    const sv = result.metrics.sentenceVariety;
    lines.push(
      'Sentence Variety:',
      `  - Pronoun starts: ${(sv.originalPronounStartPercent * 100).toFixed(1)}% → ${(sv.finalPronounStartPercent * 100).toFixed(1)}%`,
      `  - Consecutive same-starter fixed: ${sv.consecutiveFixed}`,
      ''
    );
  }

  if (result.metrics.burstiness) {
    const b = result.metrics.burstiness;
    lines.push(
      'Burstiness:',
      `  - Score: ${b.originalScore.toFixed(2)} → ${b.finalScore.toFixed(2)}`,
      `  - Short sentences added: ${b.shortSentencesAdded}`,
      `  - Sentences combined: ${b.sentencesCombined}`,
      ''
    );
  }

  if (result.metrics.dialoguePolish) {
    const dp = result.metrics.dialoguePolish;
    lines.push(
      'Dialogue Polish:',
      `  - Fancy tags replaced: ${dp.fancyTagsReplaced}`,
      `  - Adverbs converted: ${dp.adverbsConverted}`,
      `  - Attributions dropped: ${dp.attributionsDropped}`,
      ''
    );
  }

  return lines.join('\n');
}

// Helper functions

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMaxConsecutive(arr: string[]): number {
  if (arr.length === 0) return 0;

  let maxCount = 1;
  let currentCount = 1;

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1] && arr[i].length > 0) {
      currentCount++;
      maxCount = Math.max(maxCount, currentCount);
    } else {
      currentCount = 1;
    }
  }

  return maxCount;
}

// Re-export individual module types for convenience
// Note: PostProcessingConfig, PostProcessingResult, ContentAnalysis are exported at their definitions
export type { NameEnforcerResult, NameEnforcerConfig, NameChange } from './name-enforcer';
export type { SentenceVarietyResult, SentenceVarietyConfig, SentenceChange } from './sentence-variety';
export type { BurstinessResult, BurstinessConfig, BurstinessChange } from './burstiness';
export type { DialoguePolishResult, DialoguePolishConfig, DialogueChange } from './dialogue-polish';
export type { CharacterInfo, CharacterExtractionResult } from './character-extractor';
