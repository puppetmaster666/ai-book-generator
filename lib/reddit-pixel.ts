// Reddit Pixel conversion tracking utilities
// Types are declared in components/RedditPixel.tsx

/**
 * Track a purchase conversion on Reddit Pixel
 * @param value - Purchase amount in dollars (e.g., 9.99)
 * @param currency - Currency code (default: 'USD')
 * @param itemCount - Number of items purchased (default: 1)
 * @param conversionId - Unique ID for deduplication (e.g., Stripe session_id)
 */
export function trackRedditPurchase(
  value: number,
  currency: string = 'USD',
  itemCount: number = 1,
  conversionId?: string
) {
  if (typeof window !== 'undefined' && window.rdt) {
    const eventData: Record<string, unknown> = {
      value,
      currency,
      itemCount,
    };
    if (conversionId) {
      eventData.conversionId = conversionId;
    }
    window.rdt('track', 'Purchase', eventData);
    console.log('[Reddit Pixel] Purchase tracked:', { value, currency, itemCount, conversionId });
  }
}

/**
 * Track a signup/registration conversion on Reddit Pixel
 */
export function trackRedditSignUp() {
  if (typeof window !== 'undefined' && window.rdt) {
    window.rdt('track', 'SignUp');
    console.log('[Reddit Pixel] SignUp tracked');
  }
}

/**
 * Track a lead conversion on Reddit Pixel (e.g., starting book creation)
 */
export function trackRedditLead() {
  if (typeof window !== 'undefined' && window.rdt) {
    window.rdt('track', 'Lead');
    console.log('[Reddit Pixel] Lead tracked');
  }
}

/**
 * Track adding to cart on Reddit Pixel
 * @param value - Cart value in dollars
 * @param currency - Currency code (default: 'USD')
 */
export function trackRedditAddToCart(value: number, currency: string = 'USD') {
  if (typeof window !== 'undefined' && window.rdt) {
    window.rdt('track', 'AddToCart', {
      value,
      currency,
    });
    console.log('[Reddit Pixel] AddToCart tracked:', { value, currency });
  }
}
