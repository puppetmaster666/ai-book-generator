/**
 * Chapter Extraction System
 *
 * Extracts what ACTUALLY happened in a generated chapter.
 * This is the "eyes" of the evolution system - it reads what the AI wrote
 * and identifies key elements that might affect future chapters.
 *
 * FORMAT-SPECIFIC EXTRACTION:
 *
 * BOOKS (Novels):
 * - Prose quality, internal monologue, narrative voice
 * - Chapter pacing and scene transitions
 * - Subtext and thematic elements
 *
 * COMICS:
 * - Panel composition and visual storytelling
 * - Page hooks (cliffhangers for page turns)
 * - Visual character descriptions for consistency
 * - Action clarity and gutter logic
 *
 * SCREENPLAYS:
 * - Scene structure and sluglines
 * - Visual action vs dialogue balance
 * - Subtext in dialogue
 * - Sequence pacing
 *
 * What We Extract (All Formats):
 * - Events: Plot points that occurred
 * - Characters: Who appeared, new introductions
 * - Locations: Where scenes took place
 * - Revelations: Secrets uncovered, information learned
 * - Relationships: How relationships changed
 * - Emotional Beats: Character emotional states
 * - Threads: Setups that need payoffs, unresolved questions
 * - Surprises: Things that deviated from the outline
 */

import { generateWithAI } from '@/lib/ai/client';

// ============================================================================
// Format Types
// ============================================================================

export type ContentFormat = 'book' | 'comic' | 'screenplay';

// ============================================================================
// Core Types (All Formats)
// ============================================================================

export interface ExtractedEvent {
  description: string;
  type: 'action' | 'dialogue' | 'revelation' | 'decision' | 'consequence';
  characters: string[];
  significance: 'minor' | 'moderate' | 'major' | 'pivotal';
  location?: string;
}

// ============================================================================
// Comic-Specific Types
// ============================================================================

export interface ExtractedPanel {
  panelNumber: number;
  description: string;
  characters: string[];
  dialogue: string[];
  visualFocus: string;  // What the reader's eye is drawn to
  mood: string;
}

/**
 * CausalBridge for comic pages - prevents page-to-page drift
 * by forcing THEREFORE/BUT logic between pages
 */
export interface ComicPageCausalBridge {
  pageEndedWith: string;      // "Hero discovers the traitor's identity"
  nextPageMustShow: string;   // "Hero's confrontation with traitor"
  visualHook: string;         // "Close-up of hero's shocked face as door opens"
  emotionalMomentum: string;  // "Betrayal transforms to determination"
}

export interface ExtractedComicPage {
  pageNumber: number;
  panels: ExtractedPanel[];
  pageHook: string | null;  // Cliffhanger/hook for page turn
  visualFlow: 'action' | 'dialogue' | 'emotional' | 'establishing';
  locationChanges: boolean;

  // NEW: CausalBridge for page continuity
  causalBridge?: ComicPageCausalBridge;
}

export interface ComicVisualConsistency {
  characterAppearances: {
    name: string;
    visualDetails: string[];  // Hair color, costume, distinguishing features
    lastSeenPage: number;
  }[];
  recurringBackgrounds: string[];
  visualMotifs: string[];  // Recurring visual elements
}

// ============================================================================
// Screenplay-Specific Types
// ============================================================================

export interface ExtractedScene {
  sceneNumber: number;
  slugline: string;  // INT./EXT. LOCATION - TIME
  location: string;
  timeOfDay: string;
  characters: string[];
  purpose: 'exposition' | 'conflict' | 'revelation' | 'action' | 'emotional';
  dialogueHeavy: boolean;
  visualActionLines: number;
}

export interface ExtractedSequence {
  sequenceNumber: number;
  scenes: ExtractedScene[];
  sequenceGoal: string;
  tension: 'low' | 'building' | 'high' | 'release';
  pageEstimate: number;
}

export interface ScreenplayPacing {
  dialogueToActionRatio: number;  // 0-1, where 1 is all dialogue
  averageSceneLength: number;  // In pages
  locationChangesPerSequence: number;
  visualMoments: string[];  // Key visual beats to remember
}

