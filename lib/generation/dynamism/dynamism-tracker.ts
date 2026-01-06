/**
 * Dynamism Tracker
 *
 * Tracks locations, characters, and story state during generation.
 * Validates that the content follows the dynamism profile requirements.
 *
 * Used during:
 * 1. Beat generation - Track where we are, who's present
 * 2. Chapter completion - Validate chapter met requirements
 * 3. Book completion - Validate overall dynamism metrics
 *
 * Provides:
 * - Warnings when stuck in same location too long
 * - Alerts when character variety is lacking
 * - Feedback for surgical retries
 */

import { type DynamismProfile } from './dynamism-profile';

// =============================================================================
// TRACKER TYPES
// =============================================================================

export interface LocationEntry {
  name: string;                    // "the apartment", "downtown cafe"
  type: 'indoor' | 'outdoor' | 'vehicle' | 'virtual' | 'memory' | 'unknown';
  firstAppearance: { chapter: number; beat: number };
  lastAppearance: { chapter: number; beat: number };
  totalBeats: number;             // How many beats spent here
}

export interface CharacterEntry {
  name: string;
  type: 'physical' | 'phone' | 'memory' | 'mention' | 'voice';
  firstAppearance: { chapter: number; beat: number };
  lastAppearance: { chapter: number; beat: number };
  totalAppearances: number;
}

export interface ChapterState {
  chapterNumber: number;
  locations: string[];             // Locations visited in this chapter
  characters: string[];            // Characters present in this chapter
  hasLocationChange: boolean;
  hasNewCharacter: boolean;
  hasExternalContact: boolean;     // Phone call, radio, etc.
  stakesLevel: 'low' | 'medium' | 'high' | 'critical';
  endingType: 'cliffhanger' | 'revelation' | 'shift' | 'resolution' | 'unknown';
}

export interface BeatState {
  beatNumber: number;
  currentLocation: string;
  charactersPresent: string[];
  beatsInCurrentLocation: number;  // Consecutive beats here
  beatsWithSameCast: number;       // Consecutive beats with same people
}

export interface DynamismState {
  // Cumulative tracking
  allLocations: Map<string, LocationEntry>;
  allCharacters: Map<string, CharacterEntry>;

  // Current state
  currentChapter: number;
  currentBeat: number;
  currentLocation: string;
  currentCharacters: string[];
  beatsInCurrentLocation: number;
  beatsWithCurrentCast: number;

  // Chapter-level tracking
  chapterHistory: ChapterState[];

  // Warnings and violations
  warnings: DynamismWarning[];
  violations: DynamismViolation[];
}

export interface DynamismWarning {
  type: 'location_stuck' | 'character_stuck' | 'no_variety' | 'no_external_contact';
  message: string;
  chapter: number;
  beat: number;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface DynamismViolation {
  type: 'forbidden_action' | 'missing_requirement' | 'stagnation';
  message: string;
  chapter: number;
  beat?: number;
  correction: string;             // Feedback for retry
}

export interface DynamismReport {
  // Overall metrics
  totalLocations: number;
  totalCharacters: number;
  averageLocationsPerChapter: number;
  averageCharactersPerChapter: number;

  // Variety scores
  locationVarietyScore: number;    // 0-100
  characterVarietyScore: number;   // 0-100
  overallDynamismScore: number;    // 0-100

  // Issues
  warnings: DynamismWarning[];
  violations: DynamismViolation[];

  // Recommendations
  recommendations: string[];
}

// =============================================================================
// TRACKER CLASS
// =============================================================================

export class DynamismTracker {
  private state: DynamismState;
  private profile: DynamismProfile;

  constructor(profile: DynamismProfile) {
    this.profile = profile;
    this.state = this.initializeState();
  }

  private initializeState(): DynamismState {
    return {
      allLocations: new Map(),
      allCharacters: new Map(),
      currentChapter: 1,
      currentBeat: 0,
      currentLocation: '',
      currentCharacters: [],
      beatsInCurrentLocation: 0,
      beatsWithCurrentCast: 0,
      chapterHistory: [],
      warnings: [],
      violations: [],
    };
  }

  // ===========================================================================
  // TRACKING METHODS
  // ===========================================================================

