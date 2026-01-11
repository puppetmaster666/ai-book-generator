import { NextResponse } from 'next/server';
import { trackRedditConversion } from '@/lib/reddit-conversions-api';

// Test endpoint for Reddit Conversions API
// Only works in development or with correct test_id
export async function POST() {
  // Use your test_id from Reddit Events Manager
  const TEST_ID = 't2_24z99en8yp';

  try {
    const success = await trackRedditConversion({
      eventType: 'Purchase',
      email: 'test@example.com',
      value: 9.99,
      currency: 'USD',
      itemCount: 1,
      conversionId: `test_${Date.now()}`,
      testId: TEST_ID, // This ensures event doesn't count toward reporting
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
