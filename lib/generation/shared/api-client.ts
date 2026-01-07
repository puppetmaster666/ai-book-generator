import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { SAFETY_SETTINGS } from './safety';

// Safety timeout: 240s per key (4 minutes) - prevents Vercel 300s hard kill
// Vercel kills function at 300s, so we timeout at 240s to rotate keys before death
const SAFETY_TIMEOUT_MS = 240000; // 4 minutes

// API timeout constants (DEPRECATED - kept for backwards compatibility)
// These are no longer used as actual timeouts - Gemini handles its own timing
// The values are passed to withTimeout() but ignored (natural Gemini timing is used)
export const CHAPTER_GENERATION_TIMEOUT = 90000; // DEPRECATED: kept for function signature compatibility
export const REVIEW_PASS_TIMEOUT = 45000; // DEPRECATED: kept for function signature compatibility
export const FAST_TASK_TIMEOUT = 30000; // DEPRECATED: kept for function signature compatibility

// Lazy initialization to avoid errors during build
// Support multiple API keys for rate limit failover
let _genAIInstances: (GoogleGenerativeAI | null)[] = [null, null, null];
let _geminiPro: GenerativeModel | null = null;
let _geminiFlash: GenerativeModel | null = null;
let _geminiFlashLight: GenerativeModel | null = null; // Lightweight version for quick tasks
let _geminiImage: GenerativeModel | null = null;

let _currentKeyIndex = 0; // Start with primary key (GEMINI_API_KEY)
// Track which key last succeeded - this persists across requests in the same serverless instance
let _lastWorkingKeyIndex = 0; // Start with primary key by default

// Environment variable names for keys in order of preference
const API_KEY_ENV_NAMES = [
  'GEMINI_API_KEY',
  'GEMINI_API_BACKUP1',
  'GEMINI_API_BACKUP2',
  'GEMINI_API_BACKUP3'
];

// Review pass key management - uses a different key from current generation key
// This prevents reviews from competing with chapter generation for rate limits
let _reviewKeyIndex: number | null = null;
let _reviewGenAI: GoogleGenerativeAI | null = null;
let _reviewFlash: GenerativeModel | null = null;

// Get a key index different from the current generation key
function getReviewKeyIndex(): number {
  const currentGenKey = _currentKeyIndex;

  // Find a different available key
  for (let i = 0; i < API_KEY_ENV_NAMES.length; i++) {
    const candidateIndex = (currentGenKey + 1 + i) % API_KEY_ENV_NAMES.length;
    if (candidateIndex !== currentGenKey && process.env[API_KEY_ENV_NAMES[candidateIndex]]) {
      return candidateIndex;
    }
  }

  // Fallback to current key if no other available
  return currentGenKey;
}

// Get or create the review GenAI instance
function getReviewGenAI(): GoogleGenerativeAI {
  const desiredKeyIndex = getReviewKeyIndex();

  // Reset if key changed
  if (_reviewKeyIndex !== desiredKeyIndex) {
    _reviewGenAI = null;
    _reviewFlash = null;
    _reviewKeyIndex = desiredKeyIndex;
  }

  if (!_reviewGenAI) {
    const envName = API_KEY_ENV_NAMES[desiredKeyIndex];
    const apiKey = process.env[envName];

    if (!apiKey) {
      throw new Error('No API key available for reviews');
    }

    _reviewGenAI = new GoogleGenerativeAI(apiKey);
    console.log(`[Gemini] Review using key index ${desiredKeyIndex} (${envName}) - different from generation key ${_currentKeyIndex}`);
  }
  return _reviewGenAI;
}

// Flash model for reviews - uses different API key than generation
export function getGeminiFlashForReview(): GenerativeModel {
  // Always refresh to ensure we're using a different key than current generation
  const desiredKeyIndex = getReviewKeyIndex();
  if (_reviewKeyIndex !== desiredKeyIndex || !_reviewFlash) {
    _reviewKeyIndex = desiredKeyIndex;
    _reviewGenAI = null;
    _reviewFlash = getReviewGenAI().getGenerativeModel({
      model: 'gemini-3.0-pro-preview',
      safetySettings: SAFETY_SETTINGS,
    });
  }
  return _reviewFlash;
}

// Mark the current key as working - call this after a successful API call
export function markKeyAsWorking(): void {
  _lastWorkingKeyIndex = _currentKeyIndex;
  console.log(`[Gemini] Marked key ${_currentKeyIndex} as last working key`);
}

// Get the index of the last working key
export function getLastWorkingKeyIndex(): number {
  return _lastWorkingKeyIndex;
}

