import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

let apiKey = process.env.GEMINI_API_KEY;

// Helper to read env file
function loadEnv(filename) {
  const envPath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    const lines = envConfig.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (key === 'GEMINI_API_KEY') {
          let cleanVal = val;
          if ((cleanVal.startsWith('"') && cleanVal.endsWith('"')) || (cleanVal.startsWith("'" ) && cleanVal.endsWith("'" ))) {
            cleanVal = cleanVal.slice(1, -1);
          }
          return cleanVal;
        }
      }
    }
  }
  return null;
}

if (!apiKey) apiKey = loadEnv('.env.local');
if (!apiKey) apiKey = loadEnv('.env');

if (!apiKey) {
  console.error('Error: GEMINI_API_KEY not found');
  process.exit(1);
}

console.log(`Using API Key: ${apiKey.substring(0, 5)}...`);

async function testGeminiConfig() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 65536,
      }
    });

    console.log('Testing generation with full config...');
    const result = await model.generateContent('Say "Hello World" if you can hear me.');
    const response = await result.response;
    const text = response.text();
    console.log('Success! Response:', text);
  } catch (error) {
    console.error('Gemini API Error details:');
    console.error(error.toString());
    if (error.message) console.error('Message:', error.message);
  }
}

testGeminiConfig();
