/**
 * Comedy/Humor Tracking
 *
 * Tracks comedic elements and their effectiveness:
 * - Jokes and punchlines
 * - Running gags
 * - Comedic timing
 * - Character-based humor
 * - Situational comedy
 * - Sarcasm instances
 */

import {
  HumorType,
  JokeBeat,
  RunningGag,
  SarcasmInstance,
  CharacterComedyProfile,
  ComedyTrackingState,
  GenreExtraction,
} from './types';

/**
 * Create a new comedy tracker instance
 */
export function createComedyTracker(bookId: string): ComedyTracker {
  return new ComedyTracker(bookId);
}

export class ComedyTracker {
  private bookId: string;
  private state: ComedyTrackingState;
  private jokeIdCounter: number = 0;
  private gagIdCounter: number = 0;

  constructor(bookId: string) {
    this.bookId = bookId;
    this.state = {
      jokes: [],
      runningGags: [],
      sarcasmInstances: [],
      characterProfiles: [],
      overallTone: 'light',
      comedyDensity: 0,
      callbackOpportunities: [],
    };
  }

  /**
   * Add a joke/comedic beat
   */
  addJoke(
    joke: Omit<JokeBeat, 'id' | 'chapter'>,
    chapter: number
  ): JokeBeat {
    const newJoke: JokeBeat = {
      ...joke,
      id: `joke_${++this.jokeIdCounter}`,
      chapter,
    };

    this.state.jokes.push(newJoke);

    // If it's a callback, mark the original
    if (joke.isCallback && joke.callsBackTo) {
      // Remove from callback opportunities
      this.state.callbackOpportunities = this.state.callbackOpportunities.filter(
        co => co.joke !== joke.callsBackTo
      );
    }

    // Update character profile
    this.updateCharacterProfile(joke.deliveredBy, joke.type);

    // Check for running gag potential
    this.checkRunningGagPotential(newJoke);

    // Generate callback opportunity
    if (joke.effectiveness === 'great' || joke.effectiveness === 'killer') {
      this.addCallbackOpportunity(newJoke, chapter);
    }

    return newJoke;
  }

  /**
   * Add a running gag
   */
  addRunningGag(
    description: string,
    firstChapter: number
  ): RunningGag {
    const gag: RunningGag = {
      id: `gag_${++this.gagIdCounter}`,
      description,
      firstAppearance: firstChapter,
      occurrences: [{ chapter: firstChapter, variation: 'Initial appearance' }],
      isExhausted: false,
      escalates: false,
    };

    this.state.runningGags.push(gag);
    return gag;
  }

  /**
   * Record a running gag occurrence
   */
  recordGagOccurrence(gagId: string, chapter: number, variation: string): void {
    const gag = this.state.runningGags.find(g => g.id === gagId);
    if (gag) {
      gag.occurrences.push({ chapter, variation });

      // Check for exhaustion (same gag 5+ times without variation)
      const recentOccurrences = gag.occurrences.slice(-5);
      const uniqueVariations = new Set(recentOccurrences.map(o => o.variation)).size;
      if (recentOccurrences.length >= 5 && uniqueVariations < 3) {
        gag.isExhausted = true;
      }

      // Check for escalation pattern
      if (variation.toLowerCase().includes('bigger') ||
          variation.toLowerCase().includes('more') ||
          variation.toLowerCase().includes('escalat')) {
        gag.escalates = true;
      }
    }
  }

  /**
   * Find a running gag by description
   */
  findGagByDescription(description: string): RunningGag | undefined {
    const searchLower = description.toLowerCase();
    return this.state.runningGags.find(g =>
      g.description.toLowerCase().includes(searchLower) ||
      searchLower.includes(g.description.toLowerCase())
    );
  }

  /**
   * Add a sarcasm instance
   */
  addSarcasm(
    sarcasm: Omit<SarcasmInstance, 'chapter'>,
    chapter: number
  ): void {
    this.state.sarcasmInstances.push({
      ...sarcasm,
      chapter,
    });

    // Update character profile for sarcasm
    const profile = this.getOrCreateCharacterProfile(sarcasm.speaker);
    if (!profile.comedyStyle.includes('sarcasm')) {
      profile.comedyStyle.push('sarcasm');
    }
    if (sarcasm.target && !profile.frequentTargets.includes(sarcasm.target)) {
      profile.frequentTargets.push(sarcasm.target);
    }
  }

