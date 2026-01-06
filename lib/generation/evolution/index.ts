/**
 * Story Evolution System
 *
 * Makes stories FLOURISH during writing, not stay static.
 * Now with FORMAT-SPECIFIC support for Books, Comics, and Screenplays.
 *
 * The Problem:
 * - Outlines are static - written before any chapter is generated
 * - AI can't adapt to its own discoveries
 * - Characters stay flat because we don't track their growth
 * - Emergent plot threads get forgotten
 * - Different formats (books, comics, scripts) need different tracking
 *
 * The Solution - Hybrid Approach with Format Awareness:
 *
 * 1. CHAPTER EXTRACTION (Format-Specific)
 *    After each chapter/page/scene, extract what ACTUALLY happened:
 *    - Books: Events, characters, locations, relationships, threads
 *    - Comics: Panels, visual motifs, page hooks, character appearances
 *    - Screenplays: Scenes, visual beats, dialogue patterns, locations
 *
 * 2. DISCOVERY TRACKING (Format-Specific)
 *    Track emergent elements across the story:
 *    - Books: Themes, prose patterns, imagery, POV shifts
 *    - Comics: Visual motifs, panel pacing, page-turner patterns
 *    - Screenplays: Visual beats, location usage, dialogue/action ratio
 *
 * 3. OUTLINE REVISION (Format-Specific)
 *    After each unit, revise upcoming content:
 *    - Books: Chapter plans with themes and character moments
 *    - Comics: Page plans with panel counts, hooks, and visual focus
 *    - Screenplays: Sequence plans with scenes, pacing, and subtext
 *
 * 4. CHARACTER ARC TRACKING (Format-Specific)
 *    Track how characters GROW and CHANGE:
 *    - Books: Internal monologue, POV chapters, prose imagery
 *    - Comics: Visual consistency, costumes, expressions, panel presence
 *    - Screenplays: Screen time, dialogue style, mannerisms, scene types
 *
 * Usage:
 * ```typescript
 * import {
 *   extractChapterElements,
 *   createDiscoveryTracker,
 *   shouldReviseOutline,
 *   reviseUpcomingChapters,
 *   createCharacterArcTracker,
 *   initializeEvolutionTracking,
 *   type ContentFormat,
 * } from '@/lib/generation/evolution';
 *
 * // Initialize with format
 * const { discoveryTracker, characterArcTracker } = initializeEvolutionTracking(
 *   bookId,
 *   originalOutline,
 *   characters,
 *   'comic' // or 'book' or 'screenplay'
 * );
 *
 * // After generating a chapter/page/scene:
 *
 * // 1. Extract what happened (format-aware)
 * const extraction = await extractChapterElements(
 *   chapterContent,
 *   chapterNumber,
 *   chapterPlan,
 *   previousSummary,
 *   knownCharacters,
 *   bookId,
 *   'comic' // format parameter
 * );
 *
 * // 2. Update discovery tracker
 * const discoveryReport = discoveryTracker.processChapter(extraction);
 *
 * // 3. Update character arcs
 * const arcUpdates = characterArcTracker.updateFromChapter(
 *   extraction.characters,
 *   extraction.relationships,
 *   chapterNumber
 * );
 *
 * // 4. Check if outline needs revision (format-aware)
 * const { shouldRevise, urgency, reasons } = shouldReviseOutline(
 *   extraction,
 *   discoveryTracker,
 *   chapterNumber,
 *   totalChapters,
 *   'comic' // format parameter
 * );
 *
 * // 5. Revise upcoming content if needed
 * // For comics:
 * const revisions = await reviseUpcomingComicPages(pages, discoveryTracker, extraction);
 * // For screenplays:
 * const revisions = await reviseUpcomingScreenplaySequences(sequences, discoveryTracker, extraction);
 * // For books:
 * const revisions = await reviseUpcomingChapters(chapters, discoveryTracker, extraction, total);
 *
 * // 6. Inject character evolution into next generation
 * const characterContext = characterArcTracker.generateAllCharactersSummary();
 * // Or format-specific:
 * const comicSheet = characterArcTracker.generateFormatSpecificSummary('comic');
 * ```
 */

// ============================================================================
// Chapter Extraction
// ============================================================================

export {
  extractChapterElements,
  findDeviations,
  mergeExtractions,
  type ContentFormat,
  type ChapterExtraction,
  type ExtractedEvent,
  type ExtractedCharacter,
  type ExtractedLocation,
  type ExtractedRelationship,
  type ExtractedThread,
  type ExtractedSurprise,
  type ExtractedPanel,
  type ExtractedComicPage,
  type ComicVisualConsistency,
  type ExtractedScene,
  type ExtractedSequence,
  type ScreenplayPacing,
  type ExtractedProseElements,
  type ChapterPacing,
} from './chapter-extraction';

