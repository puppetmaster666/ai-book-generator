import {
  BeatSheet,
  CharacterProfile,
  ScreenplayContext,
  SequenceSummary,
  Subplot,
  CausalBridge,
  SEQUENCE_TO_BEATS,
  estimatePageCount,
  SCREENPLAY_CLINICAL_VOCABULARY,
  SCREENPLAY_TIC_PATTERNS,
  SCREENPLAY_ON_THE_NOSE_PATTERNS,
} from '@/lib/screenplay';
import { SAFETY_SETTINGS } from '../shared/safety';
import { getGeminiFlash, withTimeout } from '../shared/api-client';
import { parseJSONFromResponse } from '../shared/json-utils';

/**
 * Helper: Get description for dialogue archetype
 */
function getArchetypeDescription(archetype: string): string {
  const descriptions: Record<string, string> = {
    'The Evader': 'deflects with humor, changes subject, never straight answers',
    'The Steamroller': 'bulldozes, interrupts, dominates through volume',
    'The Professor': 'uses technical precision as ARMOR, but cracks under pressure. When challenged, retreats into jargon. When emotionally cornered, precision FAILS and raw human speech breaks through',
    'The Reactor': 'short bursts, emotional, often monosyllabic',
  };
  return descriptions[archetype] || descriptions['The Reactor'];
}

/**
 * Helper: Get genre-specific tone guidance
 */
function getGenreToneGuidance(genre: string): string {
  const lowerGenre = genre.toLowerCase();

  if (lowerGenre.includes('noir') || lowerGenre.includes('crime')) {
    return `=== GENRE TONE: NOIR/CRIME ===
- Deep shadows in description. Cynicism in dialogue.
- Characters speak in clipped sentences. Trust no one.
- Rain, smoke, neon. The city is a character.`;
  }
  if (lowerGenre.includes('action') || lowerGenre.includes('thriller')) {
    return `=== GENRE TONE: ACTION/THRILLER ===
- High kineticism. Fragmented sentences in action.
- Dialogue during action: SHORT. Breathless. Interrupted.
- Time pressure in every scene. Clock is always ticking.`;
  }
  if (lowerGenre.includes('comedy') || lowerGenre.includes('romcom')) {
    return `=== GENRE TONE: COMEDY ===
- Rhythm is everything. Set up → pause → punchline.
- Dialogue overlaps. Characters talk past each other.
- Physical comedy in action lines. Specificity is funny.`;
  }
  if (lowerGenre.includes('horror')) {
    return `=== GENRE TONE: HORROR ===
- Dread in the quiet moments. Less is more.
- What we DON'T see is scarier. Imply, don't show.
- Ordinary details made sinister. The familiar turned wrong.`;
  }
  if (lowerGenre.includes('drama')) {
    return `=== GENRE TONE: DRAMA ===
- Weight in silence. What's unsaid matters most.
- Small gestures carry enormous meaning.
- The conflict is internal, expressed externally.`;
  }
  if (lowerGenre.includes('romance')) {
    return `=== GENRE TONE: ROMANCE ===
- Tension in proximity. The space between characters.
- Dialogue as foreplay. Every word a step closer or away.
- Longing in looks. The almost-touch.`;
  }

  return `=== GENRE TONE: ${genre.toUpperCase()} ===
- Match tone to genre expectations. Be authentic.
- Subvert tropes intelligently, don't ignore them.`;
}

/**
 * Helper: Build momentum context from last 2 sequences
 */
function buildMomentumContext(summaries: SequenceSummary[]): string {
  if (summaries.length === 0) return 'No previous sequences.';

  return summaries.map(s => {
    const causalInfo = s.causalBridge
      ? `\n  CAUSAL BRIDGE: Because "${s.causalBridge.triggerEvent}" → Therefore "${s.causalBridge.therefore}" → But "${s.causalBridge.but}"`
      : '';
    return `SEQ ${s.sequenceNumber}: ${s.summary}
  CLOSED LOOPS: ${s.closedLoops?.join('; ') || 'None'}${causalInfo}`;
  }).join('\n\n');
}

/**
 * Helper: Build dual-layer context (Anchor + Momentum)
 * Anchor = permanent Seq 1 context that never gets removed
 * Momentum = rolling last 2 sequences
 */