  /**
   * Process chapter extraction
   */
  processChapter(
    chapterNumber: number,
    extraction: GenreExtraction,
    chapterWordCount: number
  ): {
    jokesAdded: JokeBeat[];
    sarcasmFound: number;
    runningGagsUsed: string[];
    callbacksUsed: string[];
    suggestions: string[];
  } {
    const result = {
      jokesAdded: [] as JokeBeat[],
      sarcasmFound: 0,
      runningGagsUsed: [] as string[],
      callbacksUsed: [] as string[],
      suggestions: [] as string[],
    };

    if (!extraction.comedy) return result;

    // Process jokes
    for (const jokeData of extraction.comedy.jokes) {
      const joke = this.addJoke(jokeData, chapterNumber);
      result.jokesAdded.push(joke);

      if (joke.isCallback) {
        result.callbacksUsed.push(joke.callsBackTo || 'unknown');
      }
    }

    // Process sarcasm
    for (const sarcasmData of extraction.comedy.sarcasmInstances) {
      this.addSarcasm(sarcasmData, chapterNumber);
      result.sarcasmFound++;
    }

    // Process running gag occurrences
    for (const gagDescription of extraction.comedy.runningGagOccurrences) {
      let gag = this.findGagByDescription(gagDescription);
      if (gag) {
        this.recordGagOccurrence(gag.id, chapterNumber, gagDescription);
        result.runningGagsUsed.push(gag.description);
      } else {
        // New running gag
        gag = this.addRunningGag(gagDescription, chapterNumber);
        result.runningGagsUsed.push(gag.description);
      }
    }

    // Update comedy density
    this.updateComedyDensity(chapterWordCount);

    // Generate suggestions
    result.suggestions = this.generateSuggestions(chapterNumber);

    return result;
  }

  /**
   * Get or create a character comedy profile
   */
  getOrCreateCharacterProfile(name: string): CharacterComedyProfile {
    let profile = this.state.characterProfiles.find(p => p.name === name);
    if (!profile) {
      profile = {
        name,
        comedyStyle: [],
        catchPhrases: [],
        frequentTargets: [],
        selfAwareness: 'partial',
        deliveryStyle: 'earnest',
        isComedyRelief: false,
      };
      this.state.characterProfiles.push(profile);
    }
    return profile;
  }

  /**
   * Set a character as comedy relief
   */
  setComedyRelief(name: string, style: CharacterComedyProfile['deliveryStyle']): void {
    const profile = this.getOrCreateCharacterProfile(name);
    profile.isComedyRelief = true;
    profile.deliveryStyle = style;
  }

  /**
   * Add a catch phrase for a character
   */
  addCatchPhrase(name: string, phrase: string): void {
    const profile = this.getOrCreateCharacterProfile(name);
    if (!profile.catchPhrases.includes(phrase)) {
      profile.catchPhrases.push(phrase);
    }
  }

  /**
   * Set overall tone
   */
  setTone(tone: ComedyTrackingState['overallTone']): void {
    this.state.overallTone = tone;
  }

  /**
   * Get the current state
   */
  getState(): ComedyTrackingState {
    return this.state;
  }

  /**
   * Generate comedy summary for context injection
   */
  generateSummary(): string {
    if (this.state.jokes.length === 0 && this.state.runningGags.length === 0) {
      return '';
    }

    let summary = '=== COMEDY TRACKING ===\n';
    summary += `Tone: ${this.state.overallTone}\n`;
    summary += `Comedy density: ${this.state.comedyDensity.toFixed(1)} jokes per 1000 words\n\n`;

    // Running gags
    if (this.state.runningGags.length > 0) {
      summary += 'RUNNING GAGS:\n';
      for (const gag of this.state.runningGags) {
        const status = gag.isExhausted ? '(EXHAUSTED - vary or retire)' :
                       gag.escalates ? '(escalating)' : '';
        summary += `  - "${gag.description}" ${status}\n`;
        summary += `    Used ${gag.occurrences.length} times\n`;
      }
      summary += '\n';
    }

    // Callback opportunities
    if (this.state.callbackOpportunities.length > 0) {
      summary += 'CALLBACK OPPORTUNITIES:\n';
      for (const co of this.state.callbackOpportunities.slice(0, 5)) {
        summary += `  - "${co.joke}" (ideal around chapter ${co.idealChapter})\n`;
        summary += `    Suggestion: ${co.suggestedCallback}\n`;
      }
      summary += '\n';
    }

    // Character comedy profiles
    const comedyCharacters = this.state.characterProfiles.filter(
      p => p.comedyStyle.length > 0 || p.isComedyRelief
    );
    if (comedyCharacters.length > 0) {
      summary += 'COMEDY CHARACTERS:\n';
      for (const char of comedyCharacters) {
        summary += `  ${char.name}: ${char.deliveryStyle}`;
        if (char.isComedyRelief) summary += ' (comic relief)';
        summary += '\n';
        if (char.catchPhrases.length > 0) {
          summary += `    Catch phrases: "${char.catchPhrases.join('", "')}"\n`;
        }
      }
    }

    return summary;
  }

