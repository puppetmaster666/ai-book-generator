#!/usr/bin/env node

/**
 * Deep Humanity Gap Analysis Script
 *
 * Goes beyond basic scoring to identify ALL remaining AI tells
 * and patterns that prevent true human-level screenplay writing.
 *
 * Usage: node analyze-humanity-gaps.js <screenplay-file>
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// ADVANCED DETECTION PATTERNS
// ============================================================================

// 1. DIALOGUE HOMOGENEITY - Same speech patterns across characters
const DIALOGUE_UNIFORMITY_MARKERS = {
  // Sentence starters that AI overuses
  overusedStarters: [
    /^(I think|I believe|I mean|I just|I need|I want|I know|I don't|I can't|I won't)/i,
    /^(You know|You think|You should|You need|You have to)/i,
    /^(We need|We have|We should|We can't)/i,
    /^(There's|There is|There are|There was|There were)/i,
    /^(It's|It is|It was|It would|It seems)/i,
    /^(That's|That is|That was)/i,
    /^(Look,|Listen,|Hey,|So,|Well,|Okay,|Right,)/i,
  ],

  // Perfect grammar (humans make mistakes)
  tooPolished: [
    /\bwhom\b/gi,  // Humans rarely use "whom" correctly
    /\bwhomever\b/gi,
    /\bshall\b/gi,  // Too formal
    /\bmight I\b/gi,
    /\bperhaps we could\b/gi,
    /\bI would be remiss\b/gi,
    /\bwith regard to\b/gi,
    /\bin light of\b/gi,
  ],
};

// 2. EMOTIONAL FLATNESS - Missing micro-emotions
const EMOTIONAL_GAPS = {
  // Generic emotions vs specific ones
  genericEmotions: [
    /\bfeel(s)? (sad|happy|angry|scared|confused|worried|frustrated)\b/gi,
    /\blook(s)? (sad|happy|angry|scared|confused|worried)\b/gi,
    /\bseem(s)? (sad|happy|angry|scared|confused|worried)\b/gi,
  ],

  // Missing somatic markers (body-based emotion cues)
  missingSomatic: [
    'stomach drops', 'chest tightens', 'throat closes', 'hands tremble',
    'scalp prickles', 'spine tingles', 'gut churns', 'skin crawls',
    'blood runs cold', 'heart skips', 'breath catches', 'mouth goes dry',
  ],
};

// 3. ACTION LINE TELLS
const ACTION_LINE_TELLS = {
  // Simultaneous action clichés
  simultaneousClutter: [
    /\bas (he|she|they)\b/gi,
    /\bwhile (simultaneously|also|at the same time)\b/gi,
  ],

  // Overly choreographed movement
  choreographedMovement: [
    /\bturn(s)? (slowly|quickly|sharply|abruptly)\b/gi,
    /\bstep(s)? (forward|backward|back|closer)\b/gi,
    /\bmove(s)? (toward|towards|away|closer)\b/gi,
    /\breach(es)? for\b/gi,
  ],

  // Camera direction creep (shouldn't be in spec scripts)
  cameraCreep: [
    /\bwe see\b/gi,
    /\bthe camera\b/gi,
    /\bclose on\b/gi,
    /\bpull back\b/gi,
    /\bpush in\b/gi,
    /\bangle on\b/gi,
    /\bWIDE SHOT\b/gi,
    /\bCLOSE-UP\b/gi,
  ],

  // Telling not showing
  tellingNotShowing: [
    /\b(he|she|they) (is|are) clearly\b/gi,
    /\bobviously\b/gi,
    /\bit('s| is) clear that\b/gi,
    /\b(he|she|they) (is|are) (feeling|thinking)\b/gi,
  ],
};

// 4. THEMATIC SLEDGEHAMMER
const THEMATIC_TELLS = {
  // Too-obvious theme statements
  thematicStatements: [
    /\bthis is (really )?about\b/gi,
    /\bwhat (this|it) (really )?means\b/gi,
    /\bthe (real )?(lesson|message|point) (here )?is\b/gi,
    /\bdon't you (see|understand|get it)\b/gi,
    /\bthat's (exactly )?what I('m| am) (trying|saying)\b/gi,
  ],

  // Symmetry addiction (too neat)
  symmetryMarkers: [
    /\bjust like (before|earlier|you said)\b/gi,
    /\bjust as (you|I|we) (said|predicted|thought)\b/gi,
    /\bfull circle\b/gi,
    /\bcome(s)? back to\b/gi,
  ],
};

// 5. SUBTEXT DEFICIENCY
const SUBTEXT_MARKERS = {
  // Characters saying exactly what they mean
  noSubtext: [
    /I('m| am) (so )?(angry|hurt|disappointed|upset) (with|at|about) you/gi,
    /you (always|never) (understand|listen|care)/gi,
    /what I('m| am) (really )?trying to say is/gi,
    /the (truth|thing) is,? I/gi,
    /I (just )?want(ed)? to (tell|say|ask) you/gi,
    /I need you to (know|understand|hear)/gi,
  ],
};

// 6. PACING TELLS
const PACING_TELLS = {
  // Scene length uniformity (all scenes same length is AI tell)
  // Will check programmatically

  // Transition clichés
  transitionClutter: [
    /\bLATER\b/g,
    /\bMOMENTS LATER\b/g,
    /\bSOME TIME LATER\b/g,
    /\bTHE NEXT (DAY|MORNING|EVENING|NIGHT)\b/g,
    /\bEARLIER THAT (DAY|MORNING|EVENING|NIGHT)\b/g,
  ],
};

// 7. WORLD-BUILDING TELLS
const WORLD_BUILDING_TELLS = {
  // Generic settings
  genericSettings: [
    /\b(nice|modest|average|typical|ordinary) (house|apartment|office|room)\b/gi,
    /\b(small|large|big) (table|desk|room|space)\b/gi,
    /\bthe usual\b/gi,
  ],

  // Missing sensory specificity
  // Will check for lack of specific brand names, local color, etc.
};

// 8. DIALOGUE RHYTHM ISSUES
const DIALOGUE_RHYTHM = {
  // Too many complete sentences (people interrupt/fragment)
  tooComplete: /[.!?]["']?\s*$/,  // Every line ends with punctuation

  // Missing overlap indicators
  missingOverlap: [
    '--',  // Interruption dash
    '...',  // Trail off
  ],
};

// 9. CHARACTER VOICE UNIFORMITY
// Will analyze dialogue by character to check if they sound different

// 10. STAKES ESCALATION PATTERNS
const STAKES_PATTERNS = {
  // Artificial urgency
  artificialUrgency: [
    /\bwe('re| are) running out of time\b/gi,
    /\bthere's no time\b/gi,
    /\bwe have to (move|go|act) (now|fast|quickly)\b/gi,
    /\bevery second counts\b/gi,
    /\bthe clock is ticking\b/gi,
  ],

  // Telegraphed twists
  telegraphedTwists: [
    /\bI have (something|a secret) to tell you\b/gi,
    /\bthere's something (you should|I need to) (know|tell you)\b/gi,
    /\byou('re| are) (not going|never going) to believe\b/gi,
    /\bpromise me you won't\b/gi,
  ],
};

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function extractScenes(content) {
  const scenes = [];
  const sceneHeaders = content.match(/^(INT\.|EXT\.).*$/gm) || [];
  const parts = content.split(/^(INT\.|EXT\.)/m);

  let currentScene = null;
  for (let i = 1; i < parts.length; i += 2) {
    if (parts[i] && parts[i + 1]) {
      scenes.push({
        header: parts[i] + parts[i + 1].split('\n')[0],
        content: parts[i + 1],
        wordCount: parts[i + 1].split(/\s+/).length,
      });
    }
  }
  return scenes;
}

function extractCharacterDialogue(content) {
  const lines = content.split('\n');
  const characterDialogue = {};
  let currentCharacter = null;
  let dialogueBuffer = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Character name detection (ALL CAPS, reasonable length)
    if (/^[A-Z][A-Z\s.'()-]+$/.test(trimmed) && trimmed.length < 40 && trimmed.length > 1) {
      // Save previous character's dialogue
      if (currentCharacter && dialogueBuffer.length > 0) {
        if (!characterDialogue[currentCharacter]) {
          characterDialogue[currentCharacter] = [];
        }
        characterDialogue[currentCharacter].push(dialogueBuffer.join(' '));
        dialogueBuffer = [];
      }
      currentCharacter = trimmed;
      continue;
    }

    // End of dialogue block
    if (!trimmed || /^(INT\.|EXT\.)/.test(trimmed)) {
      if (currentCharacter && dialogueBuffer.length > 0) {
        if (!characterDialogue[currentCharacter]) {
          characterDialogue[currentCharacter] = [];
        }
        characterDialogue[currentCharacter].push(dialogueBuffer.join(' '));
        dialogueBuffer = [];
      }
      currentCharacter = null;
      continue;
    }

    // Skip parentheticals
    if (trimmed.startsWith('(')) continue;

    // Collect dialogue
    if (currentCharacter) {
      dialogueBuffer.push(trimmed);
    }
  }

  return characterDialogue;
}

function analyzeDialogueUniformity(characterDialogue) {
  const issues = [];
  const starterCounts = {};

  // Analyze sentence starters across all characters
  for (const [character, dialogues] of Object.entries(characterDialogue)) {
    for (const dialogue of dialogues) {
      const sentences = dialogue.split(/[.!?]+/).filter(s => s.trim());
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        for (const pattern of DIALOGUE_UNIFORMITY_MARKERS.overusedStarters) {
          const match = trimmed.match(pattern);
          if (match) {
            const starter = match[0].toLowerCase();
            if (!starterCounts[starter]) starterCounts[starter] = 0;
            starterCounts[starter]++;
          }
        }
      }
    }
  }

  // Check for overused starters
  for (const [starter, count] of Object.entries(starterCounts)) {
    if (count > 5) {
      issues.push(`Overused dialogue starter: "${starter}" (${count}x)`);
    }
  }

  // Check for too-polished grammar
  for (const [character, dialogues] of Object.entries(characterDialogue)) {
    for (const dialogue of dialogues) {
      for (const pattern of DIALOGUE_UNIFORMITY_MARKERS.tooPolished) {
        const matches = dialogue.match(pattern);
        if (matches) {
          issues.push(`${character} uses formal/archaic language: "${matches[0]}"`);
        }
      }
    }
  }

  return { issues, starterCounts };
}

function analyzeVoiceDistinctiveness(characterDialogue) {
  const issues = [];
  const characterProfiles = {};

  for (const [character, dialogues] of Object.entries(characterDialogue)) {
    if (dialogues.length < 3) continue;

    const allText = dialogues.join(' ');
    const words = allText.split(/\s+/);

    characterProfiles[character] = {
      avgSentenceLength: allText.split(/[.!?]+/).length > 0
        ? words.length / allText.split(/[.!?]+/).length
        : 0,
      contractionRate: (allText.match(/\b\w+'\w+\b/g) || []).length / words.length,
      questionRate: (allText.match(/\?/g) || []).length / dialogues.length,
      exclamationRate: (allText.match(/!/g) || []).length / dialogues.length,
      wordCount: words.length,
    };
  }

  // Compare character profiles for similarity
  const characters = Object.keys(characterProfiles);
  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      const p1 = characterProfiles[characters[i]];
      const p2 = characterProfiles[characters[j]];

      // Check if profiles are too similar
      const sentenceDiff = Math.abs(p1.avgSentenceLength - p2.avgSentenceLength);
      const contractionDiff = Math.abs(p1.contractionRate - p2.contractionRate);

      if (sentenceDiff < 2 && contractionDiff < 0.05 && p1.wordCount > 100 && p2.wordCount > 100) {
        issues.push(`${characters[i]} and ${characters[j]} have similar speech patterns (low voice differentiation)`);
      }
    }
  }

  return { issues, profiles: characterProfiles };
}

function analyzeEmotionalDepth(content) {
  const issues = [];

  // Check for generic emotions
  for (const pattern of EMOTIONAL_GAPS.genericEmotions) {
    const matches = content.match(pattern) || [];
    if (matches.length > 3) {
      issues.push(`Overuse of generic emotion descriptions: ${matches.slice(0, 3).join(', ')} (${matches.length}x total)`);
    }
  }

  // Check for somatic markers
  let somaticCount = 0;
  for (const marker of EMOTIONAL_GAPS.missingSomatic) {
    if (content.toLowerCase().includes(marker)) {
      somaticCount++;
    }
  }

  const wordCount = content.split(/\s+/).length;
  if (somaticCount < wordCount / 5000) {
    issues.push(`Low somatic marker density: ${somaticCount} found (expect ${Math.floor(wordCount / 5000)}+ for emotional depth)`);
  }

  return { issues, somaticCount };
}

function analyzeActionLines(content) {
  const issues = [];
  const counts = {};

  // Check each category
  for (const [category, patterns] of Object.entries(ACTION_LINE_TELLS)) {
    counts[category] = 0;
    for (const pattern of patterns) {
      const matches = content.match(pattern) || [];
      counts[category] += matches.length;
      if (matches.length > 5) {
        issues.push(`${category}: "${matches[0]}" appears ${matches.length}x`);
      }
    }
  }

  return { issues, counts };
}

function analyzeSubtext(content, characterDialogue) {
  const issues = [];
  let noSubtextCount = 0;

  for (const pattern of SUBTEXT_MARKERS.noSubtext) {
    const matches = content.match(pattern) || [];
    noSubtextCount += matches.length;
    for (const match of matches.slice(0, 2)) {
      issues.push(`On-the-nose dialogue (no subtext): "${match}"`);
    }
  }

  if (noSubtextCount > 10) {
    issues.push(`High on-the-nose dialogue count: ${noSubtextCount} instances`);
  }

  return { issues, count: noSubtextCount };
}

function analyzeScenePacing(scenes) {
  const issues = [];

  if (scenes.length < 5) {
    return { issues: ['Too few scenes for pacing analysis'], variance: 0 };
  }

  const lengths = scenes.map(s => s.wordCount);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = Math.sqrt(lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length);

  // Low variance = AI tell (too uniform)
  if (variance < avg * 0.3) {
    issues.push(`Scene length too uniform (variance: ${variance.toFixed(0)}, avg: ${avg.toFixed(0)}) - AI tell`);
  }

  // Check for pacing variety
  const shortScenes = lengths.filter(l => l < 150).length;
  const longScenes = lengths.filter(l => l > 600).length;

  if (shortScenes === 0) {
    issues.push('No quick-cut scenes (< 150 words) - missing pacing variety');
  }
  if (longScenes === 0 && scenes.length > 20) {
    issues.push('No extended scenes (> 600 words) - missing breathing room');
  }

  return { issues, variance, avg, shortScenes, longScenes };
}

function analyzeThematicHammer(content) {
  const issues = [];
  let hammerCount = 0;

  for (const [category, patterns] of Object.entries(THEMATIC_TELLS)) {
    for (const pattern of patterns) {
      const matches = content.match(pattern) || [];
      hammerCount += matches.length;
      for (const match of matches) {
        issues.push(`Thematic sledgehammer (${category}): "${match}"`);
      }
    }
  }

  return { issues, count: hammerCount };
}

function analyzeStakesPatterns(content) {
  const issues = [];

  for (const [category, patterns] of Object.entries(STAKES_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = content.match(pattern) || [];
      if (matches.length > 2) {
        issues.push(`${category}: "${matches[0]}" (${matches.length}x)`);
      }
    }
  }

  return { issues };
}

function analyzeDialogueRhythm(characterDialogue) {
  const issues = [];
  let totalLines = 0;
  let interruptedLines = 0;
  let trailingLines = 0;

  for (const dialogues of Object.values(characterDialogue)) {
    for (const dialogue of dialogues) {
      totalLines++;
      if (dialogue.includes('--')) interruptedLines++;
      if (dialogue.includes('...')) trailingLines++;
    }
  }

  const interruptRate = interruptedLines / totalLines;
  const trailRate = trailingLines / totalLines;

  if (interruptRate < 0.03) {
    issues.push(`Low interruption rate: ${(interruptRate * 100).toFixed(1)}% (humans interrupt more)`);
  }
  if (trailRate < 0.05) {
    issues.push(`Low trail-off rate: ${(trailRate * 100).toFixed(1)}% (humans trail off more)`);
  }

  return { issues, interruptRate, trailRate };
}

function analyzeMissingHumanity(content) {
  const issues = [];

  // Things humans do that AI often misses
  const humanMarkers = {
    // Verbal tics and filler
    fillers: /\b(um|uh|er|like,|you know,|I mean,|anyway,|basically,)\b/gi,

    // Profanity (human scripts often have some)
    profanity: /\b(damn|hell|crap|shit|ass|bastard)\b/gi,

    // Contractions (AI sometimes avoids)
    contractions: /\b(won't|can't|don't|didn't|wouldn't|couldn't|shouldn't|isn't|aren't|wasn't|weren't|I'm|you're|we're|they're|he's|she's|it's|that's|there's|what's|who's|how's|where's)\b/gi,

    // Incomplete thoughts
    incomplete: /\b(But|And|So|Or) --/g,

    // Self-correction
    selfCorrect: /-- no,? (I mean|wait|actually|sorry)/gi,

    // Physical humor/embarrassment
    physical: /\b(trip|stumble|blush|stammer|snort|choke|sputter)\b/gi,

    // Awkward silences
    awkward: /\b(awkward|uncomfortable) (silence|pause|beat|moment)\b/gi,

    // Pop culture references
    popCulture: /\b(like in|just like|reminds me of|you know,? like)\b/gi,
  };

  const wordCount = content.split(/\s+/).length;

  for (const [marker, pattern] of Object.entries(humanMarkers)) {
    const matches = content.match(pattern) || [];
    const density = matches.length / (wordCount / 1000);

    const expectedDensity = {
      fillers: 2,
      profanity: 0.5,
      contractions: 10,
      incomplete: 1,
      selfCorrect: 0.5,
      physical: 0.5,
      awkward: 0.3,
      popCulture: 0.3,
    };

    if (density < expectedDensity[marker] * 0.3) {
      issues.push(`Low ${marker} density: ${density.toFixed(2)} per 1k words (expect ${expectedDensity[marker]}+)`);
    }
  }

  return { issues };
}

// ============================================================================
// MAIN ANALYSIS
// ============================================================================

function analyzeHumanityGaps(content) {
  const wordCount = content.split(/\s+/).length;
  const scenes = extractScenes(content);
  const characterDialogue = extractCharacterDialogue(content);

  console.log('\n' + '='.repeat(70));
  console.log('  HUMANITY GAP ANALYSIS - Deep Flaw Detection');
  console.log('='.repeat(70));
  console.log(`\n  Word Count: ${wordCount.toLocaleString()}`);
  console.log(`  Scene Count: ${scenes.length}`);
  console.log(`  Characters with dialogue: ${Object.keys(characterDialogue).length}`);

  const allIssues = [];

  // 1. Dialogue Uniformity
  console.log('\n' + '-'.repeat(70));
  console.log('  1. DIALOGUE UNIFORMITY ANALYSIS');
  console.log('-'.repeat(70));
  const uniformity = analyzeDialogueUniformity(characterDialogue);
  for (const issue of uniformity.issues.slice(0, 5)) {
    console.log(`  ⚠ ${issue}`);
    allIssues.push({ category: 'dialogue_uniformity', issue });
  }
  if (uniformity.issues.length === 0) console.log('  ✓ No major uniformity issues');

  // 2. Voice Distinctiveness
  console.log('\n' + '-'.repeat(70));
  console.log('  2. CHARACTER VOICE DISTINCTIVENESS');
  console.log('-'.repeat(70));
  const voices = analyzeVoiceDistinctiveness(characterDialogue);
  for (const issue of voices.issues) {
    console.log(`  ⚠ ${issue}`);
    allIssues.push({ category: 'voice_distinctiveness', issue });
  }
  if (voices.issues.length === 0) console.log('  ✓ Characters have distinct voices');

  // 3. Emotional Depth
  console.log('\n' + '-'.repeat(70));
  console.log('  3. EMOTIONAL DEPTH');
  console.log('-'.repeat(70));
  const emotions = analyzeEmotionalDepth(content);
  for (const issue of emotions.issues) {
    console.log(`  ⚠ ${issue}`);
    allIssues.push({ category: 'emotional_depth', issue });
  }
  console.log(`  Somatic markers found: ${emotions.somaticCount}`);

  // 4. Action Line Tells
  console.log('\n' + '-'.repeat(70));
  console.log('  4. ACTION LINE TELLS');
  console.log('-'.repeat(70));
  const actions = analyzeActionLines(content);
  for (const issue of actions.issues.slice(0, 5)) {
    console.log(`  ⚠ ${issue}`);
    allIssues.push({ category: 'action_tells', issue });
  }
  if (actions.issues.length === 0) console.log('  ✓ Clean action lines');

  // 5. Subtext Analysis
  console.log('\n' + '-'.repeat(70));
  console.log('  5. SUBTEXT DEFICIENCY');
  console.log('-'.repeat(70));
  const subtext = analyzeSubtext(content, characterDialogue);
  for (const issue of subtext.issues.slice(0, 5)) {
    console.log(`  ⚠ ${issue}`);
    allIssues.push({ category: 'subtext', issue });
  }
  if (subtext.count === 0) console.log('  ✓ Good subtext levels');

  // 6. Scene Pacing
  console.log('\n' + '-'.repeat(70));
  console.log('  6. SCENE PACING');
  console.log('-'.repeat(70));
  const pacing = analyzeScenePacing(scenes);
  for (const issue of pacing.issues) {
    console.log(`  ⚠ ${issue}`);
    allIssues.push({ category: 'pacing', issue });
  }
  if (pacing.issues.length === 0) console.log('  ✓ Good pacing variety');

  // 7. Thematic Hammer
  console.log('\n' + '-'.repeat(70));
  console.log('  7. THEMATIC SLEDGEHAMMER');
  console.log('-'.repeat(70));
  const thematic = analyzeThematicHammer(content);
  for (const issue of thematic.issues.slice(0, 5)) {
    console.log(`  ⚠ ${issue}`);
    allIssues.push({ category: 'thematic_hammer', issue });
  }
  if (thematic.count === 0) console.log('  ✓ Subtle thematic handling');

  // 8. Stakes Patterns
  console.log('\n' + '-'.repeat(70));
  console.log('  8. STAKES & URGENCY PATTERNS');
  console.log('-'.repeat(70));
  const stakes = analyzeStakesPatterns(content);
  for (const issue of stakes.issues) {
    console.log(`  ⚠ ${issue}`);
    allIssues.push({ category: 'stakes_patterns', issue });
  }
  if (stakes.issues.length === 0) console.log('  ✓ Natural stakes escalation');

  // 9. Dialogue Rhythm
  console.log('\n' + '-'.repeat(70));
  console.log('  9. DIALOGUE RHYTHM');
  console.log('-'.repeat(70));
  const rhythm = analyzeDialogueRhythm(characterDialogue);
  for (const issue of rhythm.issues) {
    console.log(`  ⚠ ${issue}`);
    allIssues.push({ category: 'dialogue_rhythm', issue });
  }
  console.log(`  Interrupt rate: ${(rhythm.interruptRate * 100).toFixed(1)}%`);
  console.log(`  Trail-off rate: ${(rhythm.trailRate * 100).toFixed(1)}%`);

  // 10. Missing Human Elements
  console.log('\n' + '-'.repeat(70));
  console.log('  10. MISSING HUMAN ELEMENTS');
  console.log('-'.repeat(70));
  const humanity = analyzeMissingHumanity(content);
  for (const issue of humanity.issues) {
    console.log(`  ⚠ ${issue}`);
    allIssues.push({ category: 'missing_humanity', issue });
  }
  if (humanity.issues.length === 0) console.log('  ✓ Good human element density');

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));

  const categoryCounts = {};
  for (const issue of allIssues) {
    if (!categoryCounts[issue.category]) categoryCounts[issue.category] = 0;
    categoryCounts[issue.category]++;
  }

  console.log(`\n  Total issues found: ${allIssues.length}`);
  console.log('\n  By category:');
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}`);
  }

  // Humanity Score (inverse of issues)
  const humanityScore = Math.max(0, 10 - (allIssues.length / 5));
  console.log(`\n  HUMANITY SCORE: ${humanityScore.toFixed(1)}/10`);

  if (humanityScore >= 9) {
    console.log('  Rating: HUMAN-LEVEL ✓');
  } else if (humanityScore >= 7) {
    console.log('  Rating: NEAR-HUMAN (minor tells)');
  } else if (humanityScore >= 5) {
    console.log('  Rating: AI-DETECTABLE (significant tells)');
  } else {
    console.log('  Rating: CLEARLY AI (major issues)');
  }

  console.log('\n' + '='.repeat(70));

  return {
    wordCount,
    sceneCount: scenes.length,
    characterCount: Object.keys(characterDialogue).length,
    issues: allIssues,
    humanityScore,
    details: {
      uniformity,
      voices,
      emotions,
      actions,
      subtext,
      pacing,
      thematic,
      stakes,
      rhythm,
      humanity,
    },
  };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node analyze-humanity-gaps.js <screenplay-file>');
    process.exit(0);
  }

  const filePath = path.resolve(args[0]);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  analyzeHumanityGaps(content);
}

module.exports = { analyzeHumanityGaps };
