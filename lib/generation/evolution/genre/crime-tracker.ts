/**
 * Crime/Procedural Tracking
 *
 * Tracks investigation and procedural elements:
 * - Evidence chains
 * - Witness interviews
 * - Forensic findings
 * - Legal proceedings
 */

import {
  Evidence,
  Witness,
  Investigation,
  CrimeTrackingState,
} from './types';

/**
 * Create a new crime tracker instance
 */
export function createCrimeTracker(
  bookId: string,
  proceduralAccuracy: CrimeTrackingState['proceduralAccuracy'] = 'dramatized'
): CrimeTracker {
  return new CrimeTracker(bookId, proceduralAccuracy);
}

export class CrimeTracker {
  private bookId: string;
  private state: CrimeTrackingState;
  private idCounter: number = 0;

  constructor(bookId: string, proceduralAccuracy: CrimeTrackingState['proceduralAccuracy']) {
    this.bookId = bookId;
    this.state = {
      investigations: [],
      activeLeads: [],
      deadEnds: [],
      proceduralAccuracy,
    };
  }

  /**
   * Start a new investigation
   */
  startInvestigation(
    type: Investigation['type'],
    leadInvestigator: string
  ): Investigation {
    const investigation: Investigation = {
      id: `inv_${++this.idCounter}`,
      type,
      leadInvestigator,
      status: 'active',
      evidence: [],
      witnesses: [],
      suspects: [],
      timeline: [],
    };

    this.state.investigations.push(investigation);
    return investigation;
  }

  /**
   * Get an investigation by ID
   */
  getInvestigation(investigationId: string): Investigation | undefined {
    return this.state.investigations.find(i => i.id === investigationId);
  }

  /**
   * Get active investigation (usually just one)
   */
  getActiveInvestigation(): Investigation | undefined {
    return this.state.investigations.find(i => i.status === 'active');
  }

  /**
   * Add evidence to an investigation
   */
  addEvidence(
    investigationId: string,
    evidence: Omit<Evidence, 'id' | 'chapter'>,
    chapter: number
  ): Evidence | undefined {
    const investigation = this.getInvestigation(investigationId);
    if (!investigation) return undefined;

    const newEvidence: Evidence = {
      ...evidence,
      id: `ev_${++this.idCounter}`,
      chapter,
    };

    investigation.evidence.push(newEvidence);

    // Add to timeline
    investigation.timeline.push({
      event: `Evidence found: ${evidence.description}`,
      chapter,
    });

    // If this is a new lead
    if (evidence.supports && !this.state.activeLeads.includes(evidence.supports)) {
      this.state.activeLeads.push(evidence.supports);
    }

    return newEvidence;
  }

  /**
   * Add a witness to an investigation
   */
  addWitness(
    investigationId: string,
    witness: Omit<Witness, 'interviewChapter'>,
    chapter: number
  ): Witness | undefined {
    const investigation = this.getInvestigation(investigationId);
    if (!investigation) return undefined;

    const newWitness: Witness = {
      ...witness,
      interviewChapter: chapter,
    };

    investigation.witnesses.push(newWitness);

    // Add to timeline
    investigation.timeline.push({
      event: `Witness interviewed: ${witness.name}`,
      chapter,
    });

    return newWitness;
  }

  /**
   * Update witness credibility
   */
  updateWitnessCredibility(
    investigationId: string,
    witnessName: string,
    credibility: Witness['credibility'],
    reason?: string
  ): void {
    const investigation = this.getInvestigation(investigationId);
    if (!investigation) return;

    const witness = investigation.witnesses.find(w => w.name === witnessName);
    if (witness) {
      witness.credibility = credibility;
      if (reason) {
        witness.inconsistencies.push(reason);
      }
    }
  }

  /**
   * Add a suspect to an investigation
   */
  addSuspect(investigationId: string, suspectName: string): void {
    const investigation = this.getInvestigation(investigationId);
    if (investigation && !investigation.suspects.includes(suspectName)) {
      investigation.suspects.push(suspectName);
    }
  }

  /**
   * Remove a suspect (cleared)
   */
  clearSuspect(investigationId: string, suspectName: string, chapter: number): void {
    const investigation = this.getInvestigation(investigationId);
    if (investigation) {
      investigation.suspects = investigation.suspects.filter(s => s !== suspectName);
      investigation.timeline.push({
        event: `Suspect cleared: ${suspectName}`,
        chapter,
      });
    }
  }

  /**
   * Add a lead
   */
  addLead(lead: string): void {
    if (!this.state.activeLeads.includes(lead)) {
      this.state.activeLeads.push(lead);
    }
  }

  /**
   * Mark a lead as dead end
   */
  markDeadEnd(lead: string): void {
    this.state.activeLeads = this.state.activeLeads.filter(l => l !== lead);
    if (!this.state.deadEnds.includes(lead)) {
      this.state.deadEnds.push(lead);
    }
  }

  /**
   * Resolve a lead (pursued to conclusion)
   */
  resolveLead(lead: string): void {
    this.state.activeLeads = this.state.activeLeads.filter(l => l !== lead);
  }

