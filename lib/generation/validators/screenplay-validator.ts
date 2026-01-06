/**
 * Screenplay Validator - Script Format Validation
 *
 * Validates screenplay content for:
 * - Format compliance (sluglines, action, dialogue)
 * - Action line brevity
 * - Dialogue authenticity (subtext, no on-the-nose)
 * - Camera direction removal
 * - Parenthetical limits
 */

import { NarrativeValidator, type ValidationReport as BaseReport } from './narrative-validator';
import { getFormatConfig } from '../atomic/format-config';

export interface ScreenplayValidationReport {
  isValid: boolean;
  format: 'screenplay';
  corrections: string[];

  formatCompliance: {
    hasProperSluglines: boolean;
    invalidSluglines: string[];
    hasCameraDirections: boolean;
    cameraDirectionsFound: string[];
    hasWeSee: boolean;
    weSeeInstances: string[];
  };

  actionMetrics: {
    averageSentencesPerBlock: number;
    overlyLongBlocks: number;        // Blocks with > 3 sentences
    participialStarts: number;       // "Walking to the door, he..."
  };

  dialogueMetrics: {
    averageLinesPerSpeech: number;
    monologues: number;              // Speeches > 4 lines
    onTheNoseInstances: string[];
    parentheticalCount: number;
  };

  loopDetected: boolean;
  loopSimilarity: number;
}

interface ScreenplayElement {
  type: 'slugline' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition';
  content: string;
  lineNumber: number;
}

/**
 * Validate a screenplay beat.
 */
export function validateScreenplayBeat(
  text: string,
  characterNames: string[],
  previousContent: string
): ScreenplayValidationReport {
  const config = getFormatConfig('screenplay');
  const corrections: string[] = [];

  // Parse screenplay elements
  const elements = parseScreenplayElements(text);

  // 1. Format compliance
  const formatCompliance = checkFormatCompliance(text, elements);

  if (formatCompliance.hasCameraDirections) {
    corrections.push(
      `CAMERA DIRECTIONS: Remove "${formatCompliance.cameraDirectionsFound[0]}". ` +
      `Describe what IS, not what "we see" or camera angles. ` +
      `Directors handle camera. Writers handle story.`
    );
  }

  if (formatCompliance.hasWeSee) {
    corrections.push(
      `"WE SEE" DETECTED: Remove "${formatCompliance.weSeeInstances[0]}". ` +
      `Instead of "We see a man enter", write "A MAN enters".`
    );
  }

  if (formatCompliance.invalidSluglines.length > 0) {
    corrections.push(
      `INVALID SLUGLINE: "${formatCompliance.invalidSluglines[0]}". ` +
      `Use format: INT./EXT. LOCATION - DAY/NIGHT`
    );
  }

  // 2. Action line analysis
  const actionMetrics = analyzeActionLines(elements);

  if (actionMetrics.overlyLongBlocks > 0) {
    corrections.push(
      `ACTION BLOCKS TOO LONG: ${actionMetrics.overlyLongBlocks} blocks exceed 3 sentences. ` +
      `Keep action punchy. Max 3 sentences per block. ` +
      `Break up with white space or dialogue.`
    );
  }

  if (actionMetrics.participialStarts > 2) {
    corrections.push(
      `PARTICIPIAL OVERUSE: ${actionMetrics.participialStarts} action lines start with "-ing" phrases. ` +
      `Avoid "Walking to the door, he..." - use direct action: "He walks to the door."`
    );
  }

  // 3. Dialogue analysis
  const dialogueMetrics = analyzeDialogueElements(elements);

  if (dialogueMetrics.monologues > 0) {
    corrections.push(
      `DIALOGUE TOO LONG: ${dialogueMetrics.monologues} speeches exceed 4 lines. ` +
      `Characters shouldn't monologue. Break up with action or interruption.`
    );
  }

  if (dialogueMetrics.onTheNoseInstances.length > 0) {
    corrections.push(
      `ON-THE-NOSE DIALOGUE: "${dialogueMetrics.onTheNoseInstances[0]}". ` +
      `Characters shouldn't state feelings directly. Use subtext. ` +
      `Show emotion through action, not "I feel angry."`
    );
  }

  const pageEstimate = estimatePages(text);
  if (dialogueMetrics.parentheticalCount > pageEstimate * 2) {
    corrections.push(
      `TOO MANY PARENTHETICALS: ${dialogueMetrics.parentheticalCount} in ~${pageEstimate} pages. ` +
      `Max 2 per page. Show emotion through dialogue and action, not direction.`
    );
  }

  // 4. Loop detection
  const { isLoop, similarity } = NarrativeValidator['detectLoop'](text, previousContent);

  if (isLoop) {
    corrections.push(
      `SCENE LOOP: ${(similarity * 100).toFixed(0)}% similarity with previous content. ` +
      `Move the story forward. New conflict, new information, or escalation required.`
    );
  }

  return {
    isValid: corrections.length === 0,
    format: 'screenplay',
    corrections,
    formatCompliance,
    actionMetrics,
    dialogueMetrics,
    loopDetected: isLoop,
    loopSimilarity: similarity,
  };
}

