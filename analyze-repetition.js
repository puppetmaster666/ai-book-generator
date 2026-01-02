const fs = require('fs');

const text = fs.readFileSync('C:\\Users\\jonat\\draftmybook\\public\\sample books\\Down_Round.txt', 'utf8');

// Split into sentences
const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

// Count sentence starters
const starts = {};
sentences.forEach(s => {
  const first = s.trim().split(/\s+/)[0];
  if (first) {
    starts[first] = (starts[first] || 0) + 1;
  }
});

// Sort by frequency
const sorted = Object.entries(starts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25);

console.log('\n=== TOP 25 SENTENCE STARTERS ===');
console.log('Total sentences:', sentences.length);
console.log('');
sorted.forEach(([word, count]) => {
  const pct = ((count / sentences.length) * 100).toFixed(1);
  console.log(`${count.toString().padStart(4)} (${pct.padStart(5)}%) - "${word}"`);
});

// Check for repetitive phrases
const lines = text.split('\n').filter(l => l.trim().length > 20);
console.log('\n\n=== CHECKING FOR REPETITIVE PHRASES ===');

// Common repetitive 2-word starts
const twoWordStarts = {};
sentences.forEach(s => {
  const words = s.trim().split(/\s+/);
  if (words.length >= 2) {
    const twoWord = `${words[0]} ${words[1]}`;
    twoWordStarts[twoWord] = (twoWordStarts[twoWord] || 0) + 1;
  }
});

const sortedTwo = Object.entries(twoWordStarts)
  .filter(([phrase, count]) => count > 10)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

console.log('\nTop repetitive 2-word sentence starts:');
sortedTwo.forEach(([phrase, count]) => {
  console.log(`${count.toString().padStart(4)} - "${phrase}"`);
});