  /**
   * Validate a joke placement
   */
  validateJokePlacement(chapter: number): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check joke density
    const recentJokes = this.state.jokes.filter(
      j => j.chapter >= chapter - 2 && j.chapter <= chapter
    );
    if (recentJokes.length > 10) {
      warnings.push('High joke density in recent chapters. Ensure emotional beats land.');
    }

    // Check for exhausted gags
    const exhaustedGags = this.state.runningGags.filter(g => g.isExhausted);
    if (exhaustedGags.length > 0) {
      warnings.push(`Exhausted running gags: ${exhaustedGags.map(g => g.description).join(', ')}`);
    }

    // Check callback timing
    const overdueCallbacks = this.state.callbackOpportunities.filter(
      co => co.idealChapter < chapter - 2
    );
    if (overdueCallbacks.length > 0) {
      warnings.push(`Overdue callbacks: ${overdueCallbacks.map(co => co.joke).join(', ')}`);
    }

    return { valid: warnings.length === 0, warnings };
  }

  // Private helpers

  private updateCharacterProfile(name: string, type: HumorType): void {
    const profile = this.getOrCreateCharacterProfile(name);
    if (!profile.comedyStyle.includes(type)) {
      profile.comedyStyle.push(type);
    }
  }

  private checkRunningGagPotential(joke: JokeBeat): void {
    // Check if similar joke exists
    const similarJokes = this.state.jokes.filter(
      j => j.id !== joke.id &&
           j.type === joke.type &&
           j.deliveredBy === joke.deliveredBy &&
           (j.setup.toLowerCase().includes(joke.setup.toLowerCase().slice(0, 10)) ||
            j.punchline.toLowerCase().includes(joke.punchline.toLowerCase().slice(0, 10)))
    );

    if (similarJokes.length >= 1) {
      // Potential running gag
      const existingGag = this.findGagByDescription(joke.setup);
      if (!existingGag) {
        this.addRunningGag(joke.setup, similarJokes[0].chapter);
      }
    }
  }

  private addCallbackOpportunity(joke: JokeBeat, currentChapter: number): void {
    // Generate callback suggestion
    const suggestion = this.generateCallbackSuggestion(joke);

    this.state.callbackOpportunities.push({
      joke: joke.setup,
      suggestedCallback: suggestion,
      idealChapter: currentChapter + Math.floor(Math.random() * 5) + 3, // 3-7 chapters later
    });
  }

  private generateCallbackSuggestion(joke: JokeBeat): string {
    const templates = [
      `Reference "${joke.punchline}" in an unexpected context`,
      `Have another character unknowingly repeat "${joke.setup}"`,
      `Subvert the original with opposite outcome`,
      `Escalate: the same situation, but more extreme`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private updateComedyDensity(chapterWordCount: number): void {
    const totalWords = this.state.jokes.reduce((sum, j) =>
      sum + (j.setup.split(' ').length + j.punchline.split(' ').length), 0
    ) + chapterWordCount;

    const totalJokes = this.state.jokes.length;
    this.state.comedyDensity = (totalJokes / totalWords) * 1000;
  }

  private generateSuggestions(currentChapter: number): string[] {
    const suggestions: string[] = [];

    // Check for callback opportunities
    const dueCallbacks = this.state.callbackOpportunities.filter(
      co => co.idealChapter <= currentChapter + 1 && co.idealChapter >= currentChapter - 1
    );
    for (const cb of dueCallbacks) {
      suggestions.push(`CALLBACK READY: "${cb.joke}" - ${cb.suggestedCallback}`);
    }

    // Check running gag usage
    for (const gag of this.state.runningGags) {
      const lastUse = gag.occurrences[gag.occurrences.length - 1]?.chapter || 0;
      if (currentChapter - lastUse > 5 && !gag.isExhausted) {
        suggestions.push(`Consider using running gag: "${gag.description}"`);
      }
    }

    // Check comedy character usage
    const comedyRelief = this.state.characterProfiles.filter(p => p.isComedyRelief);
    for (const char of comedyRelief) {
      const recentJokes = this.state.jokes.filter(
        j => j.deliveredBy === char.name && j.chapter >= currentChapter - 3
      );
      if (recentJokes.length === 0) {
        suggestions.push(`Comedy relief character "${char.name}" hasn't had a joke recently`);
      }
    }

    return suggestions;
  }
}
