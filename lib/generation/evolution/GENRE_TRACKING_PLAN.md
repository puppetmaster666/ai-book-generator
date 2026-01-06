# Genre-Specific Narrative Tracking System - Implementation Plan

## Overview

Extend the Story Evolution System to track genre-specific narrative elements that make stories compelling. The current system tracks format-specific elements (books, comics, screenplays) but lacks the sophistication to track genre-specific patterns like romance arcs, mystery clues, comedy timing, and dramatic confrontations.

---

## Problem Statement

**What We Have:**
- Format-specific tracking (books, comics, screenplays)
- Basic relationship tracking
- Theme emergence detection
- Character arc progression

**What We're Missing:**
- Comedy/Humor tracking (jokes, sarcasm, wit, running gags, comedic timing)
- Romance tracking (chemistry, courtship stages, intimacy progression, obstacles)
- Mystery/Thriller tracking (clues, red herrings, suspects, reveals, tension)
- Crime/Procedural tracking (investigations, evidence chains, witnesses)
- Drama tracking (confrontations, secrets, betrayals, affairs, deaths)
- Dialogue sophistication (subtext, sarcasm detection, voice patterns)

---

## Solution Architecture

### New Types Structure

```
lib/generation/evolution/
├── genre/                        # NEW: Genre-specific tracking
│   ├── index.ts                  # Export all genre types
│   ├── romance-tracker.ts        # Romance arc tracking
│   ├── mystery-tracker.ts        # Mystery/thriller elements
│   ├── comedy-tracker.ts         # Humor and comedic elements
│   ├── drama-tracker.ts          # Dramatic elements
│   ├── crime-tracker.ts          # Crime/procedural elements
│   └── dialogue-analyzer.ts      # Dialogue sophistication
│
├── chapter-extraction.ts         # UPDATE: Add genre extraction
├── discovery-tracker.ts          # UPDATE: Add genre processors
└── index.ts                      # UPDATE: Export genre types
```

---

## Phase 1: Core Genre Types

### File: `lib/generation/evolution/genre/index.ts`

Central exports for all genre-specific tracking.

---

### File: `lib/generation/evolution/genre/romance-tracker.ts`

```typescript
/**
 * Romance Arc Tracking
 *
 * Tracks the progression of romantic relationships through standard beats:
 * 1. Meet-Cute / First Encounter
 * 2. Attraction / Awareness
 * 3. Obstacles / Tension
 * 4. Near-Miss / Almost-Kiss
 * 5. Escalation / First Kiss
 * 6. Complication / Black Moment
 * 7. Grand Gesture / Declaration
 * 8. Resolution / HEA/HFN
 */

export type RomanceStage =
  | 'strangers'           // Haven't met yet
  | 'first_encounter'     // Meet-cute or first meeting
  | 'awareness'           // Mutual attraction noticed
  | 'resistance'          // One or both resisting attraction
  | 'growing_tension'     // Unresolved sexual/romantic tension
  | 'near_miss'           // Almost-kiss, interrupted moment
  | 'first_intimacy'      // First kiss or intimate moment
  | 'complications'       // External or internal obstacles
  | 'black_moment'        // All seems lost
  | 'grand_gesture'       // Declaration or big romantic moment
  | 'resolution'          // HEA (Happily Ever After) or HFN (Happy For Now)
  | 'established';        // Ongoing relationship

export interface RomanceChemistry {
  pairName: string;        // "Elena & Marcus"
  character1: string;
  character2: string;
  chemistryLevel: number;  // 1-10
  tensionType: 'sexual' | 'emotional' | 'intellectual' | 'mixed';
  dynamicType: 'equals' | 'mentor_student' | 'rivals' | 'forbidden' | 'slow_burn' | 'enemies_to_lovers';
}

export interface RomanceBeat {
  chapter: number;
  type: 'glance' | 'touch' | 'conversation' | 'argument' | 'confession' | 'kiss' | 'intimacy' | 'separation' | 'reunion';
  characters: string[];
  intensity: 1 | 2 | 3 | 4 | 5;  // How emotionally charged
  isEscalation: boolean;        // Does this advance the romance?
  description: string;
}

export interface RomanceObstacle {
  type: 'external' | 'internal' | 'misunderstanding' | 'rival' | 'circumstance' | 'secret';
  description: string;
  blocksCharacter: string;
  introducedChapter: number;
  resolvedChapter?: number;
  severity: 'minor' | 'significant' | 'major';
}

export interface RomanceArc {
  id: string;
  couple: RomanceChemistry;
  currentStage: RomanceStage;
  stageHistory: { stage: RomanceStage; chapter: number }[];
  beats: RomanceBeat[];
  obstacles: RomanceObstacle[];
  heatLevel: number;           // 1-5, how explicit/steamy
  isPrimary: boolean;          // Main romance or subplot
  intimacyMilestones: {
    firstTouch: number | null;
    firstKiss: number | null;
    loveDeclaration: number | null;
    physicalIntimacy: number | null;
  };
}

export interface RomanceTrackingState {
  arcs: RomanceArc[];
  unpairedCharacters: string[];
  romanticMoments: RomanceBeat[];
  chemistryScore: Record<string, number>;  // "char1_char2" -> score
}
```

---

### File: `lib/generation/evolution/genre/mystery-tracker.ts`

```typescript
/**
 * Mystery/Thriller Tracking
 *
 * Tracks mystery elements using fair-play mystery rules:
 * 1. All clues must be presented to the reader
 * 2. Red herrings must be distinguishable in retrospect
 * 3. The solution must be logically deducible
 */

export type ClueType =
  | 'physical'        // Physical evidence
  | 'testimony'       // Witness statement
  | 'behavioral'      // Suspicious behavior
  | 'documentary'     // Written/recorded evidence
  | 'forensic'        // Scientific evidence
  | 'circumstantial'  // Indirect evidence
  | 'psychological';  // Character-based insight

export interface MysteryClue {
  id: string;
  description: string;
  clueType: ClueType;
  introducedChapter: number;
  foundBy: string;           // Character who discovered it
  pointsTo: string[];        // Who it implicates (can be red herring)
  isRedHerring: boolean;
  wasNoticed: boolean;       // Did the narrative emphasize it?
  significance: 'minor' | 'moderate' | 'major' | 'crucial';
  connectionToOtherClues: string[];
}

export interface Suspect {
  name: string;
  motive: string | null;
  opportunity: string | null;
  means: string | null;      // Murder weapon, method, etc.
  alibi: string | null;
  alibiStrength: 'none' | 'weak' | 'moderate' | 'strong' | 'airtight';
  suspicionLevel: number;    // 0-10
  cluesPointingTo: string[];
  cluesExonerating: string[];
  isGuilty: boolean | null;  // Only set when revealed
  introducedChapter: number;
}

export interface MysteryReveal {
  chapter: number;
  type: 'clue_discovery' | 'connection_made' | 'suspect_eliminated' | 'suspect_added' | 'twist' | 'solution';
  description: string;
  changesInvestigation: boolean;
  surpriseFactor: 1 | 2 | 3 | 4 | 5;
}

export interface InvestigationThread {
  id: string;
  description: string;
  status: 'active' | 'cold' | 'solved' | 'abandoned';
  relatedClues: string[];
  leadingTo: string;         // What this thread is uncovering
  investigator: string;
}

export interface MysteryTrackingState {
  centralMystery: string;                    // Main question (who killed X?)
  clues: MysteryClue[];
  suspects: Suspect[];
  reveals: MysteryReveal[];
  investigationThreads: InvestigationThread[];
  redHerringCount: number;
  solutionRevealed: boolean;
  fairPlayScore: number;                     // How fairly clues were presented
  tensionLevel: number;                      // Current suspense level (1-10)
  ticking_clock?: {
    deadline: string;
    chaptersRemaining: number;
  };
}
```

---

### File: `lib/generation/evolution/genre/comedy-tracker.ts`