  /**
   * Add timeline event
   */
  addTimelineEvent(investigationId: string, event: string, chapter: number): void {
    const investigation = this.getInvestigation(investigationId);
    if (investigation) {
      investigation.timeline.push({ event, chapter });
    }
  }

  /**
   * Update investigation status
   */
  updateStatus(investigationId: string, status: Investigation['status']): void {
    const investigation = this.getInvestigation(investigationId);
    if (investigation) {
      investigation.status = status;
    }
  }

  /**
   * Validate chain of custody
   */
  validateChainOfCustody(investigationId: string, evidenceId: string): {
    valid: boolean;
    issues: string[];
  } {
    const investigation = this.getInvestigation(investigationId);
    if (!investigation) return { valid: false, issues: ['Investigation not found'] };

    const evidence = investigation.evidence.find(e => e.id === evidenceId);
    if (!evidence) return { valid: false, issues: ['Evidence not found'] };

    const issues: string[] = [];

    // Check chain of custody
    if (evidence.chainOfCustody.length === 0) {
      issues.push('No chain of custody documented');
    }

    // Check if admissible
    if (!evidence.isAdmissible) {
      issues.push('Evidence marked as inadmissible');
    }

    // Check for gaps (simplified check)
    if (evidence.chainOfCustody.length > 0 &&
        !evidence.chainOfCustody.includes(evidence.foundBy)) {
      issues.push('Finder not in chain of custody');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get the current state
   */
  getState(): CrimeTrackingState {
    return this.state;
  }

  /**
   * Generate crime investigation summary
   */
  generateSummary(): string {
    if (this.state.investigations.length === 0) {
      return '';
    }

    let summary = '=== INVESTIGATION STATUS ===\n';
    summary += `Procedural Accuracy: ${this.state.proceduralAccuracy}\n\n`;

    for (const inv of this.state.investigations) {
      summary += `INVESTIGATION: ${inv.type.toUpperCase()}\n`;
      summary += `  Lead Investigator: ${inv.leadInvestigator}\n`;
      summary += `  Status: ${inv.status}\n`;

      // Evidence summary
      summary += `  Evidence: ${inv.evidence.length} items\n`;
      const keyEvidence = inv.evidence.filter(e => e.type === 'forensic' || e.type === 'physical');
      if (keyEvidence.length > 0) {
        summary += `    Key items: ${keyEvidence.map(e => e.description).join(', ')}\n`;
      }

      // Witnesses
      summary += `  Witnesses: ${inv.witnesses.length}\n`;
      const credibleWitnesses = inv.witnesses.filter(w => w.credibility === 'credible' || w.credibility === 'highly_credible');
      if (credibleWitnesses.length > 0) {
        summary += `    Credible: ${credibleWitnesses.map(w => w.name).join(', ')}\n`;
      }

      // Suspects
      if (inv.suspects.length > 0) {
        summary += `  Suspects: ${inv.suspects.join(', ')}\n`;
      }

      summary += '\n';
    }

    // Active leads
    if (this.state.activeLeads.length > 0) {
      summary += 'ACTIVE LEADS:\n';
      for (const lead of this.state.activeLeads) {
        summary += `  - ${lead}\n`;
      }
      summary += '\n';
    }

    // Dead ends
    if (this.state.deadEnds.length > 0) {
      summary += 'DEAD ENDS:\n';
      for (const end of this.state.deadEnds) {
        summary += `  - ${end}\n`;
      }
    }

    return summary;
  }

  /**
   * Generate procedural accuracy reminders
   */
  generateProceduralReminders(): string[] {
    const reminders: string[] = [];

    if (this.state.proceduralAccuracy === 'realistic') {
      reminders.push('REALISTIC MODE: Maintain strict procedural accuracy');
      reminders.push('- Evidence must have documented chain of custody');
      reminders.push('- Interviews should follow Miranda requirements');
      reminders.push('- Forensic results take time (days/weeks)');
      reminders.push('- Warrants required for searches');
    } else if (this.state.proceduralAccuracy === 'dramatized') {
      reminders.push('DRAMATIZED MODE: Bend procedure for drama, but stay believable');
      reminders.push('- Results can be faster than reality');
      reminders.push('- Some procedural shortcuts allowed');
      reminders.push('- Maintain core police/legal framework');
    }

    return reminders;
  }

  /**
   * Generate investigation suggestions
   */
  generateSuggestions(currentChapter: number): string[] {
    const suggestions: string[] = [];

    const activeInv = this.getActiveInvestigation();
    if (!activeInv) return suggestions;

    // Check evidence count
    if (activeInv.evidence.length < 3) {
      suggestions.push('Investigation needs more evidence');
    }

    // Check witness diversity
    const witnessTypes = new Set(activeInv.witnesses.map(w => w.credibility));
    if (witnessTypes.size < 2 && activeInv.witnesses.length > 2) {
      suggestions.push('Add witnesses with varying credibility');
    }

    // Check for stale leads
    if (this.state.activeLeads.length > 5) {
      suggestions.push('Too many open leads. Resolve or mark as dead ends.');
    }

    // Check timeline progression
    const recentEvents = activeInv.timeline.filter(t => t.chapter >= currentChapter - 2);
    if (recentEvents.length === 0) {
      suggestions.push('Investigation has stalled. Add new development.');
    }

    return suggestions;
  }
}
