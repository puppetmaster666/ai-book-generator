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

    // Find books that were paid but are stuck (not actively generating or completed)
    const stuckBooks = await prisma.book.findMany({
      where: {
        paymentStatus: 'completed',
        status: {
          notIn: ['completed', 'generating', 'outlining'],
        },
        updatedAt: {
          lt: tenMinutesAgo,
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        bookFormat: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    console.log(
      `[Reconcile] Found ${stuckBooks.length} stuck book(s) with completed payment`
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
        // For visual books that already have an outline, use generate-visual to retry illustrations
        const isVisualBook = book.bookFormat === 'picture_book';
        const hasOutline = book.status === 'failed'; // Failed books likely have an outline already

        const endpoint = (isVisualBook && hasOutline)
          ? `/api/books/${book.id}/generate-visual`
          : `/api/books/${book.id}/generate`;

        console.log(`[Reconcile] Using endpoint: ${endpoint}`);

        const res = await fetch(`${appUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outlineOnly: false }),
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
