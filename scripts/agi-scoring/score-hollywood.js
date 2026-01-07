#!/usr/bin/env node

/**
 * Hollywood Reader Coverage Scoring Script
 *
 * Usage: node scripts/agi-scoring/score-hollywood.js <screenplay-file> [--verbose] [--json]
 *
 * Evaluates screenplays like a ruthless industry reader would.
 * Scores 0-100 across 6 categories. Harsh but fair.
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  weights: {
    execution: 0.25,
    pacing: 0.20,
    market: 0.15,
    cinematic: 0.20,
    commercial: 0.10,
    innovation: 0.10,
  },
};

// ============================================================================
// PATTERN DEFINITIONS
// ============================================================================

// On-the-nose emotion declarations (BAD - characters announcing feelings)
const EMOTION_DECLARATIONS = [
  /I('m| am) (so )?(angry|sad|happy|scared|confused|hurt|betrayed|devastated|frustrated|worried|excited|nervous)/gi,
  /I feel (so )?(angry|sad|happy|scared|confused|hurt|betrayed|lost|alone|empty)/gi,
  /You make me feel/gi,
  /I need you to understand/gi,
  /What I('m| am) trying to say is/gi,
  /The truth is,? I/gi,
  /I have to be honest/gi,
  /Can I be honest with you/gi,
  /I('m| am) feeling (so )?/gi,
  /My feelings are/gi,
  /I love you (so much|more than)/gi,
  /I hate (you|this|myself)/gi,
  /I('m| am) (really )?(happy|sad|scared) (that|because|about)/gi,
];

// Exposition dumps (BAD - characters explaining plot)
const EXPOSITION_PATTERNS = [
  /As you know,?/gi,
  /Let me explain/gi,
  /You see,? (the thing is|what happened was)/gi,
  /I('ll| will) tell you (what|how|why)/gi,
  /The reason (I|we|they)/gi,
  /What you need to understand is/gi,
  /Here's (what|the thing)/gi,
  /Allow me to explain/gi,
  /You have to understand/gi,
  /The situation is/gi,
  /What('s| is) happening is/gi,
  /In case you didn't know/gi,
  /For those who don't know/gi,
  /You might be wondering/gi,
];

// Trailer-speak / pseudo-profound (BAD)
const TRAILER_SPEAK = [
  /The truth is[,.]?/gi,
  /What (really )?matters (most )?is/gi,
  /In the end,/gi,
  /When you (really )?think about it/gi,
  /Life is (about|like|just)/gi,
  /The thing about .+ is/gi,
  /What does it (even )?mean to/gi,
  /Who are we (really|truly)/gi,
  /What makes us (truly )?human/gi,
  /Everything (has )?changed/gi,
  /Nothing will ever be the same/gi,
  /This changes everything/gi,
  /There's no going back/gi,
  /In a world where/gi,
  /When all hope (seems|is) lost/gi,
  /One (man|woman|person) must/gi,
  /Some things are worth/gi,
  /Sometimes the only way/gi,
  /We all have choices/gi,
  /It's not about (the|what)/gi,
];

// Clinical/robotic dialogue (AI-speak)
const CLINICAL_PATTERNS = [
  /it shall\b/gi,
  /it is imperative/gi,
  /highly irregular/gi,
  /sufficient for/gi,
  /I require\b/gi,
  /it would appear/gi,
  /one might suggest/gi,
  /most certainly/gi,
  /precisely so/gi,
  /affirmative\b/gi,
  /acknowledged\b/gi,
  /in my estimation/gi,
  /I believe (that )?it would be/gi,
  /It is (my|our) understanding/gi,
  /Perhaps it would be prudent/gi,
  /I must insist/gi,
  /It has come to my attention/gi,
];

// Homogenized voice indicators (everyone sounds the same)
const GENERIC_RESPONSES = [
  /^(Yeah|Yes|No|Okay|Sure|Right|Fine|Whatever)\.?$/,
  /^I (don't )?know\.?$/,
  /^What(\?|'s that\??)$/,
  /^Really\??$/,
  /^Are you sure\??$/,
  /^I('m| am) sorry\.?$/,
  /^Thank you\.?$/,
  /^Of course\.?$/,
];

// Time jump patterns (pacing killers)
const TIME_JUMPS = [
  /\b(THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|SEVERAL|MANY|FEW|COUPLE)\s+(DAYS?|WEEKS?|MONTHS?|YEARS?)\s+LATER\b/gi,
  /\bONE\s+(WEEK|MONTH|YEAR)\s+LATER\b/gi,
  /\bTWO\s+(DAYS?|WEEKS?|MONTHS?|YEARS?)\s+LATER\b/gi,
  /\bLATER\s+THAT\s+(DAY|NIGHT|WEEK|EVENING)\b/gi,
  /\bTHE\s+NEXT\s+(DAY|MORNING|WEEK)\b/gi,
  /\bMONTHS?\s+PASS\b/gi,
  /\bTIME\s+PASSES?\b/gi,
  /\bMONTAGE\b/gi,
];

// Derivative premise indicators - SPECIFIC plot ripoffs, not genre vocabulary
// Genre words like "simulation" or "dystopia" are fine - they're just sci-fi tools
// We're looking for SPECIFIC copied premises
const DERIVATIVE_MARKERS = [
  // Direct IP references (instant red flag)
  /\b(matrix|truman show|stepford|ex machina|black mirror|twilight zone|westworld)\b/gi,
  // The "Chosen One" trope (massively overused)
  /chosen one/gi,
  /the one who (will|can|must)/gi,
  /prophecy (said|foretold|speaks)/gi,
  // Specific Matrix-style "wake up" premise
  /wake up.*reality/gi,
  /none of this is real/gi,
  /you('ve| have) been (asleep|living a lie)/gi,
  // Specific rebellion plots (not just any resistance)
  /join the (resistance|rebellion)/gi,
  /underground.*resistance.*fighting/gi,
];

// Genre vocabulary - these are TOOLS, not derivative by themselves
// Having "simulation" in your sci-fi doesn't make it a Matrix ripoff
// We DON'T penalize for these:
// - simulation, dystopia, utopia, free will, what is real
// - these are just genre vocabulary every sci-fi uses

// Visual clichés
const VISUAL_CLICHES = [
  /golden (light|sun|hour|glow)/gi,
  /rain(drops?)? (on|against|hitting) (the )?(window|glass)/gi,
  /stares? (out )?(the |at the )?(window|horizon)/gi,
  /sun(light|rise|set) (streams?|pours?|filters?)/gi,
  /shadows? (dance|play|fall)/gi,
  /mirror.*reflection/gi,
  /looks? at (himself|herself|themselves) in the mirror/gi,
  /tears? (stream|roll|fall) down/gi,
  /slow motion/gi,
  /freeze frame/gi,
  /montage of/gi,
  /we see/gi,
  /we hear/gi,
  /camera (pulls?|pushes?|tracks?|pans?|zooms?)/gi,
];

// Sensory/immersive writing (GOOD)
const SENSORY_PATTERNS = {
  smell: /\b(smell|scent|odor|aroma|stench|whiff|fragrance|reek|musk)\b/gi,
  sound: /\b(sound|noise|hum|buzz|crack|thud|whisper|roar|echo|creak|groan|hiss|rustle)\b/gi,
  touch: /\b(rough|smooth|cold|warm|wet|dry|texture|grip|grasp|sticky|slick|gritty)\b/gi,
  taste: /\b(taste|bitter|sweet|sour|salty|metallic|tongue|acrid)\b/gi,
};

// Subtext indicators (GOOD - showing not telling)
const SUBTEXT_INDICATORS = [
  /\.\.\./g,  // Trailing off
  /--/g,      // Interruptions
  /\b(doesn't|don't|won't|can't) (answer|respond|reply|say anything|look)/gi,
  /\b(silence|pause|beat|moment)\b/gi,
  /\b(avoids?|dodges?|deflects?|sidesteps?)\s+(the|his|her|their)?\s*(question|eye|gaze|look)/gi,
  /\b(changes? the subject|looks? away|turns? away)\b/gi,
];

// Action set pieces (cinematic potential)
const ACTION_MARKERS = [
  /\b(chase|fight|explosion|crash|escape|pursuit|shootout|battle|confrontation)\b/gi,
  /\b(runs?|sprints?|dives?|jumps?|leaps?|crashes?|smashes?|breaks?)\b/gi,
  /\b(gun|weapon|knife|blade|sword)\b/gi,
];

// ============================================================================
// NEW AI DETECTION PATTERNS (Phase 4 - Harsh Mode)
// ============================================================================

// Purple prose patterns (overwrought metaphors that scream AI)
const PURPLE_PROSE = [
  /dust motes? (dance|float|drift|swirl)/gi,
  /cathedral of/gi,
  /velvet (hammer|voice|darkness|silence)/gi,
  /silk(en|y)? (voice|tone|thread)/gi,
  /(golden|amber|honey) (light|glow|hue)/gi,
  /fingers? (of light|of shadow|of dawn|of dusk)/gi,
  /tapestry of/gi,
  /symphony of/gi,
  /ballet of/gi,
  /dance of (shadow|light|death|life)/gi,
  /mosaic of/gi,
  /kaleidoscope of/gi,
  /with the grace of/gi,
  /like a (wounded|dying|fallen) (animal|bird|angel)/gi,
  /ocean of (emotion|feeling|grief|sorrow)/gi,
  /weight of (the world|history|time|silence)/gi,
  /ghost of a (smile|laugh|memory)/gi,
  /pregnant (pause|silence|moment)/gi,
  /deafening silence/gi,
  /palpable tension/gi,
  /electric (silence|tension|atmosphere)/gi,
];

// Excessive verbal tics (AI over-injection tells)
const VERBAL_TIC_OVERUSE = {
  ellipsis: /\.\.\./g,
  stutterDash: /--/g,
  letterStutter: /\b([a-zA-Z])-\1/gi,  // t-this, w-what
  umFiller: /\b(um|uh)\b/gi,
  falseStartNo: /-- No\. /gi,  // The specific "word-- No. word" pattern
};

// Technobabble / code-like passages
const TECHNOBABBLE = [
  /\bif\s*\([^)]+\)\s*(then|{)/gi,
  /\b(protocol|algorithm|subroutine|interface|parameter)\b/gi,
  /\b(sync|hash|node|buffer|cache|loop)\b/gi,
  /\b(execute|initialize|terminate|propagate)\b/gi,
  /\*[A-Z_]+\*/g,  // *GHOST_PROTOCOL* style
  /\b(recursion|asynchronous|recursiv)/gi,
  /\b(the probability of|statistical likelihood)/gi,
  /\b(cascade|propagation|iteration)\b/gi,
];

