/**
 * Outline Revision System
 *
 * The key to making stories FLOURISH during writing.
 *
 * After each chapter, this system:
 * 1. Takes the discoveries from that chapter
 * 2. Looks at the upcoming chapters in the outline
 * 3. Revises them to integrate discoveries, address threads, reinforce themes
 *
 * This is NOT about rewriting the whole outline.
 * It's about EVOLVING the outline based on what emerged.
 *
 * The original outline provides the skeleton.
 * The discoveries add the flesh, blood, and soul.
 */

import { generateWithAI } from '@/lib/ai/client';
import {
  DiscoveryTracker,
  EmergentTheme,
  PlotThread,
  CharacterDiscovery,
  VisualMotif,
  PageHookPattern,
  VisualBeatPattern,
  LocationUsage,
} from './discovery-tracker';
import { ChapterExtraction, ContentFormat } from './chapter-extraction';

// ============================================================================
// Types
// ============================================================================

export interface ChapterPlan {
  chapterNumber: number;
  title: string;
  summary: string;
  beats: string[];
  targetWordCount: number;
  keyEvents: string[];
  charactersInvolved: string[];
  locationsPrimary: string[];
  emotionalGoal: string;
}

// ============================================================================
// Format-Specific Plan Types
// ============================================================================

/**
 * Comic page plan - focuses on visual storytelling
 */
export interface ComicPagePlan {
  pageNumber: number;
  title?: string;
  panelCount: number;
  panels: ComicPanelPlan[];
  pageHook: string;  // What makes reader turn the page
  visualFocus: string;  // Main visual element/moment
  charactersPresent: string[];
  locationChange: boolean;
  emotionalBeat: string;
}

export interface ComicPanelPlan {
  panelNumber: number;
  description: string;
  dialogueSummary?: string;
  visualEmphasis: 'wide' | 'close' | 'medium' | 'splash';
  actionBeat?: string;
}

/**
 * Screenplay sequence/scene plan - focuses on cinematic structure
 */
export interface ScreenplayScenePlan {
  sceneNumber: number;
  slugline: string;  // INT./EXT. LOCATION - TIME
  purpose: string;
  estimatedPages: number;
  charactersPresent: string[];
  keyDialogue?: string;
  visualAction: string;
  tension: 'low' | 'building' | 'high' | 'release';
  subtextGoal?: string;
}

export interface ScreenplaySequencePlan {
  sequenceNumber: number;
  title: string;
  actPosition: 'setup' | 'confrontation' | 'resolution';
  scenes: ScreenplayScenePlan[];
  sequenceGoal: string;
  estimatedPages: number;
  majorCharacters: string[];
  locations: string[];
  emotionalArc: string;
}

// Union type for any plan type
export type AnyPlan = ChapterPlan | ComicPagePlan | ScreenplaySequencePlan;

export interface OutlineRevision {
  chapterNumber: number;
  originalPlan: ChapterPlan;
  revisedPlan: ChapterPlan;
  revisionReason: string[];
  integratedDiscoveries: string[];
  threadAddressed: string[];
  confidenceScore: number;  // 0-1, how confident we are in the revision
}

// Format-specific revision types
export interface ComicPageRevision {
  pageNumber: number;
  originalPlan: ComicPagePlan;
  revisedPlan: ComicPagePlan;
  revisionReason: string[];
  visualMotifsIntegrated: string[];
  pageHookImproved: boolean;
  confidenceScore: number;
}

export interface ScreenplaySequenceRevision {
  sequenceNumber: number;
  originalPlan: ScreenplaySequencePlan;
  revisedPlan: ScreenplaySequencePlan;
  revisionReason: string[];
  visualBeatsIntegrated: string[];
  locationsOptimized: string[];
  subtextEnhanced: boolean;
  confidenceScore: number;
}

export type AnyRevision = OutlineRevision | ComicPageRevision | ScreenplaySequenceRevision;

export interface RevisionContext {
  completedChapters: number;
  totalChapters: number;
  currentMomentum: string;
  threadsNeedingResolution: PlotThread[];
  staleThreads: PlotThread[];
  strongThemes: EmergentTheme[];
  characterDiscoveries: CharacterDiscovery[];
  lastChapterSummary: string;
  format: ContentFormat;
}

// Comic-specific revision context
export interface ComicRevisionContext extends RevisionContext {
  format: 'comic';
  visualMotifs: VisualMotif[];
  effectivePageHooks: PageHookPattern[];
  characterVisualConsistency: { character: string; issues: string[] }[];
  panelPacingTrend: 'too-dense' | 'balanced' | 'too-sparse';
}

// Screenplay-specific revision context
export interface ScreenplayRevisionContext extends RevisionContext {
  format: 'screenplay';
  visualBeats: VisualBeatPattern[];
  locationUsage: LocationUsage[];
  dialogueToActionRatio: number;
  pacingIssues: string[];
  subtextOpportunities: string[];
}

// ============================================================================
// Revision Decision Logic
// ============================================================================

/**
 * Determines if outline revision is needed after a chapter
 */
