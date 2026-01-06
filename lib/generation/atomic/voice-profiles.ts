/**
 * Voice Profile System
 *
 * Character dialogue fingerprinting that ENFORCES voice consistency.
 * Each character has a dialogue fingerprint. When generating dialogue,
 * we validate it matches their profile. Violations trigger surgical retries.
 *
 * FORMAT-AWARE: Adapts validation based on content format:
 * - TEXT (novels): Full validation, detailed fingerprinting
 * - VISUAL (comics): Simpler validation, max 25 words per dialogue
 * - SCREENPLAY: Full validation, no internal monologue, subtext focus
 */

import { FormatCategory } from './format-behavioral';

export interface CharacterVoiceProfile {
  name: string;

  // Sentence structure
  sentenceLengthAvg: number;        // Target average word count per sentence
  sentenceLengthVariance: number;   // How much they vary (stdDev)

  // Personality markers
  sarcasmLevel: number;             // 0-1, how often they use sarcasm
  vocabularyTier: 'Simple' | 'Moderate' | 'High/Clinical' | 'Technical' | 'Poetic';
  formality: number;                // 0-1, casual to formal

  // Speech patterns
  contractions: boolean;            // Uses "don't" vs "do not"
  questions: 'rare' | 'moderate' | 'frequent';
  exclamations: 'rare' | 'moderate' | 'frequent';

  // Character-specific
  trait: 'Direct' | 'Evasive' | 'Verbose' | 'Terse' | 'Diplomatic' | 'Blunt';
  catchPhrases: string[];           // Recurring phrases
  bannedWords: string[];            // Words they would NEVER say
  favoriteWords: string[];          // Words they use often

  // Emotional expression
  emotionalOpenness: number;        // 0-1, how readily they express feelings
  deflectsWithHumor: boolean;
}

export interface VoiceValidationResult {
  valid: boolean;
  violations: string[];
  suggestions: string[];
  confidence: number;               // 0-1, how confident we are in the assessment
}

/**
 * Store for character voice profiles
 */
const CHARACTER_PROFILES: Map<string, Map<string, CharacterVoiceProfile>> = new Map();

/**
 * Register a voice profile for a character
 */
export function registerVoiceProfile(
  bookId: string,
  profile: CharacterVoiceProfile
): void {
  if (!CHARACTER_PROFILES.has(bookId)) {
    CHARACTER_PROFILES.set(bookId, new Map());
  }
  CHARACTER_PROFILES.get(bookId)!.set(profile.name.toLowerCase(), profile);
}

/**
 * Get a voice profile
 */
export function getVoiceProfile(
  bookId: string,
  characterName: string
): CharacterVoiceProfile | undefined {
  return CHARACTER_PROFILES.get(bookId)?.get(characterName.toLowerCase());
}

/**
 * Get all voice profiles for a book
 */
export function getAllVoiceProfiles(
  bookId: string
): CharacterVoiceProfile[] {
  const profiles = CHARACTER_PROFILES.get(bookId);
  return profiles ? Array.from(profiles.values()) : [];
}

/**
 * Build voice profile from character description (at book creation)
 */