// ============================================================================
// Book-Specific Types
// ============================================================================

export interface ExtractedProseElements {
  narrativeVoice: 'first_person' | 'third_limited' | 'third_omniscient' | 'second_person';
  internalMonologue: string[];  // Key thoughts revealed
  sensoryDetails: string[];  // Important sensory descriptions
  symbolism: string[];  // Symbolic elements
  foreshadowing: string[];  // Potential setups
}

export interface ChapterPacing {
  sceneCount: number;
  averageSceneLength: number;  // Words
  tensionCurve: ('rising' | 'falling' | 'plateau')[];
  cliffhangerStrength: 'none' | 'mild' | 'moderate' | 'strong';
}

export interface ExtractedCharacter {
  name: string;
  isNew: boolean;  // First appearance in story
  role: 'protagonist' | 'antagonist' | 'ally' | 'neutral' | 'unknown';
  emotionalState: string;
  physicalState?: string;  // Injuries, conditions
  newKnowledge?: string[];  // What they learned this chapter
}

export interface ExtractedLocation {
  name: string;
  isNew: boolean;
  type: 'physical' | 'memory' | 'phone' | 'dream' | 'parallel';
  mood: string;
  details: string[];
}

export interface ExtractedRelationship {
  character1: string;
  character2: string;
  change: 'improved' | 'worsened' | 'complicated' | 'revealed' | 'unchanged';
  description: string;
}

export interface ExtractedThread {
  type: 'setup' | 'callback' | 'unresolved' | 'cliffhanger';
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  relatedCharacters?: string[];
}

export interface ExtractedSurprise {
  description: string;
  deviationType: 'character_choice' | 'plot_twist' | 'new_element' | 'tone_shift';
  outlinePlanned?: string;  // What the outline said should happen
  actuallyHappened: string;  // What AI wrote instead
}

export interface ChapterExtraction {
  chapterNumber: number;
  format: ContentFormat;

  // Core Extraction (All Formats)
  events: ExtractedEvent[];
  characters: ExtractedCharacter[];
  locations: ExtractedLocation[];

  // Dynamics
  relationships: ExtractedRelationship[];
  threads: ExtractedThread[];

  // Evolution Signals
  surprises: ExtractedSurprise[];
  emergentThemes: string[];

  // Summary
  oneLineSummary: string;
  emotionalArc: string;
  storyMomentum: 'building' | 'climaxing' | 'resolving' | 'transitioning';

  // For Next Chapter
  immediateConsequences: string[];
  unansweredQuestions: string[];

  // FORMAT-SPECIFIC EXTRACTION

  // Book-Specific
  proseElements?: ExtractedProseElements;
  chapterPacing?: ChapterPacing;

  // Comic-Specific
  pages?: ExtractedComicPage[];
  visualConsistency?: ComicVisualConsistency;
  panelCount?: number;
  pageHooks?: string[];  // All page-turn hooks

  // Screenplay-Specific
  scenes?: ExtractedScene[];
  sequencePacing?: ScreenplayPacing;
  sceneCount?: number;
  visualBeats?: string[];  // Key visual moments
}

// ============================================================================
// Extraction Prompts
// ============================================================================

/**
 * Build extraction prompt based on content format
 */
function buildExtractionPrompt(
  chapterContent: string,
  chapterNumber: number,
  chapterPlan: string,
  previousSummary: string,
  knownCharacters: string[],
  format: ContentFormat
): string {
  const basePrompt = buildBaseExtractionPrompt(
    chapterContent,
    chapterNumber,
    chapterPlan,
    previousSummary,
    knownCharacters
  );

  // Add format-specific extraction requirements
  switch (format) {
    case 'comic':
      return basePrompt + buildComicExtractionAddendum();
    case 'screenplay':
      return basePrompt + buildScreenplayExtractionAddendum();
    case 'book':
    default:
      return basePrompt + buildBookExtractionAddendum();
  }
}

