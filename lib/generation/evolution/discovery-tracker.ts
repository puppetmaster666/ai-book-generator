/**
 * Discovery Tracker
 *
 * Tracks EMERGENT elements - things that weren't in the original outline
 * but appeared organically during writing. These are the "happy accidents"
 * that make stories feel alive.
 *
 * FORMAT-SPECIFIC TRACKING:
 *
 * BOOKS:
 * - Prose voice consistency
 * - Internal monologue patterns
 * - Sensory detail themes
 * - Symbolic imagery
 *
 * COMICS:
 * - Visual motifs (recurring imagery)
 * - Page hook patterns (what cliffhangers work)
 * - Character visual consistency
 * - Panel composition patterns
 * - Color/mood associations
 *
 * SCREENPLAYS:
 * - Visual beat patterns
 * - Scene structure preferences
 * - Location usage efficiency
 * - Dialogue vs action balance
 * - Subtext patterns
 *
 * What We Track (All Formats):
 * - Emergent Themes: Themes that developed naturally
 * - Character Depth: Unexpected traits or backstory
 * - Plot Threads: Unplanned storylines that emerged
 * - Running Elements: Motifs, callbacks, symbols
 * - Connections: Links between elements the AI created
 * - Tone Evolution: How the story's tone shifted
 *
 * Purpose:
 * When the AI accidentally creates something good, we LEAN INTO IT.
 * Instead of correcting back to the outline, we update the outline
 * to embrace the discovery.
 */

import {
  ChapterExtraction,
  ExtractedThread,
  ContentFormat,
  ExtractedComicPage,
  ExtractedScene,
} from './chapter-extraction';

// ============================================================================
// Types
// ============================================================================

export interface EmergentTheme {
  id: string;
  name: string;
  description: string;
  firstAppeared: number;  // Chapter number
  occurrences: ThemeOccurrence[];
  strength: 'subtle' | 'developing' | 'prominent' | 'central';
  wasPlanned: boolean;
}

export interface ThemeOccurrence {
  chapterNumber: number;
  context: string;
  manifestation: 'dialogue' | 'action' | 'symbolism' | 'motif';
}

export interface CharacterDiscovery {
  characterName: string;
  discoveryType: 'trait' | 'backstory' | 'motivation' | 'relationship' | 'skill';
  description: string;
  chapterRevealed: number;
  wasPlanned: boolean;
  shouldIntegrate: boolean;  // Should we build on this?
}

export interface PlotThread {
  id: string;
  description: string;
  type: 'mystery' | 'conflict' | 'relationship' | 'goal' | 'secret';
  introduced: number;  // Chapter number
  lastMentioned: number;
  status: 'active' | 'developing' | 'ready_to_resolve' | 'resolved' | 'abandoned';
  priority: 'main' | 'secondary' | 'minor';
  wasPlanned: boolean;
  resolutionSuggestion?: string;
}

export interface RunningElement {
  id: string;
  type: 'motif' | 'callback' | 'symbol' | 'phrase' | 'object';
  name: string;
  description: string;
  occurrences: number[];  // Chapter numbers
  meaning?: string;  // What it represents
}

export interface StoryConnection {
  element1: string;
  element2: string;
  connectionType: 'parallel' | 'contrast' | 'causation' | 'echo' | 'mirror';
  description: string;
  chapterDiscovered: number;
}

export interface ToneEvolution {
  chapterNumber: number;
  primaryTone: string;
  secondaryTone?: string;
  shift?: {
    from: string;
    to: string;
    trigger: string;
  };
}

// ============================================================================
// Comic-Specific Discovery Types
// ============================================================================

export interface VisualMotif {
  id: string;
  name: string;
  description: string;
  type: 'object' | 'color' | 'composition' | 'symbol' | 'character_pose';
  occurrences: { pageNumber: number; panelNumber: number; context: string }[];
  meaning?: string;
  shouldRecur: boolean;  // Should we intentionally use this again?
}

export interface PageHookPattern {
  hookType: 'cliffhanger' | 'question' | 'reveal' | 'action_freeze' | 'emotional';
  description: string;
  effectiveness: 'weak' | 'moderate' | 'strong';
  occurrences: number;
  examples: string[];
}

export interface CharacterVisualProfile {
  characterName: string;
  establishedDetails: string[];  // Confirmed visual details
  inconsistencies: { detail: string; pages: number[] }[];  // Contradicting details
  lastAppearance: number;  // Page number
  distinctiveFeatures: string[];  // Most important visual identifiers
}

export interface ComicDiscoveryState {
  visualMotifs: VisualMotif[];
  pageHookPatterns: PageHookPattern[];
  characterVisuals: CharacterVisualProfile[];
  panelCountAverage: number;
  effectivePageLayouts: string[];  // Descriptions of layouts that worked
  visualPacing: {
    actionPagesPercent: number;
    dialoguePagesPercent: number;
    establishingPagesPercent: number;
  };
}

// ============================================================================
// Screenplay-Specific Discovery Types
// ============================================================================

export interface VisualBeatPattern {
  id: string;
  description: string;
  type: 'transition' | 'reveal' | 'action_sequence' | 'emotional_moment' | 'establishing';
  occurrences: { sequenceNumber: number; sceneNumber: number }[];
  effectiveness: 'weak' | 'moderate' | 'strong';
}

export interface LocationUsage {
  locationName: string;
  sluglineFormat: string;
  sceneCount: number;
  totalPageEstimate: number;
  purposes: ('exposition' | 'conflict' | 'revelation' | 'action' | 'emotional')[];
  associatedCharacters: string[];
  canReuse: boolean;  // Has more storytelling potential
}