export function shouldReviseOutline(
  extraction: ChapterExtraction,
  discoveryTracker: DiscoveryTracker,
  currentChapter: number,
  totalChapters: number,
  format: ContentFormat = 'book'
): {
  shouldRevise: boolean;
  urgency: 'low' | 'medium' | 'high';
  reasons: string[];
} {
  const reasons: string[] = [];
  let urgencyScore = 0;

  // Common checks for all formats
  // 1. Check for significant surprises
  const significantSurprises = extraction.surprises.filter(
    s => s.deviationType === 'plot_twist' || s.deviationType === 'character_choice'
  );
  if (significantSurprises.length > 0) {
    reasons.push(`${significantSurprises.length} significant surprise(s) deviated from outline`);
    urgencyScore += 2;
  }

  // 2. Check for pivotal events
  const pivotalEvents = extraction.events.filter(e => e.significance === 'pivotal');
  if (pivotalEvents.length > 0) {
    reasons.push(`${pivotalEvents.length} pivotal event(s) may affect future chapters`);
    urgencyScore += 2;
  }

  // 3. Check for immediate threads
  const immediateThreads = extraction.threads.filter(t => t.urgency === 'immediate');
  if (immediateThreads.length > 0) {
    reasons.push(`${immediateThreads.length} thread(s) require immediate resolution`);
    urgencyScore += 3;
  }

  // 4. Check for stale threads
  const staleThreads = discoveryTracker.getStaleThreads(currentChapter);
  if (staleThreads.length > 2) {
    reasons.push(`${staleThreads.length} threads haven't been addressed in 3+ chapters`);
    urgencyScore += 1;
  }

  // 5. Check for strong emergent themes
  const unplanned = discoveryTracker.getUnplannedDiscoveries();
  if (unplanned.themes.length > 0) {
    reasons.push(`${unplanned.themes.length} emergent theme(s) should be reinforced`);
    urgencyScore += 1;
  }

  // 6. Check for story momentum vs outline momentum
  if (extraction.storyMomentum === 'climaxing' && currentChapter < totalChapters * 0.6) {
    reasons.push('Story is climaxing earlier than expected - may need pacing adjustment');
    urgencyScore += 2;
  }

  // Format-specific checks
  const formatReasons = getFormatSpecificRevisionReasons(extraction, discoveryTracker, format);
  reasons.push(...formatReasons.reasons);
  urgencyScore += formatReasons.urgencyBoost;

  // Determine urgency
  let urgency: 'low' | 'medium' | 'high' = 'low';
  if (urgencyScore >= 4) {
    urgency = 'high';
  } else if (urgencyScore >= 2) {
    urgency = 'medium';
  }

  return {
    shouldRevise: reasons.length > 0,
    urgency,
    reasons,
  };
}

/**
 * Get format-specific reasons for revision
 */
function getFormatSpecificRevisionReasons(
  extraction: ChapterExtraction,
  discoveryTracker: DiscoveryTracker,
  format: ContentFormat
): { reasons: string[]; urgencyBoost: number } {
  const reasons: string[] = [];
  let urgencyBoost = 0;

  if (format === 'comic') {
    // Comic-specific checks
    const comicState = discoveryTracker.getState().comicState;
    if (comicState) {
      // Check for visual consistency issues
      const visualIssues = comicState.characterVisuals.filter(cv => cv.inconsistencies.length > 0);
      if (visualIssues.length > 0) {
        reasons.push(`${visualIssues.length} character(s) have visual consistency issues that need addressing`);
        urgencyBoost += 2;
      }

      // Check for weak page hooks
      const weakHooks = comicState.pageHookPatterns.filter(ph => ph.effectiveness < 0.5);
      if (weakHooks.length >= 2) {
        reasons.push('Multiple pages have weak page-turn hooks - reader engagement at risk');
        urgencyBoost += 1;
      }

      // Check for visual motif opportunities
      const strongMotifs = comicState.visualMotifs.filter(vm => vm.occurrences.length >= 2 && vm.shouldRecur);
      if (strongMotifs.length > 0) {
        reasons.push(`${strongMotifs.length} visual motif(s) should be reinforced in upcoming pages`);
        urgencyBoost += 1;
      }

      // Check panel pacing
      if (comicState.visualPacing === 'monotonous') {
        reasons.push('Panel pacing has become monotonous - need variety in layouts');
        urgencyBoost += 1;
      }
    }
  } else if (format === 'screenplay') {
    // Screenplay-specific checks
    const screenplayState = discoveryTracker.getState().screenplayState;
    if (screenplayState) {
      // Check dialogue-to-action ratio
      if (screenplayState.dialogueToActionRatio > 0.7) {
        reasons.push('Script is too dialogue-heavy - need more visual action');
        urgencyBoost += 2;
      } else if (screenplayState.dialogueToActionRatio < 0.3) {
        reasons.push('Script lacks character dialogue - need more character moments');
        urgencyBoost += 1;
      }

      // Check location efficiency
      const overusedLocations = screenplayState.locationUsage.filter(
        lu => lu.sceneCount > 5 && lu.purposes.length < 3
      );
      if (overusedLocations.length > 0) {
        reasons.push(`${overusedLocations.length} location(s) overused without variety - consider new settings`);
        urgencyBoost += 1;
      }

      // Check for pacing issues
      if (screenplayState.pacingIssues.length > 0) {
        reasons.push(`Pacing issues detected: ${screenplayState.pacingIssues[0]}`);
        urgencyBoost += 2;
      }

      // Check for subtext opportunities
      if (screenplayState.effectiveSubtextMoments.length === 0 && extraction.chapterNumber > 2) {
        reasons.push('Script lacks subtext - dialogue may be too on-the-nose');
        urgencyBoost += 1;
      }
    }
  } else {
    // Book-specific checks
    const bookState = discoveryTracker.getState().bookState;
    if (bookState) {
      // Check for unfired Chekhov's guns (foreshadowing without payoff)
      const unfiredSetups = bookState.foreshadowingSetups.filter(
        fs => fs.status === 'planted' && fs.urgency === 'soon'
      );
      if (unfiredSetups.length > 0) {
        reasons.push(`${unfiredSetups.length} foreshadowing setup(s) need payoff soon`);
        urgencyBoost += 2;
      }

      // Check for prose pattern staleness
      const overusedPatterns = bookState.prosePatterns.filter(
        pp => pp.occurrences > 5 && pp.effectiveness < 0.6
      );
      if (overusedPatterns.length > 0) {
        reasons.push('Some prose patterns are becoming stale - vary narrative approach');
        urgencyBoost += 1;
      }

      // Check for weak chapter endings
      const weakEndings = bookState.chapterEndingPatterns.filter(
        ep => ep.effectiveness < 0.5
      );
      if (weakEndings.length >= 2) {
        reasons.push('Recent chapter endings lack impact - strengthen hooks');
        urgencyBoost += 1;
      }
    }
  }

  return { reasons, urgencyBoost };
}