function buildBaseExtractionPrompt(
  chapterContent: string,
  chapterNumber: number,
  chapterPlan: string,
  previousSummary: string,
  knownCharacters: string[]
): string {
  return `You are a story analyst. Extract key elements from this content.

CHAPTER/SECTION ${chapterNumber} CONTENT:
${chapterContent}

WHAT THE OUTLINE PLANNED:
${chapterPlan}

PREVIOUS SUMMARY:
${previousSummary || 'This is the first section'}

KNOWN CHARACTERS SO FAR:
${knownCharacters.join(', ') || 'None yet'}

EXTRACT THE FOLLOWING CORE ELEMENTS (respond in JSON):

{
  "events": [
    {
      "description": "Brief description of what happened",
      "type": "action|dialogue|revelation|decision|consequence",
      "characters": ["names involved"],
      "significance": "minor|moderate|major|pivotal",
      "location": "where it happened"
    }
  ],

  "characters": [
    {
      "name": "Character name",
      "isNew": true/false,
      "role": "protagonist|antagonist|ally|neutral|unknown",
      "emotionalState": "How they feel at end",
      "physicalState": "Any injuries or conditions (optional)",
      "newKnowledge": ["Things they learned"]
    }
  ],

  "locations": [
    {
      "name": "Location name",
      "isNew": true/false,
      "type": "physical|memory|phone|dream|parallel",
      "mood": "The atmosphere",
      "details": ["Notable details mentioned"]
    }
  ],

  "relationships": [
    {
      "character1": "Name",
      "character2": "Name",
      "change": "improved|worsened|complicated|revealed|unchanged",
      "description": "How the relationship changed"
    }
  ],

  "threads": [
    {
      "type": "setup|callback|unresolved|cliffhanger",
      "description": "The thread",
      "urgency": "low|medium|high|immediate",
      "relatedCharacters": ["names"]
    }
  ],

  "surprises": [
    {
      "description": "What surprised vs the plan",
      "deviationType": "character_choice|plot_twist|new_element|tone_shift",
      "outlinePlanned": "What was supposed to happen",
      "actuallyHappened": "What AI wrote instead"
    }
  ],

  "emergentThemes": ["Themes that emerged naturally"],
  "oneLineSummary": "Single sentence summary",
  "emotionalArc": "The emotional journey",
  "storyMomentum": "building|climaxing|resolving|transitioning",
  "immediateConsequences": ["Things that MUST be addressed next"],
  "unansweredQuestions": ["Questions readers now have"]`;
}

// ============================================================================
// Book-Specific Extraction
// ============================================================================

function buildBookExtractionAddendum(): string {
  return `,

  "proseElements": {
    "narrativeVoice": "first_person|third_limited|third_omniscient|second_person",
    "internalMonologue": ["Key character thoughts revealed"],
    "sensoryDetails": ["Important sensory descriptions (sights, sounds, smells)"],
    "symbolism": ["Symbolic elements or metaphors used"],
    "foreshadowing": ["Potential setups or hints at future events"]
  },

  "chapterPacing": {
    "sceneCount": 3,
    "averageSceneLength": 800,
    "tensionCurve": ["rising", "plateau", "rising"],
    "cliffhangerStrength": "none|mild|moderate|strong"
  }
}

BOOK-SPECIFIC EXTRACTION RULES:
1. Track internal monologue - what characters think vs what they say matters
2. Note sensory details that establish atmosphere or could recur
3. Identify symbolism that could become thematic
4. Foreshadowing includes any setup that might pay off later
5. Tension curve shows how tension moves through the chapter
6. Cliffhanger strength affects how urgently next chapter must pick up

Respond with ONLY the JSON object, no additional text.`;
}

// ============================================================================
// Comic-Specific Extraction
// ============================================================================

