'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import ToastModal from '@/components/ToastModal';
import Link from 'next/link';
import { Check, CreditCard, Loader2, Tag, X, Gift, ArrowRight, User } from 'lucide-react';
import { PRICING, CREDIT_PACKS } from '@/lib/constants';
import { trackBeginCheckout } from '@/lib/gtag';

type PlanInfo = {
  price: number;
  label: string;
  description: string;
  isSubscription: boolean;
  interval?: 'month' | 'year';
};

const PLAN_TO_INFO: Record<string, PlanInfo> = {
  starter_monthly: { price: PRICING.STARTER_MONTHLY.price, label: 'Starter Plan', description: '600 credits per month, rollover included', isSubscription: true, interval: 'month' },
  starter_yearly: { price: PRICING.STARTER_YEARLY.price, label: 'Starter Plan (Yearly)', description: '7,200 credits per year, rollover included', isSubscription: true, interval: 'year' },
  author_monthly: { price: PRICING.AUTHOR_MONTHLY.price, label: 'Author Plan', description: '1,500 credits per month, rollover included', isSubscription: true, interval: 'month' },
  author_yearly: { price: PRICING.AUTHOR_YEARLY.price, label: 'Author Plan (Yearly)', description: '18,000 credits per year, rollover included', isSubscription: true, interval: 'year' },
  pro_monthly: { price: PRICING.PRO_MONTHLY.price, label: 'Pro Plan', description: '4,000 credits per month, rollover included', isSubscription: true, interval: 'month' },
  pro_yearly: { price: PRICING.PRO_YEARLY.price, label: 'Pro Plan (Yearly)', description: '48,000 credits per year, rollover included', isSubscription: true, interval: 'year' },
  monthly: { price: PRICING.MONTHLY.price, label: 'Author Plan', description: '5 novels per month with priority generation', isSubscription: true, interval: 'month' },
  yearly: { price: PRICING.YEARLY.price, label: 'Author Plan (Yearly)', description: '50 novel credits to use anytime', isSubscription: true, interval: 'year' },
  credit_single: { price: CREDIT_PACKS.single.price, label: CREDIT_PACKS.single.label, description: `${CREDIT_PACKS.single.credits.toLocaleString()} credits, no expiry`, isSubscription: false },
  credit_five: { price: CREDIT_PACKS.five_pack.price, label: CREDIT_PACKS.five_pack.label, description: `${CREDIT_PACKS.five_pack.credits.toLocaleString()} credits, no expiry`, isSubscription: false },
  credit_ten: { price: CREDIT_PACKS.ten_pack.price, label: CREDIT_PACKS.ten_pack.label, description: `${CREDIT_PACKS.ten_pack.credits.toLocaleString()} credits, no expiry`, isSubscription: false },
};

interface BookDetails {
  title: string;
  bookFormat: string;
  premise: string;
  artStyle?: string;
  email?: string;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const bookId = searchParams.get('bookId');
  const urlPromoCode = searchParams.get('promo');
  const planType = searchParams.get('plan');
  const planInfo: PlanInfo | null = planType ? PLAN_TO_INFO[planType] ?? null : null;
  const isPlanCheckout = !!planInfo;

  // Check if user is anonymous (not logged in)
  const isAnonymous = sessionStatus !== 'loading' && !session;

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [idleTime, setIdleTime] = useState(0);
  const [bookDetails, setBookDetails] = useState<BookDetails | null>(null);
  const [isLoadingBook, setIsLoadingBook] = useState(true);

  // Determine if this is a subscription checkout
  const isSubscription = !!planInfo?.isSubscription;