export interface SceneStructurePattern {
  pattern: string;  // e.g., "dialogue-action-revelation"
  occurrences: number;
  averageLength: number;  // Pages
  effectiveness: 'weak' | 'moderate' | 'strong';
}

export interface ScreenplayDiscoveryState {
  visualBeats: VisualBeatPattern[];
  locationUsage: LocationUsage[];
  scenePatterns: SceneStructurePattern[];
  dialogueToActionRatio: number;  // Rolling average
  averageSceneLength: number;
  effectiveSubtextMoments: string[];  // Dialogue that worked through subtext
  pacingIssues: { sequenceNumber: number; issue: string }[];
}

// ============================================================================
// Book-Specific Discovery Types
// ============================================================================

export interface ProsePattern {
  type: 'narrative_voice' | 'internal_monologue' | 'sensory_detail' | 'metaphor';
  description: string;
  occurrences: number;
  chapters: number[];
  effectiveness: 'weak' | 'moderate' | 'strong';
}

export interface SymbolicElement {
  name: string;
  meaning: string;
  occurrences: { chapter: number; context: string }[];
  isRecurring: boolean;
  shouldDevelop: boolean;  // Worth expanding in future chapters
}

export interface BookDiscoveryState {
  prosePatterns: ProsePattern[];
  symbolicElements: SymbolicElement[];
  narrativeVoiceConsistency: 'consistent' | 'drifting' | 'intentionally_varied';
  effectiveSensoryDetails: string[];
  foreshadowingSetups: { setup: string; chapter: number; resolved: boolean }[];
  chapterEndingPatterns: { type: string; occurrences: number }[];
}

// ============================================================================
// Main Discovery State (All Formats)
// ============================================================================

export interface DiscoveryState {
  bookId: string;
  format: ContentFormat;

  // Core tracking (all formats)
  themes: EmergentTheme[];
  characterDiscoveries: CharacterDiscovery[];
  plotThreads: PlotThread[];
  runningElements: RunningElement[];
  connections: StoryConnection[];
  toneEvolution: ToneEvolution[];
  lastUpdated: number;  // Chapter number

  // Format-specific tracking
  comicState?: ComicDiscoveryState;
  screenplayState?: ScreenplayDiscoveryState;
  bookState?: BookDiscoveryState;
}

// ============================================================================
// Discovery Tracker Class
// ============================================================================

export class DiscoveryTracker {
  private state: DiscoveryState;
  private originalOutline: string;
  private format: ContentFormat;

  constructor(bookId: string, originalOutline: string, format: ContentFormat = 'book') {
    this.originalOutline = originalOutline;
    this.format = format;
    this.state = {
      bookId,
      format,
      themes: [],
      characterDiscoveries: [],
      plotThreads: [],
      runningElements: [],
      connections: [],
      toneEvolution: [],
      lastUpdated: 0,
    };

    // Initialize format-specific state
    this.initializeFormatState(format);
  }

  /**
   * Initialize format-specific tracking state
   */
  private initializeFormatState(format: ContentFormat): void {
    switch (format) {
      case 'comic':
        this.state.comicState = {
          visualMotifs: [],
          pageHookPatterns: [],
          characterVisuals: [],
          panelCountAverage: 0,
          effectivePageLayouts: [],
          visualPacing: {
            actionPagesPercent: 0,
            dialoguePagesPercent: 0,
            establishingPagesPercent: 0,
          },
        };
        break;

      case 'screenplay':
        this.state.screenplayState = {
          visualBeats: [],
          locationUsage: [],
          scenePatterns: [],
          dialogueToActionRatio: 0.5,
          averageSceneLength: 2,
          effectiveSubtextMoments: [],
          pacingIssues: [],
        };
        break;

      case 'book':
      default:
        this.state.bookState = {
          prosePatterns: [],
          symbolicElements: [],
          narrativeVoiceConsistency: 'consistent',
          effectiveSensoryDetails: [],
          foreshadowingSetups: [],
          chapterEndingPatterns: [],
        };
        break;
    }
  }

  // ============================================================================
  // Process New Chapter
  // ============================================================================

  /**
   * Process a chapter extraction and update discovery state
   */
  processChapter(extraction: ChapterExtraction): DiscoveryReport {
    const chapterNum = extraction.chapterNumber;
    const newDiscoveries: string[] = [];
    const reinforcedElements: string[] = [];
    const suggestedIntegrations: string[] = [];

    // 1. Track emergent themes
    for (const theme of extraction.emergentThemes) {
      const result = this.trackTheme(theme, chapterNum);
      if (result.isNew) {
        newDiscoveries.push(`New theme emerged: "${theme}"`);
      } else {
        reinforcedElements.push(`Theme reinforced: "${theme}"`);
      }
    }

    // 2. Track character discoveries from surprises
    for (const surprise of extraction.surprises) {
      if (surprise.deviationType === 'character_choice') {
        const discovery = this.trackCharacterDiscovery(surprise, chapterNum);
        if (discovery) {
          newDiscoveries.push(`Character discovery: ${discovery.description}`);
          if (discovery.shouldIntegrate) {
            suggestedIntegrations.push(
              `Integrate ${discovery.characterName}'s ${discovery.discoveryType} into future chapters`
            );
          }
        }
      }
    }

    // 3. Track plot threads from extraction
    for (const thread of extraction.threads) {
      const result = this.trackPlotThread(thread, chapterNum);
      if (result.isNew && !result.wasPlanned) {
        newDiscoveries.push(`Emergent plot thread: ${thread.description}`);
        if (result.priority === 'secondary' || result.priority === 'main') {
          suggestedIntegrations.push(
            `Address "${thread.description}" in upcoming chapters`
          );
        }
      }
    }

    // 4. Track running elements (motifs, callbacks)
    this.detectRunningElements(extraction, chapterNum);

    // 5. Track connections between elements
    this.detectConnections(extraction, chapterNum);

    // 6. Track tone evolution
    this.trackTone(extraction, chapterNum);

    // 7. FORMAT-SPECIFIC PROCESSING
    const formatDiscoveries = this.processFormatSpecific(extraction);
    newDiscoveries.push(...formatDiscoveries.new);
    reinforcedElements.push(...formatDiscoveries.reinforced);
    suggestedIntegrations.push(...formatDiscoveries.suggestions);

    // Update timestamp
    this.state.lastUpdated = chapterNum;

    return {
      chapterNumber: chapterNum,
      format: this.format,
      newDiscoveries,
      reinforcedElements,
      suggestedIntegrations,
      plotThreadsNeedingAttention: this.getThreadsNeedingAttention(),
      emergentThemesToReinforce: this.getStrongThemes(),
      // Format-specific additions
      ...(this.format === 'comic' && { comicInsights: this.getComicInsights() }),
      ...(this.format === 'screenplay' && { screenplayInsights: this.getScreenplayInsights() }),
      ...(this.format === 'book' && { bookInsights: this.getBookInsights() }),
    };
  }

