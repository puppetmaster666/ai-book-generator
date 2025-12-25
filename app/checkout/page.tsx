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
    <div className="min-h-screen bg-[#FFFDF8]">
      <Header />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-xl border border-[#E8E4DC] p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-[#0F1A2A] mb-6">Complete Your Order</h1>

            {/* Order Summary */}
            <div className="bg-[#F7F5F0] rounded-lg p-4 mb-6">
              <h3 className="font-medium text-[#0F1A2A] mb-3">Order Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-[#4A5568]">AI Book Generation</span>
                {applyDiscount ? (
                  <span>
                    <span className="line-through text-[#4A5568] mr-2">${originalPrice.toFixed(2)}</span>
                    <span className="font-medium text-[#10B981]">${discountedPrice.toFixed(2)}</span>
                  </span>
                ) : (
                  <span className="font-medium text-[#0F1A2A]">${originalPrice.toFixed(2)}</span>
                )}
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-[#4A5568]">AI-Generated Cover</span>
                <span className="font-medium text-[#10B981]">Included</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-[#4A5568]">EPUB Download</span>
                <span className="font-medium text-[#10B981]">Included</span>
              </div>
              <hr className="my-3 border-[#E8E4DC]" />
              <div className="flex justify-between font-medium">
                <span className="text-[#0F1A2A]">Total</span>
                <span className="text-[#0F1A2A]">${discountedPrice.toFixed(2)}</span>
              </div>
              {applyDiscount && (
                <p className="text-xs text-[#10B981] mt-2">15% discount applied!</p>
              )}
            </div>

            {/* Email Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none"
              />
              <p className="text-xs text-[#4A5568] mt-1">We will send your book download link to this email</p>
            </div>

            {/* What You Get */}
            <div className="mb-6">
              <h3 className="font-medium text-[#0F1A2A] mb-3">What You Get</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-[#4A5568]">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  Complete book based on your specifications
                </li>
                <li className="flex items-center gap-2 text-sm text-[#4A5568]">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  Professional AI-generated cover
                </li>
                <li className="flex items-center gap-2 text-sm text-[#4A5568]">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  EPUB format ready for Amazon KDP
                </li>
                <li className="flex items-center gap-2 text-sm text-[#4A5568]">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  Full commercial rights
                </li>
              </ul>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={isLoading || !email}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D4A73] disabled:opacity-50 font-medium"
            >
              {isLoading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
              ) : (
                <><CreditCard className="h-5 w-5" /> Pay ${discountedPrice.toFixed(2)}</>
              )}
            </button>

            <p className="text-xs text-center text-[#4A5568] mt-4">
              Secure payment powered by Stripe. 30-day money-back guarantee.
            </p>
          </div>
        </div>
      </main>

      {/* Discount Popup */}
      {showDiscount && !applyDiscount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-[#0F1A2A] mb-2">Wait! Special Offer</h3>
            <p className="text-[#4A5568] mb-4">
              Get 15% off your book right now! This offer expires when you leave this page.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setApplyDiscount(true);
                  setShowDiscount(false);
                }}
                className="flex-1 px-4 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D4A73]"
              >
                Apply 15% Off
              </button>
              <button
                onClick={() => setShowDiscount(false)}
                className="px-4 py-3 border border-[#E8E4DC] rounded-lg hover:bg-[#F7F5F0]"
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
    <Suspense fallback={<div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