  /**
   * Start a new chapter.
   */
  startChapter(chapterNumber: number): void {
    // Save previous chapter state
    if (this.state.currentChapter > 0 && this.state.currentBeat > 0) {
      this.finalizeChapter();
    }

    this.state.currentChapter = chapterNumber;
    this.state.currentBeat = 0;
    this.state.beatsInCurrentLocation = 0;
    this.state.beatsWithCurrentCast = 0;
  }

  /**
   * Track a beat's content.
   */
  trackBeat(
    beatNumber: number,
    location: string,
    characters: string[],
    hasExternalContact: boolean = false
  ): BeatState {
    this.state.currentBeat = beatNumber;

    // Track location
    const locationChanged = this.trackLocation(location);

    // Track characters
    const charactersChanged = this.trackCharacters(characters);

    // Update consecutive counters
    if (locationChanged) {
      this.state.beatsInCurrentLocation = 1;
    } else {
      this.state.beatsInCurrentLocation++;
    }

    if (charactersChanged) {
      this.state.beatsWithCurrentCast = 1;
    } else {
      this.state.beatsWithCurrentCast++;
    }

    // Check for warnings
    this.checkForWarnings(hasExternalContact);

    return {
      beatNumber,
      currentLocation: this.state.currentLocation,
      charactersPresent: this.state.currentCharacters,
      beatsInCurrentLocation: this.state.beatsInCurrentLocation,
      beatsWithSameCast: this.state.beatsWithCurrentCast,
    };
  }

  /**
   * Track a location appearance.
   */
  private trackLocation(location: string): boolean {
    const normalizedLocation = this.normalizeLocation(location);

    const existing = this.state.allLocations.get(normalizedLocation);
    const isNew = !existing;
    const isChange = normalizedLocation !== this.state.currentLocation;

    if (existing) {
      existing.lastAppearance = {
        chapter: this.state.currentChapter,
        beat: this.state.currentBeat,
      };
      existing.totalBeats++;
    } else {
      this.state.allLocations.set(normalizedLocation, {
        name: normalizedLocation,
        type: this.inferLocationType(location),
        firstAppearance: {
          chapter: this.state.currentChapter,
          beat: this.state.currentBeat,
        },
        lastAppearance: {
          chapter: this.state.currentChapter,
          beat: this.state.currentBeat,
        },
        totalBeats: 1,
      });
    }

    this.state.currentLocation = normalizedLocation;
    return isChange;
  }

  /**
   * Track character appearances.
   */
  private trackCharacters(characters: string[]): boolean {
    const normalizedChars = characters.map(c => this.normalizeCharacter(c));
    const sortedNew = [...normalizedChars].sort().join(',');
    const sortedCurrent = [...this.state.currentCharacters].sort().join(',');
    const isChange = sortedNew !== sortedCurrent;

    for (const char of normalizedChars) {
      const existing = this.state.allCharacters.get(char);

      if (existing) {
        existing.lastAppearance = {
          chapter: this.state.currentChapter,
          beat: this.state.currentBeat,
        };
        existing.totalAppearances++;
      } else {
        this.state.allCharacters.set(char, {
          name: char,
          type: 'physical',  // Default; could be enhanced
          firstAppearance: {
            chapter: this.state.currentChapter,
            beat: this.state.currentBeat,
          },
          lastAppearance: {
            chapter: this.state.currentChapter,
            beat: this.state.currentBeat,
          },
          totalAppearances: 1,
        });
      }
    }

    this.state.currentCharacters = normalizedChars;
    return isChange;
  }

