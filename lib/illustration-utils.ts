import { ILLUSTRATION_DIMENSIONS } from '@/lib/constants';

// Timeout for illustration generation (30 seconds) - prevents 504 Gateway Timeout
export const ILLUSTRATION_TIMEOUT_MS = 30000;

// Maximum retries for content-blocked illustrations
export const MAX_ILLUSTRATION_RETRIES = 3;

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

        // If blocked, try with sanitized version
        if (result.blocked && attempt < MAX_ILLUSTRATION_RETRIES) {
            if (attempt < 2) {
                // Retries 1-2: Progressively sanitize the original prompt
                currentScene = sanitizeSceneForRetry(data.scene, attempt + 1);
                console.log(`Sanitizing prompt (level ${attempt + 1}) and retrying...`);
            } else {
                // Final retry: Use a completely safe fallback scene
                currentScene = generateFallbackScene(
                    data.chapterTitle || 'Chapter',
                    data.bookTitle || 'Book',
                    data.setting || 'a peaceful environment'
                );
                console.log(`Using fallback atmospheric scene for final retry...`);
            }
            continue;
        }

        // If timed out, try one more time with simpler prompt
        if (result.timedOut && attempt === 0) {
            currentScene = sanitizeSceneForRetry(data.scene, 2);
            console.log(`Timed out, retrying with simplified prompt...`);
            continue;
        }

        // Other errors or final failure - stop retrying
        break;
    }

    console.warn(`Failed to generate illustration after ${MAX_ILLUSTRATION_RETRIES + 1} attempts`);
    return null;
}