/**
 * Parse screenplay text into elements.
 */
function parseScreenplayElements(text: string): ScreenplayElement[] {
  const elements: ScreenplayElement[] = [];
  const lines = text.split('\n');

  let lineNumber = 0;
  let currentDialogueCharacter = '';

  for (const line of lines) {
    lineNumber++;
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Slugline (scene heading)
    if (/^(INT\.|EXT\.|INT\.\/EXT\.)\s+/i.test(trimmed)) {
      elements.push({ type: 'slugline', content: trimmed, lineNumber });
      continue;
    }

    // Transition
    if (/^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:|SMASH CUT TO:)$/i.test(trimmed)) {
      elements.push({ type: 'transition', content: trimmed, lineNumber });
      continue;
    }

    // Character cue (all caps, might have extension)
    if (/^[A-Z][A-Z\s]+(\s*\(.*\))?$/.test(trimmed) && trimmed.length < 50) {
      elements.push({ type: 'character', content: trimmed, lineNumber });
      currentDialogueCharacter = trimmed;
      continue;
    }

    // Parenthetical
    if (/^\(.*\)$/.test(trimmed)) {
      elements.push({ type: 'parenthetical', content: trimmed, lineNumber });
      continue;
    }

    // Check if we're in a dialogue context (after character cue)
    const prevElement = elements[elements.length - 1];
    if (prevElement && (prevElement.type === 'character' || prevElement.type === 'parenthetical' || prevElement.type === 'dialogue')) {
      // This is dialogue
      elements.push({ type: 'dialogue', content: trimmed, lineNumber });
      continue;
    }

    // Default: action line
    elements.push({ type: 'action', content: trimmed, lineNumber });
  }

  return elements;
}

/**
 * Check format compliance.
 */
function checkFormatCompliance(text: string, elements: ScreenplayElement[]): ScreenplayValidationReport['formatCompliance'] {
  const sluglines = elements.filter(e => e.type === 'slugline');
  const invalidSluglines: string[] = [];

  // Validate slugline format
  const sluglinePattern = /^(INT\.|EXT\.|INT\.\/EXT\.)\s+.+\s+-\s+(DAY|NIGHT|CONTINUOUS|LATER|MORNING|EVENING|DUSK|DAWN|SAME)$/i;
  for (const sl of sluglines) {
    if (!sluglinePattern.test(sl.content)) {
      invalidSluglines.push(sl.content);
    }
  }

  // Check for camera directions
  const cameraPatterns = [
    /\b(camera|pan|tilt|zoom|dolly|tracking shot|crane shot)\b/gi,
    /\b(close on|wide shot|angle on|pov|point of view)\b/gi,
    /\b(cut to|dissolve to|fade to|smash cut)\b/gi,
  ];

  const cameraDirectionsFound: string[] = [];
  for (const pattern of cameraPatterns) {
    const matches = text.match(pattern) || [];
    cameraDirectionsFound.push(...matches);
  }

  // Check for "we see" / "we hear"
  const weSeePattern = /\b(we see|we hear|we notice|we watch|we observe|the audience sees)\b/gi;
  const weSeeMatches = text.match(weSeePattern) || [];

  return {
    hasProperSluglines: invalidSluglines.length === 0,
    invalidSluglines,
    hasCameraDirections: cameraDirectionsFound.length > 0,
    cameraDirectionsFound: [...new Set(cameraDirectionsFound)],
    hasWeSee: weSeeMatches.length > 0,
    weSeeInstances: weSeeMatches,
  };
}

/**
 * Analyze action lines.
 */