  // ============================================================================
  // Format-Specific Processing
  // ============================================================================

  private processFormatSpecific(extraction: ChapterExtraction): {
    new: string[];
    reinforced: string[];
    suggestions: string[];
  } {
    switch (this.format) {
      case 'comic':
        return this.processComicExtraction(extraction);
      case 'screenplay':
        return this.processScreenplayExtraction(extraction);
      case 'book':
      default:
        return this.processBookExtraction(extraction);
    }
  }

  // ============================================================================
  // Comic-Specific Processing
  // ============================================================================

  private processComicExtraction(extraction: ChapterExtraction): {
    new: string[];
    reinforced: string[];
    suggestions: string[];
  } {
    const newItems: string[] = [];
    const reinforced: string[] = [];
    const suggestions: string[] = [];

    if (!this.state.comicState || !extraction.pages) {
      return { new: newItems, reinforced, suggestions };
    }

    const comicState = this.state.comicState;

    // 1. Track page hooks
    for (const page of extraction.pages) {
      if (page.pageHook) {
        const hookType = this.categorizePageHook(page.pageHook);
        const existing = comicState.pageHookPatterns.find(p => p.hookType === hookType);

        if (existing) {
          existing.occurrences++;
          existing.examples.push(page.pageHook);
          reinforced.push(`Page hook pattern "${hookType}" used again`);
        } else {
          comicState.pageHookPatterns.push({
            hookType,
            description: page.pageHook,
            effectiveness: 'moderate',  // Will be updated based on feedback
            occurrences: 1,
            examples: [page.pageHook],
          });
          newItems.push(`New page hook pattern: ${hookType}`);
        }
      }
    }

    // 2. Track visual pacing
    const pageFlows = extraction.pages.map(p => p.visualFlow);
    const actionCount = pageFlows.filter(f => f === 'action').length;
    const dialogueCount = pageFlows.filter(f => f === 'dialogue').length;
    const establishingCount = pageFlows.filter(f => f === 'establishing').length;
    const total = pageFlows.length || 1;

    comicState.visualPacing = {
      actionPagesPercent: (actionCount / total) * 100,
      dialoguePagesPercent: (dialogueCount / total) * 100,
      establishingPagesPercent: (establishingCount / total) * 100,
    };

    // Suggest if pacing is off
    if (comicState.visualPacing.dialoguePagesPercent > 70) {
      suggestions.push('Consider adding more action/visual pages - dialogue is over 70%');
    }

    // 3. Track character visual consistency
    if (extraction.visualConsistency) {
      for (const charAppearance of extraction.visualConsistency.characterAppearances) {
        let profile = comicState.characterVisuals.find(
          cv => cv.characterName.toLowerCase() === charAppearance.name.toLowerCase()
        );

        if (!profile) {
          profile = {
            characterName: charAppearance.name,
            establishedDetails: charAppearance.visualDetails,
            inconsistencies: [],
            lastAppearance: charAppearance.lastSeenPage,
            distinctiveFeatures: charAppearance.visualDetails.slice(0, 3),
          };
          comicState.characterVisuals.push(profile);
          newItems.push(`Character visual profile established: ${charAppearance.name}`);
        } else {
          // Check for inconsistencies
          const newDetails = charAppearance.visualDetails;
          for (const newDetail of newDetails) {
            const conflicting = profile.establishedDetails.find(d =>
              this.isConflictingDetail(d, newDetail)
            );
            if (conflicting) {
              profile.inconsistencies.push({
                detail: `${conflicting} vs ${newDetail}`,
                pages: [profile.lastAppearance, charAppearance.lastSeenPage],
              });
              suggestions.push(`Visual inconsistency for ${charAppearance.name}: ${conflicting} vs ${newDetail}`);
            }
          }
          profile.lastAppearance = charAppearance.lastSeenPage;
        }
      }
    }

    // 4. Track visual motifs
    if (extraction.visualConsistency?.visualMotifs) {
      for (const motif of extraction.visualConsistency.visualMotifs) {
        const existing = comicState.visualMotifs.find(m =>
          m.name.toLowerCase().includes(motif.toLowerCase()) ||
          motif.toLowerCase().includes(m.name.toLowerCase())
        );

        if (existing) {
          existing.occurrences.push({
            pageNumber: extraction.chapterNumber,
            panelNumber: 0,
            context: 'Recurring appearance',
          });
          existing.shouldRecur = true;
          reinforced.push(`Visual motif recurring: ${motif}`);
        } else {
          comicState.visualMotifs.push({
            id: `motif_${Date.now()}`,
            name: motif,
            description: motif,
            type: 'symbol',
            occurrences: [{ pageNumber: extraction.chapterNumber, panelNumber: 0, context: 'First appearance' }],
            shouldRecur: false,
          });
          newItems.push(`New visual motif: ${motif}`);
        }
      }
    }

    // 5. Update panel count average
    if (extraction.panelCount) {
      const prevAvg = comicState.panelCountAverage;
      const prevCount = this.state.lastUpdated || 1;
      comicState.panelCountAverage = (prevAvg * prevCount + extraction.panelCount) / (prevCount + 1);
    }

    return { new: newItems, reinforced, suggestions };
  }

