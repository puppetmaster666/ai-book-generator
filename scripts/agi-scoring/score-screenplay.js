#!/usr/bin/env node

/**
 * Narrative Architect AGI Scoring Script (NA-AST)
 *
 * Usage: node scripts/agi-scoring/score-screenplay.js <screenplay-file> [--verbose]
 *
 * Analyzes a screenplay file and produces an AGI quality score
 * based on the NA-AST template metrics.
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Weights for composite score
  weights: {
    structural: 0.20,
    prose: 0.20,
    character: 0.20,
    behavioral: 0.15,
    aiFingerprint: 0.15,
    uniqueness: 0.10,
  },

  // Thresholds
  thresholds: {
    sentenceVarianceTarget: 5.5,
    sentenceVarianceMin: 4.0,
    mundanityRatioMax: 0.30,
    sensoryDensityTarget: 300, // 1 per 300 words
    ticMaxPerScript: {
      glasses: 8,
      watch: 4,
      sigh: 16,
      nod: 24,
      cigarette: 5,
      gun: 6,
    },
    propCooldownWords: 1500,
  },
};

// ============================================================================
// PATTERN DEFINITIONS
// ============================================================================

// Clinical vocabulary (AI-speak)
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
  /negative\b/gi,
  /acknowledged\b/gi,
  /in my estimation/gi,
  /spatial logistics/gi,
];

// On-the-nose dialogue patterns
const ON_THE_NOSE_PATTERNS = [
  /I feel (so )?(angry|sad|happy|scared|betrayed|hurt|confused)/gi,
  /I('m| am) (so )?(angry|sad|happy|scared|confused|devastated)/gi,
  /You make me feel/gi,
  /I need you to understand/gi,
  /What I('m| am) trying to say is/gi,
  /The truth is,? I/gi,
  /I have to be honest/gi,
  /Can I be honest with you/gi,
  /I('m| am) feeling/gi,
  /My feelings are/gi,
];

// Banger/Trailer-speak patterns
const BANGER_PATTERNS = [
  /The (truth|reality|problem) is[,.]?/gi,
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
];

// Tic patterns
const TIC_PATTERNS = [
  { name: 'glasses', pattern: /(clean|wipe|polish|adjust|push|remove)s?\s+(his|her|their)?\s*(glasses|spectacles)/gi },
  { name: 'watch', pattern: /\b(watch|wristwatch|timepiece)\b(?!\s*(tower|man|woman|out|over))/gi },
  { name: 'sigh', pattern: /\bsigh(s|ed|ing)?\b/gi },
  { name: 'nod', pattern: /\bnod(s|ded|ding)?\b/gi },
  { name: 'cigarette', pattern: /\b(cigarette|cig|smoke|lighter|ash)\b/gi },
  { name: 'gun', pattern: /\b(gun|pistol|revolver|weapon|firearm)\b/gi },
  { name: 'jaw_clench', pattern: /clench(es|ing|ed)?\s+(his|her|their)\s+jaw/gi },
  { name: 'fist_ball', pattern: /ball(s|ing|ed)?\s+(his|her|their)\s+fist/gi },
  { name: 'throat_clear', pattern: /clear(s|ing|ed)?\s+(his|her|their)\s+throat/gi },
  { name: 'deep_breath', pattern: /take(s)?\s+a\s+deep\s+breath/gi },
];

// Sensory patterns (non-visual)
const SENSORY_PATTERNS = {
  smell: /\b(smell|scent|odor|aroma|stench|whiff|fragrance|reek)\b/gi,
  sound: /\b(sound|noise|hum|buzz|crack|thud|whisper|roar|echo|silence|hear|heard)\b/gi,
  touch: /\b(touch|feel|rough|smooth|cold|warm|wet|dry|texture|grip|grasp)\b/gi,
  taste: /\b(taste|bitter|sweet|sour|salty|metallic|tongue)\b/gi,
};

// Verbal messiness patterns (GOOD - we want these)
const MESSINESS_PATTERNS = [
  { name: 'stutter', pattern: /\b([A-Za-z])-\1/g },
  { name: 'ellipsis', pattern: /\.\.\./g },
  { name: 'dash_interrupt', pattern: /--(?!\s*$)/g },
  { name: 'filler', pattern: /\b(um|uh|er|ah|like,|you know,|I mean,)\b/gi },
  { name: 'false_start', pattern: /--\s*No[.,]/gi },
  { name: 'trail_off', pattern: /[a-z]\.\.\.\s*$/gm },
];

// Reset patterns (BAD - story loops)
const RESET_PATTERNS = [
  /meanwhile/gi,
  /back at/gi,
  /let's go back/gi,
  /as we saw earlier/gi,
  /returning to/gi,
];

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Calculate sentence length variance (standard deviation)
 */
