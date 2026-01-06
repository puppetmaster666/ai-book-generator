/**
 * Character Arc Tracker
 *
 * Tracks how characters EVOLVE during the story.
 *
 * This goes beyond the character-lock system (which prevents contradictions).
 * This system tracks GROWTH, CHANGE, and DEVELOPMENT.
 *
 * What We Track:
 * - Arc Progress: Where are they in their journey?
 * - Emotional Evolution: How have their feelings changed?
 * - Relationship Dynamics: How have relationships shifted?
 * - Knowledge State: What do they know now vs before?
 * - Decision Points: Key choices that defined them
 * - Wounds & Growth: Physical/emotional damage and healing
 *
 * Purpose:
 * Ensure characters feel ALIVE and CHANGING, not static.
 * Prevent "reset to default" syndrome where characters don't grow.
 * Guide future chapters to continue character development naturally.
 */

import { ExtractedCharacter, ExtractedRelationship, ContentFormat } from './chapter-extraction';

// ============================================================================
// Types
// ============================================================================

// ============================================================================
// Format-Specific Character Tracking Types
// ============================================================================

/**
 * Comic-specific character visual tracking
 */
export interface ComicCharacterVisuals {
  // Visual Identity
  costume: string;
  colorPalette: string[];
  distinctiveFeatures: string[];
  hairStyle: string;
  bodyType: string;

  // Visual Consistency
  establishedPoses: string[];
  expressionRange: string[];  // Expressions shown so far
  visualSymbols: string[];    // Associated visual motifs (e.g., "always has shadow behind")

  // Panel Presence
  panelAppearances: number;
  splashPanelCount: number;
  closeUpCount: number;
  averagePanelPosition: 'foreground' | 'midground' | 'background';

  // Visual Evolution
  costumeChanges: { chapter: number; description: string }[];
  visualTransformations: { chapter: number; before: string; after: string }[];
}

/**
 * Comic character page presence tracking
 */
export interface ComicPagePresence {
  pageNumber: number;
  panels: number[];  // Which panels they appear in
  isVisualFocus: boolean;
  hasDialogue: boolean;
  hasSoloMoment: boolean;  // Featured alone in a panel
}

/**
 * Screenplay-specific character tracking
 */
export interface ScreenplayCharacterProfile {
  // Screen Presence
  estimatedScreenTime: number;  // In pages
  sceneAppearances: number;
  majorScenes: number;  // Scenes where they have significant role

  // Dialogue Patterns
  dialogueStyle: string;  // e.g., "terse and direct", "verbose and flowery"
  catchPhrases: string[];
  speechPatterns: string[];  // e.g., "asks questions instead of answering"
  silenceRatio: number;  // 0-1, how often they're silent when present

  // Visual Mannerisms
  physicalMannerisms: string[];  // e.g., "cracks knuckles when nervous"
  signatureActions: string[];   // e.g., "always straightens tie before lying"
  entranceStyle: string;        // How they typically enter scenes
  exitStyle: string;            // How they typically leave

  // Scene Dynamics
  sceneTypes: { type: string; count: number }[];  // Action, dialogue, emotional, etc.
  characterPairings: { character: string; sharedScenes: number }[];
  locationAssociations: { location: string; count: number }[];
}

/**
 * Scene presence tracking for screenplay characters
 */
export interface ScenePresence {
  sceneNumber: number;
  slugline: string;
  role: 'primary' | 'secondary' | 'background';
  hasDialogue: boolean;
  hasAction: boolean;
  estimatedPages: number;
  characterCount: number;  // Total characters in scene
}

/**
 * Book-specific prose character tracking
 */
export interface BookCharacterProse {
  // Narrative Voice
  povChapters: number[];  // Chapters from their POV
  internalMonologueStyle: string;
  sensoryFocus: string[];  // What senses are emphasized in their POV

  // Prose Patterns
  descriptionLength: 'brief' | 'moderate' | 'detailed';
  associatedImagery: string[];  // Recurring imagery tied to them
  symbolicConnections: string[];  // Symbols associated with character

  // Reader Connection
  readerKnowledge: string[];  // What readers know about them
  readerMysteries: string[];  // What readers wonder about them
  dramaticIrony: string[];    // What readers know that character doesn't
}

export type ArcStage = 'setup' | 'conflict' | 'rising' | 'crisis' | 'transformation' | 'resolution' | 'new_normal';

export interface CharacterArcMilestone {
  stage: ArcStage;
  chapterNumber: number;
  description: string;
  triggerEvent: string;
}

export interface EmotionalState {
  chapterNumber: number;
  primaryEmotion: string;
  intensity: 'low' | 'medium' | 'high' | 'extreme';
  trigger: string;
  internalConflict?: string;
}

export interface RelationshipState {
  otherCharacter: string;
  currentStatus: 'ally' | 'enemy' | 'neutral' | 'complicated' | 'romantic' | 'family' | 'professional';
  trustLevel: number;  // -10 to 10
  lastInteraction: number;  // Chapter number
  historyHighlights: string[];
}

export interface DecisionPoint {
  chapterNumber: number;
  decision: string;
  alternatives: string[];  // What they could have done
  consequences: string[];
  revealsAboutCharacter: string;
}

export interface CharacterKnowledge {
  fact: string;
  learnedInChapter: number;
  source: string;
  significance: 'minor' | 'moderate' | 'major' | 'story_changing';
}

export interface WoundOrGrowth {
  type: 'physical_wound' | 'emotional_wound' | 'growth' | 'healing' | 'loss' | 'gain';
  description: string;
  chapterOccurred: number;
  isOngoing: boolean;
  affectsCapabilities?: string[];
}

export interface CharacterArc {
  characterName: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';

