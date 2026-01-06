/**
 * Logic Bridge System - Therefore/But Connectors
 *
 * Forces causal connections between beats to prevent:
 * - Story loops (repeating the same beats)
 * - Scene resets (starting fresh instead of continuing)
 * - Recap syndrome (summarizing what just happened)
 * - Momentum loss (scenes that go nowhere)
 *
 * Based on the South Park "Therefore/But" rule:
 * Every beat should connect to the previous with "Therefore" (consequence)
 * or "But" (complication), never "And then" (random).
 */

export interface LogicBridge {
  previousBeatSummary: string;      // What just happened
  lastSignificantAction: string;    // The specific action/revelation
  causalConnector: 'therefore' | 'but' | 'meanwhile';
  nextBeatRequirement: string;      // What must happen next
  forbiddenActions: string[];       // What would break causality
  momentumDirection: 'escalate' | 'complicate' | 'resolve' | 'reveal';
}

export interface BeatLoopAnalysis {
  isLoop: boolean;
  similarity: number;                // 0-1 Jaccard similarity
  repeatedElements: string[];
  loopType?: 'exact' | 'structural' | 'emotional';
  suggestion: string;
}

/**
 * Build the logic bridge prompt injection for the next beat.
 * This is prepended to beat generation to force causal continuity.
 */
export function buildLogicBridge(
  previousBeatContent: string,
  nextBeatPlan: string,
  previousBeats?: string[]
): string {
  const lastAction = extractLastSignificantAction(previousBeatContent);
  const emotionalState = extractEmotionalState(previousBeatContent);
  const openQuestions = extractOpenQuestions(previousBeatContent);

  let bridge = `
=== CAUSAL LOGIC BRIDGE ===

PREVIOUS BEAT ENDED WITH:
"${lastAction}"

`;

  if (emotionalState) {
    bridge += `EMOTIONAL STATE: ${emotionalState}\n`;
  }

  if (openQuestions.length > 0) {
    bridge += `OPEN QUESTIONS: ${openQuestions.join('; ')}\n`;
  }

  bridge += `
THEREFORE/BUT RULES:
1. Start EXACTLY where the last beat ended - same moment, same location
2. The reader JUST read the previous paragraph. They remember. Do NOT recap.
3. Connect with causality:
   - THEREFORE: Show the direct consequence of the last action
   - BUT: Introduce a complication that prevents easy resolution
   - NEVER use "And then" logic (random unconnected events)

NEXT BEAT GOAL: ${nextBeatPlan}

FORBIDDEN IN THIS BEAT:
- Summarizing what happened in the previous beat
- Resetting to a new scene without transition
- Characters "realizing" things they already know
- Repeating emotional reactions already shown
- Time skips without explicit markers

START WRITING FROM THE EXACT MOMENT: "${lastAction.slice(0, 80)}..."
`;

  // Add anti-loop warning if we detect potential repetition
  if (previousBeats && previousBeats.length > 0) {
    const recentContent = previousBeats.slice(-2).join(' ');
    const recentKeywords = extractSignificantKeywords(recentContent);

    if (recentKeywords.length > 5) {
      bridge += `
DO NOT REPEAT THESE ELEMENTS (already used in recent beats):
${recentKeywords.slice(0, 10).map(k => `- ${k}`).join('\n')}
`;
    }
  }

  return bridge;
}

/**
 * Extract the last significant action/event from beat content.
 * This becomes the "handoff point" for the next beat.
 */