export function buildVoiceProfile(
  name: string,
  description: string,
  backstory: string = ''
): CharacterVoiceProfile {
  const fullText = `${description} ${backstory}`.toLowerCase();

  // Analyze description for voice markers
  const isEducated = /professor|doctor|lawyer|scientist|intellectual|scholar|phd|academic/i.test(fullText);
  const isCasual = /laid-back|easygoing|friendly|warm|relaxed|chill|approachable/i.test(fullText);
  const isSarcastic = /sarcastic|cynical|witty|dry humor|sardonic|ironic/i.test(fullText);
  const isTerse = /quiet|reserved|stoic|man of few words|woman of few words|laconic|taciturn/i.test(fullText);
  const isVerbose = /talkative|chatty|loves to talk|verbose|loquacious|rambling/i.test(fullText);
  const isEmotional = /emotional|passionate|expressive|dramatic|sensitive/i.test(fullText);
  const isCold = /cold|distant|detached|aloof|unemotional|ice/i.test(fullText);
  const isTechnical = /engineer|programmer|scientist|analyst|technical/i.test(fullText);
  const isPoetic = /poet|artist|romantic|dreamer|creative|writer/i.test(fullText);
  const isBlunt = /blunt|direct|straightforward|no-nonsense|honest|frank/i.test(fullText);
  const isDiplomatic = /diplomatic|tactful|political|careful|measured/i.test(fullText);

  // Determine vocabulary tier
  let vocabularyTier: CharacterVoiceProfile['vocabularyTier'] = 'Moderate';
  if (isTechnical) vocabularyTier = 'Technical';
  else if (isPoetic) vocabularyTier = 'Poetic';
  else if (isEducated) vocabularyTier = 'High/Clinical';
  else if (isCasual || isTerse) vocabularyTier = 'Simple';

  // Determine trait
  let trait: CharacterVoiceProfile['trait'] = 'Direct';
  if (isTerse) trait = 'Terse';
  else if (isVerbose) trait = 'Verbose';
  else if (isSarcastic || isCold) trait = 'Evasive';
  else if (isDiplomatic) trait = 'Diplomatic';
  else if (isBlunt) trait = 'Blunt';

  return {
    name,
    sentenceLengthAvg: isTerse ? 6 : isVerbose ? 18 : 12,
    sentenceLengthVariance: isTerse ? 2 : isVerbose ? 5 : 3,
    sarcasmLevel: isSarcastic ? 0.8 : isCold ? 0.4 : 0.2,
    vocabularyTier,
    formality: isEducated ? 0.7 : isCasual ? 0.3 : 0.5,
    contractions: !isEducated || isCasual,
    questions: isSarcastic ? 'frequent' : isTerse ? 'rare' : 'moderate',
    exclamations: isEmotional ? 'frequent' : isCold ? 'rare' : 'moderate',
    trait,
    catchPhrases: [],
    bannedWords: [],
    favoriteWords: [],
    emotionalOpenness: isEmotional ? 0.8 : isCold ? 0.2 : 0.5,
    deflectsWithHumor: isSarcastic,
  };
}

/**
 * Validate dialogue matches character voice profile
 * Optional format parameter for format-aware validation
 */
