import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { trackRedditConversion } from '@/lib/reddit-conversions-api';

// Test endpoint for Reddit Conversions API - admin only
export async function POST() {
  // Require admin authentication
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

  const TEST_ID = 't2_24z99en8yp';

  try {
    const success = await trackRedditConversion({
      eventType: 'Purchase',
      email: 'test@example.com',
      value: 9.99,
      currency: 'USD',
      itemCount: 1,
      conversionId: `test_${Date.now()}`,
      testId: TEST_ID,
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test event sent successfully! Check Reddit Events Manager.',
        testId: TEST_ID,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send test event. Check server logs.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Test event error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
