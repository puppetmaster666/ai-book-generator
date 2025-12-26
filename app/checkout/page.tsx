'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Check, CreditCard, Loader2 } from 'lucide-react';
import { PRICING } from '@/lib/constants';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookId = searchParams.get('bookId');

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [idleTime, setIdleTime] = useState(0);

  // Discount popup after 30 seconds of inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      setIdleTime(prev => prev + 1);
    }, 1000);

    if (idleTime >= 30 && !showDiscount && !applyDiscount) {
      setShowDiscount(true);
    }

    return () => clearInterval(interval);
  }, [idleTime, showDiscount, applyDiscount]);

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
      alert('Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          email,
          productType: 'one-time',
          applyDiscount,
        }),
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const originalPrice = PRICING.ONE_TIME.price / 100;
  const discountedPrice = applyDiscount ? originalPrice * 0.85 : originalPrice;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Complete Your Order
            </h1>
            <p className="text-neutral-600">Secure checkout powered by Stripe</p>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 p-8">
            {/* Order Summary */}
            <div className="bg-neutral-50 rounded-xl p-5 mb-6">
              <h3 className="font-medium mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Order Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">AI Book Generation</span>
                {applyDiscount ? (
                  <span>
                    <span className="line-through text-neutral-400 mr-2">${originalPrice.toFixed(2)}</span>
                    <span className="font-medium text-green-600">${discountedPrice.toFixed(2)}</span>
                  </span>
                ) : (
                  <span className="font-medium">${originalPrice.toFixed(2)}</span>
                )}
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-neutral-600">AI-Generated Cover</span>
                <span className="font-medium text-green-600">Included</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-neutral-600">EPUB Download</span>
                <span className="font-medium text-green-600">Included</span>
              </div>
              <hr className="my-4 border-neutral-200" />
              <div className="flex justify-between font-medium text-lg">
                <span>Total</span>
                <span>${discountedPrice.toFixed(2)}</span>
              </div>
              {applyDiscount && (
                <p className="text-xs text-green-600 mt-2">15% discount applied!</p>
              )}
            </div>

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
              <p className="text-xs text-neutral-500 mt-1">We&apos;ll send your book download link to this email</p>
            </div>

            {/* What You Get */}
            <div className="mb-6">
              <h3 className="font-medium mb-3" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>What You Get</h3>
              <ul className="space-y-2">
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
                <><CreditCard className="h-5 w-5" /> Pay ${discountedPrice.toFixed(2)}</>
              )}
            </button>

            <p className="text-xs text-center text-neutral-500 mt-4">
              Secure payment powered by Stripe. 30-day money-back guarantee.
            </p>
          </div>
        </div>
      </main>

      {/* Discount Popup */}
      {showDiscount && !applyDiscount && (
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
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-neutral-900" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