export function validateCharacterVoice(
  dialogue: string,
  character: string,
  profile: CharacterVoiceProfile,
  format: FormatCategory = 'text'
): VoiceValidationResult {
  const violations: string[] = [];
  const suggestions: string[] = [];
  let confidence = 0.8;

  // Skip validation for very short dialogue
  if (dialogue.length < 20) {
    return { valid: true, violations: [], suggestions: [], confidence: 0.5 };
  }

  const wordCount = dialogue.split(/\s+/).length;
  const sentences = dialogue.split(/[.!?]+/).filter(s => s.trim().length > 3);

  // FORMAT-SPECIFIC VALIDATION
  // Visual (comics): Max 25 words per dialogue
  if (format === 'visual') {
    if (wordCount > 25) {
      violations.push(
        `Comic dialogue too long: ${wordCount} words (max 25). Comics are visual-first.`
      );
      suggestions.push('Break into multiple speech bubbles or condense significantly');
    }
    // Simpler validation for comics - skip detailed fingerprinting
    if (wordCount <= 25 && violations.length === 0) {
      return { valid: true, violations: [], suggestions, confidence: 0.7 };
    }
  }

  // Screenplay: Check for on-the-nose patterns
  if (format === 'screenplay') {
    const onTheNosePatterns = [
      { pattern: /\bI feel (so )?(angry|sad|happy|scared|confused|frustrated)\b/i, message: 'stating feelings directly' },
      { pattern: /\bI am (really )?(angry|sad|happy|scared|confused|frustrated)\b/i, message: 'stating feelings directly' },
      { pattern: /\bYou make me feel\b/i, message: 'explaining emotional impact' },
      { pattern: /\bI need you to understand\b/i, message: 'exposition through dialogue' },
      { pattern: /\bLet me explain\b/i, message: 'exposition through dialogue' },
      { pattern: /\bThe truth is\b/i, message: 'exposition through dialogue' },
      { pattern: /\bWhat I('m| am) trying to say is\b/i, message: 'over-explaining' },
    ];

    for (const { pattern, message } of onTheNosePatterns) {
      if (pattern.test(dialogue)) {
        violations.push(
          `On-the-nose dialogue: ${message}. Screen characters reveal through action and subtext.`
        );
        break;
      }
    }

    // Screenplay dialogue should be speakable
    if (wordCount > 50) {
      suggestions.push(
        `Long dialogue (${wordCount} words). Screen dialogue should be punchy. Consider breaking up with action beats.`
      );
    }
  }

  // Check banned words
  for (const banned of profile.bannedWords) {
    if (new RegExp(`\\b${escapeRegex(banned)}\\b`, 'i').test(dialogue)) {
      violations.push(`${character} would never say "${banned}"`);
    }
  }

  // Check vocabulary tier
  const complexWords = countComplexWords(dialogue);
  const complexityRatio = complexWords / wordCount;

  if (profile.vocabularyTier === 'Simple' && complexityRatio > 0.15) {
    violations.push(`${character} uses simpler vocabulary. Found ${complexWords} complex words in ${wordCount} words.`);
    suggestions.push('Replace complex words with simpler alternatives');
  }
  if (profile.vocabularyTier === 'High/Clinical' && complexityRatio < 0.1 && wordCount > 20) {
    violations.push(`${character} speaks more clinically/formally.`);
    suggestions.push('Add more precise or technical terminology');
  }

  // Check contractions
  const contractionPattern = /\b(don't|won't|can't|couldn't|shouldn't|wouldn't|I'm|you're|he's|she's|it's|we're|they're|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|didn't|doesn't)\b/gi;
  const contractions = dialogue.match(contractionPattern) || [];
  const hasContractions = contractions.length > 0;

  if (profile.contractions === false && hasContractions) {
    violations.push(`${character} avoids contractions. Found: ${contractions.join(', ')}`);
    suggestions.push('Expand contractions to full forms');
  }
  if (profile.contractions === true && !hasContractions && wordCount > 30) {
    suggestions.push(`${character} uses contractions naturally. Consider adding some.`);
  }

  // Check sarcasm level
  if (profile.sarcasmLevel < 0.2) {
    const sarcasmPatterns = /\b(oh really|sure thing|right|whatever|totally|of course|brilliant|great job|how surprising|wow)\b/i;
    if (sarcasmPatterns.test(dialogue)) {
      violations.push(`${character} is not typically sarcastic. Rephrase sincerely.`);
    }
  }

  // Check emotional openness
  if (profile.emotionalOpenness < 0.3) {
    const emotionalPatterns = /\b(I feel|I love|I'm scared|I'm worried|it hurts|I'm afraid|I'm so|I need you|I miss)\b/i;
    if (emotionalPatterns.test(dialogue)) {
      violations.push(`${character} doesn't express feelings directly. Show through action or deflection instead.`);
      if (profile.deflectsWithHumor) {
        suggestions.push('Have the character deflect with humor instead');
      }
    }
  }

  // Check sentence length against trait
  if (sentences.length > 0) {
    const avgLength = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;

    if (profile.trait === 'Terse' && avgLength > 10) {
      violations.push(`${character} speaks tersely. Sentences average ${avgLength.toFixed(1)} words, should be under 10.`);
      suggestions.push('Shorten sentences, remove filler words');
    }
    if (profile.trait === 'Verbose' && avgLength < 12 && wordCount > 40) {
      suggestions.push(`${character} tends to be verbose. Consider longer, more elaborate sentences.`);
    }
  }

  // Check formality
  if (profile.formality > 0.6) {
    const informalPatterns = /\b(gonna|wanna|kinda|sorta|yeah|nah|dunno|ain't|y'all|gotta|lemme)\b/gi;
    const informalMatches = dialogue.match(informalPatterns) || [];
    if (informalMatches.length > 0) {
      violations.push(`${character} speaks formally. Remove: ${informalMatches.join(', ')}`);
    }
  }

  // Lower confidence if dialogue is edge case length
  if (wordCount < 10) confidence = 0.5;
  if (wordCount > 100) confidence = 0.9;

  return {
    valid: violations.length === 0,
    violations,
    suggestions,
    confidence,
  };
}

/**
 * Validate all dialogue in a text block
 * Optional format parameter for format-aware validation
 */
export function validateAllDialogue(
  content: string,
  bookId: string,
  format: FormatCategory = 'text'
): {
  valid: boolean;
  allViolations: { character: string; violations: string[] }[];
  feedback: string;
} {
  const profiles = getAllVoiceProfiles(bookId);
  if (profiles.length === 0) {
    return { valid: true, allViolations: [], feedback: '' };
  }

  const allViolations: { character: string; violations: string[] }[] = [];

  // Extract dialogue with attribution
  // Simplified pattern - matches "Character said" or "said Character" patterns
  const dialoguePattern = /"([^"]+)"\s*(?:,?\s*(?:said|replied|asked|answered|exclaimed|whispered|shouted|muttered|called|yelled|screamed|insisted|demanded|suggested|warned|added|continued)\s+)?(\w+)/gi;

  let match;
  while ((match = dialoguePattern.exec(content)) !== null) {
    const dialogue = match[1];
    const possibleCharacter = match[2];

    // Find matching profile
    const profile = profiles.find(p =>
      p.name.toLowerCase() === possibleCharacter.toLowerCase()
    );

    if (profile) {
      const result = validateCharacterVoice(dialogue, profile.name, profile, format);
      if (!result.valid) {
        allViolations.push({
          character: profile.name,
          violations: result.violations,
        });
      }
    }
  }

  if (allViolations.length === 0) {
    return { valid: true, allViolations: [], feedback: '' };
  }

  let feedback = '\n=== VOICE VIOLATIONS ===\n';
  for (const v of allViolations) {
    feedback += `\n${v.character}:\n`;
    for (const violation of v.violations) {
      feedback += `  - ${violation}\n`;
    }
  }

  return { valid: false, allViolations, feedback };
}

/**
 * Generate voice profile summary for prompt injection
 */
export function generateVoiceProfileSummary(bookId: string): string {
  const profiles = getAllVoiceProfiles(bookId);
  if (profiles.length === 0) return '';

  let summary = '\n=== CHARACTER VOICE PROFILES ===\n';
  summary += 'Maintain these voice characteristics for each character:\n\n';

  for (const profile of profiles) {
    summary += `${profile.name.toUpperCase()}:\n`;
    summary += `  Speech style: ${profile.trait}\n`;
    summary += `  Vocabulary: ${profile.vocabularyTier}\n`;
    summary += `  Formality: ${profile.formality > 0.6 ? 'Formal' : profile.formality < 0.4 ? 'Casual' : 'Moderate'}\n`;
    summary += `  Contractions: ${profile.contractions ? 'Yes' : 'No'}\n`;
    summary += `  Emotional expression: ${profile.emotionalOpenness > 0.6 ? 'Open' : profile.emotionalOpenness < 0.4 ? 'Reserved' : 'Moderate'}\n`;

    if (profile.bannedWords.length > 0) {
      summary += `  NEVER says: "${profile.bannedWords.join('", "')}"\n`;
    }
    if (profile.catchPhrases.length > 0) {
      summary += `  Catch phrases: "${profile.catchPhrases.join('", "')}"\n`;
    }
    if (profile.deflectsWithHumor) {
      summary += `  Note: Deflects emotional topics with humor\n`;
    }
    summary += '\n';
  }

  return summary;
}

// Helper functions

function countComplexWords(text: string): number {
  const words = text.split(/\s+/);
  return words.filter(w => {
    // Count syllables roughly
    const syllables = w.toLowerCase().replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/g, '').match(/[aeiouy]{1,2}/g);
    return (syllables?.length || 0) >= 3 || w.length > 10;
  }).length;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