function buildDualLayerContext(context: ScreenplayContext, sequenceNumber: number): string {
  if (sequenceNumber <= 1) return '';

  const allSummaries = context.sequenceSummaries || [];
  const lastTwo = allSummaries.slice(-2);
  const lastSummary = allSummaries[allSummaries.length - 1];

  // Anchor layer (from Seq 1 - never forgotten)
  const anchorSection = context.anchorContext ? `
=== LAYER 1: THE ANCHOR (PERMANENT - DO NOT FORGET) ===
OPENING IMAGE: ${context.anchorContext.openingImage}
THEME STATED: ${context.anchorContext.themeStated}
PROTAGONIST STARTED AS: ${context.anchorContext.protagonistStartState}
SETUP SUMMARY: ${context.anchorContext.setupSummary}
` : '';

  // Momentum layer (rolling last 2 sequences)
  const momentumSection = `
=== LAYER 2: THE MOMENTUM (ROLLING - LAST 2 SEQUENCES) ===
${buildMomentumContext(lastTwo)}
`;

  // CausalBridge from previous sequence
  const causalBridgeSection = lastSummary?.causalBridge ? `
=== CAUSAL BRIDGE FROM PREVIOUS (MANDATORY PICKUP) ===
Human stories use THEREFORE/BUT logic. AI uses AND THEN (which causes loops).

Because: ${lastSummary.causalBridge.triggerEvent}
THEREFORE: ${lastSummary.causalBridge.therefore}
BUT: ${lastSummary.causalBridge.but}
THIS SEQUENCE MUST ADDRESS: ${lastSummary.causalBridge.nextSequenceMustAddress}

You MUST pick up from the THEREFORE/BUT above. Do NOT invent new setup.
` : '';

  return anchorSection + momentumSection + causalBridgeSection;
}

/**
 * Helper: Build clinical vocabulary ban section
 */
function buildClinicalVocabBan(): string {
  const examples = SCREENPLAY_CLINICAL_VOCABULARY.slice(0, 10).map(p => `"${p}"`).join(', ');
  return `
=== CLINICAL VOCABULARY (HARD REJECT) ===
These phrases trigger automatic regeneration:
${examples}...

Even "Professor" archetype characters speak like HUMANS under stress.
When precision FAILS, raw speech emerges:
- "The statistical— God. I don't know."
- "It's not— I can't—" [trails off]
- "Just... just stop."

CONSTRAINT: Every Professor character must have 1-2 moments where
their verbal armor SHATTERS into messy, human fragments.
`;
}

/**
 * Helper: Build subtext engine section
 */
function buildSubtextEngine(): string {
  return `
=== SUBTEXT ENGINE (EVERY SCENE) ===
Before writing dialogue, define for each character IN THIS SCENE:
1. SURFACE GOAL: What they SAY they want
2. SECRET: What they're actually hiding
3. CONSTRAINT: What they CANNOT mention

EXAMPLE:
- Sarah's Surface Goal: "Get the car keys from Elias"
- Sarah's Secret: "She's the one who crashed the car"
- Sarah's Constraint: "Cannot mention the accident or the damage"

This forces EVASION and SUBTEXT. Characters dance around the truth.

ON-THE-NOSE DIALOGUE (HARD REJECT):
✗ "I feel betrayed" / "You make me angry" / "I'm scared"
✓ "You knew. This whole time." / "Get out." / [backs against wall]

Emotion is shown through BEHAVIOR, never stated.
`;
}

/**
 * Helper: Build tic budget warning
 */
function buildTicBudgetWarning(): string {
  const ticLimits = SCREENPLAY_TIC_PATTERNS.slice(0, 8).map(p =>
    `- ${p.name.replace(/_/g, ' ')}: ${p.maxPerSequence}x max`
  ).join('\n');

  return `
=== TIC BUDGET (ENFORCED BY CODE) ===
Each physical tic is LIMITED per sequence:
${ticLimits}

Excess tics will be AUTOMATICALLY REMOVED by post-processing.
Vary your physical business. Use the environment instead of character tics.
AVOID: glasses cleaning, throat clearing, jaw clenching repeated.
USE: Interacting with props, environment, other characters physically.
`;
}

/**
 * Generate a single screenplay sequence (10-15 pages)
 * Uses "Performance Mode" writing with subtext-driven dialogue
 */