```typescript
/**
 * Comedy/Humor Tracking
 *
 * Tracks comedic elements and their effectiveness:
 * - Jokes and punchlines
 * - Running gags
 * - Comedic timing
 * - Character-based humor
 * - Situational comedy
 */

export type HumorType =
  | 'witty_dialogue'      // Clever wordplay in conversation
  | 'situational'         // Funny situations
  | 'physical'            // Slapstick or physical comedy
  | 'ironic'              // Dramatic irony played for laughs
  | 'absurdist'           // Absurd or surreal humor
  | 'dark'                // Dark/gallows humor
  | 'self_deprecating'    // Character makes fun of themselves
  | 'sarcasm'             // Sarcastic remarks
  | 'deadpan'             // Delivered with no emotion
  | 'callback'            // Reference to earlier joke
  | 'running_gag'         // Repeated joke
  | 'character_trait';    // Humor from character quirks

export interface JokeBeat {
  id: string;
  chapter: number;
  type: HumorType;
  setup: string;          // The setup line/situation
  punchline: string;      // The payoff
  deliveredBy: string;    // Character who delivers it
  targetOf?: string;      // Who's the butt of the joke (if any)
  effectiveness: 'flat' | 'mild' | 'good' | 'great' | 'killer';
  isCallback: boolean;    // References earlier joke
  callsBackTo?: string;   // ID of original joke
}

export interface RunningGag {
  id: string;
  description: string;
  firstAppearance: number;
  occurrences: { chapter: number; variation: string }[];
  peakChapter?: number;   // When it was funniest
  isExhausted: boolean;   // Has it worn out its welcome?
  escalates: boolean;     // Does it get bigger each time?
}

export interface SarcasmInstance {
  chapter: number;
  speaker: string;
  statement: string;
  actualMeaning: string;  // What they really mean
  target?: string;        // Who it's aimed at
  subtlety: 'obvious' | 'moderate' | 'subtle';
  isAffectionate: boolean; // Friendly ribbing vs hostile
}

export interface CharacterComedyProfile {
  name: string;
  comedyStyle: HumorType[];
  catchPhrases: string[];
  frequentTargets: string[];  // Who they joke about
  selfAwareness: 'oblivious' | 'partial' | 'self_aware';
  deliveryStyle: 'deadpan' | 'animated' | 'sardonic' | 'earnest';
  isComedyRelief: boolean;
}

export interface ComedyTrackingState {
  jokes: JokeBeat[];
  runningGags: RunningGag[];
  sarcasmInstances: SarcasmInstance[];
  characterProfiles: CharacterComedyProfile[];
  overallTone: 'light' | 'dark' | 'mixed';
  comedyDensity: number;      // Jokes per 1000 words
  callbackOpportunities: {
    joke: string;
    suggestedCallback: string;
    idealChapter: number;
  }[];
}
```

---

### File: `lib/generation/evolution/genre/drama-tracker.ts`

```typescript
/**
 * Drama Element Tracking
 *
 * Tracks high-stakes dramatic elements:
 * - Confrontations
 * - Secrets and revelations
 * - Betrayals
 * - Affairs
 * - Deaths
 * - Power dynamics
 */

export type DramaticMomentType =
  | 'confrontation'       // Two characters face off
  | 'revelation'          // Secret is revealed
  | 'betrayal'            // Trust is broken
  | 'sacrifice'           // Character gives something up
  | 'death'               // Character dies
  | 'near_death'          // Character almost dies
  | 'affair_discovery'    // Infidelity revealed
  | 'power_shift'         // Control/authority changes
  | 'ultimatum'           // Character forces a choice
  | 'breakdown'           // Emotional collapse
  | 'reconciliation'      // Relationship healed
  | 'separation';         // Characters part ways

export interface Confrontation {
  id: string;
  chapter: number;
  participants: string[];
  subject: string;         // What they're confronting about
  instigator: string;
  winner?: string;         // Who "won" the confrontation
  escalationLevel: 1 | 2 | 3 | 4 | 5;
  turnsViolent: boolean;
  unresolved: boolean;     // Still simmering?
  consequences: string[];
}

export interface Secret {
  id: string;
  description: string;
  heldBy: string[];        // Who knows the secret
  hiddenFrom: string[];    // Who doesn't know
  stakes: string;          // What happens if revealed
  introducedChapter: number;
  revealedChapter?: number;
  revealedTo?: string[];
  discoveryMethod?: 'confession' | 'caught' | 'investigation' | 'accident' | 'third_party';
  severity: 'embarrassing' | 'damaging' | 'devastating' | 'life_altering';
}

export interface Affair {
  id: string;
  participants: string[];
  betrayedParty: string;
  startChapter: number;
  discoveryChapter?: number;
  status: 'ongoing' | 'ended' | 'discovered' | 'confessed';
  emotionalNature: 'physical_only' | 'emotional_only' | 'both';
  consequences: string[];
}

export interface CharacterDeath {
  character: string;
  chapter: number;
  type: 'natural' | 'accident' | 'murder' | 'suicide' | 'sacrifice' | 'violence';
  isOnPage: boolean;       // Shown or reported
  witnessedBy: string[];
  emotionalImpact: 'minor' | 'significant' | 'devastating';
  wasExpected: boolean;
  finalWords?: string;
  unfinishedBusiness: string[];
}

export interface PowerDynamic {
  characters: string[];
  type: 'hierarchical' | 'financial' | 'emotional' | 'physical' | 'social';
  dominantParty: string;
  submissiveParty: string;
  isHealthy: boolean;
  shifts: { chapter: number; description: string }[];
}

export interface DramaTrackingState {
  confrontations: Confrontation[];
  secrets: Secret[];
  affairs: Affair[];
  deaths: CharacterDeath[];
  powerDynamics: PowerDynamic[];
  dramaticMoments: {
    chapter: number;
    type: DramaticMomentType;
    description: string;
    impact: number;  // 1-10
  }[];
  tensionPoints: string[];  // Unresolved tensions
  upcomingPayoffs: { setup: string; idealChapter: number }[];
}
```

---

### File: `lib/generation/evolution/genre/crime-tracker.ts`

```typescript
/**
 * Crime/Procedural Tracking
 *
 * Tracks investigation and procedural elements:
 * - Evidence chains
 * - Witness interviews
 * - Forensic findings
 * - Legal proceedings
 */

export interface Evidence {
  id: string;
  type: 'physical' | 'digital' | 'testimonial' | 'documentary' | 'forensic';
  description: string;
  foundAt: string;          // Location
  foundBy: string;          // Character
  chapter: number;
  chainOfCustody: string[]; // Who handled it
  isAdmissible: boolean;
  supports: string;         // What it proves
  contradicts?: string;     // What it disproves
}

export interface Witness {
  name: string;
  credibility: 'unreliable' | 'questionable' | 'credible' | 'highly_credible';
  statement: string;
  inconsistencies: string[];
  interviewChapter: number;
  relationship_to_case: string;
  motive_to_lie?: string;
}

export interface Investigation {
  id: string;
  type: 'murder' | 'theft' | 'fraud' | 'assault' | 'kidnapping' | 'missing_person' | 'other';
  leadInvestigator: string;
  status: 'active' | 'cold' | 'solved' | 'closed_unsolved';
  evidence: Evidence[];
  witnesses: Witness[];
  suspects: string[];
  timeline: { event: string; chapter: number }[];
}

export interface CrimeTrackingState {
  investigations: Investigation[];
  activeLeads: string[];
  deadEnds: string[];
  proceduralAccuracy: 'realistic' | 'dramatized' | 'fantasy';
}
```

---

### File: `lib/generation/evolution/genre/dialogue-analyzer.ts`

```typescript
/**
 * Dialogue Sophistication Analyzer
 *
 * Tracks dialogue quality and character voice:
 * - Subtext detection
 * - Sarcasm patterns
 * - Voice consistency
 * - Dialogue tags and beats
 */

export interface DialogueExchange {
  chapter: number;
  participants: string[];
  hasSubtext: boolean;
  subtextMeaning?: string;     // What's really being said
  tensionLevel: number;        // 1-10
  topicSurface: string;        // What they're discussing
  topicReal?: string;          // What they're really discussing
}

export interface CharacterVoice {
  character: string;
  vocabularyLevel: 'simple' | 'moderate' | 'sophisticated' | 'technical';
  sentencePatterns: string[];  // Short, long, questions, etc.
  catchPhrases: string[];
  speechQuirks: string[];      // Accent, filler words, etc.
  formality: 'casual' | 'moderate' | 'formal';
  emotionalExpressiveness: 'reserved' | 'moderate' | 'expressive';
}

export interface SubtextMoment {
  chapter: number;
  speaker: string;
  saidText: string;
  meantText: string;
  listener: string;
  understoodByListener: boolean;
  understoodByReader: boolean;
  type: 'threat' | 'flirtation' | 'deception' | 'warning' | 'emotional' | 'political';
}

export interface DialoguePattern {
  type: 'interrogation' | 'argument' | 'seduction' | 'negotiation' | 'confession' | 'small_talk' | 'exposition';
  frequency: number;
  effectiveness: 'weak' | 'moderate' | 'strong';
  examples: string[];
}

export interface DialogueTrackingState {
  exchanges: DialogueExchange[];
  characterVoices: CharacterVoice[];
  subtextMoments: SubtextMoment[];
  patterns: DialoguePattern[];
  dialogueQuality: {
    subtextRatio: number;      // % with subtext
    voiceConsistency: number;  // How distinct voices are
    expositionBalance: number; // Show vs tell balance
  };
}
```

---

## Phase 2: Integration with Existing System

### Update: `lib/generation/evolution/chapter-extraction.ts`

Add genre extraction to the main extraction function:

