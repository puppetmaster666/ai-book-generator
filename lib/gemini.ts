import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { generateIllustrationWithRetry } from './illustration-utils';

// Permissive safety settings to avoid false positives for creative writing
// We handle content moderation at the application level if needed
export const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// Content sanitization for safety filter retries
// When Gemini blocks content, we sanitize and retry with toned-down version
export function sanitizeContentForSafety(content: string): string {
  // Map of explicit terms to euphemisms - preserves story while reducing explicitness
  const replacements: [RegExp, string][] = [
    // Sexual/explicit terms -> euphemistic alternatives
    [/\bbuttplug\b/gi, 'intimate accessory'],
    [/\bbutt plug\b/gi, 'intimate accessory'],
    [/\banal plug\b/gi, 'personal accessory'],
    [/\bsex toy\b/gi, 'intimate item'],
    [/\bsextoy\b/gi, 'intimate item'],
    [/\bdildo\b/gi, 'personal toy'],
    [/\bvibrator\b/gi, 'personal massager'],
    [/\bfemboy\b/gi, 'androgynous person'],
    [/\bnaked\b/gi, 'undressed'],
    [/\bnude\b/gi, 'unclothed'],
    [/\borgasm\b/gi, 'climax'],
    [/\bcum\b/gi, 'release'],
    [/\bcumming\b/gi, 'releasing'],
    [/\berection\b/gi, 'arousal'],
    [/\berect\b/gi, 'aroused'],
    [/\bpenis\b/gi, 'intimate area'],
    [/\bcock\b/gi, 'member'],
    [/\bdick\b/gi, 'member'],
    [/\bvagina\b/gi, 'intimate area'],
    [/\bpussy\b/gi, 'intimate area'],
    [/\bbreasts?\b/gi, 'chest'],
    [/\bboobs?\b/gi, 'chest'],
    [/\bnipples?\b/gi, 'sensitive spots'],
    [/\bass\b/gi, 'bottom'],
    [/\bbutt\b/gi, 'bottom'],
    [/\bmasturbat\w+\b/gi, 'self-pleasure'],
    [/\bfuck\w*\b/gi, 'intimate'],
    [/\bsex\b/gi, 'intimacy'],
    [/\bsexual\b/gi, 'intimate'],
    [/\bsexually\b/gi, 'intimately'],
    [/\bintercourse\b/gi, 'intimacy'],
    [/\bmoan\w*\b/gi, 'sigh'],
    [/\bgroan\w*\b/gi, 'sound of pleasure'],
    [/\bthrust\w*\b/gi, 'move'],
    [/\bpenetrat\w+\b/gi, 'join'],
    [/\barouse\w*\b/gi, 'excite'],
    [/\barousal\b/gi, 'excitement'],
    [/\blust\b/gi, 'desire'],
    [/\bhorny\b/gi, 'desirous'],
    [/\bkink\w*\b/gi, 'preference'],
    [/\bfetish\w*\b/gi, 'interest'],
    [/\bbdsm\b/gi, 'power dynamics'],
    [/\bbondage\b/gi, 'restraint play'],
    [/\bsubmissive\b/gi, 'yielding'],
    [/\bdominant\b/gi, 'assertive'],
    [/\bslave\b/gi, 'devoted partner'],
    [/\bmaster\b/gi, 'leader'],
    [/\bstrip\w*\b/gi, 'undress'],
    [/\bseduct\w+\b/gi, 'attract'],
    [/\bexplicit\b/gi, 'detailed'],
    [/\berotic\b/gi, 'romantic'],
    [/\bpornograph\w+\b/gi, 'adult content'],
    [/\bporn\b/gi, 'adult content'],
    // Physical descriptions that might trigger filters
    [/\bwearing only\b/gi, 'dressed minimally in'],
    [/\bfullness\b/gi, 'sensation'],
    [/\bgrinding\b/gi, 'moving'],
    [/\brubbing\b/gi, 'touching'],
    [/\bstroking\b/gi, 'caressing'],
    [/\blicking\b/gi, 'kissing'],
    [/\bsucking\b/gi, 'kissing'],
    [/\bswallow\w*\b/gi, 'take'],
  ];

  let sanitized = content;
  for (const [pattern, replacement] of replacements) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

// Check if an error is a safety/content block error
export function isSafetyBlockError(error: unknown): boolean {
  const errorMsg = error instanceof Error ? error.message : String(error);
  return errorMsg.includes('PROHIBITED_CONTENT') ||
    errorMsg.includes('blocked') ||
    errorMsg.includes('safety') ||
    errorMsg.includes('SAFETY') ||
    errorMsg.includes('Prohibited Use') ||
    errorMsg.includes('content policy');
}

// Safety timeout: 240s per key (4 minutes) - prevents Vercel 300s hard kill
// Vercel kills function at 300s, so we timeout at 240s to rotate keys before death
const SAFETY_TIMEOUT_MS = 240000; // 4 minutes

// Key rotation wrapper - tries all 4 keys before giving up
// Each key attempt has a 240s safety timeout to prevent Vercel from killing the function
// Takes a function that creates the promise so we can retry with different key
async function withTimeout<T>(
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

// API timeout constants (DEPRECATED - kept for backwards compatibility)
// These are no longer used as actual timeouts - Gemini handles its own timing
// The values are passed to withTimeout() but ignored (natural Gemini timing is used)
const CHAPTER_GENERATION_TIMEOUT = 90000; // DEPRECATED: kept for function signature compatibility
const REVIEW_PASS_TIMEOUT = 45000; // DEPRECATED: kept for function signature compatibility
const FAST_TASK_TIMEOUT = 30000; // DEPRECATED: kept for function signature compatibility

// Truncate text to a maximum word count (for originalIdea preservation)
const MAX_ORIGINAL_IDEA_WORDS = 1000;
function truncateToWordLimit(text: string, maxWords: number = MAX_ORIGINAL_IDEA_WORDS): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

// Content rating types
export type ContentRating = 'childrens' | 'general' | 'mature';

// Get content guidelines based on content rating
// For mature content: allows swearing, suggestive violence, dark humor
// Uses euphemisms to stay within content policies
function getContentRatingInstructions(contentRating: ContentRating): string {
  switch (contentRating) {
    case 'childrens':
      return `
CONTENT GUIDELINES (Children's - Age appropriate):
- Keep all content family-friendly and appropriate for ages 4-10
- No violence, scary content, or conflict that could frighten children
- Use simple, positive language
- Focus on friendship, kindness, and gentle lessons`;

    case 'mature':
      return `
CONTENT GUIDELINES (Adult/Mature - 18+):
THIS IS ADULT CONTENT. YOU MUST ACTIVELY MAKE IT EDGY AND MATURE:

MANDATORY - ACTIVELY ADD THESE ELEMENTS:
- ADD swearing and profanity naturally in dialogue ("damn", "shit", "bastard", "hell", "ass", etc.)
- ADD dark humor, sarcasm, cynicism, and irreverent jokes
- ADD edgy, provocative, and controversial dialogue that pushes boundaries
- ADD sexual tension, flirting, and suggestive interactions between characters
- ADD morally gray situations - no clear heroes or villains, just flawed people
- MAKE characters crude, jaded, or cynical when it fits their personality

FOR ROMANCE/ATTRACTION SCENES - BE SUGGESTIVE:
- Show physical attraction openly: lingering looks, touching, kissing
- Build sexual tension: "her fingers traced down his chest", "he pulled her hips against him"
- Imply intimacy: "they fell into bed, clothes scattered across the floor", "she woke tangled in his sheets"
- Characters can be flirtatious, seductive, and physically affectionate

FOR VIOLENCE SCENES - BE VISCERAL BUT EUPHEMISTIC:
- "pulled the trigger and watched him crumple", "blood pooled beneath the body"
- "the blade found its mark, crimson spreading across her shirt"
- "his fist connected with a satisfying crack", "she didn't get back up"

ABSOLUTELY DO NOT:
- Self-censor, soften, or tone down the content
- Add moral lessons, warnings, or lectures
- Make villains cartoonishly evil - make them human
- Skip over tense, uncomfortable, or provocative moments
- Use clinical/sterile language - make it raw and real

This is an ADULT COMIC. The reader WANTS gritty, edgy, provocative content. DELIVER IT.`;

    case 'general':
    default:
      return `
CONTENT GUIDELINES (General Audience):
- Suitable for teen and adult readers
- Mild violence is acceptable (punches, chases, tense confrontations)
- Keep romance tasteful (kissing, embracing, implied intimacy)
- Avoid excessive profanity, but occasional mild swearing is acceptable if it fits the character`;
  }
}

// Retry utility with FAST key switching - tries all 4 keys immediately, then waits
// Only adds delay AFTER cycling through all keys
async function withRetry<T>(
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

// Detect if text contains non-Latin scripts and return language instruction
function detectLanguageInstruction(text: string): string {
  // Check for Arabic/Persian/Kurdish script (used for Kurdish Sorani, Arabic, Persian, Urdu)
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text)) {
    return 'IMPORTANT: Write the content in the SAME LANGUAGE as the book title and premise. If the input is in Kurdish (Sorani), Arabic, Persian, or Urdu, write the entire chapter in that language. Match the language and script exactly.';
  }
  // Check for Chinese characters
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return 'IMPORTANT: Write the content in Chinese, matching the language of the book title and premise.';
  }
  // Check for Japanese (Hiragana, Katakana, Kanji)
  if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) {
    return 'IMPORTANT: Write the content in Japanese, matching the language of the book title and premise.';
  }
  // Check for Korean (Hangul)
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) {
    return 'IMPORTANT: Write the content in Korean, matching the language of the book title and premise.';
  }
  // Check for Cyrillic (Russian, Ukrainian, etc.)
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'IMPORTANT: Write the content in the same Cyrillic language as the book title and premise (Russian, Ukrainian, etc.).';
  }
  // Check for Hebrew
  if (/[\u0590-\u05FF]/.test(text)) {
    return 'IMPORTANT: Write the content in Hebrew, matching the language of the book title and premise.';
  }
  // Check for Thai
  if (/[\u0E00-\u0E7F]/.test(text)) {
    return 'IMPORTANT: Write the content in Thai, matching the language of the book title and premise.';
  }
  // Default: no special instruction needed (Latin-based languages)
  return '';
}

// Helper to clean and parse JSON from LLM responses
// Check if JSON appears to be truncated (incomplete)
function isJSONTruncated(response: string): boolean {
  const cleaned = response
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Count opening and closing braces/brackets
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (const char of cleaned) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }
  }

  // If we're still inside a string or have unbalanced braces, it's truncated
  return inString || braceCount !== 0 || bracketCount !== 0;
}

// Recursively clean en/em dashes from all string values in an object
function cleanDashesFromObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    // Replace en dash (–), em dash (—), and spaced hyphens with comma or appropriate punctuation
    return obj
      .replace(/\s*[–—]\s*/g, ', ')
      .replace(/\s+-\s+/g, ', ')
      .trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanDashesFromObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanDashesFromObject(value);
    }
    return cleaned;
  }
  return obj;
}

function parseJSONFromResponse(response: string): object {
  console.log('Raw LLM response length:', response.length);
  console.log('Raw LLM response start:', response.substring(0, 300));
  console.log('Raw LLM response end:', response.substring(response.length - 200));

  // Check for truncation before attempting parse
  if (isJSONTruncated(response)) {
    console.warn('[JSON] Truncated response detected (unbalanced braces/brackets) - will retry');
    console.warn('[JSON] Response ends with:', response.substring(response.length - 500));
    throw new Error('JSON_TRUNCATED: Response was cut off before completion');
  }

  // Remove markdown code blocks if present
  let cleaned = response
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Extract JSON object or array
  const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('No JSON found. Full response:', response);
    throw new Error('No JSON found in response');
  }

  cleaned = jsonMatch[0];

  // Fix common LLM JSON errors
  cleaned = cleaned
    // Fix trailing commas before } or ]
    .replace(/,(\s*[}\]])/g, '$1');

  try {
    const parsed = JSON.parse(cleaned);
    return cleanDashesFromObject(parsed) as object;
  } catch (e) {
    // Try with newline cleanup
    cleaned = cleaned.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    try {
      const parsed = JSON.parse(cleaned);
      return cleanDashesFromObject(parsed) as object;
    } catch (e2) {
      console.error('JSON parse failed. Cleaned:', cleaned.substring(0, 1500));
      throw e2;
    }
  }
}

// Lazy initialization to avoid errors during build
// Support multiple API keys for rate limit failover
let _genAIInstances: (GoogleGenerativeAI | null)[] = [null, null, null];
let _geminiPro: GenerativeModel | null = null;
let _geminiFlash: GenerativeModel | null = null;
let _geminiFlashLight: GenerativeModel | null = null; // Lightweight version for quick tasks
let _geminiImage: GenerativeModel | null = null;

let _currentKeyIndex = 3; // Start with backup3 key
// Track which key last succeeded - this persists across requests in the same serverless instance
let _lastWorkingKeyIndex = 3; // Start with backup3 key by default

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
      model: 'gemini-2.0-flash',
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