export async function generateScreenplaySequence(data: {
  beatSheet: BeatSheet;
  characters: CharacterProfile[];
  sequenceNumber: number;
  context: ScreenplayContext;
  genre: string;
  title: string;
  activeSubplots?: Subplot[]; // Subplots active in this sequence
  onProgress?: (text: string) => void; // Live preview callback
}): Promise<{
  content: string;
  pageCount: number;
}> {
  const sequenceInfo = SEQUENCE_TO_BEATS[data.sequenceNumber];
  if (!sequenceInfo) {
    throw new Error(`Invalid sequence number: ${data.sequenceNumber}`);
  }

  // Build CHARACTER PSYCHOLOGY reference (the key to subtext)
  const characterPsychology = data.characters.map(c => {
    const archetype = c.dialogueArchetype || 'The Reactor';
    const secret = c.internalConflict || 'Hiding their true feelings';
    return `- ${c.name} (${c.role}):
    OBJECTIVE: ${c.want}
    SECRET: ${secret}
    STRATEGY: ${archetype} - ${getArchetypeDescription(archetype)}
    VOICE: ${c.voiceTraits.vocabulary}. ${c.voiceTraits.rhythm}. Tic: "${c.voiceTraits.tics}"`;
  }).join('\n\n');

  // Get the specific beats for this sequence
  const beatsContent = sequenceInfo.beats.map(beat => {
    const beatData = data.beatSheet.beats[beat as keyof typeof data.beatSheet.beats];
    return `- ${beat}: ${beatData}`;
  }).join('\n');

  // Build subplot injection if any are active
  const subplotSection = data.activeSubplots && data.activeSubplots.length > 0
    ? `\nACTIVE SUBPLOTS TO WEAVE IN:\n${data.activeSubplots.map(s => `- ${s.name}: ${s.arc} (Characters: ${s.characters.join(', ')})`).join('\n')}`
    : '';

  // Build DUAL-LAYER context (Anchor + Momentum + CausalBridge)
  const allSummaries = data.context.sequenceSummaries || [];
  const dualLayerContext = buildDualLayerContext(data.context, data.sequenceNumber);

  // Character states and setups (always included)
  const characterStatesSection = data.sequenceNumber > 1
    ? `\nCHARACTER STATES:\n${Object.entries(data.context.characterStates).map(([name, state]) => `- ${name}: ${state}`).join('\n')}\n\nSETUPS TO PAY OFF: ${data.context.plantedSetups.filter(s => !data.context.resolvedPayoffs.includes(s)).join(', ') || 'None pending'}`
    : '';

  // CONTINUITY LOCK - prevents AI from restarting the story
  const continuityLock = data.sequenceNumber > 1
    ? `
=== CONTINUITY LOCK (CRITICAL - PREVENTS LOOPING) ===
This is SEQUENCE ${data.sequenceNumber} of 8. The story CONTINUES - do NOT restart.

EVENTS THAT HAVE ALREADY HAPPENED (NO-GO ZONE - DO NOT REWRITE THESE):
${allSummaries.map(s => {
  const closedLoopsInfo = s.closedLoops && s.closedLoops.length > 0 ? ` [CLOSED: ${s.closedLoops.join('; ')}]` : '';
  return `- Seq ${s.sequenceNumber}: ${s.summary}${closedLoopsInfo}`;
}).join('\n') || '(No previous summaries)'}

RULES:
- DO NOT reintroduce characters as if meeting them for the first time
- DO NOT restart conversations that already happened
- NEVER write "FADE IN:" after Sequence 1
- NEVER write exposition that "sets up" the world - it's already established
- Pick up AFTER the last event from the previous sequence

=== CHARACTER TRUTH (IMMUTABLE - DO NOT ALTER) ===
${data.characters.map(c => `- NAME: ${c.name}
  AGE: ${c.age || 'Unknown'} (DO NOT CHANGE)
  ROLE: ${c.role}
  CURRENT STATE: ${data.context.characterStates[c.name] || 'Normal'}
  ARCHETYPE: ${c.dialogueArchetype}`).join('\n\n')}

These are FACTS. If a character's age or appearance changes, you have FAILED.
`
    : '';

  // NEW: Clinical vocabulary ban, subtext engine, tic budget
  const clinicalVocabBan = buildClinicalVocabBan();
  const subtextEngine = buildSubtextEngine();
  const ticBudget = buildTicBudgetWarning();

  // Emotional break-point requirement for Professor/Steamroller archetypes
  const hasProfessorOrSteamroller = data.characters.some(c =>
    c.dialogueArchetype === 'The Professor' || c.dialogueArchetype === 'The Steamroller'
  );
  const emotionalBreakSection = hasProfessorOrSteamroller
    ? `
=== EMOTIONAL BREAK-POINTS ===
Every "Professor" or "Steamroller" character MUST have 1-2 moments where their verbal strategy FAILS:
- Professor losing precision: "The statistical likelihood— God, I don't know. I just don't."
- Steamroller going quiet: "[Character] opens mouth. Closes it. Nothing comes."
- Evader finally direct: "Fine. Yes. I'm terrified. Happy now?"

This is MANDATORY for emotional authenticity. Consistent verbal strategy = robot.
`
    : '';

  // Protagonist agency requirements for climax sequences (7-8)
  const protagonistAgencySection = (data.sequenceNumber >= 7)
    ? `
=== PROTAGONIST AGENCY (SEQUENCES 7-8 ONLY) ===
The protagonist MUST take ACTIVE decisive action in the climax:
- NOT: "Elias watches as Vance leaves" (passive)
- YES: "Elias grabs Vance's arm. ELIAS: You don't get to walk away." (active)

The protagonist's final choice must CAUSE the resolution, not witness it.
If antagonist departs, protagonist must either:
1. Physically stop them (confrontation)
2. Let them go as a CHOICE (with dialogue showing agency)
3. Do something that makes the departure happen on protagonist's terms

=== SPATIAL COMPLETENESS ===
Every character exit must be SHOWN:
- HOW they leave (door, window, car, on foot)
- Protagonist's REACTION to departure
- NO "magic disappearances" - if character is gone, we see them go

BAD: "Vance is gone. The cabin is empty."
GOOD: "The truck engine growls. Vance's headlights sweep across the cabin as he backs out. Elias watches from the window until the taillights vanish into the pines."
`
    : '';

  // Rhythm directive (anti-staccato)
  const rhythmSection = `
=== SENTENCE RHYTHM (CRITICAL - ANTI-AI) ===
DO NOT write in metronome rhythm. Vary sentence length using the 1-2-5 rule:
- ONE short sentence for impact (under 6 words)
- TWO medium sentences for detail (8-15 words)
- ONE long, flowing sentence for atmosphere (20+ words with commas, dashes, or semicolons)

BAD (AI metronome):
"The water bites. She doesn't flinch. Sinks until the slurry meets her chin."

GOOD (human breath):
"The water bites—she doesn't flinch, just sinks slowly until the grey slurry meets her chin and the cold seeps into her bones like a living thing."

NEVER start three consecutive sentences with the same pronoun (She, He, It, The).
NEVER use more than two 2-word fragments in a row.
`;

  // Genre-specific tone guidance
  const genreTone = getGenreToneGuidance(data.genre);

  const prompt = `You are an elite Hollywood screenwriter. Write SEQUENCE ${data.sequenceNumber} of 8.

MOVIE: "${data.title}" (${data.genre})
LOGLINE: ${data.beatSheet.logline}
THEME: ${data.beatSheet.theme}

ACT ${sequenceInfo.act} | PAGES ${sequenceInfo.pageRange}
BEATS TO HIT:
${beatsContent}
${subplotSection}
${characterStatesSection}
${dualLayerContext}
${continuityLock}
${emotionalBreakSection}
${protagonistAgencySection}
${rhythmSection}
${clinicalVocabBan}
${subtextEngine}
${ticBudget}

=== CHARACTER PSYCHOLOGY (MANDATORY FOR EVERY LINE) ===
${characterPsychology}

=== THE SCREENWRITER'S MANIFESTO ===

1. NO ON-THE-NOSE DIALOGUE
   Characters NEVER say what they feel. If sad, they talk about weather.
   Every line has SURFACE meaning and TRUE meaning underneath.

2. SUBTEXT IS KING
   Dialogue is a WEAPON used to hide the "SECRET" listed above.
   What characters DON'T say matters more than what they DO say.

3. VERTICAL WRITING
   Action paragraphs: MAX 3 LINES. Then white space.
   One image per paragraph. Fast. Punchy. Readable.

4. IN MEDIA RES
   Start MID-ACTION. DELETE any "establishing" throat-clearing.
   Jump directly into conflict. No "Character walks in and sits down."

5. SENSORY ACTION
   Use verbs that imply SOUND or FEELING:
   ✓ "The floorboards GROAN" / "Glass SHATTERS" / "She FLINCHES"
   ✗ "He walks quietly" / "She enters the room"

6. PHYSICAL BEATS OVER PARENTHETICALS
   Instead of: (beat) or (pause)
   Write: "He adjusts his tie." / "She traces the rim of her glass."
   Allowed parentheticals: (O.S.), (V.O.), (CONT'D), (into phone)

${genreTone}

=== BANNED AI-ISMS (INSTANT FAILURE) ===
DIALOGUE:
- "I need you to understand" / "Here's the thing" / "Let me be clear"
- "With all due respect" / "To be honest" / "The thing is"
- Characters explaining feelings: "I feel X because Y"

ACTION LINES:
- "We see" / "We hear" / "We watch" / "The camera"
- Starting with character names: "John walks to the door"
  Instead: "The door SLAMS. John stands in the frame."

=== FORMAT ===
- Sluglines: INT./EXT. LOCATION - DAY/NIGHT
- Character names: ALL CAPS before dialogue
- Transitions: Use sparingly (CUT TO:, FADE OUT.)

=== LENGTH REQUIREMENT (CRITICAL) ===
This sequence MUST be 14-18 pages (approximately 3500-4500 words).
A page of screenplay = ~250 words in proper format.
DO NOT rush. Include FULL scenes with proper action lines, dialogue exchanges, and transitions.
Each beat should have 3-5 scenes minimum.

Start with a slugline. End on a BUTTON (sharp moment).

OUTPUT: Industry-standard screenplay format ONLY. No commentary.`;

  let content: string;

  // Use streaming if onProgress callback is provided for live preview
  if (data.onProgress) {
    const model = getGeminiFlash();
    let accumulated = '';
    let lastProgressUpdate = 0;

    const streamResult = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 16000,
      },
      safetySettings: SAFETY_SETTINGS,
    });

    for await (const chunk of streamResult.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        accumulated += chunkText;
        // Update progress every ~500 characters to avoid too many DB writes
        if (accumulated.length - lastProgressUpdate > 500) {
          data.onProgress(accumulated);
          lastProgressUpdate = accumulated.length;
        }
      }
    }
    // Final progress update
    if (accumulated.length > lastProgressUpdate) {
      data.onProgress(accumulated);
    }
    content = accumulated;
  } else {
    // Non-streaming generation
    const result = await withTimeout(
      () => getGeminiFlash().generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9, // Slightly higher for more creative dialogue
          maxOutputTokens: 16000, // Increased to support 14-18 pages per sequence
        },
        safetySettings: SAFETY_SETTINGS,
      }),
      180000,
      `generateScreenplaySequence_${data.sequenceNumber}`
    );
    content = result.response.text();
  }

  const pageCount = estimatePageCount(content);

  return { content, pageCount };
}