// ============================================================================
// Revision Prompts
// ============================================================================

function buildRevisionPrompt(
  originalPlan: ChapterPlan,
  context: RevisionContext
): string {
  return `You are a story outline editor. Revise this chapter plan to integrate recent discoveries while maintaining story coherence.

ORIGINAL CHAPTER ${originalPlan.chapterNumber} PLAN:
Title: ${originalPlan.title}
Summary: ${originalPlan.summary}
Key Events: ${originalPlan.keyEvents.join(', ')}
Characters: ${originalPlan.charactersInvolved.join(', ')}
Locations: ${originalPlan.locationsPrimary.join(', ')}
Emotional Goal: ${originalPlan.emotionalGoal}
Beats:
${originalPlan.beats.map((b, i) => `  ${i + 1}. ${b}`).join('\n')}

STORY CONTEXT:
- Chapter ${context.completedChapters} of ${context.totalChapters} just completed
- Current story momentum: ${context.currentMomentum}
- Last chapter: ${context.lastChapterSummary}

${context.threadsNeedingResolution.length > 0 ? `
THREADS NEEDING RESOLUTION (in priority order):
${context.threadsNeedingResolution.map(t => `- [${t.priority.toUpperCase()}] ${t.description}`).join('\n')}
` : ''}

${context.staleThreads.length > 0 ? `
STALE THREADS (not mentioned in 3+ chapters):
${context.staleThreads.map(t => `- ${t.description}`).join('\n')}
` : ''}

${context.strongThemes.length > 0 ? `
THEMES TO REINFORCE:
${context.strongThemes.map(t => `- "${t.name}" (${t.strength})`).join('\n')}
` : ''}

${context.characterDiscoveries.length > 0 ? `
CHARACTER DISCOVERIES TO INTEGRATE:
${context.characterDiscoveries.map(d => `- ${d.characterName}: ${d.description}`).join('\n')}
` : ''}

REVISION RULES:
1. Keep the core story direction intact - don't radically change where the story is going
2. INTEGRATE discoveries naturally - don't force them in if they don't fit
3. Address at least one high-priority thread if possible
4. Reinforce strong themes through character actions or setting details
5. If the original plan already addresses most issues, minimal changes are fine
6. The revised plan should feel like a natural evolution, not a different story

RESPOND WITH JSON:
{
  "revisedTitle": "Chapter title (may be same or updated)",
  "revisedSummary": "Updated chapter summary",
  "revisedBeats": [
    "Beat 1 description",
    "Beat 2 description",
    ...
  ],
  "revisedKeyEvents": ["Event 1", "Event 2"],
  "revisedCharacters": ["Character names"],
  "revisedLocations": ["Location names"],
  "revisedEmotionalGoal": "The emotional journey",
  "revisionReason": ["Why this change was made", "..."],
  "integratedDiscoveries": ["What was integrated", "..."],
  "threadsAddressed": ["Thread descriptions addressed"],
  "confidenceScore": 0.85
}

Respond with ONLY the JSON, no additional text.`;
}

/**
 * Build revision prompt for comic page plans
 */