function buildComicExtractionAddendum(): string {
  return `,

  "pages": [
    {
      "pageNumber": 1,
      "panels": [
        {
          "panelNumber": 1,
          "description": "Visual description of what's shown",
          "characters": ["Character names visible"],
          "dialogue": ["Dialogue/caption text"],
          "visualFocus": "What draws the eye",
          "mood": "Panel mood/atmosphere"
        }
      ],
      "pageHook": "Cliffhanger or hook for page turn (null if none)",
      "visualFlow": "action|dialogue|emotional|establishing",
      "locationChanges": true/false,
      "causalBridge": {
        "pageEndedWith": "What key event or revelation ended this page",
        "nextPageMustShow": "What the next page MUST address as a result",
        "visualHook": "The visual that pulls readers to turn the page",
        "emotionalMomentum": "How the emotion carries forward"
      }
    }
  ],

  "visualConsistency": {
    "characterAppearances": [
      {
        "name": "Character name",
        "visualDetails": ["Hair color", "Costume/clothing", "Distinguishing features"],
        "lastSeenPage": 3
      }
    ],
    "recurringBackgrounds": ["Locations that appear multiple times"],
    "visualMotifs": ["Recurring visual elements or symbols"]
  },

  "panelCount": 18,
  "pageHooks": ["List of all page-turn hooks"]
}

COMIC-SPECIFIC EXTRACTION RULES:
1. Every page should ideally end with a hook (question, action, reveal)
2. Track character visual details for consistency across pages
3. Note visual motifs - symbols, colors, objects that recur
4. Panel descriptions should be clear enough for an artist
5. Visual flow indicates what type of page it is (action-heavy vs dialogue)
6. Location changes between panels affect pacing

=== CAUSAL BRIDGE (MANDATORY FOR EACH PAGE) ===
Human comics use THEREFORE/BUT logic to connect pages. AI uses AND THEN (which causes drift).

For each page, you MUST provide:
- pageEndedWith: The key visual/story moment that ended the page
- nextPageMustShow: What MUST happen on the next page as a result
- visualHook: The specific visual that makes readers turn the page
- emotionalMomentum: How the emotion transforms (e.g., "fear to determination")

EXAMPLE:
- pageEndedWith: "Maya sees her mentor's face among the enemy soldiers"
- nextPageMustShow: "Maya's confrontation with her mentor about the betrayal"
- visualHook: "Close-up of Maya's eyes wide, tears forming, mentor in reflection"
- emotionalMomentum: "Trust shatters into betrayal, then hardens into resolve"

This creates FORWARD MOMENTUM and prevents page loops.

Respond with ONLY the JSON object, no additional text.`;
}

// ============================================================================
// Screenplay-Specific Extraction
// ============================================================================

function buildScreenplayExtractionAddendum(): string {
  return `,

  "scenes": [
    {
      "sceneNumber": 1,
      "slugline": "INT. LOCATION - TIME",
      "location": "Location name",
      "timeOfDay": "DAY|NIGHT|DAWN|DUSK|CONTINUOUS",
      "characters": ["Characters in scene"],
      "purpose": "exposition|conflict|revelation|action|emotional",
      "dialogueHeavy": true/false,
      "visualActionLines": 5
    }
  ],

  "sequencePacing": {
    "dialogueToActionRatio": 0.6,
    "averageSceneLength": 2.5,
    "locationChangesPerSequence": 3,
    "visualMoments": ["Key visual beats to remember"]
  },

  "sceneCount": 5,
  "visualBeats": ["Memorable visual moments"]
}

SCREENPLAY-SPECIFIC EXTRACTION RULES:
1. Extract exact sluglines as written (INT./EXT. LOCATION - TIME)
2. Scene purpose: what role does this scene play in the sequence?
3. Dialogue-heavy scenes (>60% dialogue) need balance with visual scenes
4. Visual action lines = description paragraphs (not dialogue)
5. Visual beats are key images that tell the story without words
6. Track dialogue/action ratio for pacing analysis
7. Note time of day for continuity

Respond with ONLY the JSON object, no additional text.`;
}

// ============================================================================
// Main Extraction Function
// ============================================================================

