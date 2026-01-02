'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ApiLimitWarning() {
  const [isVisible, setIsVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });

  // Set the end time (12 hours from a specific start time)
  // Change this timestamp to when you want the countdown to end
  const END_TIME = new Date('2026-01-04T00:00:00').getTime(); // 12 hours from now (adjust as needed)

  useEffect(() => {
    // Check if user has dismissed the warning
    const dismissed = localStorage.getItem('apiLimitWarningDismissed');
    if (!dismissed) {
      setIsVisible(true);
    }

    // Update countdown every second
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = END_TIME - now;

      if (distance < 0) {
        // Timer expired
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
        // Auto-dismiss when timer expires
        setIsVisible(false);
        localStorage.setItem('apiLimitWarningDismissed', 'true');
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeRemaining({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissal in localStorage (will reset when they clear browser data)
    localStorage.setItem('apiLimitWarningDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={handleDismiss} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-300">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Warning icon */}
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-neutral-900 text-center mb-2">
            Service Temporarily Limited
          </h2>

          {/* Message */}
          <div className="text-center mb-6">
            <p className="text-neutral-700 mb-3">
              We've reached our API limits for Google's AI service.
            </p>
            <p className="text-sm text-neutral-600 mb-4">
              Sorry for the inconvenience—it's Google's fault! 😅
            </p>

            {/* Countdown timer */}
            <div className="bg-neutral-100 rounded-xl p-4 mb-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
                Service resumes in:
              </p>
              <div className="flex justify-center gap-3">
                <div className="text-center">
                  <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                    <div className="text-2xl font-bold text-neutral-900">
                      {String(timeRemaining.hours).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">hours</div>
                  </div>
                </div>
                <div className="text-center flex items-center">
                  <div className="text-2xl font-bold text-neutral-400">:</div>
                </div>
                <div className="text-center">
                  <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                    <div className="text-2xl font-bold text-neutral-900">
                      {String(timeRemaining.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">mins</div>
                  </div>
                </div>
                <div className="text-center flex items-center">
                  <div className="text-2xl font-bold text-neutral-400">:</div>
                </div>
                <div className="text-center">
                  <div className="bg-white rounded-lg px-3 py-2 shadow-sm">
                    <div className="text-2xl font-bold text-neutral-900">
                      {String(timeRemaining.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">secs</div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-500">
              You can still browse the site, but book generation is temporarily paused.
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="w-full px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
}
