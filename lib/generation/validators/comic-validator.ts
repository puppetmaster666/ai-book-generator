/**
 * Comic Validator - Visual Storytelling Validation
 *
 * Validates comic/graphic novel content for:
 * - Panel pacing and count
 * - Dialogue brevity (25 words per bubble max)
 * - Visual descriptions
 * - Page-turner hooks
 * - No internal monologue (unless thought bubbles)
 * - Visual tic repetition (crossed arms, fist clench, etc.)
 * - On-the-nose dialogue in speech bubbles
 */

import { NarrativeValidator } from './narrative-validator';
import { getFormatConfig } from '../atomic/format-config';

// ============================================================================
// VISUAL TIC PATTERNS - Detect overused visual actions in comics
// ============================================================================

export interface VisualTicPattern {
  name: string;
  pattern: RegExp;
  maxPerPage: number;    // Per page limit
  maxPerComic: number;   // Per entire comic limit
}

/**
 * Visual tics that AI tends to overuse in comic panels.
 * These are valid actions but become clichéd when repeated.
 */
export const COMIC_VISUAL_TICS: VisualTicPattern[] = [
  // Body language tics
  { name: 'crossed_arms', pattern: /(cross(es|ed|ing)?|fold(s|ed|ing)?)\s+(his|her|their)?\s*arms/gi, maxPerPage: 1, maxPerComic: 3 },
  { name: 'fist_clench', pattern: /clench(es|ed|ing)?\s+(his|her|their)?\s*(fist|fists|hands)/gi, maxPerPage: 1, maxPerComic: 4 },
  { name: 'arms_akimbo', pattern: /hands?\s+(on\s+)?(his|her|their)?\s*(hip|hips)/gi, maxPerPage: 1, maxPerComic: 2 },
  { name: 'pointing', pattern: /point(s|ed|ing)?\s+(a\s+)?(his|her|their)?\s*(finger|accusingly|dramatically)/gi, maxPerPage: 1, maxPerComic: 3 },

  // Facial expressions overused
  { name: 'wide_eyes', pattern: /(eyes?\s+widen|wide[- ]eyed|eyes?\s+go\s+wide)/gi, maxPerPage: 1, maxPerComic: 4 },
  { name: 'jaw_drop', pattern: /(jaw\s+drop|mouth\s+(hangs?\s+)?open|gaping)/gi, maxPerPage: 1, maxPerComic: 3 },
  { name: 'gritted_teeth', pattern: /(grit(s|ted|ting)?\s+(his|her|their)?\s*teeth|teeth\s+gritted)/gi, maxPerPage: 1, maxPerComic: 3 },
  { name: 'raised_eyebrow', pattern: /(raise[sd]?\s+(an?\s+)?eyebrow|eyebrow\s+raise[sd]?|arched?\s+eyebrow)/gi, maxPerPage: 1, maxPerComic: 3 },

  // Manga-style visual clichés
  { name: 'sweat_drop', pattern: /(sweat\s*drop|bead[s]?\s+of\s+sweat|sweating|sweat\s+(beads?|trickles?))/gi, maxPerPage: 1, maxPerComic: 2 },
  { name: 'vein_pop', pattern: /(vein\s+(pop|throb|bulge)|anger\s+mark)/gi, maxPerPage: 1, maxPerComic: 2 },
  { name: 'sparkle_eyes', pattern: /(eyes?\s+sparkle|sparkl(e|ing)\s+eyes?|starry[- ]eyed)/gi, maxPerPage: 1, maxPerComic: 2 },

  // Pose clichés
  { name: 'dramatic_pose', pattern: /(strikes?\s+a\s+pose|dramatic\s+pose|hero(ic)?\s+pose|power\s+pose)/gi, maxPerPage: 1, maxPerComic: 2 },
  { name: 'back_turned', pattern: /(back\s+turned|turns?\s+(his|her|their)?\s*back|facing\s+away)/gi, maxPerPage: 1, maxPerComic: 3 },
  { name: 'looking_away', pattern: /(look(s|ing)?\s+away|avert(s|ed|ing)?\s+(his|her|their)?\s*(gaze|eyes?))/gi, maxPerPage: 1, maxPerComic: 3 },

  // Action clichés
  { name: 'shadow_looms', pattern: /(shadow\s+(looms?|falls?)|looming\s+shadow|cast(s|ing)?\s+a\s+shadow)/gi, maxPerPage: 1, maxPerComic: 2 },
  { name: 'slow_motion', pattern: /(slow[- ]motion|time\s+(slows?|freeze)|frozen\s+moment)/gi, maxPerPage: 1, maxPerComic: 2 },
];

