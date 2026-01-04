import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET - List all failed illustrations for a book
 * POST - Retry all failed illustrations (triggers individual retries)
 */

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: bookId } = await params;

    try {
        const book = await prisma.book.findUnique({
            where: { id: bookId },
            select: { id: true, title: true },
        });

        if (!book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        const failedIllustrations = await prisma.illustration.findMany({
            where: {
                bookId,
                status: 'failed',
            },
            select: {
                id: true,
                position: true,
                errorMessage: true,
                retryCount: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { position: 'asc' },
        });

        const completedCount = await prisma.illustration.count({
            where: { bookId, status: 'completed' },
        });

        return NextResponse.json({
            bookId,
            bookTitle: book.title,
            failedCount: failedIllustrations.length,
            completedCount,
            failed: failedIllustrations,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching failed illustrations:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: bookId } = await params;

    try {
        const book = await prisma.book.findUnique({
            where: { id: bookId },
            select: { id: true },
        });

        if (!book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        // Get all failed illustrations
        const failedIllustrations = await prisma.illustration.findMany({
            where: {
                bookId,
                status: 'failed',
            },
            select: {
                id: true,
                position: true,
                retryCount: true,
            },
            orderBy: { position: 'asc' },
        });

        if (failedIllustrations.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No failed illustrations to retry',
                retriedCount: 0,
            });
        }

        // Filter out illustrations that have reached max retries
        const MAX_RETRY_ATTEMPTS = 5;
        const retriable = failedIllustrations.filter(ill => ill.retryCount < MAX_RETRY_ATTEMPTS);

        if (retriable.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'All failed illustrations have reached maximum retry attempts',
                failedCount: failedIllustrations.length,
                maxedOutCount: failedIllustrations.length,
            });
        }

        // Trigger retries for each failed illustration
        // We do this sequentially to avoid overwhelming the API
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const results = [];

        for (const ill of retriable) {
            try {
                const response = await fetch(
                    `${baseUrl}/api/books/${bookId}/retry-illustration/${ill.id}`,
                    { method: 'POST' }
                );
                const result = await response.json();
                results.push({
                    illustrationId: ill.id,
                    position: ill.position,
                    success: result.success,
                    status: result.status,
                });
            } catch (err) {
                results.push({
                    illustrationId: ill.id,
                    position: ill.position,
                    success: false,
                    error: err instanceof Error ? err.message : 'Unknown error',
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: successCount > 0,
            message: `Retried ${retriable.length} illustrations: ${successCount} succeeded, ${failCount} failed`,
            retriedCount: retriable.length,
            successCount,
            failCount,
            skippedMaxRetries: failedIllustrations.length - retriable.length,
            results,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error retrying failed illustrations:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
