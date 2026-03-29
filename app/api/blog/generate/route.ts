import { NextRequest, NextResponse } from 'next/server';
import { generateAndPublishArticle } from '@/lib/blog/generate-article';

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  // Verify cron secret
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
    console.log(`[Blog Cron] Success: "${result.title}" at /blog/${result.slug}`);
    return NextResponse.json({
      success: true,
      title: result.title,
      slug: result.slug,
      url: `/blog/${result.slug}`,
    });
  }

  console.error(`[Blog Cron] Failed: ${result.error}`);
  return NextResponse.json({
    success: false,
    error: result.error,
  }, { status: 500 });
}
