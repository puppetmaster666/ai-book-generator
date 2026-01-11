'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

const REDDIT_PIXEL_ID = 'a2_i9bj8x87t8ki';

export default function RedditPixel() {
  const { data: session } = useSession();

  useEffect(() => {
    // Initialize Reddit Pixel
    if (typeof window !== 'undefined' && !window.rdt) {
      const rdt = function (...args: unknown[]) {
        if (rdt.sendEvent) {
          rdt.sendEvent.apply(rdt, args);
        } else {
          rdt.callQueue.push(args);
        }
      } as RedditPixelFunction;
      rdt.callQueue = [];
      window.rdt = rdt;

      const script = document.createElement('script');
      script.src = 'https://www.redditstatic.com/ads/pixel.js';
      script.async = true;
      document.head.appendChild(script);
    }

    // Init with user email if logged in (for advanced matching)
    if (window.rdt) {
      const initOptions: RedditInitOptions = {
        optOut: false,
        useDecimalCurrencyValues: true,
      };

      // Add email for advanced matching if user is logged in
      if (session?.user?.email) {
        initOptions.email = session.user.email;
      }

      window.rdt('init', REDDIT_PIXEL_ID, initOptions);
      window.rdt('track', 'PageVisit');
    }
  }, [session]);

  return null;
}

interface RedditInitOptions {
  optOut?: boolean;
  useDecimalCurrencyValues?: boolean;
  email?: string;
  externalId?: string;
}

interface RedditPixelFunction {
  (...args: unknown[]): void;
  callQueue: unknown[][];
  sendEvent?: (...args: unknown[]) => void;
}

declare global {
  interface Window {
    rdt?: RedditPixelFunction;
  }
}
