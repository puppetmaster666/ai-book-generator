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
  ticUsage?: TicUsageReport;  // Track tic patterns across the story
}

/**
 * Physical tic patterns that AI overuses.
 * Each tic has limits per chapter and per book.
 */
export const TIC_PATTERNS = [
  { name: 'glasses', pattern: /(clean|wipe|polish|adjust|push|remove)s?\s+(his|her|their)?\s*(glasses|spectacles)/gi, maxPerChapter: 1, maxPerBook: 8 },
  { name: 'wrist', pattern: /rub(s|bing|bed)?\s+(his|her|their)\s+wrist/gi, maxPerChapter: 1, maxPerBook: 5 },
  { name: 'throat', pattern: /clear(s|ing|ed)?\s+(his|her|their)\s+throat/gi, maxPerChapter: 1, maxPerBook: 6 },
  { name: 'jaw', pattern: /clench(es|ing|ed)?\s+(his|her|their)\s+jaw/gi, maxPerChapter: 2, maxPerBook: 10 },
  { name: 'fist', pattern: /ball(s|ing|ed)?\s+(his|her|their)\s+fist/gi, maxPerChapter: 2, maxPerBook: 10 },
  { name: 'sigh', pattern: /\bsigh(s|ed|ing)?\b/gi, maxPerChapter: 2, maxPerBook: 15 },
  { name: 'nod', pattern: /\bnod(s|ded|ding)?\b/gi, maxPerChapter: 3, maxPerBook: 20 },
  { name: 'shrug', pattern: /\bshrug(s|ged|ging)?\b/gi, maxPerChapter: 2, maxPerBook: 12 },
  { name: 'deep_breath', pattern: /take(s)?\s+a\s+deep\s+breath/gi, maxPerChapter: 2, maxPerBook: 10 },
  { name: 'eye_contact', pattern: /(break|avoid|hold)s?\s+(eye\s+)?contact/gi, maxPerChapter: 2, maxPerBook: 12 },
  { name: 'runs_hand', pattern: /runs?\s+(a\s+)?(his|her|their)?\s*hand\s+through/gi, maxPerChapter: 1, maxPerBook: 6 },
  { name: 'bites_lip', pattern: /bit(e|es|ing)?\s+(his|her|their)\s+lip/gi, maxPerChapter: 1, maxPerBook: 5 },
  { name: 'eyebrow', pattern: /raise(s|d)?\s+(an?\s+)?(his|her|their)?\s*eyebrow/gi, maxPerChapter: 2, maxPerBook: 10 },
  { name: 'shoulders_drop', pattern: /shoulders?\s+(drop(ped)?|sag(ged)?|slump(ed)?)/gi, maxPerChapter: 1, maxPerBook: 6 },
];

/**
 * Report of tic usage across the story
 */
export interface TicUsageReport {
  ticCounts: Record<string, number>;           // Total count per tic
  ticCountsThisChapter: Record<string, number>; // Count in current chapter
  overusedTics: string[];                       // Tics that exceeded book limit
  chapterViolations: string[];                  // Tics that exceeded chapter limit
}

/**
 * Tracker for physical tic usage across the entire story
 */
export class TicUsageTracker {
  private bookId: string;
  private ticCounts: Record<string, number> = {};
  private currentChapterCounts: Record<string, number> = {};
  private currentChapter: number = 0;

  constructor(bookId: string) {
    this.bookId = bookId;
    // Initialize all tic counts to 0
    for (const tic of TIC_PATTERNS) {
      this.ticCounts[tic.name] = 0;
    }
  }

  /**
   * Process a chapter and count all tic occurrences
   */
  processChapter(content: string, chapterNumber: number): TicUsageReport {
    // Reset chapter counts if moving to a new chapter
    if (chapterNumber !== this.currentChapter) {
      this.currentChapterCounts = {};
      this.currentChapter = chapterNumber;
    }

    const chapterViolations: string[] = [];
    const overusedTics: string[] = [];

    for (const tic of TIC_PATTERNS) {
      // Reset regex lastIndex for global patterns
      tic.pattern.lastIndex = 0;
      const matches = content.match(tic.pattern);
      const count = matches ? matches.length : 0;

      // Update chapter counts
      this.currentChapterCounts[tic.name] = (this.currentChapterCounts[tic.name] || 0) + count;

      // Update book-wide counts
      this.ticCounts[tic.name] = (this.ticCounts[tic.name] || 0) + count;

      // Check chapter limit
      if (this.currentChapterCounts[tic.name] > tic.maxPerChapter) {
        chapterViolations.push(
          `${tic.name}: ${this.currentChapterCounts[tic.name]}x (max ${tic.maxPerChapter} per chapter)`
        );
      }

      // Check book limit
      if (this.ticCounts[tic.name] > tic.maxPerBook) {
        overusedTics.push(
          `${tic.name}: ${this.ticCounts[tic.name]}x (max ${tic.maxPerBook} per book)`
        );
      }
    }

    return {
      ticCounts: { ...this.ticCounts },
      ticCountsThisChapter: { ...this.currentChapterCounts },
      overusedTics,
      chapterViolations,
    };
  }

  /**
   * Get current tic counts
   */
  getCounts(): Record<string, number> {
    return { ...this.ticCounts };
  }

  /**
   * Generate a warning string for prompts
   */
  generateTicWarnings(): string {
    const warnings: string[] = [];

    for (const tic of TIC_PATTERNS) {
      const count = this.ticCounts[tic.name] || 0;
      const remaining = tic.maxPerBook - count;

      if (remaining <= 0) {
        warnings.push(`- ${tic.name.replace(/_/g, ' ')}: EXHAUSTED (used ${count}/${tic.maxPerBook})`);
      } else if (remaining <= 2) {
        warnings.push(`- ${tic.name.replace(/_/g, ' ')}: LOW (${remaining} remaining)`);
      }
    }

    if (warnings.length === 0) {
      return '';
    }

    return `=== TIC BUDGET WARNING ===
The following physical actions are nearing their limits:
${warnings.join('\n')}

Vary physical business. Use environment interaction instead of character tics.
`;
  }
}

/**
 * Create a new tic usage tracker for a story
 */
export function createTicUsageTracker(bookId: string): TicUsageTracker {
  return new TicUsageTracker(bookId);
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
  ticUsageTracker: TicUsageTracker;
} {
  const discoveryTracker = createDiscoveryTracker(bookId, originalOutline, format);
  const characterArcTracker = createCharacterArcTracker(bookId, format);
  const ticUsageTracker = createTicUsageTracker(bookId);

  // Initialize character arcs with format-specific data
  for (const char of characters) {
    characterArcTracker.initializeCharacter(char.name, char.role);
  }

  return { discoveryTracker, characterArcTracker, ticUsageTracker };
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
