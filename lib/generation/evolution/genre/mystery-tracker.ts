/**
 * Mystery/Thriller Tracking
 *
 * Tracks mystery elements using fair-play mystery rules:
 * 1. All clues must be presented to the reader
 * 2. Red herrings must be distinguishable in retrospect
 * 3. The solution must be logically deducible
 */

import {
  ClueType,
  MysteryClue,
  Suspect,
  MysteryReveal,
  InvestigationThread,
  MysteryTrackingState,
  GenreExtraction,
} from './types';

/**
 * Create a new mystery tracker instance
 */
export function createMysteryTracker(bookId: string, centralMystery: string): MysteryTracker {
  return new MysteryTracker(bookId, centralMystery);
}

export class MysteryTracker {
  private bookId: string;
  private state: MysteryTrackingState;
  private clueIdCounter: number = 0;
  private threadIdCounter: number = 0;

  constructor(bookId: string, centralMystery: string) {
    this.bookId = bookId;
    this.state = {
      centralMystery,
      clues: [],
      suspects: [],
      reveals: [],
      investigationThreads: [],
      redHerringCount: 0,
      solutionRevealed: false,
      fairPlayScore: 100, // Start at 100, deduct for violations
      tensionLevel: 3,
    };
  }

  /**
   * Add a clue to the mystery
   */
  addClue(
    clue: Omit<MysteryClue, 'id'>,
    chapter: number
  ): MysteryClue {
    const newClue: MysteryClue = {
      ...clue,
      id: `clue_${++this.clueIdCounter}`,
      introducedChapter: chapter,
    };

    this.state.clues.push(newClue);

    if (clue.isRedHerring) {
      this.state.redHerringCount++;
    }

    // Update tension based on clue significance
    if (clue.significance === 'crucial') {
      this.state.tensionLevel = Math.min(10, this.state.tensionLevel + 2);
    } else if (clue.significance === 'major') {
      this.state.tensionLevel = Math.min(10, this.state.tensionLevel + 1);
    }

    return newClue;
  }

  /**
   * Add a suspect
   */
  addSuspect(suspect: Omit<Suspect, 'introducedChapter'>, chapter: number): void {
    // Check if suspect already exists
    const existing = this.state.suspects.find(s => s.name === suspect.name);
    if (existing) {
      // Update existing suspect
      Object.assign(existing, suspect);
      return;
    }

    this.state.suspects.push({
      ...suspect,
      introducedChapter: chapter,
    });
  }

  /**
   * Update suspect information
   */
  updateSuspect(name: string, updates: Partial<Suspect>): void {
    const suspect = this.state.suspects.find(s => s.name === name);
    if (suspect) {
      Object.assign(suspect, updates);
    }
  }

  /**
   * Eliminate a suspect
   */
  eliminateSuspect(name: string, chapter: number, reason: string): void {
    const suspect = this.state.suspects.find(s => s.name === name);
    if (suspect) {
      suspect.suspicionLevel = 0;
      suspect.cluesExonerating.push(reason);

      this.state.reveals.push({
        chapter,
        type: 'suspect_eliminated',
        description: `${name} eliminated as suspect: ${reason}`,
        changesInvestigation: true,
        surpriseFactor: 2,
      });
    }
  }

  /**
   * Add an investigation thread
   */
  addThread(
    description: string,
    leadingTo: string,
    investigator: string
  ): InvestigationThread {
    const thread: InvestigationThread = {
      id: `thread_${++this.threadIdCounter}`,
      description,
      status: 'active',
      relatedClues: [],
      leadingTo,
      investigator,
    };

    this.state.investigationThreads.push(thread);
    return thread;
  }

  /**
   * Link a clue to a thread
   */
  linkClueToThread(clueId: string, threadId: string): void {
    const thread = this.state.investigationThreads.find(t => t.id === threadId);
    if (thread && !thread.relatedClues.includes(clueId)) {
      thread.relatedClues.push(clueId);
    }
  }

  /**
   * Update thread status
   */
  updateThreadStatus(threadId: string, status: InvestigationThread['status']): void {
    const thread = this.state.investigationThreads.find(t => t.id === threadId);
    if (thread) {
      thread.status = status;
    }
  }

  /**
   * Record a reveal/revelation
   */
  addReveal(reveal: Omit<MysteryReveal, 'chapter'>, chapter: number): void {
    this.state.reveals.push({
      ...reveal,
      chapter,
    });

    // Update tension
    if (reveal.type === 'twist') {
      this.state.tensionLevel = Math.min(10, this.state.tensionLevel + reveal.surpriseFactor);
    } else if (reveal.type === 'solution') {
      this.state.solutionRevealed = true;
    }
  }

  /**
   * Set a ticking clock
   */
  setTickingClock(deadline: string, chaptersRemaining: number): void {
    this.state.tickingClock = { deadline, chaptersRemaining };
    this.state.tensionLevel = Math.min(10, this.state.tensionLevel + 2);
  }