  // Arc Progress
  currentStage: ArcStage;
  milestones: CharacterArcMilestone[];
  arcCompletionPercent: number;

  // Emotional Journey
  emotionalHistory: EmotionalState[];
  currentEmotionalState: EmotionalState;
  emotionalRange: string[];  // All emotions experienced

  // Relationships
  relationships: Map<string, RelationshipState>;

  // Knowledge
  knowledge: CharacterKnowledge[];
  secrets: string[];  // Things they know but others don't
  blindspots: string[];  // Things others know but they don't

  // Decisions
  keyDecisions: DecisionPoint[];
  patternOfChoice: string;  // e.g., "tends to choose loyalty over truth"

  // Wounds & Growth
  woundsAndGrowth: WoundOrGrowth[];
  currentCapabilities: string[];  // What they can/can't do now
  characterGrowthSummary: string;

  // For Next Chapter
  needsResolution: string[];
  predictedNextStep: string;
  openQuestions: string[];  // Things readers wonder about this character

  // Format-Specific Data
  comicVisuals?: ComicCharacterVisuals;
  comicPagePresence?: ComicPagePresence[];
  screenplayProfile?: ScreenplayCharacterProfile;
  scenePresence?: ScenePresence[];
  bookProse?: BookCharacterProse;
}

export interface CharacterArcState {
  bookId: string;
  format: ContentFormat;
  arcs: Map<string, CharacterArc>;
  protagonistName?: string;
  antagonistName?: string;
  lastUpdated: number;
}

// ============================================================================
// Character Arc Tracker Class
// ============================================================================

export class CharacterArcTracker {
  private state: CharacterArcState;

  constructor(bookId: string, format: ContentFormat = 'book') {
    this.state = {
      bookId,
      format,
      arcs: new Map(),
      lastUpdated: 0,
    };
  }

  /**
   * Get the current format
   */
  getFormat(): ContentFormat {
    return this.state.format;
  }

  // ============================================================================
  // Initialize Characters
  // ============================================================================

  /**
   * Initialize a character's arc at the start of the story
   */
  initializeCharacter(
    name: string,
    role: CharacterArc['role'],
    initialDescription?: string
  ): CharacterArc {
    const arc: CharacterArc = {
      characterName: name,
      role,
      currentStage: 'setup',
      milestones: [],
      arcCompletionPercent: 0,
      emotionalHistory: [],
      currentEmotionalState: {
        chapterNumber: 0,
        primaryEmotion: 'neutral',
        intensity: 'low',
        trigger: 'Story beginning',
      },
      emotionalRange: [],
      relationships: new Map(),
      knowledge: [],
      secrets: [],
      blindspots: [],
      keyDecisions: [],
      patternOfChoice: 'Not yet established',
      woundsAndGrowth: [],
      currentCapabilities: [],
      characterGrowthSummary: 'Character arc just beginning',
      needsResolution: [],
      predictedNextStep: 'Establish character in story world',
      openQuestions: [],
    };

    // Initialize format-specific data
    if (this.state.format === 'comic') {
      arc.comicVisuals = this.initializeComicVisuals(initialDescription);
      arc.comicPagePresence = [];
    } else if (this.state.format === 'screenplay') {
      arc.screenplayProfile = this.initializeScreenplayProfile();
      arc.scenePresence = [];
    } else {
      arc.bookProse = this.initializeBookProse();
    }

    this.state.arcs.set(name.toLowerCase(), arc);

    if (role === 'protagonist') {
      this.state.protagonistName = name;
    } else if (role === 'antagonist') {
      this.state.antagonistName = name;
    }

    return arc;
  }

  /**
   * Initialize comic visual tracking for a character
   */
  private initializeComicVisuals(description?: string): ComicCharacterVisuals {
    return {
      costume: description || 'Not yet established',
      colorPalette: [],
      distinctiveFeatures: [],
      hairStyle: 'Not yet established',
      bodyType: 'Not yet established',
      establishedPoses: [],
      expressionRange: [],
      visualSymbols: [],
      panelAppearances: 0,
      splashPanelCount: 0,
      closeUpCount: 0,
      averagePanelPosition: 'midground',
      costumeChanges: [],
      visualTransformations: [],
    };
  }

  /**
   * Initialize screenplay profile for a character
   */
  private initializeScreenplayProfile(): ScreenplayCharacterProfile {
    return {
      estimatedScreenTime: 0,
      sceneAppearances: 0,
      majorScenes: 0,
      dialogueStyle: 'Not yet established',
      catchPhrases: [],
      speechPatterns: [],
      silenceRatio: 0,
      physicalMannerisms: [],
      signatureActions: [],
      entranceStyle: 'Standard',
      exitStyle: 'Standard',
      sceneTypes: [],
      characterPairings: [],
      locationAssociations: [],
    };
  }

  /**
   * Initialize book prose tracking for a character
   */
  private initializeBookProse(): BookCharacterProse {
    return {
      povChapters: [],
      internalMonologueStyle: 'Not yet established',
      sensoryFocus: [],
      descriptionLength: 'moderate',
      associatedImagery: [],
      symbolicConnections: [],
      readerKnowledge: [],
      readerMysteries: [],
      dramaticIrony: [],
    };
  }

  // ============================================================================
  // Update from Chapter
  // ============================================================================

  /**
   * Update character arcs based on chapter extraction
   */
  updateFromChapter(
    characters: ExtractedCharacter[],
    relationships: ExtractedRelationship[],
    chapterNumber: number
  ): CharacterArcUpdate[] {
    const updates: CharacterArcUpdate[] = [];

    for (const char of characters) {
      let arc = this.state.arcs.get(char.name.toLowerCase());

      // Initialize if new character
      if (!arc) {
        arc = this.initializeCharacter(char.name, this.inferRole(char.role));
      }

      const update = this.updateCharacterArc(arc, char, chapterNumber);
      updates.push(update);
    }

    // Process relationships
    for (const rel of relationships) {
      this.updateRelationship(rel, chapterNumber);
    }

    this.state.lastUpdated = chapterNumber;

    return updates;
  }