function buildComicRevisionPrompt(
  originalPlan: ComicPagePlan,
  context: ComicRevisionContext
): string {
  return `You are a comic book editor. Revise this page plan to strengthen visual storytelling and integrate discovered visual motifs.

ORIGINAL PAGE ${originalPlan.pageNumber} PLAN:
Title: ${originalPlan.title || 'Untitled'}
Panel Count: ${originalPlan.panelCount}
Visual Focus: ${originalPlan.visualFocus}
Page Hook: ${originalPlan.pageHook}
Characters: ${originalPlan.charactersPresent.join(', ')}
Emotional Beat: ${originalPlan.emotionalBeat}
Location Change: ${originalPlan.locationChange ? 'Yes' : 'No'}

Panels:
${originalPlan.panels.map((p, i) => `  Panel ${i + 1} (${p.visualEmphasis}): ${p.description}${p.dialogueSummary ? ` - "${p.dialogueSummary}"` : ''}`).join('\n')}

STORY CONTEXT:
- Page ${context.completedChapters} of ${context.totalChapters} just completed
- Current momentum: ${context.currentMomentum}
- Last page: ${context.lastChapterSummary}

${context.visualMotifs.length > 0 ? `
VISUAL MOTIFS TO REINFORCE:
${context.visualMotifs.filter(m => m.shouldRecur).map(m => `- ${m.name}: ${m.meaning}`).join('\n')}
` : ''}

${context.effectivePageHooks.length > 0 ? `
EFFECTIVE PAGE HOOK PATTERNS:
${context.effectivePageHooks.filter(h => h.effectiveness > 0.7).map(h => `- ${h.hookType}: ${h.description}`).join('\n')}
` : ''}

${context.characterVisualConsistency.filter(c => c.issues.length > 0).length > 0 ? `
CHARACTER VISUAL CONSISTENCY ISSUES:
${context.characterVisualConsistency.filter(c => c.issues.length > 0).map(c => `- ${c.character}: ${c.issues.join(', ')}`).join('\n')}
` : ''}

PANEL PACING: ${context.panelPacingTrend}

COMIC-SPECIFIC REVISION RULES:
1. Each page MUST end with a hook that compels the reader to turn the page
2. Vary panel sizes for visual rhythm - don't make all panels the same size
3. Use CLOSE-UPS for emotional beats, WIDE shots for establishing/action
4. Dialogue should be MINIMAL - 25 words max per bubble
5. Show action through visuals, don't describe it in dialogue
6. Maintain character visual consistency (clothing, features, positioning)
7. Use visual motifs to create thematic resonance

RESPOND WITH JSON:
{
  "revisedTitle": "Page title (optional)",
  "revisedPanelCount": 5,
  "revisedPanels": [
    {
      "panelNumber": 1,
      "description": "Visual description",
      "dialogueSummary": "Brief dialogue or null",
      "visualEmphasis": "wide|close|medium|splash",
      "actionBeat": "What happens"
    }
  ],
  "revisedPageHook": "Why reader turns page",
  "revisedVisualFocus": "Main visual element",
  "revisedCharactersPresent": ["Character names"],
  "revisedLocationChange": true,
  "revisedEmotionalBeat": "Emotional moment",
  "revisionReason": ["Why this change was made"],
  "visualMotifsIntegrated": ["Motif names used"],
  "pageHookImproved": true,
  "confidenceScore": 0.85
}

Respond with ONLY the JSON, no additional text.`;
}

/**
 * Build revision prompt for screenplay sequence plans
 */