  /**
   * Decrement ticking clock
   */
  tickClock(): void {
    if (this.state.tickingClock) {
      this.state.tickingClock.chaptersRemaining--;
      if (this.state.tickingClock.chaptersRemaining <= 3) {
        this.state.tensionLevel = Math.min(10, this.state.tensionLevel + 1);
      }
    }
  }

  /**
   * Process chapter extraction
   */
  processChapter(
    chapterNumber: number,
    extraction: GenreExtraction
  ): {
    cluesAdded: MysteryClue[];
    suspectChanges: string[];
    reveals: MysteryReveal[];
    fairPlayWarnings: string[];
  } {
    const result = {
      cluesAdded: [] as MysteryClue[],
      suspectChanges: [] as string[],
      reveals: [] as MysteryReveal[],
      fairPlayWarnings: [] as string[],
    };

    if (!extraction.mystery) return result;

    // Process clues
    for (const clueData of extraction.mystery.cluesFound) {
      const clue = this.addClue(
        {
          ...clueData,
          id: '', // Will be assigned by addClue
          introducedChapter: chapterNumber,
          wasNoticed: true,
          connectionToOtherClues: [],
        },
        chapterNumber
      );
      result.cluesAdded.push(clue);
    }

    // Process suspect changes
    for (const change of extraction.mystery.suspectChanges) {
      result.suspectChanges.push(`${change.suspect}: ${change.change}`);

      switch (change.change) {
        case 'added':
          this.addSuspect(
            {
              name: change.suspect,
              motive: null,
              opportunity: null,
              means: null,
              alibi: null,
              alibiStrength: 'none',
              suspicionLevel: 5,
              cluesPointingTo: [],
              cluesExonerating: [],
              isGuilty: null,
            },
            chapterNumber
          );
          break;
        case 'eliminated':
          this.eliminateSuspect(change.suspect, chapterNumber, 'Cleared by evidence');
          break;
        case 'implicated':
          this.updateSuspect(change.suspect, {
            suspicionLevel: Math.min(10, (this.state.suspects.find(s => s.name === change.suspect)?.suspicionLevel || 5) + 2),
          });
          break;
      }
    }

    // Process revelations
    for (const reveal of extraction.mystery.revelations) {
      const fullReveal: MysteryReveal = {
        ...reveal,
        chapter: chapterNumber,
        changesInvestigation: reveal.changesInvestigation ?? true,
      };
      this.state.reveals.push(fullReveal);
      result.reveals.push(fullReveal);
    }

    // Check fair play
    result.fairPlayWarnings = this.checkFairPlay(chapterNumber);

    // Tick the clock if active
    this.tickClock();

    return result;
  }

  /**
   * Check fair play rules and return warnings
   */
  checkFairPlay(currentChapter: number): string[] {
    const warnings: string[] = [];

    // Check if solution is being revealed without sufficient clues
    if (this.state.solutionRevealed) {
      const crucialClues = this.state.clues.filter(c => c.significance === 'crucial' && !c.isRedHerring);
      if (crucialClues.length < 3) {
        warnings.push('FAIR PLAY VIOLATION: Solution revealed with fewer than 3 crucial clues planted.');
        this.state.fairPlayScore -= 20;
      }

      // Check that the guilty party was introduced early enough
      const guiltySuspect = this.state.suspects.find(s => s.isGuilty);
      if (guiltySuspect && guiltySuspect.introducedChapter > currentChapter - 3) {
        warnings.push(`FAIR PLAY VIOLATION: Guilty party (${guiltySuspect.name}) introduced too late.`);
        this.state.fairPlayScore -= 15;
      }
    }

    // Check red herring balance (should be 20-40% of clues)
    const redHerringRatio = this.state.redHerringCount / Math.max(1, this.state.clues.length);
    if (redHerringRatio > 0.5) {
      warnings.push('WARNING: Too many red herrings. Reader may feel cheated.');
    } else if (redHerringRatio < 0.1 && this.state.clues.length > 5) {
      warnings.push('WARNING: Few red herrings. Mystery may be too easy to solve.');
    }

    // Check for orphaned threads
    const orphanedThreads = this.state.investigationThreads.filter(
      t => t.status === 'active' && t.relatedClues.length === 0
    );
    for (const thread of orphanedThreads) {
      warnings.push(`WARNING: Investigation thread "${thread.description}" has no connected clues.`);
    }

    return warnings;
  }

