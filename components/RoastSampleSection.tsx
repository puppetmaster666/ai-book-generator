'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';

interface RoastSample {
  id: string;
  bookId: string;
  title: string;
  altText: string | null;
  imageUrl: string;
}

// Neat fan layout — five cards arranged like a poker hand, evenly spaced
const FAN_LAYOUT = [
  { rotate: -12, translateX: -180, translateY: 14 },
  { rotate: -6, translateX: -90, translateY: 4 },
  { rotate: 0, translateX: 0, translateY: 0 },
  { rotate: 6, translateX: 90, translateY: 4 },
  { rotate: 12, translateX: 180, translateY: 14 },
];

export default function RoastSampleSection({ variant = 'homepage' }: { variant?: 'homepage' | 'roast' }) {
  const [samples, setSamples] = useState<RoastSample[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(2);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/roast-samples')
      .then(res => res.json())
      .then(data => {
        setSamples((data.samples || []).slice(0, 5));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || samples.length === 0) return null;

  const layout = FAN_LAYOUT.slice(0, samples.length);

  return (
    <section className="relative py-16 px-6 overflow-hidden bg-black">
      {/* Hypnotic spinning rays matching the header roast button */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="roast-section-rays" />
      </div>
      {/* Vignette to keep edges dark so content stays readable */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 100%)',
      }} />

      <div className="relative max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: pitch */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-5">
              <Flame className="h-3.5 w-3.5" />
              New
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 leading-[1.05]" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Turn a friend into a
              {' '}
              <span className="relative inline-block">
                <span className="absolute -inset-x-1 -inset-y-1 bg-lime-400 -skew-y-2" aria-hidden="true" />
                <span className="relative text-black px-2">12-panel roast</span>
              </span>
            </h2>
            <p className="text-neutral-300 text-base md:text-lg leading-relaxed mb-3">
              Upload a photo, write one sentence about them, pick an art style. You get a full comic book roasting your target, delivered as a printable PDF.
            </p>
            <p className="text-neutral-400 text-sm mb-8">
              Severity slider goes from friendly jab to personal destruction. Done in under 10 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-center md:items-start justify-center md:justify-start">
              <Link
                href="/roast"
                className="roast-btn relative inline-flex items-center justify-center px-7 py-3 rounded-full cursor-pointer select-none"
              >
                <div className="roast-rays" />
                <div className="roast-vignette" />
                <span className="roast-text relative z-20 text-black uppercase tracking-[0.2em] text-sm font-black">
                  Roast Someone
                </span>
              </Link>
              <span className="text-yellow-400 font-bold text-sm">$3.99 &middot; 12 panels</span>
            </div>
          </div>

          {/* Right: clean fan of real roast panels */}
          <div className="relative h-80 flex items-center justify-center">
            <div className="relative">
              {samples.map((sample, i) => {
                const card = layout[i] || layout[layout.length - 1];
                const isHovered = hoveredIndex === i;
                return (
                  <button
                    key={sample.id}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(2)}
                    className="absolute top-1/2 left-1/2 w-36 h-52 -translate-x-1/2 -translate-y-1/2 rounded-xl overflow-hidden border-[3px] border-yellow-400 shadow-2xl transition-all duration-500 cursor-pointer"
                    style={{
                      transform: `translate(-50%, -50%) translate(${card.translateX}px, ${card.translateY}px) rotate(${isHovered ? 0 : card.rotate}deg) scale(${isHovered ? 1.15 : 1})`,
                      zIndex: isHovered ? 50 : i + 1,
                    }}
                    aria-label={sample.altText || sample.title}
                  >
                    <img
                      src={sample.imageUrl}
                      alt={sample.altText || `${sample.title} panel`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