  /**
   * Check for dynamism warnings.
   */
  private checkForWarnings(hasExternalContact: boolean): void {
    const maxLocationBeats = this.profile.locations.maxConsecutiveBeatsInSame;
    const maxCastBeats = this.profile.characters.maxConsecutiveBeatsWithSameCast;

    // Location stagnation warning
    if (this.state.beatsInCurrentLocation >= maxLocationBeats) {
      const severity = this.state.beatsInCurrentLocation >= maxLocationBeats + 2
        ? 'severe'
        : this.state.beatsInCurrentLocation >= maxLocationBeats + 1
          ? 'moderate'
          : 'mild';

      this.state.warnings.push({
        type: 'location_stuck',
        message: `${this.state.beatsInCurrentLocation} consecutive beats in "${this.state.currentLocation}" (max: ${maxLocationBeats})`,
        chapter: this.state.currentChapter,
        beat: this.state.currentBeat,
        severity,
      });
    }

    // Character stagnation warning
    if (this.state.beatsWithCurrentCast >= maxCastBeats) {
      const severity = this.state.beatsWithCurrentCast >= maxCastBeats + 2
        ? 'severe'
        : 'moderate';

      this.state.warnings.push({
        type: 'character_stuck',
        message: `${this.state.beatsWithCurrentCast} consecutive beats with same characters (max: ${maxCastBeats})`,
        chapter: this.state.currentChapter,
        beat: this.state.currentBeat,
        severity,
      });
    }

    // Solo story without external contact
    if (this.profile.characters.scope === 'solo' &&
        this.state.currentBeat > 2 &&
        !hasExternalContact) {
      // Check if any external contact in this chapter
      const chapterState = this.getChapterState();
      if (!chapterState.hasExternalContact) {
        this.state.warnings.push({
          type: 'no_external_contact',
          message: 'No external contact (phone, radio, memory) in this chapter yet',
          chapter: this.state.currentChapter,
          beat: this.state.currentBeat,
          severity: 'moderate',
        });
      }
    }
  }

  /**
   * Finalize a chapter and check for violations.
   */
  private finalizeChapter(): void {
    const chapterState = this.getChapterState();
    this.state.chapterHistory.push(chapterState);

    // Check location requirements
    if (this.profile.locations.minLocationsPerChapter > 0) {
      const uniqueLocations = new Set(chapterState.locations).size;
      if (uniqueLocations < this.profile.locations.minLocationsPerChapter) {
        this.state.violations.push({
          type: 'missing_requirement',
          message: `Chapter ${chapterState.chapterNumber} has ${uniqueLocations} location(s), needs ${this.profile.locations.minLocationsPerChapter}`,
          chapter: chapterState.chapterNumber,
          correction: `Add ${this.profile.locations.minLocationsPerChapter - uniqueLocations} more distinct location(s)`,
        });
      }
    }

    // Check character requirements
    if (this.profile.characters.minCharactersPerChapter > 1) {
      const uniqueChars = new Set(chapterState.characters).size;
      if (uniqueChars < this.profile.characters.minCharactersPerChapter) {
        this.state.violations.push({
          type: 'missing_requirement',
          message: `Chapter ${chapterState.chapterNumber} has ${uniqueChars} character(s), needs ${this.profile.characters.minCharactersPerChapter}`,
          chapter: chapterState.chapterNumber,
          correction: this.profile.characters.scope === 'solo'
            ? 'Add external contact (phone call, radio, memory with dialogue)'
            : `Include ${this.profile.characters.minCharactersPerChapter - uniqueChars} more character(s)`,
        });
      }
    }

    // Check for solo stories needing external contact
    if (this.profile.characters.scope === 'solo' && !chapterState.hasExternalContact) {
      this.state.violations.push({
        type: 'missing_requirement',
        message: `Chapter ${chapterState.chapterNumber} has no external contact (required for isolated protagonist)`,
        chapter: chapterState.chapterNumber,
        correction: 'Add phone call, radio message, memory with dialogue, or other external voice',
      });
    }
  }

  /**
   * Get the current chapter state.
   */
  private getChapterState(): ChapterState {
    // Gather locations and characters from this chapter
    const chapterLocations: string[] = [];
    const chapterCharacters: string[] = [];

    for (const [name, entry] of this.state.allLocations) {
      if (entry.lastAppearance.chapter === this.state.currentChapter) {
        chapterLocations.push(name);
      }
    }

    for (const [name, entry] of this.state.allCharacters) {
      if (entry.lastAppearance.chapter === this.state.currentChapter) {
        chapterCharacters.push(name);
      }
    }

    return {
      chapterNumber: this.state.currentChapter,
      locations: chapterLocations,
      characters: chapterCharacters,
      hasLocationChange: chapterLocations.length > 1,
      hasNewCharacter: chapterCharacters.some(c => {
        const entry = this.state.allCharacters.get(c);
        return entry?.firstAppearance.chapter === this.state.currentChapter;
      }),
      hasExternalContact: false,  // Would need to be tracked separately
      stakesLevel: 'medium',      // Would need to be inferred
      endingType: 'unknown',      // Would need to be inferred
    };
  }

