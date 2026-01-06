/**
 * Romance Arc Tracking
 *
 * Tracks the progression of romantic relationships through standard beats:
 * 1. Meet-Cute / First Encounter
 * 2. Attraction / Awareness
 * 3. Obstacles / Tension
 * 4. Near-Miss / Almost-Kiss
 * 5. Escalation / First Kiss
 * 6. Complication / Black Moment
 * 7. Grand Gesture / Declaration
 * 8. Resolution / HEA/HFN
 */

import {
  RomanceStage,
  RomanceChemistry,
  RomanceBeat,
  RomanceObstacle,
  RomanceArc,
  RomanceTrackingState,
  GenreExtraction,
} from './types';

// Stage progression order for validation
const STAGE_ORDER: RomanceStage[] = [
  'strangers',
  'first_encounter',
  'awareness',
  'resistance',
  'growing_tension',
  'near_miss',
  'first_intimacy',
  'complications',
  'black_moment',
  'grand_gesture',
  'resolution',
  'established',
];

/**
 * Create a new romance tracker instance
 */
export function createRomanceTracker(bookId: string): RomanceTracker {
  return new RomanceTracker(bookId);
}

export class RomanceTracker {
  private bookId: string;
  private state: RomanceTrackingState;

  constructor(bookId: string) {
    this.bookId = bookId;
    this.state = {
      arcs: [],
      unpairedCharacters: [],
      romanticMoments: [],
      chemistryScore: {},
    };
  }

  /**
   * Initialize a romantic pairing
   */
  initializeArc(
    character1: string,
    character2: string,
    options: {
      tensionType?: RomanceChemistry['tensionType'];
      dynamicType?: RomanceChemistry['dynamicType'];
      heatLevel?: number;
      isPrimary?: boolean;
    } = {}
  ): RomanceArc {
    const pairId = this.getPairId(character1, character2);

    // Check if arc already exists
    const existing = this.state.arcs.find(a => a.id === pairId);
    if (existing) return existing;

    const arc: RomanceArc = {
      id: pairId,
      couple: {
        pairName: `${character1} & ${character2}`,
        character1,
        character2,
        chemistryLevel: 1,
        tensionType: options.tensionType || 'mixed',
        dynamicType: options.dynamicType || 'equals',
      },
      currentStage: 'strangers',
      stageHistory: [{ stage: 'strangers', chapter: 0 }],
      beats: [],
      obstacles: [],
      heatLevel: options.heatLevel || 3,
      isPrimary: options.isPrimary ?? true,
      intimacyMilestones: {
        firstTouch: null,
        firstKiss: null,
        loveDeclaration: null,
        physicalIntimacy: null,
      },
    };

    this.state.arcs.push(arc);

    // Remove from unpaired
    this.state.unpairedCharacters = this.state.unpairedCharacters.filter(
      c => c !== character1 && c !== character2
    );

    return arc;
  }

  /**
   * Add an unpaired character (potential romantic interest)
   */
  addUnpairedCharacter(character: string): void {
    if (!this.state.unpairedCharacters.includes(character)) {
      this.state.unpairedCharacters.push(character);
    }
  }

  /**
   * Process a chapter extraction for romance elements
   */
  processChapter(
    chapterNumber: number,
    extraction: GenreExtraction
  ): {
    arcsUpdated: string[];
    newBeats: RomanceBeat[];
    stageChanges: { arc: string; from: RomanceStage; to: RomanceStage }[];
    suggestions: string[];
  } {
    const result = {
      arcsUpdated: [] as string[],
      newBeats: [] as RomanceBeat[],
      stageChanges: [] as { arc: string; from: RomanceStage; to: RomanceStage }[],
      suggestions: [] as string[],
    };

    if (!extraction.romance) return result;

    // Process romantic moments
    for (const beat of extraction.romance.romanticMoments) {
      const processedBeat = { ...beat, chapter: chapterNumber };
      this.state.romanticMoments.push(processedBeat);
      result.newBeats.push(processedBeat);

      // Find or create arc for this pair
      if (beat.characters.length >= 2) {
        const [char1, char2] = beat.characters;
        let arc = this.getArc(char1, char2);

        if (!arc) {
          arc = this.initializeArc(char1, char2);
        }

        arc.beats.push(processedBeat);
        result.arcsUpdated.push(arc.id);

        // Update chemistry
        if (beat.isEscalation) {
          arc.couple.chemistryLevel = Math.min(10, arc.couple.chemistryLevel + 0.5);
        }

        // Update milestones
        this.updateMilestones(arc, beat, chapterNumber);

        // Check for stage progression
        const newStage = this.determineStage(arc);
        if (newStage !== arc.currentStage) {
          result.stageChanges.push({
            arc: arc.id,
            from: arc.currentStage,
            to: newStage,
          });
          arc.stageHistory.push({ stage: newStage, chapter: chapterNumber });
          arc.currentStage = newStage;
        }
      }
    }

    // Process chemistry observations
    for (const obs of extraction.romance.chemistryObservations) {
      const [char1, char2] = obs.pair.split(' & ');
      const pairId = this.getPairId(char1, char2);
      this.state.chemistryScore[pairId] = (this.state.chemistryScore[pairId] || 0) + 1;
    }

    // Process explicit stage progression
    if (extraction.romance.stageProgression) {
      const { from, to } = extraction.romance.stageProgression;
      // Find arc that matches this progression
      const matchingArc = this.state.arcs.find(a => a.currentStage === from);
      if (matchingArc && !result.stageChanges.some(sc => sc.arc === matchingArc.id)) {
        result.stageChanges.push({
          arc: matchingArc.id,
          from,
          to,
        });
        matchingArc.stageHistory.push({ stage: to, chapter: chapterNumber });
        matchingArc.currentStage = to;
      }
    }

    // Generate suggestions
    result.suggestions = this.generateSuggestions(chapterNumber);

    return result;
  }