  private inferRole(extractedRole: string): CharacterArc['role'] {
    switch (extractedRole) {
      case 'protagonist':
        return 'protagonist';
      case 'antagonist':
        return 'antagonist';
      case 'ally':
      case 'neutral':
        return 'supporting';
      default:
        return 'minor';
    }
  }

  private updateCharacterArc(
    arc: CharacterArc,
    char: ExtractedCharacter,
    chapterNumber: number
  ): CharacterArcUpdate {
    const changes: string[] = [];

    // 1. Update emotional state
    if (char.emotionalState && char.emotionalState !== 'unknown') {
      const previousEmotion = arc.currentEmotionalState.primaryEmotion;
      const newEmotionalState: EmotionalState = {
        chapterNumber,
        primaryEmotion: char.emotionalState,
        intensity: this.inferIntensity(char.emotionalState),
        trigger: `Events of chapter ${chapterNumber}`,
      };

      arc.emotionalHistory.push(newEmotionalState);
      arc.currentEmotionalState = newEmotionalState;

      if (!arc.emotionalRange.includes(char.emotionalState)) {
        arc.emotionalRange.push(char.emotionalState);
      }

      if (previousEmotion !== char.emotionalState) {
        changes.push(`Emotional shift: ${previousEmotion} → ${char.emotionalState}`);
      }
    }

    // 2. Update knowledge
    if (char.newKnowledge && char.newKnowledge.length > 0) {
      for (const knowledge of char.newKnowledge) {
        arc.knowledge.push({
          fact: knowledge,
          learnedInChapter: chapterNumber,
          source: `Chapter ${chapterNumber} events`,
          significance: this.inferKnowledgeSignificance(knowledge),
        });
        changes.push(`Learned: ${knowledge}`);
      }
    }

    // 3. Update physical state (wounds)
    if (char.physicalState && char.physicalState !== 'None') {
      const existingWound = arc.woundsAndGrowth.find(
        w => w.type === 'physical_wound' && w.isOngoing
      );

      if (!existingWound) {
        arc.woundsAndGrowth.push({
          type: 'physical_wound',
          description: char.physicalState,
          chapterOccurred: chapterNumber,
          isOngoing: true,
          affectsCapabilities: this.inferCapabilityImpact(char.physicalState),
        });
        changes.push(`Physical condition: ${char.physicalState}`);
      }
    }

    // 4. Check for arc progression
    const arcProgression = this.checkArcProgression(arc, chapterNumber);
    if (arcProgression) {
      arc.currentStage = arcProgression.newStage;
      arc.milestones.push(arcProgression.milestone);
      arc.arcCompletionPercent = this.calculateArcCompletion(arc.currentStage);
      changes.push(`Arc progressed to: ${arcProgression.newStage}`);
    }

    // 5. Update growth summary
    arc.characterGrowthSummary = this.generateGrowthSummary(arc);

    // 6. Update predictions
    arc.predictedNextStep = this.predictNextStep(arc);

    // Save updated arc
    this.state.arcs.set(arc.characterName.toLowerCase(), arc);

    return {
      characterName: arc.characterName,
      chapterNumber,
      changes,
      newStage: arc.currentStage,
      emotionalState: arc.currentEmotionalState.primaryEmotion,
      arcProgress: arc.arcCompletionPercent,
    };
  }

  // ============================================================================
  // Format-Specific Update Methods
  // ============================================================================

  /**
   * Update comic character visuals from page data
   */
  updateComicCharacterVisuals(
    characterName: string,
    pageNumber: number,
    visualData: {
      panelsAppeared?: number[];
      expression?: string;
      costume?: string;
      isVisualFocus?: boolean;
      hasCloseUp?: boolean;
      hasSplashPanel?: boolean;
      panelPosition?: 'foreground' | 'midground' | 'background';
      hasDialogue?: boolean;
      hasSoloMoment?: boolean;
    }
  ): void {
    const arc = this.state.arcs.get(characterName.toLowerCase());
    if (!arc || !arc.comicVisuals) return;

    const visuals = arc.comicVisuals;

    // Update panel appearances
    if (visualData.panelsAppeared) {
      visuals.panelAppearances += visualData.panelsAppeared.length;
    }

    // Track expressions
    if (visualData.expression && !visuals.expressionRange.includes(visualData.expression)) {
      visuals.expressionRange.push(visualData.expression);
    }

    // Track costume changes
    if (visualData.costume && visualData.costume !== visuals.costume) {
      visuals.costumeChanges.push({
        chapter: pageNumber,
        description: visualData.costume,
      });
      visuals.costume = visualData.costume;
    }

    // Track visual emphasis
    if (visualData.hasCloseUp) {
      visuals.closeUpCount++;
    }
    if (visualData.hasSplashPanel) {
      visuals.splashPanelCount++;
    }

    // Update average panel position (simplified moving average)
    if (visualData.panelPosition) {
      visuals.averagePanelPosition = visualData.panelPosition;
    }

    // Track page presence
    if (!arc.comicPagePresence) {
      arc.comicPagePresence = [];
    }

    arc.comicPagePresence.push({
      pageNumber,
      panels: visualData.panelsAppeared || [],
      isVisualFocus: visualData.isVisualFocus || false,
      hasDialogue: visualData.hasDialogue || false,
      hasSoloMoment: visualData.hasSoloMoment || false,
    });

    this.state.arcs.set(characterName.toLowerCase(), arc);
  }

