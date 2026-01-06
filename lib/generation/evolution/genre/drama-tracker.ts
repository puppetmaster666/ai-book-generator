/**
 * Drama Element Tracking
 *
 * Tracks high-stakes dramatic elements:
 * - Confrontations
 * - Secrets and revelations
 * - Betrayals
 * - Affairs
 * - Deaths
 * - Power dynamics
 */

import {
  DramaticMomentType,
  Confrontation,
  Secret,
  Affair,
  CharacterDeath,
  PowerDynamic,
  DramaTrackingState,
  GenreExtraction,
} from './types';

/**
 * Create a new drama tracker instance
 */
export function createDramaTracker(bookId: string): DramaTracker {
  return new DramaTracker(bookId);
}

export class DramaTracker {
  private bookId: string;
  private state: DramaTrackingState;
  private idCounter: number = 0;

  constructor(bookId: string) {
    this.bookId = bookId;
    this.state = {
      confrontations: [],
      secrets: [],
      affairs: [],
      deaths: [],
      powerDynamics: [],
      dramaticMoments: [],
      tensionPoints: [],
      upcomingPayoffs: [],
    };
  }

  /**
   * Register a secret
   */
  registerSecret(
    secret: Omit<Secret, 'id' | 'introducedChapter'>,
    chapter: number
  ): Secret {
    const newSecret: Secret = {
      ...secret,
      id: `secret_${++this.idCounter}`,
      introducedChapter: chapter,
    };

    this.state.secrets.push(newSecret);

    // Add tension point
    this.state.tensionPoints.push(`Secret: "${secret.description}" (known by: ${secret.heldBy.join(', ')})`);

    return newSecret;
  }

  /**
   * Reveal a secret
   */
  revealSecret(
    secretId: string,
    chapter: number,
    revealedTo: string[],
    method: Secret['discoveryMethod']
  ): { revealed: boolean; drama: number } {
    const secret = this.state.secrets.find(s => s.id === secretId);
    if (!secret || secret.revealedChapter) {
      return { revealed: false, drama: 0 };
    }

    secret.revealedChapter = chapter;
    secret.revealedTo = revealedTo;
    secret.discoveryMethod = method;

    // Calculate drama impact
    const severityScore = {
      'embarrassing': 2,
      'damaging': 5,
      'devastating': 8,
      'life_altering': 10,
    };
    const drama = severityScore[secret.severity];

    // Add dramatic moment
    this.state.dramaticMoments.push({
      chapter,
      type: 'revelation',
      description: `Secret revealed: "${secret.description}"`,
      impact: drama,
    });

    // Remove from tension points
    this.state.tensionPoints = this.state.tensionPoints.filter(
      tp => !tp.includes(secret.description)
    );

    return { revealed: true, drama };
  }

  /**
   * Find a secret by description
   */
  findSecret(description: string): Secret | undefined {
    const searchLower = description.toLowerCase();
    return this.state.secrets.find(s =>
      s.description.toLowerCase().includes(searchLower) ||
      searchLower.includes(s.description.toLowerCase())
    );
  }

  /**
   * Get unrevealed secrets
   */
  getUnrevealedSecrets(): Secret[] {
    return this.state.secrets.filter(s => !s.revealedChapter);
  }

  /**
   * Register a confrontation
   */
  addConfrontation(
    confrontation: Omit<Confrontation, 'id' | 'chapter'>,
    chapter: number
  ): Confrontation {
    const newConfrontation: Confrontation = {
      ...confrontation,
      id: `conf_${++this.idCounter}`,
      chapter,
    };

    this.state.confrontations.push(newConfrontation);

    // Add dramatic moment
    this.state.dramaticMoments.push({
      chapter,
      type: 'confrontation',
      description: `${confrontation.participants.join(' vs ')}: ${confrontation.subject}`,
      impact: confrontation.escalationLevel * 2,
    });

    // If unresolved, add to tension points
    if (confrontation.unresolved) {
      this.state.tensionPoints.push(
        `Unresolved conflict: ${confrontation.participants.join(' vs ')} over ${confrontation.subject}`
      );
    }

    return newConfrontation;
  }

  /**
   * Resolve a confrontation
   */
  resolveConfrontation(confrontationId: string, winner?: string): void {
    const conf = this.state.confrontations.find(c => c.id === confrontationId);
    if (conf) {
      conf.unresolved = false;
      if (winner) conf.winner = winner;

      // Remove from tension points
      this.state.tensionPoints = this.state.tensionPoints.filter(
        tp => !tp.includes(conf.participants.join(' vs '))
      );
    }
  }