export async function extractChapterElements(
  chapterContent: string,
  chapterNumber: number,
  chapterPlan: string,
  previousSummary: string,
  knownCharacters: string[],
  bookId: string,
  format: ContentFormat = 'book'
): Promise<ChapterExtraction> {
  const prompt = buildExtractionPrompt(
    chapterContent,
    chapterNumber,
    chapterPlan,
    previousSummary,
    knownCharacters,
    format
  );

  // Adjust max tokens based on format (comics/screenplays need more for structured data)
  const maxTokens = format === 'comic' ? 3000 : format === 'screenplay' ? 2500 : 2000;

  try {
    const response = await generateWithAI({
      prompt,
      systemPrompt: getSystemPromptForFormat(format),
      maxTokens,
      temperature: 0.3,  // Low temperature for accuracy
    });

    // Parse the JSON response
    const extraction = JSON.parse(response.text.trim());

    // Build base extraction
    const baseExtraction: ChapterExtraction = {
      chapterNumber,
      format,
      events: extraction.events || [],
      characters: extraction.characters || [],
      locations: extraction.locations || [],
      relationships: extraction.relationships || [],
      threads: extraction.threads || [],
      surprises: extraction.surprises || [],
      emergentThemes: extraction.emergentThemes || [],
      oneLineSummary: extraction.oneLineSummary || '',
      emotionalArc: extraction.emotionalArc || '',
      storyMomentum: extraction.storyMomentum || 'building',
      immediateConsequences: extraction.immediateConsequences || [],
      unansweredQuestions: extraction.unansweredQuestions || [],
    };

    // Add format-specific fields
    switch (format) {
      case 'book':
        baseExtraction.proseElements = extraction.proseElements;
        baseExtraction.chapterPacing = extraction.chapterPacing;
        break;

      case 'comic':
        baseExtraction.pages = extraction.pages || [];
        baseExtraction.visualConsistency = extraction.visualConsistency;
        baseExtraction.panelCount = extraction.panelCount || countPanels(extraction.pages);
        baseExtraction.pageHooks = extraction.pageHooks || extractPageHooks(extraction.pages);
        break;

      case 'screenplay':
        baseExtraction.scenes = extraction.scenes || [];
        baseExtraction.sequencePacing = extraction.sequencePacing;
        baseExtraction.sceneCount = extraction.sceneCount || extraction.scenes?.length || 0;
        baseExtraction.visualBeats = extraction.visualBeats || [];
        break;
    }

    return baseExtraction;
  } catch (error) {
    console.error('[ChapterExtraction] Failed to extract elements:', error);

    // Return minimal extraction on failure
    return createMinimalExtraction(chapterContent, chapterNumber, format);
  }
}

/**
 * Get format-specific system prompt
 */
function getSystemPromptForFormat(format: ContentFormat): string {
  switch (format) {
    case 'comic':
      return 'You are a comic book analyst specializing in visual storytelling. Extract story and visual elements and return valid JSON only. Pay special attention to panel composition, page hooks, and visual consistency.';
    case 'screenplay':
      return 'You are a screenplay analyst specializing in film structure. Extract story and scene elements and return valid JSON only. Pay special attention to sluglines, visual action, and dialogue balance.';
    case 'book':
    default:
      return 'You are a precise story analyst. Extract story elements and return valid JSON only. Pay attention to prose quality, internal monologue, and narrative pacing.';
  }
}

/**
 * Count total panels from pages
 */
function countPanels(pages?: ExtractedComicPage[]): number {
  if (!pages) return 0;
  return pages.reduce((sum, page) => sum + (page.panels?.length || 0), 0);
}

/**
 * Extract page hooks from pages
 */
function extractPageHooks(pages?: ExtractedComicPage[]): string[] {
  if (!pages) return [];
  return pages
    .filter(page => page.pageHook)
    .map(page => page.pageHook as string);
}

// ============================================================================
// Fallback: Code-Based Extraction
// ============================================================================

/**
 * Minimal extraction using regex/heuristics when AI extraction fails
 */
function createMinimalExtraction(
  content: string,
  chapterNumber: number,
  format: ContentFormat
): ChapterExtraction {
  // Base extraction depends on format
  switch (format) {
    case 'comic':
      return createMinimalComicExtraction(content, chapterNumber);
    case 'screenplay':
      return createMinimalScreenplayExtraction(content, chapterNumber);
    case 'book':
    default:
      return createMinimalBookExtraction(content, chapterNumber);
  }
}

/**
 * Minimal book extraction
 */
