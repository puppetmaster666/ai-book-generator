import { NextResponse } from 'next/server';
import { getImageRateLimitStatus } from '@/lib/system-status';

// Public status endpoint — used by the /roast page and any other generation
// entry point to decide whether to show a "we hit API limits" banner and
// block new submissions until the reset time.
export async function GET() {
  try {
    const status = await getImageRateLimitStatus();
    return NextResponse.json({
      rateLimited: status.active,
      resetAt: status.resetAt,
      message: status.message,
    });
  } catch (err) {
    // If we can't check status, don't block users — fall open
    console.error('[system-status] read failed:', err);
    return NextResponse.json({ rateLimited: false, resetAt: null, message: null });
  }
}
