'use client';

import { useState, useEffect } from 'react';
import { X, Gift, Copy, Check } from 'lucide-react';

const PROMO_CODE = 'NY26';
const POPUP_DELAY_MS = 60000; // 60 seconds
const STORAGE_KEY = 'newyear2026_popup_dismissed';
const EXPIRY_DATE = new Date('2026-01-02T00:00:00Z');

export default function NewYearPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if promo has expired
    if (new Date() >= EXPIRY_DATE) {
      return;
    }

    // Check if already dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === 'true') {
      return;
    }

    // Show popup after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-6 text-white relative">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Gift className="h-8 w-8" />
            <span className="text-2xl font-bold" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Happy New Year!
            </span>
          </div>
          <p className="text-white/90 text-sm">
            Special offer until January 1st, 2026
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-neutral-900 mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              50% OFF
            </div>
            <p className="text-neutral-600">
              Your first book, on us (kind of)
            </p>
          </div>

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
            Enter this code at checkout to get 50% off your first book. Valid for single book purchases only.
          </p>

          <button
            onClick={handleDismiss}
            className="w-full py-3 bg-neutral-900 text-white rounded-full font-medium hover:bg-neutral-800 transition-colors"
          >
            Start Writing My Book
          </button>
        </div>
      </div>
    </div>
  );
}