function createMinimalBookExtraction(
  content: string,
  chapterNumber: number
): ChapterExtraction {
  // Extract character names (capitalized words in dialogue attribution)
  const dialoguePattern = /[""]([^""]+)[""],?\s+(?:said|asked|replied|whispered|shouted)\s+(\w+)/gi;
  const characterNames = new Set<string>();
  let match;
  while ((match = dialoguePattern.exec(content)) !== null) {
    characterNames.add(match[2]);
  }

  // Extract locations from scene headers or descriptive phrases
  const locationPattern = /(?:in|at|inside|outside)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const locations = new Set<string>();
  while ((match = locationPattern.exec(content)) !== null) {
    locations.add(match[1]);
  }

  return {
    chapterNumber,
    format: 'book',
    events: [],
    characters: Array.from(characterNames).map(name => ({
      name,
      isNew: false,
      role: 'unknown' as const,
      emotionalState: 'unknown',
    })),
    locations: Array.from(locations).map(name => ({
      name,
      isNew: false,
      type: 'physical' as const,
      mood: 'unknown',
      details: [],
    })),
    relationships: [],
    threads: [],
    surprises: [],
    emergentThemes: [],
    oneLineSummary: `Chapter ${chapterNumber} events`,
    emotionalArc: 'unknown',
    storyMomentum: 'building',
    immediateConsequences: [],
    unansweredQuestions: [],
    // Book-specific defaults
    proseElements: {
      narrativeVoice: 'third_limited',
      internalMonologue: [],
      sensoryDetails: [],
      symbolism: [],
      foreshadowing: [],
    },
    chapterPacing: {
      sceneCount: 1,
      averageSceneLength: content.split(/\s+/).length,
      tensionCurve: ['plateau'],
      cliffhangerStrength: 'none',
    },
  };
}

/**
 * Minimal comic extraction
 */
function createMinimalComicExtraction(
  content: string,
  chapterNumber: number
): ChapterExtraction {
  // Extract character names from dialogue (UPPERCASE: format)
  const comicDialoguePattern = /^([A-Z][A-Z\s]+):/gm;
  const characterNames = new Set<string>();
  let match;
  while ((match = comicDialoguePattern.exec(content)) !== null) {
    characterNames.add(match[1].trim());
  }

  // Count panels (look for PANEL markers)
  const panelPattern = /PANEL\s*\d+/gi;
  const panelMatches = content.match(panelPattern) || [];
  const panelCount = panelMatches.length || 1;

  // Count pages (look for PAGE markers)
  const pagePattern = /PAGE\s*\d+/gi;
  const pageMatches = content.match(pagePattern) || [];
  const pageCount = pageMatches.length || 1;

  return {
    chapterNumber,
    format: 'comic',
    events: [],
    characters: Array.from(characterNames).map(name => ({
      name: name.charAt(0) + name.slice(1).toLowerCase(),
      isNew: false,
      role: 'unknown' as const,
      emotionalState: 'unknown',
    })),
    locations: [],
    relationships: [],
    threads: [],
    surprises: [],
    emergentThemes: [],
    oneLineSummary: `Comic section ${chapterNumber}`,
    emotionalArc: 'unknown',
    storyMomentum: 'building',
    immediateConsequences: [],
    unansweredQuestions: [],
    // Comic-specific defaults
    pages: [],
    visualConsistency: {
      characterAppearances: [],
      recurringBackgrounds: [],
      visualMotifs: [],
    },
    panelCount,
    pageHooks: [],
  };
}

/**
 * Minimal screenplay extraction
 */
