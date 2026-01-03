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
        <div className="absolute inset-0 bg-red-500/40 rounded-xl blur-lg animate-pulse" />

        {/* Main label */}
        <div className="relative bg-gradient-to-br from-red-600 to-red-700 border border-red-500 rounded-xl px-3 py-2.5 shadow-lg">
          <div className="flex items-center gap-2.5">
            {/* Pulsing warning icon */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-30" />
              <div className="relative h-8 w-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                <AlertTriangle className="h-4 w-4 text-red-700" />
              </div>
            </div>

            {/* Text content */}
            <div className="max-w-[180px]">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-300">
                  API Issues
                </span>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-400"></span>
                </span>
              </div>
              <p className="text-[11px] text-yellow-100 leading-tight">
                Generations may fail. If yours does, we will re-credit you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
