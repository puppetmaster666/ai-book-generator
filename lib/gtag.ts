// Google Analytics 4 conversion event helpers
// GA is loaded in app/layout.tsx; these helpers safely call window.gtag

type GtagEventParams = Record<string, string | number | boolean | undefined>;

function safeGtag(...args: [string, string, GtagEventParams?]) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

/** Fires when user lands on the checkout page */
export function trackBeginCheckout(value: number, currency = 'USD') {
  safeGtag('event', 'begin_checkout', { currency, value });
}

/** Fires after successful Stripe payment */
export function trackPurchase(value: number, transactionId: string, currency = 'USD') {
  safeGtag('event', 'purchase', { currency, value, transaction_id: transactionId });
}

/** Fires on successful user registration */
export function trackSignUp(method = 'credentials') {
  safeGtag('event', 'sign_up', { method });
}

/** Fires when user creates a free book / sample (lead gen) */
export function trackGenerateLead(bookId: string) {
  safeGtag('event', 'generate_lead', { currency: 'USD', value: 0, book_id: bookId });
}
