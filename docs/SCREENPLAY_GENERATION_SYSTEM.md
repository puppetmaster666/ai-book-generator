# Screenplay Generation System Documentation

## Overview

The screenplay generation system creates screenplays of **variable lengths** using the **Save the Cat** beat sheet structure. Generation supports **5 format presets**:

| Preset | Sequences | Target Pages | Use Case |
|--------|-----------|--------------|----------|
| `tv_pilot_comedy` | 3 | 30 | TV Comedy Pilot |
| `short_screenplay` | 4 | 40 | Short Film |
| `tv_pilot_drama` | 5 | 60 | TV Drama Pilot |
| `screenplay` | 8 | 100 | Feature Film (default) |
| `epic_screenplay` | 10 | 135 | Epic Feature |

Each sequence targets a dynamically calculated page/word count based on the format.

---

## Table of Contents

1. [Generation Flow](#generation-flow)
2. [Format Presets & Dynamic Mapping](#format-presets--dynamic-mapping)
3. [Beat Sheet & Structure](#beat-sheet--structure)
4. [Character System](#character-system)
5. [Continuity System](#continuity-system)
6. [Humanization Systems](#humanization-systems)
7. [Banned Patterns & Phrases](#banned-patterns--phrases)
8. [Post-Processing Pipeline](#post-processing-pipeline)
9. [Known Issues](#known-issues)

---

## Generation Flow

### Step 1: Outline Generation (`lib/generation/screenplay/outline.ts`)

When a screenplay book is created, the system:

1. **Reads Preset Configuration** from `lib/constants.ts`
2. **Generates Beat Sheet** - 15 Save the Cat beats
3. **Generates Character Profiles** - 3-5 characters with psychology
4. **Creates Dynamic Sequence Mapping** - based on format
5. **Initializes ScreenplayContext** - with target pages

**API Route:** `app/api/books/[id]/generate/route.ts`

```
User Input (premise, beginning, middle, ending, preset)
    |
    v
Read preset config (sequences, targetPages)
    |
    v
generateScreenplayOutline()
    |
    v
Returns: BeatSheet + CharacterProfile[] + Subplot[]
    |
    v
generateSequenceToBeats(totalSequences, targetPages)
    |
    v
Creates N chapter placeholders with dynamic targetWords
    |
    v
Store outline with totalSequences + targetPages
    |
    v
Initializes ScreenplayContext
```

### Step 2: Sequence-by-Sequence Generation

**API Route:** `app/api/books/[id]/generate-next/route.ts`

Each sequence is generated with:
- Dynamic `totalSequences` and `targetPages` from outline
- Rolling context from previous sequences
- Format-aware length requirements

```
For each sequence (1 to totalSequences):
    |
    v
Extract totalSequences, targetPages from outline
    |
    v
getSequenceInfo(sequenceNumber, totalSequences, targetPages)
    |
    v
generateScreenplaySequence({
  ...
  totalSequences,
  targetPages,
})
    |
    v
Post-processing checks:
  - runScreenplayPostProcessing() [Code Fortress]
  - detectSequenceLoop()
  - flagExcessiveTics()
  - validateSequenceContinuity()
    |
    v
Hard Reject Loop (max 2 attempts):
  - Clinical vocabulary detection
  - On-the-nose dialogue detection
  - Sentence variance check
    |
    v
Page Count Enforcement:
  - If < MIN_PAGES_PER_SEQUENCE (10), regenerate
    |
    v
summarizeScreenplaySequence({
  totalSequences,
  targetPages,
})
    |
    v
Update ScreenplayContext for next sequence
```

---

## Format Presets & Dynamic Mapping

### Location: `lib/screenplay.ts`

### FORMAT_BEAT_DISTRIBUTIONS

Maps sequence counts to beat distributions:

```typescript
export const FORMAT_BEAT_DISTRIBUTIONS: Record<number, { beats: string[]; actRatio: number[] }[]> = {
  // 3 sequences - TV Comedy (30 pages, ~10 pages each)
  3: [
    { beats: ['openingImage', 'themeStated', 'setup', 'catalyst'], actRatio: [1] },
    { beats: ['debate', 'breakIntoTwo', 'bStory', 'funAndGames', 'midpoint', 'badGuysCloseIn'], actRatio: [2] },
    { beats: ['allIsLost', 'darkNightOfSoul', 'breakIntoThree', 'finale', 'finalImage'], actRatio: [3] },
  ],

  // 4 sequences - Short Film (40 pages, ~10 pages each)
  4: [
    { beats: ['openingImage', 'themeStated', 'setup', 'catalyst'], actRatio: [1] },
    { beats: ['debate', 'breakIntoTwo', 'bStory', 'funAndGames'], actRatio: [2] },
    { beats: ['midpoint', 'badGuysCloseIn', 'allIsLost', 'darkNightOfSoul'], actRatio: [2] },
    { beats: ['breakIntoThree', 'finale', 'finalImage'], actRatio: [3] },
  ],

  // 5 sequences - TV Drama (50-60 pages, ~12 pages each)
  5: [
    { beats: ['openingImage', 'themeStated', 'setup', 'catalyst'], actRatio: [1] },
    { beats: ['debate', 'breakIntoTwo', 'bStory'], actRatio: [2] },
    { beats: ['funAndGames', 'midpoint', 'badGuysCloseIn'], actRatio: [2] },
    { beats: ['allIsLost', 'darkNightOfSoul', 'breakIntoThree'], actRatio: [2, 3] },
    { beats: ['finale', 'finalImage'], actRatio: [3] },
  ],

  // 8 sequences - Feature Film (100 pages) - DEFAULT
  8: [
    { beats: ['openingImage', 'themeStated', 'setup', 'catalyst'], actRatio: [1] },
    { beats: ['debate', 'breakIntoTwo'], actRatio: [1] },
    { beats: ['bStory', 'funAndGames'], actRatio: [2] },
    { beats: ['funAndGames', 'midpoint'], actRatio: [2] },
    { beats: ['badGuysCloseIn'], actRatio: [2] },
    { beats: ['allIsLost', 'darkNightOfSoul'], actRatio: [2] },
    { beats: ['breakIntoThree', 'finale'], actRatio: [3] },
    { beats: ['finale', 'finalImage'], actRatio: [3] },
  ],

  // 10 sequences - Epic Film (135 pages, ~13-14 pages each)
  10: [
    { beats: ['openingImage', 'themeStated'], actRatio: [1] },
    { beats: ['setup', 'catalyst'], actRatio: [1] },
    { beats: ['debate', 'breakIntoTwo'], actRatio: [1] },
    { beats: ['bStory'], actRatio: [2] },
    { beats: ['funAndGames'], actRatio: [2] },
    { beats: ['midpoint'], actRatio: [2] },
    { beats: ['badGuysCloseIn'], actRatio: [2] },
    { beats: ['allIsLost', 'darkNightOfSoul'], actRatio: [2] },
    { beats: ['breakIntoThree', 'finale'], actRatio: [3] },
    { beats: ['finalImage'], actRatio: [3] },
  ],
};
```

### Dynamic Page/Word Calculation

```typescript
export function generateSequenceToBeats(
  totalSequences: number,
  targetPages: number
): Record<number, { beats: string[]; pageRange: string; act: number; targetWords: number }> {
  const distribution = FORMAT_BEAT_DISTRIBUTIONS[totalSequences];
  const pagesPerSequence = Math.floor(targetPages / totalSequences);
  const wordsPerPage = 250; // Screenplay standard

  const result: Record<number, {...}> = {};

  let currentPage = 1;
  for (let i = 0; i < distribution.length; i++) {
    const seqInfo = distribution[i];
    const endPage = Math.min(currentPage + pagesPerSequence - 1, targetPages);

    result[i + 1] = {
      beats: seqInfo.beats,
      pageRange: `${currentPage}-${endPage}`,
      act: seqInfo.actRatio[0],
      targetWords: pagesPerSequence * wordsPerPage,
    };

    currentPage = endPage + 1;
  }

  return result;
}
```

### getSequenceInfo Helper

```typescript
export function getSequenceInfo(
  sequenceNumber: number,
  totalSequences: number,
  targetPages: number
): { beats: string[]; pageRange: string; act: number; targetWords: number } | null {
  const mapping = generateSequenceToBeats(totalSequences, targetPages);
  return mapping[sequenceNumber] || null;
}
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
| 12 | Dark Night of Soul | 75-85 | Protagonist reflects, nearly gives up |
| 13 | Break into Three | 85 | Solution discovered |
| 14 | Finale | 85-110 | Climax, protagonist uses lessons learned |
| 15 | Final Image | 110 | Mirror of opening, shows transformation |

### Dynamic Sequence-to-Beat Mapping

The mapping is now **dynamically generated** based on format preset. Example for 8-sequence feature film (100 pages):

```typescript
// Generated by getSequenceInfo(n, 8, 100)
Sequence 1: { beats: ['openingImage', 'themeStated', 'setup', 'catalyst'], pageRange: '1-12', act: 1, targetWords: 3125 }
Sequence 2: { beats: ['debate', 'breakIntoTwo'], pageRange: '13-25', act: 1, targetWords: 3125 }
Sequence 3: { beats: ['bStory', 'funAndGames'], pageRange: '26-37', act: 2, targetWords: 3125 }
Sequence 4: { beats: ['funAndGames', 'midpoint'], pageRange: '38-50', act: 2, targetWords: 3125 }
Sequence 5: { beats: ['badGuysCloseIn'], pageRange: '51-62', act: 2, targetWords: 3125 }
Sequence 6: { beats: ['allIsLost', 'darkNightOfSoul'], pageRange: '63-75', act: 2, targetWords: 3125 }
Sequence 7: { beats: ['breakIntoThree', 'finale'], pageRange: '76-87', act: 3, targetWords: 3125 }
Sequence 8: { beats: ['finale', 'finalImage'], pageRange: '88-100', act: 3, targetWords: 3125 }
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

| Archetype | Description | Example |
|-----------|-------------|---------|
| **The Evader** | Deflects with humor, changes subject, never straight answers | "Is that what we're calling it now?" |
| **The Steamroller** | Bulldozes, interrupts, dominates through volume | "No. Listen to me. NO." |
| **The Professor** | Uses technical precision as armor, cracks under pressure | "The statistical likelihood is..." |
| **The Reactor** | Short bursts, emotional, often monosyllabic | "Yeah." / "No." / "What?" |

---

## Continuity System

### The Problem: Sequence Amnesia

AI models tend to "forget" what happened in previous sequences and restart the story. The system uses multiple mechanisms to prevent this.

### Dual-Layer Context System (NEW)

**Location:** `lib/generation/screenplay/sequence.ts`

For sequences > 1, the prompt includes:

1. **Anchor Layer** (Permanent) - Never removed from context:
   - Opening Image from Sequence 1
   - Theme Stated from Sequence 1
   - Setup Summary from Sequence 1
   - Protagonist's starting state

2. **Momentum Layer** (Rolling) - Last 2 sequences:
   - Recent sequence summaries
   - Character state changes
   - Causal bridges

### CausalBridge System (NEW)

Forces THEREFORE/BUT logic instead of AND THEN:

```typescript
interface CausalBridge {
  triggerEvent: string;      // "Elias discovered the letter"
  therefore: string;         // "He must confront Sarah"
  but: string;               // "She's already left for the airport"
  nextSequenceMustAddress: string;  // "The airport confrontation"
}
```

Prompt injection:

```
=== CAUSAL BRIDGE FROM PREVIOUS (MANDATORY PICKUP) ===
Human stories use THEREFORE/BUT logic. AI uses AND THEN (which causes loops).

Because: ${lastSummary.causalBridge.triggerEvent}
THEREFORE: ${lastSummary.causalBridge.therefore}
BUT: ${lastSummary.causalBridge.but}
THIS SEQUENCE MUST ADDRESS: ${lastSummary.causalBridge.nextSequenceMustAddress}

You MUST pick up from the THEREFORE/BUT above. Do NOT invent new setup.
```

### Closed Loop Format (Improved)

```
=== CLOSED LOOPS FORMAT (MANDATORY) ===
Each closed loop MUST follow this template:
"[CHARACTER] [VERB-ED] [OBJECT/PERSON] at [LOCATION]. Result: [OUTCOME]. Scene ended: [HOW]."

BAD (too vague - AI will restart):
"Elias confronts his past"

GOOD (specific - AI knows this is DONE):
"Elias punched Malik in the cabin kitchen. Result: Malik's nose bled, left through back door. Scene ended: Elias alone, washing blood off knuckles."
```

### CONTINUITY LOCK (Dynamic)

```
=== CONTINUITY LOCK (CRITICAL - PREVENTS LOOPING) ===
This is SEQUENCE ${sequenceNumber} of ${totalSequences}. The story CONTINUES - do NOT restart.
```

---

## Humanization Systems

### 1. The Screenwriter's Manifesto

*(Unchanged - see prompt)*

### 2. Sentence Rhythm (Anti-Staccato)

*(Unchanged - see prompt)*

### 3. Emotional Break-Points

*(Unchanged - applies to Professor/Steamroller archetypes)*

### 4. Protagonist Agency (Dynamic)

Now activates for **last 2 sequences of any format**, not hardcoded sequences 7-8:

```typescript
const protagonistAgencySection = (data.sequenceNumber >= data.totalSequences - 1)
```

### 5. Dynamic Length Requirements (NEW)

Length requirements are now calculated from format:

```
=== LENGTH REQUIREMENT (ABSOLUTE MINIMUM - FAILURE TO COMPLY = REJECTION) ===
TARGET PAGES: ${sequenceInfo.pageRange} (${sequenceInfo.targetWords} words)
MINIMUM: ${Math.floor(sequenceInfo.targetWords * 0.8)} words. TARGET: ${sequenceInfo.targetWords} words.
```

---

## Banned Patterns & Phrases

### Clinical Vocabulary Ban (NEW)

**Location:** `lib/screenplay.ts`

```typescript
export const SCREENPLAY_CLINICAL_VOCABULARY = [
  // Formal constructions
  "it shall", "it is imperative", "highly irregular",
  "sufficient for", "I require", "it would appear",
  "one might suggest", "most certainly", "ocular",
  "spatial logistics", "in my estimation",
  // Robotic responses
  "affirmative", "negative", "acknowledged", "understood",
  "that is correct", "precisely so",
];
```

### On-the-Nose Dialogue Patterns (NEW)

```typescript
export const SCREENPLAY_ON_THE_NOSE_PATTERNS = [
  /I feel (so )?(angry|sad|happy|scared|betrayed|hurt)/gi,
  /I('m| am) (so )?(angry|sad|happy|scared|confused)/gi,
  /You make me feel/gi,
  /I need you to understand/gi,
  /What I('m| am) trying to say is/gi,
  /The truth is,? I/gi,
  /I have to be honest/gi,
  /Can I be honest with you/gi,
];
```

### Expanded Tic Patterns (NEW)

```typescript
export const SCREENPLAY_TIC_PATTERNS = [
  { name: 'glasses', pattern: /(clean|wipe|polish|adjust|push|remove)s?\s+(his|her|their)?\s*(glasses|spectacles)/gi, maxPerSequence: 1 },
  { name: 'wrist', pattern: /rub(s|bing|bed)?\s+(his|her|their)\s+wrist/gi, maxPerSequence: 1 },
  { name: 'throat', pattern: /clear(s|ing|ed)?\s+(his|her|their)\s+throat/gi, maxPerSequence: 1 },
  { name: 'jaw', pattern: /clench(es|ing|ed)?\s+(his|her|their)\s+jaw/gi, maxPerSequence: 2 },
  { name: 'fist', pattern: /ball(s|ing|ed)?\s+(his|her|their)\s+fist/gi, maxPerSequence: 2 },
  { name: 'sigh', pattern: /\bsigh(s|ed|ing)?\b/gi, maxPerSequence: 2 },
  { name: 'nod', pattern: /\bnod(s|ded|ding)?\b/gi, maxPerSequence: 3 },
  { name: 'shrug', pattern: /\bshrug(s|ged|ging)?\b/gi, maxPerSequence: 2 },
  { name: 'zippo', pattern: /(click|flip|snap)s?\s+(his|her|their)?\s*(zippo|lighter)/gi, maxPerSequence: 1 },
  { name: 'pen_click', pattern: /(click|tap)s?\s+(his|her|their)?\s*(pen|pencil)/gi, maxPerSequence: 1 },
  { name: 'finger_drum', pattern: /drum(s|ming|med)?\s+(his|her|their)?\s*fingers/gi, maxPerSequence: 1 },
  { name: 'deep_breath', pattern: /take(s)?\s+a\s+deep\s+breath/gi, maxPerSequence: 2 },
  { name: 'eye_contact', pattern: /(break|avoid|hold)s?\s+(eye\s+)?contact/gi, maxPerSequence: 2 },
  { name: 'runs_hand', pattern: /runs?\s+(a\s+)?(his|her|their)?\s*hand\s+through/gi, maxPerSequence: 1 },
];
```

---

## Post-Processing Pipeline

### Location: `lib/generation/screenplay/post-processing.ts`

### Code Fortress: Pure-Code Enforcement (NEW)

The screenplay system now uses a **pure-code post-processing pipeline** that runs WITHOUT AI tokens:

```typescript
export function runScreenplayPostProcessing(
  content: string,
  context: ScreenplayContext,
  sequenceNumber: number,
  previousSummaries: SequenceSummary[]
): {
  content: string;
  updatedContext: ScreenplayContext;
  hardReject: boolean;
  surgicalPrompt: string | null;
  report: {
    varianceScore: number;
    sentencesCombined: number;
    ticsRemoved: string[];
    clinicalFound: string[];
    onTheNoseFound: string[];
  };
}
```

### Pipeline Steps

1. **Sentence Variance Auditor**
   - Calculates standard deviation of sentence lengths
   - Target: stdDev > 4.5 (human-like)
   - AI metronome: stdDev < 3.0
   - Combines sentences to fix staccato rhythm

2. **Tic Credit System**
   - Enforces per-sequence limits from `SCREENPLAY_TIC_PATTERNS`
   - Excess occurrences are REMOVED (not just warned)
   - Replacement strategy: "He pauses." → "A beat." → DELETE

3. **Clinical Dialogue Detection**
   - Scans for `SCREENPLAY_CLINICAL_VOCABULARY`
   - 3+ instances in emotional scenes = hard reject

4. **On-the-Nose Dialogue Detection**
   - Scans for `SCREENPLAY_ON_THE_NOSE_PATTERNS`
   - 2+ instances = hard reject

5. **Hard Reject Handling**
   - If hard reject triggered, regenerate with surgical prompt
   - Max 2 regeneration attempts
   - If still failing, flag `needsPolish: true`

### Hard Reject Loop in generate-next

```typescript
while (regenerationAttempts < MAX_REGENERATION_ATTEMPTS) {
  const postProcessed = runScreenplayPostProcessing(
    sequenceContent,
    screenplayContext,
    nextChapterNum,
    screenplayContext.sequenceSummaries
  );

  if (postProcessed.hardReject) {
    console.warn(`[HARD REJECT] Sequence ${nextChapterNum}: ${postProcessed.surgicalPrompt}`);

    sequenceContent = await generateScreenplaySequence({
      ...originalParams,
      context: {
        ...screenplayContext,
        lastSequenceSummary: `${screenplayContext.lastSequenceSummary}\n\n${postProcessed.surgicalPrompt}`,
      },
    });

    regenerationAttempts++;
    continue;
  }

  // Accept
  sequenceContent = postProcessed.content;
  break;
}
```

### Page Count Enforcement

```typescript
const MIN_PAGES_PER_SEQUENCE = 10;
let lengthRegenerationAttempts = 0;
const MAX_LENGTH_ATTEMPTS = 2;

while (pageCount < MIN_PAGES_PER_SEQUENCE && lengthRegenerationAttempts < MAX_LENGTH_ATTEMPTS) {
  const minPagesForFormat = Math.floor(targetPages / totalSequences);
  const minWordsForFormat = minPagesForFormat * 250;

  // Regenerate with LENGTH ERROR prompt
  sequenceContent = await generateScreenplaySequence({
    ...params,
    context: {
      ...context,
      lastSequenceSummary: `CRITICAL LENGTH ERROR: Only ${pageCount} pages. MINIMUM: ${MIN_PAGES_PER_SEQUENCE}.`,
    },
  });

  lengthRegenerationAttempts++;
}
```

---

## Known Issues

### Resolved Issues

| Issue | Status | Solution |
|-------|--------|----------|
| Clinical "Professor" dialogue | **RESOLVED** | `SCREENPLAY_CLINICAL_VOCABULARY` ban + hard reject |
| On-the-nose dialogue | **RESOLVED** | `SCREENPLAY_ON_THE_NOSE_PATTERNS` detection + hard reject |
| Tic hammering | **RESOLVED** | Tic credit system with per-sequence limits + removal |
| Staccato rhythm | **RESOLVED** | Sentence variance auditor + combination |
| Fixed 8-sequence format | **RESOLVED** | Dynamic `FORMAT_BEAT_DISTRIBUTIONS` |
| Review pass skipping | **MITIGATED** | `needsPolish` flag for background processing |

### Remaining Issues

| Issue | Description | Mitigation |
|-------|-------------|------------|
| Sequence amnesia | AI may still restart material | Dual-layer context + CausalBridge |
| Context window limits | Very long screenplays may exceed context | Rolling 2-sequence momentum |

---

## File Reference

| File | Purpose |
|------|---------|
| `lib/screenplay.ts` | Types, constants, dynamic beat mapping, validation functions |
| `lib/generation/screenplay/outline.ts` | Beat sheet + character generation |
| `lib/generation/screenplay/sequence.ts` | Main sequence generation (dynamic format) |
| `lib/generation/screenplay/post-processing.ts` | Code Fortress pipeline |
| `lib/generation/screenplay/review.ts` | AI-powered editorial pass |
| `lib/generation/screenplay/index.ts` | Re-exports |
| `app/api/books/[id]/generate/route.ts` | Initial outline generation (format-aware) |
| `app/api/books/[id]/generate-next/route.ts` | Sequential sequence generation (format-aware) |
| `lib/constants.ts` | Preset configurations (sequences, targetPages) |

---

## Generation Parameters

| Parameter | Value | Location | Notes |
|-----------|-------|----------|-------|
| Temperature | 0.9 | sequence.ts | Higher for creative dialogue |
| Max Output Tokens | 16000 | sequence.ts | Supports 14-18 pages |
| Timeout | 180000ms (3 min) | sequence.ts | Per sequence |
| Min Pages/Sequence | 10 | generate-next/route.ts | Hard floor |
| Max Regeneration Attempts | 2 | generate-next/route.ts | For hard rejects |
| Model | Gemini Flash | api-client.ts | Fast, cost-effective |

### Format-Specific Parameters

| Format | Sequences | Target Pages | Pages/Sequence | Words/Sequence |
|--------|-----------|--------------|----------------|----------------|
| tv_pilot_comedy | 3 | 30 | ~10 | ~2500 |
| short_screenplay | 4 | 40 | ~10 | ~2500 |
| tv_pilot_drama | 5 | 60 | ~12 | ~3000 |
| screenplay | 8 | 100 | ~12-13 | ~3125 |
| epic_screenplay | 10 | 135 | ~13-14 | ~3375 |

---

*Last updated: January 2026 - Added dynamic format support, Code Fortress post-processing, and dual-layer continuity system.*