export function extractLastSignificantAction(text: string): string {
  // Get the last 2-3 sentences
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  if (sentences.length === 0) {
    return text.slice(-100).trim();
  }

  // Take last 2 sentences, prefer action over description
  const lastSentences = sentences.slice(-3);

  // Look for action verbs in the last sentences
  const actionPatterns = [
    /\b(said|asked|replied|shouted|whispered|demanded|pleaded)\b/i,
    /\b(grabbed|pulled|pushed|ran|walked|opened|closed|reached)\b/i,
    /\b(saw|heard|felt|noticed|realized|understood|discovered)\b/i,
    /\b(stood|sat|turned|looked|stared|watched)\b/i,
  ];

  // Find the most "active" sentence
  for (const sentence of lastSentences.reverse()) {
    for (const pattern of actionPatterns) {
      if (pattern.test(sentence)) {
        return sentence + '.';
      }
    }
  }

  // Fallback: return last 2 sentences
  return lastSentences.slice(-2).join('. ') + '.';
}

/**
 * Extract the emotional state at the end of a beat.
 * Helps maintain emotional continuity.
 */
export function extractEmotionalState(text: string): string | null {
  const lastParagraph = text.split(/\n\n/).pop() || text.slice(-500);

  const emotionPatterns: Array<{ pattern: RegExp; emotion: string }> = [
    { pattern: /\b(terrified|frightened|scared|afraid|fearful)\b/i, emotion: 'fear' },
    { pattern: /\b(angry|furious|enraged|livid|seething)\b/i, emotion: 'anger' },
    { pattern: /\b(sad|grief|mourning|devastated|heartbroken)\b/i, emotion: 'grief' },
    { pattern: /\b(happy|joyful|elated|relieved|hopeful)\b/i, emotion: 'hope' },
    { pattern: /\b(confused|bewildered|uncertain|lost)\b/i, emotion: 'confusion' },
    { pattern: /\b(suspicious|wary|cautious|distrustful)\b/i, emotion: 'suspicion' },
    { pattern: /\b(determined|resolute|focused|driven)\b/i, emotion: 'determination' },
    { pattern: /\b(exhausted|tired|weary|drained)\b/i, emotion: 'exhaustion' },
    { pattern: /\b(tense|nervous|anxious|on edge)\b/i, emotion: 'tension' },
  ];

  const detectedEmotions: string[] = [];

  for (const { pattern, emotion } of emotionPatterns) {
    if (pattern.test(lastParagraph)) {
      detectedEmotions.push(emotion);
    }
  }

  if (detectedEmotions.length === 0) {
    return null;
  }

  return detectedEmotions.join(', ');
}

/**
 * Extract open questions/unresolved elements from a beat.
 * These should be addressed or acknowledged in subsequent beats.
 */
export function extractOpenQuestions(text: string): string[] {
  const questions: string[] = [];

  // Actual questions in dialogue
  const dialogueQuestions = text.match(/"[^"]*\?"/g) || [];
  for (const q of dialogueQuestions.slice(-2)) {
    questions.push(`Unanswered: ${q}`);
  }

  // Implied questions (character wondering)
  const wonderPatterns = [
    /wondered (if|what|why|how|where|when|who)/gi,
    /couldn't understand (why|how|what)/gi,
    /needed to (find out|know|discover|learn)/gi,
    /the question (remained|lingered|hung)/gi,
  ];

  for (const pattern of wonderPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      questions.push(`Character wondering: ${matches[0]}`);
    }
  }

  // Unresolved tension
  if (/\b(but before|interrupted|cut off|didn't finish)\b/i.test(text)) {
    questions.push('Interrupted action needs resolution');
  }

  return questions.slice(0, 3); // Max 3 open questions
}

/**
 * Detect if a new beat is looping/repeating previous content.
 */
