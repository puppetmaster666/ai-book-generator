#!/usr/bin/env node

/**
 * Batch AGI Scoring Script
 *
 * Scores multiple screenplay files and outputs a comparison table.
 * Useful for A/B testing different generation parameters.
 *
 * Usage: node batch-score.js <dir-or-files...> [--csv] [--update-leaderboard]
 */

const fs = require('fs');
const path = require('path');
const { scoreScreenplay } = require('./score-screenplay');

function getFiles(args) {
  const files = [];

  for (const arg of args) {
    if (arg.startsWith('--')) continue;

    const fullPath = path.resolve(arg);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Get all .txt and .fountain files in directory
      const dirFiles = fs.readdirSync(fullPath)
        .filter(f => f.endsWith('.txt') || f.endsWith('.fountain'))
        .map(f => path.join(fullPath, f));
      files.push(...dirFiles);
    } else if (stat.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function formatTable(results) {
  const header = '| File | Composite | Rating | Struct | Prose | Char | Behav | AI-FP | Unique | Words |';
  const separator = '|------|-----------|--------|--------|-------|------|-------|-------|--------|-------|';

  const rows = results.map(r => {
    const name = path.basename(r.file).substring(0, 20);
    return `| ${name} | ${r.score.composite} | ${r.score.rating} | ${r.score.categories.structural.score} | ${r.score.categories.prose.score} | ${r.score.categories.character.score} | ${r.score.categories.behavioral.score} | ${r.score.categories.aiFingerprint.score} | ${r.score.categories.uniqueness.score} | ${r.score.wordCount} |`;
  });

  return [header, separator, ...rows].join('\n');
}

function formatCSV(results) {
  const header = 'File,Composite,Rating,Structural,Prose,Character,Behavioral,AI_Fingerprint,Uniqueness,Words';

  const rows = results.map(r => {
    const name = path.basename(r.file);
    return `"${name}",${r.score.composite},${r.score.rating},${r.score.categories.structural.score},${r.score.categories.prose.score},${r.score.categories.character.score},${r.score.categories.behavioral.score},${r.score.categories.aiFingerprint.score},${r.score.categories.uniqueness.score},${r.score.wordCount}`;
  });

  return [header, ...rows].join('\n');
}

function updateLeaderboard(results, leaderboardPath) {
  const today = new Date().toISOString().split('T')[0];

  // Find best result
  const best = results.reduce((a, b) => a.score.composite > b.score.composite ? a : b);

  // Read existing leaderboard
  let content = fs.readFileSync(leaderboardPath, 'utf-8');

  // Add new entries to "All Entries" section
  const entriesMarker = '| Date | Version | Script Name | Composite | Struct | Prose | Char | Behav | AI-FP | Unique | Key Notes |';
  const newEntries = results.map(r => {
    const name = path.basename(r.file).replace('.txt', '').replace('.fountain', '');
    const s = r.score;
    return `| ${today} | v2.0 | ${name} | ${s.composite} | ${s.categories.structural.score} | ${s.categories.prose.score} | ${s.categories.character.score} | ${s.categories.behavioral.score} | ${s.categories.aiFingerprint.score} | ${s.categories.uniqueness.score} | Batch test |`;
  });

  // Find where to insert
  const lines = content.split('\n');
  const headerIdx = lines.findIndex(l => l.includes('| Date | Version | Script Name |'));

  if (headerIdx !== -1) {
    // Insert after the separator line (2 lines after header)
    lines.splice(headerIdx + 2, 0, ...newEntries);
    content = lines.join('\n');
    fs.writeFileSync(leaderboardPath, content);
    console.log(`\nUpdated leaderboard with ${results.length} entries.`);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  console.log('Usage: node batch-score.js <dir-or-files...> [--csv] [--update-leaderboard]');
  console.log('');
  console.log('Options:');
  console.log('  --csv               Output as CSV format');
  console.log('  --update-leaderboard  Add results to LEADERBOARD.md');
  process.exit(0);
}

const csvOutput = args.includes('--csv');
const updateLB = args.includes('--update-leaderboard');
const files = getFiles(args);

if (files.length === 0) {
  console.error('No screenplay files found.');
  process.exit(1);
}

console.log(`Scoring ${files.length} files...\n`);

const results = [];
for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const score = scoreScreenplay(content, false);
    results.push({ file, score });
    console.log(`  ✓ ${path.basename(file)}: ${score.composite}/10 (${score.rating})`);
  } catch (err) {
    console.error(`  ✗ ${path.basename(file)}: ${err.message}`);
  }
}

console.log('\n' + '='.repeat(60));

if (csvOutput) {
  console.log(formatCSV(results));
} else {
  console.log(formatTable(results));
}

// Statistics
if (results.length > 1) {
  const scores = results.map(r => r.score.composite);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const max = Math.max(...scores);
  const min = Math.min(...scores);

  console.log('\n' + '-'.repeat(60));
  console.log(`  Statistics: Avg=${avg.toFixed(2)} | Max=${max} | Min=${min} | Count=${results.length}`);
}

// Update leaderboard if requested
if (updateLB) {
  const leaderboardPath = path.join(__dirname, 'LEADERBOARD.md');
  if (fs.existsSync(leaderboardPath)) {
    updateLeaderboard(results, leaderboardPath);
  } else {
    console.error('\nLeaderboard not found at:', leaderboardPath);
  }
}