function buildScreenplayRevisionPrompt(
  originalPlan: ScreenplaySequencePlan,
  context: ScreenplayRevisionContext
): string {
  return `You are a screenplay editor. Revise this sequence plan to improve cinematic storytelling, pacing, and subtext.

ORIGINAL SEQUENCE ${originalPlan.sequenceNumber} PLAN:
Title: ${originalPlan.title}
Act Position: ${originalPlan.actPosition}
Sequence Goal: ${originalPlan.sequenceGoal}
Estimated Pages: ${originalPlan.estimatedPages}
Major Characters: ${originalPlan.majorCharacters.join(', ')}
Locations: ${originalPlan.locations.join(', ')}
Emotional Arc: ${originalPlan.emotionalArc}

Scenes:
${originalPlan.scenes.map((s, i) => `  Scene ${i + 1}: ${s.slugline}
    Purpose: ${s.purpose}
    Tension: ${s.tension}
    Visual Action: ${s.visualAction}
    ${s.subtextGoal ? `Subtext: ${s.subtextGoal}` : ''}`).join('\n')}

STORY CONTEXT:
- Sequence ${context.completedChapters} of ${context.totalChapters} just completed
- Current momentum: ${context.currentMomentum}
- Last sequence: ${context.lastChapterSummary}
- Current dialogue/action ratio: ${(context.dialogueToActionRatio * 100).toFixed(0)}%

${context.visualBeats.filter(vb => vb.effectiveness > 0.7).length > 0 ? `
EFFECTIVE VISUAL BEATS TO REFERENCE:
${context.visualBeats.filter(vb => vb.effectiveness > 0.7).map(vb => `- ${vb.type}: ${vb.description}`).join('\n')}
` : ''}

${context.locationUsage.filter(l => l.canReuse).length > 0 ? `
LOCATIONS AVAILABLE FOR REUSE:
${context.locationUsage.filter(l => l.canReuse).map(l => `- ${l.sluglineFormat} (used ${l.sceneCount}x for: ${l.purposes.join(', ')})`).join('\n')}
` : ''}

${context.pacingIssues.length > 0 ? `
PACING ISSUES TO ADDRESS:
${context.pacingIssues.map(p => `- ${p}`).join('\n')}
` : ''}

${context.subtextOpportunities.length > 0 ? `
SUBTEXT OPPORTUNITIES:
${context.subtextOpportunities.map(s => `- ${s}`).join('\n')}
` : ''}

SCREENPLAY-SPECIFIC REVISION RULES:
1. Show, don't tell - visual action over dialogue exposition
2. Each scene needs a PURPOSE that advances plot or character
3. Vary tension levels - not every scene should be high intensity
4. Subtext is key - characters rarely say exactly what they mean
5. Consolidate locations when possible for production efficiency
6. Action lines should be PUNCHY - 3 sentences max per action block
7. Balance dialogue and action - aim for 40-60% dialogue ratio
8. Enter scenes LATE, leave EARLY - cut the fat

RESPOND WITH JSON:
{
  "revisedTitle": "Sequence title",
  "revisedActPosition": "setup|confrontation|resolution",
  "revisedSequenceGoal": "What this sequence accomplishes",
  "revisedEstimatedPages": 12,
  "revisedScenes": [
    {
      "sceneNumber": 1,
      "slugline": "INT./EXT. LOCATION - TIME",
      "purpose": "Scene purpose",
      "estimatedPages": 2,
      "charactersPresent": ["Character names"],
      "keyDialogue": "Key line or null",
      "visualAction": "Main visual moment",
      "tension": "low|building|high|release",
      "subtextGoal": "What's unsaid"
    }
  ],
  "revisedMajorCharacters": ["Character names"],
  "revisedLocations": ["Location names"],
  "revisedEmotionalArc": "Emotional journey",
  "revisionReason": ["Why this change was made"],
  "visualBeatsIntegrated": ["Visual beat descriptions"],
  "locationsOptimized": ["Locations consolidated or reused"],
  "subtextEnhanced": true,
  "confidenceScore": 0.85
}

Respond with ONLY the JSON, no additional text.`;
}

// ============================================================================
// Main Revision Functions
// ============================================================================

/**
 * Revise a single chapter plan based on discoveries
 */
export async function reviseChapterPlan(
  originalPlan: ChapterPlan,
  context: RevisionContext
): Promise<OutlineRevision> {
  const prompt = buildRevisionPrompt(originalPlan, context);

  try {
    const response = await generateWithAI({
      prompt,
      systemPrompt: 'You are a story editor specializing in maintaining narrative coherence while integrating emergent story elements. Return valid JSON only.',
      maxTokens: 1500,
      temperature: 0.4,  // Some creativity, but mostly coherent
    });

    const revision = JSON.parse(response.trim());

    return {
      chapterNumber: originalPlan.chapterNumber,
      originalPlan,
      revisedPlan: {
        chapterNumber: originalPlan.chapterNumber,
        title: revision.revisedTitle || originalPlan.title,
        summary: revision.revisedSummary || originalPlan.summary,
        beats: revision.revisedBeats || originalPlan.beats,
        targetWordCount: originalPlan.targetWordCount,
        keyEvents: revision.revisedKeyEvents || originalPlan.keyEvents,
        charactersInvolved: revision.revisedCharacters || originalPlan.charactersInvolved,
        locationsPrimary: revision.revisedLocations || originalPlan.locationsPrimary,
        emotionalGoal: revision.revisedEmotionalGoal || originalPlan.emotionalGoal,
      },
      revisionReason: revision.revisionReason || [],
      integratedDiscoveries: revision.integratedDiscoveries || [],
      threadAddressed: revision.threadsAddressed || [],
      confidenceScore: revision.confidenceScore || 0.7,
    };
  } catch (error) {
    console.error('[OutlineRevision] Failed to revise chapter:', error);

    // Return original plan on failure
    return {
      chapterNumber: originalPlan.chapterNumber,
      originalPlan,
      revisedPlan: originalPlan,
      revisionReason: ['AI revision failed - using original plan'],
      integratedDiscoveries: [],
      threadAddressed: [],
      confidenceScore: 0.5,
    };
  }
}

/**
 * Revise a single comic page plan based on visual discoveries
 */
