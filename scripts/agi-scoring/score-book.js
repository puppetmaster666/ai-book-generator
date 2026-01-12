#!/usr/bin/env node
/**
 * Book AI Detection & Scoring System
 *
 * Scans books for AI-generated patterns and scores them.
 * Can also clean/fix detected issues.
 *
 * Usage:
 *   node scripts/agi-scoring/score-book.js <file.txt> [--clean] [--verbose]
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// AI DETECTION PATTERNS
// ============================================================================

const AI_OPENER_CLICHES = [
  { pattern: /(?:^|\. )With a sigh,/gim, name: 'With a sigh,' },
  { pattern: /(?:^|\. )After a moment,/gim, name: 'After a moment,' },
  { pattern: /(?:^|\. )Without hesitation,/gim, name: 'Without hesitation,' },
  { pattern: /(?:^|\. )Slowly,/gim, name: 'Slowly,' },
  { pattern: /(?:^|\. )Quietly,/gim, name: 'Quietly,' },
  { pattern: /(?:^|\. )Finally,/gim, name: 'Finally,' },
  { pattern: /(?:^|\. )At last,/gim, name: 'At last,' },
  { pattern: /(?:^|\. )Suddenly,/gim, name: 'Suddenly,' },
  { pattern: /(?:^|\. )Carefully,/gim, name: 'Carefully,' },
  { pattern: /(?:^|\. )Gently,/gim, name: 'Gently,' },
];

const AI_NARRATIVE_CLICHES = [
  { pattern: /little did .{1,30} know/gi, name: 'little did X know' },
  { pattern: /couldn't help but/gi, name: "couldn't help but" },
  { pattern: /before .{1,20} knew it/gi, name: 'before X knew it' },
  { pattern: /as if on cue/gi, name: 'as if on cue' },
  { pattern: /in that moment/gi, name: 'in that moment' },
  { pattern: /time seemed to/gi, name: 'time seemed to' },
  { pattern: /it was then that/gi, name: 'it was then that' },
  { pattern: /something inside .{1,20} shifted/gi, name: 'something inside X shifted' },
];

const AI_ACADEMIC_TRANSITIONS = [
  { pattern: /\bmoreover\b/gi, name: 'moreover' },
  { pattern: /\bfurthermore\b/gi, name: 'furthermore' },
  { pattern: /\badditionally\b/gi, name: 'additionally' },
  { pattern: /\bsubsequently\b/gi, name: 'subsequently' },
  { pattern: /it's worth noting/gi, name: "it's worth noting" },
  { pattern: /\binterestingly\b/gi, name: 'interestingly' },
  { pattern: /needless to say/gi, name: 'needless to say' },
  { pattern: /it goes without saying/gi, name: 'it goes without saying' },
  { pattern: /\bin conclusion\b/gi, name: 'in conclusion' },
  { pattern: /as mentioned earlier/gi, name: 'as mentioned earlier' },
];

const AI_PHYSICAL_REACTIONS = [
  { pattern: /shivers ran down/gi, name: 'shivers ran down' },
  { pattern: /blood ran cold/gi, name: 'blood ran cold' },
  { pattern: /heart skipped a beat/gi, name: 'heart skipped a beat' },
  { pattern: /breath caught in/gi, name: 'breath caught in' },
  { pattern: /stomach dropped/gi, name: 'stomach dropped' },
  { pattern: /world seemed to stop/gi, name: 'world seemed to stop' },
  { pattern: /knees went weak/gi, name: 'knees went weak' },
  { pattern: /pulse quickened/gi, name: 'pulse quickened' },
];

const AI_OVERWROUGHT_DESCRIPTIONS = [
  { pattern: /a kaleidoscope of/gi, name: 'a kaleidoscope of' },
  { pattern: /a symphony of/gi, name: 'a symphony of' },
  { pattern: /a tapestry of/gi, name: 'a tapestry of' },
  { pattern: /a whirlwind of/gi, name: 'a whirlwind of' },
  { pattern: /a cascade of/gi, name: 'a cascade of' },
  { pattern: /a myriad of/gi, name: 'a myriad of' },
  { pattern: /a mosaic of/gi, name: 'a mosaic of' },
  { pattern: /a plethora of/gi, name: 'a plethora of' },
];

const AI_DIALOGUE_PATTERNS = [
  { pattern: /I need you to understand/gi, name: 'I need you to understand' },
  { pattern: /Here's the thing/gi, name: "Here's the thing" },
  { pattern: /Let me be clear/gi, name: 'Let me be clear' },
  { pattern: /With all due respect/gi, name: 'With all due respect' },
  { pattern: /To be honest with you/gi, name: 'To be honest with you' },
  { pattern: /At the end of the day/gi, name: 'At the end of the day' },
  { pattern: /The thing is/gi, name: 'The thing is' },
  { pattern: /Look, I get it/gi, name: 'Look, I get it' },
];

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

function countMatches(text, patterns) {
  const results = [];
  for (const { pattern, name } of patterns) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern) || [];
    if (matches.length > 0) {
      results.push({ name, count: matches.length });
    }
  }
  return results;
}

function scoreBook(text, verbose = false) {
  const wordCount = text.split(/\s+/).length;
  const results = {
    wordCount,
    categories: {},
    totalIssues: 0,
    score: 100,
    rating: 'A+',
  };

  // Score each category
  const categories = [
    { name: 'AI Opener Clichés', patterns: AI_OPENER_CLICHES, weight: 3 },
    { name: 'Narrative Clichés', patterns: AI_NARRATIVE_CLICHES, weight: 2 },
    { name: 'Academic Transitions', patterns: AI_ACADEMIC_TRANSITIONS, weight: 1.5 },
    { name: 'Physical Reactions', patterns: AI_PHYSICAL_REACTIONS, weight: 1 },
    { name: 'Overwrought Descriptions', patterns: AI_OVERWROUGHT_DESCRIPTIONS, weight: 2 },
    { name: 'Dialogue Patterns', patterns: AI_DIALOGUE_PATTERNS, weight: 1 },
  ];

  for (const { name, patterns, weight } of categories) {
    const matches = countMatches(text, patterns);
    const totalCount = matches.reduce((sum, m) => sum + m.count, 0);
    const per1000Words = (totalCount / wordCount) * 1000;

    results.categories[name] = {
      matches,
      totalCount,
      per1000Words: per1000Words.toFixed(2),
      weight,
    };

    results.totalIssues += totalCount;
    // Deduct points based on frequency per 1000 words
    results.score -= per1000Words * weight;
  }

  // Clamp score
  results.score = Math.max(0, Math.min(100, results.score));
  results.score = Math.round(results.score * 10) / 10;

  // Calculate rating
  if (results.score >= 95) results.rating = 'A+';
  else if (results.score >= 90) results.rating = 'A';
  else if (results.score >= 85) results.rating = 'A-';
  else if (results.score >= 80) results.rating = 'B+';
  else if (results.score >= 75) results.rating = 'B';
  else if (results.score >= 70) results.rating = 'B-';
  else if (results.score >= 65) results.rating = 'C+';
  else if (results.score >= 60) results.rating = 'C';
  else if (results.score >= 55) results.rating = 'C-';
  else if (results.score >= 50) results.rating = 'D';
  else results.rating = 'F';

  return results;
}

// ============================================================================
// CLEANING FUNCTIONS
// ============================================================================

function cleanAIOpeners(text) {
  let cleaned = text;
  let changes = 0;

  // Remove AI opener clichés by just removing the opener and capitalizing
  const openerRemovals = [
    /(?:^|\. )With a sigh, ([a-z])/gim,
    /(?:^|\. )After a moment, ([a-z])/gim,
    /(?:^|\. )Without hesitation, ([a-z])/gim,
    /(?:^|\. )Slowly, ([a-z])/gim,
    /(?:^|\. )Quietly, ([a-z])/gim,
    /(?:^|\. )Finally, ([a-z])/gim,
    /(?:^|\. )At last, ([a-z])/gim,
    /(?:^|\. )Suddenly, ([a-z])/gim,
    /(?:^|\. )Carefully, ([a-z])/gim,
    /(?:^|\. )Gently, ([a-z])/gim,
  ];

  for (const pattern of openerRemovals) {
    cleaned = cleaned.replace(pattern, (match, letter, offset) => {
      changes++;
      // Check if it starts after a period
      if (match.startsWith('. ')) {
        return '. ' + letter.toUpperCase();
      }
      return letter.toUpperCase();
    });
  }

  return { cleaned, changes };
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Book AI Detection & Scoring System

Usage:
  node score-book.js <file.txt> [options]

Options:
  --clean     Output cleaned version of the text
  --verbose   Show detailed match information
  --help      Show this help message

Example:
  node score-book.js "my-book.txt" --verbose
  node score-book.js "my-book.txt" --clean > cleaned.txt
`);
    process.exit(0);
  }

  const filePath = args.find(a => !a.startsWith('--'));
  const verbose = args.includes('--verbose');
  const clean = args.includes('--clean');

  if (!filePath) {
    console.error('Error: No file path provided');
    process.exit(1);
  }

  // Resolve path
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const text = fs.readFileSync(resolvedPath, 'utf-8');

  if (clean) {
    // Clean mode - output cleaned text
    const { cleaned, changes } = cleanAIOpeners(text);
    console.error(`[Cleaned ${changes} AI opener clichés]`);
    console.log(cleaned);
    return;
  }

  // Score mode
  const results = scoreBook(text, verbose);

  console.log('\n' + '='.repeat(60));
  console.log('BOOK AI DETECTION REPORT');
  console.log('='.repeat(60));
  console.log(`\nFile: ${path.basename(filePath)}`);
  console.log(`Word Count: ${results.wordCount.toLocaleString()}`);
  console.log(`\n${'─'.repeat(60)}`);

  console.log('\nAI PATTERN DETECTION:\n');

  for (const [catName, catData] of Object.entries(results.categories)) {
    if (catData.totalCount > 0) {
      console.log(`  ${catName}: ${catData.totalCount} found (${catData.per1000Words}/1000 words)`);
      if (verbose) {
        for (const match of catData.matches) {
          console.log(`    - "${match.name}": ${match.count}x`);
        }
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`\nTOTAL AI TELLS: ${results.totalIssues}`);
  console.log(`\nSCORE: ${results.score}/100`);
  console.log(`RATING: ${results.rating}`);

  if (results.score < 70) {
    console.log('\n⚠️  WARNING: High AI detection. This text would likely fail AI detectors.');
  } else if (results.score < 85) {
    console.log('\n⚡ CAUTION: Moderate AI patterns detected. Consider revision.');
  } else {
    console.log('\n✅ GOOD: Low AI patterns. Text appears human-written.');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

main();