  /**
   * Add an obstacle to a romance arc
   */
  addObstacle(
    character1: string,
    character2: string,
    obstacle: Omit<RomanceObstacle, 'introducedChapter'>,
    chapter: number
  ): void {
    const arc = this.getArc(character1, character2);
    if (arc) {
      arc.obstacles.push({
        ...obstacle,
        introducedChapter: chapter,
      });
    }
  }

  /**
   * Resolve an obstacle
   */
  resolveObstacle(
    character1: string,
    character2: string,
    obstacleDescription: string,
    chapter: number
  ): void {
    const arc = this.getArc(character1, character2);
    if (arc) {
      const obstacle = arc.obstacles.find(o =>
        o.description.toLowerCase().includes(obstacleDescription.toLowerCase())
      );
      if (obstacle) {
        obstacle.resolvedChapter = chapter;
      }
    }
  }

  /**
   * Get the current state
   */
  getState(): RomanceTrackingState {
    return this.state;
  }

  /**
   * Get a specific arc
   */
  getArc(character1: string, character2: string): RomanceArc | undefined {
    const pairId = this.getPairId(character1, character2);
    return this.state.arcs.find(a => a.id === pairId);
  }

  /**
   * Generate a romance summary for context injection
   */
  generateSummary(): string {
    if (this.state.arcs.length === 0) {
      return '';
    }

    let summary = '=== ROMANCE ARCS ===\n';

    for (const arc of this.state.arcs) {
      summary += `\n${arc.couple.pairName}:\n`;
      summary += `  Stage: ${arc.currentStage.replace(/_/g, ' ')}\n`;
      summary += `  Chemistry: ${arc.couple.chemistryLevel}/10 (${arc.couple.tensionType})\n`;
      summary += `  Dynamic: ${arc.couple.dynamicType.replace(/_/g, ' ')}\n`;

      // Milestones
      const milestones = [];
      if (arc.intimacyMilestones.firstTouch) milestones.push('first touch');
      if (arc.intimacyMilestones.firstKiss) milestones.push('first kiss');
      if (arc.intimacyMilestones.loveDeclaration) milestones.push('love declared');
      if (arc.intimacyMilestones.physicalIntimacy) milestones.push('intimate');
      if (milestones.length > 0) {
        summary += `  Milestones: ${milestones.join(', ')}\n`;
      }

      // Active obstacles
      const activeObstacles = arc.obstacles.filter(o => !o.resolvedChapter);
      if (activeObstacles.length > 0) {
        summary += `  Obstacles: ${activeObstacles.map(o => o.description).join('; ')}\n`;
      }

      // Recent beats
      const recentBeats = arc.beats.slice(-3);
      if (recentBeats.length > 0) {
        summary += `  Recent: ${recentBeats.map(b => b.type).join(' → ')}\n`;
      }
    }

    return summary;
  }

  /**
   * Validate a proposed romance progression
   */
  validateProgression(
    character1: string,
    character2: string,
    proposedStage: RomanceStage
  ): { valid: boolean; reason?: string } {
    const arc = this.getArc(character1, character2);
    if (!arc) {
      return { valid: true }; // New arc, any starting point is valid
    }

    const currentIndex = STAGE_ORDER.indexOf(arc.currentStage);
    const proposedIndex = STAGE_ORDER.indexOf(proposedStage);

    // Allow moving forward by max 1 stage
    if (proposedIndex > currentIndex + 1) {
      return {
        valid: false,
        reason: `Romance cannot jump from "${arc.currentStage}" to "${proposedStage}". Progress gradually.`,
      };
    }

    // Allow moving backward (complications, black_moment can reset)
    if (proposedStage === 'complications' || proposedStage === 'black_moment') {
      return { valid: true };
    }

    // Check stage-specific requirements
    if (proposedStage === 'first_intimacy' && !arc.intimacyMilestones.firstTouch) {
      return {
        valid: false,
        reason: 'First intimacy requires prior physical contact (touch, nearness).',
      };
    }

    if (proposedStage === 'resolution' && !arc.intimacyMilestones.loveDeclaration) {
      return {
        valid: false,
        reason: 'Resolution requires love to be declared first.',
      };
    }

    return { valid: true };
  }