export async function reviseComicPage(
  originalPlan: ComicPagePlan,
  context: ComicRevisionContext
): Promise<ComicPageRevision> {
  const prompt = buildComicRevisionPrompt(originalPlan, context);

  try {
    const response = await generateWithAI({
      prompt,
      systemPrompt: 'You are a comic book editor specializing in visual storytelling, panel composition, and page pacing. Return valid JSON only.',
      maxTokens: 1500,
      temperature: 0.4,
    });

    const revision = JSON.parse(response.trim());

    return {
      pageNumber: originalPlan.pageNumber,
      originalPlan,
      revisedPlan: {
        pageNumber: originalPlan.pageNumber,
        title: revision.revisedTitle || originalPlan.title,
        panelCount: revision.revisedPanelCount || originalPlan.panelCount,
        panels: (revision.revisedPanels || originalPlan.panels).map((p: ComicPanelPlan, i: number) => ({
          panelNumber: i + 1,
          description: p.description,
          dialogueSummary: p.dialogueSummary,
          visualEmphasis: p.visualEmphasis || 'medium',
          actionBeat: p.actionBeat,
        })),
        pageHook: revision.revisedPageHook || originalPlan.pageHook,
        visualFocus: revision.revisedVisualFocus || originalPlan.visualFocus,
        charactersPresent: revision.revisedCharactersPresent || originalPlan.charactersPresent,
        locationChange: revision.revisedLocationChange ?? originalPlan.locationChange,
        emotionalBeat: revision.revisedEmotionalBeat || originalPlan.emotionalBeat,
      },
      revisionReason: revision.revisionReason || [],
      visualMotifsIntegrated: revision.visualMotifsIntegrated || [],
      pageHookImproved: revision.pageHookImproved || false,
      confidenceScore: revision.confidenceScore || 0.7,
    };
  } catch (error) {
    console.error('[OutlineRevision] Failed to revise comic page:', error);

    return {
      pageNumber: originalPlan.pageNumber,
      originalPlan,
      revisedPlan: originalPlan,
      revisionReason: ['AI revision failed - using original plan'],
      visualMotifsIntegrated: [],
      pageHookImproved: false,
      confidenceScore: 0.5,
    };
  }
}

/**
 * Revise a screenplay sequence plan based on cinematic discoveries
 */
export async function reviseScreenplaySequence(
  originalPlan: ScreenplaySequencePlan,
  context: ScreenplayRevisionContext
): Promise<ScreenplaySequenceRevision> {
  const prompt = buildScreenplayRevisionPrompt(originalPlan, context);

  try {
    const response = await generateWithAI({
      prompt,
      systemPrompt: 'You are a screenplay editor specializing in visual storytelling, scene structure, and subtext. Return valid JSON only.',
      maxTokens: 2000,
      temperature: 0.4,
    });

    const revision = JSON.parse(response.trim());

    return {
      sequenceNumber: originalPlan.sequenceNumber,
      originalPlan,
      revisedPlan: {
        sequenceNumber: originalPlan.sequenceNumber,
        title: revision.revisedTitle || originalPlan.title,
        actPosition: revision.revisedActPosition || originalPlan.actPosition,
        scenes: (revision.revisedScenes || originalPlan.scenes).map((s: ScreenplayScenePlan, i: number) => ({
          sceneNumber: i + 1,
          slugline: s.slugline,
          purpose: s.purpose,
          estimatedPages: s.estimatedPages || 2,
          charactersPresent: s.charactersPresent || [],
          keyDialogue: s.keyDialogue,
          visualAction: s.visualAction,
          tension: s.tension || 'building',
          subtextGoal: s.subtextGoal,
        })),
        sequenceGoal: revision.revisedSequenceGoal || originalPlan.sequenceGoal,
        estimatedPages: revision.revisedEstimatedPages || originalPlan.estimatedPages,
        majorCharacters: revision.revisedMajorCharacters || originalPlan.majorCharacters,
        locations: revision.revisedLocations || originalPlan.locations,
        emotionalArc: revision.revisedEmotionalArc || originalPlan.emotionalArc,
      },
      revisionReason: revision.revisionReason || [],
      visualBeatsIntegrated: revision.visualBeatsIntegrated || [],
      locationsOptimized: revision.locationsOptimized || [],
      subtextEnhanced: revision.subtextEnhanced || false,
      confidenceScore: revision.confidenceScore || 0.7,
    };
  } catch (error) {
    console.error('[OutlineRevision] Failed to revise screenplay sequence:', error);

    return {
      sequenceNumber: originalPlan.sequenceNumber,
      originalPlan,
      revisedPlan: originalPlan,
      revisionReason: ['AI revision failed - using original plan'],
      visualBeatsIntegrated: [],
      locationsOptimized: [],
      subtextEnhanced: false,
      confidenceScore: 0.5,
    };
  }
}

/**
 * Revise multiple upcoming chapters (batch revision)
 */
export async function reviseUpcomingChapters(
  upcomingPlans: ChapterPlan[],
  discoveryTracker: DiscoveryTracker,
  lastExtraction: ChapterExtraction,
  totalChapters: number
): Promise<OutlineRevision[]> {
  const context = buildRevisionContext(
    discoveryTracker,
    lastExtraction,
    totalChapters,
    'book'
  );

  const revisions: OutlineRevision[] = [];

  // Revise next 2-3 chapters (don't go too far ahead)
  const chaptersToRevise = upcomingPlans.slice(0, 3);

  for (const plan of chaptersToRevise) {
    const revision = await reviseChapterPlan(plan, context);
    revisions.push(revision);

    // Update context for next revision (chain effect)
    if (revision.threadAddressed.length > 0) {
      context.threadsNeedingResolution = context.threadsNeedingResolution.filter(
        t => !revision.threadAddressed.includes(t.description)
      );
    }
  }

  return revisions;
}