```typescript
// Add to ChapterExtraction interface
export interface ChapterExtraction {
  // ... existing fields ...

  // GENRE-SPECIFIC EXTRACTION
  genreElements?: {
    romance?: {
      romanticMoments: RomanceBeat[];
      chemistryObservations: { pair: string; observation: string }[];
      stageProgression?: { from: RomanceStage; to: RomanceStage };
    };
    mystery?: {
      cluesFound: MysteryClue[];
      suspectChanges: { suspect: string; change: 'added' | 'eliminated' | 'implicated' }[];
      revelations: MysteryReveal[];
    };
    comedy?: {
      jokes: JokeBeat[];
      sarcasmInstances: SarcasmInstance[];
      runningGagOccurrences: string[];
    };
    drama?: {
      confrontations: Confrontation[];
      secretsRevealed: string[];
      secretsIntroduced: Secret[];
      dramaticMoments: DramaticMomentType[];
    };
    dialogue?: {
      subtextMoments: SubtextMoment[];
      voiceObservations: { character: string; observation: string }[];
    };
  };
}
```

### New Extraction Prompt Section

```typescript
function buildGenreExtractionAddendum(genres: string[]): string {
  let addendum = `

  "genreElements": {`;

  if (genres.includes('romance')) {
    addendum += `
    "romance": {
      "romanticMoments": [
        {
          "type": "glance|touch|conversation|argument|confession|kiss|intimacy|separation|reunion",
          "characters": ["Character1", "Character2"],
          "intensity": 1-5,
          "isEscalation": true/false,
          "description": "What happened"
        }
      ],
      "chemistryObservations": [
        { "pair": "Character1 & Character2", "observation": "Description of chemistry" }
      ],
      "stageProgression": { "from": "awareness", "to": "growing_tension" }
    },`;
  }

  if (genres.includes('mystery')) {
    addendum += `
    "mystery": {
      "cluesFound": [
        {
          "description": "Clue description",
          "clueType": "physical|testimony|behavioral|documentary|forensic|circumstantial|psychological",
          "foundBy": "Character name",
          "pointsTo": ["Suspect names"],
          "isRedHerring": true/false,
          "significance": "minor|moderate|major|crucial"
        }
      ],
      "suspectChanges": [
        { "suspect": "Name", "change": "added|eliminated|implicated" }
      ],
      "revelations": [
        {
          "type": "clue_discovery|connection_made|suspect_eliminated|suspect_added|twist|solution",
          "description": "What was revealed",
          "surpriseFactor": 1-5
        }
      ]
    },`;
  }

  if (genres.includes('comedy')) {
    addendum += `
    "comedy": {
      "jokes": [
        {
          "type": "witty_dialogue|situational|physical|ironic|absurdist|dark|sarcasm|deadpan|callback|running_gag|character_trait",
          "setup": "Setup line/situation",
          "punchline": "Payoff",
          "deliveredBy": "Character",
          "effectiveness": "flat|mild|good|great|killer"
        }
      ],
      "sarcasmInstances": [
        {
          "speaker": "Character",
          "statement": "What they said",
          "actualMeaning": "What they meant",
          "subtlety": "obvious|moderate|subtle"
        }
      ],
      "runningGagOccurrences": ["Gag description if occurred"]
    },`;
  }

  if (genres.includes('drama')) {
    addendum += `
    "drama": {
      "confrontations": [
        {
          "participants": ["Char1", "Char2"],
          "subject": "What about",
          "instigator": "Who started it",
          "escalationLevel": 1-5,
          "turnsViolent": true/false,
          "unresolved": true/false
        }
      ],
      "secretsRevealed": ["Secret descriptions that came out"],
      "secretsIntroduced": [
        {
          "description": "Secret",
          "heldBy": ["Who knows"],
          "hiddenFrom": ["Who doesn't"],
          "severity": "embarrassing|damaging|devastating|life_altering"
        }
      ],
      "dramaticMoments": ["confrontation|revelation|betrayal|sacrifice|death|affair_discovery|power_shift|breakdown"]
    },`;
  }

  addendum += `
    "dialogue": {
      "subtextMoments": [
        {
          "speaker": "Character",
          "saidText": "Surface dialogue",
          "meantText": "Real meaning",
          "listener": "Who heard it",
          "understoodByListener": true/false,
          "type": "threat|flirtation|deception|warning|emotional|political"
        }
      ],
      "voiceObservations": [
        { "character": "Name", "observation": "How their voice/speech was distinct" }
      ]
    }
  }`;

  return addendum;
}
```

---

## Phase 3: Update Discovery Tracker

### Add to `discovery-tracker.ts`

```typescript
export interface DiscoveryState {
  // ... existing fields ...

  // GENRE-SPECIFIC STATE
  genreState?: {
    romance?: RomanceTrackingState;
    mystery?: MysteryTrackingState;
    comedy?: ComedyTrackingState;
    drama?: DramaTrackingState;
    crime?: CrimeTrackingState;
    dialogue?: DialogueTrackingState;
  };

  activeGenres: ('romance' | 'mystery' | 'comedy' | 'drama' | 'crime')[];
}

// Add genre processors
private processGenreElements(extraction: ChapterExtraction): {
  new: string[];
  reinforced: string[];
  suggestions: string[];
} {
  if (!extraction.genreElements) return { new: [], reinforced: [], suggestions: [] };

  const results = { new: [], reinforced: [], suggestions: [] };

  if (extraction.genreElements.romance) {
    const romanceResults = this.processRomanceElements(extraction.genreElements.romance);
    results.new.push(...romanceResults.new);
    results.reinforced.push(...romanceResults.reinforced);
    results.suggestions.push(...romanceResults.suggestions);
  }

  // ... similar for other genres

  return results;
}
```

---

## Phase 4: Genre-Specific Insights

### Discovery Report Additions

```typescript
export interface DiscoveryReport {
  // ... existing fields ...

  genreInsights?: {
    romance?: {
      activeArcs: { couple: string; stage: RomanceStage }[];
      nextRomanticBeat: string;
      tensionOpportunities: string[];
    };
    mystery?: {
      unresolvedClues: number;
      activeSuspects: string[];
      recommendedReveal: string;
      fairPlayWarnings: string[];
    };
    comedy?: {
      callbackOpportunities: string[];
      overusedGags: string[];
      humorBalance: string;
    };
    drama?: {
      unresolvedTensions: string[];
      upcomingConfrontations: string[];
      secretsTicking: string[];  // Secrets close to revelation
    };
  };
}
```

---

## Implementation Order

### Step 1: Core Types (2-3 files)
1. Create `lib/generation/evolution/genre/index.ts` - Central exports
2. Create `lib/generation/evolution/genre/types.ts` - All type definitions

### Step 2: Individual Trackers (5 files)
3. `romance-tracker.ts` - Romance arc tracking
4. `mystery-tracker.ts` - Mystery/thriller elements
5. `comedy-tracker.ts` - Humor tracking
6. `drama-tracker.ts` - Dramatic elements
7. `dialogue-analyzer.ts` - Dialogue sophistication

### Step 3: Integration
8. Update `chapter-extraction.ts` - Add genre extraction prompts
9. Update `discovery-tracker.ts` - Add genre processors
10. Update `index.ts` - Export all genre types

### Step 4: Genre Detection
11. Add automatic genre detection from book metadata/content
12. Configure which trackers to activate per book

---

## Files to Create

| File | Purpose | Size Estimate |
|------|---------|---------------|
| `genre/index.ts` | Exports | ~50 lines |
| `genre/types.ts` | All type definitions | ~400 lines |
| `genre/romance-tracker.ts` | Romance processing | ~200 lines |
| `genre/mystery-tracker.ts` | Mystery processing | ~250 lines |
| `genre/comedy-tracker.ts` | Comedy processing | ~200 lines |
| `genre/drama-tracker.ts` | Drama processing | ~250 lines |
| `genre/dialogue-analyzer.ts` | Dialogue analysis | ~200 lines |

**Total: 7 new files, ~1,550 lines**

## Files to Modify

| File | Changes |
|------|---------|
| `chapter-extraction.ts` | Add `genreElements` to extraction, new prompt builder |
| `discovery-tracker.ts` | Add `genreState`, genre processors, genre insights |
| `index.ts` | Export all genre types |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Romance stage detection accuracy | 85%+ |
| Clue tracking completeness | 95%+ |
| Sarcasm detection | 70%+ |
| Confrontation detection | 90%+ |
| Secret tracking | 95%+ |
| Dialogue subtext detection | 60%+ |

---

## Usage Example

```typescript
import {
  initializeEvolutionTracking,
  runEvolutionPipeline,
} from '@/lib/generation/evolution';

// Initialize with genres
const { discoveryTracker, characterArcTracker } = initializeEvolutionTracking(
  bookId,
  originalOutline,
  characters,
  'book',
  ['romance', 'mystery', 'drama']  // Active genres
);

// After chapter generation
const result = await runEvolutionPipeline(
  chapterContent,
  chapterNumber,
  // ... other params
);

// Access genre insights
if (result.discoveryReport.genreInsights?.romance) {
  console.log('Romance arc:', result.discoveryReport.genreInsights.romance.activeArcs);
  console.log('Next beat suggestion:', result.discoveryReport.genreInsights.romance.nextRomanticBeat);
}

if (result.discoveryReport.genreInsights?.mystery) {
  console.log('Unresolved clues:', result.discoveryReport.genreInsights.mystery.unresolvedClues);
  console.log('Fair play warnings:', result.discoveryReport.genreInsights.mystery.fairPlayWarnings);
}
```