/**
 * Summarize a screenplay sequence for context continuity
 * Uses SPECIFIC closed-loop events to prevent AI from restarting scenes
 */
export async function summarizeScreenplaySequence(data: {
  sequenceContent: string;
  sequenceNumber: number;
  characters: CharacterProfile[];
}): Promise<SequenceSummary> {
  const sequenceInfo = SEQUENCE_TO_BEATS[data.sequenceNumber];

  const prompt = `Summarize this screenplay sequence for continuity tracking.

SEQUENCE ${data.sequenceNumber} CONTENT:
${data.sequenceContent.substring(0, 8000)}

CHARACTERS TO TRACK: ${data.characters.map(c => c.name).join(', ')}

=== SUMMARY REQUIREMENTS (CRITICAL) ===
List SPECIFIC events that CANNOT be repeated in future sequences.
Each event should be a CLOSED LOOP that future sequences must not reopen.

BAD SUMMARY (too vague - AI will restart the scene):
"Elias and Malik argue about the past"

GOOD SUMMARY (specific - AI knows this is DONE):
"Elias reveals he knew about Sarah's affair. Malik punches the wall. They agree to never speak of it again."

For each major event, include:
1. WHO did WHAT to WHOM
2. What was REVEALED or DECIDED
3. How the scene ENDED (physically - who left, who stayed)

=== CLOSED LOOPS FORMAT (MANDATORY) ===
Each closed loop MUST follow this template:
"[CHARACTER] [VERB-ED] [OBJECT/PERSON] at [LOCATION]. Result: [OUTCOME]. Scene ended: [HOW]."

BAD (too vague - AI will restart):
"Elias confronts his past"

GOOD (specific - AI knows this is DONE):
"Elias punched Malik in the cabin kitchen. Result: Malik's nose bled, left through back door. Scene ended: Elias alone, washing blood off knuckles."

=== CAUSAL BRIDGE (MANDATORY) ===
Human stories use THEREFORE/BUT logic. AI uses AND THEN (which causes loops).

You MUST provide:
1. TRIGGER EVENT: The key event that ended this sequence
2. THEREFORE: What the protagonist MUST do next as a result
3. BUT: The obstacle preventing easy resolution
4. NEXT SEQUENCE MUST ADDRESS: The specific conflict to resolve

EXAMPLE:
- TRIGGER: "Elias discovered Sarah's letter revealing the affair"
- THEREFORE: "Elias must confront Sarah before she leaves"
- BUT: "Sarah is already at the airport, and Malik knows Elias is coming"
- NEXT MUST ADDRESS: "Airport confrontation with both Sarah and Malik"

This creates FORWARD MOMENTUM. Without it, the AI will loop.

Provide a JSON summary:
{
  "sequenceNumber": ${data.sequenceNumber},
  "pageRange": "${sequenceInfo?.pageRange || 'unknown'}",
  "actNumber": ${sequenceInfo?.act || 2},
  "beatsCovered": ${JSON.stringify(sequenceInfo?.beats || [])},
  "summary": "200-word summary with SPECIFIC events (not themes or feelings)...",
  "closedLoops": ["[WHO] [DID WHAT] at [WHERE]. Result: [OUTCOME]. Scene ended: [HOW].", "..."],
  "characterStates": {
    "CHARACTER_NAME": "Physical location + emotional state at END of sequence"
  },
  "characterExits": [
    {"character": "NAME", "howExited": "drove away in red truck", "lastSeenLocation": "driveway"}
  ],
  "plantedSetups": ["Things introduced that need payoff later (Chekhov's guns)"],
  "resolvedPayoffs": ["Setups from earlier sequences that were paid off here"],
  "causalBridge": {
    "triggerEvent": "The key event that ended this sequence",
    "therefore": "What protagonist MUST do next as a result",
    "but": "The obstacle preventing easy resolution",
    "nextSequenceMustAddress": "The specific conflict for next sequence"
  }
}`;

  const result = await withTimeout(
    () => getGeminiFlash().generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,  // Increased for complex JSON with causalBridge, closedLoops, characterStates
      },
      safetySettings: SAFETY_SETTINGS,
    }),
    60000,
    'summarizeScreenplaySequence'
  );

  const response = result.response.text();
  return parseJSONFromResponse(response) as SequenceSummary;
}

