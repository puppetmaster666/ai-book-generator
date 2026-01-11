// Reddit Conversions API - Server-side conversion tracking
// More reliable than client-side pixel (works with ad blockers, no browser required)

const REDDIT_PIXEL_ID = 'a2_i9bj8x87t8ki';
const REDDIT_CONVERSIONS_API_URL = `https://ads-api.reddit.com/api/v2.0/conversions/events/${REDDIT_PIXEL_ID}`;

interface RedditConversionEvent {
  event_at: string; // ISO 8601 timestamp
  event_type: {
    tracking_type: 'Purchase' | 'SignUp' | 'Lead' | 'AddToCart' | 'PageVisit';
  };
  user?: {
    email?: string; // SHA256 hashed
    ip_address?: string;
    user_agent?: string;
  };
  event_metadata?: {
    item_count?: number;
    value_decimal?: number;
    currency?: string;
    conversion_id?: string;
  };
}

/**
 * Hash email using SHA256 for Reddit's advanced matching
 */
async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Send a conversion event to Reddit's Conversions API (server-side)
 */
export async function trackRedditConversion({
  eventType,
  email,
  value,
  currency = 'USD',
  itemCount = 1,
  conversionId,
  ipAddress,
  userAgent,
}: {
  eventType: 'Purchase' | 'SignUp' | 'Lead' | 'AddToCart';
  email?: string;
  value?: number;
  currency?: string;
  itemCount?: number;
  conversionId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<boolean> {
  const token = process.env.REDDIT_CONVERSIONS_TOKEN;

  if (!token) {
    console.warn('[Reddit Conversions API] Token not configured, skipping');
    return false;
  }

  try {
    const event: RedditConversionEvent = {
      event_at: new Date().toISOString(),
      event_type: {
        tracking_type: eventType,
      },
    };

    // Add user data for matching
    if (email || ipAddress || userAgent) {
      event.user = {};
      if (email) {
        event.user.email = await hashEmail(email);
      }
      if (ipAddress) {
        event.user.ip_address = ipAddress;
      }
      if (userAgent) {
        event.user.user_agent = userAgent;
      }
    }

    // Add event metadata
    if (value !== undefined || conversionId) {
      event.event_metadata = {
        currency,
        item_count: itemCount,
      };
      if (value !== undefined) {
        event.event_metadata.value_decimal = value;
      }
      if (conversionId) {
        event.event_metadata.conversion_id = conversionId;
      }
    }

    const response = await fetch(REDDIT_CONVERSIONS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: [event],
        test_mode: process.env.NODE_ENV !== 'production',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Reddit Conversions API] Error:', response.status, errorText);
      return false;
    }

    console.log('[Reddit Conversions API] Event sent:', eventType, { value, conversionId });
    return true;
  } catch (error) {
    console.error('[Reddit Conversions API] Failed to send event:', error);
    return false;
  }
}

/**
 * Track a purchase conversion server-side
 */
export async function trackServerPurchase({
  email,
  value,
  currency = 'USD',
  conversionId,
  ipAddress,
  userAgent,
}: {
  email?: string;
  value: number;
  currency?: string;
  conversionId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return trackRedditConversion({
    eventType: 'Purchase',
    email,
    value,
    currency,
    itemCount: 1,
    conversionId,
    ipAddress,
    userAgent,
  });
}