  /**
   * Update screenplay character profile from scene data
   */
  updateScreenplayCharacterProfile(
    characterName: string,
    sceneData: {
      sceneNumber: number;
      slugline: string;
      role: 'primary' | 'secondary' | 'background';
      hasDialogue: boolean;
      hasAction: boolean;
      estimatedPages: number;
      totalCharactersInScene: number;
      otherCharacters?: string[];
      sceneType?: string;
      dialogueSample?: string;
      mannerism?: string;
    }
  ): void {
    const arc = this.state.arcs.get(characterName.toLowerCase());
    if (!arc || !arc.screenplayProfile) return;

    const profile = arc.screenplayProfile;

    // Update screen time
    profile.estimatedScreenTime += sceneData.estimatedPages;
    profile.sceneAppearances++;

    if (sceneData.role === 'primary') {
      profile.majorScenes++;
    }

    // Update silence ratio
    if (!sceneData.hasDialogue) {
      const totalScenes = profile.sceneAppearances;
      const silentScenes = Math.round(profile.silenceRatio * (totalScenes - 1)) + 1;
      profile.silenceRatio = silentScenes / totalScenes;
    }

    // Track character pairings
    if (sceneData.otherCharacters) {
      for (const other of sceneData.otherCharacters) {
        const existing = profile.characterPairings.find(p => p.character === other);
        if (existing) {
          existing.sharedScenes++;
        } else {
          profile.characterPairings.push({ character: other, sharedScenes: 1 });
        }
      }
    }

    // Track scene types
    if (sceneData.sceneType) {
      const existingType = profile.sceneTypes.find(t => t.type === sceneData.sceneType);
      if (existingType) {
        existingType.count++;
      } else {
        profile.sceneTypes.push({ type: sceneData.sceneType, count: 1 });
      }
    }

    // Track location associations
    const location = this.extractLocationFromSlugline(sceneData.slugline);
    if (location) {
      const existingLoc = profile.locationAssociations.find(l => l.location === location);
      if (existingLoc) {
        existingLoc.count++;
      } else {
        profile.locationAssociations.push({ location, count: 1 });
      }
    }

    // Track mannerisms
    if (sceneData.mannerism && !profile.physicalMannerisms.includes(sceneData.mannerism)) {
      profile.physicalMannerisms.push(sceneData.mannerism);
    }

    // Track scene presence
    if (!arc.scenePresence) {
      arc.scenePresence = [];
    }

    arc.scenePresence.push({
      sceneNumber: sceneData.sceneNumber,
      slugline: sceneData.slugline,
      role: sceneData.role,
      hasDialogue: sceneData.hasDialogue,
      hasAction: sceneData.hasAction,
      estimatedPages: sceneData.estimatedPages,
      characterCount: sceneData.totalCharactersInScene,
    });

    this.state.arcs.set(characterName.toLowerCase(), arc);
  }

  /**
   * Update book prose tracking from chapter data
   */
  updateBookCharacterProse(
    characterName: string,
    chapterNumber: number,
    proseData: {
      isPOVCharacter?: boolean;
      internalMonologue?: string;
      sensoryDetails?: string[];
      associatedImagery?: string[];
      readerLearned?: string[];
      readerWonders?: string[];
      dramaticIrony?: string;
    }
  ): void {
    const arc = this.state.arcs.get(characterName.toLowerCase());
    if (!arc || !arc.bookProse) return;

    const prose = arc.bookProse;

    // Track POV chapters
    if (proseData.isPOVCharacter && !prose.povChapters.includes(chapterNumber)) {
      prose.povChapters.push(chapterNumber);
    }

    // Update internal monologue style
    if (proseData.internalMonologue) {
      prose.internalMonologueStyle = proseData.internalMonologue;
    }

    // Track sensory focus
    if (proseData.sensoryDetails) {
      for (const detail of proseData.sensoryDetails) {
        if (!prose.sensoryFocus.includes(detail)) {
          prose.sensoryFocus.push(detail);
        }
      }
    }

    // Track associated imagery
    if (proseData.associatedImagery) {
      for (const imagery of proseData.associatedImagery) {
        if (!prose.associatedImagery.includes(imagery)) {
          prose.associatedImagery.push(imagery);
        }
      }
    }

    // Track reader knowledge and mysteries
    if (proseData.readerLearned) {
      prose.readerKnowledge.push(...proseData.readerLearned);
    }
    if (proseData.readerWonders) {
      prose.readerMysteries.push(...proseData.readerWonders);
    }
    if (proseData.dramaticIrony) {
      prose.dramaticIrony.push(proseData.dramaticIrony);
    }

    this.state.arcs.set(characterName.toLowerCase(), arc);
  }

  /**
   * Extract location name from slugline
   */
  private extractLocationFromSlugline(slugline: string): string | null {
    // Remove INT./EXT. prefix and time suffix
    const match = slugline.match(/(?:INT\.|EXT\.)\s*(.+?)(?:\s*-\s*(?:DAY|NIGHT|MORNING|EVENING|CONTINUOUS|LATER))?$/i);
    return match ? match[1].trim() : null;
  }

  // ============================================================================
  // Relationship Tracking
  // ============================================================================