/**
 * Extract anchor context from Sequence 1 for dual-layer context system.
 * Called once after Sequence 1 completes. This anchor is NEVER removed from context.
 */
export async function extractAnchorContext(data: {
  sequenceContent: string;
  beatSheet: BeatSheet;
  characters: CharacterProfile[];
}): Promise<{
  openingImage: string;
  themeStated: string;
  setupSummary: string;
  protagonistStartState: string;
}> {
  const protagonist = data.characters.find(c => c.role === 'protagonist') || data.characters[0];

  const prompt = `Extract anchor context from Sequence 1 of this screenplay.
This will be used as PERMANENT context for all future sequences.

SEQUENCE 1 CONTENT:
${data.sequenceContent.substring(0, 6000)}

BEAT SHEET REFERENCE:
- Opening Image: ${data.beatSheet.beats.openingImage}
- Theme Stated: ${data.beatSheet.beats.themeStated}
- Setup: ${data.beatSheet.beats.setup}

PROTAGONIST: ${protagonist?.name || 'Unknown'}

=== EXTRACTION REQUIREMENTS ===
1. OPENING IMAGE: The first significant visual from the screenplay (1 sentence)
2. THEME STATED: The thematic dialogue or moment that introduces the theme (1 sentence)
3. SETUP SUMMARY: 200-word summary of Sequence 1 events, characters introduced, world established
4. PROTAGONIST START STATE: Where the protagonist begins emotionally, physically, professionally

This anchor will remind the AI of the beginning throughout the entire screenplay.

Return JSON:
{
  "openingImage": "The first significant visual moment (1 sentence)",
  "themeStated": "The thematic dialogue or moment (1 sentence)",
  "setupSummary": "200-word summary of Sequence 1...",
  "protagonistStartState": "Where ${protagonist?.name || 'protagonist'} begins: emotionally, physically, professionally"
}`;

  const result = await withTimeout(
    () => getGeminiFlash().generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2500,  // Increased for 200-word setupSummary
      },
      safetySettings: SAFETY_SETTINGS,
    }),
    60000,
    'extractAnchorContext'
  );

  const response = result.response.text();
  return parseJSONFromResponse(response) as {
    openingImage: string;
    themeStated: string;
    setupSummary: string;
    protagonistStartState: string;
  };
}