export function detectBeatLoop(
  newBeat: string,
  previousBeats: string[]
): BeatLoopAnalysis {
  if (previousBeats.length === 0) {
    return {
      isLoop: false,
      similarity: 0,
      repeatedElements: [],
      suggestion: '',
    };
  }

  const recentContent = previousBeats.slice(-2).join(' ');

  // 1. Keyword-based Jaccard similarity
  const newKeywords = extractSignificantKeywords(newBeat);
  const prevKeywords = extractSignificantKeywords(recentContent);

  const intersection = newKeywords.filter(k => prevKeywords.includes(k));
  const union = [...new Set([...newKeywords, ...prevKeywords])];
  const similarity = union.length > 0 ? intersection.length / union.length : 0;

  // 2. Structural loop detection (same sentence patterns)
  const newStarters = extractSentenceStarters(newBeat);
  const prevStarters = extractSentenceStarters(recentContent);
  const starterOverlap = newStarters.filter(s => prevStarters.includes(s)).length / Math.max(newStarters.length, 1);

  // 3. Emotional loop detection (same emotional beats)
  const newEmotions = extractEmotionalBeats(newBeat);
  const prevEmotions = extractEmotionalBeats(recentContent);
  const emotionOverlap = newEmotions.filter(e => prevEmotions.includes(e)).length / Math.max(newEmotions.length, 1);

  // Determine loop type
  let loopType: BeatLoopAnalysis['loopType'];
  let isLoop = false;
  let suggestion = '';

  if (similarity > 0.5) {
    loopType = 'exact';
    isLoop = true;
    suggestion = `Content is repeating. Repeated keywords: ${intersection.slice(0, 5).join(', ')}. Move to a NEW action or location.`;
  } else if (starterOverlap > 0.4) {
    loopType = 'structural';
    isLoop = true;
    suggestion = `Sentence patterns are repeating. Vary your sentence structures. Start sentences differently.`;
  } else if (emotionOverlap > 0.6) {
    loopType = 'emotional';
    isLoop = true;
    suggestion = `Emotional beats are repeating. Character has already felt this. Show PROGRESSION: fear → desperation → acceptance.`;
  } else if (similarity > 0.4) {
    isLoop = true;
    suggestion = `Moderate content overlap detected. Ensure the story moves FORWARD with new information or action.`;
  }

  return {
    isLoop,
    similarity,
    repeatedElements: intersection,
    loopType,
    suggestion,
  };
}

/**
 * Build anti-recap instructions based on what was just covered.
 */
export function buildAntiRecapInstructions(previousBeat: string): string {
  const coveredTopics = extractCoveredTopics(previousBeat);

  if (coveredTopics.length === 0) {
    return '';
  }

  return `
=== ANTI-RECAP WARNING ===
The following have ALREADY been covered. Do NOT mention them again:
${coveredTopics.map(t => `- ${t}`).join('\n')}

The reader JUST read this. Move the story FORWARD.
`;
}

/**
 * Suggest a momentum direction based on story state.
 */
export function suggestMomentumDirection(
  beatNumber: number,
  totalBeats: number,
  previousContent: string
): 'escalate' | 'complicate' | 'resolve' | 'reveal' {
  const position = beatNumber / totalBeats;

  // Opening beats: establish and complicate
  if (position < 0.25) {
    return 'complicate';
  }

  // Rising action: escalate
  if (position < 0.5) {
    return 'escalate';
  }

  // Midpoint: reveal
  if (position < 0.6) {
    return 'reveal';
  }

  // Build to climax: escalate
  if (position < 0.85) {
    return 'escalate';
  }

  // Resolution: resolve
  return 'resolve';
}

// === Helper Functions ===

function extractSignificantKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'this', 'that', 'these', 'those',
    'he', 'she', 'it', 'they', 'his', 'her', 'its', 'their', 'him', 'them',
    'what', 'which', 'who', 'where', 'when', 'why', 'how', 'just', 'only',
    'very', 'too', 'also', 'back', 'into', 'then', 'than', 'now', 'here',
    'there', 'still', 'even', 'over', 'such', 'own', 'same', 'down', 'out',
    'about', 'again', 'through', 'before', 'after',
  ]);

  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const filtered = words.filter(w => !stopWords.has(w));
  return [...new Set(filtered)];
}

function extractSentenceStarters(text: string): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  return sentences.map(s => {
    const words = s.trim().split(/\s+/);
    return words.slice(0, 2).join(' ').toLowerCase();
  });
}