// ============================================================================
// Discovery Tracking
// ============================================================================

export {
  DiscoveryTracker,
  createDiscoveryTracker,
  type DiscoveryState,
  type DiscoveryReport,
  type EmergentTheme,
  type CharacterDiscovery,
  type PlotThread,
  type RunningElement,
  type StoryConnection,
  type ToneEvolution,
  type ThemeOccurrence,
  // Format-specific discovery types
  type VisualMotif,
  type PageHookPattern,
  type VisualBeatPattern,
  type LocationUsage,
  type ProsePattern,
  type SymbolicElement,
  type ComicDiscoveryState,
  type ScreenplayDiscoveryState,
  type BookDiscoveryState,
  type CharacterVisualProfile,
  type SceneStructurePattern,
} from './discovery-tracker';

// ============================================================================
// Outline Revision
// ============================================================================

export {
  shouldReviseOutline,
  reviseChapterPlan,
  reviseUpcomingChapters,
  quickRevision,
  createRevisionHistory,
  addToHistory,
  getCurrentPlan,
  summarizeRevisions,
  // Format-specific revision functions
  reviseComicPage,
  reviseScreenplaySequence,
  reviseUpcomingComicPages,
  reviseUpcomingScreenplaySequences,
  // Base types
  type ChapterPlan,
  type OutlineRevision,
  type RevisionContext,
  type RevisionHistory,
  // Comic-specific types
  type ComicPagePlan,
  type ComicPanelPlan,
  type ComicPageRevision,
  type ComicRevisionContext,
  // Screenplay-specific types
  type ScreenplayScenePlan,
  type ScreenplaySequencePlan,
  type ScreenplaySequenceRevision,
  type ScreenplayRevisionContext,
} from './outline-revision';

// ============================================================================
// Character Arc Tracking
// ============================================================================

export {
  CharacterArcTracker,
  createCharacterArcTracker,
  // Base types
  type CharacterArc,
  type CharacterArcState,
  type CharacterArcUpdate,
  type ArcStage,
  type CharacterArcMilestone,
  type EmotionalState,
  type RelationshipState,
  type DecisionPoint,
  type CharacterKnowledge,
  type WoundOrGrowth,
  // Comic-specific character types
  type ComicCharacterVisuals,
  type ComicPagePresence,
  // Screenplay-specific character types
  type ScreenplayCharacterProfile,
  type ScenePresence,
  // Book-specific character types
  type BookCharacterProse,
} from './character-arc';

// ============================================================================
// Convenience: Full Evolution Pipeline
// ============================================================================

import {
  ChapterExtraction,
  extractChapterElements,
  ContentFormat,
} from './chapter-extraction';
import { DiscoveryTracker, createDiscoveryTracker, DiscoveryReport } from './discovery-tracker';
import { CharacterArcTracker, createCharacterArcTracker, CharacterArcUpdate } from './character-arc';
import {
  shouldReviseOutline,
  reviseUpcomingChapters,
  ChapterPlan,
  OutlineRevision,
  ComicPagePlan,
  ComicPageRevision,
  ScreenplaySequencePlan,
  ScreenplaySequenceRevision,
  reviseUpcomingComicPages,
  reviseUpcomingScreenplaySequences,
} from './outline-revision';

export interface EvolutionPipelineResult {
  extraction: ChapterExtraction;
  discoveryReport: DiscoveryReport;
  arcUpdates: CharacterArcUpdate[];
  shouldRevise: boolean;
  revisionUrgency: 'low' | 'medium' | 'high';
  revisionReasons: string[];
  revisions?: OutlineRevision[] | ComicPageRevision[] | ScreenplaySequenceRevision[];
  format: ContentFormat;
}

/**
 * Run the full evolution pipeline after a chapter/page/scene is generated
 * Supports all formats: book, comic, screenplay
 */