/**
 * Revise multiple upcoming comic pages (batch revision)
 */
export async function reviseUpcomingComicPages(
  upcomingPlans: ComicPagePlan[],
  discoveryTracker: DiscoveryTracker,
  lastExtraction: ChapterExtraction,
  totalPages: number
): Promise<ComicPageRevision[]> {
  const context = buildComicRevisionContext(
    discoveryTracker,
    lastExtraction,
    totalPages
  );

  const revisions: ComicPageRevision[] = [];

  // Revise next 2-3 pages
  const pagesToRevise = upcomingPlans.slice(0, 3);

  for (const plan of pagesToRevise) {
    const revision = await reviseComicPage(plan, context);
    revisions.push(revision);
  }

  return revisions;
}

/**
 * Revise multiple upcoming screenplay sequences (batch revision)
 */
export async function reviseUpcomingScreenplaySequences(
  upcomingPlans: ScreenplaySequencePlan[],
  discoveryTracker: DiscoveryTracker,
  lastExtraction: ChapterExtraction,
  totalSequences: number
): Promise<ScreenplaySequenceRevision[]> {
  const context = buildScreenplayRevisionContext(
    discoveryTracker,
    lastExtraction,
    totalSequences
  );

  const revisions: ScreenplaySequenceRevision[] = [];

  // Revise next 1-2 sequences (screenplays need less look-ahead)
  const sequencesToRevise = upcomingPlans.slice(0, 2);

  for (const plan of sequencesToRevise) {
    const revision = await reviseScreenplaySequence(plan, context);
    revisions.push(revision);
  }

  return revisions;
}

/**
 * Build revision context from discovery tracker
 */
function buildRevisionContext(
  discoveryTracker: DiscoveryTracker,
  lastExtraction: ChapterExtraction,
  totalChapters: number,
  format: ContentFormat = 'book'
): RevisionContext {
  const state = discoveryTracker.getState();
  const unplanned = discoveryTracker.getUnplannedDiscoveries();

  return {
    completedChapters: lastExtraction.chapterNumber,
    totalChapters,
    currentMomentum: lastExtraction.storyMomentum,
    threadsNeedingResolution: discoveryTracker.getThreadsNeedingAttention(),
    staleThreads: discoveryTracker.getStaleThreads(lastExtraction.chapterNumber),
    strongThemes: discoveryTracker.getStrongThemes(),
    characterDiscoveries: unplanned.characters,
    lastChapterSummary: lastExtraction.oneLineSummary,
    format,
  };
}

/**
 * Build comic-specific revision context
 */
function buildComicRevisionContext(
  discoveryTracker: DiscoveryTracker,
  lastExtraction: ChapterExtraction,
  totalPages: number
): ComicRevisionContext {
  const state = discoveryTracker.getState();
  const unplanned = discoveryTracker.getUnplannedDiscoveries();
  const comicState = state.comicState;

  // Determine panel pacing trend
  let panelPacingTrend: 'too-dense' | 'balanced' | 'too-sparse' = 'balanced';
  if (comicState) {
    if (comicState.panelCountAverage > 7) {
      panelPacingTrend = 'too-dense';
    } else if (comicState.panelCountAverage < 3) {
      panelPacingTrend = 'too-sparse';
    }
  }

  return {
    completedChapters: lastExtraction.chapterNumber,
    totalChapters: totalPages,
    currentMomentum: lastExtraction.storyMomentum,
    threadsNeedingResolution: discoveryTracker.getThreadsNeedingAttention(),
    staleThreads: discoveryTracker.getStaleThreads(lastExtraction.chapterNumber),
    strongThemes: discoveryTracker.getStrongThemes(),
    characterDiscoveries: unplanned.characters,
    lastChapterSummary: lastExtraction.oneLineSummary,
    format: 'comic',
    visualMotifs: comicState?.visualMotifs || [],
    effectivePageHooks: comicState?.pageHookPatterns.filter(h => h.effectiveness > 0.6) || [],
    characterVisualConsistency: comicState?.characterVisuals.map(cv => ({
      character: cv.characterName,
      issues: cv.inconsistencies,
    })) || [],
    panelPacingTrend,
  };
}

/**
 * Build screenplay-specific revision context
 */
function buildScreenplayRevisionContext(
  discoveryTracker: DiscoveryTracker,
  lastExtraction: ChapterExtraction,
  totalSequences: number
): ScreenplayRevisionContext {
  const state = discoveryTracker.getState();
  const unplanned = discoveryTracker.getUnplannedDiscoveries();
  const screenplayState = state.screenplayState;

  return {
    completedChapters: lastExtraction.chapterNumber,
    totalChapters: totalSequences,
    currentMomentum: lastExtraction.storyMomentum,
    threadsNeedingResolution: discoveryTracker.getThreadsNeedingAttention(),
    staleThreads: discoveryTracker.getStaleThreads(lastExtraction.chapterNumber),
    strongThemes: discoveryTracker.getStrongThemes(),
    characterDiscoveries: unplanned.characters,
    lastChapterSummary: lastExtraction.oneLineSummary,
    format: 'screenplay',
    visualBeats: screenplayState?.visualBeats || [],
    locationUsage: screenplayState?.locationUsage || [],
    dialogueToActionRatio: screenplayState?.dialogueToActionRatio || 0.5,
    pacingIssues: screenplayState?.pacingIssues || [],
    subtextOpportunities: detectSubtextOpportunities(lastExtraction),
  };
}