function createMinimalScreenplayExtraction(
  content: string,
  chapterNumber: number
): ChapterExtraction {
  // Extract sluglines
  const sluglinePattern = /^(INT\.|EXT\.)\s+(.+?)\s*-\s*(DAY|NIGHT|DAWN|DUSK|CONTINUOUS|LATER)/gmi;
  const locations = new Set<string>();
  const scenes: ExtractedScene[] = [];
  let match;
  let sceneNum = 1;

  while ((match = sluglinePattern.exec(content)) !== null) {
    const location = match[2].trim();
    locations.add(location);
    scenes.push({
      sceneNumber: sceneNum++,
      slugline: match[0].trim(),
      location,
      timeOfDay: match[3].toUpperCase(),
      characters: [],
      purpose: 'action',
      dialogueHeavy: false,
      visualActionLines: 0,
    });
  }

  // Extract character names (UPPERCASE followed by dialogue)
  const characterPattern = /^([A-Z][A-Z\s]+)$/gm;
  const characterNames = new Set<string>();
  while ((match = characterPattern.exec(content)) !== null) {
    const name = match[1].trim();
    // Filter out common non-character words
    if (!['INT', 'EXT', 'FADE', 'CUT', 'DISSOLVE', 'CONTINUOUS', 'LATER', 'DAY', 'NIGHT'].includes(name)) {
      characterNames.add(name);
    }
  }

  return {
    chapterNumber,
    format: 'screenplay',
    events: [],
    characters: Array.from(characterNames).map(name => ({
      name: name.charAt(0) + name.slice(1).toLowerCase(),
      isNew: false,
      role: 'unknown' as const,
      emotionalState: 'unknown',
    })),
    locations: Array.from(locations).map(name => ({
      name,
      isNew: false,
      type: 'physical' as const,
      mood: 'unknown',
      details: [],
    })),
    relationships: [],
    threads: [],
    surprises: [],
    emergentThemes: [],
    oneLineSummary: `Sequence ${chapterNumber}`,
    emotionalArc: 'unknown',
    storyMomentum: 'building',
    immediateConsequences: [],
    unansweredQuestions: [],
    // Screenplay-specific defaults
    scenes,
    sequencePacing: {
      dialogueToActionRatio: 0.5,
      averageSceneLength: 2,
      locationChangesPerSequence: scenes.length,
      visualMoments: [],
    },
    sceneCount: scenes.length,
    visualBeats: [],
  };
}

// ============================================================================
// Extraction Comparison
// ============================================================================

/**
 * Compare extraction to outline plan to identify deviations
 */
export function findDeviations(
  extraction: ChapterExtraction,
  plannedBeats: string[]
): {
  missedBeats: string[];
  unexpectedElements: string[];
  significance: 'minor' | 'moderate' | 'significant';
} {
  const missedBeats: string[] = [];
  const unexpectedElements: string[] = [];

  // Check for surprises (these are deviations)
  for (const surprise of extraction.surprises) {
    if (surprise.outlinePlanned) {
      missedBeats.push(surprise.outlinePlanned);
    }
    unexpectedElements.push(surprise.actuallyHappened);
  }

  // Determine significance
  let significance: 'minor' | 'moderate' | 'significant' = 'minor';

  const pivotalEvents = extraction.events.filter(e => e.significance === 'pivotal').length;
  const newCharacters = extraction.characters.filter(c => c.isNew).length;
  const majorSurprises = extraction.surprises.filter(s =>
    s.deviationType === 'plot_twist' || s.deviationType === 'character_choice'
  ).length;

  if (pivotalEvents > 0 || majorSurprises > 0) {
    significance = 'significant';
  } else if (newCharacters > 0 || extraction.surprises.length > 1) {
    significance = 'moderate';
  }

  return { missedBeats, unexpectedElements, significance };
}

// ============================================================================
// Extraction Merging (for story history)
// ============================================================================

/**
 * Merge multiple chapter extractions into a story summary
 */
export function mergeExtractions(
  extractions: ChapterExtraction[]
): {
  allCharacters: Map<string, ExtractedCharacter>;
  allLocations: Map<string, ExtractedLocation>;
  activeThreads: ExtractedThread[];
  resolvedThreads: ExtractedThread[];
  storyArc: string;
} {
  const allCharacters = new Map<string, ExtractedCharacter>();
  const allLocations = new Map<string, ExtractedLocation>();
  const allThreads: ExtractedThread[] = [];

  for (const extraction of extractions) {
    // Merge characters (latest state wins)
    for (const char of extraction.characters) {
      allCharacters.set(char.name.toLowerCase(), char);
    }

    // Merge locations
    for (const loc of extraction.locations) {
      if (!allLocations.has(loc.name.toLowerCase())) {
        allLocations.set(loc.name.toLowerCase(), loc);
      }
    }

    // Collect threads
    allThreads.push(...extraction.threads);
  }

  // Separate active vs resolved threads
  const activeThreads = allThreads.filter(t => t.type !== 'callback');
  const resolvedThreads = allThreads.filter(t => t.type === 'callback');

  // Build story arc summary
  const arcPhases = extractions.map(e => e.storyMomentum);
  const storyArc = summarizeArc(arcPhases);

  return {
    allCharacters,
    allLocations,
    activeThreads,
    resolvedThreads,
    storyArc,
  };
}

