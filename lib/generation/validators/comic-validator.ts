/**
 * Comic Validator - Visual Storytelling Validation
 *
 * Validates comic/graphic novel content for:
 * - Panel pacing and count
 * - Dialogue brevity (25 words per bubble max)
 * - Visual descriptions
 * - Page-turner hooks
 * - No internal monologue (unless thought bubbles)
 */

import { NarrativeValidator } from './narrative-validator';
import { getFormatConfig } from '../atomic/format-config';

export interface ComicValidationReport {
  isValid: boolean;
  format: 'comic';
  corrections: string[];

  panelMetrics: {
    panelCount: number;
    panelsWithDialogue: number;
    panelsWithAction: number;
    averageWordsPerPanel: number;
  };

  dialogueMetrics: {
    bubbleCount: number;
    averageWordsPerBubble: number;
    overlyLongBubbles: number;       // Bubbles > 25 words
    maxBubblesInPanel: number;
  };

  visualMetrics: {
    hasVisualVariety: boolean;
    locationCount: number;
    actionClarity: number;           // 0-1 score
  };

  pageMetrics: {
    hasPageHook: boolean;
    hookStrength: number;            // 0-1 score
    endsOnCliffhanger: boolean;
  };

  narrativeIssues: {
    hasInternalMonologue: boolean;
    internalMonologueInstances: string[];
    hasExcessiveNarration: boolean;
  };

  loopDetected: boolean;
}

export interface ComicPanel {
  panelNumber: number;
  description: string;
  dialogues: string[];
  sfx: string[];
  captions: string[];
}

/**
 * Validate a comic page/beat.
 */
export function validateComicBeat(
  text: string,
  characterNames: string[],
  previousContent: string
): ComicValidationReport {
  const config = getFormatConfig('comic');
  const corrections: string[] = [];

  // Parse comic panels
  const panels = parseComicPanels(text);

  // 1. Panel metrics
  const panelMetrics = analyzePanels(panels);

  if (panels.length < 3) {
    corrections.push(
      `TOO FEW PANELS: ${panels.length} panels. Need at least 3 for visual pacing. ` +
      `Comics tell stories through sequential images.`
    );
  }

  if (panels.length > 7) {
    corrections.push(
      `TOO MANY PANELS: ${panels.length} panels. Max 7 per page for readability. ` +
      `Combine similar moments or move some to the next page.`
    );
  }

  // 2. Dialogue metrics
  const dialogueMetrics = analyzeComicDialogue(panels);

  if (dialogueMetrics.overlyLongBubbles > 0) {
    corrections.push(
      `DIALOGUE TOO LONG: ${dialogueMetrics.overlyLongBubbles} speech bubbles exceed 25 words. ` +
      `Comics require brevity. Split into multiple bubbles or trim.`
    );
  }

  if (dialogueMetrics.maxBubblesInPanel > 2) {
    corrections.push(
      `TOO MANY BUBBLES: One panel has ${dialogueMetrics.maxBubblesInPanel} speech bubbles. ` +
      `Max 2 per panel. Move dialogue to adjacent panels.`
    );
  }

  // 3. Visual metrics
  const visualMetrics = analyzeVisuals(panels);

  if (!visualMetrics.hasVisualVariety && panels.length > 4) {
    corrections.push(
      `VISUAL MONOTONY: All panels appear to be in the same location. ` +
      `Add visual variety: different angles, close-ups, or location shifts.`
    );
  }

  if (visualMetrics.actionClarity < 0.6) {
    corrections.push(
      `UNCLEAR ACTION: Panel descriptions are too vague. ` +
      `Comics are VISUAL. Describe what the reader SEES: poses, expressions, environment.`
    );
  }

  // 4. Page metrics
  const pageMetrics = analyzePageEnding(panels);

  if (!pageMetrics.hasPageHook) {
    corrections.push(
      `WEAK PAGE ENDING: Last panel doesn't create anticipation. ` +
      `End on a question, reveal, cliffhanger, or tension. ` +
      `The page turn should make readers WANT to continue.`
    );
  }

  // 5. Narrative issues
  const narrativeIssues = checkNarrativeIssues(text, panels);

  if (narrativeIssues.hasInternalMonologue) {
    corrections.push(
      `INTERNAL MONOLOGUE: "${narrativeIssues.internalMonologueInstances[0]}". ` +
      `Comics show external action. Use thought bubbles sparingly or show emotion through expression.`
    );
  }

  if (narrativeIssues.hasExcessiveNarration) {
    corrections.push(
      `TOO MUCH NARRATION: Caption boxes are overwhelming the visuals. ` +
      `Comics are visual-first. Show, don't tell. Reduce narration.`
    );
  }

  // 6. Loop detection (visual variety matters)
  const loopDetected = checkComicLoop(panels, previousContent);

  if (loopDetected) {
    corrections.push(
      `VISUAL LOOP: Similar visual beats to previous page. ` +
      `Vary panel compositions, character positions, and emotional beats.`
    );
  }

  return {
    isValid: corrections.length === 0,
    format: 'comic',
    corrections,
    panelMetrics,
    dialogueMetrics,
    visualMetrics,
    pageMetrics,
    narrativeIssues,
    loopDetected,
  };
}

