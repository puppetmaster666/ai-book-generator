import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateAndPublishArticle } from '@/lib/blog/generate-article';

export const maxDuration = 800; // Fluid Compute - cover image generation can be slow

// GET - called by Vercel Cron (uses CRON_SECRET)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Blog Cron] CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Blog Cron] Triggered - generating new article...');
  const result = await generateAndPublishArticle();

  if (result.success) {
    return NextResponse.json({ success: true, title: result.title, slug: result.slug, url: `/blog/${result.slug}` });
  }

  return NextResponse.json({ success: false, error: result.error }, { status: 500 });
}

// POST - called by admin dashboard (uses session auth)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!adminUser?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Optional: generate multiple articles
  const body = await request.json().catch(() => ({}));
  const count = Math.min(body.count || 1, 5); // Max 5 at a time

  const results = [];
  for (let i = 0; i < count; i++) {
    console.log(`[Blog Admin] Generating article ${i + 1} of ${count}...`);
    const result = await generateAndPublishArticle();
    results.push(result);

    if (!result.success) {
      console.error(`[Blog Admin] Article ${i + 1} failed: ${result.error}`);
      // Continue trying remaining articles even if one fails
    }
  }

  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);

  return NextResponse.json({
    success: failures.length === 0,
    generated: successes.length,
    failed: failures.length,
    articles: successes.map(r => ({ title: r.title, slug: r.slug, url: `/blog/${r.slug}` })),
    errors: failures.map(r => r.error),
  });
}