  // Private helpers

  private getPairId(char1: string, char2: string): string {
    return [char1, char2].sort().join('_');
  }

  private updateMilestones(arc: RomanceArc, beat: RomanceBeat, chapter: number): void {
    if (beat.type === 'touch' && !arc.intimacyMilestones.firstTouch) {
      arc.intimacyMilestones.firstTouch = chapter;
    }
    if (beat.type === 'kiss' && !arc.intimacyMilestones.firstKiss) {
      arc.intimacyMilestones.firstKiss = chapter;
    }
    if (beat.type === 'confession' && !arc.intimacyMilestones.loveDeclaration) {
      arc.intimacyMilestones.loveDeclaration = chapter;
    }
    if (beat.type === 'intimacy' && !arc.intimacyMilestones.physicalIntimacy) {
      arc.intimacyMilestones.physicalIntimacy = chapter;
    }
  }

  private determineStage(arc: RomanceArc): RomanceStage {
    const beats = arc.beats;
    if (beats.length === 0) return arc.currentStage;

    const recentBeats = beats.slice(-5);
    const hasKiss = recentBeats.some(b => b.type === 'kiss');
    const hasIntimacy = recentBeats.some(b => b.type === 'intimacy');
    const hasConfession = recentBeats.some(b => b.type === 'confession');
    const hasSeparation = recentBeats.some(b => b.type === 'separation');

    // Check for black moment (separation after intimacy)
    if (hasSeparation && arc.intimacyMilestones.firstKiss) {
      return 'black_moment';
    }

    // Check for resolution (confession + reunion after black moment)
    if (arc.currentStage === 'black_moment' && hasConfession) {
      return 'grand_gesture';
    }

    // Check for first intimacy
    if (hasKiss && !arc.intimacyMilestones.firstKiss) {
      return 'first_intimacy';
    }

    // Check for near miss
    const nearMissTypes = ['glance', 'touch', 'argument'];
    const nearMissCount = recentBeats.filter(b => nearMissTypes.includes(b.type)).length;
    if (nearMissCount >= 2 && arc.currentStage === 'growing_tension') {
      return 'near_miss';
    }

    // Progressive stages based on chemistry
    if (arc.couple.chemistryLevel >= 7 && STAGE_ORDER.indexOf(arc.currentStage) < STAGE_ORDER.indexOf('growing_tension')) {
      return 'growing_tension';
    }
    if (arc.couple.chemistryLevel >= 4 && STAGE_ORDER.indexOf(arc.currentStage) < STAGE_ORDER.indexOf('awareness')) {
      return 'awareness';
    }
    if (arc.couple.chemistryLevel >= 2 && arc.currentStage === 'strangers') {
      return 'first_encounter';
    }

    return arc.currentStage;
  }

  private generateSuggestions(currentChapter: number): string[] {
    const suggestions: string[] = [];

    for (const arc of this.state.arcs) {
      const stageIndex = STAGE_ORDER.indexOf(arc.currentStage);

      // Suggest next beat based on current stage
      switch (arc.currentStage) {
        case 'strangers':
          suggestions.push(`${arc.couple.pairName}: Ready for meet-cute or first encounter`);
          break;
        case 'awareness':
          suggestions.push(`${arc.couple.pairName}: Build tension through proximity and stolen glances`);
          break;
        case 'growing_tension':
          suggestions.push(`${arc.couple.pairName}: Time for a near-miss moment (almost-kiss, interrupted intimacy)`);
          break;
        case 'near_miss':
          suggestions.push(`${arc.couple.pairName}: Consider the first kiss or explicit acknowledgment of attraction`);
          break;
        case 'first_intimacy':
          suggestions.push(`${arc.couple.pairName}: Introduce a complication or obstacle to test the relationship`);
          break;
        case 'complications':
          suggestions.push(`${arc.couple.pairName}: Build toward black moment - maximum tension before resolution`);
          break;
        case 'black_moment':
          suggestions.push(`${arc.couple.pairName}: Ready for grand gesture or reconciliation`);
          break;
      }

      // Check for stalled arcs
      const lastBeatChapter = arc.beats[arc.beats.length - 1]?.chapter || 0;
      if (currentChapter - lastBeatChapter > 3) {
        suggestions.push(`WARNING: ${arc.couple.pairName} romance has stalled for ${currentChapter - lastBeatChapter} chapters`);
      }
    }

    return suggestions;
  }
}
