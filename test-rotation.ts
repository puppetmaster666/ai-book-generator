
import { rotateApiKey, switchToPrimaryKey } from './lib/gemini';

// Mock process.env needed for the test
process.env.GEMINI_API_KEY = 'key1';
process.env.GEMINI_API_KEY_BACKUP1 = 'key2';
process.env.GEMINI_API_BACKUP2 = 'key3';

console.log('Starting Rotation Test...');
console.log('Current keys configured:',
    process.env.GEMINI_API_KEY ? 'Primary' : 'Missing',
    process.env.GEMINI_API_KEY_BACKUP1 ? 'Backup1' : 'Missing',
    process.env.GEMINI_API_BACKUP2 ? 'Backup2' : 'Missing'
);

// We need to inspect the internal state if possible, or infer from log output.
// Since variables are not exported, we can just call rotateApiKey and see if it returns true.

console.log('1. Attempting 1st Rotation (0 -> 1)...');
let success = rotateApiKey();
console.log(`Rotated: ${success}`);

console.log('2. Attempting 2nd Rotation (1 -> 2)...');
success = rotateApiKey();
console.log(`Rotated: ${success}`);

console.log('3. Attempting 3rd Rotation (2 -> 0)...');
success = rotateApiKey();
console.log(`Rotated: ${success}`);

console.log('4. Attempting 4th Rotation (0 -> 1 again)...');
success = rotateApiKey();
console.log(`Rotated: ${success}`);

console.log('Test Complete.');
