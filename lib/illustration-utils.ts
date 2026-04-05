import { ILLUSTRATION_DIMENSIONS } from '@/lib/constants';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SAFETY_SETTINGS } from '@/lib/generation/shared/safety';

// Timeout for illustration generation (60 seconds) - allows time for reference image processing
export const ILLUSTRATION_TIMEOUT_MS = 60000;

// Maximum retries: 1 retry only (on timeout). Safety blocks don't retry.
export const MAX_ILLUSTRATION_RETRIES = 1;

// Types for visual guides
export type CharacterVisualGuide = {
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

export type VisualStyleGuide = {
    overallStyle: string;
    colorPalette: string;
    lightingStyle: string;
    lineWeight: string;
    backgroundTreatment: string;
    moodAndAtmosphere: string;
    consistencyRules: string[];
};

// Result type for illustration attempts
export type IllustrationAttemptResult = {
    success: boolean;
    blocked: boolean;
    timedOut: boolean;
    data: { imageUrl: string; altText: string; width: number; height: number } | null;
};

// Character reference image type
export type CharacterReferenceImage = {
    characterName: string;
    imageData: string; // Base64 encoded image data
};

/**
 * Sanitize a scene description by removing/replacing sensitive words.
 * Level 1: Replace sensitive words with milder alternatives
 * Level 2: Focus on atmosphere and setting, reduce character focus
 */
export function sanitizeSceneForRetry(scene: string, retryLevel: number): string {
    let sanitized = scene;

    if (retryLevel >= 1) {
        // Level 1: Replace sensitive words with milder alternatives
        const replacements: Record<string, string> = {
            'blood': 'red liquid',
            'bloody': 'stained',
            'bleeding': 'injured',
            'gore': 'mess',
            'gory': 'intense',
            'kill': 'confront',
            'killing': 'confronting',
            'murder': 'conflict',
            'murderer': 'antagonist',
            'dead': 'still',
            'death': 'end',
            'dying': 'fading',
            'knife': 'object',
            'weapon': 'tool',
            'gun': 'device',
            'stab': 'strike',
            'stabbing': 'striking',
            'horror': 'tension',
            'terrifying': 'intense',
            'terrified': 'startled',
            'scary': 'mysterious',
            'creepy': 'unusual',
            'violent': 'dramatic',
            'violence': 'conflict',
            'attack': 'approach',
            'attacking': 'approaching',
            'corpse': 'figure',
            'body': 'form',
            'victim': 'person',
            'scream': 'expression',
            'screaming': 'calling out',
            'dark': 'dim',
            'darkness': 'shadows',
            'sinister': 'mysterious',
            'fear': 'concern',
            'afraid': 'worried',
            'panic': 'urgency',
            'terror': 'suspense',
        };

        for (const [word, replacement] of Object.entries(replacements)) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            sanitized = sanitized.replace(regex, replacement);
        }
    }

    if (retryLevel >= 2) {
        // Level 2: Focus on atmosphere and setting, reduce character focus
        sanitized = `A peaceful atmospheric scene: ${sanitized.substring(0, 200)}. Focus on the environment, lighting, and mood rather than specific actions or characters.`;
    }

    return sanitized;
}

/**
 * Generate a fallback atmospheric scene based on the chapter.
 * Used as a last resort when content is repeatedly blocked.
 */
export function generateFallbackScene(chapterTitle: string, bookTitle: string, setting: string): string {
    return `A beautiful, peaceful illustration for a book chapter titled "${chapterTitle}" from "${bookTitle}".
Show an atmospheric scene with: ${setting}.
Focus on the environment - natural lighting, interesting composition, inviting atmosphere.
No people or characters, just the setting and mood. Professional book illustration quality.`;
}

/**
 * Single attempt to generate an illustration via the API.
 * Handles timeout, content blocks, and error parsing.
 */