  private categorizePageHook(hook: string): PageHookPattern['hookType'] {
    const lower = hook.toLowerCase();
    if (lower.includes('?') || lower.includes('who') || lower.includes('what') || lower.includes('why')) {
      return 'question';
    }
    if (lower.includes('reveal') || lower.includes('sees') || lower.includes('discovers')) {
      return 'reveal';
    }
    if (lower.includes('frozen') || lower.includes('mid-') || lower.includes('about to')) {
      return 'action_freeze';
    }
    if (lower.includes('tears') || lower.includes('emotion') || lower.includes('face')) {
      return 'emotional';
    }
    return 'cliffhanger';
  }

  private isConflictingDetail(existing: string, newDetail: string): boolean {
    // Simple conflict detection (e.g., "red hair" vs "black hair")
    const colorWords = ['red', 'blue', 'green', 'black', 'white', 'brown', 'blonde', 'gray'];
    const existingColor = colorWords.find(c => existing.toLowerCase().includes(c));
    const newColor = colorWords.find(c => newDetail.toLowerCase().includes(c));

    if (existingColor && newColor && existingColor !== newColor) {
      // Same attribute type with different values
      const existingType = existing.toLowerCase().replace(existingColor, '').trim();
      const newType = newDetail.toLowerCase().replace(newColor, '').trim();
      if (existingType === newType) {
        return true;
      }
    }
    return false;
  }

  private getComicInsights(): {
    effectiveHooks: string[];
    visualMotifsToDevelop: string[];
    consistencyIssues: string[];
    pacingRecommendation: string;
  } {
    const comicState = this.state.comicState!;

    return {
      effectiveHooks: comicState.pageHookPatterns
        .filter(h => h.occurrences >= 2)
        .map(h => h.hookType),
      visualMotifsToDevelop: comicState.visualMotifs
        .filter(m => m.shouldRecur)
        .map(m => m.name),
      consistencyIssues: comicState.characterVisuals
        .flatMap(cv => cv.inconsistencies.map(i => `${cv.characterName}: ${i.detail}`)),
      pacingRecommendation: this.getComicPacingRecommendation(),
    };
  }

  private getComicPacingRecommendation(): string {
    const pacing = this.state.comicState?.visualPacing;
    if (!pacing) return 'No pacing data yet';

    if (pacing.actionPagesPercent > 60) {
      return 'Consider adding more dialogue/emotional beats for breathing room';
    }
    if (pacing.dialoguePagesPercent > 60) {
      return 'Consider adding more action/visual pages to maintain energy';
    }
    if (pacing.establishingPagesPercent < 10) {
      return 'Consider more establishing shots to ground the reader in locations';
    }
    return 'Pacing looks balanced';
  }

  // ============================================================================
  // Screenplay-Specific Processing
  // ============================================================================