  /**
   * Validate a proposed reveal
   */
  validateReveal(type: MysteryReveal['type'], description: string): { valid: boolean; reason?: string } {
    if (type === 'solution') {
      // Check clue count
      const validClues = this.state.clues.filter(c => !c.isRedHerring);
      if (validClues.length < 5) {
        return {
          valid: false,
          reason: `Cannot reveal solution with only ${validClues.length} genuine clues. Need at least 5 for fair play.`,
        };
      }

      // Check if guilty party is established
      const suspects = this.state.suspects.filter(s => s.suspicionLevel > 0);
      if (suspects.length === 0) {
        return {
          valid: false,
          reason: 'No viable suspects established. Cannot reveal solution.',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Mark a suspect as guilty (for the solution)
   */
  revealGuilty(name: string, chapter: number): { valid: boolean; reason?: string } {
    const suspect = this.state.suspects.find(s => s.name === name);

    if (!suspect) {
      return {
        valid: false,
        reason: `${name} was never introduced as a suspect.`,
      };
    }

    // Check that suspect has means, motive, and opportunity
    const missing = [];
    if (!suspect.motive) missing.push('motive');
    if (!suspect.means) missing.push('means');
    if (!suspect.opportunity) missing.push('opportunity');

    if (missing.length > 0) {
      return {
        valid: false,
        reason: `${name} is missing: ${missing.join(', ')}. Establish these before revealing guilt.`,
      };
    }

    // Check that clues point to them
    if (suspect.cluesPointingTo.length < 2) {
      return {
        valid: false,
        reason: `Only ${suspect.cluesPointingTo.length} clues point to ${name}. Need at least 2 for fair play.`,
      };
    }

    suspect.isGuilty = true;
    this.state.solutionRevealed = true;

    this.state.reveals.push({
      chapter,
      type: 'solution',
      description: `${name} revealed as guilty`,
      changesInvestigation: true,
      surpriseFactor: 5,
    });

    return { valid: true };
  }

  /**
   * Get the current state
   */
  getState(): MysteryTrackingState {
    return this.state;
  }

  /**
   * Generate a mystery summary for context injection
   */
  generateSummary(): string {
    let summary = '=== MYSTERY STATE ===\n';
    summary += `Central Question: ${this.state.centralMystery}\n`;
    summary += `Tension Level: ${this.state.tensionLevel}/10\n`;
    summary += `Fair Play Score: ${this.state.fairPlayScore}/100\n\n`;

    // Suspects
    summary += 'SUSPECTS:\n';
    for (const suspect of this.state.suspects.filter(s => s.suspicionLevel > 0)) {
      summary += `  ${suspect.name}: Suspicion ${suspect.suspicionLevel}/10\n`;
      if (suspect.motive) summary += `    Motive: ${suspect.motive}\n`;
      if (suspect.alibi) summary += `    Alibi: ${suspect.alibi} (${suspect.alibiStrength})\n`;
    }

    // Active clues
    const unconnectedClues = this.state.clues.filter(c => c.connectionToOtherClues.length === 0);
    if (unconnectedClues.length > 0) {
      summary += '\nUNCONNECTED CLUES (need follow-up):\n';
      for (const clue of unconnectedClues.slice(-5)) {
        summary += `  - ${clue.description} (${clue.clueType})\n`;
      }
    }

    // Active threads
    const activeThreads = this.state.investigationThreads.filter(t => t.status === 'active');
    if (activeThreads.length > 0) {
      summary += '\nACTIVE INVESTIGATION THREADS:\n';
      for (const thread of activeThreads) {
        summary += `  - ${thread.description} → ${thread.leadingTo}\n`;
      }
    }

    // Ticking clock
    if (this.state.tickingClock) {
      summary += `\nTICKING CLOCK: ${this.state.tickingClock.deadline}`;
      summary += ` (${this.state.tickingClock.chaptersRemaining} chapters remaining)\n`;
    }

    return summary;
  }

  /**
   * Generate suggestions for next chapter
   */
  generateSuggestions(currentChapter: number): string[] {
    const suggestions: string[] = [];

    // Check clue density
    const recentClues = this.state.clues.filter(c => c.introducedChapter >= currentChapter - 3);
    if (recentClues.length === 0) {
      suggestions.push('No clues in last 3 chapters. Consider planting a new clue.');
    }

    // Check for suspects needing development
    for (const suspect of this.state.suspects) {
      if (suspect.suspicionLevel > 3 && !suspect.motive) {
        suggestions.push(`${suspect.name} needs motive established.`);
      }
      if (suspect.suspicionLevel > 5 && !suspect.alibi) {
        suggestions.push(`${suspect.name} needs alibi addressed.`);
      }
    }

    // Check tension curve
    if (this.state.tensionLevel < 5 && currentChapter > 5) {
      suggestions.push('Tension is low. Consider a major revelation or ticking clock.');
    }

    // Check investigation progress
    const solvedThreads = this.state.investigationThreads.filter(t => t.status === 'solved');
    const activeThreads = this.state.investigationThreads.filter(t => t.status === 'active');
    if (activeThreads.length > 3) {
      suggestions.push('Many open threads. Consider resolving one before adding more.');
    }

    return suggestions;
  }
}
