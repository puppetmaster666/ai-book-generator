// Reddit Conversions API v3 - Server-side conversion tracking
// More reliable than client-side pixel (works with ad blockers, no browser required)

const REDDIT_PIXEL_ID = 'a2_i9bj8x87t8ki';
const REDDIT_CONVERSIONS_API_URL = `https://ads-api.reddit.com/api/v3/pixels/${REDDIT_PIXEL_ID}/conversion_events`;

interface RedditConversionEventV3 {
  event_at: number; // Unix epoch timestamp in milliseconds
  action_source: 'web' | 'app' | 'offline';
  type: {
    tracking_type: 'Purchase' | 'SignUp' | 'Lead' | 'AddToCart' | 'PageVisit';
  };
  user?: {
    email?: string; // SHA256 hashed
    ip_address?: string;
    user_agent?: string;
    external_id?: string;
  };
  metadata?: {
    item_count?: number;
    value?: number;
    currency?: string;
    conversion_id?: string;
    products?: Array<{
      id?: string;
      name?: string;
      category?: string;
    }>;
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
 * Send a conversion event to Reddit's Conversions API v3 (server-side)
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
  productName,
  productCategory,
}: {
  eventType: 'Purchase' | 'SignUp' | 'Lead' | 'AddToCart';
  email?: string;
  value?: number;
  currency?: string;
  itemCount?: number;
  conversionId?: string;
  ipAddress?: string;
  userAgent?: string;
  productName?: string;
  productCategory?: string;
}): Promise<boolean> {
  const token = process.env.REDDIT_CONVERSIONS_TOKEN;

  if (!token) {
    console.warn('[Reddit Conversions API] Token not configured, skipping');
    return false;
  }

  try {
    const event: RedditConversionEventV3 = {
      event_at: Date.now(), // Unix epoch timestamp in milliseconds
      action_source: 'web',
      type: {
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

    // Add metadata (required fields for deduplication with pixel)
    event.metadata = {
      currency,
      item_count: itemCount,
    };
    if (value !== undefined) {
      event.metadata.value = value;
    }
    if (conversionId) {
      event.metadata.conversion_id = conversionId;
    }
    if (productName || productCategory) {
      event.metadata.products = [{
        name: productName,
        category: productCategory,
      }];
    }

    const response = await fetch(REDDIT_CONVERSIONS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          events: [event],
        },
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
  productName,
  productCategory,
}: {
  email?: string;
  value: number;
  currency?: string;
  conversionId?: string;
  ipAddress?: string;
  userAgent?: string;
  productName?: string;
  productCategory?: string;
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
    productName,
    productCategory,
  });
}