/**
 * Parse comic text into panels.
 */
function parseComicPanels(text: string): ComicPanel[] {
  const panels: ComicPanel[] = [];

  // Common panel markers
  const panelPattern = /(?:PANEL\s*(\d+)|Panel\s*(\d+)|P(\d+))\s*[:\-]?\s*([\s\S]*?)(?=(?:PANEL\s*\d|Panel\s*\d|P\d|$))/gi;

  let match;
  while ((match = panelPattern.exec(text)) !== null) {
    const panelNum = parseInt(match[1] || match[2] || match[3]);
    const content = match[4]?.trim() || '';

    if (content) {
      panels.push(parsePanel(panelNum, content));
    }
  }

  // If no explicit panel markers, try to split by paragraphs
  if (panels.length === 0) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    paragraphs.forEach((para, i) => {
      panels.push(parsePanel(i + 1, para));
    });
  }

  return panels;
}

/**
 * Parse a single panel's content.
 */
function parsePanel(panelNumber: number, content: string): ComicPanel {
  const dialogues: string[] = [];
  const sfx: string[] = [];
  const captions: string[] = [];

  // Extract dialogue (in quotes or after character name)
  const dialogueMatches = content.match(/"[^"]+"/g) || [];
  dialogues.push(...dialogueMatches.map(d => d.replace(/"/g, '')));

  // Also match CHARACTER: "dialogue" pattern
  const namedDialogue = content.match(/[A-Z]+:\s*"?([^"\n]+)"?/g) || [];
  for (const nd of namedDialogue) {
    const text = nd.replace(/^[A-Z]+:\s*"?/, '').replace(/"$/, '');
    if (!dialogues.includes(text)) {
      dialogues.push(text);
    }
  }

  // Extract SFX
  const sfxMatches = content.match(/SFX:\s*([^\n]+)/gi) || [];
  sfx.push(...sfxMatches.map(s => s.replace(/SFX:\s*/i, '')));

  // Also match standalone sound effects (all caps words)
  const standaloneSfx = content.match(/\b([A-Z]{2,}!+)\b/g) || [];
  sfx.push(...standaloneSfx);

  // Extract captions
  const captionMatches = content.match(/CAPTION:\s*([^\n]+)/gi) || [];
  captions.push(...captionMatches.map(c => c.replace(/CAPTION:\s*/i, '')));

  // The description is everything that's not dialogue, SFX, or caption
  let description = content;
  for (const d of [...dialogues, ...sfx, ...captions]) {
    description = description.replace(d, '');
  }
  description = description
    .replace(/SFX:\s*/gi, '')
    .replace(/CAPTION:\s*/gi, '')
    .replace(/"[^"]*"/g, '')
    .replace(/[A-Z]+:\s*/g, '')
    .trim();

  return {
    panelNumber,
    description,
    dialogues,
    sfx,
    captions,
  };
}

/**
 * Analyze panel metrics.
 */
function analyzePanels(panels: ComicPanel[]): ComicValidationReport['panelMetrics'] {
  let panelsWithDialogue = 0;
  let panelsWithAction = 0;
  let totalWords = 0;

  for (const panel of panels) {
    if (panel.dialogues.length > 0) {
      panelsWithDialogue++;
    }

    // Check if panel has action verbs in description
    if (/\b(runs|jumps|grabs|hits|throws|catches|dodges|attacks|defends)\b/i.test(panel.description)) {
      panelsWithAction++;
    }

    // Count words in panel
    const panelText = [panel.description, ...panel.dialogues, ...panel.captions].join(' ');
    totalWords += panelText.split(/\s+/).filter(w => w.length > 0).length;
  }

  return {
    panelCount: panels.length,
    panelsWithDialogue,
    panelsWithAction,
    averageWordsPerPanel: panels.length > 0 ? totalWords / panels.length : 0,
  };
}

/**
 * Analyze dialogue in comic panels.
 */
function analyzeComicDialogue(panels: ComicPanel[]): ComicValidationReport['dialogueMetrics'] {
  let bubbleCount = 0;
  let totalWords = 0;
  let overlyLongBubbles = 0;
  let maxBubblesInPanel = 0;

  for (const panel of panels) {
    bubbleCount += panel.dialogues.length;
    maxBubblesInPanel = Math.max(maxBubblesInPanel, panel.dialogues.length);

    for (const dialogue of panel.dialogues) {
      const words = dialogue.split(/\s+/).filter(w => w.length > 0).length;
      totalWords += words;

      if (words > 25) {
        overlyLongBubbles++;
      }
    }
  }

  return {
    bubbleCount,
    averageWordsPerBubble: bubbleCount > 0 ? totalWords / bubbleCount : 0,
    overlyLongBubbles,
    maxBubblesInPanel,
  };
}

/**
 * Analyze visual variety.
 */
function analyzeVisuals(panels: ComicPanel[]): ComicValidationReport['visualMetrics'] {
  // Extract locations from panel descriptions
  const locations = new Set<string>();
  let actionVerbs = 0;
  let totalDescriptionWords = 0;

  const locationPatterns = [
    /\b(in the|at the|inside|outside|near|by the)\s+(\w+)/gi,
    /\b(room|street|office|house|car|forest|city|building|corridor|hall)/gi,
  ];

  for (const panel of panels) {
    // Find locations
    for (const pattern of locationPatterns) {
      const matches = panel.description.match(pattern) || [];
      matches.forEach(m => locations.add(m.toLowerCase()));
    }

    // Count action verbs for clarity score
    const actionPattern = /\b(stands|sits|runs|walks|looks|turns|reaches|grabs|holds|points|moves|enters|exits)\b/gi;
    const actions = panel.description.match(actionPattern) || [];
    actionVerbs += actions.length;

    totalDescriptionWords += panel.description.split(/\s+/).filter(w => w.length > 0).length;
  }

  // Action clarity: ratio of action verbs to total description words
  const actionClarity = totalDescriptionWords > 0
    ? Math.min(1, (actionVerbs / totalDescriptionWords) * 5)
    : 0;

  return {
    hasVisualVariety: locations.size > 1 || panels.length <= 3,
    locationCount: locations.size,
    actionClarity,
  };
}

/**
 * Analyze page ending for hooks.
 */
function analyzePageEnding(panels: ComicPanel[]): ComicValidationReport['pageMetrics'] {
  if (panels.length === 0) {
    return {
      hasPageHook: false,
      hookStrength: 0,
      endsOnCliffhanger: false,
    };
  }

  const lastPanel = panels[panels.length - 1];
  const fullText = [lastPanel.description, ...lastPanel.dialogues].join(' ');

  // Hook patterns
  const hookPatterns = [
    { pattern: /\?$/, strength: 0.8, type: 'question' },
    { pattern: /\.{3}$|…$/, strength: 0.9, type: 'ellipsis' },
    { pattern: /!$/, strength: 0.7, type: 'exclamation' },
    { pattern: /\b(suddenly|but then|wait|stop|look out|behind you)\b/i, strength: 0.85, type: 'interruption' },
    { pattern: /\b(revealed|appeared|emerged|stood|was)\s+\w+/i, strength: 0.75, type: 'reveal' },
    { pattern: /\b(shadow|figure|silhouette|shape)\b/i, strength: 0.8, type: 'mystery' },
    { pattern: /\b(scream|shot|explosion|crash|boom)\b/i, strength: 0.9, type: 'action' },
  ];

  let maxStrength = 0;
  let hasHook = false;
  let endsOnCliffhanger = false;

  for (const { pattern, strength, type } of hookPatterns) {
    if (pattern.test(fullText)) {
      hasHook = true;
      if (strength > maxStrength) {
        maxStrength = strength;
      }
      if (type === 'ellipsis' || type === 'interruption' || type === 'mystery') {
        endsOnCliffhanger = true;
      }
    }
  }

  return {
    hasPageHook: hasHook,
    hookStrength: maxStrength,
    endsOnCliffhanger,
  };
}

/**
 * Check for narrative issues.
 */
function checkNarrativeIssues(text: string, panels: ComicPanel[]): ComicValidationReport['narrativeIssues'] {
  // Check for internal monologue
  const internalPatterns = [
    /\b(he thought|she thought|they thought)\b/gi,
    /\b(he wondered|she wondered|they wondered)\b/gi,
    /\b(internally|in (his|her|their) mind)\b/gi,
    /\b(he realized|she realized) (that )?/gi,
    /\b(he knew|she knew) (that )?/gi,
  ];

  const internalInstances: string[] = [];
  for (const pattern of internalPatterns) {
    const matches = text.match(pattern) || [];
    internalInstances.push(...matches);
  }

  // Check for excessive narration
  let totalCaptions = 0;
  let totalDialogue = 0;

  for (const panel of panels) {
    totalCaptions += panel.captions.length;
    totalDialogue += panel.dialogues.length;
  }

  const hasExcessiveNarration = totalCaptions > panels.length * 1.5; // More than 1.5 captions per panel

  return {
    hasInternalMonologue: internalInstances.length > 0,
    internalMonologueInstances: internalInstances.slice(0, 3),
    hasExcessiveNarration,
  };
}

/**
 * Check for visual/story loops.
 */
function checkComicLoop(panels: ComicPanel[], previousContent: string): boolean {
  if (!previousContent || previousContent.length < 50) {
    return false;
  }

  // Extract key visual elements from current panels
  const currentElements: string[] = [];
  for (const panel of panels) {
    // Extract nouns from descriptions
    const nouns = panel.description.match(/\b[A-Z][a-z]+\b/g) || [];
    currentElements.push(...nouns);
  }

  // Extract from previous content
  const prevElements = previousContent.match(/\b[A-Z][a-z]+\b/g) || [];

  // Calculate overlap
  const currentSet = new Set(currentElements.map(e => e.toLowerCase()));
  const prevSet = new Set(prevElements.map(e => e.toLowerCase()));

  const intersection = [...currentSet].filter(e => prevSet.has(e));
  const similarity = intersection.length / Math.max(currentSet.size, 1);

  return similarity > 0.5; // 50% overlap = likely loop
}

/**
 * Quick validation for performance.
 */
export function quickValidateComic(
  text: string,
  characterNames: string[]
): { isValid: boolean; primaryIssue: string | null } {
  // Check for internal monologue
  if (/\b(he thought|she thought|he wondered|she wondered|internally)\b/i.test(text)) {
    return {
      isValid: false,
      primaryIssue: 'Contains internal monologue',
    };
  }

  // Quick panel count check
  const panelMatches = text.match(/PANEL\s*\d|Panel\s*\d|P\d/gi) || [];
  if (panelMatches.length > 0 && panelMatches.length > 7) {
    return {
      isValid: false,
      primaryIssue: `Too many panels: ${panelMatches.length}`,
    };
  }

  return { isValid: true, primaryIssue: null };
}

// Note: ComicValidationReport and ComicPanel are exported at their definitions