// Word repetition patterns (AI stutter)
const WORD_REPETITION = [
  /(\b\w+)\.\s*\1\./gi,  // "Fine. Fine." pattern
  /(\b\w+)\s+\1\b/gi,    // "very very" pattern
  /\b(I'm|I am)\s+\w+\.\s*(I'm|I am)\s+\w+\./gi,  // "I'm fine. I'm fine."
];

// AI summary endings (wrap-up phrases)
const SUMMARY_ENDINGS = [
  /,\s*which said everything/gi,
  /--\s*not that it matter/gi,
  /,\s*somehow\.?$/gm,
  /\.\s*It was enough\.?/gi,
  /\.\s*And that was that\.?/gi,
  /,\s*in a way\.?$/gm,
  /\.\s*But still\.?$/gm,
  /,\s*for what it('s| is|was) worth/gi,
  /\.\s*It meant everything\./gi,
  /\.\s*It meant nothing\./gi,
];

// Lowercase after period (generation bug - instant AI tell)
const LOWERCASE_AFTER_PERIOD = /[.!?]\s+[a-z]/g;

// Double punctuation bugs
const DOUBLE_PUNCTUATION = /[,.]\.|\.,/g;

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Extract all dialogue from screenplay
 */
function extractDialogue(content) {
  const lines = content.split('\n');
  const dialogueBlocks = [];
  let currentCharacter = null;
  let currentDialogue = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Character name (ALL CAPS, reasonable length, not a slug line)
    if (/^[A-Z][A-Z\s.'()-]{1,40}$/.test(trimmed) &&
        !trimmed.startsWith('INT.') &&
        !trimmed.startsWith('EXT.') &&
        !trimmed.startsWith('CUT TO') &&
        !trimmed.startsWith('FADE') &&
        !trimmed.includes(' - ')) {

      if (currentCharacter && currentDialogue.length > 0) {
        dialogueBlocks.push({
          character: currentCharacter,
          dialogue: currentDialogue.join(' '),
        });
      }
      currentCharacter = trimmed.replace(/\s*\(.*\)/, ''); // Remove parentheticals from name
      currentDialogue = [];
      continue;
    }

    // Skip parentheticals
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) continue;

    // Skip slug lines and transitions
    if (/^(INT\.|EXT\.|CUT TO|FADE|DISSOLVE|SMASH CUT)/.test(trimmed)) {
      if (currentCharacter && currentDialogue.length > 0) {
        dialogueBlocks.push({
          character: currentCharacter,
          dialogue: currentDialogue.join(' '),
        });
      }
      currentCharacter = null;
      currentDialogue = [];
      continue;
    }

    // Dialogue line
    if (currentCharacter && trimmed && !trimmed.match(/^[A-Z][A-Z\s]+$/)) {
      currentDialogue.push(trimmed);
    }
  }

  // Don't forget the last block
  if (currentCharacter && currentDialogue.length > 0) {
    dialogueBlocks.push({
      character: currentCharacter,
      dialogue: currentDialogue.join(' '),
    });
  }

  return dialogueBlocks;
}