  private processScreenplayExtraction(extraction: ChapterExtraction): {
    new: string[];
    reinforced: string[];
    suggestions: string[];
  } {
    const newItems: string[] = [];
    const reinforced: string[] = [];
    const suggestions: string[] = [];

    if (!this.state.screenplayState || !extraction.scenes) {
      return { new: newItems, reinforced, suggestions };
    }

    const screenplayState = this.state.screenplayState;

    // 1. Track location usage
    for (const scene of extraction.scenes) {
      let locationEntry = screenplayState.locationUsage.find(
        l => l.locationName.toLowerCase() === scene.location.toLowerCase()
      );

      if (!locationEntry) {
        locationEntry = {
          locationName: scene.location,
          sluglineFormat: scene.slugline,
          sceneCount: 1,
          totalPageEstimate: 2,  // Default estimate
          purposes: [scene.purpose],
          associatedCharacters: scene.characters,
          canReuse: true,
        };
        screenplayState.locationUsage.push(locationEntry);
        newItems.push(`New location introduced: ${scene.location}`);
      } else {
        locationEntry.sceneCount++;
        if (!locationEntry.purposes.includes(scene.purpose)) {
          locationEntry.purposes.push(scene.purpose);
        }
        // Add new characters associated with this location
        for (const char of scene.characters) {
          if (!locationEntry.associatedCharacters.includes(char)) {
            locationEntry.associatedCharacters.push(char);
          }
        }
        reinforced.push(`Location reused: ${scene.location}`);
      }
    }

    // 2. Track dialogue/action balance
    if (extraction.sequencePacing) {
      const prevRatio = screenplayState.dialogueToActionRatio;
      const newRatio = extraction.sequencePacing.dialogueToActionRatio;
      screenplayState.dialogueToActionRatio = (prevRatio + newRatio) / 2;

      if (newRatio > 0.7) {
        suggestions.push('This sequence is dialogue-heavy (>70%). Consider adding visual action.');
      }
      if (newRatio < 0.3) {
        suggestions.push('This sequence is action-heavy (<30% dialogue). Consider character moments.');
      }
    }

    // 3. Track visual beats
    if (extraction.visualBeats) {
      for (const beat of extraction.visualBeats) {
        const existing = screenplayState.visualBeats.find(b =>
          b.description.toLowerCase().includes(beat.toLowerCase().slice(0, 20))
        );

        if (existing) {
          existing.occurrences.push({
            sequenceNumber: extraction.chapterNumber,
            sceneNumber: 0,
          });
          reinforced.push(`Visual beat pattern: ${beat.slice(0, 30)}`);
        } else {
          screenplayState.visualBeats.push({
            id: `vbeat_${Date.now()}`,
            description: beat,
            type: this.categorizeVisualBeat(beat),
            occurrences: [{ sequenceNumber: extraction.chapterNumber, sceneNumber: 0 }],
            effectiveness: 'moderate',
          });
          newItems.push(`New visual beat: ${beat.slice(0, 30)}`);
        }
      }
    }

    // 4. Detect scene structure patterns
    if (extraction.scenes.length >= 2) {
      const pattern = extraction.scenes.map(s => s.purpose).join('-');
      const existing = screenplayState.scenePatterns.find(p => p.pattern === pattern);

      if (existing) {
        existing.occurrences++;
      } else {
        screenplayState.scenePatterns.push({
          pattern,
          occurrences: 1,
          averageLength: extraction.scenes.length,
          effectiveness: 'moderate',
        });
      }
    }

    // 5. Check for pacing issues
    const scenesWithSamePurpose = extraction.scenes.filter(s => s.purpose === extraction.scenes[0]?.purpose);
    if (scenesWithSamePurpose.length > 3) {
      screenplayState.pacingIssues.push({
        sequenceNumber: extraction.chapterNumber,
        issue: `Multiple consecutive ${extraction.scenes[0]?.purpose} scenes`,
      });
      suggestions.push(`Consider varying scene purposes - ${scenesWithSamePurpose.length} consecutive ${extraction.scenes[0]?.purpose} scenes`);
    }

    return { new: newItems, reinforced, suggestions };
  }

  private categorizeVisualBeat(beat: string): VisualBeatPattern['type'] {
    const lower = beat.toLowerCase();
    if (lower.includes('reveal') || lower.includes('discover') || lower.includes('sees')) {
      return 'reveal';
    }
    if (lower.includes('action') || lower.includes('chase') || lower.includes('fight')) {
      return 'action_sequence';
    }
    if (lower.includes('emotion') || lower.includes('tears') || lower.includes('moment')) {
      return 'emotional_moment';
    }
    if (lower.includes('exterior') || lower.includes('landscape') || lower.includes('city')) {
      return 'establishing';
    }
    return 'transition';
  }

  private getScreenplayInsights(): {
    overusedLocations: string[];
    underusedLocations: string[];
    effectivePatterns: string[];
    pacingIssues: string[];
    dialogueBalance: string;
  } {
    const state = this.state.screenplayState!;

    const avgSceneCount = state.locationUsage.reduce((sum, l) => sum + l.sceneCount, 0) /
      (state.locationUsage.length || 1);

    return {
      overusedLocations: state.locationUsage
        .filter(l => l.sceneCount > avgSceneCount * 2)
        .map(l => l.locationName),
      underusedLocations: state.locationUsage
        .filter(l => l.sceneCount === 1 && l.canReuse)
        .map(l => l.locationName),
      effectivePatterns: state.scenePatterns
        .filter(p => p.occurrences >= 2)
        .map(p => p.pattern),
      pacingIssues: state.pacingIssues.map(p => p.issue),
      dialogueBalance: state.dialogueToActionRatio > 0.6
        ? 'Dialogue-heavy'
        : state.dialogueToActionRatio < 0.4
          ? 'Action-heavy'
          : 'Balanced',
    };
  }

  // ============================================================================
  // Book-Specific Processing
  // ============================================================================

  private processBookExtraction(extraction: ChapterExtraction): {
    new: string[];
    reinforced: string[];
    suggestions: string[];
  } {
    const newItems: string[] = [];
    const reinforced: string[] = [];
    const suggestions: string[] = [];

    if (!this.state.bookState) {
      return { new: newItems, reinforced, suggestions };
    }

    const bookState = this.state.bookState;

    // 1. Track prose elements
    if (extraction.proseElements) {
      // Track symbolism
      for (const symbol of extraction.proseElements.symbolism || []) {
        const existing = bookState.symbolicElements.find(s =>
          s.name.toLowerCase().includes(symbol.toLowerCase().slice(0, 15))
        );

        if (existing) {
          existing.occurrences.push({
            chapter: extraction.chapterNumber,
            context: 'Recurring symbol',
          });
          existing.isRecurring = true;
          existing.shouldDevelop = true;
          reinforced.push(`Symbol recurring: ${symbol}`);
        } else {
          bookState.symbolicElements.push({
            name: symbol,
            meaning: 'To be determined',
            occurrences: [{ chapter: extraction.chapterNumber, context: 'First appearance' }],
            isRecurring: false,
            shouldDevelop: false,
          });
          newItems.push(`New symbolic element: ${symbol}`);
        }
      }

      // Track foreshadowing
      for (const foreshadow of extraction.proseElements.foreshadowing || []) {
        bookState.foreshadowingSetups.push({
          setup: foreshadow,
          chapter: extraction.chapterNumber,
          resolved: false,
        });
        newItems.push(`Foreshadowing setup: ${foreshadow.slice(0, 40)}`);
      }

      // Track effective sensory details
      for (const sensory of extraction.proseElements.sensoryDetails || []) {
        if (!bookState.effectiveSensoryDetails.includes(sensory)) {
          bookState.effectiveSensoryDetails.push(sensory);
        }
      }
    }

    // 2. Track chapter ending patterns
    if (extraction.chapterPacing?.cliffhangerStrength) {
      const endingType = extraction.chapterPacing.cliffhangerStrength;
      const existing = bookState.chapterEndingPatterns.find(p => p.type === endingType);

      if (existing) {
        existing.occurrences++;
      } else {
        bookState.chapterEndingPatterns.push({
          type: endingType,
          occurrences: 1,
        });
      }

      // Suggest variation
      const mostUsed = bookState.chapterEndingPatterns.sort((a, b) => b.occurrences - a.occurrences)[0];
      if (mostUsed && mostUsed.occurrences >= 3 && mostUsed.type === endingType) {
        suggestions.push(`Chapter endings are frequently "${endingType}" - consider varying the pattern`);
      }
    }

    // 3. Check unresolved foreshadowing
    const unresolvedCount = bookState.foreshadowingSetups.filter(f => !f.resolved).length;
    if (unresolvedCount > 5) {
      suggestions.push(`${unresolvedCount} foreshadowing setups are unresolved - consider paying some off`);
    }

    return { new: newItems, reinforced, suggestions };
  }