function extractEmotionalBeats(text: string): string[] {
  const emotionWords = [
    'fear', 'anger', 'joy', 'sadness', 'surprise', 'disgust',
    'terror', 'rage', 'happiness', 'grief', 'shock', 'horror',
    'relief', 'despair', 'hope', 'dread', 'love', 'hate',
    'confusion', 'clarity', 'tension', 'calm',
  ];

  const lowerText = text.toLowerCase();
  return emotionWords.filter(e => lowerText.includes(e));
}

function extractCoveredTopics(text: string): string[] {
  const topics: string[] = [];

  // Extract dialogue topics
  const dialogueMatches = text.match(/"([^"]{10,50})"/g) || [];
  for (const dialogue of dialogueMatches.slice(0, 3)) {
    topics.push(`Dialogue: ${dialogue}`);
  }

  // Extract actions
  const actionMatches = text.match(/\b(discovered|revealed|realized|learned|found out|understood)\s+[^.]{10,40}/gi) || [];
  for (const action of actionMatches.slice(0, 2)) {
    topics.push(`Already revealed: ${action}`);
  }

  // Extract character reactions
  const reactionMatches = text.match(/\b(felt|experienced|sensed)\s+(a\s+)?(wave|surge|rush|flood)\s+of\s+\w+/gi) || [];
  for (const reaction of reactionMatches) {
    topics.push(`Reaction shown: ${reaction}`);
  }

  return topics;
}

// =============================================================================
// FRICTION INJECTION - Minor Physical Failures for Human Feel
// =============================================================================
// AI characters move like video game avatars: perfectly efficient, never fumbling.
// Real humans drop things, trip, forget words, hands shake.
// These "frictions" cost nothing narratively but add immense humanity.

export interface FrictionEvent {
  type: 'fumble' | 'trip' | 'forget' | 'physical' | 'speech';
  content: string;
  promptInjection: string;
  intensity: 'minor' | 'noticeable' | 'awkward';
}

export interface FrictionConfig {
  enabled: boolean;
  frequency: number;           // 0-1: Probability per beat
  maxPerChapter: number;
  preferredTypes: FrictionEvent['type'][];
  intensity: FrictionEvent['intensity'];
}

// Friction event pools by type
const FUMBLE_EVENTS: Omit<FrictionEvent, 'promptInjection'>[] = [
  { type: 'fumble', content: 'drops keys while trying to unlock the door', intensity: 'minor' },
  { type: 'fumble', content: 'phone slips from grasp', intensity: 'minor' },
  { type: 'fumble', content: 'coffee sloshes over the rim', intensity: 'noticeable' },
  { type: 'fumble', content: 'papers scatter when folder opens', intensity: 'noticeable' },
  { type: 'fumble', content: 'pen rolls off the table', intensity: 'minor' },
  { type: 'fumble', content: 'zipper catches on fabric', intensity: 'minor' },
  { type: 'fumble', content: 'button pops off', intensity: 'awkward' },
  { type: 'fumble', content: 'glass tips over (but catches it)', intensity: 'noticeable' },
  { type: 'fumble', content: 'wallet falls open, cards scatter', intensity: 'noticeable' },
  { type: 'fumble', content: 'shoelace comes undone', intensity: 'minor' },
];

const TRIP_EVENTS: Omit<FrictionEvent, 'promptInjection'>[] = [
  { type: 'trip', content: 'catches toe on carpet edge', intensity: 'minor' },
  { type: 'trip', content: 'stumbles on uneven pavement', intensity: 'minor' },
  { type: 'trip', content: 'misjudges a step', intensity: 'minor' },
  { type: 'trip', content: 'shoulder catches doorframe', intensity: 'noticeable' },
  { type: 'trip', content: 'bumps into furniture', intensity: 'minor' },
  { type: 'trip', content: 'slips slightly on wet floor', intensity: 'noticeable' },
  { type: 'trip', content: 'overbalances reaching for something', intensity: 'minor' },
  { type: 'trip', content: 'stumbles backing up', intensity: 'noticeable' },
];