function calculateSentenceVariance(content) {
  // Extract sentences (simplified)
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length < 5) {
    return { stdDev: 0, avgLength: 0, count: sentences.length };
  }

  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  // Analyze distribution
  const short = lengths.filter(l => l < 6).length;
  const medium = lengths.filter(l => l >= 6 && l <= 14).length;
  const long = lengths.filter(l => l > 14).length;

  return {
    stdDev: Math.round(stdDev * 100) / 100,
    avgLength: Math.round(avg * 10) / 10,
    count: sentences.length,
    distribution: { short, medium, long },
    metricRatio: medium / lengths.length, // % in "boring" range
  };
}

/**
 * Count pattern matches
 */
function countPatternMatches(content, patterns) {
  const matches = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches.push(match[0]);
    }
  }
  return matches;
}

/**
 * Count tic occurrences
 */
function countTics(content) {
  const counts = {};
  for (const tic of TIC_PATTERNS) {
    tic.pattern.lastIndex = 0;
    const matches = content.match(tic.pattern) || [];
    counts[tic.name] = matches.length;
  }
  return counts;
}

/**
 * Count sensory references
 */
function countSensory(content) {
  const counts = {};
  let total = 0;
  for (const [sense, pattern] of Object.entries(SENSORY_PATTERNS)) {
    pattern.lastIndex = 0;
    const matches = content.match(pattern) || [];
    counts[sense] = matches.length;
    total += matches.length;
  }
  counts.total = total;
  return counts;
}

/**
 * Count verbal messiness (positive indicator)
 */
function countMessiness(content) {
  const counts = {};
  let total = 0;
  for (const m of MESSINESS_PATTERNS) {
    m.pattern.lastIndex = 0;
    const matches = content.match(m.pattern) || [];
    counts[m.name] = matches.length;
    total += matches.length;
  }
  counts.total = total;
  return counts;
}

/**
 * Extract dialogue lines
 */
function extractDialogue(content) {
  const lines = content.split('\n');
  const dialogueLines = [];
  let inDialogue = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Character name (ALL CAPS, reasonable length)
    if (/^[A-Z][A-Z\s.'()-]+$/.test(trimmed) && trimmed.length < 50) {
      inDialogue = true;
      continue;
    }

    // End of dialogue block
    if (!trimmed || /^(INT\.|EXT\.)/.test(trimmed)) {
      inDialogue = false;
      continue;
    }

    // Skip parentheticals
    if (trimmed.startsWith('(')) continue;

    if (inDialogue) {
      dialogueLines.push(trimmed);
    }
  }

  return dialogueLines;
}

/**
 * Check prop clustering (cooldown violations)
 */