  // Promo code state
  const [promoCode, setPromoCode] = useState(urlPromoCode || '');
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string; type: 'error' | 'success' | 'info' | 'warning' } | null>(null);

  // Fetch book details (only for single-book purchases, not plan/credit-pack checkouts)
  useEffect(() => {
    if (isPlanCheckout) {
      setIsLoadingBook(false);
      return;
    }
    if (bookId) {
      fetch(`/api/books/${bookId}`)
        .then(res => res.json())
        .then(data => {
          setBookDetails(data.book);
          // Pre-fill email from book if available
          if (data.book?.email && !email) {
            setEmail(data.book.email);
          }
          setIsLoadingBook(false);
        })
        .catch(() => setIsLoadingBook(false));
    } else {
      setIsLoadingBook(false);
    }
  }, [bookId, isPlanCheckout]);

  // Auto-fill email from session if user is logged in
  useEffect(() => {
    if (session?.user?.email && !email) {
      setEmail(session.user.email);
    }
  }, [session, email]);

  // Auto-validate promo code from URL
  useEffect(() => {
    if (urlPromoCode) {
      validatePromoCode(urlPromoCode);
    }
  }, [urlPromoCode]);

  // GA4: track begin_checkout conversion on mount
  useEffect(() => {
    if (!isLoadingBook) {
      trackBeginCheckout(finalPrice);
    }
  }, [isLoadingBook]);

  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoDiscount(null);
      setPromoError('');
      return;
    }

    setIsValidatingPromo(true);
    setPromoError('');

    try {
      const response = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCode: code }),
      });

      const data = await response.json();

      if (data.valid) {
        setPromoDiscount(data.discount);
        setPromoError('');
        // If promo code is valid, disable the idle discount
        setApplyDiscount(false);
      } else {
        setPromoDiscount(null);
        setPromoError(data.error || 'Invalid promo code');
      }
    } catch (error) {
      setPromoDiscount(null);
      setPromoError('Failed to validate promo code');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // Discount popup after 30 seconds of inactivity (only if no promo applied, only once ever)
  useEffect(() => {
    if (promoDiscount) return;
    // Never show again if user already saw it (accepted or dismissed)
    if (typeof window !== 'undefined' && localStorage.getItem('checkout_discount_shown') === 'true') return;

    const interval = setInterval(() => {
      setIdleTime(prev => prev + 1);
    }, 1000);

    if (idleTime >= 30 && !showDiscount && !applyDiscount) {
      setShowDiscount(true);
      // Mark as shown so it never appears again
      localStorage.setItem('checkout_discount_shown', 'true');
    }

    return () => clearInterval(interval);
  }, [idleTime, showDiscount, applyDiscount, promoDiscount]);

  // Reset idle time on activity
  useEffect(() => {
    const resetIdle = () => setIdleTime(0);
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
    };
  }, []);

  const handleCheckout = async () => {
    if (!email) {
      setToast({ title: 'Email Required', message: 'Please enter your email address.', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: isPlanCheckout ? undefined : bookId,
          email,
          productType: isPlanCheckout ? planType : 'one-time',
          applyDiscount: !promoDiscount && applyDiscount,
          promoCode: promoDiscount ? promoCode : undefined,
        }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setToast({ title: 'Checkout Failed', message: 'Failed to start checkout. Please try again.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Get price based on product type
  const getBasePrice = () => {
    if (planInfo) return planInfo.price;
    if (!bookDetails) return PRICING.ONE_TIME.price;
    if (bookDetails.bookFormat === 'picture_book') return PRICING.VISUAL.price;
    return PRICING.ONE_TIME.price;
  };

  const getProductLabel = () => {
    if (planInfo) return planInfo.label;
    if (!bookDetails) return 'Book Generation';
    if (bookDetails.bookFormat === 'picture_book') return 'Visual Book';
    return 'Novel';
  };

  const getPriceLabel = () => {
    if (planInfo?.isSubscription) {
      return planInfo.interval === 'year' ? '/year' : '/month';
    }
    return '';
  };

  const originalPrice = getBasePrice() / 100;

  // Calculate final price
  let finalPrice = originalPrice;
  let discountLabel = '';

  if (promoDiscount) {
    finalPrice = originalPrice * (1 - promoDiscount);
    discountLabel = `${Math.round(promoDiscount * 100)}% off (${promoCode.toUpperCase()})`;
  } else if (applyDiscount) {
    finalPrice = originalPrice * 0.85;
    discountLabel = '15% off';
  }

  const clearPromoCode = () => {
    setPromoCode('');
    setPromoDiscount(null);
    setPromoError('');
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Toast Modal for errors/notifications */}
      {toast && (
        <ToastModal
          isOpen={!!toast}
          onClose={() => setToast(null)}
          title={toast.title}
          message={toast.message}
          type={toast.type}
        />
      )}

      <main className="py-16 px-6">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Complete Your Order
            </h1>
            <p className="text-neutral-600">Secure checkout powered by Stripe</p>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 p-8">
            {/* Plan / Credit Pack Header */}
            {isPlanCheckout && planInfo && (
              <div className="mb-6 pb-6 border-b border-neutral-200">
                <h3 className="font-semibold text-lg mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                  {planInfo.label}
                </h3>
                <p className="text-sm text-neutral-600">
                  {planInfo.description}
                </p>
              </div>
            )}

            {/* Book Preview (only for single-book purchases) */}
            {!isPlanCheckout && isLoadingBook ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            ) : !isPlanCheckout && bookDetails && (
              <div className="mb-6 pb-6 border-b border-neutral-200">
                <h3 className="font-semibold text-lg mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                  {bookDetails.title}
                </h3>
                <p className="text-sm text-neutral-600 line-clamp-3">{bookDetails.premise}</p>
                {bookDetails.artStyle && (
                  <span className="inline-block mt-2 text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full capitalize">
                    {bookDetails.artStyle} style
                  </span>
                )}
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-neutral-50 rounded-xl p-5 mb-6">
              <h3 className="font-medium mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Order Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">{getProductLabel()}</span>
                {(promoDiscount || applyDiscount) ? (
                  <span>
                    <span className="line-through text-neutral-400 mr-2">${originalPrice.toFixed(2)}{getPriceLabel()}</span>
                    <span className="font-medium text-green-600">${finalPrice.toFixed(2)}{getPriceLabel()}</span>
                  </span>
                ) : (
                  <span className="font-medium">${originalPrice.toFixed(2)}{getPriceLabel()}</span>
                )}
              </div>
              {isPlanCheckout && planInfo ? (
                <>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-neutral-600">{planInfo.description}</span>
                    <span className="font-medium text-green-600">Included</span>
                  </div>
                  {planInfo.isSubscription && (
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-neutral-600">Priority generation</span>
                      <span className="font-medium text-green-600">Included</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-neutral-600">AI-Generated Cover</span>
                    <span className="font-medium text-green-600">Included</span>
                  </div>
                  {bookDetails?.bookFormat !== 'text_only' && (
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-neutral-600">Illustrations</span>
                      <span className="font-medium text-green-600">Included</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-neutral-600">
                      {bookDetails?.bookFormat === 'picture_book'
                        ? 'PDF Download'
                        : bookDetails?.bookFormat === 'screenplay'
                          ? 'PDF / TXT Download'
                          : 'EPUB / PDF / TXT Download'}
                    </span>
                    <span className="font-medium text-green-600">Included</span>
                  </div>
                </>
              )}
              <hr className="my-4 border-neutral-200" />
              <div className="flex justify-between font-medium text-lg">
                <span>Total</span>
                <span>${finalPrice.toFixed(2)}{getPriceLabel()}</span>
              </div>
              {discountLabel && (
                <p className="text-xs text-green-600 mt-2">{discountLabel} applied!</p>
              )}
            </div>

            {/* Promo Code Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Promo Code</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="w-full pl-10 pr-10 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none transition-colors uppercase"
                    disabled={!!promoDiscount}
                  />
                  {promoCode && !promoDiscount && (
                    <button
                      onClick={clearPromoCode}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {promoDiscount ? (
                  <button
                    onClick={clearPromoCode}
                    className="px-4 py-3 bg-green-100 text-green-700 rounded-xl font-medium flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Applied
                  </button>
                ) : (
                  <button
                    onClick={() => validatePromoCode(promoCode)}
                    disabled={!promoCode.trim() || isValidatingPromo}
                    className="px-4 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isValidatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </button>
                )}
              </div>
              {promoError && (
                <p className="text-xs text-red-600 mt-1">{promoError}</p>
              )}
            </div>

            {/* FREE Book CTA for Anonymous Users */}
            {isAnonymous && !isPlanCheckout && bookId && (
              <>
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-neutral-500">or sign up for free</span>
                  </div>
                </div>
                <div className="mb-6 bg-gradient-to-br from-lime-50 to-green-50 rounded-2xl border-2 border-lime-300 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-lime-400 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Gift className="h-6 w-6 text-neutral-900" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-neutral-900 mb-1" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                        Try Free Sample!
                      </h3>
                      <p className="text-sm text-neutral-600 mb-4">
                        Sign up now to preview your book. No credit card required.
                      </p>
                      <Link
                        href={`/signup?bookId=${bookId}&free=true`}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-neutral-900 text-white rounded-full font-medium hover:bg-neutral-800 transition-colors"
                      >
                        <User className="h-4 w-4" />
                        Sign Up & Try Sample
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Email Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none transition-colors"
              />
              <p className="text-xs text-neutral-500 mt-1">
                {isPlanCheckout ? 'Your account will be linked to this email' : 'We\'ll send your book download link to this email'}
              </p>
            </div>

            {/* What You Get */}
            <div className="mb-6">
              <h3 className="font-medium mb-3" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>What You Get</h3>
              <ul className="space-y-2">
                {isPlanCheckout && planInfo ? (
                  <>
                    <li className="flex items-center gap-2 text-sm text-neutral-600">
                      <Check className="h-4 w-4 text-green-600" />
                      {planInfo.description}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-neutral-600">
                      <Check className="h-4 w-4 text-green-600" />
                      Professional covers for all books
                    </li>
                    {planInfo.isSubscription && (
                      <li className="flex items-center gap-2 text-sm text-neutral-600">
                        <Check className="h-4 w-4 text-green-600" />
                        Priority generation queue
                      </li>
                    )}
                    <li className="flex items-center gap-2 text-sm text-neutral-600">
                      <Check className="h-4 w-4 text-green-600" />
                      Full commercial rights
                    </li>
                    <li className="flex items-center gap-2 text-sm text-neutral-600">
                      <Check className="h-4 w-4 text-green-600" />
                      {planInfo.isSubscription ? 'Cancel anytime, unused credits roll over' : 'Credits never expire'}
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-2 text-sm text-neutral-600">
                      <Check className="h-4 w-4 text-green-600" />
                      Complete book based on your specifications
                    </li>
                    <li className="flex items-center gap-2 text-sm text-neutral-600">
                      <Check className="h-4 w-4 text-green-600" />
                      Professional AI-generated cover
                    </li>
                    <li className="flex items-center gap-2 text-sm text-neutral-600">
                      <Check className="h-4 w-4 text-green-600" />
                      EPUB format ready for Amazon KDP
                    </li>
                    <li className="flex items-center gap-2 text-sm text-neutral-600">
                      <Check className="h-4 w-4 text-green-600" />
                      Full commercial rights
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={isLoading || !email}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 disabled:opacity-50 font-medium transition-colors"
            >
              {isLoading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
              ) : (
                <><CreditCard className="h-5 w-5" /> {isSubscription ? `Subscribe - $${finalPrice.toFixed(2)}${getPriceLabel()}` : `Pay $${finalPrice.toFixed(2)}`}</>
              )}
            </button>

            <p className="text-xs text-center text-neutral-500 mt-4">
              Secure payment powered by Stripe.
            </p>
          </div>
        </div>
      </main>

      {/* Discount Popup (only shows if no promo code applied) */}
      {showDiscount && !applyDiscount && !promoDiscount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full animate-scale-in">
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Wait! Special Offer</h3>
            <p className="text-neutral-600 mb-6">
              Get 15% off your book right now! This offer expires when you leave this page.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setApplyDiscount(true);
                  setShowDiscount(false);
                }}
                className="flex-1 px-4 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 font-medium transition-colors"
              >
                Apply 15% Off
              </button>
              <button
                onClick={() => setShowDiscount(false)}
                className="px-4 py-3 border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors"
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-neutral-900" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