---

---

## Phase 5: Behavioral Simulation Systems (ENFORCEMENT)

The tracking systems above are PASSIVE - they observe what happened. The behavioral simulation systems below are ACTIVE - they ENFORCE narrative rules during generation.

### Key Insight

**Tracking** = "The romance escalated from awareness to tension"
**Enforcement** = "REJECT: Romance cannot jump 3 stages in one chapter. Max movement: 1 stage."

---

### File: `lib/generation/atomic/voice-profiles.ts`

Character dialogue fingerprinting that ENFORCES voice consistency.

```typescript
/**
 * Voice Profile System
 *
 * Each character has a dialogue fingerprint. When generating dialogue,
 * we validate it matches their profile. Violations trigger surgical retries.
 */

export interface CharacterVoiceProfile {
  name: string;

  // Sentence structure
  sentenceLengthAvg: number;        // Target average word count per sentence
  sentenceLengthVariance: number;   // How much they vary

  // Personality markers
  sarcasmLevel: number;             // 0-1, how often they use sarcasm
  vocabularyTier: 'Simple' | 'Moderate' | 'High/Clinical' | 'Technical' | 'Poetic';
  formality: number;                // 0-1, casual to formal

  // Speech patterns
  contractions: boolean;            // Uses "don't" vs "do not"
  questions: 'rare' | 'moderate' | 'frequent';  // How often they ask questions
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

export const CHARACTER_PROFILES: Record<string, CharacterVoiceProfile> = {
  // Example profiles - these would be generated per book
};

/**
 * Validate dialogue matches character voice profile
 */
export function validateCharacterVoice(
  dialogue: string,
  character: string,
  profile: CharacterVoiceProfile
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check banned words
  for (const banned of profile.bannedWords) {
    if (new RegExp(`\\b${banned}\\b`, 'i').test(dialogue)) {
      violations.push(`${character} would never say "${banned}"`);
    }
  }

  // Check vocabulary tier
  const complexWords = countComplexWords(dialogue);
  const wordCount = dialogue.split(/\s+/).length;
  const complexityRatio = complexWords / wordCount;

  if (profile.vocabularyTier === 'Simple' && complexityRatio > 0.1) {
    violations.push(`${character} uses simpler vocabulary. Too many complex words.`);
  }
  if (profile.vocabularyTier === 'High/Clinical' && complexityRatio < 0.15) {
    violations.push(`${character} speaks more clinically. Add precision/technical terms.`);
  }

  // Check contractions
  const hasContractions = /\b(don't|won't|can't|shouldn't|wouldn't|I'm|you're|he's|she's|it's|we're|they're)\b/i.test(dialogue);
  if (profile.contractions === false && hasContractions) {
    violations.push(`${character} avoids contractions. Use full forms.`);
  }
  if (profile.contractions === true && !hasContractions && wordCount > 20) {
    violations.push(`${character} uses contractions naturally. Add some.`);
  }

  // Check sarcasm level
  if (profile.sarcasmLevel < 0.2) {
    // Low sarcasm character - check for sarcastic patterns
    const sarcasmPatterns = /\b(oh really|sure|right|whatever|totally|of course)\b/i;
    if (sarcasmPatterns.test(dialogue)) {
      violations.push(`${character} is not sarcastic. Rephrase sincerely.`);
    }
  }

  // Check emotional openness
  if (profile.emotionalOpenness < 0.3) {
    // Emotionally closed character
    const emotionalPatterns = /\b(I feel|I love|I'm scared|I'm worried|it hurts)\b/i;
    if (emotionalPatterns.test(dialogue)) {
      violations.push(`${character} doesn't express feelings directly. Show through action instead.`);
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Build voice profile from character description (at book creation)
 */
export function buildVoiceProfile(
  name: string,
  description: string,
  backstory: string
): CharacterVoiceProfile {
  // Analyze description for voice markers
  const isEducated = /professor|doctor|lawyer|scientist|intellectual/i.test(description);
  const isCasual = /laid-back|easygoing|friendly|warm/i.test(description);
  const isSarcastic = /sarcastic|cynical|witty|dry humor/i.test(description);
  const isTerse = /quiet|reserved|stoic|man of few words/i.test(description);
  const isVerbose = /talkative|chatty|loves to talk|verbose/i.test(description);

  return {
    name,
    sentenceLengthAvg: isTerse ? 6 : isVerbose ? 15 : 10,
    sentenceLengthVariance: 3,
    sarcasmLevel: isSarcastic ? 0.8 : 0.2,
    vocabularyTier: isEducated ? 'High/Clinical' : isCasual ? 'Simple' : 'Moderate',
    formality: isEducated ? 0.7 : isCasual ? 0.3 : 0.5,
    contractions: !isEducated || isCasual,
    questions: 'moderate',
    exclamations: isCasual ? 'frequent' : 'rare',
    trait: isTerse ? 'Terse' : isVerbose ? 'Verbose' : isSarcastic ? 'Evasive' : 'Direct',
    catchPhrases: [],
    bannedWords: [],
    favoriteWords: [],
    emotionalOpenness: isCasual ? 0.7 : 0.4,
    deflectsWithHumor: isSarcastic
  };
}

function countComplexWords(text: string): number {
  // Words with 3+ syllables or technical terms
  const words = text.split(/\s+/);
  return words.filter(w => w.length > 8 || /tion|sion|ment|ness|ity/.test(w)).length;
}
```

---

### File: `lib/generation/atomic/tension-slider.ts`

The "Slider" for romance and drama pacing - ENFORCES gradual progression.

```typescript
/**
 * Tension Slider System
 *
 * Tracks emotional proximity between characters and ENFORCES pacing rules.
 * Key rule: Tension can only move ±1 point per chapter (no sudden jumps).
 */

export interface TensionState {
  pairId: string;                    // "char1_char2"
  character1: string;
  character2: string;
  currentLevel: number;              // 1-10 emotional proximity
  history: { chapter: number; level: number; reason: string }[];
  tensionType: 'romantic' | 'hostile' | 'familial' | 'professional';

  // Romance-specific
  physicalProximityScore: number;    // 0-10 (0 = never touch, 10 = intimate)
  emotionalVulnerability: number;    // 0-10 how open they are with each other

  // Pacing rules
  lastChapterMovement: number;       // +1, 0, or -1
  chaptersAtCurrentLevel: number;    // How long at this level
}

export interface TensionMovement {
  from: number;
  to: number;
  chapter: number;
  reason: string;
  isValid: boolean;
  violation?: string;
}

/**
 * THE GOLDEN RULE: Max ±1 per chapter
 */
export function validateTensionMovement(
  current: number,
  proposed: number,
  chapter: number,
  lastMovement: TensionMovement | null
): { valid: boolean; violation?: string } {
  const movement = proposed - current;

  // Rule 1: Max 1 point movement per chapter
  if (Math.abs(movement) > 1) {
    return {
      valid: false,
      violation: `PACING VIOLATION: Tension cannot jump from ${current} to ${proposed} in one chapter. Max movement: ±1. Current: ${current}, Max allowed: ${current - 1} to ${current + 1}.`
    };
  }

  // Rule 2: Cannot reverse direction immediately (no whiplash)
  if (lastMovement && lastMovement.chapter === chapter - 1) {
    if (lastMovement.from < lastMovement.to && movement < 0) {
      return {
        valid: false,
        violation: `WHIPLASH DETECTED: Tension rose last chapter, cannot immediately drop. Let it simmer for at least one chapter.`
      };
    }
    if (lastMovement.from > lastMovement.to && movement > 0) {
      return {
        valid: false,
        violation: `WHIPLASH DETECTED: Tension dropped last chapter, cannot immediately spike. Build gradually.`
      };
    }
  }

  return { valid: true };
}

/**
 * Intimacy Scene Requirements
 *
 * Before any intimacy scene (level 8+), require "sensory anchoring":
 * The reader must have experienced the ENVIRONMENT first.
 */
export function validateIntimacyScene(
  content: string,
  previousContent: string,
  tensionLevel: number
): { valid: boolean; violation?: string } {
  if (tensionLevel < 8) {
    return { valid: true }; // Not an intimacy scene
  }

  // Check for sensory anchors in previous content or scene setup
  const sensoryAnchors = {
    visual: /\b(light|shadow|dark|glow|flicker|shine|lamp|candle|moonlight)\b/i,
    auditory: /\b(sound|music|silence|whisper|breathing|rain|wind)\b/i,
    tactile: /\b(cold|warm|soft|rough|smooth|fabric|sheets|skin)\b/i,
    olfactory: /\b(smell|scent|perfume|smoke|air|fresh)\b/i
  };

  const anchorContext = previousContent.slice(-500) + content.slice(0, 200);
  let anchorsFound = 0;

  for (const [sense, pattern] of Object.entries(sensoryAnchors)) {
    if (pattern.test(anchorContext)) {
      anchorsFound++;
    }
  }

  if (anchorsFound < 2) {
    return {
      valid: false,
      violation: `INTIMACY SCENE REQUIRES GROUNDING: Before high-tension scenes (level ${tensionLevel}), establish at least 2 sensory anchors (visual, auditory, tactile, olfactory). Found only ${anchorsFound}. Add environmental details.`
    };
  }

  return { valid: true };
}