/**
 * Detect opportunities for adding subtext based on extraction
 */
function detectSubtextOpportunities(extraction: ChapterExtraction): string[] {
  const opportunities: string[] = [];

  // Check for relationships with tension
  for (const rel of extraction.relationships) {
    if (rel.dynamic === 'conflicted' || rel.dynamic === 'shifting') {
      opportunities.push(`${rel.character1} and ${rel.character2} have unspoken tension that could be shown through action`);
    }
  }

  // Check for characters with secrets
  for (const char of extraction.characters) {
    if (char.internalConflict) {
      opportunities.push(`${char.name}'s internal conflict could be shown through behavior, not stated`);
    }
  }

  return opportunities.slice(0, 3);  // Limit to top 3
}

// ============================================================================
// Smart Revision Logic (No AI Needed)
// ============================================================================

/**
 * Quick revision that doesn't require AI - for minor adjustments
 */
export function quickRevision(
  originalPlan: ChapterPlan,
  threadsToAddress: PlotThread[],
  themesToReinforce: EmergentTheme[]
): ChapterPlan {
  const revised = { ...originalPlan };
  const modifications: string[] = [];

  // 1. Add thread references to beats
  const highPriorityThread = threadsToAddress.find(t => t.priority === 'main');
  if (highPriorityThread && !revised.summary.toLowerCase().includes(highPriorityThread.description.toLowerCase().slice(0, 20))) {
    // Add a beat to address the thread
    revised.beats = [
      ...revised.beats.slice(0, -1),
      `Address: ${highPriorityThread.description}`,
      revised.beats[revised.beats.length - 1],
    ];
    modifications.push(`Added beat for thread: ${highPriorityThread.description}`);
  }

  // 2. Add theme reinforcement hints
  for (const theme of themesToReinforce.slice(0, 2)) {
    if (!revised.summary.toLowerCase().includes(theme.name.toLowerCase())) {
      revised.summary += ` (Reinforce theme: ${theme.name})`;
      modifications.push(`Added theme hint: ${theme.name}`);
    }
  }

  return revised;
}

// ============================================================================
// Revision History
// ============================================================================

export interface RevisionHistory {
  bookId: string;
  revisions: OutlineRevision[];
  totalRevisions: number;
  chaptersRevised: number[];
}

export function createRevisionHistory(bookId: string): RevisionHistory {
  return {
    bookId,
    revisions: [],
    totalRevisions: 0,
    chaptersRevised: [],
  };
}

export function addToHistory(
  history: RevisionHistory,
  revision: OutlineRevision
): RevisionHistory {
  return {
    ...history,
    revisions: [...history.revisions, revision],
    totalRevisions: history.totalRevisions + 1,
    chaptersRevised: [...new Set([...history.chaptersRevised, revision.chapterNumber])],
  };
}

/**
 * Get the current plan for a chapter (original or latest revision)
 */
export function getCurrentPlan(
  originalPlans: ChapterPlan[],
  history: RevisionHistory,
  chapterNumber: number
): ChapterPlan {
  // Find the most recent revision for this chapter
  const revisions = history.revisions.filter(r => r.chapterNumber === chapterNumber);

  if (revisions.length > 0) {
    // Return the most recent revision
    return revisions[revisions.length - 1].revisedPlan;
  }

  // Return original plan
  return originalPlans.find(p => p.chapterNumber === chapterNumber) || originalPlans[0];
}

// ============================================================================
// Integration Summary
// ============================================================================

/**
 * Generate a human-readable summary of what was revised
 */
export function summarizeRevisions(revisions: OutlineRevision[]): string {
  if (revisions.length === 0) {
    return 'No revisions made.';
  }

  let summary = `Revised ${revisions.length} chapter(s):\n\n`;

  for (const revision of revisions) {
    summary += `Chapter ${revision.chapterNumber}:\n`;

    if (revision.revisionReason.length > 0) {
      summary += `  Reasons:\n`;
      for (const reason of revision.revisionReason) {
        summary += `    - ${reason}\n`;
      }
    }

    if (revision.integratedDiscoveries.length > 0) {
      summary += `  Integrated:\n`;
      for (const discovery of revision.integratedDiscoveries) {
        summary += `    + ${discovery}\n`;
      }
    }

    if (revision.threadAddressed.length > 0) {
      summary += `  Threads Addressed:\n`;
      for (const thread of revision.threadAddressed) {
        summary += `    * ${thread}\n`;
      }
    }

    summary += `  Confidence: ${Math.round(revision.confidenceScore * 100)}%\n\n`;
  }

  return summary;
}