// Get the current key index
export function getCurrentKeyIndex(): number {
  return _currentKeyIndex;
}

// Switch to the last known working key (if different from current)
// Returns true if switched, false if already on that key or key unavailable
export function switchToLastWorkingKey(): boolean {
  // Always trust the last working key - no time limit
  // Once a key works, stick with it until it fails

  if (_currentKeyIndex === _lastWorkingKeyIndex) {
    return false;
  }

  const envName = API_KEY_ENV_NAMES[_lastWorkingKeyIndex];
  if (process.env[envName]) {
    console.log(`[Gemini] Switching to last working key: index ${_lastWorkingKeyIndex} (${envName})`);
    _currentKeyIndex = _lastWorkingKeyIndex;
    resetModelInstances();
    return true;
  }

  return false;
}

// Reset model instances when switching API keys
function resetModelInstances() {
  _geminiPro = null;
  _geminiFlash = null;
  _geminiFlashLight = null;
  _geminiImage = null;
}

// Rotate to the next available API key
// Returns true if successfully rotated to a new valid key
export function rotateApiKey(): boolean {
  const start = _currentKeyIndex;

  // Try finding next available key
  // We loop at most once through all keys to find a valid next one
  for (let i = 1; i < API_KEY_ENV_NAMES.length; i++) {
    const nextIndex = (start + i) % API_KEY_ENV_NAMES.length;
    const envName = API_KEY_ENV_NAMES[nextIndex];
    if (process.env[envName]) {
      console.log(`[Gemini] Rotating API Key: Switching from index ${start} to ${nextIndex} (${envName})`);
      _currentKeyIndex = nextIndex;
      resetModelInstances();
      return true;
    }
  }

  console.warn('[Gemini] Attempted to rotate API key but no other keys found. Staying on current key.');
  return false;
}

// Alias for compatibility if imported elsewhere
export function switchToBackupKey() {
  return rotateApiKey();
}

// Switch back to primary key (can be called periodically to retry primary)
export function switchToPrimaryKey() {
  if (_currentKeyIndex !== 0 && process.env.GEMINI_API_KEY) {
    console.log('[Gemini] Resetting to primary API key');
    _currentKeyIndex = 0;
    resetModelInstances();
  }
}

function getGenAI(): GoogleGenerativeAI {
  // Ensure we have a valid index
  if (_currentKeyIndex >= API_KEY_ENV_NAMES.length) {
    _currentKeyIndex = 0;
  }

  // Get current instance or create it
  if (!_genAIInstances[_currentKeyIndex]) {
    const envName = API_KEY_ENV_NAMES[_currentKeyIndex];
    const apiKey = process.env[envName];

    if (!apiKey) {
      // If current selected key is missing, try to rotate immediately
      if (rotateApiKey()) {
        // Recurse with new key
        return getGenAI();
      }
      throw new Error(`GEMINI_API_KEY environment variable is not set (checked ${envName} and others)`);
    }

    _genAIInstances[_currentKeyIndex] = new GoogleGenerativeAI(apiKey);
  }

  return _genAIInstances[_currentKeyIndex]!;
}

// Gemini 3 Pro for main generation (better reasoning and creativity for screenplays)
export function getGeminiPro(): GenerativeModel {
  if (!_geminiPro) {
    _geminiPro = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-preview',
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 65536,
      },
    });
  }
  return _geminiPro;
}

// Gemini 3 Flash for fast tasks (outlines, ideas, summaries)
export function getGeminiFlash(): GenerativeModel {
  if (!_geminiFlash) {
    _geminiFlash = getGenAI().getGenerativeModel({
      model: 'gemini-3-flash-preview',
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 65536,
      },
    });
  }
  return _geminiFlash;
}

// Lightweight Gemini 3 Flash for very quick tasks (idea generation)
export function getGeminiFlashLight(): GenerativeModel {
  if (!_geminiFlashLight) {
    _geminiFlashLight = getGenAI().getGenerativeModel({
      model: 'gemini-3-flash-preview',
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 512, // Enough for detailed 3-4 sentence ideas
      },
    });
  }
  return _geminiFlashLight;
}

// Gemini 3 Pro Image for cover generation
export function getGeminiImage(): GenerativeModel {
  if (!_geminiImage) {
    _geminiImage = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      safetySettings: SAFETY_SETTINGS,
    });
  }
  return _geminiImage;
}

