/**
 * Validators - Math-based writing quality validation
 */

export {
  NarrativeValidator,
  VALIDATION_THRESHOLDS,
  BANNED_PHRASES,
  type ValidationReport,
  type ValidationThresholds,
} from './narrative-validator';

export {
  validateBookBeat,
  quickValidateBook,
  type BookValidationReport,
} from './book-validator';

export {
  validateScreenplayBeat,
  quickValidateScreenplay,
  type ScreenplayValidationReport,
} from './screenplay-validator';

export {
  validateComicBeat,
  quickValidateComic,
  type ComicValidationReport,
  type ComicPanel,
} from './comic-validator';

export {
  validateWithGenreRules,
  quickValidateGenre,
  validateGenrePatterns,
  getGenreSuggestions,
  validateRomancePacing,
  validateMysteryFairness,
  type GenreValidationReport,
  type GenreValidationConfig,
} from './genre-validator';
