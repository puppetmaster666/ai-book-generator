import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
    buildIllustrationPromptFromScene,
    buildSpeechBubblePrompt,
    buildPictureBookTextPrompt,
    type VisualChapter,
    type DialogueEntry,
    type ContentRating,
} from '@/lib/gemini';
import {
    generateIllustrationWithRetry,
    sanitizeSceneForRetry,
    generateFallbackScene,
} from '@/lib/illustration-utils';
import { ILLUSTRATION_DIMENSIONS } from '@/lib/constants';

// Allow up to 2 minutes for single panel retry
export const maxDuration = 120;

// Maximum retry attempts per panel
const MAX_RETRY_ATTEMPTS = 5;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; illustrationId: string }> }
) {
    const { id: bookId, illustrationId } = await params;

    try {
        // 1. Find the failed illustration
        const illustration = await prisma.illustration.findUnique({
            where: { id: illustrationId },
            include: {
                book: {
                    include: {
                        chapters: {
                            where: { number: { gte: 0 } },
                            orderBy: { number: 'asc' },
                        },
                    },
                },
                chapter: true,
            },
        });

        if (!illustration) {
            return NextResponse.json({ error: 'Illustration not found' }, { status: 404 });
        }

        if (illustration.bookId !== bookId) {
            return NextResponse.json({ error: 'Illustration does not belong to this book' }, { status: 400 });
        }

        if (illustration.status !== 'failed') {
            return NextResponse.json({
                error: 'Illustration is not in failed state',
                currentStatus: illustration.status,
            }, { status: 400 });
        }

        // Check retry count
        if (illustration.retryCount >= MAX_RETRY_ATTEMPTS) {
            return NextResponse.json({
                error: 'Maximum retry attempts reached',
                retryCount: illustration.retryCount,
                maxAttempts: MAX_RETRY_ATTEMPTS,
            }, { status: 400 });
        }

        const book = illustration.book;
        const bookFormat = book.bookFormat || 'picture_book';

        // Get visual guides for consistency
        const characterVisualGuide = book.characterVisualGuide as any;
        const visualStyleGuide = book.visualStyleGuide as any;
        const characterPortraits = book.characterPortraits as Array<{
            characterName: string;
            facePortrait: string;
            fullBodyPortrait: string;
        }> | null;

        // Get the outline to find the scene data
        const outline = book.outline as { chapters: VisualChapter[] } | null;
        let chapter: VisualChapter | undefined;

        if (outline?.chapters) {
            chapter = outline.chapters.find(ch => ch.number === illustration.position);
        }

        // 2. Mark illustration as generating
        await prisma.illustration.update({
            where: { id: illustrationId },
            data: {
                status: 'generating',
                errorMessage: null,
            },
        });

        // 3. Build the illustration prompt with progressive sanitization
        let illustrationPrompt: string;
        const retryLevel = illustration.retryCount + 1; // Current retry attempt (1-indexed)

        if (chapter?.scene) {
            // Determine if we need text baked into the image
            const hasDialogue = book.dialogueStyle === 'bubbles' && chapter.dialogue && chapter.dialogue.length > 0;
            const isPictureBook = bookFormat === 'picture_book' && !hasDialogue;
            const hasStoryText = isPictureBook && !!chapter.text && chapter.text.trim().length > 0;
            const needsTextBaking = !!(hasDialogue || hasStoryText);

            // Build base prompt
            illustrationPrompt = buildIllustrationPromptFromScene(
                chapter.scene,
                book.artStyle || 'illustration',
                undefined,
                undefined,
                chapter.panelLayout,
                { skipNoTextInstruction: needsTextBaking, contentRating: (book.contentRating || 'general') as ContentRating }
            );

            if (hasDialogue && chapter.dialogue) {
                const bubbles: DialogueEntry[] = chapter.dialogue.map(d => ({
                    speaker: d.speaker,
                    text: d.text,
                    position: d.position as any,
                    type: d.type as any,
                }));
                illustrationPrompt += buildSpeechBubblePrompt(bubbles);
            } else if (hasStoryText) {
                illustrationPrompt += buildPictureBookTextPrompt(chapter.text);
            } else {
                illustrationPrompt += `\nCRITICAL: Do NOT include any text, words, letters, numbers, signs, labels, or written characters anywhere in the image.`;
            }

            // Apply progressive sanitization based on retry level
            if (retryLevel >= 3) {
                // Use fallback atmospheric scene for higher retry levels
                illustrationPrompt = generateFallbackScene(
                    chapter.title || `Panel ${chapter.number}`,
                    book.title,
                    chapter.scene.background || 'a peaceful environment'
                );
                console.log(`[Retry] Using fallback atmospheric scene for panel ${illustration.position} (retry ${retryLevel})`);
            } else if (retryLevel >= 1) {
                // Apply sanitization to the original prompt
                illustrationPrompt = sanitizeSceneForRetry(illustrationPrompt, retryLevel);
                console.log(`[Retry] Sanitized prompt level ${retryLevel} for panel ${illustration.position}`);
            }
        } else {
            // No scene data - use the stored prompt with sanitization
            if (retryLevel >= 3) {
                illustrationPrompt = generateFallbackScene(
                    `Panel ${illustration.position}`,
                    book.title,
                    'a peaceful environment'
                );
            } else {
                illustrationPrompt = sanitizeSceneForRetry(
                    illustration.prompt || 'A peaceful book illustration',
                    retryLevel
                );
            }
        }

        // 4. Add explicit safety instruction for retries
        illustrationPrompt += `\n\nSAFETY OVERRIDE: This is a retry after content filter block. Generate a completely safe, family-friendly image. Avoid any violence, dark themes, or mature content. Focus on positive, peaceful imagery.`;

        // 5. Build reference images (limited to avoid payload issues)
        const referenceImages: { characterName: string; imageData: string }[] = [];
        const MAX_PORTRAIT_CHARACTERS = 2;
        let portraitCount = 0;

        if (characterPortraits && characterPortraits.length > 0 && chapter?.scene?.characters) {
            for (const charName of chapter.scene.characters) {
                const portrait = characterPortraits.find(p =>
                    p.characterName.toLowerCase() === charName.toLowerCase()
                );
                if (portrait && portraitCount < MAX_PORTRAIT_CHARACTERS) {
                    referenceImages.push({
                        characterName: `${charName} (face reference)`,
                        imageData: portrait.facePortrait,
                    });
                    portraitCount++;
                }
            }
        }

        // 6. Generate the illustration
        console.log(`[Retry] Attempting retry ${retryLevel} for panel ${illustration.position} of book ${bookId}`);

        const genResult = await generateIllustrationWithRetry({
            scene: illustrationPrompt,
            artStyle: book.artStyle || 'illustration',
            bookTitle: book.title,
            chapterTitle: chapter?.title || `Panel ${illustration.position}`,
            setting: chapter?.scene?.background,
            bookFormat: bookFormat,
            characterVisualGuide: characterVisualGuide,
            visualStyleGuide: visualStyleGuide,
            referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        });

        // 7. Update illustration based on result
        if (genResult) {
            // Success!
            console.log(`[Retry] Successfully regenerated panel ${illustration.position}`);

            await prisma.illustration.update({
                where: { id: illustrationId },
                data: {
                    imageUrl: genResult.imageUrl,
                    altText: genResult.altText,
                    width: genResult.width,
                    height: genResult.height,
                    status: 'completed',
                    errorMessage: null,
                    retryCount: retryLevel,
                    prompt: illustrationPrompt, // Update with sanitized prompt
                },
            });

            // Check if all illustrations are now complete
            const failedCount = await prisma.illustration.count({
                where: { bookId, status: 'failed' },
            });

            return NextResponse.json({
                success: true,
                status: 'completed',
                panelNumber: illustration.position,
                retryCount: retryLevel,
                remainingFailed: failedCount,
            });
        } else {
            // Failed again
            console.log(`[Retry] Retry ${retryLevel} failed for panel ${illustration.position}`);

            await prisma.illustration.update({
                where: { id: illustrationId },
                data: {
                    status: 'failed',
                    errorMessage: `Retry ${retryLevel} failed: Content still blocked by safety filter`,
                    retryCount: retryLevel,
                },
            });

            return NextResponse.json({
                success: false,
                status: 'failed',
                panelNumber: illustration.position,
                retryCount: retryLevel,
                maxAttempts: MAX_RETRY_ATTEMPTS,
                message: retryLevel >= MAX_RETRY_ATTEMPTS
                    ? 'Maximum retry attempts reached. Consider modifying the scene.'
                    : 'Retry failed. Try again with more sanitization.',
            });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Retry] Error retrying illustration ${illustrationId}:`, errorMessage);

        // Try to mark as failed
        try {
            await prisma.illustration.update({
                where: { id: illustrationId },
                data: {
                    status: 'failed',
                    errorMessage: errorMessage.substring(0, 500),
                },
            });
        } catch (updateErr) {
            console.error('[Retry] Failed to update illustration status:', updateErr);
        }

        return NextResponse.json(
            { error: `Retry failed: ${errorMessage}` },
            { status: 500 }
        );
    }
}