const FORGET_EVENTS: Omit<FrictionEvent, 'promptInjection'>[] = [
  { type: 'forget', content: 'loses train of thought mid-sentence', intensity: 'noticeable' },
  { type: 'forget', content: 'forgets what they came into the room for', intensity: 'minor' },
  { type: 'forget', content: 'can\'t remember the word they want', intensity: 'noticeable' },
  { type: 'forget', content: 'blanks on someone\'s name', intensity: 'awkward' },
  { type: 'forget', content: 'forgets where they put their phone (it\'s in their hand)', intensity: 'minor' },
  { type: 'forget', content: 'trails off, distracted by a thought', intensity: 'minor' },
  { type: 'forget', content: 'starts to say something, then changes mind', intensity: 'minor' },
  { type: 'forget', content: 'realizes they already said that', intensity: 'awkward' },
];

const PHYSICAL_EVENTS: Omit<FrictionEvent, 'promptInjection'>[] = [
  { type: 'physical', content: 'stifles a yawn', intensity: 'minor' },
  { type: 'physical', content: 'stomach growls audibly', intensity: 'awkward' },
  { type: 'physical', content: 'needs to clear throat', intensity: 'minor' },
  { type: 'physical', content: 'blinks repeatedly (contact lens)', intensity: 'minor' },
  { type: 'physical', content: 'stretches neck (stiffness)', intensity: 'minor' },
  { type: 'physical', content: 'rubs tired eyes', intensity: 'minor' },
  { type: 'physical', content: 'shifts weight (standing too long)', intensity: 'minor' },
  { type: 'physical', content: 'sniffs (cold weather)', intensity: 'minor' },
  { type: 'physical', content: 'squints (sun in eyes)', intensity: 'minor' },
  { type: 'physical', content: 'adjusts glasses', intensity: 'minor' },
];

const SPEECH_EVENTS: Omit<FrictionEvent, 'promptInjection'>[] = [
  { type: 'speech', content: 'voice cracks slightly', intensity: 'noticeable' },
  { type: 'speech', content: 'accidentally interrupts', intensity: 'awkward' },
  { type: 'speech', content: 'speaks too quietly, has to repeat', intensity: 'minor' },
  { type: 'speech', content: 'stumbles over a word', intensity: 'minor' },
  { type: 'speech', content: 'starts same time as someone else', intensity: 'awkward' },
  { type: 'speech', content: 'clears throat before speaking', intensity: 'minor' },
  { type: 'speech', content: 'says "um" or "uh" before continuing', intensity: 'minor' },
  { type: 'speech', content: 'mispronounces a word', intensity: 'noticeable' },
];

const FRICTION_POOLS: Record<FrictionEvent['type'], Omit<FrictionEvent, 'promptInjection'>[]> = {
  fumble: FUMBLE_EVENTS,
  trip: TRIP_EVENTS,
  forget: FORGET_EVENTS,
  physical: PHYSICAL_EVENTS,
  speech: SPEECH_EVENTS,
};

/**
 * Get a friction event for beat injection.
 */
export function getFrictionEvent(
  config: Partial<FrictionConfig> = {},
  usedFrictions: string[] = []
): FrictionEvent | null {
  const fullConfig: FrictionConfig = {
    enabled: true,
    frequency: 0.4,           // 40% chance per beat
    maxPerChapter: 4,
    preferredTypes: ['fumble', 'physical', 'speech'],
    intensity: 'minor',
    ...config,
  };

  if (!fullConfig.enabled) return null;

  // Roll for frequency
  if (Math.random() > fullConfig.frequency) return null;

  // Build pool from preferred types
  let pool: Omit<FrictionEvent, 'promptInjection'>[] = [];
  for (const type of fullConfig.preferredTypes) {
    pool.push(...(FRICTION_POOLS[type] || []));
  }

  // Filter by intensity
  if (fullConfig.intensity === 'minor') {
    pool = pool.filter(f => f.intensity === 'minor');
  } else if (fullConfig.intensity === 'noticeable') {
    pool = pool.filter(f => f.intensity !== 'awkward');
  }
  // 'awkward' allows all

  // Filter out already-used frictions
  pool = pool.filter(f => !usedFrictions.includes(f.content));

  if (pool.length === 0) return null;

  // Random selection
  const selected = pool[Math.floor(Math.random() * pool.length)];

  // Build prompt injection
  const promptInjection = buildFrictionPromptInjection(selected);

  return {
    ...selected,
    promptInjection,
  };
}

