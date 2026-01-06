/**
 * Dialogue Sophistication Analyzer
 *
 * Tracks dialogue quality and character voice:
 * - Subtext detection
 * - Sarcasm patterns
 * - Voice consistency
 * - Dialogue tags and beats
 */

import {
  DialogueExchange,
  CharacterVoice,
  SubtextMoment,
  DialoguePattern,
  DialogueTrackingState,
  GenreExtraction,
} from './types';

/**
 * Create a new dialogue analyzer instance
 */
export function createDialogueAnalyzer(bookId: string): DialogueAnalyzer {
  return new DialogueAnalyzer(bookId);
}

export class DialogueAnalyzer {
  private bookId: string;
  private state: DialogueTrackingState;

  constructor(bookId: string) {
    this.bookId = bookId;
    this.state = {
      exchanges: [],
      characterVoices: [],
      subtextMoments: [],
      patterns: [],
      dialogueQuality: {
        subtextRatio: 0,
        voiceConsistency: 0,
        expositionBalance: 0,
      },
    };
  }

  /**
   * Initialize a character voice profile
   */
  initializeCharacterVoice(
    character: string,
    voice: Omit<CharacterVoice, 'character'>
  ): CharacterVoice {
    const existing = this.state.characterVoices.find(v => v.character === character);
    if (existing) {
      Object.assign(existing, voice);
      return existing;
    }

    const newVoice: CharacterVoice = {
      character,
      ...voice,
    };
    this.state.characterVoices.push(newVoice);
    return newVoice;
  }

  /**
   * Get or create a character voice
   */
  getCharacterVoice(character: string): CharacterVoice {
    let voice = this.state.characterVoices.find(v => v.character === character);
    if (!voice) {
      voice = {
        character,
        vocabularyLevel: 'moderate',
        sentencePatterns: [],
        catchPhrases: [],
        speechQuirks: [],
        formality: 'moderate',
        emotionalExpressiveness: 'moderate',
      };
      this.state.characterVoices.push(voice);
    }
    return voice;
  }

  /**
   * Add a catch phrase for a character
   */
  addCatchPhrase(character: string, phrase: string): void {
    const voice = this.getCharacterVoice(character);
    if (!voice.catchPhrases.includes(phrase)) {
      voice.catchPhrases.push(phrase);
    }
  }

  /**
   * Add a speech quirk for a character
   */
  addSpeechQuirk(character: string, quirk: string): void {
    const voice = this.getCharacterVoice(character);
    if (!voice.speechQuirks.includes(quirk)) {
      voice.speechQuirks.push(quirk);
    }
  }

  /**
   * Record a dialogue exchange
   */
  addExchange(
    exchange: Omit<DialogueExchange, 'chapter'>,
    chapter: number
  ): DialogueExchange {
    const newExchange: DialogueExchange = {
      ...exchange,
      chapter,
    };
    this.state.exchanges.push(newExchange);

    // Update patterns
    this.updatePatterns(exchange);

    return newExchange;
  }

  /**
   * Record a subtext moment
   */
  addSubtextMoment(
    moment: Omit<SubtextMoment, 'chapter'>,
    chapter: number
  ): SubtextMoment {
    const newMoment: SubtextMoment = {
      ...moment,
      chapter,
    };
    this.state.subtextMoments.push(newMoment);

    // Update quality metrics
    this.updateQualityMetrics();

    return newMoment;
  }

  /**
   * Process chapter extraction
   */
  processChapter(
    chapterNumber: number,
    extraction: GenreExtraction
  ): {
    subtextMomentsFound: SubtextMoment[];
    voiceObservations: { character: string; observation: string }[];
    qualityUpdate: typeof this.state.dialogueQuality;
  } {
    const result = {
      subtextMomentsFound: [] as SubtextMoment[],
      voiceObservations: [] as { character: string; observation: string }[],
      qualityUpdate: this.state.dialogueQuality,
    };

    if (!extraction.dialogue) return result;

    // Process subtext moments
    for (const momentData of extraction.dialogue.subtextMoments) {
      const moment = this.addSubtextMoment(momentData, chapterNumber);
      result.subtextMomentsFound.push(moment);
    }

    // Process voice observations
    for (const obs of extraction.dialogue.voiceObservations) {
      result.voiceObservations.push(obs);

      // Update character voice based on observation
      const voice = this.getCharacterVoice(obs.character);

      // Parse observation for voice characteristics
      const obsLower = obs.observation.toLowerCase();

      if (obsLower.includes('formal') || obsLower.includes('proper')) {
        voice.formality = 'formal';
      } else if (obsLower.includes('casual') || obsLower.includes('relaxed')) {
        voice.formality = 'casual';
      }

      if (obsLower.includes('expressive') || obsLower.includes('emotional')) {
        voice.emotionalExpressiveness = 'expressive';
      } else if (obsLower.includes('reserved') || obsLower.includes('stoic')) {
        voice.emotionalExpressiveness = 'reserved';
      }

      if (obsLower.includes('sophisticated') || obsLower.includes('educated')) {
        voice.vocabularyLevel = 'sophisticated';
      } else if (obsLower.includes('simple') || obsLower.includes('plain')) {
        voice.vocabularyLevel = 'simple';
      }
    }

    // Update quality metrics
    this.updateQualityMetrics();
    result.qualityUpdate = this.state.dialogueQuality;

    return result;
  }

