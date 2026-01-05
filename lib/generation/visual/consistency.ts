import { getGeminiFlash, getGeminiPro } from '../shared/api-client';
import { parseJSONFromResponse } from '../shared/json-utils';

/**
 * Check outline consistency every 5 chapters to prevent narrative drift.
 * Compares the "Story So Far" against the "Original Master Plan" and generates
 * corrective instructions to keep the story on track.
 */
export async function checkOutlineConsistency(data: {
  title: string;
  originalPlan: {
    premise: string;
    beginning: string;
    middle: string;
    ending: string;
    characters: { name: string; description: string }[];
  };
  storySoFar: string;
  characterStates: Record<string, { lastSeen: string; currentState: string }>;
  currentChapter: number;
  totalChapters: number;
}): Promise<{
  driftAnalysis: string;
  correctiveInstructions: string;
  updatedNextChapters: { number: number; focus: string }[];
}> {
  const prompt = `You are a Lead Script Doctor and Book Editor performing a mid-story consistency audit.

BOOK: "${data.title}"
CURRENT PROGRESS: Chapter ${data.currentChapter} of ${data.totalChapters}

=== ORIGINAL MASTER PLAN ===
PREMISE: ${data.originalPlan.premise}
BEGINNING: ${data.originalPlan.beginning}
MIDDLE: ${data.originalPlan.middle}
ENDING: ${data.originalPlan.ending}

CHARACTERS:
${data.originalPlan.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

=== STORY GENERATED SO FAR ===
${data.storySoFar}

=== CURRENT CHARACTER STATES ===
${Object.entries(data.characterStates).map(([name, state]) =>
  `- ${name}: Last seen in "${state.lastSeen}". Current state: ${state.currentState}`
).join('\n')}

=== YOUR AUDIT TASKS ===
1. DRIFT ANALYSIS: Has the story deviated from the Original Master Plan? Are we still on track for the planned ending?
2. PLOT POINT CHECK: Identify any missed plot points, abandoned subplots, or unresolved setups from earlier chapters.
3. CHARACTER CONSISTENCY: Are characters behaving in-character? Has anyone acted OOC (Out of Character)?
4. PACING CHECK: Given we're at chapter ${data.currentChapter}/${data.totalChapters}, are we pacing correctly toward the ending?
5. CORRECTIVE INSTRUCTIONS: Provide specific steering instructions for the next 3-5 chapters to ensure the book reaches its intended conclusion.

Output ONLY valid JSON:
{
  "driftAnalysis": "Detailed analysis of how the story is tracking against the plan...",
  "correctiveInstructions": "Specific instructions for steering the next chapters (e.g., 'Ensure Sarah remembers the key from Ch 2', 'Begin building tension for the climax', 'Resolve the subplot about X')...",
  "updatedNextChapters": [
    {"number": ${data.currentChapter + 1}, "focus": "What this chapter should accomplish..."},
    {"number": ${data.currentChapter + 2}, "focus": "What this chapter should accomplish..."},
    {"number": ${data.currentChapter + 3}, "focus": "What this chapter should accomplish..."}
  ]
}`;

  try {
    const result = await getGeminiFlash().generateContent(prompt);
    const response = result.response.text();
    return parseJSONFromResponse(response) as {
      driftAnalysis: string;
      correctiveInstructions: string;
      updatedNextChapters: { number: number; focus: string }[];
    };
  } catch (error) {
    console.error('[checkOutlineConsistency] Error:', error);
    // Return neutral result if check fails - don't block generation
    return {
      driftAnalysis: 'Unable to analyze - continuing with current trajectory.',
      correctiveInstructions: '',
      updatedNextChapters: [],
    };
  }
}

/**
 * Apply thematic polish to the final chapter.
 * Ensures the ending mirrors the opening for thematic closure and
 * verifies that character arcs are properly resolved.
 */
export async function applyThematicPolish(data: {
  title: string;
  genre: string;
  bookType: string;
  originalPlan: {
    premise: string;
    beginning: string;
    ending: string;
    characters: { name: string; description: string }[];
  };
  firstChapterSummary: string;
  finalChapterContent: string;
  characterArcs: Record<string, { startState: string; endState: string }>;
}): Promise<{
  polishedContent: string;
  thematicNotes: string;
}> {
  const prompt = `You are a Senior Executive Editor performing the FINAL POLISH on a book's concluding chapter.

BOOK: "${data.title}"
GENRE: ${data.genre}
TYPE: ${data.bookType}

=== ORIGINAL VISION ===
PREMISE: ${data.originalPlan.premise}
INTENDED ENDING: ${data.originalPlan.ending}

=== OPENING (Chapter 1 Summary) ===
${data.firstChapterSummary}

=== CURRENT FINAL CHAPTER ===
${data.finalChapterContent}

=== CHARACTER ARC TRACKING ===
${Object.entries(data.characterArcs).map(([name, arc]) =>
  `- ${name}: Started as "${arc.startState}" -> Should end as "${arc.endState}"`
).join('\n')}

=== YOUR FINAL POLISH OBJECTIVES ===
1. THEMATIC RESONANCE: Does the final chapter echo or mirror the opening? Create a satisfying "bookend" effect.
2. CHARACTER ARC COMPLETION: Verify that each character's internal journey is resolved or addressed.
3. EMOTIONAL LANDING: Ensure the ending delivers the appropriate emotional payoff for the genre.
4. FINAL IMAGE: End on a visual/emotional beat that lingers in the reader's mind.
5. LOOSE ENDS: Flag any unresolved plot threads that need brief mentions.

Return the POLISHED version of the final chapter with subtle improvements for thematic closure.
Do NOT dramatically change the plot - just enhance the emotional and thematic landing.

Output ONLY valid JSON:
{
  "polishedContent": "The enhanced final chapter text with thematic improvements...",
  "thematicNotes": "Brief notes on what was enhanced and why..."
}`;

  try {
    const result = await getGeminiPro().generateContent(prompt);
    const response = result.response.text();
    return parseJSONFromResponse(response) as {
      polishedContent: string;
      thematicNotes: string;
    };
  } catch (error) {
    console.error('[applyThematicPolish] Error:', error);
    // Return original content if polish fails
    return {
      polishedContent: data.finalChapterContent,
      thematicNotes: 'Polish skipped due to error.',
    };
  }
}