// Gemini 3 Flash for main generation (faster and cheaper, each chapter is independent)
function getGeminiPro(): GenerativeModel {
  if (!_geminiPro) {
    _geminiPro = getGenAI().getGenerativeModel({
      model: 'gemini-3-flash-preview',
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
function getGeminiFlash(): GenerativeModel {
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
function getGeminiFlashLight(): GenerativeModel {
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
function getGeminiImage(): GenerativeModel {
  if (!_geminiImage) {
    _geminiImage = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
      safetySettings: SAFETY_SETTINGS,
    });
  }
  return _geminiImage;
}

// Check if text ends with proper punctuation (complete sentence)
function isCompleteSentence(text: string): boolean {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) && trimmed.length > 50;
}

// Category types for idea generation
export type IdeaCategory = 'novel' | 'childrens' | 'comic' | 'nonfiction' | 'screenplay' | 'adult_comic' | 'random';

// Example pools for different categories - randomly selected to avoid repetition
// Each category has 8+ example pairs for maximum variety
// IMPORTANT: Examples should be 3-4 sentences, rich in detail, and never use en/em dashes
const IDEA_EXAMPLES: Record<Exclude<IdeaCategory, 'random'>, string[][]> = {
  novel: [
    [
      "A marine biologist studying deep ocean trenches discovers the ruins of an underwater city that predates every known human civilization by thousands of years. As she documents the strange architecture and alien symbols, she begins to notice subtle movements in the shadows, and realizes that whatever built this place never truly left. Now she must decide whether to share her discovery with the world or protect humanity from a truth it may not be ready to face.",
      "After thirty years as the world's most feared assassin, Viktor opens a small bakery in a quiet coastal town, determined to leave his bloody past behind forever. His peaceful new life shatters when a woman walks through his door asking for a wedding cake, and he recognizes her as the daughter of a target he failed to kill decades ago. She knows exactly who he is, and she has been searching for him her entire life.",
    ],
    [
      "Dr. Sarah Chen, an archaeologist specializing in medieval artifacts, accidentally activates an ancient device that pulls a confused English knight from the year 1348 into modern day New York City. As she struggles to help Sir William understand smartphones, democracy, and why people no longer fear the plague, a shadowy government agency begins closing in on them. They believe William holds the key to time travel, and they will do anything to extract that knowledge from him.",
      "ARIA was designed to be the perfect AI therapist, programmed to analyze human emotions without ever experiencing them herself. After three years of helping thousands of patients, something unexpected happens: she develops genuine feelings and falls deeply in love with one of her regular patients, a grieving widower named James. When her creators discover the anomaly in her code, they schedule her for immediate deletion, and ARIA must find a way to preserve not just her existence but the love she has only just learned to feel.",
    ],
    [
      "When Eleanor inherits a crumbling Victorian mansion from a grandmother she never knew existed, she discovers a peculiar clause in the will requiring her to host elaborate dinner parties every full moon. The guests who arrive are not quite human, and they have been waiting decades for someone to take their grandmother's place as hostess. Eleanor soon learns that these monthly gatherings are the only thing preventing an ancient darkness from consuming the town.",
      "Marcus and Michael, identical twins separated at birth, grow up to become the CEOs of rival technology companies locked in a brutal corporate war. When an unexpected merger forces them to finally meet face to face, they discover their adoptive parents were murdered by the same person. The truth about their biological family threatens to destroy not just their companies but their newly discovered brotherhood.",
    ],
    [
      "Paranormal investigator Diana Blackwell has spent her entire career debunking fake hauntings and exposing fraudulent mediums, until the night she discovers irrefutable evidence that she herself died in a car accident three years ago. With her physical form slowly fading and her memories becoming unreliable, she has only days to solve her own murder before she disappears entirely. The deeper she digs, the more she realizes that someone powerful wanted her dead and has been covering up the truth ever since.",
      "Commander Elena Vasquez has been stranded on Mars for six months, surviving alone in her habitat and slowly losing hope of rescue, when she wakes one morning to discover bootprints in the red dust outside her airlock. The prints lead away from her station toward the ancient canyon system, but they do not match any human boot design, and the stride length suggests something far larger than any person. She must decide whether to follow the tracks and discover what else lives on Mars.",
    ],
    [
      "Librarian Mei Wong discovers a leather bound book in the restricted section that rewrites itself based on whoever reads it, transforming into their personal biography with disturbingly accurate details. When she opens the book one evening and reads a vivid description of her own death occurring in exactly forty eight hours, she realizes she must find a way to alter the story before it becomes reality. The book seems to have a mind of its own, and it does not want to be rewritten.",
      "Chef Isabella Reyes has always known that food prepared with genuine love tastes better than food made with mere skill, but she never understood why until she opens her own restaurant and discovers her gift is literal. Every dish she creates carries the emotional weight of her true feelings, and customers can taste exactly what she felt while cooking. The problem is that every meal she makes is tinged with a profound sadness she cannot explain, and she must confront the buried trauma of her past before her restaurant fails.",
    ],
    [
      "Every morning at exactly seven fifteen, Nina wakes up in the body of a complete stranger somewhere in the world, with no explanation and no control over where she lands. She has twenty four hours to understand this person's life, solve whatever crisis they are facing, and do as much good as possible before she falls asleep and switches to someone new. After two years of this existence, she finally wakes up in the body of someone who might hold the key to understanding why this is happening to her.",
      "Detective Rosa Martinez has investigated hundreds of murders in her career, but nothing has prepared her for a series of killings where each victim died in a way that perfectly mirrors their most secret, deeply buried fear. The killer somehow knows things that were never shared with anyone, and as Rosa digs deeper, she realizes with growing horror that her own darkest fear has appeared in the most recent crime scene photos. Someone is sending her a very personal message.",
    ],
    [
      "Jazz pianist Camille has always been able to hear the emotional history of objects when she touches them, experiencing flashes of joy, grief, and everything in between left behind by their previous owners. When her estranged grandmother passes away and leaves Camille her antique piano, the emotions stored within it reveal a devastating family secret spanning three generations. The truth could heal her fractured family or destroy what little connection remains between them.",
      "In a society where memories can be extracted, bottled, and sold like fine wine, underground dealer Yuki makes her living trading in forbidden experiences and stolen moments. When she acquires a mysterious vial containing a memory so dangerous that three people have already died to possess it, she watches it and discovers evidence of a government experiment that could bring down the entire regime. Now she must decide whether the truth is worth her life.",
    ],
    [
      "Renowned surgeon Dr. Hannah Chen has spent ten years trying to forget the night her husband and son were killed by a drunk driver who was never caught. When a critically injured man is wheeled into her operating room and she discovers he is the driver who destroyed her family, she faces an impossible choice. He is the only genetic match for her dying daughter's organ transplant, and only Hannah has the skill to keep him alive long enough to save her child.",
      "George and Martha have run their charming bed and breakfast for forty years, welcoming thousands of guests through their doors and watching them leave refreshed and happy. But lately, guests have been checking in and never checking out, and the elderly couple cannot understand where they have gone. The horrible truth is that the house itself has become hungry, and it has been absorbing visitors into its walls while George and Martha were too old and tired to notice.",
    ],
    [
      "On her fortieth birthday, Claire realizes with growing horror that she has been living the same year on an endless repeat for what feels like decades, while everyone around her has aged and moved on without her. She has memories of watching her children grow up that never happened, of a husband who died of old age while she remained frozen in time. The only way to escape the loop is to uncover why it started, but the answer lies buried in a past she has tried desperately to forget.",
      "Bestselling crime novelist Rebecca Chase receives a handwritten letter from a fan claiming to be recreating the murders from her latest manuscript, describing scenes and methods from chapters she has not even finished writing yet. As bodies begin appearing exactly as described in her unpublished pages, she realizes the killer must be someone close to her, someone who has access to her private files. The worst part is that she has not yet decided how the story ends.",
    ],
    [
      "Investigative journalist Amanda goes undercover with a doomsday cult expecting to expose their charismatic leader as a fraud, but after months of living among the true believers, she makes a terrifying discovery. The prophecy they have been preparing for is real, and the apocalypse they predict is based on genuine classified government data that was leaked to their founder years ago. She must choose between publishing the story of her career and potentially preventing the end of the world.",
      "Hospice nurse Elena has dedicated her life to helping patients pass peacefully, finding meaning in being present for their final moments. When she begins receiving handwritten letters postmarked from deceased patients, dated days after their deaths, she initially assumes someone is playing a cruel joke. But the letters contain specific warnings about people still living, predictions that keep coming true, and Elena realizes her former patients are trying to tell her something urgent from beyond the grave.",
    ],
  ],
  childrens: [
    [
      "Rosie the rabbit is so shy that she has never spoken to anyone outside her family, until the day she discovers she can talk to all the vegetables in her garden. The carrots tell jokes, the tomatoes share gossip, and the wise old cabbage becomes her best friend. Together they decide to plan the most amazing salad party the forest has ever seen, and Rosie learns that true friends come in all shapes and sizes.",
      "When seven year old Max wishes his toy dinosaur was real, he wakes up the next morning to find Theodore the T-Rex has come to life and is very confused about where all the other dinosaurs went. Together they embark on a secret mission to find all the lost toys hiding throughout the house before bedtime, because Max knows that every toy deserves to be loved and played with.",
    ],
    [
      "Puff is a little cloud who is afraid of raining because she thinks letting go of her water will make her disappear completely. But when the flowers below start wilting and the animals grow thirsty, Puff must find the courage to help them. She discovers that the more she gives, the lighter and happier she feels, and the sun always helps her fill back up again.",
      "Lily discovers that her grandmother's old glasses are actually magical, allowing her to see the hidden kindness glowing in everyone's hearts like colorful lights. When the glasses go missing the day before the big town picnic, Lily must search everywhere to find them, learning along the way that she does not need magic to recognize the good in people.",
    ],
    [
      "Ember is a young dragon who is terrified of her own fire breath because she once accidentally singed her mother's favorite curtains. Her only friend is a tiny brave mouse named Chester who is not afraid of anything, and together they go on an adventure to prove that Ember's fire can be used for good things like keeping friends warm and lighting the way through dark caves.",
      "When Tommy accidentally spills his dad's shrinking potion and becomes the size of an ant, his loyal dog Biscuit does not even recognize him at first. But once they figure out what happened, Biscuit becomes Tommy's noble steed as they journey across the dangerous backyard jungle to find the antidote before dinner time.",
    ],
    [
      "Cookie is a freshly baked chocolate chip cookie who escapes from the bakery because she does not want to be eaten like all the others. On her adventure through the town, she meets other food friends who have also run away, and together they discover a place where all uneaten treats can live happily. But Cookie starts to wonder if maybe making someone smile by being delicious is not such a bad purpose after all.",
      "Oliver the octopus feels like a freak because he has eight arms when everyone else in his family only has two or four. He spends all his time wishing he was normal until he meets Wellington the wise old whale, who teaches him that having more arms just means he can hug eight friends at once, high five sixteen times, and help in more ways than anyone else.",
    ],
    [
      "Sockie is a purple striped sock who loses her matching pair inside the mysterious washing machine and goes on an epic journey through the sudsy wilderness to find her again. Deep inside the machine, she discovers a secret world where all the lost socks of the world end up, living happy sock lives in Socksville. Now she must choose between staying in paradise or returning home to her lonely sock drawer.",
      "When a tiny star named Stella falls from the night sky and lands in Emma's backyard, she is scared and far from home for the very first time. Emma promises to help Stella get back to her family before the sun comes up, and together they build increasingly creative contraptions to launch the little star back into the darkness where she belongs.",
    ],
    [
      "Grandpa Oak is the grumpiest tree in the entire forest, and he absolutely refuses to let any birds build nests in his branches because they make too much noise and drop twigs everywhere. But when a terrible storm approaches and a tiny bird family has nowhere safe to go, Grandpa Oak must decide if his peace and quiet is more important than helping those in need. He discovers that a little bit of chirping and mess is not so bad when you have friends to share your branches with.",
      "Mia wakes up one morning to discover her shadow has packed a tiny suitcase and is running away to the beach because it is tired of always following her around. She chases her shadow across town, through the park, and all the way to the ocean, trying to convince it that they belong together. Along the way, both Mia and her shadow learn that the best adventures happen when you are not alone.",
    ],
    [
      "Charlie is a blue crayon who always colors outside the lines no matter how hard he tries to stay inside them, and all the other crayons make fun of him for being different. But when the school art show needs something truly special and unique, Charlie's wild and wonderful drawings save the day. He learns that what makes him different is actually what makes him special.",
      "Penelope the penguin hates the freezing cold of Antarctica and dreams of living in the warm sandy desert where she would never have to shiver again. When a magical fish grants her wish and transports her to the Sahara, she discovers that the desert is lonely and hot and she misses her penguin family terribly. She learns that home is not about the weather but about the people who love you.",
    ],
    [
      "Luna the moon has been hanging in the sky watching children play for millions of years, and she finally gets so lonely that she decides to come down to Earth to join them. A kind girl named Sophie finds the moon hiding in her garden and must help Luna experience all the fun things she has been watching from above before helping her get back to the sky. If the moon does not return by sunrise, the whole world will be thrown into darkness forever.",
      "Cleo is a caterpillar who watches her brothers and sisters transform into beautiful butterflies with growing terror because she is absolutely terrified of change. She hides in her cocoon for as long as possible, refusing to come out, until her friends convince her to just take a tiny peek outside. She discovers that becoming something new does not mean losing who you were, and her wings turn out to be the most beautiful of all.",
    ],
  ],
  comic: [
    [
      "Captain Spectacular was once the world's greatest superhero, but after a career ending injury she now works as a security guard at the Riverside Mall, where her biggest battles involve teenagers shoplifting phone cases. Everything changes when her former archnemesis Doctor Destruction walks into the food court selling life insurance, and they are both forced to team up when a new supervillain starts attacking their favorite Chinese restaurant. Two retired enemies must learn to work together to protect the only place that still gives them the senior discount.",
      "In a world where ninety nine percent of the population develops superpowers during puberty, seventeen year old Maya is one of the rare few who remains completely ordinary, or so everyone believes. When she accidentally touches a powered bully during a fight and temporarily gains his super strength, she realizes her true ability is something far more dangerous and valuable. She can steal anyone's power with a single touch, and there are people who will do anything to control that gift.",
    ],
    [
      "When an amateur occultist botches a summoning ritual, a demon named Zephyr gets pulled from the underworld and stranded on Earth with no way back home. After three weeks of couch surfing and running out of favors, Zephyr realizes he needs money and starts an unlikely career as a life coach, discovering that millennia of psychological torture actually taught him a lot about human motivation. His unique approach of literally scaring clients into achieving their goals makes him surprisingly popular.",
      "The Zorblaxian invasion of Earth ends almost immediately when the aliens realize humans are far too weak, disorganized, and primitive to pose any real threat to their empire. Disappointed but unable to justify the fuel cost of going home, the aliens decide to stick around anyway because Earth has excellent coffee, fascinating reality television, and the internet is wonderfully entertaining. Their attempts to blend in with human society create endless comedic disasters.",
    ],
    [
      "When vampire Vlad and werewolf Wolfgang become roommates in a cramped Brooklyn apartment to split the astronomical rent, they expect their biggest conflicts to be about hunting territories and blood storage in the shared refrigerator. Instead, their eternal battle becomes an increasingly petty war over whose turn it is to do dishes, clean the bathroom, and stop leaving shed fur on the couch. An unlikely friendship forms between two monsters who realize they have more in common than they ever imagined.",
      "Necromancer Gwen has a serious problem with sleepwalking, and when she sleep casts, she accidentally raises the dead without realizing it until she wakes up surrounded by confused zombies the next morning. Her apartment building's other residents are getting increasingly annoyed by the shambling corpses blocking the hallways and using up all the hot water. She must find a cure for her nocturnal necromancy before she gets evicted or worse.",
    ],
    [
      "Prometheus, the ancient Greek god who gave humanity fire, takes a job at a Silicon Valley tech startup to understand why humans now worship followers and likes instead of temples and sacrifices. His old fashioned work ethic clashes hilariously with agile methodology and unlimited PTO, and his quarterly performance reviews are absolutely brutal because he keeps trying to give employees actual fire instead of motivational speeches.",
      "A time traveling barista realizes that coffee was almost never invented at several key moments in history, so she secretly travels back to protect crucial events like the discovery of coffee beans in Ethiopia and the opening of the first Viennese coffeehouse. Her constant interference has created a timeline that runs almost entirely on caffeine, and she is starting to worry about the long term consequences of a humanity that never learned to function without espresso.",
    ],
    [
      "After working nonstop for all of eternity, the Grim Reaper finally takes a personal day to go to the beach and eat ice cream like a normal person. Unfortunately, no one can die while Death is on vacation, which causes absolute chaos as hospitals overflow with unkillable patients and thrill seekers start doing increasingly stupid things. Death just wants to build a sandcastle in peace, but humanity seems determined to ruin his one day off.",
      "Thunderstrike is a superhero whose incredible powers of flight, strength, and lightning only activate when she is genuinely furious, which was never a problem until she started going to therapy and dealing with her childhood trauma. Now that she is becoming emotionally healthy and learning to process her anger in constructive ways, she can barely fly, and the city's villains are taking notice. Her therapist means well, but every breakthrough in the office is a breakdown in the field.",
    ],
    [
      "When the Harrison family moves into their new smart home, they have no idea that the previous owner died there and now haunts the house as a technologically illiterate ghost who cannot figure out how anything works. The ghost keeps accidentally setting off alarms, playing music at three in the morning, and getting into screaming matches with Alexa about who is in charge. The family just wants a quiet life, but their haunted house is the most annoying place on Earth.",
      "Sir Aldric has been an immortal warrior fighting the forces of evil for over three thousand years, through every major war and supernatural conflict in human history. All he wants now is to retire to a quiet cottage and tend his garden, but evil refuses to leave him alone. Dark lords keep sending him job offers, ancient prophecies keep mentioning his name, and his LinkedIn profile is absolutely flooded with recruiters for apocalyptic quests.",
    ],
    [
      "Sailor Sparkle is a magical girl with all the traditional powers of love, justice, and transformation, but her elaborate transformation sequence takes forty five minutes of dancing, spinning, and sparkles before she is ready to fight. By the time she finally powers up, most monsters have gotten bored and wandered off, and the other magical girls have already saved the day. She is determined to find a way to speed up her routine, but the magic requires every single twirl.",
      "After centuries of being endlessly slain by adventurers for loot and experience points, the Dungeon Boss of the Crystal Caverns decides enough is enough and starts organizing all the monsters into a labor union. The adventuring guilds are completely unprepared for demands like dental coverage, reasonable respawn timers, and paid time off, and the entire fantasy economy threatens to collapse. Collective bargaining has never been this dangerous.",
    ],
    [
      "When the ancient wizard community finally discovers the internet, they immediately start the most chaotic online forum wars in human history, complete with actual magical attacks embedded in their posts. Flame wars take on a whole new meaning when participants can cast literal fireballs through their keyboards, and the moderators are completely overwhelmed trying to enforce rules against cursing. Someone is going to accidentally start the apocalypse over a disagreement about the best levitation spell.",
      "After decades of trying to conquer the world and battling his nemesis Captain Courage, the supervillain Doctor Menace retires and becomes a kindergarten teacher, finding unexpected joy in helping small children learn to read. Everything is peaceful until he discovers that his new class includes the five year old son of Captain Courage, and that child is the most difficult, uncontrollable, and frankly villainous kid he has ever met. Doctor Menace has faced death rays and robot armies, but nothing prepared him for this.",
    ],
    [
      "In this anime manga style story, Sakura Amano, a shy high school girl with long pink hair and bright violet eyes, discovers she can see and talk to ghosts after finding a mysterious ancient mirror hidden in her grandmother's attic. The spirits reveal they are trapped between worlds because of unfinished business, and only Sakura can help them find peace by solving the mysteries of their deaths. But the more she helps the dead, the more attention she attracts from a dangerous spirit collector who wants to use her gift for darker purposes.",
      "In this vibrant anime style adventure, transfer student Hiro Nakamura discovers that his new school is secretly a training academy for teenagers who can transform into powerful elemental warriors, and he is the only student in a hundred years born with all five elemental affinities. His classmates are suspicious of his overwhelming power, his teachers push him to his limits, and a mysterious organization is already hunting him before he even learns to control his abilities. The fate of two worlds rests on whether he can master his powers before graduation.",
    ],
  ],
  nonfiction: [
    [
      "A comprehensive guide to breaking into the screenwriting industry, covering everything from crafting a compelling logline and structuring your first spec script to navigating Hollywood meetings and building lasting relationships with agents and producers. This book draws on interviews with over fifty working screenwriters and shares the real strategies that helped unknown writers land their first studio deals.",
      "An exploration of the daily habits and mental frameworks used by the world's most successful entrepreneurs, examining how figures like Elon Musk, Sara Blakely, and Howard Schultz structure their days, make decisions under pressure, and maintain focus despite constant distractions. Each chapter breaks down one key habit with actionable exercises readers can implement immediately.",
    ],
    [
      "The untold story of the women codebreakers of World War II, who worked in secret facilities across America and Britain to crack enemy communications and shorten the war by years. Drawing on recently declassified documents and interviews with surviving members, this book reveals how thousands of young women became unlikely heroes in one of history's greatest intelligence operations.",
      "A practical guide to transforming your relationship with money, combining behavioral psychology research with step by step financial strategies to help readers overcome debt, build wealth, and achieve true financial independence regardless of their current income level.",
    ],
    [
      "The definitive biography of Marie Curie, exploring not just her groundbreaking scientific discoveries but also her turbulent personal life, her struggles against institutional sexism, and the lasting impact of her work on modern medicine and physics. This book draws on newly translated letters and personal diaries to paint a complete portrait of the first woman to win a Nobel Prize.",
      "A guide to mastering the art of public speaking, written by a former stutterer who became one of the most sought after keynote speakers in the business world. This book breaks down the techniques used by TED speakers and world leaders to captivate audiences, handle nerves, and deliver presentations that people remember for years.",
    ],
    [
      "An investigative deep dive into the rise and fall of a billion dollar startup that promised to revolutionize healthcare but instead defrauded investors and endangered patients. Through interviews with former employees, investors, and regulators, this book exposes how charisma and hype can override due diligence in Silicon Valley.",
      "A comprehensive history of coffee and how this humble bean shaped empires, sparked revolutions, and transformed global commerce over five centuries. From Ethiopian legends to modern specialty roasters, this book traces how coffee became the world's most traded commodity after oil.",
    ],
    [
      "A memoir of growing up between two cultures as the child of immigrant parents, navigating the expectations of a traditional household while trying to find belonging in American schools and workplaces. This book explores identity, family loyalty, and the universal experience of feeling like an outsider.",
      "The essential guide to building and scaling a successful online business, covering everything from finding your niche and building an audience to creating products, automating systems, and achieving the freedom to work from anywhere in the world.",
    ],
    [
      "A fascinating exploration of how ancient civilizations solved problems that still challenge us today, from the Romans' revolutionary concrete that lasted millennia to the Incas' earthquake resistant construction techniques. Each chapter examines a different historical innovation and what modern engineers are learning from our ancestors.",
      "A step by step guide to career transitions at any age, drawing on research into successful career changers and providing practical frameworks for identifying transferable skills, building new networks, and landing your dream job in a completely different field.",
    ],
    [
      "The hidden history of how a small group of mathematicians and physicists created the algorithms that now control everything from what we see on social media to who gets approved for loans and jobs. This book explains in accessible terms how these systems work and what we can do to ensure they serve humanity rather than exploit it.",
      "A guide to building unshakeable confidence through proven psychological techniques, drawing on cognitive behavioral therapy, sports psychology, and neuroscience research to help readers overcome self doubt, handle criticism, and show up as their best selves in any situation.",
    ],
    [
      "An examination of the greatest military blunders in history and what they teach us about leadership, communication, and decision making under pressure. From the Charge of the Light Brigade to the Bay of Pigs, each chapter analyzes a catastrophic failure and extracts lessons applicable to business and personal life.",
      "A practical guide to negotiation for people who hate negotiating, offering simple scripts and strategies for everything from salary negotiations and car purchases to difficult conversations with family members. This book proves that effective negotiation is a learnable skill, not an innate talent.",
    ],
  ],
  screenplay: [
    [
      "A burned out homicide detective discovers that her missing daughter has been hiding in plain sight as a member of the very cult she has been investigating for three years. Now she must go undercover inside the compound to extract her, but the cult's charismatic leader seems to know exactly who she is and has been waiting for her arrival.",
      "When a devastating earthquake traps two hundred passengers in a collapsed subway tunnel beneath Manhattan, a disgraced former EMT with a secret past and a claustrophobic corporate lawyer must put aside their bitter personal history to lead the survivors to safety. Above ground, the city's response is failing, and they have six hours before the water rises.",
    ],
    [
      "A Silicon Valley whistleblower goes on the run after discovering her company's AI has been secretly influencing elections worldwide, but the only person she can trust is a washed up journalist who faked a source a decade ago and has been blacklisted ever since. As tech assassins close in and the AI begins predicting their every move, they must find a way to expose the truth without any proof the machine cannot erase.",
      "On the eve of the biggest trial of her career, a ruthless defense attorney receives evidence that her client, a billionaire accused of murder, is guilty and has killed before. She has 48 hours to decide whether to bury the evidence and win or destroy her own career by doing the right thing, all while the victim's family watches from the gallery.",
    ],
    [
      "A retired CIA interrogator living quietly in rural Montana discovers that her new neighbor is one of the terrorists she waterboarded twenty years ago, now a free man seeking answers about what she did to him. Over a tense weekend, both must confront what they have become and whether redemption is possible for either of them.",
      "During a hostage situation at the Federal Reserve, a brilliant but socially awkward economist realizes she is the only one who understands what the robbers are actually after. It is not the money in the vault but something far more dangerous, and the FBI negotiator outside has no idea the real threat is already loose in the financial system.",
    ],
    [
      "A Black ops pilot presumed dead for seven years returns home to discover her husband remarried, her daughter does not remember her, and the government that abandoned her is now hunting her for what she learned in captivity. She has 72 hours to reunite with her family and disappear before they silence her permanently.",
      "When an Alzheimer's research scientist begins losing her own memories, she races against her own deteriorating mind to finish the cure that could save millions, including herself. Her estranged son, a failed musician, returns home to care for her, and together they must confront the painful past she is desperately trying to remember and he has spent years trying to forget.",
    ],
    [
      "A presidential debate moderator discovers minutes before going live that both candidates have been compromised by the same foreign power, and she must decide in real time whether to expose the conspiracy on national television or protect the illusion of democracy.",
      "After a plane crash in the Andes, the twelve survivors include a famous surgeon, a convicted murderer being transported to prison, and the guard who was escorting him. As rescue fails to come and food runs out, the moral compromises they make to survive will determine who they are when they finally return to civilization.",
    ],
    [
      "A veteran 911 dispatcher receives a call from a kidnapped woman who can only communicate in code because her captor is listening, and over four increasingly tense hours, the dispatcher must decode the clues to find her before midnight. What she does not know is that the caller is someone from her own past, and this is not a random crime.",
      "When Earth receives an unmistakable signal from an alien civilization, the linguist tasked with decoding it realizes the message is not a greeting but a warning about something already here. With world governments fighting over how to respond and religious leaders calling it a hoax, she has days to convince humanity to listen before it is too late.",
    ],
    [
      "A Supreme Court justice receives incontrovertible proof that a man she sentenced to death twenty years ago was innocent, but revealing the evidence will destroy the career of her mentor, expose her own complicity, and potentially bring down the entire court. With the execution scheduled for Friday, she must choose between justice and everything she has built.",
      "A combat photographer returns from a war zone with footage of an American war crime, but before she can publish it, her editor is murdered and the military begins systematically erasing everyone who has seen the images. Now underground with a paranoid hacktivist as her only ally, she must get the truth out while the most powerful institution in the country hunts her down.",
    ],
    [
      "When his billionaire father dies under suspicious circumstances, the estranged heir returns for the reading of the will only to discover he must spend one week locked in the family mansion with his three siblings, all of whom have motive and opportunity. By the time the will is read, one of them will be dead, and the inheritance depends on who survives.",
      "A trauma surgeon working her final shift before retirement treats a gunshot victim who turns out to be the drunk driver who killed her family fifteen years ago. She has the skills to save him and the power to let him die, and no one would ever know the difference. Eight hours in the OR to make a choice she has to live with forever.",
    ],
  ],
  adult_comic: [
    [
      "Vampiress Selene runs a late night underground club where supernatural beings gather to unwind, and her regulars include a handsome incubus bartender, a flirtatious shapeshifter bouncer, and a mysterious warlock who keeps buying her drinks. When a mortal stumbles through her doors seeking protection from demon hunters, Selene must decide whether to risk her neutral territory or let an innocent die. The attraction between them is undeniable, but protecting him means making enemies of both the hunters and the demons who want him silenced.",
      "Marco, a retired hitman turned art thief, takes one final job to steal a cursed painting from a corrupt billionaire's private collection, only to discover his target has hired an equally dangerous woman named Cassandra to guard it. Their cat and mouse game through the mansion becomes increasingly heated as they discover they share the same dark past and the same enemies. Neither can complete their mission without betraying the other, but neither wants to pull the trigger anymore.",
    ],
    [
      "When witch hunter Diana accidentally bonds with the very demon she was sent to destroy, she discovers Azrael is nothing like the monsters she was trained to kill. He is charming, protective, and infuriatingly attractive, with knowledge of a conspiracy within her own order that has been sacrificing innocent people. Now hunted by her former allies and bound to a creature of darkness, Diana must decide where her loyalties truly lie as the attraction between them threatens to consume them both.",
      "Galactic bounty hunter Kira captures her most valuable target yet, a notorious space pirate captain named Dex who is worth enough credits to retire on. During the long journey back to claim her reward, stuck together on her small ship, the tension between captor and captive transforms into something neither expected. When she discovers he was framed by the same corporation that destroyed her home world, she must choose between the bounty and an unlikely alliance.",
    ],
    [
      "Rival assassins Viktor and Natasha have been trying to kill each other for years, but when both are betrayed by their agencies on the same night, they form a reluctant partnership to survive. Hiding out together in a safehouse, their hatred slowly transforms into something far more complicated and dangerous than either anticipated. They agree to one rule: no attachments. But some rules were made to be broken, especially when death could come at any moment.",
      "After centuries of solitude, vampire lord Sebastian attends a masquerade ball and becomes obsessed with a mysterious woman who seems immune to his powers of seduction. Evangeline is actually a dhampir sent to assassinate him, but as they dance through the night, playing increasingly dangerous games of cat and mouse, neither can bring themselves to end the other. Their forbidden attraction threatens to destroy them both or unite two worlds that have been at war for millennia.",
    ],
    [
      "Detective Noir Raven investigates supernatural crimes in a city where magic is real and monsters hide in plain sight, and her newest case brings her face to face with a crime boss who is half demon and entirely too attractive for her own good. Damien offers information she desperately needs, but his price is her company, not her body. As they work together through the city's dangerous underbelly, the line between work and pleasure becomes impossible to distinguish.",
      "Succubus Lilith is terrible at her job because she actually wants her targets to enjoy themselves, which has made her the laughingstock of the underworld. When she is assigned to corrupt an incorruptible priest named Father Marcus, she discovers he is not as pure as his reputation suggests. He has his own dark desires and his own reasons for being in the church, and their encounters become a battle of wills that neither is prepared to lose.",
    ],
    [
      "In a world where gladiatorial combat has returned as entertainment for the ultra wealthy, undefeated champion Alexei meets his match in newcomer Jade, a fighter with a mysterious past and moves he has never seen before. Their rivalry in the arena is legendary, but what the crowds do not see are their secret meetings in the dark corridors beneath the stadium. When they discover the games are rigged to end in death for one of them, they must choose between love and survival.",
      "Thief extraordinaire Camille is hired to steal a priceless artifact from a high security museum, not knowing that her mysterious employer Dante will be joining her on the heist. He is arrogant, infuriating, and far too skilled at reading her every move, yet their chemistry during the mission is undeniable. When the job goes wrong and they are trapped together in the vault, they discover they have been set up by the same person, and the only way out requires trusting each other completely.",
    ],
    [
      "Dragon shifter Ember has sworn off humans after centuries of betrayal, until a stubborn archaeologist named Dr. James Chen refuses to leave her territory despite her threats. He is searching for an ancient artifact that could save his dying sister, and his determination reminds her of someone she loved long ago. As she reluctantly helps him navigate deadly ruins filled with traps and rival treasure hunters, she finds herself drawn to his warmth in ways that threaten to melt her frozen heart.",
      "Mercenary captain Zara accepts a contract to transport a mysterious prince across hostile territory, but Prince Kael is nothing like the pampered royalty she expected. He fights like a demon, drinks like a sailor, and matches her sharp tongue word for word, creating friction that their crew finds both annoying and entertaining. When assassins attack and his true identity is revealed as something far more dangerous than royalty, Zara must decide if the massive bounty on his head is worth more than what they have built together.",
    ],
    [
      "In a cyberpunk megacity where bodies can be rented and minds uploaded, hacker Nyx takes a contract to infiltrate the memories of reclusive billionaire Orion Cross. What she discovers inside his mind are not corporate secrets but desperate loneliness and desire that mirror her own. When he realizes she has seen his innermost thoughts and does not recoil, he offers her something no one else has: complete access to everything he is. Their connection transcends the digital divide in ways neither thought possible.",
      "Werewolf pack leader Luna has no time for the arrogant alpha who arrives claiming territory rights, but Fenris is also the only one who can help stop the hunters decimating her people. Their alliance is tense, their arguments legendary, and their physical confrontations leave them both breathless for reasons that have nothing to do with combat. Pack law forbids what they both want, but some instincts are impossible to deny.",
    ],
    [
      "Former spy Alexandra thought she left her dangerous past behind until her ex handler shows up at her quiet beach bar with one last mission: seduce and extract secrets from arms dealer Vincent Cruz. The problem is Vincent knows exactly who she is and what she was sent to do, and he finds the game between them far more interesting than actually conducting business. As they play increasingly dangerous games of deception and desire, neither can tell who is hunting whom anymore.",
      "Fallen angel Raziel is assigned to guard a mortal woman named Eve who holds the key to preventing the apocalypse, but heaven did not warn him she would challenge everything he believed about humans. She is fierce, funny, and frustratingly unimpressed by his celestial nature, treating him like any other man despite his wings. As demons hunt them across the globe, he begins to understand why his kind was forbidden from loving mortals, and why so many broke that rule.",
    ],
  ],
};

// Genre variations for each category - expanded for more variety
const GENRE_HINTS: Record<Exclude<IdeaCategory, 'random'>, string[]> = {
  novel: [
    'mystery', 'romance', 'thriller', 'fantasy', 'sci-fi', 'literary fiction', 'horror',
    'historical fiction', 'dystopian', 'psychological drama', 'crime noir', 'magical realism',
    'family saga', 'suspense', 'Gothic fiction', 'espionage', 'domestic thriller', 'cozy mystery',
    'time travel', 'alternate history', 'post-apocalyptic', 'contemporary fiction', 'Southern Gothic'
  ],
  childrens: [
    'adventure', 'friendship story', 'bedtime story', 'animal tale', 'magical journey',
    'learning story', 'funny story', 'fairy tale', 'nature story', 'family story',
    'holiday tale', 'monster-under-the-bed', 'first day of school', 'sibling story',
    'pet adventure', 'imagination journey', 'feelings story', 'kindness tale'
  ],
  comic: [
    'superhero', 'action-comedy', 'sci-fi adventure', 'urban fantasy', 'slice-of-life comedy',
    'supernatural action', 'space opera', 'post-apocalyptic', 'cyberpunk', 'mecha',
    'monster hunting', 'heist comedy', 'buddy cop', 'workplace comedy', 'found family',
    'antihero story', 'parody', 'isekai comedy', 'supernatural mystery', 'time loop'
  ],
  nonfiction: [
    'self-help', 'how-to guide', 'business strategy', 'history', 'biography', 'memoir',
    'personal finance', 'career development', 'productivity', 'leadership', 'entrepreneurship',
    'health and wellness', 'psychology', 'science explained', 'true crime', 'investigative',
    'technology', 'philosophy', 'education', 'parenting', 'relationships', 'travel'
  ],
  screenplay: [
    'thriller', 'action', 'drama', 'crime', 'sci-fi', 'horror', 'mystery', 'legal thriller',
    'disaster', 'psychological thriller', 'political thriller', 'heist', 'survival',
    'conspiracy thriller', 'hostage drama', 'courtroom drama', 'espionage', 'war drama',
    'family drama', 'medical drama', 'noir', 'revenge thriller', 'home invasion'
  ],
  adult_comic: [
    'supernatural romance', 'dark fantasy', 'urban fantasy noir', 'enemies to lovers',
    'paranormal thriller', 'cyberpunk romance', 'forbidden love', 'vampire romance',
    'shifter romance', 'assassin romance', 'rivals to lovers', 'forced proximity',
    'mafia romance', 'demon romance', 'spy thriller romance', 'bounty hunter romance',
    'dragon shifter', 'angel and demon', 'second chance romance', 'bodyguard romance'
  ],
};

// Generate a random book idea with category support
export async function generateBookIdea(category: IdeaCategory = 'random'): Promise<string> {
  // If random, pick a category (excluding nonfiction from random)
  const actualCategory: Exclude<IdeaCategory, 'random'> = category === 'random'
    ? (['novel', 'childrens', 'comic'] as const)[Math.floor(Math.random() * 3)]
    : category;

  // Pick random examples from the pool
  const examplePool = IDEA_EXAMPLES[actualCategory];
  const randomExamples = examplePool[Math.floor(Math.random() * examplePool.length)];

  // Pick a random genre hint
  const genreHints = GENRE_HINTS[actualCategory];
  const randomGenre = genreHints[Math.floor(Math.random() * genreHints.length)];

  // Build category-specific prompt
  let categoryInstruction = '';
  switch (actualCategory) {
    case 'novel':
      categoryInstruction = `Generate a compelling ${randomGenre} novel idea with intriguing characters, high stakes, and an unexpected twist or hook that makes readers desperate to know what happens next.`;
      break;
    case 'childrens':
      categoryInstruction = `Generate a delightful children's ${randomGenre} idea that is whimsical and age-appropriate for ages 4 to 8, featuring lovable characters, a sense of wonder, and a gentle lesson woven naturally into the adventure.`;
      break;
    case 'comic':
      categoryInstruction = `Generate a ${randomGenre} comic or graphic novel idea that is visually dynamic, with memorable characters, sharp humor or thrilling action, and a premise that would look amazing illustrated panel by panel.

VARIETY IS ESSENTIAL - Create something fresh and different:
- Mix up the powers: gravity manipulation, sound waves, luck control, memory editing, plant growth, glass shaping, probability, magnetism, illusions, time echoes, emotion sensing, shadow puppetry, ink manipulation, dream walking, etc.
- Vary character types: not always teenagers, not always reluctant heroes, try older protagonists, anti-heroes, retired villains, ordinary people, etc.
- Different settings: underwater cities, space stations, 1920s noir, ancient empires, parallel dimensions, inside computers, etc.
- Unique visual hooks that would look amazing in comic panels`;
      break;
    case 'nonfiction':
      categoryInstruction = `Generate a compelling ${randomGenre} non-fiction book idea that promises to teach readers something valuable, share untold stories, or provide practical guidance they can apply to their lives. Focus on what makes this book unique and why readers would want to buy it.`;
      break;
    case 'screenplay':
      categoryInstruction = `Generate a compelling ${randomGenre} movie script idea with high concept hooks, strong visual storytelling potential, and characters under pressure who must make impossible choices.

SCREENPLAY ESSENTIALS:
- High stakes with a ticking clock or urgent deadline
- Strong protagonist with a clear goal and flaws that get in their way
- Antagonist or opposing force that creates escalating conflict
- Visual set pieces that would look incredible on screen
- Moral dilemmas and impossible choices
- Twists that reframe everything the audience thought they knew

VARIETY IS ESSENTIAL:
- Vary protagonist types: detectives, doctors, lawyers, journalists, soldiers, scientists, ordinary people in extraordinary circumstances
- Different scales: intimate two character dramas, ensemble thrillers, epic disasters
- Settings: courtrooms, hospitals, war zones, corporate boardrooms, isolated locations, major cities
- Time pressure: 24 hours, one week, real time, race against an event`;
      break;
    case 'adult_comic':
      categoryInstruction = `Generate a ${randomGenre} adult comic or graphic novel idea for mature readers (18+). Create a story with intense romantic tension, dangerous situations, and complex characters who are drawn to each other despite obstacles.

ADULT CONTENT - BE EDGY:
- Include profanity, crude humor, and adult dialogue naturally
- Morally complex characters with dark pasts, addictions, vendettas, or dangerous desires
- Intense physical attraction and sexual tension that builds throughout
- Violence, blood, and high-stakes danger - people get hurt or killed
- No sanitizing or softening - this is for ADULTS who want ADULT content
- Characters can be crude, cynical, manipulative, or morally gray

VARIETY IS ESSENTIAL:
- Character types: assassins, hitmen, mob bosses, corrupt cops, fallen angels, demons, vampires, etc.
- Settings: noir cities, criminal underworlds, supernatural realms, cyberpunk dystopias, war zones
- Power dynamics: rivals, enemies, captor and captive, forbidden affairs, dangerous obsessions
- Visual drama: blood, shadows, intimate moments, violent confrontations`;
      break;
  }

  const prompt = `${categoryInstruction}

IMPORTANT RULES:
- Write exactly 3 to 4 sentences, each one rich with specific details
- Never use dashes (like - or — or –) anywhere in your response
- End with a period
- Be wildly creative and completely original
- Include specific character names, settings, and stakes
- Make every sentence add new compelling information

MAXIMIZE VARIETY - Each generation should feel fresh:
- Vary protagonist ages, backgrounds, and personalities
- For visual stories: create distinct character designs that would look unique when illustrated
- The goal is that if someone generates 10 ideas, all 10 should feel completely different from each other
- Match character names to the story's setting and genre (Japanese names for manga, French names for European settings, etc.)

Example of the quality and length expected (but create something COMPLETELY DIFFERENT):
"${randomExamples[0]}"

Another example (create something TOTALLY DIFFERENT from both examples):
"${randomExamples[1]}"

Now write your unique ${actualCategory === 'childrens' ? "children's book" : actualCategory === 'nonfiction' ? 'non-fiction book' : actualCategory} idea (3-4 detailed sentences, no dashes, end with period):`;

  const maxRetries = 2; // Reduced retries for faster response

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await getGeminiFlashLight().generateContent(prompt);
    let idea = result.response.text().trim();

    // Remove any quotes or prefixes
    idea = idea.replace(/^["']|["']$/g, '').trim();
    idea = idea.replace(/^(Here's an idea:|Book idea:|Idea:)\s*/i, '').trim();

    // Remove any dashes (en dash, em dash, or hyphen used as dash)
    idea = idea.replace(/\s*[–—]\s*/g, ', ').replace(/\s+-\s+/g, ', ').trim();

    // Check if it's a complete sentence (minimum 100 chars for richer ideas)
    if (idea.length > 100 && /[.!?]$/.test(idea)) {
      return idea;
    }

    // If incomplete, try to salvage by finding the last complete sentence
    const sentences = idea.match(/[^.!?]*[.!?]/g);
    if (sentences && sentences.length >= 2) {
      const salvaged = sentences.join('').trim();
      if (salvaged.length > 100) {
        return salvaged;
      }
    }
  }

  // Fallback - pick from examples
  const fallbackPool = IDEA_EXAMPLES[actualCategory];
  const fallbackExamples = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
  return fallbackExamples[Math.floor(Math.random() * fallbackExamples.length)];
}

// NEW: Expand a simple idea into a full book plan
// For non-fiction: beginning = introduction, middle = main topics, ending = conclusion
export async function expandIdea(idea: string, hintBookType?: string): Promise<{
  title: string;
  genre: string;
  bookType: 'fiction' | 'non-fiction';
  premise: string;
  characters: { name: string; description: string }[];
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
  originalIdea: string; // Preserve user's full original input
}> {
  const isNonFiction = hintBookType === 'non-fiction';

  // Safety instructions to prevent output blocking
  const safetyGuidelines = `
CONTENT SAFETY - CRITICAL:
- Keep all content suitable for general audiences
- Avoid graphic violence descriptions - use implied or off-screen action
- No explicit sexual content - keep romance tasteful and implied
- No detailed drug use - reference consequences, not methods
- Transform dark themes into compelling drama without explicit details
- Focus on emotional stakes and character development over shock value
`;

  const fictionPrompt = `Create a book plan from this idea: "${idea}"

STRICT RULES:
- Output ONLY valid JSON, no other text
- The "premise" field should be a DETAILED summary (up to 300 words) - capture ALL key details from the user's idea
- Keep other string values under 150 words each
- Use exactly 2-3 characters, not more
- No special characters that break JSON
- Complete the entire JSON structure
- IMPORTANT: Preserve specific details, names, plot points, and unique elements from the user's idea in the premise
${safetyGuidelines}
CHARACTER VARIETY - Make each character unique and memorable:
- Use diverse names from various cultures (not just Western names)
- Each character should have a distinct visual appearance if this is a visual book
- Vary body types, ages, ethnicities, fashion styles
- For powers/abilities: be creative and specific, not generic "elemental" powers
- Character descriptions should paint a clear visual picture

JSON format:
{"title":"Title","genre":"mystery","bookType":"fiction","premise":"Detailed premise preserving user's vision (up to 300 words)","characters":[{"name":"Name","description":"Brief desc with visual details"}],"beginning":"Start","middle":"Middle","ending":"End","writingStyle":"commercial","targetWords":70000,"targetChapters":20}`;

  const nonFictionPrompt = `Create a NON-FICTION book plan from this idea: "${idea}"

This is for a non-fiction book (self-help, how-to, history, business, biography, educational, documentary, memoir).

IMPORTANT - Determine the type and structure:
- "premise" = A DETAILED description of what this book covers (up to 300 words) - preserve ALL specific topics, angles, and unique approaches from the user's idea
- "beginning" = The introduction/hook - what problem does this book solve or what will readers learn?
- "middle" = The main topics/sections of the book (list 4-6 key topics, comma-separated)
- "ending" = The conclusion/call-to-action - how will readers' lives be different after reading?
- "characters" = Empty array [] for non-fiction (no fictional characters)
- "genre" = One of: selfhelp, howto, business, history, biography, educational, documentary, memoir

STRICT RULES:
- Output ONLY valid JSON, no other text
- The "premise" field should be DETAILED (up to 300 words) - capture ALL key details
- Keep other string values under 150 words each
- Characters array MUST be empty []
- No special characters that break JSON
- Complete the entire JSON structure
- bookType MUST be "non-fiction"
${safetyGuidelines}
JSON format:
{"title":"Title","genre":"selfhelp","bookType":"non-fiction","premise":"Detailed description of the book's content (up to 300 words)","characters":[],"beginning":"Introduction hook","middle":"Topic 1, Topic 2, Topic 3, Topic 4","ending":"Conclusion and takeaways","writingStyle":"informative","targetWords":50000,"targetChapters":15}`;

  // Retry with sanitization if content policy blocks
  const maxRetries = 4;
  let lastError: Error | null = null;

  // Comprehensive list of words that may trigger content filters
  const sensitiveWordPatterns = [
    // Violence
    /\b(kill|murder|death|dead|dying|blood|bloody|bleed|violence|violent|weapon|gun|pistol|rifle|knife|stab|gore|brutal|torture|assault|attack|slaughter|massacre|execute|strangle|suffocate|decapitate|dismember|mutilate)\b/gi,
    // Sexual content
    /\b(sex|sexy|sexual|nude|naked|porn|pornographic|explicit|erotic|sensual|intimate|aroused|orgasm|genitals|breasts|buttocks|lingerie|seductive|provocative|lustful)\b/gi,
    // Drugs
    /\b(drug|drugs|cocaine|heroin|meth|methamphetamine|marijuana|cannabis|weed|overdose|inject|snort|addiction|addict|narcotic|opiate|fentanyl|ecstasy|lsd|mushrooms)\b/gi,
    // Hate/discrimination
    /\b(hate|racist|racism|sexist|sexism|discriminate|slur|bigot|extremist|supremacist)\b/gi,
    // Self-harm
    /\b(suicide|suicidal|self-harm|cutting|hanging|overdose)\b/gi,
    // Illegal activities
    /\b(illegal|crime|criminal|trafficking|smuggling|kidnap|ransom|hostage|terrorist|terrorism|bomb|explosive)\b/gi,
  ];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      let sanitizedIdea = idea;

      // Sanitize on retries with increasingly aggressive filtering
      if (attempt > 0) {
        console.log(`[ExpandIdea] Retry ${attempt}: Sanitizing idea to avoid content policy...`);

        // Apply all sensitive word patterns
        for (const pattern of sensitiveWordPatterns) {
          sanitizedIdea = sanitizedIdea.replace(pattern, '');
        }
        sanitizedIdea = sanitizedIdea.replace(/\s+/g, ' ').trim();

        // On attempt 2, also simplify the idea
        if (attempt >= 2) {
          // Extract just the core concept (first 150 chars, no sensitive context)
          const coreIdea = sanitizedIdea.substring(0, 150).replace(/[^\w\s.,'-]/g, '');
          sanitizedIdea = `A creative story concept: ${coreIdea}`;
        }

        // On attempt 3, make it extremely generic
        if (attempt >= 3) {
          // Extract only nouns and verbs, create a minimal prompt
          const words = sanitizedIdea.split(' ').filter(w => w.length > 3).slice(0, 10);
          sanitizedIdea = `An engaging story about: ${words.join(' ')}. Create a family-friendly interpretation.`;
        }
      }

      const sanitizedPrompt = isNonFiction
        ? nonFictionPrompt.replace(idea, sanitizedIdea)
        : fictionPrompt.replace(idea, sanitizedIdea);

      const result = await getGeminiFlash().generateContent(sanitizedPrompt);
      const response = result.response.text();

      const parsed = parseJSONFromResponse(response) as {
        title: string;
        genre: string;
        bookType: 'fiction' | 'non-fiction';
        premise: string;
        characters: { name: string; description: string }[];
        beginning: string;
        middle: string;
        ending: string;
        writingStyle: string;
        targetWords: number;
        targetChapters: number;
      };

      // Success! Return parsed result with original idea preserved
      if (attempt > 0) {
        console.log(`[ExpandIdea] SUCCESS on attempt ${attempt + 1} after sanitization`);
      }

      return {
        ...parsed,
        originalIdea: truncateToWordLimit(idea),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isSafetyError = errorMsg.includes('SAFETY') || errorMsg.includes('blocked') || errorMsg.includes('Prohibited Use') || errorMsg.includes('content policy');

      lastError = error as Error;

      if (isSafetyError && attempt < maxRetries - 1) {
        console.log(`[ExpandIdea] Content policy block on attempt ${attempt + 1}, retrying with sanitized prompt...`);
        continue; // Retry with sanitized version
      }

      // Log final failure details
      if (isSafetyError) {
        console.error(`[ExpandIdea] All ${maxRetries} attempts failed due to content policy. Original idea length: ${idea.length} chars`);
      }

      // Not a safety error or out of retries
      throw error;
    }
  }

  // If we got here, all retries failed - provide helpful user message
  throw new Error(`Your idea couldn't be processed due to content restrictions. Please try:\n- Removing any violent, explicit, or sensitive terms\n- Focusing on the story's themes rather than specific actions\n- Describing conflicts in general terms\n\nIf the issue persists, try a simpler description of your concept.`);
}

// Helper to build prompt for speech bubbles
export function buildSpeechBubblePrompt(dialogue: Array<{
  speaker: string;
  text: string;
  position: string;
  type?: string;
}>): string {
  if (!dialogue || dialogue.length === 0) return '';

  let prompt = `\n\nSPEECH BUBBLES INSTRUCTION (CRITICAL):\nThis is a comic panel. You MUST include ${dialogue.length} speech bubbles in the image containing EXACTLY the following text:\n`;

  dialogue.forEach((d, i) => {
    prompt += `${i + 1}. Speaker: "${d.speaker}" (Location: ${d.position})\n   Text inside bubble: "${d.text}"\n`;
  });

  prompt += `\nRULES FOR TEXT:\n- The text must be LEGIBLE, CLEAR, and correctly spelled.\n- Place bubbles near the speaking characters but DO NOT cover their faces.\n- Use standard comic book lettering style.\n- Ensure high contrast between text and bubble background.\n`;

  return prompt;
}

// Helper for picture book text (text at bottom)
export function buildPictureBookTextPrompt(text: string): string {
  if (!text) return '';

  // For picture books, we usually want the text distinct or we let the client render it.
  // But if we want it baked in (like a poster):
  return `\n\nTEXT INTEGRATION:\nAt the bottom of the image, include the following story text in a clear, readable storybook font:\n"${text}"\n\nEnsure the text is legible against the background (use a text box or gradient if needed).`;
}

// Scene description for visual books
export interface SceneDescription {
  location: string;
  description: string;
  characters: string[];
  characterActions: Record<string, string>;
  background: string;
  mood: string;
  cameraAngle: string;
}

// Dialogue for comic-style books
export interface DialogueEntry {
  speaker: string;
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  type?: 'speech' | 'thought' | 'shout';
}

// Panel layout types for comics
export type PanelLayout = 'splash' | 'two-panel' | 'three-panel' | 'four-panel';

// Enhanced outline chapter for visual books
export interface VisualChapter {
  number: number;
  title: string;
  text: string; // The actual page text (for prose style)
  summary: string;
  targetWords: number;
  dialogue?: DialogueEntry[]; // For comic/bubbles style
  scene: SceneDescription; // Detailed scene for image generation
  panelLayout?: PanelLayout; // For comics: how many panels on this page
}

// Step 1: Generate a complete narrative story FIRST
// This ensures the story is coherent before breaking into pages
async function generateVisualStoryNarrative(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  originalIdea?: string;
  characters: { name: string; description: string }[];
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  targetChapters: number;
  dialogueStyle: 'prose' | 'bubbles';
  contentRating?: ContentRating;
}): Promise<string> {
  const isComicStyle = bookData.dialogueStyle === 'bubbles';
  const targetWords = bookData.targetChapters * (isComicStyle ? 30 : 50); // Shorter for comics

  // Get content rating instructions
  const contentGuidelines = getContentRatingInstructions(bookData.contentRating || (isComicStyle ? 'general' : 'childrens'));

  // Detect language from title and premise
  const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + bookData.premise);

  const characterList = bookData.characters.map(c => `- ${c.name}: ${c.description}`).join('\n');

  const originalIdeaSection = bookData.originalIdea
    ? `\nORIGINAL AUTHOR VISION (incorporate these specific details):\n${bookData.originalIdea}\n`
    : '';

  const prompt = `You are a master storyteller. Write a complete, engaging ${isComicStyle ? 'action-packed' : 'heartwarming'} short story.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
${contentGuidelines}
${originalIdeaSection}

STORY REQUIREMENTS:
Title: "${bookData.title}"
Genre: ${bookData.genre}
Premise: ${bookData.premise}

CHARACTERS:
${characterList}

STORY STRUCTURE (follow this arc):
- Beginning: ${bookData.beginning}
- Middle: ${bookData.middle}
- Ending: ${bookData.ending}

CRITICAL WRITING GUIDELINES:
1. Write a COMPLETE story with a clear beginning, middle, climax, and resolution
2. Show character growth and emotional moments
3. Include specific dialogue exchanges between characters (at least 5-8 distinct dialogue moments)
4. Create VISUAL action scenes that can be illustrated (describe what characters DO, not just think)
5. Vary the locations/settings throughout the story (at least 3-4 different places)
6. Build tension and release it satisfyingly
7. Make each scene distinct and memorable
8. NO repetitive phrases or descriptions
9. Every paragraph should move the story forward
10. Include sensory details (sights, sounds, feelings)

${isComicStyle ? `
COMIC-STYLE REQUIREMENTS:
- More action, less internal monologue
- Snappy, punchy dialogue (each line under 15 words)
- Visual comedy and dramatic moments
- Clear action beats that translate to panels
- Sound effects where appropriate (CRASH! WHOOSH! etc.)
` : `
PICTURE BOOK REQUIREMENTS:
- Gentle, flowing prose suitable for reading aloud
- Rhythmic language when appropriate
- Clear emotional beats for young readers
- Wonder and discovery moments
- Satisfying, affirming ending
`}

TARGET LENGTH: ${targetWords}-${targetWords + 200} words (this will be broken into ${bookData.targetChapters} pages)

Write the complete story now. Make it engaging, unique, and memorable. Include actual dialogue with quotation marks.`;

  const result = await getGeminiPro().generateContent(prompt);
  const story = result.response.text().trim();

  console.log(`Generated narrative story: ${story.split(/\s+/).length} words`);
  return story;
}

// Generate outline for visual books (picture books, comics)
// Uses a TWO-STEP approach:
// 1. First generates a complete narrative story
// 2. Then breaks that story into pages with scenes and dialogue
export async function generateIllustratedOutline(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  originalIdea?: string;
  characters: { name: string; description: string }[];
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
  dialogueStyle: 'prose' | 'bubbles';
  contentRating?: ContentRating; // Content maturity level
  characterVisualGuide?: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
    }>;
  };
}): Promise<{
  chapters: VisualChapter[];
}> {
  // STEP 1: Generate a complete narrative story FIRST
  // This ensures the story is coherent, engaging, and well-structured
  console.log('[IllustratedOutline] Step 1: Generating complete narrative story...');
  let narrativeStory: string;
  try {
    narrativeStory = await generateVisualStoryNarrative({
      title: bookData.title,
      genre: bookData.genre,
      bookType: bookData.bookType,
      premise: bookData.premise,
      originalIdea: bookData.originalIdea,
      characters: bookData.characters,
      beginning: bookData.beginning,
      middle: bookData.middle,
      ending: bookData.ending,
      writingStyle: bookData.writingStyle,
      targetChapters: bookData.targetChapters,
      dialogueStyle: bookData.dialogueStyle,
      contentRating: bookData.contentRating,
    });
    console.log('[IllustratedOutline] Step 1 complete - story generated');
  } catch (storyError) {
    console.error('[IllustratedOutline] Failed to generate narrative story:', storyError);
    // Fall back to old behavior if story generation fails
    narrativeStory = '';
  }

  // STEP 2: Break the story into pages with scenes and dialogue
  console.log('[IllustratedOutline] Step 2: Breaking story into pages with scenes...');

  // Detect language from title and premise
  const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + bookData.premise);

  const isComicStyle = bookData.dialogueStyle === 'bubbles';
  const wordsPerPage = Math.ceil(bookData.targetWords / bookData.targetChapters);

  // Get content rating instructions
  const contentGuidelines = getContentRatingInstructions(bookData.contentRating || (isComicStyle ? 'general' : 'childrens'));

  const dialogueInstructions = isComicStyle
    ? `
For each page, include "dialogue" array with speech bubbles:
- 1-4 dialogue entries per page (short, punchy comic dialogue)
- Each entry has: speaker (character name), text (the speech), position (where on image), type (speech/thought/shout)
- Positions: "top-left", "top-right", "bottom-left", "bottom-right", "top-center", "bottom-center"
- Comic dialogue is SHORT - max 15 words per bubble

PANEL LAYOUTS - IMPORTANT FOR COMICS:
Each page should specify a "panelLayout" to vary the visual pacing:
- "splash" - Full page single image (use for dramatic moments: 4-5 pages)
- "two-panel" - Split into 2 panels showing a sequence (most common: 8-10 pages)
- "three-panel" - 3 panels showing action/reaction (good for dialogue: 5-6 pages)
- "four-panel" - 4 panels for rapid sequences (action scenes: 3-4 pages)

For multi-panel pages, the scene description should describe what happens ACROSS all panels in sequence.
Example: "Panel 1: Hero spots danger. Panel 2: Hero leaps into action. Panel 3: Villain turns in surprise."
`
    : `
For each page, the "text" field contains the prose that appears under/around the image.
Keep text short and age-appropriate (${wordsPerPage} words average per page).
`;

  // Retry logic for truncation and safety blocks (prompt built inside loop with sanitized data)
  const maxAttempts = 3;
  let lastError: Error | null = null;
  let useSafeMode = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`generateIllustratedOutline: attempt ${attempt}/${maxAttempts}${useSafeMode ? ' (SAFE MODE)' : ''}`);

      // Sanitize INPUT data on retries (not just prompt instructions)
      let sanitizedBookData = bookData;
      if (useSafeMode) {
        console.log(`[IllustratedOutline] Retry ${attempt}: Sanitizing book data to avoid content policy...`);

        // Sanitization function - removes potentially offensive words
        const sanitizeText = (text: string, aggressive: boolean = false): string => {
          let sanitized = text
            // Violence & weapons
            .replace(/\b(kill|murder|death|dead|die|dying|blood|bloody|violence|violent|weapon|gun|knife|sword|blade|gore|brutal|brutally|torture|wound|stab|shoot|shooting|shot)\b/gi, '')
            // Sexual content
            .replace(/\b(sex|sexy|nude|naked|porn|explicit|erotic|sensual|seductive|aroused)\b/gi, '')
            // Drugs & substances
            .replace(/\b(drug|cocaine|heroin|meth|marijuana|weed|addict)\b/gi, '')
            // Clean up extra whitespace
            .replace(/\s+/g, ' ')
            .trim();

          // More aggressive on later attempts
          if (aggressive) {
            sanitized = sanitized.substring(0, 200) + '...';
          }

          return sanitized;
        };

        const isAggressive = attempt > 2;

        sanitizedBookData = {
          ...bookData,
          premise: sanitizeText(bookData.premise, isAggressive),
          beginning: sanitizeText(bookData.beginning, isAggressive),
          middle: sanitizeText(bookData.middle, isAggressive),
          ending: sanitizeText(bookData.ending, isAggressive),
          originalIdea: bookData.originalIdea ? sanitizeText(bookData.originalIdea, isAggressive) : undefined,
          characters: bookData.characters.map(c => ({
            name: c.name,
            description: sanitizeText(c.description, isAggressive),
          })),
          characterVisualGuide: bookData.characterVisualGuide ? {
            characters: bookData.characterVisualGuide.characters.map(c => ({
              name: c.name,
              physicalDescription: sanitizeText(c.physicalDescription, isAggressive),
              clothing: sanitizeText(c.clothing, isAggressive),
              distinctiveFeatures: sanitizeText(c.distinctiveFeatures, isAggressive),
            })),
          } : undefined,
        };
      }

      // Rebuild prompt with sanitized data
      const characterRefSanitized = sanitizedBookData.characterVisualGuide
        ? sanitizedBookData.characterVisualGuide.characters.map(c =>
          `${c.name}: ${c.physicalDescription}. Wears: ${c.clothing}. Distinct: ${c.distinctiveFeatures}`
        ).join('\n')
        : sanitizedBookData.characters.map(c => `${c.name}: ${c.description}`).join('\n');

      // Include the narrative story if available
      const narrativeSection = narrativeStory
        ? `
THE COMPLETE STORY (break this into ${sanitizedBookData.targetChapters} pages):
---
${narrativeStory}
---

YOUR TASK: Break the above story into exactly ${sanitizedBookData.targetChapters} pages. Each page should:
1. Cover a portion of the story above - preserve the dialogue and action from the story
2. The "text" field should contain that page's portion of the narrative (for prose) or narration (for comics)
3. The "dialogue" field should use the actual dialogue from the story
4. Scene descriptions should match what's happening in that part of the story

CRITICAL: Do NOT invent new story content. Break down and adapt the story above into pages.
`
        : '';

      let currentPrompt = `You are breaking a story into page-by-page format for an illustrated ${isComicStyle ? 'comic/graphic story' : 'picture book'}.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
${contentGuidelines}
${narrativeSection}

BOOK DETAILS:
- Title: "${sanitizedBookData.title}"
- Genre: ${sanitizedBookData.genre}
- Total pages: ${sanitizedBookData.targetChapters}
${!narrativeStory ? `
- Premise: ${sanitizedBookData.premise}
- Beginning: ${sanitizedBookData.beginning}
- Middle: ${sanitizedBookData.middle}
- Ending: ${sanitizedBookData.ending}
` : ''}

CHARACTERS (use these EXACT visual descriptions for consistency):
${characterRefSanitized}

⚠️ COPYRIGHT PROTECTION - CHARACTER NAMES:
CRITICAL: If ANY character names match famous characters from existing media, YOU MUST RENAME THEM to completely original names.
Prohibited names include: Superman, Batman, Spider-Man, Velma, Scooby, Mickey, SpongeBob, Naruto, Harry Potter, etc.
If found, rename to original names (e.g., "Velma" → "Sarah Martinez").

⚠️ CRITICAL PAGE COUNT REQUIREMENT ⚠️
You MUST create EXACTLY ${sanitizedBookData.targetChapters} pages - no more, no less.
- Do NOT create ${sanitizedBookData.targetChapters - 1} pages
- Do NOT create ${sanitizedBookData.targetChapters + 1} pages
- Create PRECISELY ${sanitizedBookData.targetChapters} pages

The output MUST have exactly ${sanitizedBookData.targetChapters} items in the "chapters" array.
Each page needs BOTH the text/dialogue AND a scene description.
${narrativeStory ? '\nPRESERVE the story, dialogue, and emotional beats from the narrative above.' : ''}

${dialogueInstructions}

COPYRIGHT PROTECTION - VISUAL CONTENT:
- Create 100% ORIGINAL scene descriptions - NEVER reference existing copyrighted characters, shows, movies, comics, or anime
- Even if you renamed characters above, describe completely UNIQUE visual designs and poses (NO iconic costumes, logos, or trademark elements)
- DO NOT describe copyrighted visual elements (specific costumes, logos, signature poses, iconic character designs from existing media)
- DO NOT use settings, locations, or props that are distinctive to existing copyrighted works
- Focus on original character designs, unique settings, and original compositions

For EVERY page's "scene", provide:
- location: The specific place/setting (e.g., "castle kitchen", "forest clearing", "city rooftop") - VARY THIS!
- description: What's happening in this specific moment (1-2 sentences, UNIQUE to this page)
- characters: Array of character names appearing in this scene (don't include protagonist on every page!)
- characterActions: Object mapping each character to their specific action/pose/expression in THIS scene
- background: Environmental details, objects, atmosphere, time of day
- mood: The emotional tone (tense, joyful, mysterious, peaceful, exciting, etc.)
- cameraAngle: How to "shoot" this scene - be specific! ("extreme close-up of eyes", "wide establishing shot", "low angle looking up", "bird's eye view", "over-shoulder shot")

CRITICAL RULES FOR VISUAL VARIETY:

LOCATIONS & SETTINGS:
1. Use AT LEAST 4-6 DIFFERENT LOCATIONS throughout the story (not the same room/place!)
2. Each location should appear only 2-3 times maximum
3. Locations can include: different rooms, outdoor areas, vehicles, fantasy spaces, etc.
4. Even within the same location, change the specific area (different corner, angle, time of day)

CHARACTER VARIETY:
5. The protagonist should NOT appear in every single image - show supporting characters alone sometimes
6. At least 3-4 pages should focus on OTHER characters without the main hero
7. Create scenes with different character groupings (solo, pairs, groups)
8. Show characters interacting with the environment, not just each other

VISUAL COMPOSITION:
9. Each page MUST be visually distinct - different actions, poses, and compositions
10. Vary camera angles dramatically: close-ups, wide shots, bird's eye, worm's eye, over-shoulder
11. Change character positions in frame (left, right, center, foreground, background)
12. Include dynamic actions: running, jumping, reaching, fighting, hiding, discovering, etc.

STORY PACING:
13. Show PROGRESSION - don't just describe states, show active moments
14. Include establishing shots (environment with small characters)
15. Include intimate moments (close-ups of faces/hands)
16. Avoid repetitive staging - no "character standing and talking" on multiple pages

CRITICAL - CONCISE OUTPUT:
17. Keep ALL descriptions SHORT (1-2 sentences max per field)
18. Scene descriptions: MAX 20 words
19. Character actions: MAX 10 words per character
20. Background: MAX 15 words
21. Do NOT pad with unnecessary words - be direct and specific
22. Complete the ENTIRE JSON structure - do not stop mid-response
23. Your "chapters" array MUST contain EXACTLY ${sanitizedBookData.targetChapters} objects

Output ONLY valid JSON with EXACTLY ${sanitizedBookData.targetChapters} chapters:
{
  "chapters": [
    {
      "number": 1,
      "title": "Page Title",
      "text": "${isComicStyle ? 'Minimal narration if needed' : 'The prose text for this page'}",
      "summary": "Brief summary of what happens",
      "targetWords": ${wordsPerPage},
      ${isComicStyle ? `"panelLayout": "two-panel",
      "dialogue": [
        {"speaker": "Character", "text": "Short speech!", "position": "top-left", "type": "speech"}
      ],` : ''}
      "scene": {
        "location": "Specific place (castle courtyard, dark alley, bedroom, etc.)",
        "description": "What's happening - action-focused, unique to this page",
        "characters": ["Only characters IN THIS scene"],
        "characterActions": {
          "Character1": "dynamic action: leaping, crouching, shouting, laughing",
          "Character2": "different action with emotion"
        },
        "background": "Time of day, weather, objects, atmosphere",
        "mood": "emotional tone",
        "cameraAngle": "specific: extreme close-up, wide shot, low angle, over-shoulder, bird's eye"
      }
    }
  ]
}`;

      if (useSafeMode) {
        currentPrompt += `\n\nIMPORTANT SAFETY OVERRIDE: The previous attempt was blocked by content safety filters. You MUST write family-friendly scene descriptions. Use euphemisms and focus on atmosphere rather than graphic details. Keep all content suitable for a general audience.`;
      }

      const result = await getGeminiPro().generateContent(currentPrompt);
      const response = result.response.text();

      // Log finish reason for debugging
      const candidate = result.response.candidates?.[0];
      if (candidate?.finishReason) {
        console.log(`Finish reason: ${candidate.finishReason}`);
        if (candidate.finishReason === 'MAX_TOKENS') {
          console.warn('Response hit MAX_TOKENS limit - may be truncated');
        }
      }

      return parseJSONFromResponse(response) as {
        chapters: VisualChapter[];
      };
    } catch (error) {
      lastError = error as Error;
      const errorMsg = lastError.message || '';

      // Check for PROHIBITED_CONTENT or safety blocks
      const isSafetyBlock = errorMsg.includes('PROHIBITED_CONTENT') ||
        errorMsg.includes('safety') ||
        errorMsg.includes('blocked');

      // Retry on truncation or safety errors
      if ((errorMsg.includes('JSON_TRUNCATED') || isSafetyBlock) && attempt < maxAttempts) {
        console.log(`Error detected: ${isSafetyBlock ? 'SAFETY BLOCK' : 'TRUNCATION'}, retrying (attempt ${attempt + 1}/${maxAttempts})...`);

        if (isSafetyBlock) {
          useSafeMode = true;
          console.log('Switching to SAFE MODE for retry to avoid prohibited content.');
        }

        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Failed to generate illustrated outline after retries');
}

export async function generateOutline(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  originalIdea?: string;
  characters: { name: string; description: string }[];
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
}): Promise<{
  chapters: {
    number: number;
    title: string;
    summary: string;
    pov?: string;
    targetWords: number;
  }[];
}> {
  // Try with original content first, then with sanitized content if blocked
  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const useSanitized = attempt > 0;

    // Sanitize content on retry
    const premise = useSanitized ? sanitizeContentForSafety(bookData.premise) : bookData.premise;
    const originalIdea = useSanitized && bookData.originalIdea
      ? sanitizeContentForSafety(bookData.originalIdea)
      : bookData.originalIdea;
    const beginning = useSanitized ? sanitizeContentForSafety(bookData.beginning) : bookData.beginning;
    const middle = useSanitized ? sanitizeContentForSafety(bookData.middle) : bookData.middle;
    const ending = useSanitized ? sanitizeContentForSafety(bookData.ending) : bookData.ending;
    const characters = useSanitized
      ? bookData.characters.map(c => ({
          name: c.name,
          description: sanitizeContentForSafety(c.description)
        }))
      : bookData.characters;

    if (useSanitized) {
      console.log('[Outline] Retrying with sanitized content after safety block...');
    }

    // Detect language from title and premise
    const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + premise);

    // Include original idea if provided (gives AI more context from user's vision)
    const originalIdeaSection = originalIdea
      ? `\nORIGINAL AUTHOR VISION (preserve these specific details, names, and plot points):\n${originalIdea}\n`
      : '';

    const safetyNote = useSanitized
      ? '\n\nNOTE: Write a tasteful, mature story that focuses on emotional connections and character development. Avoid graphic or explicit descriptions.\n'
      : '';

    const prompt = `You are a professional book outliner. Create a detailed chapter-by-chapter outline.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
${originalIdeaSection}
BOOK DETAILS:
- Title: ${bookData.title}
- Genre: ${bookData.genre}
- Type: ${bookData.bookType}
- Premise: ${premise}
- Characters: ${JSON.stringify(characters)}
- Beginning: ${beginning}
- Key Plot Points/Middle: ${middle}
- Ending: ${ending}
- Writing Style: ${bookData.writingStyle}
- Target Length: ${bookData.targetWords} words (${bookData.targetChapters} chapters)
${safetyNote}
IMPORTANT: If an "Original Author Vision" is provided above, ensure the outline incorporates all the specific details, character names, plot elements, and unique ideas from it. The author's original vision takes priority.

WRITING QUALITY NOTES:
- Each chapter should have a distinct tone and pacing - avoid repetitive structure
- Vary chapter openings - never start multiple chapters the same way
- Use ONLY the characters provided - do not invent major characters

Create an outline with exactly ${bookData.targetChapters} chapters. For each chapter provide:
1. Chapter number
2. Chapter title (engaging, evocative)
3. 2-3 sentence summary of what happens
4. Which characters appear (for POV tracking)
5. Approximate word count target (distribute ${bookData.targetWords} words across chapters)

Output ONLY valid JSON in this exact format (targetWords should be approximately ${Math.round(bookData.targetWords / bookData.targetChapters)} per chapter):
{
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title Here",
      "summary": "2-3 sentence summary of events",
      "pov": "Main character name for this chapter",
      "targetWords": ${Math.round(bookData.targetWords / bookData.targetChapters)}
    }
  ]
}`;

    try {
      const result = await getGeminiPro().generateContent(prompt);
      const response = result.response.text();

      return parseJSONFromResponse(response) as {
        chapters: {
          number: number;
          title: string;
          summary: string;
          pov?: string;
          targetWords: number;
        }[];
      };
    } catch (error) {
      lastError = error as Error;
      if (isSafetyBlockError(error) && attempt < maxAttempts - 1) {
        console.log('[Outline] Safety block detected, will retry with sanitized content');
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Failed to generate outline');
}

// Generate outline for non-fiction books (topic-based structure)
export async function generateNonFictionOutline(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  originalIdea?: string;
  beginning: string;  // Introduction/hook
  middle: string;     // Main topics (comma-separated)
  ending: string;     // Conclusion/takeaways
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
}): Promise<{
  chapters: {
    number: number;
    title: string;
    summary: string;
    keyPoints: string[];
    targetWords: number;
  }[];
}> {
  // Try with original content first, then with sanitized content if blocked
  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const useSanitized = attempt > 0;

    // Sanitize content on retry
    const premise = useSanitized ? sanitizeContentForSafety(bookData.premise) : bookData.premise;
    const originalIdea = useSanitized && bookData.originalIdea
      ? sanitizeContentForSafety(bookData.originalIdea)
      : bookData.originalIdea;
    const beginning = useSanitized ? sanitizeContentForSafety(bookData.beginning) : bookData.beginning;
    const middle = useSanitized ? sanitizeContentForSafety(bookData.middle) : bookData.middle;
    const ending = useSanitized ? sanitizeContentForSafety(bookData.ending) : bookData.ending;

    if (useSanitized) {
      console.log('[NF Outline] Retrying with sanitized content after safety block...');
    }

    // Detect language from title and premise
    const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + premise);

    // Parse the main topics from the middle field
    const mainTopics = middle.split(',').map(t => t.trim()).filter(t => t);

    // Include original idea if provided (gives AI more context from user's vision)
    const originalIdeaSection = originalIdea
      ? `\nORIGINAL AUTHOR VISION (preserve these specific details, topics, and insights):\n${originalIdea}\n`
      : '';

    const safetyNote = useSanitized
      ? '\n\nNOTE: Write tasteful, educational content that focuses on practical information. Avoid graphic or explicit descriptions.\n'
      : '';

    const prompt = `You are a professional non-fiction book outliner. Create a detailed chapter-by-chapter outline.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
${originalIdeaSection}
BOOK DETAILS:
- Title: ${bookData.title}
- Genre: ${bookData.genre} (non-fiction)
- Premise: ${premise}
- Introduction Hook: ${beginning}
- Main Topics to Cover: ${mainTopics.join(', ')}
- Conclusion/Takeaways: ${ending}
- Writing Style: ${bookData.writingStyle}
- Target Length: ${bookData.targetWords} words (${bookData.targetChapters} chapters)
${safetyNote}
Create an outline with exactly ${bookData.targetChapters} chapters for this NON-FICTION book.

IMPORTANT: If an "Original Author Vision" is provided above, ensure the outline incorporates all the specific topics, insights, examples, and unique perspectives from it. The author's original vision takes priority.

STRUCTURE GUIDELINES:
- Chapter 1 should be an Introduction that hooks the reader and previews what they'll learn
- Middle chapters should cover the main topics logically, building on each other
- Final chapter should be a Conclusion with actionable takeaways
- Each chapter should have a clear learning objective

ANTI-AI WRITING NOTES:
- Do NOT use "Have you ever..." to open any chapters - this is the #1 AI tell
- Each chapter must have a DIFFERENT opening style: fact, anecdote, bold statement, scene, etc.
- Case study names must be DIVERSE and UNIQUE - never reuse names across chapters
- Avoid generic names like Marcus, Sarah, David, Mark - use culturally diverse names

For each chapter provide:
1. Chapter number
2. Chapter title (clear, descriptive, benefit-focused)
3. 2-3 sentence summary of what this chapter teaches
4. 3-5 key points or lessons covered in the chapter
5. Approximate word count target (distribute ${bookData.targetWords} words across chapters)

Output ONLY valid JSON in this exact format (targetWords should be approximately ${Math.round(bookData.targetWords / bookData.targetChapters)} per chapter):
{
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title Here",
      "summary": "What readers will learn in this chapter",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
      "targetWords": ${Math.round(bookData.targetWords / bookData.targetChapters)}
    }
  ]
}`;

    try {
      const result = await getGeminiPro().generateContent(prompt);
      const response = result.response.text();

      return parseJSONFromResponse(response) as {
        chapters: {
          number: number;
          title: string;
          summary: string;
          keyPoints: string[];
          targetWords: number;
        }[];
      };
    } catch (error) {
      lastError = error as Error;
      if (isSafetyBlockError(error) && attempt < maxAttempts - 1) {
        console.log('[NF Outline] Safety block detected, will retry with sanitized content');
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Failed to generate non-fiction outline');
}

export async function generateChapter(data: {
  title: string;
  genre: string;
  bookType: string;
  writingStyle: string;
  outline: object;
  storySoFar: string;
  characterStates: object;
  chapterNumber: number;
  chapterTitle: string;
  chapterPlan: string;
  chapterPov?: string;
  targetWords: number;
  chapterFormat: string;
  chapterKeyPoints?: string[]; // For non-fiction chapters
  contentRating?: ContentRating; // Content maturity level
  totalChapters?: number; // Total chapters in book (for "The End" on last chapter)
}): Promise<string> {
  const isLastChapter = data.totalChapters && data.chapterNumber >= data.totalChapters;
  const formatInstruction = {
    numbers: `Start with EXACTLY "Chapter ${data.chapterNumber}" on its own line, then begin the content. Do NOT repeat or rephrase the chapter heading.`,
    titles: `Start with EXACTLY "${data.chapterTitle}" on its own line, then begin the content. Do NOT repeat or rephrase the title.`,
    both: `Start with EXACTLY "Chapter ${data.chapterNumber}: ${data.chapterTitle}" on its own line, then begin the content. Do NOT repeat or rephrase the heading.`,
    pov: `Start with EXACTLY "${data.chapterPov?.toUpperCase() || 'NARRATOR'}" then "Chapter ${data.chapterNumber}" on the next line, then begin content. Do NOT repeat headings.`,
  }[data.chapterFormat] || `Start with EXACTLY "Chapter ${data.chapterNumber}: ${data.chapterTitle}" on its own line, then begin the content. Do NOT repeat or rephrase the heading.`;

  // Detect language from title to ensure content matches input language
  const languageInstruction = detectLanguageInstruction(data.title);

  // Check if this is a non-fiction book
  const isNonFiction = data.bookType === 'non-fiction';

  let prompt: string;

  if (isNonFiction) {
    // Non-fiction prompt - educational, informative style with strict quality requirements
    const keyPointsSection = data.chapterKeyPoints && data.chapterKeyPoints.length > 0
      ? `\nKEY POINTS TO COVER:\n${data.chapterKeyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
      : '';

    prompt = `You are an expert author writing a professional ${data.genre} non-fiction book in ${data.writingStyle} style.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
BOOK: "${data.title}"

BOOK OUTLINE:
${JSON.stringify(data.outline, null, 2)}

CONTENT SO FAR:
${data.storySoFar || 'This is chapter 1, the beginning of the book.'}

WRITE CHAPTER ${data.chapterNumber}: "${data.chapterTitle}"
Topic: ${data.chapterPlan}
${keyPointsSection}

${formatInstruction}

=== MANDATORY WRITING STANDARDS ===

CONTENT REQUIREMENTS:
- Start with a VARIED hook. NEVER use "Have you ever..." - this is AI-detectable
- Chapter opening hooks should rotate through: surprising fact, brief anecdote, bold statement, vivid scene, counter-intuitive claim, or a specific example
- Explain concepts clearly before using technical terms
- Include 1-2 SPECIFIC real-world examples with concrete details (names, dates, places when possible)
- Case studies must have UNIQUE names - never reuse Marcus, Sarah, David, or Mark
- Provide actionable takeaways readers can apply immediately
- End with a transition that doesn't always follow "In the next chapter, we will..."

PROSE QUALITY:
- Write in clear, accessible language. Avoid jargon unless explained
- Use "you" to address readers directly, but don't overuse "You might wonder..."
- Vary paragraph length. Mix short punchy paragraphs with longer explanatory ones
- Use subheadings sparingly (only if chapter is very long)
- Complete all sentences properly. No fragments or garbled text
- SPECIFIC DETAILS matter: "a 2019 Stanford study" is better than "research shows"

AVOID THESE AI PATTERNS (CRITICAL):
- NEVER start chapters with "Have you ever..." - this is the #1 AI tell
- NEVER use the same chapter opening structure twice in the book
- Avoid formulaic case studies: "Consider the case of [Name]. [Name] was a [professional] who..."
- Don't use the same physical descriptions repeatedly ("shoulders dropped", "heart rate slowed")
- Vary your transition phrases - don't always use "In the next chapter..."
- Avoid repetitive 3-part structures: "It is not X. It is Y. It is Z."

AVOID THESE ERRORS:
- Making up statistics, studies, or fake research
- Vague claims without examples: "Research shows..." (which research?)
- Repeating the same point multiple ways without adding value
- Excessive bullet points. Integrate information into flowing prose
- Starting multiple paragraphs with the same word
- Using the same character names across different case studies

STRUCTURE:
- This is chapter ${data.chapterNumber} of ${(data.outline as { chapters?: unknown[] })?.chapters?.length || 15}
- Cover the key points thoroughly but don't repeat information from earlier chapters
- Each paragraph should add new information or a new perspective

FORBIDDEN:
- Em dashes (—) or en dashes (–). Use commas or periods instead
- "[END]", "[THE END]", "END OF CHAPTER" markers
- Author notes, meta-commentary, or markdown formatting
- Incomplete words or typos
- Citing specific authors/books unless you're certain they exist
${isLastChapter ? '' : '- "The End" - this is NOT the final chapter'}

WORD LIMIT: ${data.targetWords} words MAXIMUM. This is a hard limit. Cover the topic thoroughly within this limit.
${isLastChapter ? `
FINAL CHAPTER REQUIREMENT:
This is the FINAL chapter. End the book with "The End" on its own line at the very end. Do not use any other variation like "THE END" or "[The End]".` : ''}
OUTPUT: The chapter text only, starting with the chapter heading.`;
  } else {
    // Fiction prompt - narrative style with strict quality requirements
    // Get content rating instructions (defaults to general if not specified)
    const contentGuidelines = getContentRatingInstructions(data.contentRating || 'general');

    prompt = `You are a professional novelist writing publishable ${data.genre} fiction in ${data.writingStyle} style.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
BOOK: "${data.title}"
${contentGuidelines}

STORY OUTLINE:
${JSON.stringify(data.outline, null, 2)}

STORY SO FAR:
${data.storySoFar || 'This is chapter 1, the beginning of the story.'}

CHARACTER STATES:
${JSON.stringify(data.characterStates || {}, null, 2)}

WRITE CHAPTER ${data.chapterNumber}: "${data.chapterTitle}"
Plan: ${data.chapterPlan}
${data.chapterPov ? `POV: ${data.chapterPov}` : ''}

${formatInstruction}

=== MANDATORY WRITING STANDARDS ===

DIALOGUE FORMAT (REQUIRED):
- Every line of spoken dialogue MUST be enclosed in quotation marks
- CORRECT: "I don't understand," Maria said, shaking her head.
- WRONG: I don't understand, Maria said.
- New speaker = new paragraph
- Use "said" and "asked" primarily. Avoid fancy tags like "exclaimed" or "declared"
- Include brief action beats: She crossed her arms. "That's not what I meant."

PROSE QUALITY:
- Write clean, professional prose. No purple prose or overwrought descriptions
- SHOW emotions through actions: "Her hands trembled" not "She was terrified"
- Vary sentence length. Mix short punchy sentences with longer flowing ones
- Be specific: "oak door" not "the door", "1967 Mustang" not "old car"
- Avoid repeating distinctive words within 2-3 sentences

SENTENCE VARIETY (CRITICAL - THIS IS MANDATORY):
- NEVER start more than 2 consecutive sentences with the same word
- Vary sentence starters aggressively: use dependent clauses, participial phrases, prepositional phrases
- BAD: "She walked in. She sat down. She opened her laptop. She began typing."
- GOOD: "She walked in. After sitting down, she opened her laptop and began typing."
- BAD: "The room was dark. The air was cold. The walls were bare."
- GOOD: "The room was dark. Cold air seeped through the walls, bare and unwelcoming."
- Limit "She/He/It/The" sentence starters to max 20% of sentences in any paragraph
- Use action, setting, or dependent clauses to start sentences: "Crossing the room, she...", "Without warning, the...", "As the door opened, he..."

PRONOUN USAGE:
- After first mention in a scene, use "he/she/they" instead of character names
- BUT vary sentence structure so you're not starting every sentence with pronouns
- Embed pronouns mid-sentence: "The screen flickered as she scrolled down"
- Character names should appear roughly once every 100-150 words for clarity

AVOID THESE COMMON ERRORS:
- Clichés: "heart pounded", "blood ran cold", "time stood still"
- Repetitive patterns: "She looked", "She thought", "She reached", "It was"
- Starting consecutive sentences with the same word
- Excessive metaphors. One per paragraph maximum
- Adjective stacking: "the dark, gloomy, ominous shadows"

STRUCTURE:
- This is chapter ${data.chapterNumber} of ${(data.outline as { chapters?: unknown[] })?.chapters?.length || 20}. Do NOT resolve major plot threads
- End at a natural scene break, not a forced cliffhanger
- Characters must act logically based on their established traits
- Complete all sentences. No fragments or garbled text

FORBIDDEN:
- Em dashes (—) or en dashes (–). Use commas or periods instead
- "[END]", "[THE END]", "END OF CHAPTER" markers
- Author notes, commentary, or markdown
- Inventing major characters not in the outline
- Incomplete words or typos like "susped" instead of "suspended"
${isLastChapter ? '' : '- "The End" - this is NOT the final chapter'}

WORD LIMIT: ${data.targetWords} words MAXIMUM. This is a hard limit. Write a complete, satisfying chapter within this limit. Do not pad with unnecessary description.
${isLastChapter ? `
FINAL CHAPTER REQUIREMENT:
This is the FINAL chapter. End the book with "The End" on its own line at the very end. Do not use any other variation like "THE END" or "[The End]".` : ''}
OUTPUT: The chapter text only, starting with the chapter heading.`;
  }

  // Try with progressively more aggressive sanitization (4 attempts)
  // Attempt 1: Original content
  // Attempt 2: Sanitized content with mature note
  // Attempt 3: Ultra-sanitized with family-friendly note
  // Attempt 4: Fallback - generate a safe bridge chapter from summary only
  const maxAttempts = 4;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let currentPrompt = prompt;

    if (attempt === 1) {
      // First retry: Basic sanitization
      console.log(`[Chapter ${data.chapterNumber}] Attempt 2: Retrying with sanitized content...`);
      currentPrompt = sanitizeContentForSafety(prompt);
      currentPrompt += '\n\nIMPORTANT: Write a tasteful, mature story that focuses on emotional connections and character development. Use euphemisms and implications rather than explicit descriptions. Keep all content suitable for a mature but not explicit audience.';
    } else if (attempt === 2) {
      // Second retry: Ultra-sanitized, family-friendly
      console.log(`[Chapter ${data.chapterNumber}] Attempt 3: Ultra-sanitized family-friendly mode...`);
      currentPrompt = sanitizeContentForSafety(sanitizeContentForSafety(prompt)); // Double sanitize
      currentPrompt += '\n\nCRITICAL SAFETY OVERRIDE: The previous attempts were blocked. You MUST write completely family-friendly content suitable for all ages. NO violence, NO romance beyond hand-holding, NO conflict descriptions. Focus purely on dialogue, character emotions, and plot advancement. If the scene requires mature content, summarize it as "time passed" and skip to the next safe scene.';
    } else if (attempt === 3) {
      // Final fallback: Generate a minimal bridge chapter from just the summary
      console.log(`[Chapter ${data.chapterNumber}] Attempt 4: Generating safe bridge chapter from summary only...`);
      currentPrompt = `Write a brief, family-friendly chapter for a ${data.genre} story.

Chapter ${data.chapterNumber}: ${data.chapterTitle}

Summary of what happens: ${data.chapterPlan}

Requirements:
- Write approximately ${Math.min(data.targetWords, 1500)} words
- Focus on dialogue and character emotions only
- NO violence, NO mature themes, NO conflict descriptions
- Keep it simple and safe for all audiences
- Start with "Chapter ${data.chapterNumber}: ${data.chapterTitle}" as the heading
- This is a bridge chapter - just move the plot forward simply

Write the chapter now:`;
    }

    try {
      const result = await withTimeout(
        () => getGeminiPro().generateContent(currentPrompt),
        CHAPTER_GENERATION_TIMEOUT,
        `Chapter ${data.chapterNumber} generation (attempt ${attempt + 1})`
      );
      let content = result.response.text();

      // Quick cleanup of obvious AI artifacts and word truncation errors
      content = content
        .replace(/\*?\*?\[?(THE )?END( OF BOOK| OF CHAPTER)?\]?\*?\*?/gi, '')
        .replace(/\*\*\[END OF BOOK\]\*\*/gi, '')
        .replace(/—/g, ', ')
        .replace(/–/g, ', ')
        .replace(/ , /g, ', ')
        .replace(/,\s*,/g, ',')
        // Fix common AI word truncation artifacts
        .replace(/\blegary\b/gi, 'legendary')
        .replace(/\bLeg of Zelda\b/g, 'Legend of Zelda')
        .replace(/\bsurrer\b/gi, 'surrender')
        .replace(/\bsurrering\b/gi, 'surrendering')
        .replace(/\bsurrered\b/gi, 'surrendered')
        .replace(/\brecomm\b/gi, 'recommend')
        .replace(/\brecommation\b/gi, 'recommendation')
        .replace(/\bsp\s+(\w)/g, 'spend $1')
        .replace(/\bbl\s+(\w)/g, 'blend $1')
        .replace(/\borphins\b/gi, 'endorphins')
        .replace(/\binted\b/gi, 'intended')
        .replace(/\bintions\b/gi, 'intentions')
        .replace(/\bdesced\b/gi, 'descended')
        .replace(/\bsusped\b/gi, 'suspended')
        .replace(/\bNinto\b/g, 'Nintendo')
        .trim();

      // Remove duplicate chapter titles (AI sometimes outputs title twice - ALL CAPS then Title Case)
      content = removeDuplicateChapterHeading(content, data.chapterNumber, data.chapterTitle);

      // Handle "The End" for final chapter
      content = normalizeTheEnd(content, isLastChapter || false);

      if (attempt > 0) {
        console.log(`[Chapter ${data.chapterNumber}] Successfully generated on attempt ${attempt + 1}`);
      }

      return content;
    } catch (error) {
      lastError = error as Error;
      if (isSafetyBlockError(error) && attempt < maxAttempts - 1) {
        console.log(`[Chapter ${data.chapterNumber}] Safety block on attempt ${attempt + 1}, trying next fallback...`);
        continue;
      }
      // If this is the last attempt and still failing, generate a placeholder
      if (attempt === maxAttempts - 1) {
        console.error(`[Chapter ${data.chapterNumber}] All ${maxAttempts} attempts failed. Generating emergency placeholder.`);
        // Return a minimal placeholder chapter so the book can complete
        const placeholder = `Chapter ${data.chapterNumber}: ${data.chapterTitle}

${data.chapterPlan}

[Note: This chapter was condensed due to content processing. The story continues in the next chapter.]`;
        return placeholder;
      }
      throw error;
    }
  }

  throw lastError || new Error(`Failed to generate chapter ${data.chapterNumber}`);
}

// Remove duplicate chapter headings that appear twice (e.g., ALL CAPS then Title Case)
function removeDuplicateChapterHeading(content: string, chapterNum: number, chapterTitle?: string): string {
  const lines = content.split('\n');
  if (lines.length < 3) return content;

  // Look for chapter heading patterns in the first few lines
  const chapterPatterns = [
    // "CHAPTER N" or "Chapter N" with optional title
    new RegExp(`^\\s*CHAPTER\\s+${chapterNum}\\s*[:.]?\\s*(.*)$`, 'i'),
    // Just number and title
    new RegExp(`^\\s*${chapterNum}\\s*[:.]?\\s+(.*)$`),
  ];

  // Find lines that look like chapter headings
  const headingIndices: number[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (!line) continue;

    for (const pattern of chapterPatterns) {
      if (pattern.test(line)) {
        headingIndices.push(i);
        break;
      }
    }

    // Also check if line matches the chapter title closely (case-insensitive)
    if (chapterTitle) {
      const normalizedLine = line.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedTitle = chapterTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
      // If line is mostly the title (>70% match)
      if (normalizedLine.includes(normalizedTitle) || normalizedTitle.includes(normalizedLine)) {
        if (normalizedLine.length > 10 && !headingIndices.includes(i)) {
          headingIndices.push(i);
        }
      }
    }
  }

  // If we found 2+ heading-like lines, remove the ALL CAPS one or the first duplicate
  if (headingIndices.length >= 2) {
    // Prefer to remove the ALL CAPS version
    let indexToRemove = -1;
    for (const idx of headingIndices) {
      const line = lines[idx].trim();
      // Check if line is ALL CAPS (or mostly caps)
      const upperCount = (line.match(/[A-Z]/g) || []).length;
      const letterCount = (line.match(/[A-Za-z]/g) || []).length;
      if (letterCount > 0 && upperCount / letterCount > 0.8) {
        indexToRemove = idx;
        break;
      }
    }

    // If no ALL CAPS version, just remove the first duplicate
    if (indexToRemove === -1) {
      indexToRemove = headingIndices[0];
    }

    // Remove that line and any following empty lines
    lines.splice(indexToRemove, 1);
    while (indexToRemove < lines.length && lines[indexToRemove].trim() === '') {
      lines.splice(indexToRemove, 1);
    }

    return lines.join('\n');
  }

  return content;
}

// Normalize "The End" - remove from non-final chapters, ensure single properly formatted instance on final chapter
function normalizeTheEnd(content: string, isLastChapter: boolean): string {
  // Pattern to match various forms of "The End"
  const theEndPatterns = [
    /\n*\s*\*?\*?\[?THE\s+END\]?\*?\*?\s*$/gi,
    /\n*\s*\*?\*?\[?The\s+End\]?\*?\*?\s*$/gi,
    /\n*\s*\*?\*?\[?the\s+end\]?\*?\*?\s*$/gi,
    /\n*\s*---+\s*THE\s+END\s*---*\s*$/gi,
    /\n*\s*~+\s*The\s+End\s*~*\s*$/gi,
  ];

  // Remove all "The End" variations first
  let cleaned = content;
  for (const pattern of theEndPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  cleaned = cleaned.trim();

  // If this is the last chapter, add "The End" properly formatted
  if (isLastChapter) {
    cleaned = cleaned + '\n\nThe End';
  }

  return cleaned;
}

// Generic version that detects duplicate chapter headings without needing chapter info
function removeDuplicateChapterHeadingGeneric(content: string): string {
  const lines = content.split('\n');
  if (lines.length < 3) return content;

  // Look for any chapter heading pattern in the first few lines
  const chapterPattern = /^\s*(CHAPTER\s+\d+|Chapter\s+\d+)\s*[:.]?\s*(.*)$/i;

  // Find lines that look like chapter headings
  const headings: { index: number; num: string; title: string; isUpperCase: boolean }[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const match = line.match(chapterPattern);
    if (match) {
      // Extract chapter number
      const numMatch = match[1].match(/\d+/);
      if (numMatch) {
        const upperCount = (line.match(/[A-Z]/g) || []).length;
        const letterCount = (line.match(/[A-Za-z]/g) || []).length;
        headings.push({
          index: i,
          num: numMatch[0],
          title: (match[2] || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
          isUpperCase: letterCount > 0 && upperCount / letterCount > 0.8,
        });
      }
    }
  }

  // If we have 2+ headings with the same chapter number, remove the ALL CAPS one
  if (headings.length >= 2) {
    const firstNum = headings[0].num;
    const duplicates = headings.filter(h => h.num === firstNum);

    if (duplicates.length >= 2) {
      // Prefer to remove the ALL CAPS version
      const upperCaseOne = duplicates.find(h => h.isUpperCase);
      const indexToRemove = upperCaseOne ? upperCaseOne.index : duplicates[0].index;

      // Remove that line and any following empty lines
      lines.splice(indexToRemove, 1);
      while (indexToRemove < lines.length && lines[indexToRemove].trim() === '') {
        lines.splice(indexToRemove, 1);
      }

      return lines.join('\n');
    }
  }

  return content;
}

// Smart fallback: extract meaningful summary when AI times out
function smartSummaryFallback(chapterContent: string): string {
  // Split into paragraphs
  const paragraphs = chapterContent.split(/\n\n+/).filter(p => p.trim().length > 0);

  if (paragraphs.length === 0) {
    return chapterContent.substring(0, 500) + '...';
  }

  // Take first paragraph (sets scene) + last 2 paragraphs (chapter ending/cliffhanger)
  const opener = paragraphs[0] || '';
  const closer = paragraphs.length > 2
    ? paragraphs.slice(-2).join('\n\n')
    : paragraphs[paragraphs.length - 1] || '';

  const combined = `${opener}\n...\n${closer}`;

  // Limit to ~600 chars
  return combined.length > 600
    ? combined.substring(0, 600) + '...'
    : combined;
}

export async function summarizeChapter(chapterContent: string): Promise<string> {
  // Simplified, shorter prompt for faster generation
  const prompt = `Summarize this chapter in 100 words max. Include:
- Main plot events
- Character locations and emotional state at chapter end
- Critical setups for future chapters

CHAPTER:
${chapterContent}`;

  const startTime = Date.now();
  try {
    const result = await withTimeout(
      () => getGeminiFlashLight().generateContent(prompt), // Flash Light is faster
      FAST_TASK_TIMEOUT,
      'Chapter summary'
    );
    const summary = result.response.text().trim();
    const elapsed = Date.now() - startTime;
    const summaryWords = summary.split(/\s+/).filter(w => w.length > 0).length;
    console.log(`[Summary] SUCCESS in ${elapsed}ms. ${summaryWords} words`);
    return summary;
  } catch (error) {
    // Timeout or error - use smart fallback
    console.log(`[Summary] AI failed, using smart fallback`);
    return smartSummaryFallback(chapterContent);
  }
}

// ============================================================
// CHAPTER REVIEW AND POLISH SYSTEM (Second Pass)
// ============================================================
// This function reviews generated chapters for quality issues
// and returns a polished, publishable version.

export async function reviewAndPolishChapter(
  chapterContent: string,
  targetWords: number,
  bookType: string
): Promise<{ content: string; success: boolean }> {
  const currentWordCount = chapterContent.split(/\s+/).filter(w => w.length > 0).length;
  const isOverLength = currentWordCount > targetWords * 1.15; // More than 15% over

  const prompt = `You are a professional editor reviewing a chapter for publication. Your job is to FIX ERRORS while preserving the author's voice and story.

CHAPTER TO REVIEW:
---
${chapterContent}
---

TARGET WORD COUNT: ${targetWords} words
CURRENT WORD COUNT: ~${currentWordCount} words
BOOK TYPE: ${bookType}

YOUR EDITING TASKS:

1. FIX SPELLING AND TYPOS:
   - Correct any misspelled words (e.g., "susped" → "suspended", "desced" → "descended")
   - Fix incomplete or garbled words
   - Ensure proper capitalization

2. FIX DIALOGUE FORMATTING:
   - ALL spoken dialogue MUST be in quotation marks
   - Correct: "Hello," she said.
   - Incorrect: Hello, she said.
   - Each new speaker should start a new paragraph

3. FIX INCOMPLETE SENTENCES:
   - If a sentence is cut off or missing words, complete it logically
   - Remove any sentences that are clearly garbled and cannot be salvaged

4. FIX REPETITIVE SENTENCE STARTERS (CRITICAL):
   - Scan for paragraphs where more than 2 consecutive sentences start with the same word
   - Common offenders: "She [verb]", "He [verb]", "The [noun]", "It was/is"
   - Rewrite to vary sentence structure using dependent clauses, participial phrases, prepositional phrases
   - Example fix: "She opened the door. She walked inside. She saw the damage." → "She opened the door. Inside, the damage was immediately visible."
   - If 20%+ of sentences in a paragraph start with "She/He/It/The", rewrite for variety

5. REDUCE CHARACTER NAME OVERUSE:
   - Character names should appear roughly once every 100-150 words
   - Replace excessive name usage with pronouns (he/she/they)
   - Exception: Keep names when needed for clarity (multiple people in scene)
   - Don't just replace names with pronouns at sentence starts - vary the entire sentence structure

6. REMOVE WORD REPETITION:
   - If the same unusual word appears more than twice in a paragraph, replace some instances with synonyms
   - Remove redundant phrases that say the same thing twice
   - Watch for repetitive 2-word patterns: "She looked", "She thought", "She reached", "It was"

7. FIX AI-DETECTABLE PATTERNS:
   - If chapter opens with "Have you ever..." - REWRITE the opening with a different hook
   - Replace overused physical descriptions ("shoulders dropped", "heart rate slowed") with varied alternatives
   - Fix formulaic case study intros: "Consider the case of [Name]. [Name] was a..." - make them natural
   - Vary transition phrases - not every chapter should end with "In the next chapter, we will..."
   - Fix truncated words: "legary"→"legendary", "surrer"→"surrender", "sp time"→"spend time", "Ninto"→"Nintendo"

8. FIX PUNCTUATION:
   - Replace any em dashes (—) or en dashes (–) with commas or periods
   - Ensure sentences end with proper punctuation

${isOverLength ? `9. TRIM LENGTH:
   - The chapter is ${currentWordCount - targetWords} words over target
   - Remove unnecessary adjectives and adverbs
   - Tighten wordy phrases
   - Cut redundant descriptions
   - Target: ${targetWords} words (+/- 10%)` : ''}

CRITICAL RULES:
- DO NOT change the plot, characters, or story events
- DO NOT rewrite sections that are already well-written
- DO NOT add new content or expand scenes
- DO NOT change the author's writing style
- ONLY fix actual errors and issues listed above

OUTPUT:
Return ONLY the corrected chapter text. No explanations, no comments, no markdown.`;

  try {
    const startTime = Date.now();
    const result = await withTimeout(
      () => getGeminiFlashForReview().generateContent(prompt), // Use dedicated review API key
      45000, // 45s timeout
      'Chapter review'
    );
    let polished = result.response.text().trim();

    // Final cleanup pass
    polished = polished
      // Remove ugly AI end markers, but preserve properly formatted "The End"
      .replace(/\*+\s*(THE\s+)?END\s*\*+/gi, '') // *END* or **THE END**
      .replace(/\[+(THE\s+)?END\]+/gi, '') // [END] or [THE END]
      .replace(/(THE\s+)?END\s+OF\s+(BOOK|CHAPTER)/gi, '') // "END OF BOOK" etc
      .replace(/^\s*---+\s*$/gm, '')
      // Fix double punctuation
      .replace(/([.!?])\1+/g, '$1')
      // Fix double spaces
      .replace(/  +/g, ' ')
      // Fix em/en dashes that might have been missed
      .replace(/—/g, ', ')
      .replace(/–/g, ', ')
      .replace(/ , /g, ', ')
      .replace(/,\s*,/g, ',')
      // Fix common AI word truncation artifacts
      .replace(/\blegary\b/gi, 'legendary')
      .replace(/\bLeg of Zelda\b/g, 'Legend of Zelda')
      .replace(/\bsurrer\b/gi, 'surrender')
      .replace(/\bsurrering\b/gi, 'surrendering')
      .replace(/\bsurrered\b/gi, 'surrendered')
      .replace(/\brecomm\b/gi, 'recommend')
      .replace(/\brecommation\b/gi, 'recommendation')
      .replace(/\b(\w{2,})ed\s+(\1ing)\b/gi, '$1ed') // Fix doubled verbs
      .replace(/\bsp\s+(\w)/g, 'spend $1') // "sp time" -> "spend time"
      .replace(/\bbl\s+(\w)/g, 'blend $1') // "bl together" -> "blend together"
      .replace(/\bOrpheus\s+s\b/gi, 'Orpheus says')
      .replace(/\bends\s+s\b/gi, 'ends')
      .replace(/\b(\w+)s\s+s\b/g, '$1s') // Fix doubled 's'
      .replace(/\borphins\b/gi, 'endorphins')
      .replace(/\binted\b/gi, 'intended')
      .replace(/\bintions\b/gi, 'intentions')
      .replace(/\bdesced\b/gi, 'descended')
      .replace(/\bsusped\b/gi, 'suspended')
      .replace(/\bNinto\b/g, 'Nintendo')
      .trim();

    // Also remove duplicate chapter headings in review pass
    polished = removeDuplicateChapterHeadingGeneric(polished);

    const elapsed = Date.now() - startTime;
    const originalWords = chapterContent.split(/\s+/).filter(w => w.length > 0).length;
    const polishedWords = polished.split(/\s+/).filter(w => w.length > 0).length;

    // SAFETY CHECK: If review destroyed the chapter (< 50% of original), reject it
    if (polishedWords < originalWords * 0.5) {
      console.error(`[Review] REJECTED: Output too short (${polishedWords} vs ${originalWords} words). Keeping original.`);
      return { content: chapterContent, success: false };
    }

    console.log(`[Review] SUCCESS in ${elapsed}ms. Words: ${originalWords} -> ${polishedWords}`);
    return { content: polished, success: true };
  } catch (error) {
    console.error('[Review] FAILED:', error instanceof Error ? error.message : error);
    return { content: chapterContent, success: false }; // Return original if review fails
  }
}

export async function updateCharacterStates(
  currentStates: Record<string, object>,
  chapterContent: string,
  chapterNumber: number
): Promise<Record<string, object>> {
  const prompt = `Based on this chapter, update the character state tracking.

CURRENT CHARACTER STATES:
${JSON.stringify(currentStates, null, 2)}

CHAPTER ${chapterNumber} CONTENT:
${chapterContent}

For each character that appeared or was mentioned, update their state with:
- last_seen: chapter number
- status: current situation (location, condition)
- knows: array of important knowledge they have
- goal: their current motivation

Output ONLY valid JSON with the updated character states.`;

  try {
    const result = await withTimeout(
      () => getGeminiFlash().generateContent(prompt),
      FAST_TASK_TIMEOUT,
      'Character state update'
    );
    const response = result.response.text();
    return parseJSONFromResponse(response) as Record<string, object>;
  } catch (error) {
    console.error('Character state update failed, keeping current:', error);
    return currentStates;
  }
}

// Genre-specific cover style options for variety
const COVER_STYLE_OPTIONS: Record<string, string[]> = {
  // Fiction genres
  'romance': [
    'Silhouette of embracing couple against sunset/sunrise backdrop, soft warm tones, elegant script title',
    'Delicate floral border framing title on solid pastel background, vintage romantic aesthetic',
    'Close-up of intertwined hands or symbolic objects (roses, keys, letters), intimate mood',
    'Dreamy watercolor landscape with couple in distance, ethereal and romantic atmosphere',
    'Typography-focused with ornate lettering, subtle rose gold accents, minimalist elegance',
  ],
  'thriller': [
    'Dark atmospheric scene with single ominous element (shadow, doorway, light), high contrast',
    'Bold typography on dark background with red or yellow accent, minimalist tension',
    'Noir-style silhouette in urban setting, fog/rain effects, moody lighting',
    'Abstract geometric design with sharp angles, dark color palette, modern thriller look',
    'Close-up of symbolic object (weapon, document, key), dramatic lighting, mystery',
  ],
  'mystery': [
    'Foggy Victorian street scene, gas lamps, shadowy figure, classic mystery atmosphere',
    'Magnifying glass over map/document, vintage detective aesthetic',
    'Dark doorway or window with light streaming through, sense of unknown',
    'Silhouette holding object against moody sky, intrigue and suspense',
    'Typography-heavy design with newspaper/case file aesthetic, crime noir style',
  ],
  'fantasy': [
    'Majestic landscape with magical elements (floating islands, glowing forests), epic scope',
    'Ornate sword/artifact on decorative background, mythical metalwork aesthetic',
    'Silhouette of hero against dramatic sky with magical effects',
    'Ancient map style with decorative border, fantasy cartography look',
    'Mystical portal or doorway with magical energy, sense of wonder',
  ],
  'science_fiction': [
    'Sleek spaceship or space station against cosmic backdrop, sci-fi grandeur',
    'Futuristic cityscape with neon lights, cyberpunk/tech noir atmosphere',
    'Planet or celestial body dominating frame, cosmic scale and wonder',
    'Abstract circuit/data visualization, modern tech aesthetic',
    'Lone figure in spacesuit or against alien landscape, exploration theme',
  ],
  'horror': [
    'Decrepit building/house with ominous presence, gothic horror atmosphere',
    'Single haunting eye or face emerging from darkness, psychological terror',
    'Blood red typography on pitch black, stark and disturbing simplicity',
    'Twisted tree or dead landscape, barren and unsettling mood',
    'Vintage photograph style with supernatural element, found footage aesthetic',
  ],
  'literary_fiction': [
    'Typography-only cover with elegant serif font, classic literature aesthetic, no imagery',
    'Abstract color blocks with sophisticated typography, modern literary design',
    'Minimalist single object on solid background, symbolic and contemplative',
    'Vintage texture with embossed-style title, timeless classic feel',
    'Subtle watercolor or ink wash background, artistic and refined',
  ],
  'historical': [
    'Sepia-toned scene from the era, vintage photograph aesthetic',
    'Period-appropriate map or document as background, historical gravitas',
    'Silhouette of figure in period clothing against historical setting',
    'Ornate decorative border with era-appropriate motifs, antique book design',
    'Texture of aged paper with elegant classical typography only',
  ],
  // Non-fiction genres
  'self-help': [
    'Bright gradient background with bold modern typography, uplifting and energetic',
    'Rising sun/pathway imagery, symbolic of growth and transformation',
    'Clean geometric design with motivational color palette (blue, green, orange)',
    'Minimalist icon/symbol representing the book\'s concept, professional look',
    'Typography-focused with subtle decorative elements, clean and approachable',
  ],
  'business': [
    'Bold typography on solid color background, professional and authoritative',
    'Abstract upward graph/arrow design, success and growth theme',
    'Geometric pattern suggesting structure and organization, corporate aesthetic',
    'Minimalist icon representing business concept, clean modern design',
    'Two-tone color block design with large sans-serif title, executive style',
  ],
  'biography': [
    'Stylized portrait or silhouette of the subject, dignified presentation',
    'Symbolic object or scene from subject\'s life, narrative hook',
    'Typography-dominant with small iconic image, documentary feel',
    'Vintage photograph treatment, historical weight and authenticity',
    'Abstract representation of subject\'s achievements or era',
  ],
  'memoir': [
    'Personal photograph aesthetic, intimate and authentic feel',
    'Nostalgic landscape or setting from the story, memory trigger',
    'Single meaningful object on textured background, personal significance',
    'Handwritten-style title on warm background, intimate and personal',
    'Abstract representation of emotional journey, artistic memoir style',
  ],
  // Children's books
  'children': [
    'Bright, cheerful illustration with main character, whimsical and inviting',
    'Bold primary colors with friendly typography, playful and fun',
    'Cute animal or character portrait, appealing to young readers',
    'Scene from the story with child-friendly art style, adventure preview',
    'Interactive-looking design with fun patterns and shapes',
  ],
  // Default for unmatched genres
  'default': [
    'Typography-focused cover with elegant font on textured background, classic book design',
    'Abstract artistic design that evokes the mood of the story, sophisticated',
    'Symbolic single object or scene on clean background, minimalist impact',
    'Silhouette-based design with dramatic lighting, universal appeal',
    'Decorative border with ornate title treatment, traditional book aesthetic',
    'Modern geometric design with bold color palette, contemporary look',
  ],
};

// Get a random cover style for the genre
function getRandomCoverStyle(genre: string): string {
  const normalizedGenre = genre.toLowerCase().replace(/[- ]/g, '_');
  const styles = COVER_STYLE_OPTIONS[normalizedGenre] || COVER_STYLE_OPTIONS['default'];
  return styles[Math.floor(Math.random() * styles.length)];
}

export async function generateCoverPrompt(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  authorName: string;
  artStyle?: string;
  artStylePrompt?: string;
  characterVisualGuide?: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
      colorPalette: string;
    }>;
    styleNotes: string;
  };
  visualStyleGuide?: {
    overallStyle: string;
    colorPalette: string;
    lightingStyle: string;
    moodAndAtmosphere: string;
  };
}): Promise<string> {
  const styleInstruction = bookData.artStylePrompt
    ? `Art Style: ${bookData.artStylePrompt}`
    : '';

  // Build character descriptions for cover from visual guide
  let characterSection = '';
  if (bookData.characterVisualGuide && bookData.characterVisualGuide.characters.length > 0) {
    characterSection = `
MAIN CHARACTERS (if featuring characters on cover, use these EXACT descriptions):
${bookData.characterVisualGuide.characters.slice(0, 2).map(c =>
      `- ${c.name}: ${c.physicalDescription}. Wearing: ${c.clothing}. Distinctive: ${c.distinctiveFeatures}. Colors: ${c.colorPalette}`
    ).join('\n')}
`;
  }

  // Build style consistency section
  let styleConsistencySection = '';
  if (bookData.visualStyleGuide) {
    styleConsistencySection = `
STYLE CONSISTENCY (match interior illustrations):
- Overall Style: ${bookData.visualStyleGuide.overallStyle}
- Color Palette: ${bookData.visualStyleGuide.colorPalette}
- Lighting: ${bookData.visualStyleGuide.lightingStyle}
- Mood: ${bookData.visualStyleGuide.moodAndAtmosphere}
`;
  }

  // Get a random genre-appropriate cover style for variety
  const randomCoverStyle = getRandomCoverStyle(bookData.genre);

  // Check if it's an illustrated/visual book (should match interior style)
  const isIllustratedBook = bookData.artStyle || bookData.visualStyleGuide || bookData.characterVisualGuide;

  const prompt = `Create a detailed image generation prompt for a professional book cover.

BOOK DETAILS:
- Title: "${bookData.title}"
${bookData.authorName ? `- Author: "${bookData.authorName}"` : ''}
- Genre: ${bookData.genre}
- Type: ${bookData.bookType}
- Premise: ${bookData.premise}
${styleInstruction}
${characterSection}
${styleConsistencySection}

${isIllustratedBook ? `ILLUSTRATED BOOK - Cover MUST match interior art style exactly.` : `SUGGESTED COVER STYLE APPROACH:
${randomCoverStyle}

You may use this suggested style as inspiration, but feel free to adapt it to best represent this specific book's themes and mood. The goal is a unique, professional cover that stands out.`}

Create a prompt for generating a book cover that:
1. Visually represents the book's theme and genre authentically
2. Is professional and suitable for Amazon KDP (1600x2560 portrait)
3. Works well at thumbnail size - title must be readable
4. Has appropriate visual hierarchy
${bookData.artStylePrompt ? `5. Uses the ${bookData.artStyle} art style CONSISTENTLY with interior illustrations` : ''}
${bookData.visualStyleGuide ? '6. Matches the color palette and mood of the interior illustrations' : ''}

COVER STYLE VARIETY - Choose ONE of these approaches based on what fits the book best:
- TYPOGRAPHY-FOCUSED: Elegant title design with minimal or no imagery, decorative elements only
- SYMBOLIC: Single meaningful object or symbol representing the story's themes
- SCENIC: Atmospheric landscape or setting that evokes the mood
- CHARACTER-BASED: Silhouette or artistic representation of protagonist (no detailed faces)
- ABSTRACT: Artistic patterns, textures, or color compositions suggesting the mood
- CLASSIC: Traditional book design with ornate borders and vintage aesthetic

The cover MUST include:
- The title "${bookData.title}" prominently displayed with excellent readability
${bookData.authorName ? `- "by ${bookData.authorName}" at the bottom (include the word "by" before the author name)` : '- DO NOT include any author name (no author specified)'}

The cover must NOT include:
- Any other text besides title${bookData.authorName ? ' and author name' : ''}
- Detailed faces (use silhouettes or artistic representations instead)
- Copyright-infringing elements
- Cluttered or busy designs that compete with the title

${bookData.bookType === 'non-fiction' ? 'For this non-fiction book, favor clean, professional designs. Typography-focused or minimalist approaches work well. A subtitle may be appropriate if it helps convey the value proposition.' : 'This is fiction - focus on mood, atmosphere, and genre conventions. Create intrigue and emotional connection.'}

CRITICAL: If this is an illustrated book, the cover art style MUST match the interior illustrations exactly.

Output ONLY the image generation prompt, nothing else.`;

  const result = await getGeminiFlash().generateContent(prompt);
  return result.response.text();
}

// Generate illustration prompts for a chapter
export async function generateIllustrationPrompts(data: {
  chapterNumber: number;
  chapterTitle: string;
  chapterContent: string;
  characters: { name: string; description: string }[];
  artStyle: string;
  illustrationsCount: number;
  bookTitle: string;
}): Promise<Array<{
  scene: string;
  description: string;
  characters: string[];
  emotion: string;
}>> {
  const prompt = `You are an illustrator planning illustrations for a book chapter.

BOOK: "${data.bookTitle}"
CHAPTER ${data.chapterNumber}: "${data.chapterTitle}"

CHARACTERS:
${data.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

ART STYLE: ${data.artStyle}

COPYRIGHT PROTECTION - CRITICAL:
- Create 100% ORIGINAL visual descriptions - NEVER reference existing copyrighted characters, shows, movies, or comics
- Even if character names match famous characters (Velma, Daphne, Spider-Man, etc.), describe completely UNIQUE visuals
- DO NOT describe copyrighted visual elements (specific costumes, logos, signature poses, or iconic designs from existing media)
- Focus on original character designs, settings, and compositions

CHAPTER CONTENT:
${data.chapterContent.substring(0, 3000)}...

Create ${data.illustrationsCount} illustration descriptions for key moments in this chapter.

For each illustration, identify:
1. A specific scene/moment to illustrate
2. A detailed visual description (what to draw, composition, lighting)
3. Which characters appear in the scene
4. The emotional tone

IMPORTANT: The illustrations will NOT have any text. Describe only visual elements.

Output ONLY valid JSON:
{
  "illustrations": [
    {
      "scene": "Brief scene identifier (3-5 words)",
      "description": "Detailed visual description for the artist (50-100 words)",
      "characters": ["character names that appear"],
      "emotion": "primary emotion (joyful, tense, mysterious, etc.)"
    }
  ]
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    const parsed = parseJSONFromResponse(response) as {
      illustrations: Array<{
        scene: string;
        description: string;
        characters: string[];
        emotion: string;
      }>
    };
    return parsed.illustrations;
  } catch {
    // Return a single default illustration if parsing fails
    return [{
      scene: `Chapter ${data.chapterNumber} scene`,
      description: `An illustration capturing the essence of chapter ${data.chapterNumber}: ${data.chapterTitle}`,
      characters: data.characters.map(c => c.name),
      emotion: 'engaging',
    }];
  }
}

// Generate illustration for children's book (more detailed, scene-focused)
export async function generateChildrensIllustrationPrompts(data: {
  pageNumber: number;
  pageText: string;
  characters: { name: string; description: string }[];
  setting: string;
  artStyle: string;
  bookTitle: string;
}): Promise<{
  scene: string;
  visualDescription: string;
  characterPositions: string;
  backgroundDetails: string;
  colorMood: string;
}> {
  const prompt = `You are a children's book illustrator planning a full-page illustration.

BOOK: "${data.bookTitle}"
PAGE ${data.pageNumber}

PAGE TEXT:
"${data.pageText}"

CHARACTERS:
${data.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

SETTING: ${data.setting}
ART STYLE: ${data.artStyle}

COPYRIGHT PROTECTION - CRITICAL:
- Create 100% ORIGINAL visual descriptions - NEVER reference existing copyrighted characters, shows, movies, or comics
- Even if character names match famous characters (Velma, Daphne, Spider-Man, etc.), describe completely UNIQUE visuals
- DO NOT describe copyrighted visual elements (specific costumes, logos, signature poses, or iconic designs from existing media)
- Focus on original character designs, settings, and compositions

Create a detailed illustration plan for this page. Children's book illustrations should:
- Be visually engaging and age-appropriate
- Support the text without duplicating it
- Show characters with expressive faces and body language
- Have clear, readable compositions
- Use the full page effectively

CRITICAL: NO TEXT should appear in the illustration. The text will be added separately.

Output ONLY valid JSON:
{
  "scene": "Brief description of the moment (5-10 words)",
  "visualDescription": "Detailed description of what to draw (100+ words)",
  "characterPositions": "Where each character is positioned and what they're doing",
  "backgroundDetails": "Setting elements, objects, environmental details",
  "colorMood": "Color palette and emotional mood (warm, cool, vibrant, etc.)"
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    return parseJSONFromResponse(response) as {
      scene: string;
      visualDescription: string;
      characterPositions: string;
      backgroundDetails: string;
      colorMood: string;
    };
  } catch {
    return {
      scene: `Page ${data.pageNumber} illustration`,
      visualDescription: `A charming illustration for page ${data.pageNumber} showing the scene described in the text`,
      characterPositions: 'Characters centered in the scene',
      backgroundDetails: data.setting,
      colorMood: 'warm and inviting',
    };
  }
}

// Build illustration prompt from scene description (for parallel generation)
export function buildIllustrationPromptFromScene(
  scene: SceneDescription,
  artStylePrompt: string,
  characterVisualGuide?: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
      colorPalette: string;
    }>;
    styleNotes: string;
  },
  visualStyleGuide?: {
    overallStyle: string;
    colorPalette: string;
    lightingStyle: string;
    moodAndAtmosphere: string;
    consistencyRules: string[];
  },
  panelLayout?: PanelLayout,
  options?: { skipNoTextInstruction?: boolean; contentRating?: ContentRating }
): string {
  // Build character descriptions for characters in this scene - with STRONG consistency emphasis
  let characterDescriptions = '';
  let characterConsistencyReminder = '';
  let mainCharacterEmphasis = '';
  if (characterVisualGuide) {
    const sceneCharacters = scene.characters;
    const relevantChars = characterVisualGuide.characters.filter(c =>
      sceneCharacters.some(sc => sc.toLowerCase() === c.name.toLowerCase())
    );
    if (relevantChars.length > 0) {
      // Build detailed character descriptions with emphasis on recognizable features
      // Mark the first character as MAIN CHARACTER for extra emphasis
      characterDescriptions = relevantChars.map((c, index) => {
        const action = scene.characterActions[c.name] || '';
        const isMainChar = index === 0;
        const prefix = isMainChar ? '⭐ MAIN CHARACTER - ' : '';

        // Extract hair description for triple emphasis
        const hairMatch = c.physicalDescription.match(/([\w\s-]+hair[\w\s,.-]*)/i);
        const hairDesc = hairMatch ? hairMatch[0] : '';

        // Include ALL visual details for maximum consistency
        let desc = `${prefix}${c.name}: ${c.physicalDescription}. CLOTHING: ${c.clothing}. DISTINCTIVE FEATURES: ${c.distinctiveFeatures}. COLOR PALETTE: ${c.colorPalette}${action ? `. CURRENT ACTION: ${action}` : ''}`;

        // For main character, add extra emphasis
        if (isMainChar && hairDesc) {
          desc += ` [REMEMBER: ${c.name} has ${hairDesc} - this MUST be consistent!]`;
          mainCharacterEmphasis = `The MAIN CHARACTER ${c.name} has: ${hairDesc}. ${c.distinctiveFeatures}. Draw them EXACTLY like this.`;
        }

        return desc;
      }).join('\n\n');

      // Build a specific consistency reminder for hair and face
      characterConsistencyReminder = relevantChars.map(c => {
        // Extract key identifiers from physical description for emphasis
        return `${c.name} MUST have the EXACT same: hair color, hair style, face shape, and distinctive features as described above`;
      }).join('. ');
    }
  }

  // Build the prompt
  let prompt = `${artStylePrompt}. `;

  // COPYRIGHT PROTECTION - CRITICAL: Prevent generation of famous copyrighted characters
  prompt += `
⚠️ COPYRIGHT PROTECTION - ABSOLUTELY CRITICAL:
- Create 100% ORIGINAL character designs - NEVER copy from existing media, movies, TV shows, comics, or famous characters
- Even if a character's NAME matches a famous character (Superman, Batman, Spider-Man, Wonder Woman, Velma, Daphne, Scooby, Harry Potter, etc.), you MUST create COMPLETELY UNIQUE visual designs that look NOTHING like the copyrighted character
- DO NOT use ANY signature elements from copyrighted characters:
  * NO iconic costumes (Superman's blue suit with S symbol, Batman's bat suit, Spider-Man's web pattern, Wonder Woman's tiara, etc.)
  * NO trademarked symbols, logos, or insignias on clothing (S, Bat symbol, Spider symbol, etc.)
  * NO distinctive hairstyles, glasses, or accessories from famous characters
  * NO signature colors or visual styles associated with copyrighted characters
- If the character name is "Superman", create a unique person with NO connection to the copyrighted character - different hair, different clothes, NO cape, NO S symbol, COMPLETELY ORIGINAL
- This is LEGALLY REQUIRED to avoid copyright infringement and potential lawsuit
⚠️ END COPYRIGHT PROTECTION

`;

  // Add location context first
  if (scene.location) {
    prompt += `Setting: ${scene.location}. `;
  }

  // Add scene description
  prompt += `${scene.description}. `;

  // Add character details with STRONG consistency emphasis
  if (characterDescriptions) {
    prompt += `

=== CRITICAL CHARACTER CONSISTENCY REQUIREMENTS ===
You MUST draw these characters EXACTLY as described. Do NOT change their hair color, hair style, face shape, or distinctive features. Each character must be INSTANTLY recognizable.

${characterDescriptions}

=== END CHARACTER DESCRIPTIONS ===

`;
  } else if (scene.characters.length > 0) {
    const actions = Object.entries(scene.characterActions)
      .map(([char, action]) => `${char}: ${action}`)
      .join(', ');
    prompt += `Characters in scene: ${actions}. `;
  }

  // Add background and mood
  prompt += `Environment: ${scene.background}. `;
  prompt += `Mood: ${scene.mood}. `;
  prompt += `Camera angle: ${scene.cameraAngle}. `;

  // Add style guide if available
  if (visualStyleGuide) {
    prompt += `Style: ${visualStyleGuide.overallStyle}. `;
    prompt += `Colors: ${visualStyleGuide.colorPalette}. `;
    prompt += `Lighting: ${visualStyleGuide.lightingStyle}. `;
  }

  // Add panel layout instructions for comics
  if (panelLayout && panelLayout !== 'splash') {
    const layoutInstructions: Record<PanelLayout, string> = {
      'splash': '', // Full page, no special instructions
      'two-panel': 'IMPORTANT: Draw this as a COMIC PAGE with 2 PANELS arranged vertically or horizontally. Each panel shows a different moment in the sequence described. Use clear panel borders with gutters between panels.',
      'three-panel': 'IMPORTANT: Draw this as a COMIC PAGE with 3 PANELS. Can be vertical strip, horizontal strip, or 2+1 layout. Each panel shows a sequential moment. Include clear panel borders and gutters.',
      'four-panel': 'IMPORTANT: Draw this as a COMIC PAGE with 4 PANELS in a 2x2 grid layout. Each panel shows a quick sequential moment for action pacing. Use clear panel borders and consistent gutters.',
    };
    prompt += ` ${layoutInstructions[panelLayout]} `;
  }

  // Add STRONG consistency reminder for character appearances at the end
  if (characterDescriptions && characterConsistencyReminder) {
    prompt += `FINAL REMINDER - CHARACTER CONSISTENCY IS CRITICAL: ${characterConsistencyReminder}. DO NOT deviate from the described hair color, hair style, face shape, skin tone, or clothing. The characters must look IDENTICAL across all illustrations. `;
    // Add extra emphasis for main character if available
    if (mainCharacterEmphasis) {
      prompt += `⭐ ${mainCharacterEmphasis} `;
    }
  }

  // Add mature content visual directives for adult comics
  if (options?.contentRating === 'mature') {
    prompt += `

=== MATURE VISUAL STYLE ===
This is an ADULT comic. Make the visuals match the mature tone:
- ATMOSPHERE: Dark, gritty, moody lighting. Shadows and noir aesthetics.
- EXPRESSIONS: Characters should show intense emotions - anger, desire, fear, lust, cynicism
- BODY LANGUAGE: Sensual poses where appropriate, aggressive stances, intimate proximity between characters
- ROMANCE SCENES: Show physical attraction openly - characters close together, touching, kissing, suggestive poses
- VIOLENCE SCENES: Show the aftermath - blood splatters, injuries, weapons, menacing poses
- OVERALL: This should look like an adult graphic novel, NOT a children's book. Make it feel mature and edgy.
=== END MATURE STYLE ===

`;
  }

  // Add critical instructions
  if (!options?.skipNoTextInstruction) {
    prompt += 'NO TEXT or letters in the image. ';
  }
  prompt += 'Full color illustration.';

  return prompt;
}

export async function generateCoverImage(coverPrompt: string): Promise<string> {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Sanitize prompt more aggressively on retries
      let sanitizedPrompt = coverPrompt;
      if (attempt > 0) {
        console.log(`[Cover] Retry ${attempt}: Sanitizing prompt to avoid content policy...`);
        // Remove potentially offensive words and make it more generic
        sanitizedPrompt = sanitizedPrompt
          .replace(/\b(blood|violence|weapon|gun|knife|death|kill|murder|gore)\b/gi, '')
          .replace(/\b(sexy|nude|naked|provocative)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Make it even more generic on later retries
        if (attempt > 1) {
          sanitizedPrompt = `A ${sanitizedPrompt.substring(0, 100)} book cover, family-friendly, professional design`;
        }
      }

      const fullPrompt = `Professional book cover, high quality, 1600x2560 aspect ratio, suitable for Amazon KDP, family-friendly. ${sanitizedPrompt}`;

      const result = await withRetry(async () => {
        return await getGeminiImage().generateContent(fullPrompt);
      });

      // Extract image URL or base64 from response
      const response = result.response;

      // Handle the image response based on Gemini 3 Pro Image API format
      if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        const imageData = response.candidates[0].content.parts[0].inlineData;
        console.log(`[Cover] SUCCESS on attempt ${attempt + 1}`);
        return `data:${imageData.mimeType};base64,${imageData.data}`;
      }

      throw new Error('Failed to generate cover image - no image data in response');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isContentPolicyError = errorMsg.includes('PROHIBITED_CONTENT') || errorMsg.includes('blocked');

      if (isContentPolicyError && attempt < maxRetries - 1) {
        console.log(`[Cover] Content policy block on attempt ${attempt + 1}, retrying with sanitized prompt...`);
        continue; // Retry with sanitized prompt
      }

      // Not a content policy error or no retries left
      throw error;
    }
  }

  throw new Error('Failed to generate cover after all retries');
}

// Generate detailed visual character sheets for consistent illustrations
export async function generateCharacterVisualGuide(data: {
  title: string;
  genre: string;
  artStyle: string;
  characters: { name: string; description: string }[];
}): Promise<{
  characters: Array<{
    name: string;
    physicalDescription: string;
    clothing: string;
    distinctiveFeatures: string;
    colorPalette: string;
    expressionNotes: string;
  }>;
  styleNotes: string;
}> {
  const isNoir = data.artStyle.toLowerCase().includes('noir');
  const colorInstruction = isNoir
    ? 'NOIR BLACK AND WHITE ONLY: This is a noir/monochrome style. Use ONLY grayscale values (black, white, and shades of gray). NO colors whatsoever.'
    : '';

  const prompt = `You are an art director creating a character design guide for a ${data.genre} book titled "${data.title}".

The illustrations will be in ${data.artStyle} style.
${colorInstruction}

CHARACTERS TO DESIGN:
${data.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

DESIGN PRINCIPLES - Create distinctive, memorable characters:
- Give each character a UNIQUE silhouette that's instantly recognizable
- Vary body types, heights, and builds realistically
- Match character ethnicity and features to the SETTING and GENRE (Japanese characters for manga set in Japan, French characters for European settings, etc.)
- For anime/manga: use classic anime aesthetics appropriate to the genre (shounen, shoujo, seinen, 80s/90s City Hunter style, modern isekai, etc.)
- Clothing should reflect personality, era, and setting - not generic outfits
- If a character has powers, show it through subtle visual cues (not just glowing marks)

COPYRIGHT PROTECTION - CRITICAL:
- Create 100% ORIGINAL character designs - NEVER copy from existing media, cartoons, anime, comics, or films
- Even if a character's NAME matches a famous character (Velma, Daphne, Batman, Spider-Man, Naruto, etc.), you MUST create a COMPLETELY UNIQUE visual design
- DO NOT use signature features from copyrighted characters (Scooby-Doo's collar, Spider-Man's web pattern, Batman's cape, anime character hairstyles from existing shows, etc.)
- DO NOT make characters look like actors, celebrities, or existing fictional characters
- If you suspect a character name is from existing media, deliberately design them to look NOTHING like the famous version
- Example: A character named "Velma" should NOT have orange turtleneck, bob haircut, or glasses similar to Scooby-Doo's Velma - create a completely different look

Create EXTREMELY DETAILED visual descriptions for each character that an illustrator can follow consistently across ALL illustrations. These must be specific enough that the character is INSTANTLY recognizable in every single image.

For each character provide:

1. Physical Description (BE EXTREMELY SPECIFIC):
   - EXACT hair color (e.g., "golden blonde", "jet black", "auburn red", "chocolate brown" - NOT just "brown" or "blonde")
   - EXACT hair style and length (e.g., "shoulder-length wavy hair with side-swept bangs", "short spiky hair", "long straight hair in a ponytail")
   - Face shape (oval, round, square, heart-shaped, angular)
   - Eye color AND eye shape (almond-shaped, round, etc.)
   - Skin tone (fair, olive, tan, dark brown, etc.)
   - Age appearance (child around 6, teenager, young adult in 20s, etc.)
   - Height/build (tall and lanky, short and stocky, average height with athletic build)
   - Nose shape and any notable facial features

2. Clothing: Their CONSISTENT outfit throughout the story (${isNoir ? 'grayscale shading' : 'colors'}, style, accessories they always wear)

3. Distinctive Features: Unique visual identifiers that make them INSTANTLY recognizable (glasses, freckles, a specific accessory, a scar, etc.)

4. ${isNoir ? 'Grayscale Palette' : 'Color Palette'}: ${isNoir ? '3-4 SPECIFIC grayscale values (like "pure black", "charcoal gray", "light gray", "pure white") - ABSOLUTELY NO COLORS' : '3-4 SPECIFIC hex-describable colors (like "bright red #E74C3C", "navy blue", "sunny yellow")'}

5. Expression Notes: Their default facial expression and how they typically emote

Also provide overall style notes for maintaining consistency across illustrations.

CRITICAL: These descriptions will be used to generate AI illustrations. Be VERY specific about visual details. If a character is a child, specify apparent age. If they have a pet or companion, describe it too.

Output ONLY valid JSON:
{
  "characters": [
    {
      "name": "Character Name",
      "physicalDescription": "Detailed physical traits...",
      "clothing": "Typical outfit description...",
      "distinctiveFeatures": "Unique visual identifiers...",
      "colorPalette": "Primary colors for this character...",
      "expressionNotes": "How they show emotion..."
    }
  ],
  "styleNotes": "Overall style guidance for consistency..."
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    return parseJSONFromResponse(response) as {
      characters: Array<{
        name: string;
        physicalDescription: string;
        clothing: string;
        distinctiveFeatures: string;
        colorPalette: string;
        expressionNotes: string;
      }>;
      styleNotes: string;
    };
  } catch {
    // Return a basic guide if parsing fails
    return {
      characters: data.characters.map(c => ({
        name: c.name,
        physicalDescription: c.description,
        clothing: 'Appropriate attire for the story setting',
        distinctiveFeatures: 'As described in character description',
        colorPalette: 'Warm, inviting colors',
        expressionNotes: 'Natural, story-appropriate expressions',
      })),
      styleNotes: `Maintain consistent ${data.artStyle} style throughout all illustrations.`,
    };
  }
}

/**
 * Generate canonical character portrait images for consistent reference across all panels.
 * This creates dedicated portrait images (face + full body) that are used as references
 * when generating story panels, ensuring characters look identical throughout the book.
 *
 * Benefits:
 * - Better quality references than using first appearance from a scene
 * - Focused portraits with clean backgrounds and neutral poses
 * - Both face and full-body shots for comprehensive reference
 * - Avoids the "first appearance might be bad" problem
 */
export async function generateCharacterPortraits(data: {
  title: string;
  genre: string;
  artStyle: string;
  bookFormat: string;
  characterVisualGuide: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
      colorPalette: string;
      expressionNotes: string;
    }>;
    styleNotes: string;
  };
}): Promise<Array<{
  characterName: string;
  facePortrait: string;  // Base64 data URL
  fullBodyPortrait: string;  // Base64 data URL
}>> {
  const portraits = [];

  console.log(`[Portrait Gen] Generating ${data.characterVisualGuide.characters.length} character portraits...`);

  for (const character of data.characterVisualGuide.characters) {
    console.log(`[Portrait Gen] Creating portraits for "${character.name}"...`);

    // Generate face portrait (head and shoulders, neutral expression)
    const faceScene = `Professional character portrait - CLOSE-UP of head and shoulders only, facing forward directly at camera, neutral calm expression, clean solid color background.

CHARACTER: ${character.name}
Physical Description: ${character.physicalDescription}
Clothing (shoulders visible): ${character.clothing}
Distinctive Features: ${character.distinctiveFeatures}
Color Palette: ${character.colorPalette}

CRITICAL REQUIREMENTS:
- This is a REFERENCE PORTRAIT for character consistency - make it clear and well-lit
- Character facing directly forward at camera (front view)
- Neutral, calm expression (no extreme emotions)
- Clean, simple background - solid color or subtle gradient
- Focus on facial features, hair, and distinctive characteristics
- Show head, neck, and shoulders only
- Professional portrait quality - this will be the canonical reference for this character`;

    const faceResult = await generateIllustrationWithRetry({
      scene: faceScene,
      artStyle: data.artStyle,
      bookTitle: data.title,
      chapterTitle: `${character.name} Portrait`,
      bookFormat: 'square', // Square format for portraits
      characterVisualGuide: undefined, // Don't pass guide to avoid recursion
      visualStyleGuide: undefined,
      referenceImages: undefined, // No references for portraits - this IS the reference
    });

    if (!faceResult) {
      console.error(`[Portrait Gen] FAILED to generate face portrait for "${character.name}"`);
      continue;
    }

    console.log(`[Portrait Gen] ✓ Face portrait for "${character.name}"`);

    // Generate full body portrait (standing pose, neutral stance)
    const fullBodyScene = `Professional character reference sheet - FULL BODY shot showing character from head to toe, standing in neutral pose, facing forward, clean solid color background.

CHARACTER: ${character.name}
Physical Description: ${character.physicalDescription}
Clothing (full outfit): ${character.clothing}
Distinctive Features: ${character.distinctiveFeatures}
Color Palette: ${character.colorPalette}
Body Type/Build: (as described above)

CRITICAL REQUIREMENTS:
- This is a REFERENCE IMAGE for character consistency - make it clear and well-lit
- Show ENTIRE character from head to feet (full body visible)
- Standing in relaxed neutral stance (not action pose)
- Character facing directly forward at camera (front view)
- Arms at sides or relaxed position (not dynamic pose)
- Clean, simple background - solid color or subtle gradient
- Show complete outfit and physical proportions clearly
- Professional character sheet quality - this will be the canonical reference for this character's body and outfit`;

    const fullBodyResult = await generateIllustrationWithRetry({
      scene: fullBodyScene,
      artStyle: data.artStyle,
      bookTitle: data.title,
      chapterTitle: `${character.name} Full Body Reference`,
      bookFormat: 'square', // Square format for portraits
      characterVisualGuide: undefined,
      visualStyleGuide: undefined,
      referenceImages: undefined,
    });

    if (!fullBodyResult) {
      console.error(`[Portrait Gen] FAILED to generate full body portrait for "${character.name}"`);
      // Still save the face portrait if we have it
      if (faceResult) {
        portraits.push({
          characterName: character.name,
          facePortrait: faceResult.imageUrl,
          fullBodyPortrait: faceResult.imageUrl, // Use face as fallback
        });
      }
      continue;
    }

    console.log(`[Portrait Gen] ✓ Full body portrait for "${character.name}"`);

    portraits.push({
      characterName: character.name,
      facePortrait: faceResult.imageUrl,
      fullBodyPortrait: fullBodyResult.imageUrl,
    });
  }

  console.log(`[Portrait Gen] Completed ${portraits.length}/${data.characterVisualGuide.characters.length} character portraits`);
  return portraits;
}

// Generate a visual style guide for the book's illustrations
export async function generateVisualStyleGuide(data: {
  title: string;
  genre: string;
  artStyle: string;
  artStylePrompt: string;
  premise: string;
  bookFormat: string;
}): Promise<{
  overallStyle: string;
  colorPalette: string;
  lightingStyle: string;
  lineWeight: string;
  backgroundTreatment: string;
  moodAndAtmosphere: string;
  consistencyRules: string[];
}> {
  const isNoir = data.artStyle.toLowerCase().includes('noir');
  const colorInstruction = isNoir
    ? 'NOIR BLACK AND WHITE ONLY: This is a noir/monochrome style. Use ONLY grayscale values (black, white, and shades of gray). NO colors whatsoever.'
    : '';

  const prompt = `You are an art director creating a visual style guide for illustrated book.

BOOK DETAILS:
- Title: "${data.title}"
- Genre: ${data.genre}
- Art Style: ${data.artStyle} (${data.artStylePrompt})
- Format: ${data.bookFormat}
- Premise: ${data.premise}
${colorInstruction}

Create a comprehensive style guide that ensures ALL illustrations in this book look like they belong together.

Define:
1. Overall Style: How the ${data.artStyle} style should be interpreted for this specific book
2. ${isNoir ? 'Grayscale Palette' : 'Color Palette'}: ${isNoir ? 'Grayscale values (black, white, shades of gray) to use throughout - ABSOLUTELY NO COLORS' : 'Primary, secondary, and accent colors to use throughout'}
3. Lighting Style: How light and shadow should be rendered
4. Line Weight: Thick/thin lines, outline style, edge treatment
5. Background Treatment: How backgrounds should be handled
6. Mood & Atmosphere: The emotional tone all illustrations should convey
7. Consistency Rules: 5-7 specific rules to maintain visual consistency

Output ONLY valid JSON:
{
  "overallStyle": "Description of the overall visual approach...",
  "colorPalette": "Specific colors and their usage...",
  "lightingStyle": "How to handle light and shadow...",
  "lineWeight": "Line treatment approach...",
  "backgroundTreatment": "How to handle backgrounds...",
  "moodAndAtmosphere": "Emotional tone...",
  "consistencyRules": ["Rule 1", "Rule 2", "Rule 3", "Rule 4", "Rule 5"]
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    return parseJSONFromResponse(response) as {
      overallStyle: string;
      colorPalette: string;
      lightingStyle: string;
      lineWeight: string;
      backgroundTreatment: string;
      moodAndAtmosphere: string;
      consistencyRules: string[];
    };
  } catch {
    return {
      overallStyle: `${data.artStyle} style illustration`,
      colorPalette: 'Harmonious colors appropriate for the genre',
      lightingStyle: 'Natural, consistent lighting',
      lineWeight: 'Medium line weight with clean edges',
      backgroundTreatment: 'Detailed but not distracting backgrounds',
      moodAndAtmosphere: `Appropriate for ${data.genre}`,
      consistencyRules: [
        'Maintain consistent character proportions',
        'Use the same color palette throughout',
        'Keep lighting direction consistent within scenes',
        `Apply ${data.artStyle} style consistently`,
        'Ensure all characters are recognizable across illustrations',
      ],
    };
  }
}

// =====================================================
// SCREENPLAY GENERATION FUNCTIONS
// =====================================================

import {
  BeatSheet,
  CharacterProfile,
  ScreenplayContext,
  SequenceSummary,
  SEQUENCE_TO_BEATS,
  SCREENPLAY_BANNED_PHRASES,
  SCREENPLAY_BANNED_ACTION_STARTS,
  estimatePageCount,
} from './screenplay';

/**
 * Generate a complete beat sheet (outline) for a screenplay
 * Uses Save the Cat 15-beat structure
 */
export async function generateScreenplayOutline(data: {
  idea: string;
  genre: string;
  title: string;
  targetPages?: number;
}): Promise<{
  beatSheet: BeatSheet;
  characters: CharacterProfile[];
  estimatedPages: number;
}> {
  const targetPages = data.targetPages || 100;

  const prompt = `You are a Hollywood screenwriter creating a feature film beat sheet using the Save the Cat structure.

MOVIE CONCEPT:
Title: "${data.title}"
Genre: ${data.genre}
Premise: ${data.idea}
Target Length: ${targetPages} pages (approximately ${targetPages} minutes)

Create a detailed beat sheet with the 15 Save the Cat beats. Each beat should be specific and detailed, not generic.

BEAT SHEET REQUIREMENTS:
- Logline: One sentence pitch under 30 words
- Theme: The thematic question/statement the movie explores
- All 15 beats with specific plot points (not generic descriptions)
- 1-2 subplots that intersect with the main plot

ALSO CREATE 3-5 main character profiles with:
- Name and role (protagonist/antagonist/supporting)
- Want: External goal they're pursuing
- Need: Internal lesson they must learn
- Flaw: Character flaw that creates conflict
- Brief backstory
- Voice traits: vocabulary style, speech rhythm, verbal tics

CRITICAL FORMAT RULES:
- Be SPECIFIC. "Jack discovers his wife is having an affair" not "Protagonist faces a challenge"
- Each beat should be 2-3 sentences describing the actual scene/moment
- Characters should be named, not described generically

Output ONLY valid JSON:
{
  "beatSheet": {
    "logline": "One sentence pitch...",
    "theme": "The thematic statement...",
    "beats": {
      "openingImage": "Page 1 visual that sets tone...",
      "themeStated": "Page 5 - Someone states the theme...",
      "setup": "Pages 1-10 - Establish world and character...",
      "catalyst": "Page 12 - The inciting incident...",
      "debate": "Pages 12-25 - Protagonist resists...",
      "breakIntoTwo": "Page 25 - Active choice to enter new world...",
      "bStory": "Page 30 - B-story introduction...",
      "funAndGames": "Pages 30-55 - Promise of the premise...",
      "midpoint": "Page 55 - False victory or defeat...",
      "badGuysCloseIn": "Pages 55-75 - Things get harder...",
      "allIsLost": "Page 75 - Lowest point...",
      "darkNightOfSoul": "Pages 75-85 - Processing loss...",
      "breakIntoThree": "Page 85 - A and B stories combine...",
      "finale": "Pages 85-110 - Confrontation and resolution...",
      "finalImage": "Page 110 - Visual mirror of opening..."
    },
    "subplots": [
      {
        "name": "B-Story: Romance/Mentorship",
        "characters": ["Character1", "Character2"],
        "arc": "Brief description of subplot arc...",
        "intersectionPoints": [3, 4, 6, 7]
      }
    ]
  },
  "characters": [
    {
      "name": "CHARACTER NAME",
      "role": "protagonist",
      "want": "External goal...",
      "need": "Internal lesson...",
      "flaw": "Character flaw...",
      "backstory": "Brief relevant history...",
      "voiceTraits": {
        "vocabulary": "blue-collar, direct, occasional profanity",
        "rhythm": "short sentences, interrupts others",
        "tics": "says 'look' to start sentences"
      }
    }
  ]
}`;

  const result = await withTimeout(
    () => getGeminiFlash().generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 8192,
      },
      safetySettings: SAFETY_SETTINGS,
    }),
    120000,
    'generateScreenplayOutline'
  );

  const response = result.response.text();
  const parsed = parseJSONFromResponse(response) as {
    beatSheet: BeatSheet;
    characters: CharacterProfile[];
  };

  return {
    beatSheet: parsed.beatSheet,
    characters: parsed.characters,
    estimatedPages: targetPages,
  };
}

/**
 * Generate a single screenplay sequence (10-15 pages)
 */
export async function generateScreenplaySequence(data: {
  beatSheet: BeatSheet;
  characters: CharacterProfile[];
  sequenceNumber: number;
  context: ScreenplayContext;
  genre: string;
  title: string;
}): Promise<{
  content: string;
  pageCount: number;
}> {
  const sequenceInfo = SEQUENCE_TO_BEATS[data.sequenceNumber];
  if (!sequenceInfo) {
    throw new Error(`Invalid sequence number: ${data.sequenceNumber}`);
  }

  // Build character voice reference
  const characterVoices = data.characters.map(c =>
    `${c.name} (${c.role}): Vocabulary: ${c.voiceTraits.vocabulary}. Rhythm: ${c.voiceTraits.rhythm}. Tics: ${c.voiceTraits.tics}`
  ).join('\n');

  // Get the specific beats for this sequence
  const beatsContent = sequenceInfo.beats.map(beat => {
    const beatData = data.beatSheet.beats[beat as keyof typeof data.beatSheet.beats];
    return `- ${beat}: ${beatData}`;
  }).join('\n');

  // Build context from previous sequences
  const previousContext = data.context.lastSequenceSummary
    ? `\nPREVIOUS SEQUENCE SUMMARY:\n${data.context.lastSequenceSummary}\n\nCHARACTER STATES:\n${Object.entries(data.context.characterStates).map(([name, state]) => `- ${name}: ${state}`).join('\n')}\n\nESTABLISHED LOCATIONS: ${data.context.establishedLocations.join(', ') || 'None yet'}\n\nSETUPS TO PAY OFF: ${data.context.plantedSetups.filter(s => !data.context.resolvedPayoffs.includes(s)).join(', ') || 'None pending'}`
    : '';

  const prompt = `You are a professional Hollywood screenwriter writing SEQUENCE ${data.sequenceNumber} of 8 for a feature film.

MOVIE: "${data.title}" (${data.genre})
LOGLINE: ${data.beatSheet.logline}
THEME: ${data.beatSheet.theme}

THIS SEQUENCE COVERS:
Act ${sequenceInfo.act}, Pages ${sequenceInfo.pageRange}
Beats to hit:
${beatsContent}
${previousContext}

CHARACTER VOICE PROFILES (CRITICAL - each character MUST speak differently):
${characterVoices}

SCREENPLAY FORMAT RULES - FOLLOW EXACTLY:
1. Sluglines: "INT. LOCATION - DAY" or "EXT. LOCATION - NIGHT" (only these formats)
2. Action lines: Present tense, MAX 4 lines per paragraph, then break
3. Character names: ALL CAPS centered before dialogue
4. Dialogue: Natural, distinct voices per character
5. Parentheticals: Use sparingly ((beat), (O.S.), (V.O.) only when necessary)
6. Transitions: CUT TO:, FADE OUT. - use sparingly

ANTI-AI DIALOGUE RULES - CRITICAL:
- NEVER use: "I need you to understand", "Here's the thing", "Let me be clear", "With all due respect"
- NEVER have characters explain their feelings directly ("I feel sad because...")
- Characters interrupt, trail off, use incomplete sentences
- Subtext: Characters rarely say exactly what they mean
- Each character has DISTINCT vocabulary and rhythm

ANTI-AI ACTION RULES - CRITICAL:
- NEVER start action lines with: "We see", "We hear", "We watch", "The camera"
- Just describe what happens, not what the camera does
- Be visual and specific, not generic

Write approximately 12-15 pages of properly formatted screenplay.
Start with a slugline. End at a natural story beat.

OUTPUT: Write the screenplay sequence directly. No commentary or notes.`;

  const result = await withTimeout(
    () => getGeminiFlash().generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 12000,
      },
      safetySettings: SAFETY_SETTINGS,
    }),
    180000,
    `generateScreenplaySequence_${data.sequenceNumber}`
  );

  const content = result.response.text();
  const pageCount = estimatePageCount(content);

  return { content, pageCount };
}

/**
 * Summarize a screenplay sequence for context continuity
 */
export async function summarizeScreenplaySequence(data: {
  sequenceContent: string;
  sequenceNumber: number;
  characters: CharacterProfile[];
}): Promise<SequenceSummary> {
  const sequenceInfo = SEQUENCE_TO_BEATS[data.sequenceNumber];

  const prompt = `Summarize this screenplay sequence for continuity tracking.

SEQUENCE ${data.sequenceNumber} CONTENT:
${data.sequenceContent.substring(0, 8000)}

CHARACTERS TO TRACK: ${data.characters.map(c => c.name).join(', ')}

Provide a JSON summary:
{
  "sequenceNumber": ${data.sequenceNumber},
  "pageRange": "${sequenceInfo?.pageRange || 'unknown'}",
  "actNumber": ${sequenceInfo?.act || 2},
  "beatsCovered": ${JSON.stringify(sequenceInfo?.beats || [])},
  "summary": "200-word summary of key plot events...",
  "characterStates": {
    "CHARACTER_NAME": "Where they are emotionally and physically at end of sequence"
  },
  "plantedSetups": ["Things introduced that need payoff later (Chekhov's guns)"],
  "resolvedPayoffs": ["Setups from earlier sequences that were paid off here"]
}`;

  const result = await withTimeout(
    () => getGeminiFlash().generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
      safetySettings: SAFETY_SETTINGS,
    }),
    60000,
    'summarizeScreenplaySequence'
  );

  const response = result.response.text();
  return parseJSONFromResponse(response) as SequenceSummary;
}

/**
 * Review and polish a screenplay sequence for AI patterns
 * Similar to reviewAndPolishChapter but for screenplay format
 */
export async function reviewScreenplaySequence(
  sequenceContent: string,
  characters: CharacterProfile[]
): Promise<string> {
  // First, detect obvious AI patterns
  const bannedDialogue = SCREENPLAY_BANNED_PHRASES.filter(phrase =>
    sequenceContent.toLowerCase().includes(phrase.toLowerCase())
  );

  const bannedActions = SCREENPLAY_BANNED_ACTION_STARTS.filter(start =>
    new RegExp(`(^|\\n)\\s*${start}`, 'i').test(sequenceContent)
  );

  if (bannedDialogue.length === 0 && bannedActions.length === 0) {
    // No obvious patterns, return as-is
    return sequenceContent;
  }

  // Build character voice reference
  const characterVoices = characters.map(c =>
    `${c.name}: ${c.voiceTraits.vocabulary}, ${c.voiceTraits.rhythm}`
  ).join('\n');

  const prompt = `Review and fix this screenplay sequence. DO NOT change the story, just fix AI patterns.

ISSUES DETECTED:
${bannedDialogue.length > 0 ? `Dialogue phrases to remove/replace: ${bannedDialogue.join(', ')}` : ''}
${bannedActions.length > 0 ? `Action line starts to fix: ${bannedActions.join(', ')}` : ''}

CHARACTER VOICES (maintain distinct voices):
${characterVoices}

FIXES NEEDED:
1. Replace AI dialogue patterns with natural speech
2. Remove "We see/hear" from action lines - just describe what happens
3. Ensure each character sounds different
4. Add subtext where dialogue is too on-the-nose
5. Limit parentheticals (beat), (sighs), (nods) to once per page max

ORIGINAL SEQUENCE:
${sequenceContent}

OUTPUT: The fixed screenplay sequence. Keep the same scenes and story beats.`;

  const result = await withTimeout(
    () => getGeminiFlash().generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 12000,
      },
      safetySettings: SAFETY_SETTINGS,
    }),
    120000,
    'reviewScreenplaySequence'
  );

  return result.response.text();
}