  private getBookInsights(): {
    symbolsToDevelop: string[];
    unresolvedForeshadowing: string[];
    effectiveSensoryDetails: string[];
    endingPatternRecommendation: string;
  } {
    const state = this.state.bookState!;

    return {
      symbolsToDevelop: state.symbolicElements
        .filter(s => s.shouldDevelop)
        .map(s => s.name),
      unresolvedForeshadowing: state.foreshadowingSetups
        .filter(f => !f.resolved)
        .map(f => f.setup),
      effectiveSensoryDetails: state.effectiveSensoryDetails.slice(0, 5),
      endingPatternRecommendation: this.getEndingPatternRecommendation(),
    };
  }

  private getEndingPatternRecommendation(): string {
    const patterns = this.state.bookState?.chapterEndingPatterns || [];
    if (patterns.length === 0) return 'No pattern data yet';

    const sorted = [...patterns].sort((a, b) => b.occurrences - a.occurrences);
    const mostUsed = sorted[0];

    if (mostUsed.occurrences >= 3) {
      switch (mostUsed.type) {
        case 'strong':
          return 'Many strong cliffhangers - consider a quieter ending for variety';
        case 'mild':
          return 'Endings are consistently mild - try a stronger cliffhanger';
        case 'none':
          return 'Chapters often end without hooks - add tension to keep readers turning pages';
        default:
          return 'Good variety in chapter endings';
      }
    }

    return 'Chapter endings have good variety';
  }

  // ============================================================================
  // Theme Tracking
  // ============================================================================

  private trackTheme(
    themeName: string,
    chapterNum: number
  ): { isNew: boolean; theme: EmergentTheme } {
    const normalizedName = themeName.toLowerCase().trim();

    // Check if theme exists
    let existing = this.state.themes.find(
      t => t.name.toLowerCase() === normalizedName ||
           t.description.toLowerCase().includes(normalizedName)
    );

    if (existing) {
      // Reinforce existing theme
      existing.occurrences.push({
        chapterNumber: chapterNum,
        context: `Appeared in chapter ${chapterNum}`,
        manifestation: 'action',
      });

      // Upgrade strength if recurring
      if (existing.occurrences.length >= 3 && existing.strength === 'subtle') {
        existing.strength = 'developing';
      } else if (existing.occurrences.length >= 5 && existing.strength === 'developing') {
        existing.strength = 'prominent';
      }

      return { isNew: false, theme: existing };
    }

    // Create new theme
    const wasPlanned = this.originalOutline.toLowerCase().includes(normalizedName);
    const newTheme: EmergentTheme = {
      id: `theme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: themeName,
      description: themeName,
      firstAppeared: chapterNum,
      occurrences: [{
        chapterNumber: chapterNum,
        context: `First appeared in chapter ${chapterNum}`,
        manifestation: 'action',
      }],
      strength: 'subtle',
      wasPlanned,
    };

    this.state.themes.push(newTheme);
    return { isNew: true, theme: newTheme };
  }

  // ============================================================================
  // Character Discovery Tracking
  // ============================================================================

  private trackCharacterDiscovery(
    surprise: {
      description: string;
      actuallyHappened: string;
      outlinePlanned?: string;
    },
    chapterNum: number
  ): CharacterDiscovery | null {
    // Extract character name from surprise
    const nameMatch = surprise.actuallyHappened.match(/^(\w+)/);
    if (!nameMatch) return null;

    const characterName = nameMatch[1];
    const wasPlanned = this.originalOutline.toLowerCase().includes(
      surprise.actuallyHappened.toLowerCase().slice(0, 50)
    );

    // Determine discovery type
    let discoveryType: CharacterDiscovery['discoveryType'] = 'trait';
    const lowerDesc = surprise.actuallyHappened.toLowerCase();

    if (lowerDesc.includes('past') || lowerDesc.includes('history') || lowerDesc.includes('was once')) {
      discoveryType = 'backstory';
    } else if (lowerDesc.includes('wants') || lowerDesc.includes('needs') || lowerDesc.includes('desires')) {
      discoveryType = 'motivation';
    } else if (lowerDesc.includes('relationship') || lowerDesc.includes('feelings for')) {
      discoveryType = 'relationship';
    } else if (lowerDesc.includes('can') || lowerDesc.includes('knows how') || lowerDesc.includes('skill')) {
      discoveryType = 'skill';
    }

    const discovery: CharacterDiscovery = {
      characterName,
      discoveryType,
      description: surprise.actuallyHappened,
      chapterRevealed: chapterNum,
      wasPlanned,
      shouldIntegrate: !wasPlanned,  // Integrate if unplanned
    };

    this.state.characterDiscoveries.push(discovery);
    return discovery;
  }

  // ============================================================================
  // Plot Thread Tracking
  // ============================================================================

  private trackPlotThread(
    thread: ExtractedThread,
    chapterNum: number
  ): PlotThread & { isNew: boolean } {
    // Check if thread exists
    const existingIndex = this.state.plotThreads.findIndex(
      t => t.description.toLowerCase().includes(thread.description.toLowerCase().slice(0, 30)) ||
           thread.description.toLowerCase().includes(t.description.toLowerCase().slice(0, 30))
    );

    if (existingIndex >= 0) {
      // Update existing thread
      const existing = this.state.plotThreads[existingIndex];
      existing.lastMentioned = chapterNum;

      // Update status based on thread type
      if (thread.type === 'callback') {
        existing.status = 'resolved';
      } else if (thread.urgency === 'immediate' || thread.urgency === 'high') {
        existing.status = 'ready_to_resolve';
      }

      return { ...existing, isNew: false };
    }

    // Create new thread
    const wasPlanned = this.originalOutline.toLowerCase().includes(
      thread.description.toLowerCase().slice(0, 40)
    );

    const newThread: PlotThread = {
      id: `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: thread.description,
      type: this.categorizeThread(thread.description),
      introduced: chapterNum,
      lastMentioned: chapterNum,
      status: thread.type === 'cliffhanger' ? 'ready_to_resolve' : 'active',
      priority: thread.urgency === 'immediate' ? 'main' : thread.urgency === 'high' ? 'secondary' : 'minor',
      wasPlanned,
    };

    this.state.plotThreads.push(newThread);
    return { ...newThread, isNew: true };
  }

