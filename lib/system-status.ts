import { prisma } from '@/lib/db';

export const RATE_LIMIT_KEY = 'image_rate_limit';

// Mark the site as rate-limited for the next `hours` hours. Intended to be
// called after image generation exhausts both primary and fallback models
// with rate-limit errors — i.e. we've truly hit Google's daily quota and
// new roasts should not be attempted until the limit resets.
export async function flagImageRateLimited(hours = 24, message?: string) {
  const resetAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  await prisma.systemStatus.upsert({
    where: { key: RATE_LIMIT_KEY },
    update: {
      active: true,
      resetAt,
      message: message || null,
    },
    create: {
      key: RATE_LIMIT_KEY,
      active: true,
      resetAt,
      message: message || null,
    },
  });
}

// Returns the current status for the image rate limit. Automatically
// self-heals: if the flag is active but the reset time has passed,
// it clears the flag and returns inactive.
export async function getImageRateLimitStatus(): Promise<{
  active: boolean;
  resetAt: Date | null;
  message: string | null;
}> {
  const row = await prisma.systemStatus.findUnique({
    where: { key: RATE_LIMIT_KEY },
  });

  if (!row || !row.active) {
    return { active: false, resetAt: null, message: null };
  }

  if (row.resetAt && row.resetAt <= new Date()) {
    await prisma.systemStatus.update({
      where: { key: RATE_LIMIT_KEY },
      data: { active: false },
    });
    return { active: false, resetAt: null, message: null };
  }

  return {
    active: true,
    resetAt: row.resetAt,
    message: row.message,
  };
}

// Heuristic for classifying an error as a rate-limit / quota exhaustion
export function isRateLimitError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
  return (
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('429') ||
    msg.includes('resource exhausted') ||
    msg.includes('too many requests')
  );
}