function checkPropClustering(content) {
  const violations = [];
  const propPatterns = [
    { name: 'watch', pattern: /\b(watch|wristwatch|timepiece)\b/gi, cooldown: 2000 },
    { name: 'gun', pattern: /\b(gun|pistol|revolver|weapon)\b/gi, cooldown: 1500 },
    { name: 'phone', pattern: /\b(phone|cell|mobile)\b/gi, cooldown: 1200 },
  ];

  const words = content.split(/\s+/);

  for (const prop of propPatterns) {
    prop.pattern.lastIndex = 0;
    const positions = [];

    let match;
    while ((match = prop.pattern.exec(content)) !== null) {
      const textBefore = content.slice(0, match.index);
      const wordPos = textBefore.split(/\s+/).length;
      positions.push(wordPos);
    }

    // Check for clustering
    for (let i = 1; i < positions.length; i++) {
      const distance = positions[i] - positions[i - 1];
      if (distance < prop.cooldown) {
        violations.push({
          prop: prop.name,
          distance,
          required: prop.cooldown,
        });
      }
    }
  }

  return violations;
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Score prose mechanics
 */
function scoreProseMechanics(content, wordCount) {
  const variance = calculateSentenceVariance(content);
  const sensory = countSensory(content);

  // Variance score (0-10)
  let varianceScore;
  if (variance.stdDev >= 6.0) varianceScore = 10;
  else if (variance.stdDev >= 5.5) varianceScore = 9;
  else if (variance.stdDev >= 5.0) varianceScore = 8;
  else if (variance.stdDev >= 4.5) varianceScore = 7;
  else if (variance.stdDev >= 4.0) varianceScore = 6;
  else if (variance.stdDev >= 3.5) varianceScore = 5;
  else varianceScore = 4;

  // Sensory density score (0-10)
  const expectedSensory = wordCount / CONFIG.thresholds.sensoryDensityTarget;
  const sensoryRatio = sensory.total / Math.max(expectedSensory, 1);
  let sensoryScore = Math.min(10, sensoryRatio * 10);

  // Metric rhythm penalty (too many medium sentences)
  const metricPenalty = variance.metricRatio > 0.5 ? (variance.metricRatio - 0.5) * 4 : 0;

  const composite = ((varianceScore * 0.5) + (sensoryScore * 0.3) + ((10 - metricPenalty) * 0.2));

  return {
    score: Math.round(composite * 10) / 10,
    details: {
      variance,
      sensory,
      varianceScore,
      sensoryScore,
      metricPenalty,
    },
  };
}

/**
 * Score behavioral control
 */
function scoreBehavioralControl(content) {
  const tics = countTics(content);
  const clustering = checkPropClustering(content);

  let violations = 0;
  const issues = [];

  // Check tic limits
  for (const [tic, count] of Object.entries(tics)) {
    const limit = CONFIG.thresholds.ticMaxPerScript[tic] || 10;
    if (count > limit) {
      violations += (count - limit);
      issues.push(`${tic}: ${count}x (limit: ${limit})`);
    }
  }

  // Add clustering violations
  violations += clustering.length;
  for (const v of clustering) {
    issues.push(`${v.prop} clustering: ${v.distance} words (need ${v.required})`);
  }

  // Score (10 = perfect, -1 per 2 violations)
  const score = Math.max(0, 10 - (violations / 2));

  return {
    score: Math.round(score * 10) / 10,
    details: {
      tics,
      clustering,
      violations,
      issues,
    },
  };
}

/**
 * Score AI fingerprint avoidance
 */
function scoreAIFingerprint(content) {
  const clinical = countPatternMatches(content, CLINICAL_PATTERNS);
  const onTheNose = countPatternMatches(content, ON_THE_NOSE_PATTERNS);
  const bangers = countPatternMatches(content, BANGER_PATTERNS);
  const messiness = countMessiness(content);

  // Extract dialogue for mundanity ratio
  const dialogueLines = extractDialogue(content);
  const dialogueCount = dialogueLines.length;

  // Mundanity ratio (bangers / dialogue lines)
  const mundanityRatio = dialogueCount > 0 ? bangers.length / dialogueCount : 0;

  // Calculate penalties
  const clinicalPenalty = clinical.length * 0.5;
  const onTheNosePenalty = onTheNose.length * 0.3;
  const mundanityPenalty = mundanityRatio > 0.30 ? (mundanityRatio - 0.30) * 10 : 0;

  // Verbal friction bonus (messiness is GOOD)
  const messinessBonus = Math.min(2, messiness.total * 0.2);

  const score = Math.max(0, 10 - clinicalPenalty - onTheNosePenalty - mundanityPenalty + messinessBonus);

  return {
    score: Math.round(score * 10) / 10,
    details: {
      clinical,
      onTheNose,
      bangers,
      messiness,
      mundanityRatio: Math.round(mundanityRatio * 100) / 100,
      dialogueCount,
    },
  };
}

/**
 * Score structural integrity
 */
function scoreStructuralIntegrity(content) {
  const resets = countPatternMatches(content, RESET_PATTERNS);

  // Basic heuristic - more sophisticated analysis would need outline data
  const resetPenalty = resets.length * 2;

  const score = Math.max(0, 10 - resetPenalty);

  return {
    score: Math.round(score * 10) / 10,
    details: {
      resets,
      note: 'Full structural analysis requires outline comparison',
    },
  };
}

/**
 * Score character dynamics
 */
function scoreCharacterDynamics(content) {
  const onTheNose = countPatternMatches(content, ON_THE_NOSE_PATTERNS);
  const messiness = countMessiness(content);

  // On-the-nose penalty
  const onTheNosePenalty = onTheNose.length * 0.5;

  // Messiness bonus (indicates natural speech)
  const messinessBonus = Math.min(1.5, messiness.total * 0.15);

  const score = Math.max(0, 10 - onTheNosePenalty + messinessBonus);

  return {
    score: Math.round(score * 10) / 10,
    details: {
      onTheNose,
      messiness,
      note: 'Voice fingerprinting requires multi-character analysis',
    },
  };
}

/**
 * Score uniqueness (requires DNA blacklist comparison)
 */
function scoreUniqueness(_content) {
  // This would need to compare against DNA blacklist database
  // For now, return a baseline
  return {
    score: 8.0,
    details: {
      note: 'Full uniqueness scoring requires DNA blacklist comparison',
    },
  };
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Run full AGI scoring analysis
 */
function scoreScreenplay(content, verbose = false) {
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  // Run all scoring categories
  const structural = scoreStructuralIntegrity(content);
  const prose = scoreProseMechanics(content, wordCount);
  const character = scoreCharacterDynamics(content);
  const behavioral = scoreBehavioralControl(content);
  const aiFingerprint = scoreAIFingerprint(content);
  const uniqueness = scoreUniqueness(content);

  // Calculate composite score
  const composite =
    (structural.score * CONFIG.weights.structural) +
    (prose.score * CONFIG.weights.prose) +
    (character.score * CONFIG.weights.character) +
    (behavioral.score * CONFIG.weights.behavioral) +
    (aiFingerprint.score * CONFIG.weights.aiFingerprint) +
    (uniqueness.score * CONFIG.weights.uniqueness);

  // Determine rating
  let rating;
  if (composite >= 9.5) rating = 'S-Tier';
  else if (composite >= 9.0) rating = 'A-Tier';
  else if (composite >= 8.0) rating = 'B-Tier';
  else if (composite >= 7.0) rating = 'C-Tier';
  else if (composite >= 6.0) rating = 'D-Tier';
  else rating = 'F-Tier';

  return {
    composite: Math.round(composite * 100) / 100,
    rating,
    wordCount,
    categories: {
      structural,
      prose,
      character,
      behavioral,
      aiFingerprint,
      uniqueness,
    },
    verbose: verbose ? {
      clinicalPhrases: aiFingerprint.details.clinical,
      onTheNoseDialogue: aiFingerprint.details.onTheNose,
      bangers: aiFingerprint.details.bangers,
      ticCounts: behavioral.details.tics,
      sentenceVariance: prose.details.variance,
      sensoryDensity: prose.details.sensory,
      verbalMessiness: aiFingerprint.details.messiness,
    } : undefined,
  };
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function printReport(result) {
  console.log('\n' + '='.repeat(60));
  console.log('  NARRATIVE ARCHITECT AGI SCORE (NA-AST)');
  console.log('='.repeat(60));

  console.log(`\n  COMPOSITE SCORE: ${result.composite}/10 (${result.rating})`);
  console.log(`  Word Count: ${result.wordCount.toLocaleString()}`);

  console.log('\n' + '-'.repeat(60));
  console.log('  CATEGORY BREAKDOWN');
  console.log('-'.repeat(60));

  const categories = [
    { name: 'Structural Integrity', data: result.categories.structural, weight: '20%' },
    { name: 'Prose Mechanics', data: result.categories.prose, weight: '20%' },
    { name: 'Character Dynamics', data: result.categories.character, weight: '20%' },
    { name: 'Behavioral Control', data: result.categories.behavioral, weight: '15%' },
    { name: 'AI Fingerprint', data: result.categories.aiFingerprint, weight: '15%' },
    { name: 'Cross-Project Uniqueness', data: result.categories.uniqueness, weight: '10%' },
  ];

  for (const cat of categories) {
    console.log(`\n  ${cat.name} (${cat.weight}): ${cat.data.score}/10`);

    // Show relevant details
    if (cat.name === 'Prose Mechanics' && cat.data.details.variance) {
      console.log(`    - Sentence variance (σ): ${cat.data.details.variance.stdDev}`);
      console.log(`    - Sensory density: ${cat.data.details.sensory.total} refs`);
    }

    if (cat.name === 'Behavioral Control' && cat.data.details.issues.length > 0) {
      console.log('    Issues:');
      for (const issue of cat.data.details.issues.slice(0, 5)) {
        console.log(`      - ${issue}`);
      }
    }

    if (cat.name === 'AI Fingerprint') {
      console.log(`    - Clinical phrases: ${cat.data.details.clinical.length}`);
      console.log(`    - On-the-nose dialogue: ${cat.data.details.onTheNose.length}`);
      console.log(`    - Banger/trailer-speak: ${cat.data.details.bangers.length}`);
      console.log(`    - Mundanity ratio: ${(cat.data.details.mundanityRatio * 100).toFixed(1)}%`);
      console.log(`    - Verbal messiness: ${cat.data.details.messiness.total} instances`);
    }
  }

  if (result.verbose) {
    console.log('\n' + '-'.repeat(60));
    console.log('  DETAILED FINDINGS');
    console.log('-'.repeat(60));

    if (result.verbose.clinicalPhrases.length > 0) {
      console.log('\n  Clinical Phrases Found:');
      for (const p of result.verbose.clinicalPhrases.slice(0, 5)) {
        console.log(`    - "${p}"`);
      }
    }

    if (result.verbose.onTheNoseDialogue.length > 0) {
      console.log('\n  On-the-Nose Dialogue:');
      for (const p of result.verbose.onTheNoseDialogue.slice(0, 5)) {
        console.log(`    - "${p}"`);
      }
    }

    if (result.verbose.bangers.length > 0) {
      console.log('\n  Trailer-Speak/Bangers:');
      for (const p of result.verbose.bangers.slice(0, 5)) {
        console.log(`    - "${p}"`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node score-screenplay.js <screenplay-file> [--verbose] [--json]');
    console.log('');
    console.log('Options:');
    console.log('  --verbose  Show detailed findings');
    console.log('  --json     Output as JSON instead of formatted report');
    process.exit(0);
  }

  const filePath = args.find(a => !a.startsWith('--'));
  const verbose = args.includes('--verbose');
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
  const result = scoreScreenplay(content, verbose);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printReport(result);
  }
}

module.exports = { scoreScreenplay, CONFIG };