  private categorizeThread(description: string): PlotThread['type'] {
    const lower = description.toLowerCase();

    if (lower.includes('secret') || lower.includes('mystery') || lower.includes('unknown')) {
      return 'mystery';
    } else if (lower.includes('conflict') || lower.includes('against') || lower.includes('fight')) {
      return 'conflict';
    } else if (lower.includes('relationship') || lower.includes('between') || lower.includes('love')) {
      return 'relationship';
    } else if (lower.includes('must') || lower.includes('goal') || lower.includes('mission')) {
      return 'goal';
    }

    return 'secret';
  }

  // ============================================================================
  // Running Elements Detection
  // ============================================================================

  private detectRunningElements(extraction: ChapterExtraction, chapterNum: number): void {
    // Look for potential motifs in the chapter
    const content = extraction.oneLineSummary + ' ' + extraction.emotionalArc;

    // Check existing running elements
    for (const element of this.state.runningElements) {
      if (content.toLowerCase().includes(element.name.toLowerCase())) {
        if (!element.occurrences.includes(chapterNum)) {
          element.occurrences.push(chapterNum);
        }
      }
    }

    // Detect new potential running elements from threads
    for (const thread of extraction.threads) {
      if (thread.type === 'callback') {
        // This might be a running element
        const existing = this.state.runningElements.find(
          e => thread.description.toLowerCase().includes(e.name.toLowerCase())
        );

        if (!existing) {
          this.state.runningElements.push({
            id: `element_${Date.now()}`,
            type: 'callback',
            name: this.extractElementName(thread.description),
            description: thread.description,
            occurrences: [chapterNum],
          });
        }
      }
    }
  }

  private extractElementName(description: string): string {
    // Extract the key noun/phrase from the description
    const words = description.split(' ').slice(0, 3);
    return words.join(' ');
  }

  // ============================================================================
  // Connection Detection
  // ============================================================================

  private detectConnections(extraction: ChapterExtraction, chapterNum: number): void {
    // Look for parallel structures in relationships
    const relationships = extraction.relationships;

    for (let i = 0; i < relationships.length; i++) {
      for (let j = i + 1; j < relationships.length; j++) {
        const rel1 = relationships[i];
        const rel2 = relationships[j];

        // Detect mirrors (same type of change)
        if (rel1.change === rel2.change && rel1.change !== 'unchanged') {
          this.state.connections.push({
            element1: `${rel1.character1}-${rel1.character2} relationship`,
            element2: `${rel2.character1}-${rel2.character2} relationship`,
            connectionType: 'parallel',
            description: `Both relationships ${rel1.change} in the same chapter`,
            chapterDiscovered: chapterNum,
          });
        }

        // Detect contrasts (opposite changes)
        if (
          (rel1.change === 'improved' && rel2.change === 'worsened') ||
          (rel1.change === 'worsened' && rel2.change === 'improved')
        ) {
          this.state.connections.push({
            element1: `${rel1.character1}-${rel1.character2} relationship`,
            element2: `${rel2.character1}-${rel2.character2} relationship`,
            connectionType: 'contrast',
            description: `Contrasting relationship arcs`,
            chapterDiscovered: chapterNum,
          });
        }
      }
    }
  }

  // ============================================================================
  // Tone Tracking
  // ============================================================================

