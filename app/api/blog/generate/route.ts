import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateAndPublishArticle } from '@/lib/blog/generate-article';

export const maxDuration = 300; // Each article takes 1-2 min max

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

  // Generate ONE article per request (prevents timeout)
  console.log('[Blog Admin] Generating 1 article...');
  const result = await generateAndPublishArticle();

  if (result.success) {
    return NextResponse.json({
      success: true,
      generated: 1,
      failed: 0,
      articles: [{ title: result.title, slug: result.slug, url: `/blog/${result.slug}` }],
    });
  }

  return NextResponse.json({
    success: false,
    generated: 0,
    failed: 1,
    articles: [],
    errors: [result.error],
  }, { status: 500 });
}