/**
 * Track and manage tension for all pairs
 */
export class TensionTracker {
  private tensions: Map<string, TensionState> = new Map();

  initializePair(char1: string, char2: string, type: TensionState['tensionType'], initialLevel: number = 1): void {
    const pairId = this.getPairId(char1, char2);
    this.tensions.set(pairId, {
      pairId,
      character1: char1,
      character2: char2,
      currentLevel: initialLevel,
      history: [{ chapter: 0, level: initialLevel, reason: 'Initial state' }],
      tensionType: type,
      physicalProximityScore: 0,
      emotionalVulnerability: 0,
      lastChapterMovement: 0,
      chaptersAtCurrentLevel: 0
    });
  }

  proposeTensionChange(
    char1: string,
    char2: string,
    newLevel: number,
    chapter: number,
    reason: string
  ): TensionMovement {
    const pairId = this.getPairId(char1, char2);
    const state = this.tensions.get(pairId);

    if (!state) {
      throw new Error(`No tension state for pair: ${char1} & ${char2}`);
    }

    const lastMovement = state.history.length > 1
      ? {
          from: state.history[state.history.length - 2].level,
          to: state.history[state.history.length - 1].level,
          chapter: state.history[state.history.length - 1].chapter,
          reason: state.history[state.history.length - 1].reason,
          isValid: true
        }
      : null;

    const validation = validateTensionMovement(state.currentLevel, newLevel, chapter, lastMovement);

    return {
      from: state.currentLevel,
      to: newLevel,
      chapter,
      reason,
      isValid: validation.valid,
      violation: validation.violation
    };
  }

  applyTensionChange(char1: string, char2: string, movement: TensionMovement): void {
    if (!movement.isValid) {
      throw new Error(`Cannot apply invalid movement: ${movement.violation}`);
    }

    const pairId = this.getPairId(char1, char2);
    const state = this.tensions.get(pairId)!;

    state.currentLevel = movement.to;
    state.history.push({ chapter: movement.chapter, level: movement.to, reason: movement.reason });
    state.lastChapterMovement = movement.to - movement.from;
    state.chaptersAtCurrentLevel = movement.to === movement.from ? state.chaptersAtCurrentLevel + 1 : 1;
  }

  private getPairId(char1: string, char2: string): string {
    return [char1, char2].sort().join('_');
  }

  getState(char1: string, char2: string): TensionState | undefined {
    return this.tensions.get(this.getPairId(char1, char2));
  }

  generateTensionSummary(): string {
    let summary = '=== TENSION STATES ===\n';

    for (const state of this.tensions.values()) {
      summary += `\n${state.character1} & ${state.character2}: Level ${state.currentLevel}/10 (${state.tensionType})\n`;
      summary += `  Physical: ${state.physicalProximityScore}/10, Emotional: ${state.emotionalVulnerability}/10\n`;
      summary += `  At level for ${state.chaptersAtCurrentLevel} chapters. Last movement: ${state.lastChapterMovement > 0 ? '+' : ''}${state.lastChapterMovement}\n`;
      summary += `  RULE: Can only move to ${Math.max(1, state.currentLevel - 1)}-${Math.min(10, state.currentLevel + 1)} next chapter.\n`;
    }

    return summary;
  }
}
```

---

### File: `lib/generation/atomic/secret-manifest.ts`

Plot twist tracking with ENFORCEMENT - requires breadcrumbs before reveals.

```typescript
/**
 * Secret Manifest System
 *
 * Every major reveal/twist MUST have breadcrumbs planted earlier.
 * No deus ex machina twists allowed.
 *
 * GOLDEN RULE: Minimum 3 breadcrumbs before any major reveal.
 */

export interface SecretEntry {
  id: string;
  description: string;

  // Who knows what
  knownBy: string[];                 // Characters who know
  hiddenFrom: string[];              // Characters who don't

  // Breadcrumb tracking
  breadcrumbs: Breadcrumb[];
  minBreadcrumbsRequired: number;    // Default: 3

  // Reveal info
  plannedRevealChapter?: number;
  actualRevealChapter?: number;
  revealType: 'confession' | 'discovery' | 'accident' | 'confrontation' | 'deduction';

  // Impact
  severity: 'minor' | 'moderate' | 'major' | 'story_changing';
  affectedCharacters: string[];
  consequenceNotes: string;
}

export interface Breadcrumb {
  chapter: number;
  type: 'hint' | 'clue' | 'near_miss' | 'foreshadow' | 'suspicious_behavior';
  description: string;
  subtlety: 'blatant' | 'moderate' | 'subtle';  // Subtle = earns more "fairness" credit
  noticeableBy: 'reader_only' | 'characters_too';
}

export interface RevealValidation {
  valid: boolean;
  breadcrumbCount: number;
  required: number;
  violation?: string;
  suggestions?: string[];
}

/**
 * Validate that a reveal has sufficient setup
 */
export function validateReveal(secret: SecretEntry, revealChapter: number): RevealValidation {
  const planted = secret.breadcrumbs.filter(b => b.chapter < revealChapter);
  const required = secret.minBreadcrumbsRequired;

  if (planted.length < required) {
    // Calculate how many chapters back we should have started planting
    const firstBreadcrumbChapter = planted[0]?.chapter || revealChapter;
    const chaptersAvailable = revealChapter - 1;

    return {
      valid: false,
      breadcrumbCount: planted.length,
      required,
      violation: `REVEAL BLOCKED: "${secret.description}" has only ${planted.length}/${required} breadcrumbs planted. Reader needs fair warning.`,
      suggestions: [
        `Plant ${required - planted.length} more breadcrumbs before chapter ${revealChapter}`,
        `Or delay reveal to chapter ${revealChapter + (required - planted.length) * 2} and add breadcrumbs`,
        chaptersAvailable >= required
          ? `Retroactive fix: Add subtle hints in chapters ${Math.max(1, revealChapter - required * 2)} through ${revealChapter - 1}`
          : `Story too short for fair reveal. Consider making this a minor revelation instead.`
      ]
    };
  }

  // Check breadcrumb distribution (shouldn't all be in same chapter)
  const uniqueChapters = new Set(planted.map(b => b.chapter)).size;
  if (uniqueChapters < Math.min(3, required)) {
    return {
      valid: false,
      breadcrumbCount: planted.length,
      required,
      violation: `BREADCRUMB CLUSTERING: All ${planted.length} hints are in only ${uniqueChapters} chapter(s). Spread across at least 3 chapters for fair setup.`,
      suggestions: [`Distribute hints across chapters: ${Array.from({ length: 3 }, (_, i) => revealChapter - (i + 1) * 2).join(', ')}`]
    };
  }

  // Check subtlety progression (should go subtle → less subtle)
  const subtletyOrder = { 'subtle': 1, 'moderate': 2, 'blatant': 3 };
  const orderedBreadcrumbs = [...planted].sort((a, b) => a.chapter - b.chapter);
  let lastSubtlety = 0;
  for (const bc of orderedBreadcrumbs) {
    const currentSubtlety = subtletyOrder[bc.subtlety];
    if (currentSubtlety < lastSubtlety - 1) {
      // Going from blatant back to subtle is weird
      return {
        valid: true, // Warning, not blocking
        breadcrumbCount: planted.length,
        required,
        suggestions: [`Breadcrumb subtlety should generally increase as reveal approaches. Chapter ${bc.chapter}'s "${bc.subtlety}" hint follows more obvious hints.`]
      };
    }
    lastSubtlety = currentSubtlety;
  }

  return {
    valid: true,
    breadcrumbCount: planted.length,
    required
  };
}

/**
 * Secret Manifest Tracker
 */
export class SecretManifest {
  private secrets: Map<string, SecretEntry> = new Map();
  private currentChapter: number = 0;