// Streaming content generator - yields text chunks as they arrive
// Returns an async generator that yields partial text and finally the full text
export async function* streamContent(
  prompt: string,
  onChunk?: (chunk: string, accumulated: string) => void
): AsyncGenerator<{ chunk: string; accumulated: string; done: boolean }, string, unknown> {
  const model = getGeminiPro();
  let accumulated = '';

  try {
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        accumulated += chunkText;
        if (onChunk) {
          onChunk(chunkText, accumulated);
        }
        yield { chunk: chunkText, accumulated, done: false };
      }
    }

    // Mark key as working after successful stream
    markKeyAsWorking();

    yield { chunk: '', accumulated, done: true };
    return accumulated;
  } catch (error) {
    const errorMsg = (error as Error).message || '';
    const isRateLimit = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate');

    if (isRateLimit) {
      // Try rotating key and retrying once
      const rotated = rotateApiKey();
      if (rotated) {
        console.log('[Gemini Stream] Rate limit hit, retrying with rotated key...');
        // Recursively retry with new key
        yield* streamContent(prompt, onChunk);
        return accumulated;
      }
    }

    throw error;
  }
}

// Quick health check timeout - 5 seconds max for a simple test
const HEALTH_CHECK_TIMEOUT_MS = 5000;

// Test if an API key is working with a quick, cheap request
// Returns true if working, false if rate-limited or broken
async function testApiKeyHealth(): Promise<boolean> {
  try {
    const model = getGeminiFlashLight();
    const result = await Promise.race([
      model.generateContent('Say "ok"'),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('HEALTH_CHECK_TIMEOUT')), HEALTH_CHECK_TIMEOUT_MS)
      )
    ]);
    // Check if we got a response
    const text = result.response?.text?.();
    return !!text; // Any response means the key is working
  } catch (error) {
    const errorMsg = (error as Error).message || '';
    console.log(`[Gemini] Health check failed for key ${getCurrentKeyIndex()}: ${errorMsg.substring(0, 100)}`);
    return false;
  }
}

// Find a working API key by testing each one quickly
// Returns true if a working key was found, false if all keys failed
async function findWorkingKey(): Promise<boolean> {
  const totalKeys = API_KEY_ENV_NAMES.filter(name => process.env[name]).length;
  const startKey = getCurrentKeyIndex();

  console.log(`[Gemini] Quick health check starting with key ${startKey}...`);

  for (let i = 0; i < totalKeys; i++) {
    const isHealthy = await testApiKeyHealth();
    if (isHealthy) {
      console.log(`[Gemini] Key ${getCurrentKeyIndex()} passed health check`);
      return true;
    }

    // Key failed, try next one
    const rotated = rotateApiKey();
    if (!rotated) break;
  }

  console.warn(`[Gemini] All keys failed health check, proceeding with key ${getCurrentKeyIndex()} anyway`);
  return false;
}