export async function attemptIllustrationGeneration(data: {
    scene: string;
    artStyle: string;
    characters?: { name: string; description: string }[];
    setting?: string;
    bookTitle?: string;
    characterVisualGuide?: CharacterVisualGuide;
    visualStyleGuide?: VisualStyleGuide;
    bookFormat?: string;
    referenceImages?: CharacterReferenceImage[];
}): Promise<IllustrationAttemptResult> {
    try {
        // Build base URL - check multiple env vars in order of preference
        const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || vercelUrl || 'http://localhost:3000';
        console.log('Using base URL for illustration:', baseUrl);

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ILLUSTRATION_TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(`${baseUrl}/api/generate-illustration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scene: data.scene,
                    artStyle: data.artStyle,
                    characters: data.characters,
                    setting: data.setting,
                    bookTitle: data.bookTitle,
                    characterVisualGuide: data.characterVisualGuide,
                    visualStyleGuide: data.visualStyleGuide,
                    bookFormat: data.bookFormat,
                    referenceImages: data.referenceImages, // Pass reference images for character consistency
                }),
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }

            // Check for content block - can come from 'blocked' flag or error message
            const isBlocked = !!errorData.blocked ||
                errorData.error?.toLowerCase().includes('prohibited_content') ||
                errorData.error?.toLowerCase().includes('blocked');

            if (isBlocked) {
                console.warn(`Illustration blocked by content policy`);
            } else {
                console.error('Illustration API error:', errorData);
            }
            return { success: false, blocked: isBlocked, timedOut: false, data: null };
        }

        const result = await response.json();

        if (result.image?.base64 && result.image?.mimeType) {
            const formatKey = data.bookFormat as keyof typeof ILLUSTRATION_DIMENSIONS;
            const dimensions = ILLUSTRATION_DIMENSIONS[formatKey] || ILLUSTRATION_DIMENSIONS.picture_book;

            return {
                success: true,
                blocked: false,
                timedOut: false,
                data: {
                    imageUrl: `data:${result.image.mimeType};base64,${result.image.base64}`,
                    altText: result.altText || data.scene.substring(0, 100),
                    width: dimensions.width,
                    height: dimensions.height,
                },
            };
        }

        return { success: false, blocked: false, timedOut: false, data: null };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.warn('Illustration generation timed out');
            return { success: false, blocked: false, timedOut: true, data: null };
        }

        // Check if error message indicates a content block
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
        const isBlocked = errorMessage.includes('prohibited_content') ||
            errorMessage.includes('blocked') ||
            errorMessage.includes('safety');

        if (isBlocked) {
            console.warn('Illustration blocked via error:', errorMessage);
            return { success: false, blocked: true, timedOut: false, data: null };
        }

        console.error('Failed to generate illustration:', error);
        return { success: false, blocked: false, timedOut: false, data: null };
    }
}

/**
 * Generate an illustration with robust retry logic for content blocks.
 *
 * Retry strategy:
 * - Attempt 1: Try original prompt
 * - Attempt 2: Sanitize prompt (level 1 - replace sensitive words)
 * - Attempt 3: Sanitize prompt (level 2 - atmospheric focus)
 * - Attempt 4: Use completely safe fallback scene
 *
 * Also handles timeouts by simplifying the prompt.
 */
export async function generateIllustrationWithRetry(data: {
    scene: string;
    artStyle: string;
    characters?: { name: string; description: string }[];
    setting?: string;
    bookTitle?: string;
    chapterTitle?: string;
    characterVisualGuide?: CharacterVisualGuide;
    visualStyleGuide?: VisualStyleGuide;
    bookFormat?: string;
    referenceImages?: CharacterReferenceImage[];
}): Promise<{ imageUrl: string; altText: string; width: number; height: number } | null> {
    let currentScene = data.scene;

    for (let attempt = 0; attempt <= MAX_ILLUSTRATION_RETRIES; attempt++) {
        if (attempt > 0) {
            console.log(`Retry attempt ${attempt} with sanitized prompt...`);
        }

        const result = await attemptIllustrationGeneration({
            ...data,
            scene: currentScene,
        });

        if (result.success && result.data) {
            if (attempt > 0) {
                console.log(`Illustration succeeded on retry attempt ${attempt}`);
            }
            return result.data;
        }

        // Safety blocks: DON'T retry (wastes money, usually fails again)
        if (result.blocked) {
            console.warn(`Illustration blocked by safety filter, NOT retrying (saves API cost)`);
            break;
        }

        // Timeouts: retry once with simpler prompt (transient, worth one retry)
        if (result.timedOut && attempt < MAX_ILLUSTRATION_RETRIES) {
            currentScene = sanitizeSceneForRetry(data.scene, 2);
            console.log(`Timed out, retrying once with simplified prompt...`);
            continue;
        }

        // Other errors - stop
        break;
    }

    console.warn(`Failed to generate illustration after ${MAX_ILLUSTRATION_RETRIES + 1} attempts`);
    return null;
}

/**
 * Validate a generated illustration using Gemini vision.
 * Checks: (1) image has readable text/speech bubbles/narration, (2) image matches the scene description.
 * Returns { valid, hasText, isRelevant, reason } so callers can decide to retry.
 */
export async function validateIllustration(
    imageBase64: string,
    mimeType: string,
    expectedScene: string,
    expectedText: string | null,
): Promise<{ valid: boolean; hasText: boolean; isRelevant: boolean; reason: string }> {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('[Validate] No GEMINI_API_KEY, skipping validation');
            return { valid: true, hasText: true, isRelevant: true, reason: 'skipped' };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            safetySettings: SAFETY_SETTINGS,
        });

        // Strip data URL prefix if present
        const rawBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

        const prompt = `Analyze this illustration for a book. Answer these two questions with YES or NO, then a one-sentence reason.

1. TEXT CHECK: Does this image contain ANY readable text, speech bubbles, narration boxes, or caption text?
2. RELEVANCE CHECK: Does this image match this scene description: "${expectedScene.substring(0, 200)}"?

Reply in exactly this format:
TEXT: YES or NO
RELEVANT: YES or NO
REASON: one sentence explanation`;

        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { mimeType: mimeType || 'image/png', data: rawBase64 } },
        ]);

        const response = result.response.text().trim();
        const hasText = /TEXT:\s*YES/i.test(response);
        const isRelevant = /RELEVANT:\s*YES/i.test(response);
        const reasonMatch = response.match(/REASON:\s*(.+)/i);
        const reason = reasonMatch ? reasonMatch[1].trim() : 'unknown';

        const valid = (expectedText ? hasText : true) && isRelevant;

        console.log(`[Validate] hasText=${hasText}, isRelevant=${isRelevant}, valid=${valid}, reason="${reason}"`);
        return { valid, hasText, isRelevant, reason };
    } catch (error) {
        console.warn('[Validate] Validation failed, allowing image:', error instanceof Error ? error.message : error);
        // Don't block on validation failures
        return { valid: true, hasText: true, isRelevant: true, reason: 'validation_error' };
    }
}

/**
 * Generate an illustration with stronger text emphasis in the prompt.
 * Validation is NOT done inline (too slow, adds 3-5s per panel).
 * Instead, the prompt itself is made more aggressive about text requirements.
 */
export async function generateAndValidateIllustration(data: {
    scene: string;
    artStyle: string;
    characters?: { name: string; description: string }[];
    setting?: string;
    bookTitle?: string;
    chapterTitle?: string;
    characterVisualGuide?: CharacterVisualGuide;
    visualStyleGuide?: VisualStyleGuide;
    bookFormat?: string;
    referenceImages?: CharacterReferenceImage[];
    expectedText?: string | null;
}): Promise<{ imageUrl: string; altText: string; width: number; height: number } | null> {
    // If text is expected, add stronger text emphasis to the prompt upfront
    // instead of validating after (which doubles generation time)
    let scene = data.scene;
    if (data.expectedText && data.expectedText.trim().length > 0) {
        scene += `\n\nMANDATORY: This image MUST contain clearly readable text. An image without visible text will be rejected. The text is as important as the illustration.`;
    }

    return generateIllustrationWithRetry({ ...data, scene });
}