  registerSecret(secret: Omit<SecretEntry, 'id' | 'breadcrumbs'>): string {
    const id = `secret_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.secrets.set(id, {
      ...secret,
      id,
      breadcrumbs: [],
      minBreadcrumbsRequired: secret.severity === 'story_changing' ? 5 : secret.severity === 'major' ? 3 : 2
    });
    return id;
  }

  plantBreadcrumb(secretId: string, breadcrumb: Omit<Breadcrumb, 'chapter'>): void {
    const secret = this.secrets.get(secretId);
    if (!secret) throw new Error(`Unknown secret: ${secretId}`);

    secret.breadcrumbs.push({
      ...breadcrumb,
      chapter: this.currentChapter
    });
  }

  attemptReveal(secretId: string): RevealValidation {
    const secret = this.secrets.get(secretId);
    if (!secret) throw new Error(`Unknown secret: ${secretId}`);

    return validateReveal(secret, this.currentChapter);
  }

  setChapter(chapter: number): void {
    this.currentChapter = chapter;
  }

  getUnrevealedSecrets(): SecretEntry[] {
    return Array.from(this.secrets.values()).filter(s => !s.actualRevealChapter);
  }

  getSecretsNeedingBreadcrumbs(upcomingChapters: number = 5): SecretEntry[] {
    return Array.from(this.secrets.values()).filter(secret => {
      if (secret.actualRevealChapter) return false; // Already revealed
      if (!secret.plannedRevealChapter) return false; // No planned reveal

      const chaptersUntilReveal = secret.plannedRevealChapter - this.currentChapter;
      if (chaptersUntilReveal > upcomingChapters) return false; // Not urgent

      const breadcrumbsNeeded = secret.minBreadcrumbsRequired - secret.breadcrumbs.length;
      return breadcrumbsNeeded > 0;
    });
  }

  generateSecretManifestPrompt(): string {
    const needingBreadcrumbs = this.getSecretsNeedingBreadcrumbs();

    if (needingBreadcrumbs.length === 0) {
      return '';
    }

    let prompt = '\n=== SECRETS REQUIRING BREADCRUMBS ===\n';
    prompt += 'The following secrets are approaching their reveal. Plant subtle hints NOW:\n\n';

    for (const secret of needingBreadcrumbs) {
      const needed = secret.minBreadcrumbsRequired - secret.breadcrumbs.length;
      const chaptersLeft = (secret.plannedRevealChapter || 0) - this.currentChapter;

      prompt += `SECRET: "${secret.description}"\n`;
      prompt += `  - Needs ${needed} more breadcrumbs in ${chaptersLeft} chapters\n`;
      prompt += `  - Hidden from: ${secret.hiddenFrom.join(', ')}\n`;
      prompt += `  - Plant a ${secret.breadcrumbs.length === 0 ? 'subtle' : 'moderate'} hint this chapter\n\n`;
    }

    return prompt;
  }
}
```

---

### File: `lib/generation/atomic/domain-facts.ts`

Procedural realism - ENFORCES accuracy for cops, murders, affairs, etc.

```typescript
/**
 * Domain Fact Sheets
 *
 * When writing procedural content (police, medical, legal, etc.),
 * inject these fact sheets to maintain realism.
 */

export interface DomainFactSheet {
  domain: string;
  description: string;
  mustKnow: string[];              // Essential facts to inject
  commonMistakes: string[];        // Patterns to reject
  terminology: Record<string, string>;  // Correct terms
  procedureSteps: string[];        // Realistic procedure
  atmosphere: string;              // Tone guidance
}

export const DOMAIN_FACT_SHEETS: Record<string, DomainFactSheet> = {

  // POLICE PROCEDURAL
  'police': {
    domain: 'Police Procedural',
    description: 'Realistic police investigation and procedure',
    mustKnow: [
      'Detectives work in pairs. Always.',
      'Chain of custody for evidence is sacred - broken chain = inadmissible',
      'Miranda rights only required when (1) in custody AND (2) being interrogated',
      'Cops cannot enter without warrant unless: exigent circumstances, plain view, consent, or hot pursuit',
      'Crime scenes are processed by CSI/forensics, not detectives',
      'Most murders are solved in 48 hours or not at all - the "golden hour" window',
      'Paperwork is endless - every action must be documented',
      'Detectives drink bad coffee, work long hours, and have poor work-life balance',
    ],
    commonMistakes: [
      'REJECT: Detective collects evidence themselves (CSI does this)',
      'REJECT: Instant DNA results (takes days to weeks)',
      'REJECT: "Read them their rights" on arrest (only needed before interrogation)',
      'REJECT: Cops yelling "Freeze! Police!" in every situation',
      'REJECT: Single detective working alone',
      'REJECT: Interrogation without lawyer after request',
    ],
    terminology: {
      'murder': 'homicide (until cause determined)',
      'dead body': 'decedent or body',
      'suspect': 'person of interest (until charged)',
      'crime scene tape': 'perimeter',
      'clues': 'evidence',
      'killer': 'perpetrator, suspect, or unsub',
    },
    procedureSteps: [
      '1. First responding officer secures scene, calls dispatch',
      '2. Detectives arrive, establish perimeter',
      '3. CSI/forensics process scene (photographs, evidence collection)',
      '4. Medical examiner examines body, determines preliminary cause',
      '5. Canvas neighborhood for witnesses',
      '6. Run victim through system (priors, known associates)',
      '7. Interview witnesses, persons of interest',
      '8. Build timeline, identify suspects',
      '9. Obtain warrants if needed',
      '10. Present case to DA for charging decision',
    ],
    atmosphere: 'Bureaucratic. Tired. Cynical but dedicated. Dark humor. Coffee-stained paperwork. Inter-departmental politics. The job consumes personal life.'
  },

  // MURDER INVESTIGATION
  'murder': {
    domain: 'Murder Investigation',
    description: 'Realistic murder scene and investigation details',
    mustKnow: [
      'Lividity (blood pooling) indicates if body was moved',
      'Rigor mortis: begins 2-4 hours, peaks 12 hours, gone by 36 hours',
      'Time of death is always a RANGE, never exact',
      'Defensive wounds indicate victim fought back',
      'Manner of death: natural, accident, suicide, homicide, undetermined',
      'Cause of death: specific injury/condition that killed',
      'Bodies found in water bloat and surface after 3-7 days',
      'Most victims know their killer',
    ],
    commonMistakes: [
      'REJECT: "Time of death: 10:47 PM" (ranges only)',
      'REJECT: Victim looks peaceful (death is messy)',
      'REJECT: Chalk outline at scene (myth)',
      'REJECT: Instant autopsy results (24-48 hours minimum)',
      'REJECT: Clean crime scene (blood splatter, biological matter)',
    ],
    terminology: {
      'killed': 'died from / cause of death was',
      'time of death': 'estimated time of death window',
      'autopsy': 'post-mortem examination',
      'stab wound': 'penetrating trauma' ,
      'strangled': 'asphyxiation / manual strangulation',
    },
    procedureSteps: [
      '1. Pronounce death (only doctor or ME can)',
      '2. Secure and process scene',
      '3. Body transported to ME office',
      '4. Autopsy within 24-48 hours',
      '5. Toxicology screens (weeks for results)',
      '6. Identify victim (fingerprints, dental, DNA)',
      '7. Establish victimology (who was this person?)',
      '8. Create timeline of final 24-48 hours',
    ],
    atmosphere: 'Clinical detachment as defense mechanism. The smell is the worst part. Gallows humor is survival. The victim was a person - never forget that.'
  },

  // AFFAIR/INFIDELITY
  'affair': {
    domain: 'Affair/Infidelity',
    description: 'Realistic portrayal of marital infidelity',
    mustKnow: [
      'Affairs are about the thrill of forbidden, not just physical',
      'Guilt is sporadic - easier to compartmentalize than expected',
      'The "affair fog" - cognitive dissonance makes cheaters irrational',
      'Discovery usually comes from small mistakes, not grand revelations',
      'Phone behavior is the #1 tell (guarding, face-down, new passwords)',
      'Betrayed spouses often sense something before evidence',
      'Affairs rarely end with first confrontation',
      'Post-discovery: hysterical bonding is common (intense reconnection)',
    ],
    commonMistakes: [
      'REJECT: Cheater wracked with guilt 24/7 (compartmentalization is real)',
      'REJECT: Dramatic lipstick-on-collar discovery (too cliché)',
      'REJECT: Immediate confession when confronted (denial/gaslighting first)',
      'REJECT: Affair partner is villain (they\'re also human)',
      'REJECT: Betrayed spouse immediately leaves (usually cycles through denial, bargaining)',
    ],
    terminology: {},
    procedureSteps: [
      'Emotional affair stage (connection, confiding)',
      'Physical escalation (first kiss is major threshold)',
      'Secret-keeping logistics (excuses, hidden communication)',
      'Close calls (almost caught moments)',
      'Behavioral changes noticed by spouse',
      'Discovery or confession',
      'Immediate aftermath (shock, anger, denial)',
      'Decision period (stay or leave)',
    ],
    atmosphere: 'Compartmentalized life. Adrenaline of secret. Quieter guilt that surfaces at random moments. The banal logistics of deception (excuses for time away). The relationship metaphor of living two lives.'
  },

  // MEDICAL/HOSPITAL
  'medical': {
    domain: 'Medical/Hospital',
    description: 'Realistic medical setting and procedure',
    mustKnow: [
      'Doctors round in mornings (7-9 AM)',
      'Nurses do most patient care, not doctors',
      'ER prioritizes by triage level, not arrival time',
      'DNR (Do Not Resuscitate) must be documented',
      'HIPAA: cannot discuss patient with non-family',
      'Surgeries are scheduled, except emergencies',
      'Hospital hierarchy: Attending > Fellow > Resident > Intern > Student',
      'Code Blue = cardiac arrest, Code Red = fire',
    ],
    commonMistakes: [
      'REJECT: Flatline + shock paddles (asystole is not shockable)',
      'REJECT: Wake up from coma immediately lucid',
      'REJECT: Doctor does everything (specialization exists)',
      'REJECT: Instant test results (labs take hours)',
      'REJECT: Dramatic blood transfusion saves life in seconds',
    ],
    terminology: {
      'heart attack': 'myocardial infarction or MI',
      'stroke': 'cerebrovascular accident or CVA',
      'knocked out': 'lost consciousness / syncopal episode',
      'in a coma': 'unconscious / unresponsive',
    },
    procedureSteps: [],
    atmosphere: 'Controlled chaos. Beeping monitors. Fluorescent lights. Hand sanitizer smell. Exhausted staff. Life-and-death decisions made quickly. Gallows humor. Bureaucracy even in emergencies.'
  },

  // LEGAL/COURTROOM
  'legal': {
    domain: 'Legal/Courtroom',
    description: 'Realistic legal proceedings',
    mustKnow: [
      'Discovery: both sides must share evidence before trial',
      'Most cases settle (plea deals, settlements) before trial',
      'Lawyers cannot knowingly present false evidence',
      'Hearsay is generally not admissible',
      'Leading questions only allowed on cross-examination',
      'Judge controls courtroom, not lawyers',
      'Jury selection (voir dire) can take days',
      'Appeals are based on legal errors, not "new evidence"',
    ],
    commonMistakes: [
      'REJECT: "I object!" and case is won (objections are procedural)',
      'REJECT: Surprise witnesses (discovery rules)',
      'REJECT: Lawyer badgering witness for pages (judge intervenes)',
      'REJECT: Verdict immediately after closing arguments (jury deliberates)',
      'REJECT: Defendant testifies without consequences (opens to cross)',
    ],
    terminology: {
      'lawyer': 'counsel / attorney',
      'questioning': 'direct examination / cross-examination',
      'judge\'s decision': 'ruling',
      'found guilty': 'convicted',
    },
    procedureSteps: [
      '1. Filing / Arraignment',
      '2. Discovery period',
      '3. Pre-trial motions',
      '4. Jury selection (voir dire)',
      '5. Opening statements',
      '6. Prosecution/Plaintiff case',
      '7. Defense case',
      '8. Closing arguments',
      '9. Jury instructions',
      '10. Deliberation',
      '11. Verdict',
    ],
    atmosphere: 'Formal. Slow. Procedural. Lots of waiting. Theater for the jury. Lawyers perform. Truth is negotiable. The system grinds.'
  }
};

/**
 * Get domain guidance for chapter generation
 */
export function getDomainGuidance(domains: string[]): string {
  if (domains.length === 0) return '';

  let guidance = '\n=== PROCEDURAL REALISM REQUIREMENTS ===\n';
  guidance += 'The following domains are active. Maintain accuracy:\n\n';

  for (const domainKey of domains) {
    const sheet = DOMAIN_FACT_SHEETS[domainKey];
    if (!sheet) continue;

    guidance += `### ${sheet.domain.toUpperCase()}\n`;
    guidance += `${sheet.atmosphere}\n\n`;

    guidance += 'MUST KNOW:\n';
    for (const fact of sheet.mustKnow.slice(0, 4)) {
      guidance += `  • ${fact}\n`;
    }

    guidance += '\nCOMMON MISTAKES TO AVOID:\n';
    for (const mistake of sheet.commonMistakes.slice(0, 3)) {
      guidance += `  ${mistake}\n`;
    }

    if (Object.keys(sheet.terminology).length > 0) {
      guidance += '\nUSE CORRECT TERMS:\n';
      for (const [wrong, right] of Object.entries(sheet.terminology).slice(0, 4)) {
        guidance += `  "${wrong}" → "${right}"\n`;
      }
    }

    guidance += '\n';
  }

