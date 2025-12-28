'use client';

import { useEffect, useState, useRef } from 'react';

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

function AnimatedNumber({ value, suffix, duration = 2000 }: { value: number; suffix: string; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const isDecimal = value % 1 !== 0;

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = value * easeOut;

            setDisplayValue(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current));

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(value);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, duration, hasAnimated]);

  const formattedValue = displayValue >= 1000
    ? displayValue.toLocaleString()
    : displayValue.toString();

  return (
    <span ref={ref} className="tabular-nums">
      {formattedValue}{suffix}
    </span>
  );
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stat[]>([
    { value: 0, suffix: '+', label: 'Books Created' },
    { value: 0, suffix: '+', label: 'Authors' },
    { value: 2, suffix: ' min', label: 'Avg. Creation Time' },
  ]);

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats([
          { value: data.books || 0, suffix: '+', label: 'Books Created' },
          { value: data.users || 0, suffix: '+', label: 'Authors' },
          { value: data.avgTimeMinutes || 2, suffix: ' min', label: 'Avg. Creation Time' },
        ]);
      })
      .catch(console.error);
  }, []);

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-neutral-900">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div
                className="text-3xl sm:text-4xl font-bold text-lime-400 mb-2"
                style={{ fontFamily: 'FoundersGrotesk, system-ui' }}
              >
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-neutral-400 text-sm sm:text-base">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