// Key rotation wrapper - tries all 4 keys before giving up
// Each key attempt has a 240s safety timeout to prevent Vercel from killing the function
// Takes a function that creates the promise so we can retry with different key
export async function withTimeout<T>(
  createPromise: () => Promise<T>,
  _timeoutMs: number, // DEPRECATED: kept for backwards compatibility, not used
  operationName: string = 'operation'
): Promise<T> {
  const totalKeys = 4;
  let lastError: Error | null = null;
  const failedKeys: { key: number; reason: string }[] = [];
  const overallStart = Date.now();

  // Start with last working key if available
  switchToLastWorkingKey();

  // Quick health check: find a working key BEFORE starting the expensive operation
  // This detects rate-limited keys in ~2s instead of waiting 4min for timeout
  await findWorkingKey();

  console.log(`[Gemini] Starting ${operationName} with key ${getCurrentKeyIndex()} (${SAFETY_TIMEOUT_MS / 1000}s safety timeout per key)`);

  // Try all keys before giving up
  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const currentKey = getCurrentKeyIndex();
    const attemptStart = Date.now();

    try {
      // Wrap Gemini call with safety timeout to prevent Vercel from killing us
      const result = await Promise.race([
        createPromise(),
        new Promise<T>((_, reject) =>
          setTimeout(() => {
            reject(new Error(`SAFETY_TIMEOUT: Operation exceeded ${SAFETY_TIMEOUT_MS / 1000}s limit (Gemini may be hanging)`));
          }, SAFETY_TIMEOUT_MS)
        )
      ]);
      const elapsed = Date.now() - attemptStart;

      // SUCCESS! Mark this key as working for future requests
      markKeyAsWorking();
      console.log(`[Gemini] SUCCESS: ${operationName} completed with key ${currentKey} in ${elapsed}ms`);
      return result;
    } catch (error) {
      lastError = error as Error;
      const elapsed = Date.now() - attemptStart;
      const errorMsg = lastError.message || 'Unknown error';
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate') || errorMsg.includes('exhausted');
      const isSafetyTimeout = errorMsg.includes('SAFETY_TIMEOUT');
      const isGeminiTimeout = errorMsg.toLowerCase().includes('timeout') || errorMsg.toLowerCase().includes('deadline');
      const isTimeout = isSafetyTimeout || isGeminiTimeout;

      const failReason = isSafetyTimeout ? 'SAFETY_TIMEOUT' : isGeminiTimeout ? 'GEMINI_TIMEOUT' : isRateLimit ? 'RATE_LIMIT' : 'ERROR';
      failedKeys.push({ key: currentKey, reason: failReason });
      console.error(`[Gemini] FAILED: ${operationName} on key ${currentKey} after ${elapsed}ms - ${failReason}: ${errorMsg.substring(0, 150)}`);

      // If timeout or rate limit, IMMEDIATELY try next key (no delay)
      if (isTimeout || isRateLimit) {
        const rotated = rotateApiKey();
        if (rotated && attempt < totalKeys - 1) {
          console.log(`[Gemini] Rotating to key ${getCurrentKeyIndex()} (attempt ${attempt + 2}/${totalKeys})`);
          continue; // Retry immediately with new key
        }
      }

      // Non-recoverable error or all keys exhausted
      const totalElapsed = Date.now() - overallStart;
      const keysSummary = failedKeys.map(k => `key${k.key}:${k.reason}`).join(', ');
      console.error(`[Gemini] ALL KEYS EXHAUSTED for ${operationName} after ${totalElapsed}ms. Summary: [${keysSummary}]`);

      // User-friendly error message
      const userMessage = failedKeys.every(k => k.reason.includes('RATE_LIMIT'))
        ? 'AI service rate limit reached. Please wait a few minutes and retry.'
        : failedKeys.every(k => k.reason.includes('TIMEOUT'))
          ? 'AI service timed out. This can happen with complex requests. Please retry.'
          : `AI service temporarily unavailable. Please retry in a few minutes.`;

      // Technical details for logging
      console.error(`Technical details: ${errorMsg.substring(0, 200)}`);

      throw new Error(userMessage);
    }
  }

  const totalElapsed = Date.now() - overallStart;
  const keysSummary = failedKeys.map(k => `key${k.key}:${k.reason}`).join(', ');
  console.error(`[Gemini] ALL KEYS EXHAUSTED for ${operationName} after ${totalElapsed}ms. Summary: [${keysSummary}]`);

  // User-friendly error message
  const userMessage = 'AI service temporarily unavailable. Please retry in a few minutes.';
  throw lastError || new Error(userMessage);
}

// Retry utility with FAST key switching - tries all 4 keys immediately, then waits
// Only adds delay AFTER cycling through all keys
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxCycles: number = 2,
  baseDelayMs: number = 5000
): Promise<T> {
  let lastError: Error | null = null;
  const totalKeys = 4;
  let keysTriedThisCycle = 0;
  let currentCycle = 0;

  // Start with last working key if available
  switchToLastWorkingKey();

  for (let attempt = 0; attempt < (totalKeys * maxCycles) + 1; attempt++) {
    try {
      const result = await fn();
      // SUCCESS! Mark this key as working
      markKeyAsWorking();
      return result;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message?.toLowerCase() || '';

      // Check if it's a rate limit or quota error
      const isRateLimitError =
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('429') ||
        errorMessage.includes('resource exhausted') ||
        errorMessage.includes('too many requests');

      if (!isRateLimitError) {
        throw lastError;
      }

      // Rate limit - IMMEDIATELY try next key (no delay)
      keysTriedThisCycle++;
      console.log(`[Gemini] Rate limit on key ${getCurrentKeyIndex()}, trying next key (${keysTriedThisCycle}/${totalKeys} this cycle)...`);

      const rotated = rotateApiKey();
      if (rotated && keysTriedThisCycle < totalKeys) {
        continue; // Retry immediately with new key
      }

      // All keys exhausted in this cycle - add delay before next cycle
      currentCycle++;
      if (currentCycle >= maxCycles) {
        throw lastError;
      }

      keysTriedThisCycle = 0;
      const delay = baseDelayMs * currentCycle; // 5s after first cycle, 10s after second
      console.log(`[Gemini] All keys exhausted, waiting ${delay / 1000}s before cycle ${currentCycle + 1}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('withRetry exhausted all attempts');
}