/**
 * Count pattern matches in content
 */
function countMatches(content, patterns) {
  let total = 0;
  const found = [];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const matches = content.match(pattern) || [];
    total += matches.length;
    found.push(...matches);
  }

  return { count: total, examples: found.slice(0, 10) };
}

/**
 * Analyze character voice differentiation
 */
function analyzeVoiceDifferentiation(dialogueBlocks) {
  const characterVocab = {};
  const characterPatterns = {};

  for (const block of dialogueBlocks) {
    const char = block.character;
    if (!characterVocab[char]) {
      characterVocab[char] = new Set();
      characterPatterns[char] = {
        avgSentenceLength: [],
        questionRatio: 0,
        exclamationRatio: 0,
        contractionCount: 0,
        totalWords: 0,
      };
    }

    const words = block.dialogue.toLowerCase().split(/\s+/);
    words.forEach(w => characterVocab[char].add(w.replace(/[^a-z]/g, '')));

    const sentences = block.dialogue.split(/[.!?]+/).filter(s => s.trim());
    sentences.forEach(s => {
      characterPatterns[char].avgSentenceLength.push(s.trim().split(/\s+/).length);
    });

    characterPatterns[char].questionRatio += (block.dialogue.match(/\?/g) || []).length;
    characterPatterns[char].exclamationRatio += (block.dialogue.match(/!/g) || []).length;
    characterPatterns[char].contractionCount += (block.dialogue.match(/\b\w+'\w+\b/g) || []).length;
    characterPatterns[char].totalWords += words.length;
  }

  // Calculate vocabulary overlap between characters
  const characters = Object.keys(characterVocab);
  let totalOverlap = 0;
  let comparisons = 0;

  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      const vocab1 = characterVocab[characters[i]];
      const vocab2 = characterVocab[characters[j]];

      if (vocab1.size < 20 || vocab2.size < 20) continue; // Skip minor characters

      const intersection = new Set([...vocab1].filter(x => vocab2.has(x)));
      const union = new Set([...vocab1, ...vocab2]);
      const overlap = intersection.size / union.size;

      totalOverlap += overlap;
      comparisons++;
    }
  }

  const avgOverlap = comparisons > 0 ? totalOverlap / comparisons : 0;

  // High overlap = homogenized voices = bad
  // Overlap > 0.6 is concerning, > 0.7 is bad
  return {
    characterCount: characters.length,
    avgVocabOverlap: Math.round(avgOverlap * 100) / 100,
    isHomogenized: avgOverlap > 0.65,
    characterStats: Object.fromEntries(
      Object.entries(characterPatterns).map(([char, stats]) => [
        char,
        {
          vocabSize: characterVocab[char].size,
          avgSentenceLength: stats.avgSentenceLength.length > 0
            ? Math.round(stats.avgSentenceLength.reduce((a,b) => a+b, 0) / stats.avgSentenceLength.length * 10) / 10
            : 0,
          wordCount: stats.totalWords,
        }
      ])
    ),
  };
}

/**
 * Analyze beat sheet adherence (mechanical structure)
 */
function analyzeStructure(content) {
  const wordCount = content.split(/\s+/).length;
  const slugLines = content.match(/^(INT\.|EXT\.)/gm) || [];
  const sceneCount = slugLines.length;

  // Find act breaks by looking for major transitions
  const actMarkers = content.match(/\b(ACT (ONE|TWO|THREE|I|II|III)|END OF ACT)\b/gi) || [];

  // Check for mechanical time jumps
  const timeJumps = countMatches(content, TIME_JUMPS);

  // Check for montages (often a sign of skipping dramatization)
  const montages = (content.match(/MONTAGE/gi) || []).length;

  // Analyze scene length distribution
  const scenes = content.split(/(?=^(INT\.|EXT\.))/gm).filter(s => s.trim());
  const sceneLengths = scenes.map(s => s.split(/\s+/).length);
  const avgSceneLength = sceneLengths.reduce((a,b) => a+b, 0) / Math.max(sceneLengths.length, 1);

  // Very uniform scene lengths = mechanical
  const lengthVariance = sceneLengths.length > 1
    ? Math.sqrt(sceneLengths.reduce((sum, len) => sum + Math.pow(len - avgSceneLength, 2), 0) / sceneLengths.length)
    : 0;

  return {
    wordCount,
    sceneCount,
    avgSceneLength: Math.round(avgSceneLength),
    sceneLengthVariance: Math.round(lengthVariance),
    timeJumps: timeJumps.count,
    timeJumpExamples: timeJumps.examples,
    montages,
    actMarkers: actMarkers.length,
    isMechanical: lengthVariance < 100 && sceneCount > 20, // Very uniform = mechanical
  };
}

/**
 * Analyze cinematic potential
 */
function analyzeCinematic(content) {
  const visualCliches = countMatches(content, VISUAL_CLICHES);
  const actionMarkers = countMatches(content, ACTION_MARKERS);

  // Count sensory details
  let sensoryTotal = 0;
  const sensoryBreakdown = {};
  for (const [sense, pattern] of Object.entries(SENSORY_PATTERNS)) {
    const matches = content.match(pattern) || [];
    sensoryBreakdown[sense] = matches.length;
    sensoryTotal += matches.length;
  }

  // Check for unique visual concepts (non-cliché imagery)
  const slugLines = content.match(/^(INT\.|EXT\.).+$/gm) || [];
  const uniqueLocations = new Set(slugLines.map(s => s.replace(/\s*-\s*(DAY|NIGHT|CONTINUOUS|LATER|SAME).*$/i, '').trim()));

  // Interior vs exterior ratio
  const interiors = (content.match(/^INT\./gm) || []).length;
  const exteriors = (content.match(/^EXT\./gm) || []).length;
  const interiorRatio = interiors / Math.max(interiors + exteriors, 1);

  return {
    visualCliches: visualCliches.count,
    visualClicheExamples: visualCliches.examples,
    actionSetPieces: actionMarkers.count,
    sensoryDetails: sensoryTotal,
    sensoryBreakdown,
    uniqueLocations: uniqueLocations.size,
    interiorRatio: Math.round(interiorRatio * 100),
    isFlatVisual: visualCliches.count > 15 || (sensoryTotal < 50 && interiorRatio > 0.8),
  };
}

/**
 * Analyze innovation/originality
 */