  /**
   * Analyze dialogue for subtext
   */
  analyzeForSubtext(
    dialogue: string,
    speaker: string,
    listener: string,
    context: string
  ): {
    hasSubtext: boolean;
    possibleMeaning?: string;
    type?: SubtextMoment['type'];
  } {
    // Simple heuristic analysis for subtext indicators
    const subtextIndicators = {
      threat: [
        /\bwouldn't want\b/i,
        /\bshame if\b/i,
        /\bcareful\b/i,
        /\bwatching\b/i,
        /\baccident\b/i,
      ],
      flirtation: [
        /\balone\b/i,
        /\btogether\b/i,
        /\bdrink\b/i,
        /\bcompany\b/i,
        /\bmiss you\b/i,
      ],
      deception: [
        /\bof course\b/i,
        /\btrust me\b/i,
        /\bhonestly\b/i,
        /\bbelieve me\b/i,
        /\bnothing to worry\b/i,
      ],
      warning: [
        /\bcareful\b/i,
        /\bdon't\b.*\btrust\b/i,
        /\bwatch out\b/i,
        /\bstay away\b/i,
      ],
      emotional: [
        /\bfine\b/i,
        /\bwhatever\b/i,
        /\bdoesn't matter\b/i,
        /\bforget it\b/i,
      ],
    };

    for (const [type, patterns] of Object.entries(subtextIndicators)) {
      for (const pattern of patterns) {
        if (pattern.test(dialogue)) {
          return {
            hasSubtext: true,
            possibleMeaning: `Possible ${type} subtext detected`,
            type: type as SubtextMoment['type'],
          };
        }
      }
    }

    return { hasSubtext: false };
  }

