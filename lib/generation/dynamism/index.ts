/**
 * Dynamism System - Idea-Driven Story Variety
 *
 * This system ensures stories have the RIGHT kind of dynamism for their premise.
 *
 * The Problem:
 * - AI stories get stuck in one location with the same characters
 * - Generic "add variety" rules break confined stories like "Buried"
 * - Comics end up with 2-3 settings only
 *
 * The Solution:
 * 1. Analyze the premise to understand the story's DNA
 * 2. Generate an IDEA-SPECIFIC dynamism profile
 * 3. Inject requirements into outline prompts
 * 4. Track and validate during generation
 *
 * Examples:
 * - "Buried" → Confined profile: phone calls mandatory, space must degrade
 * - Road trip → Traveling profile: new location every chapter
 * - Courtroom → Limited profile: rotate witness characters
 *
 * Usage:
 * ```typescript
 * import {
 *   analyzeStoryDNA,
 *   generateDynamismProfile,
 *   buildBookOutlinePrompt,
 *   createDynamismTracker
 * } from '@/lib/generation/dynamism';
 *
 * // 1. Analyze the premise
 * const dna = analyzeStoryDNA(synopsis, genre, format);
 *
 * // 2. Generate profile
 * const profile = generateDynamismProfile(dna, format, totalChapters);
 *
 * // 3. Get outline prompt
 * const dynamismPrompt = buildBookOutlinePrompt(profile, dna, totalChapters);
 *
 * // 4. Create tracker for generation
 * const tracker = createDynamismTracker(profile);
 *
 * // During beat generation:
 * tracker.trackBeat(beatNum, location, characters, hasExternalContact);
 * const feedback = tracker.getBeatFeedback();
 * ```
 */

// Story DNA Analysis
export {
  analyzeStoryDNA,
  summarizeStoryDNA,
  isConfinedStory,
  isTravelingStory,
  type StoryDNA,
} from './story-dna';

// Dynamism Profile Generation
export {
  generateDynamismProfile,
  summarizeDynamismProfile,
  isAllowed,
  getChapterRequirements,
  type DynamismProfile,
  type LocationRequirements,
  type CharacterRequirements,
  type PacingRequirements,
  type LocationVarietySource,
  type CharacterVarietySource,
} from './dynamism-profile';

// Outline Requirements (Prompt Injections)
export {
  buildBookOutlinePrompt,
  buildChapterOutlinePrompt,
  buildComicPagePrompt,
  buildScreenplaySequencePrompt,
  buildOutlineValidationPrompt,
} from './outline-requirements';

// Dynamism Tracker
export {
  DynamismTracker,
  createDynamismTracker,
  extractLocations,
  extractCharacters,
  hasExternalContact,
  type DynamismState,
  type DynamismReport,
  type DynamismWarning,
  type DynamismViolation,
  type LocationEntry,
  type CharacterEntry,
  type ChapterState,
  type BeatState,
} from './dynamism-tracker';