  /**
   * Register an affair
   */
  registerAffair(
    affair: Omit<Affair, 'id' | 'startChapter'>,
    chapter: number
  ): Affair {
    const newAffair: Affair = {
      ...affair,
      id: `affair_${++this.idCounter}`,
      startChapter: chapter,
      status: 'ongoing',
      consequences: [],
    };

    this.state.affairs.push(newAffair);

    // Add as secret
    this.registerSecret(
      {
        description: `Affair between ${affair.participants.join(' and ')}`,
        heldBy: affair.participants,
        hiddenFrom: [affair.betrayedParty],
        stakes: 'Relationship destruction',
        severity: 'devastating',
      },
      chapter
    );

    // Add tension point
    this.state.tensionPoints.push(
      `Affair: ${affair.participants.join(' & ')} (betraying ${affair.betrayedParty})`
    );

    return newAffair;
  }

  /**
   * Update affair status
   */
  updateAffairStatus(
    affairId: string,
    status: Affair['status'],
    chapter: number
  ): void {
    const affair = this.state.affairs.find(a => a.id === affairId);
    if (affair) {
      affair.status = status;

      if (status === 'discovered') {
        affair.discoveryChapter = chapter;
        this.state.dramaticMoments.push({
          chapter,
          type: 'affair_discovery',
          description: `${affair.betrayedParty} discovers affair`,
          impact: 9,
        });
      }
    }
  }

  /**
   * Register a character death
   */
  registerDeath(
    death: Omit<CharacterDeath, 'chapter'>,
    chapter: number
  ): CharacterDeath {
    const newDeath: CharacterDeath = {
      ...death,
      chapter,
    };

    this.state.deaths.push(newDeath);

    // Add dramatic moment
    const impactScore = {
      'minor': 3,
      'significant': 7,
      'devastating': 10,
    };

    this.state.dramaticMoments.push({
      chapter,
      type: 'death',
      description: `${death.character} dies (${death.type})`,
      impact: impactScore[death.emotionalImpact],
    });

    return newDeath;
  }

  /**
   * Register a power dynamic
   */
  addPowerDynamic(
    dynamic: Omit<PowerDynamic, 'shifts'>
  ): void {
    const existing = this.state.powerDynamics.find(
      pd => pd.characters.sort().join('_') === dynamic.characters.sort().join('_')
    );

    if (existing) {
      // Update existing
      Object.assign(existing, dynamic);
    } else {
      this.state.powerDynamics.push({
        ...dynamic,
        shifts: [],
      });
    }
  }

  /**
   * Record a power shift
   */
  recordPowerShift(
    characters: string[],
    chapter: number,
    description: string
  ): void {
    const dynamic = this.state.powerDynamics.find(
      pd => pd.characters.sort().join('_') === characters.sort().join('_')
    );

    if (dynamic) {
      dynamic.shifts.push({ chapter, description });

      this.state.dramaticMoments.push({
        chapter,
        type: 'power_shift',
        description: `Power shift: ${description}`,
        impact: 6,
      });
    }
  }

  /**
   * Add a setup for future payoff
   */
  addSetup(setup: string, idealPayoffChapter: number): void {
    this.state.upcomingPayoffs.push({
      setup,
      idealChapter: idealPayoffChapter,
    });
  }

  /**
   * Mark a payoff as delivered
   */
  deliverPayoff(setup: string): void {
    this.state.upcomingPayoffs = this.state.upcomingPayoffs.filter(
      p => !p.setup.toLowerCase().includes(setup.toLowerCase())
    );
  }

  /**
   * Process chapter extraction
   */
  processChapter(
    chapterNumber: number,
    extraction: GenreExtraction
  ): {
    confrontationsAdded: Confrontation[];
    secretsRevealed: string[];
    secretsIntroduced: Secret[];
    dramaticMoments: DramaticMomentType[];
    payoffsDue: string[];
  } {
    const result = {
      confrontationsAdded: [] as Confrontation[],
      secretsRevealed: [] as string[],
      secretsIntroduced: [] as Secret[],
      dramaticMoments: [] as DramaticMomentType[],
      payoffsDue: [] as string[],
    };

    if (!extraction.drama) return result;

    // Process confrontations
    for (const confData of extraction.drama.confrontations) {
      const conf = this.addConfrontation(confData, chapterNumber);
      result.confrontationsAdded.push(conf);
    }

    // Process revealed secrets
    for (const secretDesc of extraction.drama.secretsRevealed) {
      const secret = this.findSecret(secretDesc);
      if (secret) {
        this.revealSecret(secret.id, chapterNumber, [], 'accident');
        result.secretsRevealed.push(secret.description);
      }
    }

    // Process new secrets
    for (const secretData of extraction.drama.secretsIntroduced) {
      const secret = this.registerSecret(secretData, chapterNumber);
      result.secretsIntroduced.push(secret);
    }

    // Process dramatic moments
    for (const momentType of extraction.drama.dramaticMoments) {
      result.dramaticMoments.push(momentType);
      this.state.dramaticMoments.push({
        chapter: chapterNumber,
        type: momentType,
        description: `${momentType.replace(/_/g, ' ')} occurred`,
        impact: this.getMomentImpact(momentType),
      });
    }

    // Check for due payoffs
    result.payoffsDue = this.state.upcomingPayoffs
      .filter(p => p.idealChapter <= chapterNumber)
      .map(p => p.setup);

    return result;
  }

