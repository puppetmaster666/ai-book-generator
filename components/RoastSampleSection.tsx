'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, Sparkles } from 'lucide-react';

interface RoastSample {
  id: string;
  bookId: string;
  title: string;
  altText: string | null;
  imageUrl: string;
}

// Wonky offsets so the panels feel hand-placed, not gridded. Order here
// is rendered; index 2 sits in the middle and gets the "ringmaster" treatment.
const FLOATING_LAYOUT = [
  { top: '8%', left: '4%', rotate: -8, size: 'w-40 h-56', delay: '0s', z: 2 },
  { top: '28%', left: '68%', rotate: 6, size: 'w-36 h-52', delay: '0.4s', z: 3 },
  { top: '12%', left: '50%', rotate: -3, size: 'w-52 h-72', delay: '0.2s', z: 5 }, // center star
  { top: '58%', left: '12%', rotate: 10, size: 'w-36 h-52', delay: '0.6s', z: 3 },
  { top: '56%', left: '72%', rotate: -12, size: 'w-40 h-56', delay: '0.8s', z: 2 },
];

export default function RoastSampleSection({ variant = 'homepage' }: { variant?: 'homepage' | 'roast' }) {
  const [samples, setSamples] = useState<RoastSample[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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

  const layout = FLOATING_LAYOUT.slice(0, samples.length);

  return (
    <section className="relative py-24 px-6 overflow-hidden" style={{
      background: 'linear-gradient(135deg, #fde047 0%, #fb923c 40%, #ef4444 100%)',
    }}>
      {/* Circus stripes overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(0,0,0,0.15) 40px, rgba(0,0,0,0.15) 80px)',
      }} />

      {/* Floating sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Sparkles className="absolute top-12 left-12 h-6 w-6 text-yellow-200 animate-pulse" style={{ animationDuration: '2s' }} />
        <Sparkles className="absolute top-24 right-24 h-8 w-8 text-white animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
        <Sparkles className="absolute bottom-20 left-1/3 h-5 w-5 text-yellow-100 animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
        <Sparkles className="absolute top-1/2 right-1/4 h-7 w-7 text-white animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.2s' }} />
        <Flame className="absolute bottom-12 right-16 h-10 w-10 text-red-700 animate-bounce" style={{ animationDuration: '2s' }} />
        <Flame className="absolute top-16 left-1/3 h-8 w-8 text-orange-700 animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '0.6s' }} />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Top ticket-style banner */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-neutral-900 text-yellow-300 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl transform -rotate-2 animate-pulse" style={{ animationDuration: '3s' }}>
            <Flame className="h-4 w-4 text-orange-400" />
            Step Right Up
            <Flame className="h-4 w-4 text-orange-400" />
          </div>

          <h2 className="mt-6 text-6xl md:text-8xl font-black text-neutral-900 tracking-tighter leading-none" style={{
            fontFamily: 'FoundersGrotesk, system-ui',
            textShadow: '6px 6px 0 #fff, 12px 12px 0 rgba(0,0,0,0.25)',
          }}>
            ROAST
            <span className="inline-block ml-4 animate-wiggle text-red-900" style={{ transform: 'rotate(-4deg)' }}>SOMEONE</span>
          </h2>

          <p className="mt-6 text-lg md:text-xl font-bold text-neutral-900 max-w-2xl mx-auto">
            12 panels of beautiful destruction for <span className="bg-neutral-900 text-yellow-300 px-2 py-0.5 rounded">$3.99</span>. Upload a face. Pick how mean. We do the rest.
          </p>
        </div>

        {/* Panel collage — cards float in a wonky, rotated cluster */}
        <div className="relative h-[540px] mb-12">
          {samples.map((sample, i) => {
            const card = layout[i] || layout[layout.length - 1];
            const isHovered = hoveredIndex === i;
            const isCenter = i === 2 && samples.length >= 3;

            return (
              <button
                key={sample.id}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`absolute ${card.size} rounded-2xl overflow-hidden border-4 border-white shadow-2xl transition-all duration-500 animate-float cursor-pointer group`}
                style={{
                  top: card.top,
                  left: card.left,
                  transform: `rotate(${isHovered ? 0 : card.rotate}deg) scale(${isHovered ? 1.15 : 1})`,
                  zIndex: isHovered ? 50 : card.z,
                  animationDelay: card.delay,
                }}
                aria-label={sample.altText || sample.title}
              >
                <img
                  src={sample.imageUrl}
                  alt={sample.altText || `${sample.title} panel`}
                  className="w-full h-full object-cover"
                />
                {/* corner ribbon on the middle card */}
                {isCenter && (
                  <div className="absolute top-2 left-2 bg-red-600 text-yellow-200 text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg tracking-wider">
                    Roasted
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/roast"
            className="group inline-flex items-center gap-3 bg-neutral-900 text-yellow-300 px-10 py-5 rounded-full text-xl font-black uppercase tracking-wider shadow-2xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-all border-4 border-yellow-300"
          >
            <Flame className="h-6 w-6 text-orange-400 group-hover:animate-spin" style={{ animationDuration: '1s' }} />
            Roast Someone
            <Flame className="h-6 w-6 text-orange-400 group-hover:animate-spin" style={{ animationDuration: '1s' }} />
          </Link>
          <p className="mt-4 text-sm text-neutral-900 font-bold">
            Delivered in under 10 minutes. Hurts forever.
          </p>
        </div>
      </div>

      {/* Local keyframes for the wiggle and float animations */}
      <style jsx>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(var(--rot, 0deg)); }
          50% { transform: translateY(-12px) rotate(var(--rot, 0deg)); }
        }
        .animate-wiggle {
          display: inline-block;
          animation: wiggle 2.5s ease-in-out infinite;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
