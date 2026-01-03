'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function TrafficWarning() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/site-settings');
        if (res.ok) {
          const data = await res.json();
          setIsEnabled(data.trafficWarningEnabled);
        }
      } catch (error) {
        console.error('Failed to fetch site settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();

    // Poll every 30 seconds to check for updates
    const interval = setInterval(fetchSettings, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !isEnabled) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right duration-500">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-amber-400/30 rounded-2xl blur-xl animate-pulse" />

        {/* Main label */}
        <div className="relative bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Pulsing warning icon */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-30" />
              <div className="relative h-10 w-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>

            {/* Text content */}
            <div className="max-w-[240px]">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  High Traffic
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </div>
              <p className="text-xs text-amber-900/80 leading-tight">
                Some features may be limited, but don't worry—your books are guaranteed to be generated!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