/**
 * On-the-nose dialogue patterns for comics.
 * Characters stating emotions directly instead of showing through art.
 */
export const COMIC_ON_THE_NOSE_PATTERNS: RegExp[] = [
  // Direct emotion statements
  /I('m| am)\s+(so\s+)?(angry|mad|furious|scared|terrified|sad|happy|confused|shocked)/gi,
  /I\s+feel\s+(so\s+)?(angry|sad|happy|scared|betrayed|hurt|confused)/gi,
  /You\s+make\s+me\s+feel/gi,
  /I('m| am)\s+feeling/gi,

  // Explaining obvious actions
  /I\s+(can't|cannot)\s+believe\s+(this|what|that)/gi,
  /This\s+(can't|cannot)\s+be\s+happening/gi,
  /What('s| is)\s+happening\s+to\s+me/gi,

  // Mood exposition
  /I\s+need\s+to\s+calm\s+down/gi,
  /I('m| am)\s+(getting\s+)?(nervous|anxious|worried)/gi,
  /My\s+heart\s+is\s+(racing|pounding)/gi,
];

export interface VisualTicReport {
  found: boolean;
  ticCounts: Record<string, number>;
  violations: Array<{
    tic: string;
    count: number;
    limit: number;
    context: string;
  }>;
  severity: 'none' | 'warning' | 'hard_reject';
}

export interface OnTheNoseDialogueReport {
  found: boolean;
  instances: Array<{
    pattern: string;
    match: string;
    context: string;
  }>;
  severity: 'none' | 'warning' | 'hard_reject';
}

/**
 * Detect visual tics in comic content.
 */
export function detectVisualTics(
  text: string,
  cumulativeCounts?: Record<string, number>
): VisualTicReport {
  const ticCounts: Record<string, number> = {};
  const violations: VisualTicReport['violations'] = [];

  for (const tic of COMIC_VISUAL_TICS) {
    // Reset regex lastIndex
    tic.pattern.lastIndex = 0;

    // Count occurrences
    const matches = text.match(tic.pattern) || [];
    const count = matches.length;
    ticCounts[tic.name] = count;

    // Check per-page limit
    if (count > tic.maxPerPage) {
      const contextMatch = tic.pattern.exec(text);
      violations.push({
        tic: tic.name,
        count,
        limit: tic.maxPerPage,
        context: contextMatch ? contextMatch[0] : tic.name,
      });
    }

    // Check cumulative limit (per-comic)
    if (cumulativeCounts) {
      const totalCount = (cumulativeCounts[tic.name] || 0) + count;
      if (totalCount > tic.maxPerComic) {
        violations.push({
          tic: tic.name,
          count: totalCount,
          limit: tic.maxPerComic,
          context: `Total across comic: ${totalCount}x "${tic.name}" (max ${tic.maxPerComic})`,
        });
      }
    }
  }

  // Determine severity
  let severity: 'none' | 'warning' | 'hard_reject' = 'none';
  if (violations.length >= 3) {
    severity = 'hard_reject';
  } else if (violations.length > 0) {
    severity = 'warning';
  }

  return {
    found: violations.length > 0,
    ticCounts,
    violations,
    severity,
  };
}

/**
 * Detect on-the-nose dialogue in comic speech bubbles.
 */
export function detectComicOnTheNoseDialogue(text: string): OnTheNoseDialogueReport {
  const instances: OnTheNoseDialogueReport['instances'] = [];

  // Extract dialogue from text (in quotes)
  const dialogueMatches = text.match(/"[^"]+"/g) || [];
  const dialogueText = dialogueMatches.join(' ');

  for (const pattern of COMIC_ON_THE_NOSE_PATTERNS) {
    // Reset regex
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(dialogueText)) !== null) {
      // Get context around the match
      const start = Math.max(0, match.index - 20);
      const end = Math.min(dialogueText.length, match.index + match[0].length + 20);
      const context = dialogueText.slice(start, end);

      instances.push({
        pattern: pattern.source,
        match: match[0],
        context: `...${context}...`,
      });
    }
  }

  // Determine severity
  let severity: 'none' | 'warning' | 'hard_reject' = 'none';
  if (instances.length >= 2) {
    severity = 'hard_reject';
  } else if (instances.length > 0) {
    severity = 'warning';
  }

  return {
    found: instances.length > 0,
    instances,
    severity,
  };
}

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

  // NEW: Visual tic detection
  visualTics: {
    found: boolean;
    ticCounts: Record<string, number>;
    violations: string[];
    severity: 'none' | 'warning' | 'hard_reject';
  };

  // NEW: On-the-nose dialogue detection
  onTheNoseDialogue: {
    found: boolean;
    instances: string[];
    severity: 'none' | 'warning' | 'hard_reject';
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

  // 7. Visual tic detection (NEW)
  const visualTicReport = detectVisualTics(text);

  if (visualTicReport.found) {
    const ticViolations = visualTicReport.violations.map(v =>
      `"${v.tic}" appears ${v.count}x (max ${v.limit})`
    );

    if (visualTicReport.severity === 'hard_reject') {
      corrections.push(
        `VISUAL TIC OVERLOAD (HARD REJECT): Multiple overused visual actions detected. ` +
        `Issues: ${ticViolations.join(', ')}. Vary character poses and expressions.`
      );
    } else if (visualTicReport.severity === 'warning') {
      corrections.push(
        `VISUAL TIC WARNING: Overused visual actions: ${ticViolations.join(', ')}. ` +
        `Consider varying character body language and expressions.`
      );
    }
  }

  // 8. On-the-nose dialogue detection (NEW)
  const onTheNoseReport = detectComicOnTheNoseDialogue(text);

  if (onTheNoseReport.found) {
    const instances = onTheNoseReport.instances.map(i => `"${i.match}"`);

    if (onTheNoseReport.severity === 'hard_reject') {
      corrections.push(
        `ON-THE-NOSE DIALOGUE (HARD REJECT): Characters directly state emotions. ` +
        `Found: ${instances.slice(0, 3).join(', ')}. ` +
        `Comics SHOW emotion through art. Use expressions, poses, and visual metaphors instead.`
      );
    } else if (onTheNoseReport.severity === 'warning') {
      corrections.push(
        `ON-THE-NOSE DIALOGUE WARNING: Found direct emotion statements: ${instances[0]}. ` +
        `Let the art carry the emotion instead.`
      );
    }
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
    visualTics: {
      found: visualTicReport.found,
      ticCounts: visualTicReport.ticCounts,
      violations: visualTicReport.violations.map(v => `${v.tic}: ${v.count}x (max ${v.limit})`),
      severity: visualTicReport.severity,
    },
    onTheNoseDialogue: {
      found: onTheNoseReport.found,
      instances: onTheNoseReport.instances.map(i => i.match),
      severity: onTheNoseReport.severity,
    },
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
 * Catches the most egregious issues without full validation.
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

  // Quick on-the-nose dialogue check (hard reject patterns only)
  const onTheNoseHardReject = [
    /I('m| am)\s+so\s+(angry|scared|sad|happy)/i,
    /I\s+feel\s+so\s+(angry|scared|sad|happy|betrayed)/i,
  ];

  for (const pattern of onTheNoseHardReject) {
    if (pattern.test(text)) {
      return {
        isValid: false,
        primaryIssue: 'Contains on-the-nose dialogue (direct emotion statements)',
      };
    }
  }

  return { isValid: true, primaryIssue: null };
}

// Note: ComicValidationReport and ComicPanel are exported at their definitions