  return guidance;
}

/**
 * Validate content against domain rules
 */
export function validateDomainAccuracy(
  content: string,
  domains: string[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const domainKey of domains) {
    const sheet = DOMAIN_FACT_SHEETS[domainKey];
    if (!sheet) continue;

    // Check for common mistakes
    for (const mistake of sheet.commonMistakes) {
      // Extract the pattern from "REJECT: pattern"
      const pattern = mistake.replace('REJECT: ', '');

      // Simple keyword matching (could be enhanced with more sophisticated NLP)
      if (pattern.includes('chalk outline') && /chalk\s+outline/i.test(content)) {
        violations.push(mistake);
      }
      if (pattern.includes('instant DNA') && /DNA\s+(result|match|confirm)/i.test(content) && /instant|immediate|quick/i.test(content)) {
        violations.push(mistake);
      }
      if (pattern.includes('flatline') && /flatline.*shock|shock.*flatline|paddles.*flatline/i.test(content)) {
        violations.push(mistake);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}
```

---

### File: `lib/generation/atomic/genre-controller.ts`

Master controller that injects guardrails per genre.

```typescript
/**
 * Genre Controller
 *
 * Injects genre-specific guardrails into prompts and validates output.
 * This is the orchestration layer that ties together:
 * - Voice Profiles
 * - Tension Slider
 * - Secret Manifest
 * - Domain Facts
 */

export type GenreType =
  | 'Romance'
  | 'Mystery'
  | 'Thriller'
  | 'Noir'
  | 'Comedy'
  | 'Drama'
  | 'Police Procedural'
  | 'Legal Thriller'
  | 'Medical Drama'
  | 'Literary Fiction';

export interface GenreGuardrails {
  genre: GenreType;
  toneGuidance: string;
  pacingRules: string;
  contentRules: string[];
  activeDomains: string[];
  tensionDefaults: {
    minChaptersAtLevel: number;
    maxJumpPerChapter: number;
  };
  secretRules: {
    minBreadcrumbs: number;
    subtletyProgression: boolean;
  };
}

export const GENRE_GUARDRAILS: Record<GenreType, GenreGuardrails> = {
  'Romance': {
    genre: 'Romance',
    toneGuidance: 'Focus on the emotional journey. The "Wall" between characters is the story. Do not tear it down until the final act. Longing > consummation.',
    pacingRules: 'Tension slider moves SLOWLY. Max +1 per chapter. Must earn every escalation with emotional beats.',
    contentRules: [
      'Every scene must advance the relationship or reveal character',
      'Physical intimacy requires emotional vulnerability first',
      'Conflict should stem from character flaws, not just external obstacles',
      'The couple should have reasons to be apart AND together',
    ],
    activeDomains: [],
    tensionDefaults: { minChaptersAtLevel: 2, maxJumpPerChapter: 1 },
    secretRules: { minBreadcrumbs: 3, subtletyProgression: true }
  },

  'Mystery': {
    genre: 'Mystery',
    toneGuidance: 'Fair play is paramount. Every clue the detective has, the reader has. Misdirection is fine; cheating is not.',
    pacingRules: 'Revelations are spaced evenly. No chapter should have more than 2 major revelations. Build to satisfying solution.',
    contentRules: [
      'All clues must be presented before the solution',
      'Red herrings must be distinguishable in retrospect',
      'The detective should not make deductive leaps the reader cannot follow',
      'Every suspect needs means, motive, and opportunity consideration',
    ],
    activeDomains: ['police'],
    tensionDefaults: { minChaptersAtLevel: 1, maxJumpPerChapter: 2 },
    secretRules: { minBreadcrumbs: 5, subtletyProgression: true }
  },

  'Thriller': {
    genre: 'Thriller',
    toneGuidance: 'Every beat must end on a physical or informational threat. The reader should feel unsafe.',
    pacingRules: 'Tension is HIGH from chapter 2 onward. Brief respites only. Escalation is expected.',
    contentRules: [
      'Stakes must be personal AND larger than the protagonist',
      'Ticking clock element is essential',
      'Protagonist must be competent but outmatched',
      'Villains must be intelligent and proactive',
    ],
    activeDomains: [],
    tensionDefaults: { minChaptersAtLevel: 1, maxJumpPerChapter: 2 },
    secretRules: { minBreadcrumbs: 3, subtletyProgression: false }
  },

  'Noir': {
    genre: 'Noir',
    toneGuidance: 'Maximize shadows. High-contrast dialogue. No one is truly innocent. The city is a character. Moral ambiguity is the point.',
    pacingRules: 'Slow burn with explosive moments. Dialogue-heavy. Atmosphere > action.',
    contentRules: [
      'Protagonist is flawed, possibly compromised',
      'Femme fatale archetype if present should be nuanced, not cartoonish',
      'Institutions are corrupt',
      'Victory is pyrrhic at best',
    ],
    activeDomains: ['police', 'murder'],
    tensionDefaults: { minChaptersAtLevel: 2, maxJumpPerChapter: 1 },
    secretRules: { minBreadcrumbs: 4, subtletyProgression: true }
  },

  'Comedy': {
    genre: 'Comedy',
    toneGuidance: 'Timing is everything. Set up, payoff. Running gags need escalation. Characters can be absurd but must have internal logic.',
    pacingRules: 'Jokes per page should be consistent. Serious moments need earned setups.',
    contentRules: [
      'Comedy comes from character, not randomness',
      'Running gags should escalate then subvert',
      'Callbacks should come at unexpected moments',
      'Even in comedy, characters need wants and obstacles',
    ],
    activeDomains: [],
    tensionDefaults: { minChaptersAtLevel: 1, maxJumpPerChapter: 3 },
    secretRules: { minBreadcrumbs: 2, subtletyProgression: false }
  },

  'Drama': {
    genre: 'Drama',
    toneGuidance: 'Emotional truth matters more than plot. Characters drive events. Every scene should change a relationship.',
    pacingRules: 'Slow build to confrontations. Tension simmers. Cathartic moments must be earned.',
    contentRules: [
      'Dialogue carries subtext',
      'Characters should want things they cannot have',
      'Secrets and lies create narrative tension',
      'Climactic confrontations need preceding build-up',
    ],
    activeDomains: ['affair'],
    tensionDefaults: { minChaptersAtLevel: 2, maxJumpPerChapter: 1 },
    secretRules: { minBreadcrumbs: 4, subtletyProgression: true }
  },

  'Police Procedural': {
    genre: 'Police Procedural',
    toneGuidance: 'Focus on the bureaucracy. Characters are tired, cynical, and follow code. The system is the real antagonist.',
    pacingRules: 'Methodical investigation. Dead ends are part of the story. No quick solutions.',
    contentRules: [
      'Procedure must be accurate (see domain facts)',
      'Partner dynamics drive character moments',
      'Personal life intrudes on professional',
      'The case reflects larger social issues',
    ],
    activeDomains: ['police', 'murder'],
    tensionDefaults: { minChaptersAtLevel: 2, maxJumpPerChapter: 1 },
    secretRules: { minBreadcrumbs: 5, subtletyProgression: true }
  },

  'Legal Thriller': {
    genre: 'Legal Thriller',
    toneGuidance: 'The courtroom is theater. Truth is strategy. Everyone has an angle.',
    pacingRules: 'Build to trial. Trial chapters are rapid-fire. Testimony is reveal mechanism.',
    contentRules: [
      'Legal procedure must be accurate',
      'Discovery phase creates suspense',
      'Surprise witnesses need setup (discovery rules exist)',
      'The verdict should feel both surprising and inevitable',
    ],
    activeDomains: ['legal', 'police'],
    tensionDefaults: { minChaptersAtLevel: 1, maxJumpPerChapter: 2 },
    secretRules: { minBreadcrumbs: 4, subtletyProgression: true }
  },

  'Medical Drama': {
    genre: 'Medical Drama',
    toneGuidance: 'Life and death heightens everything. Medical accuracy matters. The hospital is a pressure cooker.',
    pacingRules: 'Case-of-the-chapter can drive plot. Personal storylines run parallel.',
    contentRules: [
      'Medical accuracy is non-negotiable (see domain facts)',
      'Character relationships matter more than cases',
      'Ethical dilemmas create drama',
      'Death should have weight',
    ],
    activeDomains: ['medical'],
    tensionDefaults: { minChaptersAtLevel: 1, maxJumpPerChapter: 2 },
    secretRules: { minBreadcrumbs: 3, subtletyProgression: true }
  },

  'Literary Fiction': {
    genre: 'Literary Fiction',
    toneGuidance: 'Prose quality matters. Theme over plot. Character interiority is the story. Subtext > text.',
    pacingRules: 'Slow and deliberate. Moments of beauty between plot beats. The mundane can be profound.',
    contentRules: [
      'Every sentence should earn its place',
      'Show interiority without stating emotions',
      'Metaphor and imagery carry thematic weight',
      'Plot can be minimal if character journey is rich',
    ],
    activeDomains: [],
    tensionDefaults: { minChaptersAtLevel: 3, maxJumpPerChapter: 1 },
    secretRules: { minBreadcrumbs: 3, subtletyProgression: true }
  }
};

/**
 * Get complete guardrails for a genre
 */
export function getGenreGuardrails(genre: GenreType): GenreGuardrails {
  return GENRE_GUARDRAILS[genre] || GENRE_GUARDRAILS['Literary Fiction'];
}

/**
 * Build the genre injection prompt for chapter generation
 */
export function buildGenreInjection(
  genres: GenreType[],
  tensionStates: string,
  secretManifestPrompt: string,
  domainGuidance: string,
  characterVoiceNotes: string
): string {
  const primaryGenre = genres[0];
  const guardrails = getGenreGuardrails(primaryGenre);

  let injection = `
=== GENRE: ${primaryGenre.toUpperCase()} ===
${guardrails.toneGuidance}

PACING: ${guardrails.pacingRules}

CONTENT RULES:
${guardrails.contentRules.map(r => `  • ${r}`).join('\n')}
`;

  // Add secondary genres if any
  if (genres.length > 1) {
    injection += `\nSECONDARY ELEMENTS: ${genres.slice(1).join(', ')}\n`;
    injection += `Blend these genre conventions with the primary ${primaryGenre} framework.\n`;
  }

  // Add tension states
  if (tensionStates) {
    injection += `\n${tensionStates}`;
  }

  // Add secret manifest
  if (secretManifestPrompt) {
    injection += `\n${secretManifestPrompt}`;
  }

  // Add domain guidance
  if (domainGuidance) {
    injection += `\n${domainGuidance}`;
  }

  // Add voice notes
  if (characterVoiceNotes) {
    injection += `\n=== CHARACTER VOICE PROFILES ===\n${characterVoiceNotes}`;
  }

  return injection;
}

/**
 * Master validation function that checks all genre rules
 */
export function validateAgainstGenre(
  content: string,
  genre: GenreType,
  voiceViolations: string[],
  tensionViolations: string[],
  secretViolations: string[],
  domainViolations: string[]
): {
  isValid: boolean;
  allViolations: string[];
  feedback: string;
} {
  const allViolations = [
    ...voiceViolations.map(v => `[VOICE] ${v}`),
    ...tensionViolations.map(v => `[TENSION] ${v}`),
    ...secretViolations.map(v => `[SECRET] ${v}`),
    ...domainViolations.map(v => `[DOMAIN] ${v}`)
  ];

  if (allViolations.length === 0) {
    return { isValid: true, allViolations: [], feedback: '' };
  }

  const feedback = `
=== GENERATION REJECTED ===
Genre: ${genre}
Violations found: ${allViolations.length}

${allViolations.map((v, i) => `${i + 1}. ${v}`).join('\n')}

RETRY INSTRUCTIONS:
Address each violation above. The content must pass all checks before acceptance.
`;

  return { isValid: false, allViolations, feedback };
}
```

---

## Updated File List

### New Files to Create (Behavioral Simulation)

| File | Purpose | Size Estimate |
|------|---------|---------------|
| `atomic/voice-profiles.ts` | Character dialogue fingerprinting | ~180 lines |
| `atomic/tension-slider.ts` | Romance/drama pacing enforcement | ~200 lines |
| `atomic/secret-manifest.ts` | Plot twist breadcrumb tracking | ~220 lines |
| `atomic/domain-facts.ts` | Procedural realism fact sheets | ~350 lines |
| `atomic/genre-controller.ts` | Master guardrail orchestration | ~280 lines |

**Total: 5 new files, ~1,230 lines**

### Combined with Original Plan

| Category | Files | Lines |
|----------|-------|-------|
| Genre Tracking (Phase 1-4) | 7 files | ~1,550 lines |
| Behavioral Simulation (Phase 5) | 5 files | ~1,230 lines |
| **Total** | **12 files** | **~2,780 lines** |

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CHAPTER GENERATION                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. BEFORE GENERATION (Prompt Building)                             │
│     ├── GenreController.buildGenreInjection()                       │
│     ├── TensionTracker.generateTensionSummary()                     │
│     ├── SecretManifest.generateSecretManifestPrompt()               │
│     ├── getDomainGuidance(activeDomains)                            │
│     └── characterVoiceProfiles (injected per character)             │
│                                                                     │
│  2. AFTER GENERATION (Validation)                                   │
│     ├── validateCharacterVoice() → voiceViolations                  │
│     ├── TensionTracker.proposeTensionChange() → tensionViolations   │
│     ├── SecretManifest.attemptReveal() → secretViolations           │
│     ├── validateDomainAccuracy() → domainViolations                 │
│     └── GenreController.validateAgainstGenre() → ACCEPT or REJECT   │
│                                                                     │
│  3. IF REJECTED → Surgical retry with specific feedback             │
│                                                                     │
│  4. IF ACCEPTED → Update trackers, save chapter                     │
│     ├── TensionTracker.applyTensionChange()                         │
│     ├── SecretManifest.plantBreadcrumb() (if planted)               │
│     ├── SecretManifest.reveal() (if revealed)                       │
│     └── GenreTrackers.process() (romance, mystery, etc.)            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Ready to Implement

This plan is ready for implementation. Start with Phase 1 (Core Types) and work through each phase sequentially.