function summarizeArc(phases: string[]): string {
  const counts = {
    building: 0,
    climaxing: 0,
    resolving: 0,
    transitioning: 0,
  };

  for (const phase of phases) {
    if (phase in counts) {
      counts[phase as keyof typeof counts]++;
    }
  }

  const total = phases.length;
  const buildingPercent = counts.building / total;
  const climaxingPercent = counts.climaxing / total;

  if (climaxingPercent > 0.3) {
    return 'Story is in high-tension climax phase';
  } else if (buildingPercent > 0.6) {
    return 'Story is steadily building tension';
  } else if (counts.resolving > counts.building) {
    return 'Story is moving toward resolution';
  } else {
    return 'Story has varied pacing';
  }
}

// ============================================================================
// Comic CausalBridge Helpers
// ============================================================================

/**
 * Get the CausalBridge from the last page of a comic extraction.
 * Use this to provide continuity context for the next page generation.
 */
export function getLastPageCausalBridge(
  extraction: ChapterExtraction
): ComicPageCausalBridge | null {
  if (extraction.format !== 'comic' || !extraction.pages || extraction.pages.length === 0) {
    return null;
  }

  const lastPage = extraction.pages[extraction.pages.length - 1];
  return lastPage.causalBridge || null;
}

/**
 * Build comic continuity context from previous pages for next page generation.
 * Includes the CausalBridge from the last page and visual consistency data.
 */
export function buildComicContinuityContext(
  extraction: ChapterExtraction,
  maxPreviousPages: number = 2
): string {
  if (extraction.format !== 'comic' || !extraction.pages) {
    return '';
  }

  const parts: string[] = [];

  // Get last page's CausalBridge
  const causalBridge = getLastPageCausalBridge(extraction);
  if (causalBridge) {
    parts.push(`=== CAUSAL BRIDGE FROM PREVIOUS PAGE ===
Because the last page ended with: ${causalBridge.pageEndedWith}
THIS PAGE MUST SHOW: ${causalBridge.nextPageMustShow}
Visual hook to continue: ${causalBridge.visualHook}
Emotional momentum: ${causalBridge.emotionalMomentum}`);
  }

  // Get recent pages summary
  const recentPages = extraction.pages.slice(-maxPreviousPages);
  if (recentPages.length > 0) {
    const pagesSummary = recentPages.map(page => {
      const panelSummary = page.panels.slice(0, 3).map(p => p.description).join('; ');
      return `Page ${page.pageNumber}: ${panelSummary}${page.panels.length > 3 ? '...' : ''}`;
    }).join('\n');

    parts.push(`=== RECENT PAGES (DO NOT REPEAT) ===
${pagesSummary}`);
  }

  // Visual consistency reminders
  if (extraction.visualConsistency) {
    const charDetails = extraction.visualConsistency.characterAppearances
      .slice(0, 5)
      .map(c => `${c.name}: ${c.visualDetails.slice(0, 3).join(', ')}`)
      .join('\n');

    if (charDetails) {
      parts.push(`=== CHARACTER VISUAL CONSISTENCY ===
${charDetails}`);
    }
  }

  return parts.join('\n\n');
}

/**
 * Create a default CausalBridge for pages without one.
 * Used when extraction fails or for fallback.
 */
export function createDefaultComicCausalBridge(
  pageDescription: string
): ComicPageCausalBridge {
  return {
    pageEndedWith: pageDescription || 'Page content',
    nextPageMustShow: 'Continue the action from the previous page',
    visualHook: 'Character reaction to previous events',
    emotionalMomentum: 'Tension continues building',
  };
}