  private trackTone(extraction: ChapterExtraction, chapterNum: number): void {
    // Infer tone from emotional arc
    const emotionalArc = extraction.emotionalArc.toLowerCase();
    let primaryTone = 'neutral';

    if (emotionalArc.includes('tension') || emotionalArc.includes('suspense') || emotionalArc.includes('fear')) {
      primaryTone = 'tense';
    } else if (emotionalArc.includes('hope') || emotionalArc.includes('joy') || emotionalArc.includes('triumph')) {
      primaryTone = 'hopeful';
    } else if (emotionalArc.includes('sad') || emotionalArc.includes('loss') || emotionalArc.includes('grief')) {
      primaryTone = 'melancholic';
    } else if (emotionalArc.includes('anger') || emotionalArc.includes('conflict') || emotionalArc.includes('fight')) {
      primaryTone = 'intense';
    } else if (emotionalArc.includes('romance') || emotionalArc.includes('love') || emotionalArc.includes('intimate')) {
      primaryTone = 'romantic';
    }

    // Check for shift from previous
    const previousTone = this.state.toneEvolution[this.state.toneEvolution.length - 1];
    const toneEntry: ToneEvolution = {
      chapterNumber: chapterNum,
      primaryTone,
    };

    if (previousTone && previousTone.primaryTone !== primaryTone) {
      toneEntry.shift = {
        from: previousTone.primaryTone,
        to: primaryTone,
        trigger: extraction.oneLineSummary,
      };
    }

    this.state.toneEvolution.push(toneEntry);
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get threads that need attention in upcoming chapters
   */
  getThreadsNeedingAttention(): PlotThread[] {
    return this.state.plotThreads.filter(t =>
      t.status === 'active' || t.status === 'ready_to_resolve'
    ).sort((a, b) => {
      // Priority order: main > secondary > minor
      const priorityOrder = { main: 0, secondary: 1, minor: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get strong themes to reinforce
   */
  getStrongThemes(): EmergentTheme[] {
    return this.state.themes.filter(
      t => t.strength === 'developing' || t.strength === 'prominent' || t.strength === 'central'
    );
  }

  /**
   * Get unplanned discoveries that should be integrated
   */
  getUnplannedDiscoveries(): {
    themes: EmergentTheme[];
    characters: CharacterDiscovery[];
    threads: PlotThread[];
  } {
    return {
      themes: this.state.themes.filter(t => !t.wasPlanned),
      characters: this.state.characterDiscoveries.filter(c => !c.wasPlanned && c.shouldIntegrate),
      threads: this.state.plotThreads.filter(t => !t.wasPlanned && t.status === 'active'),
    };
  }

  /**
   * Get stale threads (not mentioned in a while)
   */
  getStaleThreads(currentChapter: number, staleThreshold: number = 3): PlotThread[] {
    return this.state.plotThreads.filter(t =>
      t.status === 'active' &&
      (currentChapter - t.lastMentioned) >= staleThreshold
    );
  }

  /**
   * Get the full discovery state
   */
  getState(): DiscoveryState {
    return { ...this.state };
  }

  /**
   * Load state from storage
   */
  loadState(state: DiscoveryState): void {
    this.state = state;
  }

  /**
   * Generate a discovery summary for outline revision
   */
  generateDiscoverySummary(): string {
    const unplanned = this.getUnplannedDiscoveries();
    const strongThemes = this.getStrongThemes();
    const needsAttention = this.getThreadsNeedingAttention();

    let summary = '=== STORY EVOLUTION SUMMARY ===\n\n';

    if (strongThemes.length > 0) {
      summary += 'THEMES TO REINFORCE:\n';
      for (const theme of strongThemes) {
        summary += `- "${theme.name}" (${theme.strength}, appeared ${theme.occurrences.length} times)\n`;
      }
      summary += '\n';
    }

    if (unplanned.characters.length > 0) {
      summary += 'CHARACTER DISCOVERIES TO INTEGRATE:\n';
      for (const discovery of unplanned.characters) {
        summary += `- ${discovery.characterName}: ${discovery.description}\n`;
      }
      summary += '\n';
    }

    if (needsAttention.length > 0) {
      summary += 'THREADS NEEDING ATTENTION:\n';
      for (const thread of needsAttention.slice(0, 5)) {
        summary += `- [${thread.priority.toUpperCase()}] ${thread.description} (${thread.status})\n`;
      }
      summary += '\n';
    }

    if (unplanned.threads.length > 0) {
      summary += 'EMERGENT PLOT THREADS:\n';
      for (const thread of unplanned.threads) {
        summary += `- ${thread.description}\n`;
      }
    }

    return summary;
  }
}

// ============================================================================
// Discovery Report Type
// ============================================================================

export interface DiscoveryReport {
  chapterNumber: number;
  format: ContentFormat;
  newDiscoveries: string[];
  reinforcedElements: string[];
  suggestedIntegrations: string[];
  plotThreadsNeedingAttention: PlotThread[];
  emergentThemesToReinforce: EmergentTheme[];

  // Format-specific insights (only one will be present based on format)
  comicInsights?: {
    effectiveHooks: string[];
    visualMotifsToDevelop: string[];
    consistencyIssues: string[];
    pacingRecommendation: string;
  };
  screenplayInsights?: {
    overusedLocations: string[];
    underusedLocations: string[];
    effectivePatterns: string[];
    pacingIssues: string[];
    dialogueBalance: string;
  };
  bookInsights?: {
    symbolsToDevelop: string[];
    unresolvedForeshadowing: string[];
    effectiveSensoryDetails: string[];
    endingPatternRecommendation: string;
  };
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDiscoveryTracker(
  bookId: string,
  originalOutline: string,
  format: ContentFormat = 'book'
): DiscoveryTracker {
  return new DiscoveryTracker(bookId, originalOutline, format);
}
