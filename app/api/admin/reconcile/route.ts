import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Generation Reconciliation Endpoint
 *
 * Finds books where the customer paid but generation never started or got stuck.
 * Designed to be called by a cron job (Vercel Cron or external) every few minutes.
 *
 * GET /api/admin/reconcile
 * Authorization: Bearer <CRON_SECRET>
 */

// Allow up to 60 seconds for the reconciliation run
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Verify secret key
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('[Reconcile] CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Query 1: Books that were paid but never started (failed, pending, preview_complete)
    const stuckNotStarted = await prisma.book.findMany({
      where: {
        paymentStatus: 'completed',
        status: { notIn: ['completed', 'generating', 'outlining'] },
        updatedAt: { lt: tenMinutesAgo },
      },
      select: { id: true, title: true, status: true, bookFormat: true, updatedAt: true, generationMode: true, currentChapter: true, totalChapters: true },
    });

    // Query 2: Server-driven books stuck in 'generating' (self-chain likely failed)
    const stuckGenerating = await prisma.book.findMany({
      where: {
        paymentStatus: 'completed',
        generationMode: 'server',
        status: 'generating',
        updatedAt: { lt: fifteenMinutesAgo }, // Longer threshold for server-driven
      },
      select: { id: true, title: true, status: true, bookFormat: true, updatedAt: true, generationMode: true, currentChapter: true, totalChapters: true },
    });

    const stuckBooks = [...stuckNotStarted, ...stuckGenerating];

    console.log(
      `[Reconcile] Found ${stuckBooks.length} stuck book(s) (${stuckNotStarted.length} not started, ${stuckGenerating.length} stuck generating)`
    );

    if (stuckBooks.length === 0) {
      return NextResponse.json({
        message: 'No stuck books found',
        checked: true,
        stuckCount: 0,
        triggered: [],
        errors: [],
      });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://draftmybook.com';
    const triggered: { id: string; title: string; status: string }[] = [];
    const errors: { id: string; title: string; error: string }[] = [];

    for (const book of stuckBooks) {
      console.log(
        `[Reconcile] Triggering generation for book "${book.title}" (${book.id}), status: ${book.status}, format: ${book.bookFormat}, last updated: ${book.updatedAt.toISOString()}`
      );

      try {
        // Determine the right endpoint based on book state
        const isVisualBook = book.bookFormat === 'picture_book';
        const isStuckGenerating = book.status === 'generating';
        let endpoint: string;

        if (isStuckGenerating && isVisualBook) {
          // Visual book stuck during image generation - resume with generate-visual
          endpoint = `/api/books/${book.id}/generate-visual`;
        } else if (isStuckGenerating && !isVisualBook) {
          // Text/screenplay stuck during chapter generation - resume with generate-next
          endpoint = `/api/books/${book.id}/generate-next`;
        } else if (isVisualBook && (book.status === 'failed' || book.currentChapter > 0)) {
          // Visual book that failed after outline was created - retry illustrations
          endpoint = `/api/books/${book.id}/generate-visual`;
        } else {
          // Everything else - start from scratch with generate
          endpoint = `/api/books/${book.id}/generate`;
        }

        console.log(`[Reconcile] Using endpoint: ${endpoint} (status: ${book.status}, chapter: ${book.currentChapter}/${book.totalChapters})`);

        const res = await fetch(`${appUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serverDriven: true }),
        });

        if (res.ok) {
          triggered.push({
            id: book.id,
            title: book.title,
            status: book.status,
          });
          console.log(
            `[Reconcile] Successfully triggered generation for "${book.title}" (${book.id})`
          );
        } else {
          const body = await res.text();
          errors.push({
            id: book.id,
            title: book.title,
            error: `HTTP ${res.status}: ${body.slice(0, 200)}`,
          });
          console.error(
            `[Reconcile] Failed to trigger generation for "${book.title}" (${book.id}): ${res.status} ${body.slice(0, 200)}`
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error';
        errors.push({ id: book.id, title: book.title, error: message });
        console.error(
          `[Reconcile] Error triggering generation for "${book.title}" (${book.id}): ${message}`
        );
      }
    }

    console.log(
      `[Reconcile] Done. Triggered: ${triggered.length}, Errors: ${errors.length}`
    );

    return NextResponse.json({
      message: `Reconciliation complete`,
      checked: true,
      stuckCount: stuckBooks.length,
      triggered,
      errors,
    });
  } catch (error) {
    console.error('[Reconcile] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Reconciliation failed',
        details:
          error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
