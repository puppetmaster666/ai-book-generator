'use client';

import { useState } from 'react';
import { X, Sparkles, Copy, Check } from 'lucide-react';
import Link from 'next/link';

const PROMO_CODE = 'SECOND50';

interface FirstBookDiscountPopupProps {
  onDismiss: () => void;
}

export default function FirstBookDiscountPopup({ onDismiss }: FirstBookDiscountPopupProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-neutral-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="p-8 pb-6 relative">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-lime-400 rounded-xl flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-neutral-900" />
            </div>
            <span className="text-xl font-bold text-white" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Congrats on your first book!
            </span>
          </div>

          {/* Big discount */}
          <div className="text-center my-6">
            <span className="relative inline-block">
              <span className="absolute -inset-x-1 -inset-y-1 bg-white/10 -skew-y-2 translate-x-1 translate-y-1" aria-hidden="true" />
              <span className="absolute -inset-x-1 -inset-y-1 bg-lime-400 -skew-y-2" aria-hidden="true" />
              <span className="relative text-neutral-900 px-2 text-5xl font-bold" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                50% OFF
              </span>
            </span>
          </div>

          <p className="text-white/70 text-center text-sm">
            your second book
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-t-3xl p-6">
          {/* Promo Code Box */}
          <div className="bg-neutral-100 rounded-2xl p-4 mb-6">
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Your promo code</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold tracking-wider text-neutral-900" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                {PROMO_CODE}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-full text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-neutral-500 text-center mb-4">
            Use this code at checkout on your next book.
          </p>

          <Link
            href="/create"
            onClick={onDismiss}
            className="block w-full py-3 bg-lime-400 text-neutral-900 rounded-full font-medium hover:bg-lime-300 transition-colors text-center"
          >
            Create Another Book
          </Link>

          <button
            onClick={onDismiss}
            className="w-full py-2 mt-2 text-neutral-500 text-sm hover:text-neutral-700 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