  /**
   * Get the current state
   */
  getState(): DramaTrackingState {
    return this.state;
  }

  /**
   * Generate drama summary for context injection
   */
  generateSummary(): string {
    let summary = '=== DRAMA STATE ===\n\n';

    // Active secrets
    const unrevealed = this.getUnrevealedSecrets();
    if (unrevealed.length > 0) {
      summary += 'ACTIVE SECRETS:\n';
      for (const secret of unrevealed) {
        summary += `  - "${secret.description}"\n`;
        summary += `    Known by: ${secret.heldBy.join(', ')}\n`;
        summary += `    Hidden from: ${secret.hiddenFrom.join(', ')}\n`;
        summary += `    Severity: ${secret.severity}\n`;
      }
      summary += '\n';
    }

    // Unresolved confrontations
    const unresolved = this.state.confrontations.filter(c => c.unresolved);
    if (unresolved.length > 0) {
      summary += 'UNRESOLVED CONFRONTATIONS:\n';
      for (const conf of unresolved) {
        summary += `  - ${conf.participants.join(' vs ')}: ${conf.subject}\n`;
        summary += `    Escalation: ${conf.escalationLevel}/5\n`;
      }
      summary += '\n';
    }

    // Active affairs
    const activeAffairs = this.state.affairs.filter(
      a => a.status === 'ongoing' || a.status === 'discovered'
    );
    if (activeAffairs.length > 0) {
      summary += 'AFFAIRS:\n';
      for (const affair of activeAffairs) {
        summary += `  - ${affair.participants.join(' & ')} (betraying ${affair.betrayedParty})\n`;
        summary += `    Status: ${affair.status}\n`;
      }
      summary += '\n';
    }

    // Power dynamics
    if (this.state.powerDynamics.length > 0) {
      summary += 'POWER DYNAMICS:\n';
      for (const pd of this.state.powerDynamics) {
        summary += `  - ${pd.dominantParty} > ${pd.submissiveParty} (${pd.type})\n`;
      }
      summary += '\n';
    }

    // Upcoming payoffs
    if (this.state.upcomingPayoffs.length > 0) {
      summary += 'SETUPS AWAITING PAYOFF:\n';
      for (const payoff of this.state.upcomingPayoffs) {
        summary += `  - ${payoff.setup} (ideal: chapter ${payoff.idealChapter})\n`;
      }
    }

    return summary;
  }

  /**
   * Generate suggestions for next chapter
   */
  generateSuggestions(currentChapter: number): string[] {
    const suggestions: string[] = [];

    // Secrets ready for reveal
    const longHeldSecrets = this.getUnrevealedSecrets().filter(
      s => currentChapter - s.introducedChapter > 5
    );
    for (const secret of longHeldSecrets) {
      suggestions.push(`Secret "${secret.description}" has been held for ${currentChapter - secret.introducedChapter} chapters. Consider revealing.`);
    }

    // Unresolved confrontations needing follow-up
    for (const conf of this.state.confrontations.filter(c => c.unresolved)) {
      if (currentChapter - conf.chapter > 3) {
        suggestions.push(`Unresolved confrontation "${conf.subject}" needs follow-up`);
      }
    }

    // Affairs at risk
    for (const affair of this.state.affairs.filter(a => a.status === 'ongoing')) {
      if (currentChapter - affair.startChapter > 7) {
        suggestions.push(`Affair between ${affair.participants.join(' & ')} has been ongoing for ${currentChapter - affair.startChapter} chapters. Discovery imminent?`);
      }
    }

    // Payoffs due
    for (const payoff of this.state.upcomingPayoffs) {
      if (payoff.idealChapter <= currentChapter) {
        suggestions.push(`PAYOFF DUE: ${payoff.setup}`);
      } else if (payoff.idealChapter <= currentChapter + 2) {
        suggestions.push(`Payoff approaching: ${payoff.setup}`);
      }
    }

    return suggestions;
  }

  /**
   * Get drama intensity for a chapter range
   */
  getDramaIntensity(startChapter: number, endChapter: number): number {
    const moments = this.state.dramaticMoments.filter(
      m => m.chapter >= startChapter && m.chapter <= endChapter
    );
    return moments.reduce((sum, m) => sum + m.impact, 0);
  }

  // Private helpers

  private getMomentImpact(type: DramaticMomentType): number {
    const impacts: Record<DramaticMomentType, number> = {
      'confrontation': 6,
      'revelation': 7,
      'betrayal': 8,
      'sacrifice': 8,
      'death': 10,
      'near_death': 7,
      'affair_discovery': 9,
      'power_shift': 6,
      'ultimatum': 7,
      'breakdown': 6,
      'reconciliation': 5,
      'separation': 6,
    };
    return impacts[type] || 5;
  }
}
