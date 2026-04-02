import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { SAFETY_SETTINGS } from './safety';

// Timeout: 700s - Vercel Fluid Compute allows up to 800s
const SAFETY_TIMEOUT_MS = 700000;

// Timeout constants for chapter generation
export const CHAPTER_GENERATION_TIMEOUT = 240000; // 4 minutes per chapter
export const REVIEW_PASS_TIMEOUT = 45000;
export const FAST_TASK_TIMEOUT = 30000;

// Single API key — no rotation complexity
let _genAI: GoogleGenerativeAI | null = null;
let _geminiPro: GenerativeModel | null = null;
let _geminiFlash: GenerativeModel | null = null;
let _geminiFlashLight: GenerativeModel | null = null;
let _geminiImage: GenerativeModel | null = null;

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return apiKey;
}

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(getApiKey());
  }
  return _genAI;
}

// Gemini 3.1 Pro for main generation
// Temperature 0.9 + topP 0.92 + frequencyPenalty 0.4 + presencePenalty 0.3
// = higher perplexity (less predictable words) + less repetition
// Research-backed: ICLR 2025 shows this range maximizes quality + creativity
export function getGeminiPro(): GenerativeModel {
  if (!_geminiPro) {
    _geminiPro = getGenAI().getGenerativeModel({
      model: 'gemini-3.1-pro-preview',
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature: 0.9,
        topP: 0.92,
        topK: 50,
        maxOutputTokens: 65536,
        frequencyPenalty: 0.4,
        presencePenalty: 0.3,
      },
    });
  }
  return _geminiPro;
}

// Gemini 3.1 Pro for fast tasks (outlines, ideas, summaries) — lower temperature
export function getGeminiFlash(): GenerativeModel {
  if (!_geminiFlash) {
    _geminiFlash = getGenAI().getGenerativeModel({
      model: 'gemini-3.1-pro-preview',
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

// Gemini 3.1 Pro for quick tasks (idea generation)
export function getGeminiFlashLight(): GenerativeModel {
  if (!_geminiFlashLight) {
    _geminiFlashLight = getGenAI().getGenerativeModel({
      model: 'gemini-3.1-pro-preview',
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 512,
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

// Review uses the same key — separate model instance not needed
export function getGeminiFlashForReview(): GenerativeModel {
  return getGeminiFlash();
}

// Legacy exports — no-ops since we have one key
export function markKeyAsWorking(): void {}
export function getLastWorkingKeyIndex(): number { return 0; }
export function getCurrentKeyIndex(): number { return 0; }
export function switchToLastWorkingKey(): boolean { return false; }
export function rotateApiKey(): boolean { return false; }
export function switchToBackupKey(): boolean { return false; }
export function switchToPrimaryKey(): void {}

// Stream content with timeout
export async function streamContent(
  model: GenerativeModel,
  prompt: string | { contents: Array<{ role: string; parts: Array<{ text: string }> }>; generationConfig?: Record<string, unknown> },
  onChunk: (text: string) => void,
): Promise<string> {
  let result;

  if (typeof prompt === 'string') {
    result = await model.generateContentStream(prompt);
  } else {
    result = await model.generateContentStream(prompt);
  }

  let fullText = '';
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullText += text;
      onChunk(text);
    }
  }

  return fullText;
}

/**
 * Run a Gemini API call with timeout and retry on rate limits.
 * - Single API key, exponential backoff with jitter on 429s
 * - Max 3 retries for rate limits, no retry for other errors
 */
export async function withTimeout<T>(
  createPromise: () => Promise<T>,
  _timeoutMs: number,
  operationName: string = 'operation'
): Promise<T> {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const attemptStart = Date.now();

    try {
      const result = await Promise.race([
        createPromise(),
        new Promise<T>((_, reject) =>
          setTimeout(() => {
            reject(new Error(`SAFETY_TIMEOUT: ${operationName} exceeded ${SAFETY_TIMEOUT_MS / 1000}s limit`));
          }, SAFETY_TIMEOUT_MS)
        )
      ]);

      const elapsed = Date.now() - attemptStart;
      console.log(`[Gemini] ${operationName} completed in ${elapsed}ms${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}`);
      return result;
    } catch (error) {
      lastError = error as Error;
      const elapsed = Date.now() - attemptStart;
      const errorMsg = lastError.message || 'Unknown error';
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate') || errorMsg.includes('exhausted') || errorMsg.includes('RESOURCE_EXHAUSTED');

      console.error(`[Gemini] ${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}, ${elapsed}ms): ${errorMsg.substring(0, 150)}`);

      if (isRateLimit && attempt < MAX_RETRIES) {
        // Exponential backoff with jitter: 2s, 4s, 8s + random 0-2s
        const backoff = Math.pow(2, attempt + 1) * 1000 + Math.random() * 2000;
        console.log(`[Gemini] Rate limited, waiting ${Math.round(backoff / 1000)}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }

      // Non-rate-limit error or retries exhausted — throw immediately
      if (isRateLimit) {
        throw new Error('AI service is busy. Your book will auto-resume shortly.');
      }
      throw lastError;
    }
  }

  throw lastError || new Error('AI service temporarily unavailable');
}

/**
 * Simple retry wrapper with exponential backoff for rate limits.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMsg = lastError.message || '';
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate') || errorMsg.includes('exhausted');

      if (isRateLimit && attempt < maxRetries) {
        const backoff = baseDelayMs * Math.pow(2, attempt) + Math.random() * baseDelayMs;
        console.log(`[Gemini] Rate limit on attempt ${attempt + 1}, waiting ${Math.round(backoff / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Failed after retries');
}
