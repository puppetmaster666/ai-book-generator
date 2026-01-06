/**
 * Atomic Generation System - Layer 1
 *
 * Real-time steering during generation:
 * - Beat-by-beat validation
 * - Character fact-locking
 * - Causal logic enforcement
 * - Format-specific rules
 */

export {
  splitIntoBeatPlans,
  buildBeatContext,
  buildBeatPrompt,
  validateBeat,
  processBeatResult,
  summarizeBeat,
  extractBeatKeywords,
  calculateChapterMetrics,
  logBeatResult,
  MAX_BEAT_ATTEMPTS,
  BEAT_WORD_BUFFER,
  type BeatPlan,
  type BeatContext,
  type BeatGenerationRequest,
  type BeatGenerationResult,
  type ChapterGenerationData,
  type ChapterGenerationResult,
} from './beat-engine';

export {
  buildCharacterFactSheet,
  validateCharacterConsistency,
  updateCharacterFacts,
  createCharacterFactsFromDescription,
  type CharacterFact,
  type CharacterFactSheet,
  type FactViolation,
} from './character-lock';

export {
  buildLogicBridge,
  extractLastSignificantAction,
  extractEmotionalState,
  extractOpenQuestions,
  detectBeatLoop,
  buildAntiRecapInstructions,
  suggestMomentumDirection,
  type LogicBridge,
  type BeatLoopAnalysis,
} from './logic-bridge';

export {
  getHeatReductionInstructions,
  buildHeatScalePrompt,
  restoreGrit,
  detectSanitizedContent,
  type HeatLevel,
  type ContentType,
  type HeatReductionResult,
} from './heat-scale';

export {
  getFormatConfig,
  detectFormat,
  getValidationThresholds,
  isValidationEnabled,
  BOOK_CONFIG,
  NON_FICTION_CONFIG,
  SCREENPLAY_CONFIG,
  COMIC_CONFIG,
  PICTURE_BOOK_CONFIG,
  CHILDREN_CONFIG,
  type BookFormat,
  type FormatConfig,
  type BeatSizeConfig,
  type ValidationConfig,
  type PostProcessingConfig as FormatPostProcessingConfig,
  type ContextWindowConfig,
} from './format-config';

// ============================================
// BEHAVIORAL SIMULATION SYSTEMS
// ============================================

export {
  registerVoiceProfile,
  getVoiceProfile,
  getAllVoiceProfiles,
  buildVoiceProfile,
  validateCharacterVoice,
  validateAllDialogue,
  generateVoiceProfileSummary,
  type CharacterVoiceProfile,
  type VoiceValidationResult,
} from './voice-profiles';

export {
  registerTensionArc,
  getTensionArcs,
  getTensionArc,
  getTensionBetween,
  validateTensionChange,
  updateTensionLevel,
  generateSensoryAnchors,
  validateSensoryAnchors,
  generateTensionSummary,
  getPacingSuggestions,
  validateContentTension,
  clearTensionArcs,
  type TensionType,
  type TensionPoint,
  type TensionArc,
  type TensionValidationResult,
  type SensoryAnchor,
} from './tension-slider';

export {
  getSecretManifest,
  registerSecret,
  getSecret,
  getUnrevealedSecrets,
  addBreadcrumb,
  validateReveal,
  revealSecret,
  scheduleReveal,
  getSecretsPendingBreadcrumbs,
  detectBreadcrumbsInContent,
  generateSecretManifestSummary,
  generateBreadcrumbSuggestions,
  clearSecretManifest,
  getFormatBreadcrumbRequirements,
  type SecretType,
  type BreadcrumbType,
  type Breadcrumb,
  type Secret,
  type RevealValidation,
  type SecretManifestState,
} from './secret-manifest';

export {
  getDomainFacts,
  getDomainTimeline,
  validateDomainAccuracy,
  generateDomainFactSheet,
  getCommonMistakes,
  checkFactViolation,
  POLICE_FACTS,
  MURDER_INVESTIGATION_FACTS,
  AFFAIR_FACTS,
  MEDICAL_FACTS,
  LEGAL_FACTS,
  FORENSICS_FACTS,
  DOMAIN_TIMELINES,
  DOMAIN_VALIDATION_RULES,
  type DomainType,
  type DomainFact,
  type DomainTimeline,
  type DomainValidationRule,
} from './domain-facts';

export {
  GenreController,
  createGenreController,
  createQuickGenreController,
  createFormatController,
  type GenreType,
  type GenreControllerConfig,
  type GenreValidationResult,
  type GenreGuardrails,
} from './genre-controller';

// ============================================
// FORMAT-SPECIFIC BEHAVIORAL CONFIGURATION
// ============================================

export {
  getFormatCategory,
  getFormatBehaviorConfig,
  generateFormatBehaviorInjection,
  VOICE_PROFILE_FORMAT_CONFIGS,
  TENSION_SLIDER_FORMAT_CONFIGS,
  SECRET_MANIFEST_FORMAT_CONFIGS,
  DOMAIN_FACTS_FORMAT_CONFIGS,
  GENRE_FORMAT_ADJUSTMENTS,
  type FormatCategory,
  type VoiceProfileFormatConfig,
  type TensionSliderFormatConfig,
  type SecretManifestFormatConfig,
  type DomainFactsFormatConfig,
  type GenreFormatAdjustments,
  type FormatBehaviorConfig,
} from './format-behavioral';