  // ===========================================================================
  // QUERY METHODS
  // ===========================================================================

  /**
   * Get current dynamism state.
   */
  getState(): DynamismState {
    return { ...this.state };
  }

  /**
   * Get warnings for current beat.
   */
  getCurrentWarnings(): DynamismWarning[] {
    return this.state.warnings.filter(
      w => w.chapter === this.state.currentChapter && w.beat === this.state.currentBeat
    );
  }

  /**
   * Get all violations.
   */
  getViolations(): DynamismViolation[] {
    return [...this.state.violations];
  }

  /**
   * Should we force a location change?
   */
  shouldForceLocationChange(): boolean {
    return this.state.beatsInCurrentLocation >= this.profile.locations.maxConsecutiveBeatsInSame;
  }

  /**
   * Should we force character variety?
   */
  shouldForceCharacterChange(): boolean {
    return this.state.beatsWithCurrentCast >= this.profile.characters.maxConsecutiveBeatsWithSameCast;
  }

  /**
   * Get feedback for beat generation (if violations/warnings exist).
   */
  getBeatFeedback(): string | null {
    const warnings = this.getCurrentWarnings();
    if (warnings.length === 0) return null;

    const feedback: string[] = [];
    feedback.push('=== DYNAMISM FEEDBACK ===\n');

    for (const warning of warnings) {
      switch (warning.type) {
        case 'location_stuck':
          feedback.push(`LOCATION VARIETY NEEDED: ${warning.message}`);
          if (this.profile.locations.canPhysicallyTravel) {
            feedback.push('→ Move to a different location for this beat');
          } else {
            feedback.push('→ Change something about the current space (lighting, discovery, damage)');
            feedback.push('→ Or use a flashback/memory to a different place');
          }
          break;

        case 'character_stuck':
          feedback.push(`CHARACTER VARIETY NEEDED: ${warning.message}`);
          if (this.profile.characters.canMeetNewPeople) {
            feedback.push('→ Introduce a new character or bring back an earlier one');
          } else {
            feedback.push('→ Add a phone call, radio message, or memory featuring someone else');
          }
          break;

        case 'no_external_contact':
          feedback.push('EXTERNAL CONTACT NEEDED:');
          feedback.push('→ Your protagonist is isolated - bring in an external voice');
          feedback.push('→ Options: phone call, radio, intercom, memory with dialogue');
          break;
      }
      feedback.push('');
    }

    return feedback.join('\n');
  }

  // ===========================================================================
  // REPORT METHODS
  // ===========================================================================

