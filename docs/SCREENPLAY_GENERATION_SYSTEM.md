# Screenplay Generation System Documentation

## Overview

The screenplay generation system creates feature-length screenplays (90-120 pages) using the **Save the Cat** beat sheet structure. Generation occurs in **8 sequences**, each targeting 14-18 pages (~3500-4500 words).

---

## Table of Contents

1. [Generation Flow](#generation-flow)
2. [Beat Sheet & Structure](#beat-sheet--structure)
3. [Character System](#character-system)
4. [Continuity System](#continuity-system)
5. [Humanization Systems](#humanization-systems)
6. [Banned Patterns & Phrases](#banned-patterns--phrases)
7. [Post-Processing Pipeline](#post-processing-pipeline)
8. [Known Issues](#known-issues)

---

## Generation Flow

### Step 1: Outline Generation (`lib/generation/screenplay/outline.ts`)

When a screenplay book is created, the system first generates:

1. **Beat Sheet** - 15 Save the Cat beats
2. **Character Profiles** - 3-5 characters with psychology
3. **Subplots** - 1-2 secondary storylines

**API Route:** `app/api/books/[id]/generate/route.ts`

```
User Input (premise, beginning, middle, ending)
    ↓
generateScreenplayOutline()
    ↓
Returns: BeatSheet + CharacterProfile[] + Subplot[]
    ↓
Creates 8 chapter placeholders (sequences)
    ↓
Initializes ScreenplayContext
```

### Step 2: Sequence-by-Sequence Generation

**API Route:** `app/api/books/[id]/generate-next/route.ts`

Each sequence is generated individually with rolling context:

```
For each sequence (1-8):
    ↓
generateScreenplaySequence()
    ↓
Post-processing checks:
  - detectSequenceLoop()
  - flagExcessiveTics()
  - validateSequenceContinuity()
    ↓
summarizeScreenplaySequence()
    ↓
Update ScreenplayContext for next sequence
```

---

## Beat Sheet & Structure

### Save the Cat 15-Beat Structure

| Beat | Name | Page Range | Description |
|------|------|------------|-------------|
| 1 | Opening Image | 1 | Visual that sets tone/theme |
| 2 | Theme Stated | 5 | Theme spoken (often missed by protagonist) |
| 3 | Setup | 1-10 | Introduce world, characters, stakes |
| 4 | Catalyst | 12 | Inciting incident |
| 5 | Debate | 12-25 | Protagonist hesitates |
| 6 | Break into Two | 25 | Protagonist commits to journey |
| 7 | B Story | 30 | Subplot begins (often love interest) |
| 8 | Fun and Games | 30-55 | "Promise of the premise" |
| 9 | Midpoint | 55 | False victory or false defeat |
| 10 | Bad Guys Close In | 55-75 | External/internal pressure mounts |
| 11 | All Is Lost | 75 | Lowest point, "whiff of death" |
| 12 | Dark Night of the Soul | 75-85 | Protagonist reflects, nearly gives up |
| 13 | Break into Three | 85 | Solution discovered |
| 14 | Finale | 85-110 | Climax, protagonist uses lessons learned |
| 15 | Final Image | 110 | Mirror of opening, shows transformation |

### Sequence-to-Beat Mapping

```typescript
SEQUENCE_TO_BEATS = {
  1: { act: 1, pageRange: '1-12',   beats: ['openingImage', 'themeStated', 'setup', 'catalyst'] },
  2: { act: 1, pageRange: '12-25',  beats: ['debate', 'breakIntoTwo'] },
  3: { act: 2, pageRange: '25-40',  beats: ['bStory', 'funAndGames'] },
  4: { act: 2, pageRange: '40-55',  beats: ['funAndGames', 'midpoint'] },
  5: { act: 2, pageRange: '55-70',  beats: ['badGuysCloseIn'] },
  6: { act: 2, pageRange: '70-85',  beats: ['allIsLost', 'darkNightOfTheSoul'] },
  7: { act: 3, pageRange: '85-100', beats: ['breakIntoThree', 'finale'] },
  8: { act: 3, pageRange: '100-110', beats: ['finale', 'finalImage'] }
}
```

---

## Character System

### Character Profile Structure

```typescript
interface CharacterProfile {
  name: string;
  role: 'protagonist' | 'antagonist' | 'ally' | 'mentor' | 'love_interest' | 'supporting';
  age?: number;
  want: string;           // External goal
  need: string;           // Internal need (often opposite of want)
  flaw: string;           // Character flaw to overcome
  arc: string;            // Character transformation
  internalConflict: string;  // The "secret" they're hiding

  // Dialogue System
  dialogueArchetype: 'The Evader' | 'The Steamroller' | 'The Professor' | 'The Reactor';
  voiceTraits: {
    vocabulary: string;   // e.g., "blue-collar, practical"
    rhythm: string;       // e.g., "short bursts, incomplete sentences"
    tics: string;         // e.g., "clears throat when lying"
  };
}
```

### Dialogue Archetypes

The system assigns one of four archetypes to each character to differentiate speech patterns:

| Archetype | Description | Example |
|-----------|-------------|---------|
| **The Evader** | Deflects with humor, changes subject, never straight answers | "Is that what we're calling it now?" |
| **The Steamroller** | Bulldozes, interrupts, dominates through volume | "No. Listen to me. NO." |
| **The Professor** | Uses technical precision as armor, cracks under pressure | "The statistical likelihood is—" |
| **The Reactor** | Short bursts, emotional, often monosyllabic | "Yeah." / "No." / "What?" |

### Archetype Description in Prompts

```typescript
function getArchetypeDescription(archetype: string): string {
  const descriptions = {
    'The Evader': 'deflects with humor, changes subject, never straight answers',
    'The Steamroller': 'bulldozes, interrupts, dominates through volume',
    'The Professor': 'uses technical precision as ARMOR, but cracks under pressure. When challenged, retreats into jargon. When emotionally cornered, precision FAILS and raw human speech breaks through',
    'The Reactor': 'short bursts, emotional, often monosyllabic',
  };
  return descriptions[archetype] || descriptions['The Reactor'];
}
```

---

## Continuity System

### The Problem: Sequence Amnesia

AI models tend to "forget" what happened in previous sequences and restart the story. The system uses multiple mechanisms to prevent this.

### ScreenplayContext Structure

```typescript
interface ScreenplayContext {
  lastSequenceSummary: string;
  characterStates: Record<string, string>;  // "Character": "emotional/physical state"
  plantedSetups: string[];     // Chekhov's guns
  resolvedPayoffs: string[];   // Paid-off setups
  sequenceSummaries: SequenceSummary[];  // All previous summaries
}
```

### SequenceSummary Structure

```typescript
interface SequenceSummary {
  sequenceNumber: number;
  pageRange: string;
  actNumber: number;
  beatsCovered: string[];
  summary: string;           // 200-word summary with SPECIFIC events
  closedLoops: string[];     // Events that CANNOT be repeated
  characterStates: Record<string, string>;
  characterExits: Array<{
    character: string;
    howExited: string;       // "drove away in red truck"
    lastSeenLocation: string;
  }>;
  plantedSetups: string[];
  resolvedPayoffs: string[];
}
```

### CONTINUITY LOCK (Prompt Section)

For sequences > 1, this is injected into the generation prompt:

```
=== CONTINUITY LOCK (CRITICAL - PREVENTS LOOPING) ===
This is SEQUENCE ${sequenceNumber} of 8. The story CONTINUES - do NOT restart.

EVENTS THAT HAVE ALREADY HAPPENED (NO-GO ZONE - DO NOT REWRITE THESE):
- Seq 1: [summary]
- Seq 2: [summary]
...

RULES:
- DO NOT reintroduce characters as if meeting them for the first time
- DO NOT restart conversations that already happened
- NEVER write "FADE IN:" after Sequence 1
- NEVER write exposition that "sets up" the world - it's already established
- Pick up AFTER the last event from the previous sequence

=== CHARACTER TRUTH (IMMUTABLE - DO NOT ALTER) ===
- NAME: [character]
  AGE: [age] (DO NOT CHANGE)
  ROLE: [role]
  CURRENT STATE: [state]
  ARCHETYPE: [archetype]

These are FACTS. If a character's age or appearance changes, you have FAILED.
```

### Loop Detection Function

```typescript
function detectSequenceLoop(
  currentContent: string,
  previousSummaries: SequenceSummary[],
  sequenceNumber: number
): { isLooping: boolean; issues: string[] }
```

Checks for:
- "FADE IN:" appearing after sequence 1
- Reintroduction patterns ("meet", "introduce", "for the first time")
- Scene repetition from previous sequences

---

## Humanization Systems

### 1. The Screenwriter's Manifesto

Injected into every sequence generation prompt:

```
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
```

### 2. Sentence Rhythm (Anti-Staccato)

```
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
```

### 3. Emotional Break-Points

For characters with "Professor" or "Steamroller" archetypes:

```
=== EMOTIONAL BREAK-POINTS ===
Every "Professor" or "Steamroller" character MUST have 1-2 moments where their verbal strategy FAILS:
- Professor losing precision: "The statistical likelihood— God, I don't know. I just don't."
- Steamroller going quiet: "[Character] opens mouth. Closes it. Nothing comes."
- Evader finally direct: "Fine. Yes. I'm terrified. Happy now?"

This is MANDATORY for emotional authenticity. Consistent verbal strategy = robot.
```

### 4. Protagonist Agency (Sequences 7-8)

```
=== PROTAGONIST AGENCY (SEQUENCES 7-8 ONLY) ===
The protagonist MUST take ACTIVE decisive action in the climax:
- NOT: "Elias watches as Vance leaves" (passive)
- YES: "Elias grabs Vance's arm. ELIAS: You don't get to walk away." (active)

The protagonist's final choice must CAUSE the resolution, not witness it.

=== SPATIAL COMPLETENESS ===
Every character exit must be SHOWN:
- HOW they leave (door, window, car, on foot)
- Protagonist's REACTION to departure
- NO "magic disappearances" - if character is gone, we see them go

BAD: "Vance is gone. The cabin is empty."
GOOD: "The truck engine growls. Vance's headlights sweep across the cabin as he backs out. Elias watches from the window until the taillights vanish into the pines."
```

### 5. Genre-Specific Tone Guidance

```typescript
function getGenreToneGuidance(genre: string): string {
  // Returns genre-appropriate writing guidance
  // Examples:

  // NOIR/CRIME:
  // "Deep shadows in description. Cynicism in dialogue.
  //  Characters speak in clipped sentences. Trust no one.
  //  Rain, smoke, neon. The city is a character."

  // ACTION/THRILLER:
  // "High kineticism. Fragmented sentences in action.
  //  Dialogue during action: SHORT. Breathless. Interrupted.
  //  Time pressure in every scene. Clock is always ticking."

  // HORROR:
  // "Dread in the quiet moments. Less is more.
  //  What we DON'T see is scarier. Imply, don't show.
  //  Ordinary details made sinister. The familiar turned wrong."
}
```

---

## Banned Patterns & Phrases

### Location: `lib/screenplay.ts`

### SCREENPLAY_BANNED_PHRASES

Dialogue that sounds artificial:

```typescript
export const SCREENPLAY_BANNED_PHRASES = [
  "I need you to understand",
  "Here's the thing",
  "Let me be clear",
  "With all due respect",
  "To be honest",
  "The thing is",
  "I have to tell you something",
  "We need to talk",
  "Can we talk?",
  "There's something you should know",
  "I've been meaning to tell you",
  "Look, I know this is hard",
  "I know this isn't easy",
  "You have to believe me",
  "Trust me on this",
];
```

### SCREENPLAY_BANNED_METAPHORS

Overused visual metaphors:

```typescript
export const SCREENPLAY_BANNED_METAPHORS = [
  "weight of the world",
  "tip of the iceberg",
  "light at the end of the tunnel",
  "back against the wall",
  "play with fire",
  "blood runs cold",
  "heart skips a beat",
  "butterflies in stomach",
  "walking on eggshells",
  "elephant in the room",
];
```

### SCREENPLAY_BANNED_CLICHES

Tired dialogue patterns:

```typescript
export const SCREENPLAY_BANNED_CLICHES = [
  "It's not what it looks like",
  "I can explain",
  "You don't understand",
  "It's complicated",
  "We're not so different, you and I",
  "I didn't sign up for this",
  "What could possibly go wrong",
  "I've got a bad feeling about this",
  "There's no time to explain",
  "You just don't get it",
];
```

### SCREENPLAY_SCIENCE_IN_EMOTION

Clinical language that breaks emotional scenes:

```typescript
export const SCREENPLAY_SCIENCE_IN_EMOTION = [
  "statistically",
  "probability",
  "percentage",
  "calculated",
  "optimal",
  "efficient",
  "maximize",
  "minimize",
  "parameters",
  "variables",
];
```

### SCREENPLAY_BANNED_ACTION_STARTS

Action lines should not start with character names:

```typescript
export const SCREENPLAY_BANNED_ACTION_STARTS = [
  "We see",
  "We hear",
  "We watch",
  "The camera",
  "Camera",
];
```

### Prompt Injection (Banned AI-isms)

```
=== BANNED AI-ISMS (INSTANT FAILURE) ===
DIALOGUE:
- "I need you to understand" / "Here's the thing" / "Let me be clear"
- "With all due respect" / "To be honest" / "The thing is"
- Characters explaining feelings: "I feel X because Y"

ACTION LINES:
- "We see" / "We hear" / "We watch" / "The camera"
- Starting with character names: "John walks to the door"
  Instead: "The door SLAMS. John stands in the frame."
```

---

## Post-Processing Pipeline

### Location: `lib/generation/screenplay/review.ts`

### 1. detectExcessiveTics()

Checks for overused physical actions:

```typescript
const TIC_PATTERNS = [
  { pattern: /clean(s|ing|ed)?\s+(his|her|their)\s+glasses/gi, name: 'glasses cleaning' },
  { pattern: /rub(s|bing|bed)?\s+(his|her|their)\s+wrist/gi, name: 'wrist rubbing' },
  { pattern: /clear(s|ing|ed)?\s+(his|her|their)\s+throat/gi, name: 'throat clearing' },
  { pattern: /clench(es|ing|ed)?\s+(his|her|their)\s+jaw/gi, name: 'jaw clenching' },
  { pattern: /ball(s|ing|ed)?\s+(his|her|their)\s+fist/gi, name: 'fist balling' },
  { pattern: /sigh(s|ing|ed)?/gi, name: 'sighing' },
  { pattern: /nod(s|ding|ded)?/gi, name: 'nodding' },
  { pattern: /shrug(s|ging|ged)?/gi, name: 'shrugging' },
];

// Returns issues if any tic appears > 3 times
```

### 2. detectStaccatoRhythm()

Checks for AI metronome writing:

```typescript
function detectStaccatoRhythm(content: string): { hasIssue: boolean; details: string[] } {
  // Checks:
  // 1. Metronome pattern: 4+ consecutive sentences of similar length (3-7 words)
  // 2. Triple pronoun starts: 3+ consecutive sentences starting with same pronoun
  // 3. Excessive fragments: More than 3 consecutive 2-word sentences
}
```

### 3. detectBannedPatterns()

Scans for banned phrases, metaphors, clichés:

```typescript
function detectBannedPatterns(content: string): {
  hasBannedPhrases: boolean;
  hasBannedMetaphors: boolean;
  hasBannedCliches: boolean;
  hasScientificEmotion: boolean;
  details: string[];
}
```

### 4. reviewScreenplaySequence()

Full AI-powered editorial pass:

```typescript
async function reviewScreenplaySequence(data: {
  sequenceContent: string;
  sequenceNumber: number;
  characters: CharacterProfile[];
}): Promise<{
  revisedContent: string;
  issues: string[];
  improvements: string[];
}>
```

Prompt includes 10 editing tasks:
1. On-the-nose dialogue → add subtext
2. Long action blocks → break into 3 lines max
3. Generic verbs → sensory verbs
4. Parentheticals → physical beats
5. Bland sluglines → specific locations
6. Pronoun repetition → vary sentence starts
7. Metronome rhythm → vary sentence lengths
8. Same-y dialogue → differentiate by archetype
9. Excessive tics → vary physical business
10. Passive protagonist → active choices

---

## Known Issues

### 1. Sequence Amnesia (Looping)

**Problem:** AI resets to sequence 1 material mid-screenplay.

**Current Mitigation:** CONTINUITY LOCK prompt section, `detectSequenceLoop()` function.

**Weakness:** `closedLoops` in summaries are often too abstract (e.g., "Elias confronts his past" instead of specific events).

### 2. Robotic "Professor" Dialogue

**Problem:** Characters with "Professor" archetype produce clinical speech:
- "My stock is sufficient for a fourteen-day event"
- "It shall subside"
- "That is highly irregular"

**Current Mitigation:** Emotional break-point requirement in prompt.

**Weakness:** No clinical vocabulary ban list exists. The `SCREENPLAY_SCIENCE_IN_EMOTION` list only covers math/science terms, not overly formal speech patterns.

### 3. Staccato Rhythm

**Problem:** AI writes in metronome rhythm:
- "The water bites. She doesn't flinch. Sinks until the slurry meets her chin."

**Current Mitigation:** `detectStaccatoRhythm()` function, 1-2-5 rule in prompt.

**Weakness:** Detection runs post-generation but may not trigger rewrite. The rhythm section is in the prompt but often ignored.

### 4. Tic Hammering

**Problem:** Same physical actions repeated excessively (glasses cleaning 15+ times).

**Current Mitigation:** `flagExcessiveTics()` only checks 5 patterns and only **warns** (doesn't remove or rewrite).

**Weakness:**
- Missing common tics: Zippo/lighter clicking, throat clearing, pen clicking
- Function doesn't enforce removal, just logs warnings
- Threshold of 3 is too high for some tics

### 5. Review Pass Skipping

**Problem:** If generation takes too long, review pass may be skipped to avoid timeout.

**Current Mitigation:** None.

### 6. On-the-Nose Dialogue

**Problem:** Characters state feelings directly: "I feel betrayed because you lied."

**Current Mitigation:** Rule #1 in Screenwriter's Manifesto.

**Weakness:** No detection function exists to flag on-the-nose dialogue post-generation.

---

## File Reference

| File | Purpose |
|------|---------|
| `lib/screenplay.ts` | Types, constants, validation functions |
| `lib/generation/screenplay/outline.ts` | Beat sheet + character generation |
| `lib/generation/screenplay/sequence.ts` | Main sequence generation |
| `lib/generation/screenplay/review.ts` | Post-processing pipeline |
| `lib/generation/screenplay/index.ts` | Re-exports |
| `app/api/books/[id]/generate/route.ts` | Initial outline generation |
| `app/api/books/[id]/generate-next/route.ts` | Sequential sequence generation |

---

## Generation Parameters

| Parameter | Value | Location |
|-----------|-------|----------|
| Temperature | 0.9 | sequence.ts |
| Max Output Tokens | 16000 | sequence.ts |
| Timeout | 180000ms (3 min) | sequence.ts |
| Target Pages/Sequence | 14-18 | prompt |
| Target Words/Sequence | 3500-4500 | prompt |
| Model | Gemini Flash | api-client.ts |

---

*Document generated for planning purposes. No code changes made.*