function analyzeInnovation(content) {
  const derivativeMarkers = countMatches(content, DERIVATIVE_MARKERS);
  const trailerSpeak = countMatches(content, TRAILER_SPEAK);

  // Check for genre-specific clichés
  const genreClicheScore = derivativeMarkers.count + (trailerSpeak.count / 2);

  return {
    derivativeMarkers: derivativeMarkers.count,
    derivativeExamples: derivativeMarkers.examples,
    trailerSpeak: trailerSpeak.count,
    trailerExamples: trailerSpeak.examples,
    isDerivative: derivativeMarkers.count > 5 || trailerSpeak.count > 10,
  };
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Score Execution (subtextual depth, dialogue quality)
 * HARSH MODE - Most scripts are mediocre, score reflects that
 */
function scoreExecution(content, dialogueBlocks) {
  let score = 45; // Start at D- (most scripts are mediocre at best)
  const issues = [];
  const strengths = [];

  // Check for on-the-nose emotion declarations (BRUTAL)
  const emotionDeclarations = countMatches(content, EMOTION_DECLARATIONS);
  if (emotionDeclarations.count > 5) {
    score -= Math.min(30, emotionDeclarations.count * 3);
    issues.push(`${emotionDeclarations.count} on-the-nose emotion declarations - amateur writing`);
  } else if (emotionDeclarations.count === 0) {
    score += 8;
    strengths.push('Emotions revealed through behavior');
  }

  // Check for exposition dumps (BRUTAL)
  const exposition = countMatches(content, EXPOSITION_PATTERNS);
  if (exposition.count > 5) {
    score -= Math.min(25, exposition.count * 3);
    issues.push(`${exposition.count} exposition dumps - characters explaining plot to each other`);
  } else if (exposition.count > 0) {
    score -= exposition.count * 2;
    issues.push(`${exposition.count} exposition instances`);
  }

  // Check for clinical/robotic dialogue (AI TELL)
  const clinical = countMatches(content, CLINICAL_PATTERNS);
  if (clinical.count > 3) {
    score -= Math.min(20, clinical.count * 4);
    issues.push(`${clinical.count} clinical/robotic phrases - AI fingerprint`);
  }

  // Analyze voice differentiation (HARSH)
  const voiceAnalysis = analyzeVoiceDifferentiation(dialogueBlocks);
  if (voiceAnalysis.avgVocabOverlap > 0.55) {
    score -= 25;
    issues.push(`Homogenized voices (${Math.round(voiceAnalysis.avgVocabOverlap * 100)}% vocab overlap) - characters sound identical`);
  } else if (voiceAnalysis.avgVocabOverlap > 0.45) {
    score -= 10;
    issues.push(`Similar character voices (${Math.round(voiceAnalysis.avgVocabOverlap * 100)}% overlap)`);
  } else if (voiceAnalysis.avgVocabOverlap < 0.35 && voiceAnalysis.characterCount >= 4) {
    score += 12;
    strengths.push('Genuinely distinct character voices');
  }

  // Check for subtext indicators
  const subtext = countMatches(content, SUBTEXT_INDICATORS);
  const subtextDensity = subtext.count / (content.split(/\s+/).length / 1000);
  if (subtextDensity > 8) {
    score += 10;
    strengths.push('Rich subtext and meaningful silences');
  } else if (subtextDensity < 3) {
    score -= 15;
    issues.push('Lacking subtext - dialogue is purely functional');
  }

  // Check for generic responses (HARSH)
  let genericCount = 0;
  for (const block of dialogueBlocks) {
    for (const pattern of GENERIC_RESPONSES) {
      if (pattern.test(block.dialogue)) genericCount++;
    }
  }
  if (genericCount > 15) {
    score -= Math.min(20, (genericCount - 10) * 2);
    issues.push(`${genericCount} generic placeholder responses`);
  }

  // NEW: Check for dialogue that's too clean (no interruptions, false starts)
  const messinessPatterns = [
    /\.\.\./g,  // Trailing off
    /--/g,      // Interruptions
    /\b(um|uh|er|ah)\b/gi,  // Verbal fillers
  ];
  let messiness = 0;
  for (const pattern of messinessPatterns) {
    messiness += (content.match(pattern) || []).length;
  }
  const messinessDensity = messiness / (dialogueBlocks.length || 1);
  if (messinessDensity < 0.3 && dialogueBlocks.length > 50) {
    score -= 15;
    issues.push('Dialogue too clean - lacks human verbal messiness');
  } else if (messinessDensity > 0.8) {
    score += 5;
    strengths.push('Natural speech patterns');
  }

  // NEW: Check for cultural/specific texture
  const specificityMarkers = [
    /\b(brand|name|specific place|street name|\d{4})\b/gi,
    /\b[A-Z][a-z]+('s)?\s+(Bar|Diner|Restaurant|Store|Shop|Cafe)\b/g,
  ];
  let specificity = 0;
  for (const pattern of specificityMarkers) {
    specificity += (content.match(pattern) || []).length;
  }
  if (specificity < 5) {
    score -= 10;
    issues.push('Generic setting - no cultural texture or specificity');
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    issues,
    strengths,
    details: {
      emotionDeclarations: emotionDeclarations.count,
      expositionDumps: exposition.count,
      clinicalPhrases: clinical.count,
      voiceOverlap: voiceAnalysis.avgVocabOverlap,
      subtextDensity: Math.round(subtextDensity * 10) / 10,
      messinessDensity: Math.round(messinessDensity * 100) / 100,
    },
  };
}

/**
 * Score Pacing (structure, momentum)
 * HARSH MODE - Time jumps and montages are lazy writing
 */
function scorePacing(content) {
  let score = 40; // Start at F+ (most scripts have pacing problems)
  const issues = [];
  const strengths = [];

  const structure = analyzeStructure(content);

  // Penalize time jumps BRUTALLY (destroys momentum)
  if (structure.timeJumps > 3) {
    score -= Math.min(40, (structure.timeJumps - 2) * 8);
    issues.push(`${structure.timeJumps} time jumps - lazy storytelling, skipping the hard parts`);
  } else if (structure.timeJumps > 0) {
    score -= structure.timeJumps * 5;
    issues.push(`${structure.timeJumps} time jumps interrupt flow`);
  } else {
    score += 15;
    strengths.push('Continuous narrative - no time jump crutches');
  }

  // Penalize montages BRUTALLY (the ultimate lazy device)
  if (structure.montages > 0) {
    score -= structure.montages * 12;
    issues.push(`${structure.montages} montage(s) - refusing to dramatize the actual story`);
  }

  // Check for mechanical scene uniformity (beat sheet robots)
  if (structure.isMechanical) {
    score -= 20;
    issues.push('Mechanical beat sheet structure - algorithmically perfect, emotionally dead');
  } else if (structure.sceneLengthVariance > 250) {
    score += 8;
    strengths.push('Organic scene rhythm');
  }

  // Check page count (90-120 is ideal for features)
  const pages = Math.round(structure.wordCount / 250);
  if (pages < 80) {
    score -= 15;
    issues.push(`Severely underdeveloped at ${pages} pages`);
  } else if (pages < 90) {
    score -= 8;
    issues.push(`Thin at ${pages} pages`);
  } else if (pages > 135) {
    score -= 15;
    issues.push(`Bloated at ${pages} pages - needs cutting`);
  } else if (pages > 120) {
    score -= 5;
    issues.push(`Long at ${pages} pages`);
  } else if (pages >= 95 && pages <= 115) {
    score += 5;
  }

  // Scene count check (HARSHER)
  if (structure.sceneCount < 35) {
    score -= 10;
    issues.push(`Only ${structure.sceneCount} scenes - feels like a stage play`);
  } else if (structure.sceneCount > 100) {
    score -= 15;
    issues.push(`${structure.sceneCount} scenes - ADD editing, no scene breathes`);
  } else if (structure.sceneCount > 75) {
    score -= 5;
    issues.push(`${structure.sceneCount} scenes - feels choppy`);
  }

  // NEW: Check for "skip to resolution" pattern
  const skipPatterns = [
    /LATER\s+THAT\s+(NIGHT|DAY)/gi,
    /THE\s+NEXT\s+(MORNING|DAY)/gi,
    /CONTINUOUS/gi,
  ];
  let skipCount = 0;
  for (const pattern of skipPatterns) {
    skipCount += (content.match(pattern) || []).length;
  }
  if (skipCount > 10) {
    score -= 10;
    issues.push('Excessive scene transitions - story jumps instead of flows');
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    issues,
    strengths,
    details: structure,
  };
}

/**
 * Score Market (audience clarity, commercial viability)
 * HARSH MODE - Most scripts have no clear audience
 */
function scoreMarket(content, innovation) {
  let score = 35; // Start at F (most scripts have no clear market)
  const issues = [];
  const strengths = [];

  const wordCount = content.split(/\s+/).length;

  // Derivative content is a marketing minefield (BRUTAL)
  if (innovation.isDerivative) {
    score -= 25;
    issues.push('Derivative premise - "We already have that IP"');
  }

  // Check for controversial/difficult themes
  const controversialThemes = [
    /\b(rape|incest|pedophil|child abuse)\b/gi,
    /\b(suicide|self.harm)\b/gi,
    /\b(terrorism|terrorist)\b/gi,
  ];

  let controversialCount = 0;
  for (const pattern of controversialThemes) {
    controversialCount += (content.match(pattern) || []).length;
  }

  if (controversialCount > 3) {
    score -= 15;
    issues.push('Difficult themes without clear artistic justification');
  }

  // Check for clear genre markers
  const genreMarkers = {
    horror: /\b(blood|scream|terror|monster|creature|demon|ghost|supernatural|corpse|dead body)\b/gi,
    comedy: /\b(laughs?|jokes?|funny|hilarious|comedy|gag|punchline)\b/gi,
    action: /\b(explosion|chase|fight|gun|weapon|battle|combat|punch|kick)\b/gi,
    romance: /\b(kiss(es|ed|ing)?|love|romance|heart|passion|desire|attraction)\b/gi,
    thriller: /\b(suspense|tension|danger|threat|stalker|killer|murder|victim)\b/gi,
    scifi: /\b(space|alien|future|technology|robot|AI|android|simulation|dystopia)\b/gi,
    drama: /\b(family|relationship|marriage|divorce|death|grief|struggle)\b/gi,
  };

  const genreScores = {};
  for (const [genre, pattern] of Object.entries(genreMarkers)) {
    genreScores[genre] = (content.match(pattern) || []).length;
  }

  const topGenres = Object.entries(genreScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Clear genre identity is essential (HARSH)
  if (topGenres[0][1] > 40 && topGenres[0][1] > topGenres[1][1] * 2.5) {
    score += 15;
    strengths.push(`Strong ${topGenres[0][0]} identity`);
  } else if (topGenres[0][1] > 25 && topGenres[0][1] > topGenres[1][1] * 1.5) {
    score += 5;
    strengths.push(`${topGenres[0][0]} leaning`);
  } else if (topGenres[0][1] < 20) {
    score -= 15;
    issues.push('No clear genre - unmarketable');
  } else {
    score -= 10;
    issues.push(`Genre confusion (${topGenres[0][0]}/${topGenres[1][0]} split) - hard to market`);
  }

  // Trailer speak helps marketing slightly
  if (innovation.trailerSpeak > 3 && innovation.trailerSpeak < 12) {
    score += 5;
    strengths.push('Has quotable moments');
  } else if (innovation.trailerSpeak > 20) {
    score -= 5;
    issues.push('Too many "trailer moments" - feels manufactured');
  }

  // NEW: Check for "streaming filler" indicators
  const streamingFillerMarkers = [
    /\b(apartment|office|bedroom|kitchen|living room|bathroom)\b/gi,
  ];
  let fillerCount = 0;
  for (const pattern of streamingFillerMarkers) {
    fillerCount += (content.match(pattern) || []).length;
  }
  const fillerRatio = fillerCount / (wordCount / 1000);
  if (fillerRatio > 8) {
    score -= 10;
    issues.push('Domestic setting overload - feels like streaming filler');
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    issues,
    strengths,
    details: {
      genreBreakdown: genreScores,
      primaryGenre: topGenres[0][0],
      genreClarity: topGenres[0][1] > topGenres[1][1] * 2 ? 'CLEAR' : 'CONFUSED',
    },
  };
}

/**
 * Score Cinematic Potential
 * HARSH MODE - Most scripts are visually flat
 */
function scoreCinematic(content) {
  let score = 35; // Start at F (most scripts have no visual imagination)
  const issues = [];
  const strengths = [];

  const cinematic = analyzeCinematic(content);

  // Penalize visual clichés BRUTALLY
  if (cinematic.visualCliches > 15) {
    score -= Math.min(30, (cinematic.visualCliches - 8) * 3);
    issues.push(`${cinematic.visualCliches} visual clichés - derivative imagery`);
  } else if (cinematic.visualCliches > 8) {
    score -= (cinematic.visualCliches - 5) * 2;
    issues.push(`${cinematic.visualCliches} visual clichés`);
  } else if (cinematic.visualCliches < 3) {
    score += 12;
    strengths.push('Original visual language');
  }

  // Reward sensory writing (HARDER threshold)
  const wordCount = content.split(/\s+/).length;
  const sensoryDensity = cinematic.sensoryDetails / (wordCount / 1000);
  if (sensoryDensity > 5) {
    score += 15;
    strengths.push('Immersive sensory writing');
  } else if (sensoryDensity > 3) {
    score += 8;
    strengths.push('Good sensory detail');
  } else if (sensoryDensity < 1.5) {
    score -= 20;
    issues.push('Visual-only writing - no sensory immersion');
  } else if (sensoryDensity < 2.5) {
    score -= 10;
    issues.push('Sparse sensory detail');
  }

  // Check location variety (HARSHER)
  if (cinematic.uniqueLocations > 25) {
    score += 12;
    strengths.push(`${cinematic.uniqueLocations} unique locations - production value`);
  } else if (cinematic.uniqueLocations > 15) {
    score += 5;
  } else if (cinematic.uniqueLocations < 10) {
    score -= 15;
    issues.push(`Only ${cinematic.uniqueLocations} locations - limited scope`);
  }

  // Penalize interior-heavy scripts BRUTALLY (TV-like)
  if (cinematic.interiorRatio > 90) {
    score -= 25;
    issues.push(`${cinematic.interiorRatio}% interiors - this is a TV episode, not a film`);
  } else if (cinematic.interiorRatio > 80) {
    score -= 15;
    issues.push(`${cinematic.interiorRatio}% interiors - claustrophobic, no production value`);
  } else if (cinematic.interiorRatio > 70) {
    score -= 8;
    issues.push(`${cinematic.interiorRatio}% interiors - leans TV`);
  } else if (cinematic.interiorRatio < 55) {
    score += 10;
    strengths.push('Cinematic scope - good exterior ratio');
  }

  // Reward action set pieces
  if (cinematic.actionSetPieces > 40) {
    score += 12;
    strengths.push('Strong visual spectacle');
  } else if (cinematic.actionSetPieces < 8) {
    score -= 10;
    issues.push('No memorable set pieces');
  }

  // Check if flat visual
  if (cinematic.isFlatVisual) {
    score -= 20;
    issues.push('Flat visual imagination - nothing demands a big screen');
  }

  // NEW: Check for "we see/we hear" lazy direction
  const lazyDirection = (content.match(/\b(we see|we hear|we watch|camera)\b/gi) || []).length;
  if (lazyDirection > 10) {
    score -= 15;
    issues.push(`${lazyDirection} "we see/hear" instances - amateur direction`);
  } else if (lazyDirection > 5) {
    score -= 8;
    issues.push(`${lazyDirection} "we see/hear" instances`);
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    issues,
    strengths,
    details: cinematic,
  };
}

/**
 * Score Commercial Potential
 * HARSH MODE - Most scripts are financial risks
 */
function scoreCommercial(content, marketScore, cinematicScore) {
  let score = 25; // Start at F (most scripts are unbankable)
  const issues = [];
  const strengths = [];

  const wordCount = content.split(/\s+/).length;

  // Franchise potential markers
  const franchiseMarkers = [
    /\b(chosen|prophecy|destiny|legacy|ancient|powers?)\b/gi,
    /\b(book one|part one|chapter one|series|saga)\b/gi,
    /\b(universe|world|realm|dimension)\b/gi,
  ];

  let franchiseCount = 0;
  for (const pattern of franchiseMarkers) {
    franchiseCount += (content.match(pattern) || []).length;
  }

  // Franchise markers without execution = red flag
  if (franchiseCount > 20 && marketScore < 50) {
    score -= 10;
    issues.push('Franchise aspirations without market clarity');
  } else if (franchiseCount > 25 && marketScore > 55) {
    score += 10;
    strengths.push('Franchise potential with clear market');
  }

  // Prestige markers (awards potential)
  const prestigeMarkers = [
    /\b(war|historical|biography|true story|based on)\b/gi,
    /\b(struggle|overcome|triumph|survival|justice)\b/gi,
    /\b(society|culture|political|corruption)\b/gi,
  ];

  let prestigeCount = 0;
  for (const pattern of prestigeMarkers) {
    prestigeCount += (content.match(pattern) || []).length;
  }

  if (prestigeCount > 20) {
    score += 12;
    strengths.push('Awards lane potential');
  } else if (prestigeCount < 5 && franchiseCount < 10) {
    score -= 10;
    issues.push('No clear commercial or prestige angle');
  }

  // Budget indicators
  const highBudgetMarkers = [
    /\b(explosion|crash|disaster|destruction|army|fleet|thousands)\b/gi,
    /\b(space|alien|creature|monster|CGI|effects)\b/gi,
    /\b(war|battle|siege|invasion)\b/gi,
  ];

  let highBudgetCount = 0;
  for (const pattern of highBudgetMarkers) {
    highBudgetCount += (content.match(pattern) || []).length;
  }

  // Budget vs upside calculation (BRUTAL)
  if (highBudgetCount > 30 && marketScore < 45) {
    score -= 25;
    issues.push('High budget + no market = financial suicide');
  } else if (highBudgetCount > 20 && marketScore < 55) {
    score -= 15;
    issues.push('Budget risk without clear ROI');
  } else if (highBudgetCount < 8 && cinematicScore > 45) {
    score += 15;
    strengths.push('Low budget with cinematic potential');
  }

  // NEW: Star attachment potential
  const starVehicleMarkers = [
    /\b(lead|protagonist|hero|heroine)\b/gi,
    /\b(transformation|arc|journey|redemption)\b/gi,
  ];
  let starPotential = 0;
  for (const pattern of starVehicleMarkers) {
    starPotential += (content.match(pattern) || []).length;
  }
  if (starPotential > 15) {
    score += 8;
    strengths.push('Strong lead role - star attachment potential');
  }

  // Streaming filler detection
  if (cinematicScore < 40 && marketScore < 45) {
    score -= 15;
    issues.push('Streaming filler at best - no theatrical viability');
  }

  // IP recognition
  issues.push('No existing IP recognition - harder sale');

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    issues,
    strengths,
    details: {
      franchiseIndicators: franchiseCount,
      prestigeIndicators: prestigeCount,
      budgetLevel: highBudgetCount > 30 ? 'HIGH' : highBudgetCount > 15 ? 'MEDIUM' : 'LOW',
      starPotential: starPotential > 15 ? 'HIGH' : starPotential > 8 ? 'MEDIUM' : 'LOW',
    },
  };
}

/**
 * Score Innovation/Originality
 * HARSH MODE - Most scripts are creatively bankrupt
 * BUT: Don't penalize genre vocabulary - penalize ACTUAL ripoffs
 */
function scoreInnovation(content) {
  let score = 35; // Start at F+ (give benefit of doubt, then deduct for actual issues)
  const issues = [];
  const strengths = [];

  const innovation = analyzeInnovation(content);

  // Penalize derivative markers - but these are now SPECIFIC ripoffs, not genre vocab
  // So even 2-3 hits is a real problem
  if (innovation.derivativeMarkers > 5) {
    score -= Math.min(30, (innovation.derivativeMarkers - 3) * 5);
    issues.push(`${innovation.derivativeMarkers} specific derivative markers - too close to existing IP`);
  } else if (innovation.derivativeMarkers > 2) {
    score -= (innovation.derivativeMarkers - 1) * 4;
    issues.push(`${innovation.derivativeMarkers} derivative elements`);
  } else if (innovation.derivativeMarkers === 0) {
    score += 15;
    strengths.push('No obvious IP overlap');
  }

  // Penalize trailer-speak BRUTALLY (AI/algorithm tell)
  if (innovation.trailerSpeak > 12) {
    score -= Math.min(30, (innovation.trailerSpeak - 8) * 3);
    issues.push(`${innovation.trailerSpeak} trailer-speak phrases - algorithmically generated profundity`);
  } else if (innovation.trailerSpeak > 6) {
    score -= (innovation.trailerSpeak - 4) * 2;
    issues.push(`${innovation.trailerSpeak} pseudo-profound moments`);
  } else if (innovation.trailerSpeak < 3) {
    score += 12;
    strengths.push('Authentic voice - no manufactured wisdom');
  }

  // Check for unique structural elements
  const uniqueStructure = [
    /\b(non.?linear|flashback|flash.?forward|parallel)\b/gi,
    /\b(unreliable|narrator|perspective)\b/gi,
    /\b(anthology|vignette|episode)\b/gi,
  ];

  let structuralInnovation = 0;
  for (const pattern of uniqueStructure) {
    structuralInnovation += (content.match(pattern) || []).length;
  }

  if (structuralInnovation > 8) {
    score += 12;
    strengths.push('Structural ambition');
  } else if (structuralInnovation > 3) {
    score += 5;
  }

  // NEW: Check for "genre mash-up" (can be innovative or lazy)
  // Already captured in market analysis

  // NEW: Check for thematic originality markers
  const thematicCliches = [
    /\b(love conquers|power of friendship|believe in yourself|family is|good vs evil)\b/gi,
    /\b(chosen one|destiny|fate|meant to be)\b/gi,
    /\b(redemption arc|second chance|find (yourself|meaning))\b/gi,
  ];

  let clicheThemes = 0;
  for (const pattern of thematicCliches) {
    clicheThemes += (content.match(pattern) || []).length;
  }

  if (clicheThemes > 10) {
    score -= 15;
    issues.push('Thematic clichés - nothing new to say');
  } else if (clicheThemes > 5) {
    score -= 8;
    issues.push('Predictable thematic territory');
  }

  // Check if the script seems AI-generated (combination of signals)
  const aiScore =
    (innovation.trailerSpeak > 8 ? 1 : 0) +
    (innovation.derivativeMarkers > 6 ? 1 : 0) +
    (clicheThemes > 8 ? 1 : 0);

  if (aiScore >= 2) {
    score -= 15;
    issues.push('High probability of algorithmic generation');
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    issues,
    strengths,
    details: {
      ...innovation,
      thematicCliches: clicheThemes,
    },
  };
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

function scoreScreenplay(content, verbose = false) {
  const dialogueBlocks = extractDialogue(content);
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  // Run all analyses
  const innovationAnalysis = analyzeInnovation(content);

  // Score each category
  const execution = scoreExecution(content, dialogueBlocks);
  const pacing = scorePacing(content);
  const market = scoreMarket(content, innovationAnalysis);
  const cinematic = scoreCinematic(content);
  const commercial = scoreCommercial(content, market.score, cinematic.score);
  const innovation = scoreInnovation(content);

  // Calculate weighted composite
  let composite =
    (execution.score * CONFIG.weights.execution) +
    (pacing.score * CONFIG.weights.pacing) +
    (market.score * CONFIG.weights.market) +
    (cinematic.score * CONFIG.weights.cinematic) +
    (commercial.score * CONFIG.weights.commercial) +
    (innovation.score * CONFIG.weights.innovation);

  // AI detection - COMPREHENSIVE analysis using all patterns
  // Start at 15% (benefit of doubt) and add for each AI tell found
  let aiScore = 15;
  const aiIssues = [];

  // Original indicators
  if (execution.details.emotionDeclarations > 8) { aiScore += 8; aiIssues.push('emotion declarations'); }
  if (execution.details.clinicalPhrases > 5) { aiScore += 10; aiIssues.push('clinical phrasing'); }
  if (innovation.details.trailerSpeak > 10) { aiScore += 12; aiIssues.push('trailer-speak'); }
  if (execution.details.voiceOverlap > 0.65) { aiScore += 8; aiIssues.push('homogenized voices'); }

  // NEW: Purple prose detection
  let purpleProseCount = 0;
  for (const pattern of PURPLE_PROSE) {
    purpleProseCount += (content.match(pattern) || []).length;
  }
  if (purpleProseCount > 10) { aiScore += 15; aiIssues.push(`purple prose (${purpleProseCount})`); }
  else if (purpleProseCount > 5) { aiScore += 8; aiIssues.push(`purple prose (${purpleProseCount})`); }

  // NEW: Excessive verbal tics (over-injection)
  const ellipsisCount = (content.match(VERBAL_TIC_OVERUSE.ellipsis) || []).length;
  const stutterDashCount = (content.match(VERBAL_TIC_OVERUSE.stutterDash) || []).length;
  const letterStutterCount = (content.match(VERBAL_TIC_OVERUSE.letterStutter) || []).length;
  const falseStartNoCount = (content.match(VERBAL_TIC_OVERUSE.falseStartNo) || []).length;

  if (ellipsisCount > 80) { aiScore += 15; aiIssues.push(`excessive ellipsis (${ellipsisCount})`); }
  else if (ellipsisCount > 50) { aiScore += 8; aiIssues.push(`many ellipses (${ellipsisCount})`); }
  if (stutterDashCount > 40) { aiScore += 10; aiIssues.push(`excessive dashes (${stutterDashCount})`); }
  if (letterStutterCount > 15) { aiScore += 10; aiIssues.push(`letter stutters (${letterStutterCount})`); }
  if (falseStartNoCount > 5) { aiScore += 12; aiIssues.push(`"-- No." pattern (${falseStartNoCount})`); }

  // NEW: Technobabble detection
  let technobabbleCount = 0;
  for (const pattern of TECHNOBABBLE) {
    technobabbleCount += (content.match(pattern) || []).length;
  }
  if (technobabbleCount > 20) { aiScore += 12; aiIssues.push(`technobabble (${technobabbleCount})`); }
  else if (technobabbleCount > 10) { aiScore += 6; aiIssues.push(`tech jargon (${technobabbleCount})`); }

  // NEW: Word repetition patterns
  let repetitionCount = 0;
  for (const pattern of WORD_REPETITION) {
    repetitionCount += (content.match(pattern) || []).length;
  }
  if (repetitionCount > 10) { aiScore += 10; aiIssues.push(`word repetition (${repetitionCount})`); }

  // NEW: Summary endings (AI wrap-up tells)
  let summaryEndingCount = 0;
  for (const pattern of SUMMARY_ENDINGS) {
    summaryEndingCount += (content.match(pattern) || []).length;
  }
  if (summaryEndingCount > 5) { aiScore += 10; aiIssues.push(`summary endings (${summaryEndingCount})`); }

  // NEW: Lowercase after period (generation bug - HUGE tell)
  const lowercaseCount = (content.match(LOWERCASE_AFTER_PERIOD) || []).length;
  if (lowercaseCount > 50) { aiScore += 20; aiIssues.push(`lowercase bug (${lowercaseCount})`); }
  else if (lowercaseCount > 20) { aiScore += 12; aiIssues.push(`lowercase bug (${lowercaseCount})`); }
  else if (lowercaseCount > 5) { aiScore += 6; aiIssues.push(`lowercase bug (${lowercaseCount})`); }

  // NEW: Double punctuation (generation bug)
  const doublePunctCount = (content.match(DOUBLE_PUNCTUATION) || []).length;
  if (doublePunctCount > 5) { aiScore += 8; aiIssues.push(`punctuation bugs (${doublePunctCount})`); }

  const aiProbability = Math.min(99, aiScore);

  // AI PENALTY: High AI detection tanks the composite score
  // 70%+ AI = -15 points, 80%+ = -25 points, 90%+ = -35 points
  if (aiProbability >= 90) {
    composite -= 35;
    aiIssues.push('SEVERE: Script reads as AI-generated');
  } else if (aiProbability >= 80) {
    composite -= 25;
    aiIssues.push('HIGH: Strong AI fingerprints');
  } else if (aiProbability >= 70) {
    composite -= 15;
    aiIssues.push('ELEVATED: Notable AI patterns');
  } else if (aiProbability >= 60) {
    composite -= 8;
  }

  // Ensure composite doesn't go below 0
  composite = Math.max(0, composite);

  // Determine verdict AFTER AI penalty applied
  let verdict;
  let recommendation;
  if (composite >= 75) {
    verdict = 'CONSIDER';
    recommendation = 'Has commercial potential. Worth a second read.';
  } else if (composite >= 60) {
    verdict = 'SOFT PASS';
    recommendation = 'Shows promise but needs significant development work.';
  } else if (composite >= 45) {
    verdict = 'PASS';
    recommendation = 'Does not meet professional standards.';
  } else {
    verdict = 'HARD PASS';
    recommendation = 'Fundamental issues with execution and concept.';
  }

  return {
    composite: Math.round(composite),
    verdict,
    recommendation,
    wordCount,
    pageCount: Math.round(wordCount / 250),
    aiProbability,
    aiIssues,  // NEW: detailed AI detection breakdown
    categories: {
      execution,
      pacing,
      market,
      cinematic,
      commercial,
      innovation,
    },
  };
}

// ============================================================================
// CLI OUTPUT
// ============================================================================

function printReport(result, filename) {
  console.log('\n' + '═'.repeat(70));
  console.log('  HOLLYWOOD READER COVERAGE');
  console.log('═'.repeat(70));
  console.log(`\n  Script: ${filename}`);
  console.log(`  Pages: ${result.pageCount} | Words: ${result.wordCount.toLocaleString()}`);
  console.log(`  AI Detection: ${result.aiProbability}%${result.aiProbability >= 70 ? ' ⚠️  HIGH' : result.aiProbability >= 50 ? ' ⚠️' : ''}`);
  if (result.aiIssues && result.aiIssues.length > 0) {
    console.log(`    Tells: ${result.aiIssues.slice(0, 5).join(', ')}${result.aiIssues.length > 5 ? '...' : ''}`);
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`  VERDICT: ${result.verdict} (${result.composite}/100)`);
  console.log(`  ${result.recommendation}`);
  console.log('─'.repeat(70));

  console.log('\n  CATEGORY SCORES');
  console.log('─'.repeat(70));

  const categories = [
    { name: 'I. Execution', data: result.categories.execution, desc: 'Dialogue, subtext, voice' },
    { name: 'II. Pacing', data: result.categories.pacing, desc: 'Structure, momentum' },
    { name: 'III. Market', data: result.categories.market, desc: 'Audience, viability' },
    { name: 'IV. Cinematic', data: result.categories.cinematic, desc: 'Visual potential' },
    { name: 'V. Commercial', data: result.categories.commercial, desc: 'Budget, franchise' },
    { name: 'VI. Innovation', data: result.categories.innovation, desc: 'Originality' },
  ];

  for (const cat of categories) {
    const bar = '█'.repeat(Math.floor(cat.data.score / 5)) + '░'.repeat(20 - Math.floor(cat.data.score / 5));
    console.log(`\n  ${cat.name}: ${cat.data.score}/100`);
    console.log(`  ${bar}`);
    console.log(`  (${cat.desc})`);

    if (cat.data.issues.length > 0) {
      console.log('  Issues:');
      for (const issue of cat.data.issues.slice(0, 3)) {
        console.log(`    - ${issue}`);
      }
    }
    if (cat.data.strengths.length > 0) {
      console.log('  Strengths:');
      for (const strength of cat.data.strengths.slice(0, 2)) {
        console.log(`    + ${strength}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('  FINAL ANALYSIS');
  console.log('═'.repeat(70));

  // Collect all major issues
  const allIssues = [];
  const allStrengths = [];
  for (const cat of categories) {
    allIssues.push(...cat.data.issues);
    allStrengths.push(...cat.data.strengths);
  }

  if (allIssues.length > 0) {
    console.log('\n  Primary Issues:');
    for (const issue of allIssues.slice(0, 5)) {
      console.log(`    • ${issue}`);
    }
  }

  if (allStrengths.length > 0) {
    console.log('\n  Strengths:');
    for (const strength of allStrengths.slice(0, 3)) {
      console.log(`    • ${strength}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node score-hollywood.js <screenplay-file> [--verbose] [--json]');
    console.log('');
    console.log('Hollywood Reader Coverage - Ruthless industry-standard script analysis');
    console.log('');
    console.log('Options:');
    console.log('  --verbose  Show detailed analysis');
    console.log('  --json     Output as JSON');
    process.exit(0);
  }

  const filePath = args.find(a => !a.startsWith('--'));
  const jsonOutput = args.includes('--json');

  if (!filePath) {
    console.error('Error: Please provide a screenplay file path');
    process.exit(1);
  }

  const fullPath = path.resolve(filePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`Error: File not found: ${fullPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const result = scoreScreenplay(content);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printReport(result, path.basename(filePath));
  }
}

module.exports = { scoreScreenplay, CONFIG };
