/**
 * Post-Processing Pipeline - Layer 2
 *
 * Pure code fixes after generation:
 * - Name→Pronoun replacement
 * - Sentence variety enforcement
 * - Burstiness injection
 * - Dialogue attribution polish
 *
 * ZERO extra AI tokens - all via regex and algorithms.
 */

// Main pipeline
export {
  runPostProcessingPipeline,
  quickPostProcess,
  analyzeContent,
  getDefaultPostProcessingConfig,
  summarizePipelineResults,
  type PostProcessingConfig,
  type PostProcessingResult,
  type ContentAnalysis,
} from './pipeline';

// Character extraction
export {
  extractCharacterInfo,
  getCharacterByName,
  type CharacterInfo,
  type CharacterExtractionResult,
} from './character-extractor';

// Name frequency enforcement
export {
  enforceNameFrequency,
  NAME_ENFORCER_DEFAULTS,
  type NameEnforcerConfig,
  type NameEnforcerResult,
  type NameChange,
} from './name-enforcer';

// Sentence variety
export {
  enforceSentenceVariety,
  SENTENCE_VARIETY_DEFAULTS,
  type SentenceVarietyConfig,
  type SentenceVarietyResult,
  type SentenceChange,
} from './sentence-variety';

// Burstiness
export {
  enforceBurstiness,
  calculateBurstiness,
  BURSTINESS_DEFAULTS,
  type BurstinessConfig,
  type BurstinessResult,
  type BurstinessChange,
} from './burstiness';

// Dialogue polish
export {
  polishDialogue,
  countFancyTags,
  countDialogueAdverbs,
  DIALOGUE_POLISH_DEFAULTS,
  type DialoguePolishConfig,
  type DialoguePolishResult,
  type DialogueChange,
} from './dialogue-polish';