export async function runEvolutionPipeline(
  chapterContent: string,
  chapterNumber: number,
  chapterPlan: string,
  previousSummary: string,
  knownCharacters: string[],
  bookId: string,
  discoveryTracker: DiscoveryTracker,
  characterArcTracker: CharacterArcTracker,
  upcomingPlans: ChapterPlan[] | ComicPagePlan[] | ScreenplaySequencePlan[],
  totalChapters: number,
  autoRevise: boolean = true,
  format: ContentFormat = 'book'
): Promise<EvolutionPipelineResult> {
  // 1. Extract what happened (format-aware)
  const extraction = await extractChapterElements(
    chapterContent,
    chapterNumber,
    chapterPlan,
    previousSummary,
    knownCharacters,
    bookId,
    format
  );

  // 2. Process discoveries
  const discoveryReport = discoveryTracker.processChapter(extraction);

  // 3. Update character arcs
  const arcUpdates = characterArcTracker.updateFromChapter(
    extraction.characters,
    extraction.relationships,
    chapterNumber
  );

  // 4. Check if revision needed (format-aware)
  const { shouldRevise, urgency, reasons } = shouldReviseOutline(
    extraction,
    discoveryTracker,
    chapterNumber,
    totalChapters,
    format
  );

  // 5. Revise if needed and auto-revision enabled (format-specific)
  let revisions: OutlineRevision[] | ComicPageRevision[] | ScreenplaySequenceRevision[] | undefined;

  if (shouldRevise && autoRevise && urgency !== 'low') {
    switch (format) {
      case 'comic':
        revisions = await reviseUpcomingComicPages(
          upcomingPlans as ComicPagePlan[],
          discoveryTracker,
          extraction,
          totalChapters
        );
        break;
      case 'screenplay':
        revisions = await reviseUpcomingScreenplaySequences(
          upcomingPlans as ScreenplaySequencePlan[],
          discoveryTracker,
          extraction,
          totalChapters
        );
        break;
      default:
        revisions = await reviseUpcomingChapters(
          upcomingPlans as ChapterPlan[],
          discoveryTracker,
          extraction,
          totalChapters
        );
    }
  }

  return {
    extraction,
    discoveryReport,
    arcUpdates,
    shouldRevise,
    revisionUrgency: urgency,
    revisionReasons: reasons,
    revisions,
    format,
  };
}

/**
 * Initialize evolution tracking for a new book/comic/screenplay
 * Supports all formats with format-specific character initialization
 */
export function initializeEvolutionTracking(
  bookId: string,
  originalOutline: string,
  characters: { name: string; role: 'protagonist' | 'antagonist' | 'supporting' | 'minor' }[],
  format: ContentFormat = 'book'
): {
  discoveryTracker: DiscoveryTracker;
  characterArcTracker: CharacterArcTracker;
} {
  const discoveryTracker = createDiscoveryTracker(bookId, originalOutline, format);
  const characterArcTracker = createCharacterArcTracker(bookId, format);

  // Initialize character arcs with format-specific data
  for (const char of characters) {
    characterArcTracker.initializeCharacter(char.name, char.role);
  }

  return { discoveryTracker, characterArcTracker };
}

/**
 * Generate context for chapter/page/scene generation that includes evolution data
 * Supports format-specific summaries for books, comics, and screenplays
 */
export function generateEvolutionContext(
  discoveryTracker: DiscoveryTracker,
  characterArcTracker: CharacterArcTracker,
  format: ContentFormat = 'book'
): string {
  let context = '';

  // Add discovery summary (format-aware)
  const discoverySummary = discoveryTracker.generateDiscoverySummary();
  if (discoverySummary.length > 50) {
    context += discoverySummary + '\n\n';
  }

  // Add character arc summaries
  const characterSummary = characterArcTracker.generateAllCharactersSummary();

  if (characterSummary.length > 50) {
    context += characterSummary;
  }

  return context;
}

/**
 * Generate format-specific context with additional detail
 * For comics: includes visual character sheets
 * For screenplays: includes character breakdowns with screen time
 * For books: includes POV and prose style information
 */
export function generateDetailedEvolutionContext(
  discoveryTracker: DiscoveryTracker,
  characterArcTracker: CharacterArcTracker,
  format: ContentFormat
): string {
  let context = generateEvolutionContext(discoveryTracker, characterArcTracker, format);

  // Add format-specific additional context
  switch (format) {
    case 'comic':
      context += '\n\n=== VISUAL CONTINUITY NOTES ===\n';
      context += characterArcTracker.generateAllCharactersSummary();
      break;
    case 'screenplay':
      context += '\n\n=== CHARACTER BREAKDOWN ===\n';
      context += characterArcTracker.generateAllCharactersSummary();
      break;
    case 'book':
      context += '\n\n=== PROSE STYLE NOTES ===\n';
      context += characterArcTracker.generateAllCharactersSummary();
      break;
  }

  return context;
}