  private updateRelationship(rel: ExtractedRelationship, chapterNumber: number): void {
    // Update from char1's perspective
    const arc1 = this.state.arcs.get(rel.character1.toLowerCase());
    if (arc1) {
      let relState = arc1.relationships.get(rel.character2.toLowerCase());

      if (!relState) {
        relState = {
          otherCharacter: rel.character2,
          currentStatus: 'neutral',
          trustLevel: 0,
          lastInteraction: chapterNumber,
          historyHighlights: [],
        };
      }

      // Update based on change
      relState.lastInteraction = chapterNumber;
      relState.historyHighlights.push(`Ch${chapterNumber}: ${rel.description}`);

      // Adjust trust level
      switch (rel.change) {
        case 'improved':
          relState.trustLevel = Math.min(10, relState.trustLevel + 2);
          break;
        case 'worsened':
          relState.trustLevel = Math.max(-10, relState.trustLevel - 2);
          break;
        case 'complicated':
          relState.currentStatus = 'complicated';
          break;
        case 'revealed':
          // Relationship revealed - could go either way
          break;
      }

      arc1.relationships.set(rel.character2.toLowerCase(), relState);
    }

    // Update from char2's perspective (mirror)
    const arc2 = this.state.arcs.get(rel.character2.toLowerCase());
    if (arc2) {
      let relState = arc2.relationships.get(rel.character1.toLowerCase());

      if (!relState) {
        relState = {
          otherCharacter: rel.character1,
          currentStatus: 'neutral',
          trustLevel: 0,
          lastInteraction: chapterNumber,
          historyHighlights: [],
        };
      }

      relState.lastInteraction = chapterNumber;
      relState.historyHighlights.push(`Ch${chapterNumber}: ${rel.description}`);

      arc2.relationships.set(rel.character1.toLowerCase(), relState);
    }
  }

  // ============================================================================
  // Arc Progression Detection
  // ============================================================================

  private checkArcProgression(
    arc: CharacterArc,
    chapterNumber: number
  ): { newStage: ArcStage; milestone: CharacterArcMilestone } | null {
    const currentStage = arc.currentStage;

    // Check for stage transitions based on emotional history and events
    const recentEmotions = arc.emotionalHistory.slice(-3);
    const hasHighIntensity = recentEmotions.some(e => e.intensity === 'high' || e.intensity === 'extreme');
    const hasDecision = arc.keyDecisions.some(d => d.chapterNumber === chapterNumber);

    // Progression rules
    if (currentStage === 'setup' && arc.emotionalHistory.length >= 2) {
      return {
        newStage: 'conflict',
        milestone: {
          stage: 'conflict',
          chapterNumber,
          description: 'Character enters main conflict',
          triggerEvent: 'Story conflict introduced',
        },
      };
    }

    if (currentStage === 'conflict' && hasHighIntensity) {
      return {
        newStage: 'rising',
        milestone: {
          stage: 'rising',
          chapterNumber,
          description: 'Stakes are rising',
          triggerEvent: recentEmotions[0]?.trigger || 'Escalating events',
        },
      };
    }

    if (currentStage === 'rising' && hasDecision) {
      return {
        newStage: 'crisis',
        milestone: {
          stage: 'crisis',
          chapterNumber,
          description: 'Character faces critical moment',
          triggerEvent: 'Key decision required',
        },
      };
    }

    // More sophisticated progression would need more context

    return null;
  }