  /**
   * Generate a comprehensive dynamism report.
   */
  generateReport(): DynamismReport {
    // Finalize current chapter if in progress
    if (this.state.currentBeat > 0) {
      this.finalizeChapter();
    }

    const totalLocations = this.state.allLocations.size;
    const totalCharacters = this.state.allCharacters.size;
    const numChapters = this.state.chapterHistory.length || 1;

    // Calculate averages
    const avgLocations = this.state.chapterHistory.reduce(
      (sum, ch) => sum + new Set(ch.locations).size, 0
    ) / numChapters;

    const avgCharacters = this.state.chapterHistory.reduce(
      (sum, ch) => sum + new Set(ch.characters).size, 0
    ) / numChapters;

    // Calculate variety scores
    const locationVarietyScore = this.calculateLocationVarietyScore();
    const characterVarietyScore = this.calculateCharacterVarietyScore();
    const overallDynamismScore = Math.round(
      (locationVarietyScore + characterVarietyScore) / 2
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    return {
      totalLocations,
      totalCharacters,
      averageLocationsPerChapter: Math.round(avgLocations * 10) / 10,
      averageCharactersPerChapter: Math.round(avgCharacters * 10) / 10,
      locationVarietyScore,
      characterVarietyScore,
      overallDynamismScore,
      warnings: this.state.warnings,
      violations: this.state.violations,
      recommendations,
    };
  }

  private calculateLocationVarietyScore(): number {
    const target = this.profile.locations.minDistinctLocationsPerBook;
    const actual = this.state.allLocations.size;
    const ratio = Math.min(actual / target, 1);
    return Math.round(ratio * 100);
  }

  private calculateCharacterVarietyScore(): number {
    const target = this.profile.characters.minNewCharactersPerBook +
                   (this.profile.characters.scope === 'solo' ? 3 : 5);
    const actual = this.state.allCharacters.size;
    const ratio = Math.min(actual / target, 1);
    return Math.round(ratio * 100);
  }

  private generateRecommendations(): string[] {
    const recs: string[] = [];

    if (this.state.allLocations.size < this.profile.locations.minDistinctLocationsPerBook) {
      recs.push(
        `Add ${this.profile.locations.minDistinctLocationsPerBook - this.state.allLocations.size} more distinct location(s)`
      );
    }

    if (this.state.violations.length > 0) {
      recs.push('Address the violations listed above');
    }

    const severeWarnings = this.state.warnings.filter(w => w.severity === 'severe');
    if (severeWarnings.length > 0) {
      recs.push('Review scenes with severe stagnation warnings');
    }

    return recs;
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private normalizeLocation(location: string): string {
    return location.toLowerCase().trim()
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/[.,!?;:]+$/, '');
  }

  private normalizeCharacter(name: string): string {
    return name.trim()
      .replace(/^(the|a|an)\s+/i, '')
      .split(' ')[0];  // First name only for matching
  }

  private inferLocationType(location: string): LocationEntry['type'] {
    const lower = location.toLowerCase();

    if (/\b(car|truck|bus|train|plane|boat|vehicle)\b/.test(lower)) {
      return 'vehicle';
    }
    if (/\b(memory|flashback|dream|rememb)\b/.test(lower)) {
      return 'memory';
    }
    if (/\b(call|phone|video|screen|virtual)\b/.test(lower)) {
      return 'virtual';
    }
    if (/\b(street|park|beach|forest|garden|yard|outside|outdoor)\b/.test(lower)) {
      return 'outdoor';
    }
    if (/\b(room|office|house|apartment|building|cafe|restaurant|bar|store|inside)\b/.test(lower)) {
      return 'indoor';
    }

    return 'unknown';
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new dynamism tracker for a story.
 */
export function createDynamismTracker(profile: DynamismProfile): DynamismTracker {
  return new DynamismTracker(profile);
}

// =============================================================================
// CONTENT EXTRACTION (from generated text)
// =============================================================================

/**
 * Extract locations mentioned in text.
 * This is a simple heuristic - could be enhanced with NLP.
 */
export function extractLocations(text: string): string[] {
  const locations: string[] = [];

  // Look for location indicators
  const patterns = [
    /(?:in|at|inside|within|entered|arrived at|walked into|stepped into) (?:the |a |an )?([^,.!?]+)/gi,
    /(?:INT\.|EXT\.) ([^-\n]+)/gi,  // Screenplay format
    /(?:PANEL|LOCATION): ([^,\n]+)/gi,  // Comic format
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const location = match[1].trim();
      if (location.length > 2 && location.length < 50) {
        locations.push(location);
      }
    }
  }

  return [...new Set(locations)];  // Dedupe
}

/**
 * Extract characters mentioned in text.
 * This is a simple heuristic - ideally uses the known character list.
 */
export function extractCharacters(
  text: string,
  knownCharacters: string[] = []
): string[] {
  const found: string[] = [];

  // Check for known characters
  for (const char of knownCharacters) {
    const pattern = new RegExp(`\\b${char}\\b`, 'gi');
    if (pattern.test(text)) {
      found.push(char);
    }
  }

  return [...new Set(found)];
}

/**
 * Check if text contains external contact (phone, radio, etc.)
 */
export function hasExternalContact(text: string): boolean {
  const patterns = [
    /\b(phone|call|rang|calling|answered|dial|hung up)\b/i,
    /\b(text|message|notification|voicemail)\b/i,
    /\b(radio|intercom|walkie|speaker|PA system)\b/i,
    /\b(email|inbox|sent)\b/i,
    /\b(video call|facetime|zoom|skype)\b/i,
    /"[^"]+"/,  // Quoted speech (could be from phone/radio)
  ];

  return patterns.some(p => p.test(text));
}
