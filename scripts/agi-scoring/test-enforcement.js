#!/usr/bin/env node

/**
 * Test Script: Verify Enforcement Functions Work Correctly
 *
 * This script reads The_Second_Breath.txt and runs it through
 * the enforcement functions to verify they're actually removing excess tics.
 */

const fs = require('fs');
const path = require('path');

// Import the patterns from screenplay.ts (aligned with NA-AST scoring limits)
const SCREENPLAY_OBJECT_TICS = [
  // Watch obsession pattern - SINGULAR only (limit: 4, aligned with scoring)
  {
    name: 'watch',
    pattern: /\b(watch|wristwatch)\b(?!\s*(tower|man|woman|dog|out|over|your|my|the\s+movie|him|her|them|it|this|that|me|you|carefully|closely|for|as|while|what))/gi,
    maxPerScreenplay: 4  // Aligned with NA-AST scoring CONFIG.thresholds.ticMaxPerScript.watch
  },
  // Gun fixation pattern (limit: 6, aligned with scoring)
  {
    name: 'gun',
    pattern: /\b(gun(s)?|pistol(s)?|revolver(s)?|weapon(s)?|firearm(s)?)\b/gi,
    maxPerScreenplay: 6  // Aligned with NA-AST scoring CONFIG.thresholds.ticMaxPerScript.gun
  },
  // Cigarette/smoking (limit: 5, aligned with scoring)
  {
    name: 'cigarette',
    pattern: /\b(cigarette(s)?|cig(s)?|lighter(s)?|ash(es)?)\b(?!\s*(alarm|detector))/gi,
    maxPerScreenplay: 5
  },
];

/**
 * Simulate enforceObjectTicLimits function
 */
function enforceObjectTicLimits(content, objectCredits = {}) {
  let processedContent = content;
  const warnings = [];
  const updatedCredits = { ...objectCredits };
  const removals = [];

  for (const objTic of SCREENPLAY_OBJECT_TICS) {
    // Reset the regex
    objTic.pattern.lastIndex = 0;

    const matches = processedContent.match(objTic.pattern) || [];
    const currentGlobalCount = updatedCredits[objTic.name] || 0;
    const remainingAllowed = Math.max(0, objTic.maxPerScreenplay - currentGlobalCount);

    console.log(`\n[${objTic.name}]`);
    console.log(`  Matches found: ${matches.length}`);
    console.log(`  Current global count: ${currentGlobalCount}`);
    console.log(`  Remaining allowed: ${remainingAllowed}`);

    if (matches.length > remainingAllowed) {
      const excessCount = matches.length - remainingAllowed;
      warnings.push(`"${objTic.name}" appears ${matches.length}x in this sequence but only ${remainingAllowed} more allowed (global limit: ${objTic.maxPerScreenplay})`);

      // Remove excess occurrences
      let keptCount = 0;
      let removedCount = 0;

      processedContent = processedContent.replace(
        objTic.pattern,
        (match) => {
          if (keptCount < remainingAllowed) {
            keptCount++;
            return match;
          }
          removedCount++;
          return '[REMOVED]'; // Mark removals visibly
        }
      );

      removals.push({ tic: objTic.name, removed: removedCount, kept: keptCount });
      console.log(`  → Removed ${removedCount}, kept ${keptCount}`);
    } else {
      console.log(`  → Within limit, no action needed`);
    }

    // Update global credits
    updatedCredits[objTic.name] = currentGlobalCount + Math.min(matches.length, remainingAllowed);
  }

  return {
    content: processedContent,
    updatedCredits,
    warnings,
    removals,
  };
}

// Main
const args = process.argv.slice(2);
const filePath = args[0] || path.join(__dirname, '../../output/The_Second_Breath.txt');

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  console.log('\nUsage: node test-enforcement.js [screenplay-file]');
  console.log('\nLooking for default: output/The_Second_Breath.txt');
  process.exit(1);
}

console.log('Testing enforcement on:', path.basename(filePath));
console.log('='.repeat(60));

const content = fs.readFileSync(filePath, 'utf-8');
const wordCount = content.split(/\s+/).filter(w => w).length;
console.log(`File size: ${wordCount} words\n`);

// Test 1: Run enforcement on entire screenplay (simulating single pass)
console.log('TEST 1: Single pass on entire screenplay');
console.log('-'.repeat(40));

const result1 = enforceObjectTicLimits(content, {});

console.log('\nResult:');
console.log(`  Warnings: ${result1.warnings.length}`);
result1.warnings.forEach(w => console.log(`    - ${w}`));
console.log(`  Removals:`, result1.removals);
console.log(`  Updated credits:`, result1.updatedCredits);

// Test 2: Verify removed content has [REMOVED] markers
const removedMarkers = (result1.content.match(/\[REMOVED\]/g) || []).length;
console.log(`\n  [REMOVED] markers in output: ${removedMarkers}`);

// Test 3: Simulate multi-sequence generation (split into 8 parts)
console.log('\n\nTEST 2: Multi-sequence simulation (8 sequences)');
console.log('-'.repeat(40));

const lines = content.split('\n');
const linesPerSequence = Math.ceil(lines.length / 8);
let cumulativeCredits = {};

for (let seq = 0; seq < 8; seq++) {
  const start = seq * linesPerSequence;
  const end = Math.min(start + linesPerSequence, lines.length);
  const sequenceContent = lines.slice(start, end).join('\n');

  console.log(`\nSequence ${seq + 1}:`);
  const seqResult = enforceObjectTicLimits(sequenceContent, cumulativeCredits);
  cumulativeCredits = seqResult.updatedCredits;
}

console.log('\n\nFinal cumulative credits after 8 sequences:');
console.log(cumulativeCredits);

// Test 3: Check what the patterns are actually matching
console.log('\n\nTEST 3: Sample matches from "watch" pattern');
console.log('-'.repeat(40));

const watchPattern = /\b(watch|wristwatch)\b(?!\s*(tower|man|woman|dog|out|over|your|my|the\s+movie|him|her|them|it|this|that|me|you|carefully|closely|for|as|while|what))/gi;
const watchMatches = [];
let match;
while ((match = watchPattern.exec(content)) !== null) {
  // Get surrounding context
  const start = Math.max(0, match.index - 30);
  const end = Math.min(content.length, match.index + match[0].length + 30);
  const context = content.slice(start, end).replace(/\n/g, ' ');
  watchMatches.push({ match: match[0], context });
}

console.log(`Total "watch" matches: ${watchMatches.length}`);
console.log('\nFirst 10 matches with context:');
watchMatches.slice(0, 10).forEach((m, i) => {
  console.log(`  ${i + 1}. "...${m.context}..."`);
});

console.log('\n' + '='.repeat(60));
console.log('Test complete!');