function analyzeActionLines(elements: ScreenplayElement[]): ScreenplayValidationReport['actionMetrics'] {
  const actionBlocks = elements.filter(e => e.type === 'action');

  let totalSentences = 0;
  let overlyLongBlocks = 0;
  let participialStarts = 0;

  for (const block of actionBlocks) {
    const sentences = block.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    totalSentences += sentences.length;

    if (sentences.length > 3) {
      overlyLongBlocks++;
    }

    // Check for participial starts
    if (/^(Walking|Running|Moving|Looking|Turning|Reaching|Grabbing|Pulling|Pushing)\b/i.test(block.content)) {
      participialStarts++;
    }
  }

  return {
    averageSentencesPerBlock: actionBlocks.length > 0 ? totalSentences / actionBlocks.length : 0,
    overlyLongBlocks,
    participialStarts,
  };
}

/**
 * Analyze dialogue elements.
 */
function analyzeDialogueElements(elements: ScreenplayElement[]): ScreenplayValidationReport['dialogueMetrics'] {
  const dialogues = elements.filter(e => e.type === 'dialogue');
  const parentheticals = elements.filter(e => e.type === 'parenthetical');

  // Group dialogues by character (consecutive dialogues = one speech)
  let currentSpeech: string[] = [];
  const speeches: string[] = [];
  let prevWasDialogue = false;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];

    if (el.type === 'dialogue' || el.type === 'parenthetical') {
      if (el.type === 'dialogue') {
        currentSpeech.push(el.content);
      }
      prevWasDialogue = true;
    } else if (prevWasDialogue && el.type === 'character') {
      // New character, save previous speech
      if (currentSpeech.length > 0) {
        speeches.push(currentSpeech.join(' '));
        currentSpeech = [];
      }
      prevWasDialogue = false;
    } else {
      // Non-dialogue element
      if (currentSpeech.length > 0) {
        speeches.push(currentSpeech.join(' '));
        currentSpeech = [];
      }
      prevWasDialogue = false;
    }
  }

  // Don't forget last speech
  if (currentSpeech.length > 0) {
    speeches.push(currentSpeech.join(' '));
  }

  // Calculate metrics
  const speechLines = speeches.map(s => {
    // Estimate lines (roughly 40 chars per line in screenplays)
    return Math.ceil(s.length / 40);
  });

  const averageLinesPerSpeech = speechLines.length > 0
    ? speechLines.reduce((a, b) => a + b, 0) / speechLines.length
    : 0;

  const monologues = speechLines.filter(lines => lines > 4).length;

  // Check for on-the-nose dialogue
  const onTheNosePatterns = [
    /I feel (so )?(angry|sad|happy|scared|confused|hurt|betrayed)/i,
    /I('m| am) (really )?(angry|sad|happy|scared|confused|hurt)/i,
    /You make me feel/i,
    /I need you to understand/i,
    /What I('m| am) trying to say is/i,
    /The truth is/i,
    /I have to tell you something important/i,
    /Let me explain/i,
    /I want you to know that/i,
    /I realize now that/i,
  ];

  const onTheNoseInstances: string[] = [];
  for (const speech of speeches) {
    for (const pattern of onTheNosePatterns) {
      if (pattern.test(speech)) {
        const match = speech.match(pattern);
        if (match) {
          onTheNoseInstances.push(match[0]);
        }
        break;
      }
    }
  }

  return {
    averageLinesPerSpeech,
    monologues,
    onTheNoseInstances,
    parentheticalCount: parentheticals.length,
  };
}

/**
 * Estimate page count (rough: ~200 words per page for screenplays).
 */
function estimatePages(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Quick validation for performance-critical paths.
 */
export function quickValidateScreenplay(
  text: string,
  characterNames: string[]
): { isValid: boolean; primaryIssue: string | null } {
  // Check for camera directions (most common issue)
  if (/\b(we see|we hear|camera|pan to|close on)\b/i.test(text)) {
    return {
      isValid: false,
      primaryIssue: 'Contains camera directions or "we see"',
    };
  }

  // Check for overly long action blocks
  const actionParagraphs = text.split(/\n\n+/);
  for (const para of actionParagraphs) {
    if (!/^[A-Z]/.test(para)) continue; // Skip dialogue
    const sentences = para.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 4) {
      return {
        isValid: false,
        primaryIssue: 'Action block exceeds 4 sentences',
      };
    }
  }

  return { isValid: true, primaryIssue: null };
}

// Note: ScreenplayValidationReport is exported at its definition
