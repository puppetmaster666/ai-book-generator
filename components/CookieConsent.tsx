'use client';

import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check stored consent
    const consent = localStorage.getItem('cookie-consent');

    if (consent === 'accepted') {
      updateConsent(true);
    } else if (consent === 'declined') {
      updateConsent(false);
    } else {
      // No consent recorded, show banner
      setShowBanner(true);
    }
  }, []);

  const updateConsent = (granted: boolean) => {
    // gtag is defined in layout.tsx head
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'ad_storage': granted ? 'granted' : 'denied',
        'ad_user_data': granted ? 'granted' : 'denied',
        'ad_personalization': granted ? 'granted' : 'denied',
        'analytics_storage': granted ? 'granted' : 'denied',
      });
    }
  };

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    updateConsent(true);
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    updateConsent(false);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-800 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <h3
              className="text-lg font-semibold text-white mb-2"
              style={{ fontFamily: 'FoundersGrotesk, system-ui' }}
            >
              We value your privacy
            </h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              We use cookies to analyze site traffic and improve your experience.
              By clicking &quot;Accept&quot;, you consent to the use of analytics cookies.
              You can change your preferences anytime.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleDecline}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-lime-400 text-neutral-900 hover:bg-lime-300 transition-colors"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Type declaration for gtag
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}