/**
 * Build the prompt injection for a friction event.
 */
function buildFrictionPromptInjection(
  friction: Omit<FrictionEvent, 'promptInjection'>
): string {
  switch (friction.type) {
    case 'fumble':
      return `
HUMAN MOMENT: At some point in this beat, the POV character ${friction.content}.
This is NOT important to the plot - it's just a human fumble. One sentence, handled naturally.
Do NOT dwell on it or make it symbolic. Characters are clumsy sometimes.`;

    case 'trip':
      return `
PHYSICAL FRICTION: The POV character ${friction.content}.
Brief moment of imbalance. One sentence. Recovers immediately. Not symbolic, just human.`;

    case 'forget':
      return `
MENTAL FRICTION: The POV character ${friction.content}.
This happens to everyone. Brief moment, naturally resolved. Don't make it significant.`;

    case 'physical':
      return `
BODY AWARENESS: Show the POV character ${friction.content}.
Bodies have needs that don't care about dramatic moments. One quick mention.`;

    case 'speech':
      return `
SPEECH FRICTION: The POV character ${friction.content}.
Speech is imperfect. This is natural, not a character flaw. Quick moment, move on.`;

    default:
      return `
HUMAN FRICTION: Include this small imperfection: ${friction.content}.
Brief, natural, unremarkable. Real people are not smooth.`;
  }
}

/**
 * Get default friction config for a format.
 */
export function getDefaultFrictionConfig(format: string): FrictionConfig {
  switch (format) {
    case 'screenplay':
      // Screenplays: physical/visual friction only
      return {
        enabled: true,
        frequency: 0.3,
        maxPerChapter: 2,
        preferredTypes: ['fumble', 'trip', 'physical'],
        intensity: 'minor',
      };

    case 'comic':
    case 'picture_book':
      // Comics: visual fumbles work best
      return {
        enabled: true,
        frequency: 0.25,
        maxPerChapter: 2,
        preferredTypes: ['fumble', 'trip'],
        intensity: 'noticeable',
      };

    case 'children':
      // Children's books: gentle physical humor
      return {
        enabled: true,
        frequency: 0.4,
        maxPerChapter: 3,
        preferredTypes: ['fumble', 'trip', 'forget'],
        intensity: 'minor',
      };

    default:
      // Adult novels: full range
      return {
        enabled: true,
        frequency: 0.4,
        maxPerChapter: 4,
        preferredTypes: ['fumble', 'physical', 'speech', 'forget'],
        intensity: 'noticeable',
      };
  }
}

/**
 * Build friction prompt section for beat context.
 */
export function buildFrictionPrompt(
  format: string,
  beatNumber: number,
  usedFrictions: string[],
  config?: Partial<FrictionConfig>
): { prompt: string; usedFriction: string | null } {
  // Get config for format
  const fullConfig = { ...getDefaultFrictionConfig(format), ...config };

  // Check if we've hit max for this chapter
  if (usedFrictions.length >= fullConfig.maxPerChapter) {
    return { prompt: '', usedFriction: null };
  }

  // Try to get a friction event
  const friction = getFrictionEvent(fullConfig, usedFrictions);

  if (!friction) {
    return { prompt: '', usedFriction: null };
  }

  return {
    prompt: friction.promptInjection,
    usedFriction: friction.content,
  };
}

// Note: LogicBridge and BeatLoopAnalysis are exported at their definitions