  private calculateArcCompletion(stage: ArcStage): number {
    const stages: ArcStage[] = ['setup', 'conflict', 'rising', 'crisis', 'transformation', 'resolution', 'new_normal'];
    const index = stages.indexOf(stage);
    return Math.round((index / (stages.length - 1)) * 100);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private inferIntensity(emotion: string): EmotionalState['intensity'] {
    const highIntensityWords = ['furious', 'terrified', 'devastated', 'ecstatic', 'enraged', 'horrified'];
    const mediumIntensityWords = ['angry', 'scared', 'sad', 'happy', 'worried', 'excited'];

    const lower = emotion.toLowerCase();

    if (highIntensityWords.some(w => lower.includes(w))) {
      return 'extreme';
    } else if (mediumIntensityWords.some(w => lower.includes(w))) {
      return 'high';
    } else if (lower.includes('slightly') || lower.includes('somewhat')) {
      return 'low';
    }

    return 'medium';
  }

  private inferKnowledgeSignificance(knowledge: string): CharacterKnowledge['significance'] {
    const lower = knowledge.toLowerCase();

    if (lower.includes('secret') || lower.includes('truth about') || lower.includes('real reason')) {
      return 'story_changing';
    } else if (lower.includes('discovered') || lower.includes('realized') || lower.includes('found out')) {
      return 'major';
    } else if (lower.includes('learned') || lower.includes('heard')) {
      return 'moderate';
    }

    return 'minor';
  }

  private inferCapabilityImpact(physicalState: string): string[] {
    const impacts: string[] = [];
    const lower = physicalState.toLowerCase();

    if (lower.includes('leg') || lower.includes('ankle') || lower.includes('foot')) {
      impacts.push('cannot run', 'limited mobility');
    }
    if (lower.includes('arm') || lower.includes('hand') || lower.includes('shoulder')) {
      impacts.push('limited combat ability', 'cannot carry heavy objects');
    }
    if (lower.includes('head') || lower.includes('concussion')) {
      impacts.push('impaired judgment', 'possible confusion');
    }
    if (lower.includes('exhausted') || lower.includes('weak')) {
      impacts.push('reduced stamina', 'needs rest');
    }

    return impacts;
  }

  private generateGrowthSummary(arc: CharacterArc): string {
    const summaryParts: string[] = [];

    // Stage
    summaryParts.push(`Currently in ${arc.currentStage} stage (${arc.arcCompletionPercent}% complete).`);

    // Emotional range
    if (arc.emotionalRange.length > 3) {
      summaryParts.push(`Has experienced wide emotional range: ${arc.emotionalRange.slice(-4).join(', ')}.`);
    }

    // Key knowledge
    const majorKnowledge = arc.knowledge.filter(k => k.significance === 'major' || k.significance === 'story_changing');
    if (majorKnowledge.length > 0) {
      summaryParts.push(`Key knowledge: ${majorKnowledge.map(k => k.fact).join('; ')}.`);
    }

    // Decisions
    if (arc.keyDecisions.length > 0) {
      const lastDecision = arc.keyDecisions[arc.keyDecisions.length - 1];
      summaryParts.push(`Recent choice: ${lastDecision.decision}.`);
    }

    return summaryParts.join(' ');
  }

  private predictNextStep(arc: CharacterArc): string {
    switch (arc.currentStage) {
      case 'setup':
        return 'Will face initial challenge or disruption';
      case 'conflict':
        return 'Stakes will escalate, more pressure on character';
      case 'rising':
        return 'Approaching critical decision point';
      case 'crisis':
        return 'Must make transformative choice';
      case 'transformation':
        return 'Demonstrating changed perspective/abilities';
      case 'resolution':
        return 'Facing final challenge with new self';
      case 'new_normal':
        return 'Settling into changed life';
      default:
        return 'Character arc progressing';
    }
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get a character's current arc state
   */
  getCharacterArc(name: string): CharacterArc | undefined {
    return this.state.arcs.get(name.toLowerCase());
  }

  /**
   * Get protagonist's arc
   */
  getProtagonistArc(): CharacterArc | undefined {
    if (this.state.protagonistName) {
      return this.state.arcs.get(this.state.protagonistName.toLowerCase());
    }
    return undefined;
  }

  /**
   * Get all character arcs
   */
  getAllArcs(): CharacterArc[] {
    return Array.from(this.state.arcs.values());
  }

  /**
   * Get characters needing development
   */
  getUnderdevelopedCharacters(minChapters: number = 3): CharacterArc[] {
    return this.getAllArcs().filter(arc =>
      arc.emotionalHistory.length < minChapters &&
      arc.role !== 'minor'
    );
  }

  /**
   * Get relationship summary between two characters
   */
  getRelationshipSummary(char1: string, char2: string): string | null {
    const arc = this.state.arcs.get(char1.toLowerCase());
    if (!arc) return null;

    const rel = arc.relationships.get(char2.toLowerCase());
    if (!rel) return null;

    return `${char1} and ${char2}: ${rel.currentStatus} (trust: ${rel.trustLevel}/10). History: ${rel.historyHighlights.slice(-3).join('; ')}`;
  }

  /**
   * Get the full state
   */
  getState(): CharacterArcState {
    return this.state;
  }

  /**
   * Load state from storage
   */
  loadState(state: CharacterArcState): void {
    // Recreate Maps from plain objects
    this.state = {
      ...state,
      arcs: new Map(
        Array.isArray(state.arcs)
          ? state.arcs
          : Object.entries(state.arcs || {})
      ),
    };

    // Recreate relationship Maps within each arc
    for (const [key, arc] of this.state.arcs) {
      if (!(arc.relationships instanceof Map)) {
        arc.relationships = new Map(
          Array.isArray(arc.relationships)
            ? arc.relationships
            : Object.entries(arc.relationships || {})
        );
      }
    }
  }

  // ============================================================================
  // Decision Tracking
  // ============================================================================

  /**
   * Record a key decision a character made
   */
  recordDecision(
    characterName: string,
    decision: string,
    alternatives: string[],
    consequences: string[],
    chapterNumber: number
  ): void {
    const arc = this.state.arcs.get(characterName.toLowerCase());
    if (!arc) return;

    const revealsAboutCharacter = this.inferCharacterFromDecision(decision, alternatives);

    arc.keyDecisions.push({
      chapterNumber,
      decision,
      alternatives,
      consequences,
      revealsAboutCharacter,
    });

    // Update pattern of choice
    if (arc.keyDecisions.length >= 2) {
      arc.patternOfChoice = this.analyzeDecisionPattern(arc.keyDecisions);
    }

    this.state.arcs.set(characterName.toLowerCase(), arc);
  }

  private inferCharacterFromDecision(decision: string, alternatives: string[]): string {
    const lower = decision.toLowerCase();

    if (lower.includes('save') || lower.includes('protect') || lower.includes('help')) {
      return 'Prioritizes others over self';
    } else if (lower.includes('truth') || lower.includes('honest') || lower.includes('reveal')) {
      return 'Values honesty';
    } else if (lower.includes('fight') || lower.includes('confront') || lower.includes('challenge')) {
      return 'Confronts problems directly';
    } else if (lower.includes('run') || lower.includes('escape') || lower.includes('avoid')) {
      return 'Chooses self-preservation';
    } else if (lower.includes('sacrifice') || lower.includes('give up')) {
      return 'Capable of sacrifice';
    }

    return 'Made difficult choice';
  }

  private analyzeDecisionPattern(decisions: DecisionPoint[]): string {
    const reveals = decisions.map(d => d.revealsAboutCharacter);

    // Count patterns
    const patterns: Record<string, number> = {};
    for (const reveal of reveals) {
      patterns[reveal] = (patterns[reveal] || 0) + 1;
    }

    // Find most common
    let mostCommon = '';
    let maxCount = 0;
    for (const [pattern, count] of Object.entries(patterns)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = pattern;
      }
    }

    return mostCommon || 'Inconsistent decision pattern';
  }

  // ============================================================================
  // Generate Summary for Prompts
  // ============================================================================

  /**
   * Generate a character summary for injection into generation prompts
   */
  generateCharacterSummaryForPrompt(characterName: string): string {
    const arc = this.state.arcs.get(characterName.toLowerCase());
    if (!arc) return `${characterName}: No arc data available.`;

    let summary = `=== ${characterName.toUpperCase()} - ARC STATUS ===\n`;
    summary += `Role: ${arc.role}\n`;
    summary += `Arc Stage: ${arc.currentStage} (${arc.arcCompletionPercent}% complete)\n`;
    summary += `Current Emotional State: ${arc.currentEmotionalState.primaryEmotion} (${arc.currentEmotionalState.intensity})\n`;

    if (arc.characterGrowthSummary) {
      summary += `\nGrowth: ${arc.characterGrowthSummary}\n`;
    }

    if (arc.patternOfChoice !== 'Not yet established') {
      summary += `Decision Pattern: ${arc.patternOfChoice}\n`;
    }

    // Wounds
    const ongoingWounds = arc.woundsAndGrowth.filter(w => w.isOngoing);
    if (ongoingWounds.length > 0) {
      summary += `\nOngoing Conditions:\n`;
      for (const wound of ongoingWounds) {
        summary += `  - ${wound.description}`;
        if (wound.affectsCapabilities && wound.affectsCapabilities.length > 0) {
          summary += ` (affects: ${wound.affectsCapabilities.join(', ')})`;
        }
        summary += '\n';
      }
    }

    // Key knowledge
    const majorKnowledge = arc.knowledge.filter(k => k.significance === 'major' || k.significance === 'story_changing');
    if (majorKnowledge.length > 0) {
      summary += `\nKey Knowledge:\n`;
      for (const k of majorKnowledge.slice(-5)) {
        summary += `  - ${k.fact} (learned ch${k.learnedInChapter})\n`;
      }
    }

    summary += `\nPredicted Next Step: ${arc.predictedNextStep}\n`;

    // Add format-specific summary
    summary += this.generateFormatSpecificSummary(arc);

    return summary;
  }

  /**
   * Generate format-specific character summary
   */
  private generateFormatSpecificSummary(arc: CharacterArc): string {
    let summary = '';

    if (this.state.format === 'comic' && arc.comicVisuals) {
      summary += '\n--- VISUAL IDENTITY ---\n';
      summary += `Costume: ${arc.comicVisuals.costume}\n`;

      if (arc.comicVisuals.distinctiveFeatures.length > 0) {
        summary += `Distinctive Features: ${arc.comicVisuals.distinctiveFeatures.join(', ')}\n`;
      }

      if (arc.comicVisuals.colorPalette.length > 0) {
        summary += `Color Palette: ${arc.comicVisuals.colorPalette.join(', ')}\n`;
      }

      summary += `Panel Appearances: ${arc.comicVisuals.panelAppearances} panels\n`;
      summary += `Close-ups: ${arc.comicVisuals.closeUpCount}, Splash Panels: ${arc.comicVisuals.splashPanelCount}\n`;

      if (arc.comicVisuals.expressionRange.length > 0) {
        summary += `Expressions Shown: ${arc.comicVisuals.expressionRange.join(', ')}\n`;
      }

      if (arc.comicVisuals.costumeChanges.length > 0) {
        const lastChange = arc.comicVisuals.costumeChanges[arc.comicVisuals.costumeChanges.length - 1];
        summary += `Last Costume Change (pg${lastChange.chapter}): ${lastChange.description}\n`;
      }

      // Visual consistency notes
      if (arc.comicVisuals.visualSymbols.length > 0) {
        summary += `Associated Visual Motifs: ${arc.comicVisuals.visualSymbols.join(', ')}\n`;
      }

    } else if (this.state.format === 'screenplay' && arc.screenplayProfile) {
      const profile = arc.screenplayProfile;
      summary += '\n--- SCREEN PRESENCE ---\n';
      summary += `Screen Time: ~${profile.estimatedScreenTime.toFixed(1)} pages\n`;
      summary += `Scene Appearances: ${profile.sceneAppearances} (${profile.majorScenes} major)\n`;

      if (profile.dialogueStyle !== 'Not yet established') {
        summary += `Dialogue Style: ${profile.dialogueStyle}\n`;
      }

      if (profile.silenceRatio > 0.3) {
        summary += `Often Silent: ${(profile.silenceRatio * 100).toFixed(0)}% of scenes\n`;
      }

      if (profile.physicalMannerisms.length > 0) {
        summary += `Mannerisms: ${profile.physicalMannerisms.slice(-3).join(', ')}\n`;
      }

      if (profile.characterPairings.length > 0) {
        const topPairing = profile.characterPairings.sort((a, b) => b.sharedScenes - a.sharedScenes)[0];
        summary += `Most Scenes With: ${topPairing.character} (${topPairing.sharedScenes} scenes)\n`;
      }

      if (profile.locationAssociations.length > 0) {
        const topLoc = profile.locationAssociations.sort((a, b) => b.count - a.count)[0];
        summary += `Primary Location: ${topLoc.location} (${topLoc.count} scenes)\n`;
      }

    } else if (this.state.format === 'book' && arc.bookProse) {
      const prose = arc.bookProse;

      if (prose.povChapters.length > 0) {
        summary += '\n--- POV CHARACTER ---\n';
        summary += `POV Chapters: ${prose.povChapters.join(', ')}\n`;

        if (prose.internalMonologueStyle !== 'Not yet established') {
          summary += `Internal Voice: ${prose.internalMonologueStyle}\n`;
        }

        if (prose.sensoryFocus.length > 0) {
          summary += `Sensory Focus: ${prose.sensoryFocus.slice(-3).join(', ')}\n`;
        }
      }

      if (prose.associatedImagery.length > 0) {
        summary += `Associated Imagery: ${prose.associatedImagery.slice(-3).join(', ')}\n`;
      }

      if (prose.dramaticIrony.length > 0) {
        summary += `\nDramatic Irony (reader knows, character doesn't):\n`;
        for (const irony of prose.dramaticIrony.slice(-2)) {
          summary += `  - ${irony}\n`;
        }
      }
    }

    return summary;
  }

  /**
   * Generate comic-specific character sheet for artist reference
   */
  generateComicCharacterSheet(characterName: string): string {
    const arc = this.state.arcs.get(characterName.toLowerCase());
    if (!arc || !arc.comicVisuals) {
      return `${characterName}: No visual data available.`;
    }

    const visuals = arc.comicVisuals;
    let sheet = `=== ${characterName.toUpperCase()} - CHARACTER VISUAL SHEET ===\n\n`;

    sheet += `COSTUME: ${visuals.costume}\n`;
    sheet += `HAIR: ${visuals.hairStyle}\n`;
    sheet += `BODY TYPE: ${visuals.bodyType}\n\n`;

    if (visuals.distinctiveFeatures.length > 0) {
      sheet += `DISTINCTIVE FEATURES:\n`;
      for (const feature of visuals.distinctiveFeatures) {
        sheet += `  - ${feature}\n`;
      }
      sheet += '\n';
    }

    if (visuals.colorPalette.length > 0) {
      sheet += `COLOR PALETTE: ${visuals.colorPalette.join(', ')}\n\n`;
    }

    if (visuals.establishedPoses.length > 0) {
      sheet += `ESTABLISHED POSES:\n`;
      for (const pose of visuals.establishedPoses) {
        sheet += `  - ${pose}\n`;
      }
      sheet += '\n';
    }

    if (visuals.expressionRange.length > 0) {
      sheet += `EXPRESSIONS USED: ${visuals.expressionRange.join(', ')}\n`;
    }

    sheet += `\nVISUAL STATISTICS:\n`;
    sheet += `  Total Panel Appearances: ${visuals.panelAppearances}\n`;
    sheet += `  Close-up Panels: ${visuals.closeUpCount}\n`;
    sheet += `  Splash Panels: ${visuals.splashPanelCount}\n`;
    sheet += `  Typical Position: ${visuals.averagePanelPosition}\n`;

    return sheet;
  }

  /**
   * Generate screenplay character breakdown for production
   */
  generateScreenplayCharacterBreakdown(characterName: string): string {
    const arc = this.state.arcs.get(characterName.toLowerCase());
    if (!arc || !arc.screenplayProfile) {
      return `${characterName}: No screenplay data available.`;
    }

    const profile = arc.screenplayProfile;
    let breakdown = `=== ${characterName.toUpperCase()} - CHARACTER BREAKDOWN ===\n\n`;

    breakdown += `ROLE: ${arc.role.toUpperCase()}\n`;
    breakdown += `ESTIMATED SCREEN TIME: ${profile.estimatedScreenTime.toFixed(1)} pages\n`;
    breakdown += `TOTAL SCENES: ${profile.sceneAppearances} (${profile.majorScenes} major)\n\n`;

    if (profile.dialogueStyle !== 'Not yet established') {
      breakdown += `DIALOGUE STYLE: ${profile.dialogueStyle}\n`;
    }

    if (profile.catchPhrases.length > 0) {
      breakdown += `CATCHPHRASES: "${profile.catchPhrases.join('", "')}"\n`;
    }

    if (profile.speechPatterns.length > 0) {
      breakdown += `SPEECH PATTERNS: ${profile.speechPatterns.join(', ')}\n`;
    }

    breakdown += '\n--- PHYSICAL CHARACTERIZATION ---\n';
    if (profile.physicalMannerisms.length > 0) {
      breakdown += `MANNERISMS:\n`;
      for (const mannerism of profile.physicalMannerisms) {
        breakdown += `  - ${mannerism}\n`;
      }
    }

    if (profile.signatureActions.length > 0) {
      breakdown += `SIGNATURE ACTIONS:\n`;
      for (const action of profile.signatureActions) {
        breakdown += `  - ${action}\n`;
      }
    }

    breakdown += `TYPICAL ENTRANCE: ${profile.entranceStyle}\n`;
    breakdown += `TYPICAL EXIT: ${profile.exitStyle}\n`;

    breakdown += '\n--- SCENE ANALYSIS ---\n';
    if (profile.sceneTypes.length > 0) {
      breakdown += `SCENE TYPES:\n`;
      for (const type of profile.sceneTypes.sort((a, b) => b.count - a.count)) {
        breakdown += `  - ${type.type}: ${type.count} scenes\n`;
      }
    }

    if (profile.characterPairings.length > 0) {
      breakdown += `\nMOST SCENES WITH:\n`;
      for (const pairing of profile.characterPairings.sort((a, b) => b.sharedScenes - a.sharedScenes).slice(0, 3)) {
        breakdown += `  - ${pairing.character}: ${pairing.sharedScenes} scenes\n`;
      }
    }

    if (profile.locationAssociations.length > 0) {
      breakdown += `\nPRIMARY LOCATIONS:\n`;
      for (const loc of profile.locationAssociations.sort((a, b) => b.count - a.count).slice(0, 3)) {
        breakdown += `  - ${loc.location}: ${loc.count} scenes\n`;
      }
    }

    return breakdown;
  }

  /**
   * Generate summary for all main characters
   */
  generateAllCharactersSummary(): string {
    const mainCharacters = this.getAllArcs().filter(
      arc => arc.role === 'protagonist' || arc.role === 'antagonist' || arc.role === 'supporting'
    );

    return mainCharacters
      .map(arc => this.generateCharacterSummaryForPrompt(arc.characterName))
      .join('\n\n');
  }
}

// ============================================================================
// Types for Updates
// ============================================================================

export interface CharacterArcUpdate {
  characterName: string;
  chapterNumber: number;
  changes: string[];
  newStage: ArcStage;
  emotionalState: string;
  arcProgress: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCharacterArcTracker(
  bookId: string,
  format: ContentFormat = 'book'
): CharacterArcTracker {
  return new CharacterArcTracker(bookId, format);
}