  /**
   * Validate dialogue against character voice
   */
  validateVoice(
    dialogue: string,
    character: string
  ): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const voice = this.state.characterVoices.find(v => v.character === character);
    if (!voice) {
      return { valid: true, issues: [], suggestions: ['No voice profile for character'] };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check vocabulary level
    const complexWords = dialogue.match(/\b\w{10,}\b/g) || [];
    const wordCount = dialogue.split(/\s+/).length;
    const complexRatio = complexWords.length / wordCount;

    if (voice.vocabularyLevel === 'simple' && complexRatio > 0.1) {
      issues.push(`${character} uses simpler vocabulary`);
      suggestions.push('Simplify complex words');
    }
    if (voice.vocabularyLevel === 'sophisticated' && complexRatio < 0.05 && wordCount > 20) {
      issues.push(`${character} speaks more eloquently`);
      suggestions.push('Add more sophisticated vocabulary');
    }

    // Check formality
    const informalIndicators = /\b(gonna|wanna|kinda|sorta|yeah|nah|dunno)\b/gi;
    const hasInformal = informalIndicators.test(dialogue);

    if (voice.formality === 'formal' && hasInformal) {
      issues.push(`${character} speaks formally`);
      suggestions.push('Remove informal contractions');
    }
    if (voice.formality === 'casual' && !hasInformal && wordCount > 15) {
      suggestions.push('Consider adding casual speech patterns');
    }

    // Check for catch phrases
    if (voice.catchPhrases.length > 0) {
      const phraseUsed = voice.catchPhrases.some(phrase =>
        dialogue.toLowerCase().includes(phrase.toLowerCase())
      );
      if (!phraseUsed) {
        suggestions.push(`Consider using catch phrase: "${voice.catchPhrases[0]}"`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Get the current state
   */
  getState(): DialogueTrackingState {
    return this.state;
  }

  /**
   * Generate dialogue summary for context injection
   */
  generateSummary(): string {
    if (this.state.characterVoices.length === 0) {
      return '';
    }

    let summary = '=== DIALOGUE PROFILES ===\n\n';

    // Quality metrics
    summary += 'QUALITY METRICS:\n';
    summary += `  Subtext ratio: ${(this.state.dialogueQuality.subtextRatio * 100).toFixed(0)}%\n`;
    summary += `  Voice consistency: ${(this.state.dialogueQuality.voiceConsistency * 100).toFixed(0)}%\n`;
    summary += `  Exposition balance: ${(this.state.dialogueQuality.expositionBalance * 100).toFixed(0)}%\n\n`;

    // Character voices
    summary += 'CHARACTER VOICES:\n';
    for (const voice of this.state.characterVoices) {
      summary += `\n${voice.character}:\n`;
      summary += `  Vocabulary: ${voice.vocabularyLevel}, Formality: ${voice.formality}\n`;
      summary += `  Expressiveness: ${voice.emotionalExpressiveness}\n`;
      if (voice.catchPhrases.length > 0) {
        summary += `  Catch phrases: "${voice.catchPhrases.join('", "')}"\n`;
      }
      if (voice.speechQuirks.length > 0) {
        summary += `  Quirks: ${voice.speechQuirks.join(', ')}\n`;
      }
    }

    // Recent subtext moments
    const recentSubtext = this.state.subtextMoments.slice(-5);
    if (recentSubtext.length > 0) {
      summary += '\nRECENT SUBTEXT:\n';
      for (const moment of recentSubtext) {
        summary += `  - ${moment.speaker}: "${moment.saidText.slice(0, 30)}..."\n`;
        summary += `    Meant: "${moment.meantText}"\n`;
      }
    }

    // Dialogue patterns
    const significantPatterns = this.state.patterns.filter(p => p.frequency > 2);
    if (significantPatterns.length > 0) {
      summary += '\nDIALOGUE PATTERNS:\n';
      for (const pattern of significantPatterns) {
        summary += `  - ${pattern.type}: ${pattern.frequency} occurrences (${pattern.effectiveness})\n`;
      }
    }

    return summary;
  }

  /**
   * Generate dialogue suggestions
   */
  generateSuggestions(currentChapter: number): string[] {
    const suggestions: string[] = [];

    // Check subtext ratio
    if (this.state.dialogueQuality.subtextRatio < 0.2) {
      suggestions.push('Low subtext ratio. Add more dialogue where characters don\'t say what they mean.');
    }

    // Check voice consistency
    if (this.state.dialogueQuality.voiceConsistency < 0.7) {
      suggestions.push('Voice consistency is low. Ensure characters have distinct speech patterns.');
    }

    // Check for underused catch phrases
    for (const voice of this.state.characterVoices) {
      if (voice.catchPhrases.length > 0) {
        const recentExchanges = this.state.exchanges.filter(
          e => e.chapter >= currentChapter - 5 && e.participants.includes(voice.character)
        );
        if (recentExchanges.length > 3) {
          suggestions.push(`${voice.character}'s catch phrase hasn't appeared recently: "${voice.catchPhrases[0]}"`);
        }
      }
    }

    // Check pattern balance
    const expositionPatterns = this.state.patterns.filter(p => p.type === 'exposition');
    if (expositionPatterns.length > 0 && expositionPatterns[0].frequency > 5) {
      suggestions.push('Heavy exposition in dialogue. Show more, tell less.');
    }

    return suggestions;
  }

  // Private helpers

  private updatePatterns(exchange: DialogueExchange): void {
    // Determine pattern type based on exchange characteristics
    let patternType: DialoguePattern['type'] = 'small_talk';

    if (exchange.tensionLevel > 7) {
      patternType = 'argument';
    } else if (exchange.hasSubtext && exchange.topicReal?.toLowerCase().includes('attract')) {
      patternType = 'seduction';
    } else if (exchange.topicSurface.toLowerCase().includes('explain') ||
               exchange.topicSurface.toLowerCase().includes('tell')) {
      patternType = 'exposition';
    } else if (exchange.topicSurface.toLowerCase().includes('confess') ||
               exchange.topicSurface.toLowerCase().includes('admit')) {
      patternType = 'confession';
    } else if (exchange.tensionLevel > 4) {
      patternType = 'negotiation';
    }

    // Update or add pattern
    const existing = this.state.patterns.find(p => p.type === patternType);
    if (existing) {
      existing.frequency++;
    } else {
      this.state.patterns.push({
        type: patternType,
        frequency: 1,
        effectiveness: 'moderate',
        examples: [],
      });
    }
  }

  private updateQualityMetrics(): void {
    const totalExchanges = this.state.exchanges.length;
    if (totalExchanges === 0) return;

    // Subtext ratio
    const subtextExchanges = this.state.exchanges.filter(e => e.hasSubtext).length;
    this.state.dialogueQuality.subtextRatio = subtextExchanges / totalExchanges;

    // Voice consistency (simplified: check if characters have defined voices)
    const charactersInDialogue = new Set<string>();
    for (const exchange of this.state.exchanges) {
      exchange.participants.forEach(p => charactersInDialogue.add(p));
    }
    const definedVoices = this.state.characterVoices.filter(v =>
      charactersInDialogue.has(v.character)
    ).length;
    this.state.dialogueQuality.voiceConsistency = definedVoices / Math.max(1, charactersInDialogue.size);

    // Exposition balance (lower is better - less exposition)
    const expositionPatterns = this.state.patterns.filter(p => p.type === 'exposition');
    const totalPatterns = this.state.patterns.reduce((sum, p) => sum + p.frequency, 0);
    const expositionFreq = expositionPatterns.reduce((sum, p) => sum + p.frequency, 0);
    this.state.dialogueQuality.expositionBalance = 1 - (expositionFreq / Math.max(1, totalPatterns));
  }
}
