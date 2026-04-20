'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface RoastSample {
  id: string;
  bookId: string;
  title: string;
  altText: string | null;
  width?: number;
  height?: number;
  imageUrl: string;
}

// Poker-hand stack matching the Weaver's Mark showcase: tight horizontal
// overlap with gentle rotations so the group reads as a fanned card hand.
const STACK_LAYOUT = [
  { rotate: -12, left: 0 },
  { rotate: -6,  left: 30 },
  { rotate: 0,   left: 60 },
  { rotate: 6,   left: 90 },
  { rotate: 12,  left: 120 },
];

export default function RoastSampleSection({ variant = 'homepage' }: { variant?: 'homepage' | 'roast' }) {
  const [samples, setSamples] = useState<RoastSample[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(2);
  const [loaded, setLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/roast-samples')
      .then(res => res.json())
      .then(data => {
        setSamples((data.samples || []).slice(0, 5));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    // Check admin status so only admins see the drag handles + can reorder
    fetch('/api/user')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user?.isAdmin) setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  // Persist the new order to the server after a drag drop
  const persistOrder = useCallback(async (orderedIds: string[]) => {
    try {
      await fetch('/api/admin/roast-panels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (err) {
      console.error('Failed to save roast panel order:', err);
    }
  }, []);

  // Shift a card one position in the given direction. Clamps at the ends.
  const shiftCard = useCallback((index: number, direction: -1 | 1) => {
    setSamples(prev => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      persistOrder(next.map(s => s.id));
      return next;
    });
  }, [persistOrder]);

  const close = useCallback(() => setActiveIndex(null), []);
  const next = useCallback(() => {
    setSlideDirection('right');
    setActiveIndex(i => (i === null ? null : (i + 1) % samples.length));
  }, [samples.length]);
  const prev = useCallback(() => {
    setSlideDirection('left');
    setActiveIndex(i => (i === null ? null : (i - 1 + samples.length) % samples.length));
  }, [samples.length]);

  // Keyboard navigation + body scroll lock while the lightbox is open
  useEffect(() => {
    if (activeIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handler);
    };
  }, [activeIndex, close, next, prev]);

  if (!loaded || samples.length === 0) return null;

  const layout = STACK_LAYOUT.slice(0, samples.length);
  const activeSample = activeIndex !== null ? samples[activeIndex] : null;

  return (
    <>
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
                  <span
                    className="roast-text relative z-20 text-black uppercase tracking-[0.2em]"
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 900,
                      fontSize: '14px',
                      WebkitTextStroke: '0.3px black',
                    }}
                  >
                    Roast Someone
                  </span>
                </Link>
                <span className="text-yellow-400 font-bold text-sm">$3.99 &middot; 12 panels</span>
              </div>
            </div>

            {/* Right: poker-hand card stack of real roast panels. Card
                aspect ratio matches the first sample's actual image so
                nothing gets cropped. */}
            <div className="order-1 md:order-2 flex justify-center">
              <div className="relative w-80 h-96">
                {samples.map((sample, i) => {
                  const card = layout[i] || layout[layout.length - 1];
                  const isHovered = hoveredIndex === i;
                  // Use the first sample's aspect for all cards so the stack
                  // has consistent dimensions. Defaults to square if unknown.
                  const first = samples[0];
                  const cardAspect = first?.width && first?.height
                    ? `${first.width} / ${first.height}`
                    : '1 / 1';
                  return (
                    <div
                      key={sample.id}
                      className="absolute top-0 w-48"
                      style={{
                        left: `${card.left}px`,
                        zIndex: isHovered ? 50 : i + 1,
                      }}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(2)}
                    >
                      <button
                        onClick={() => {
                          setSlideDirection('right');
                          setActiveIndex(i);
                        }}
                        className={`block w-full rounded-lg overflow-hidden shadow-xl border-2 border-yellow-400 bg-black transition-all duration-300 cursor-pointer ${
                          isHovered ? 'scale-110 shadow-2xl' : 'hover:scale-105'
                        }`}
                        style={{
                          aspectRatio: cardAspect,
                          transform: `rotate(${isHovered ? 0 : card.rotate}deg)`,
                        }}
                        aria-label={`View ${sample.altText || sample.title} full size`}
                      >
                        <img
                          src={sample.imageUrl}
                          alt={sample.altText || `${sample.title} panel`}
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      </button>
                      {/* Admin-only reorder arrows. Show only on the currently
                          hovered card so the UI stays clean otherwise. */}
                      {isAdmin && isHovered && (
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-[60]">
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); shiftCard(i, -1); }}
                            disabled={i === 0}
                            className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center shadow-lg hover:bg-lime-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Move left"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); shiftCard(i, 1); }}
                            disabled={i === samples.length - 1}
                            className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center shadow-lg hover:bg-lime-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Move right"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox carousel — opens when a panel is clicked */}
      {activeSample !== null && activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop spinning rays, very subtle */}
          <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
            <div className="roast-section-rays" />
          </div>

          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="absolute top-4 right-4 md:top-6 md:right-6 z-20 w-11 h-11 rounded-full bg-yellow-400 text-black flex items-center justify-center hover:bg-lime-400 hover:rotate-90 transition-all duration-300 shadow-xl"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Prev */}
          {samples.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-yellow-400 text-black flex items-center justify-center hover:bg-lime-400 hover:-translate-x-1 hover:-translate-y-1/2 transition-all duration-300 shadow-xl"
              aria-label="Previous"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          )}

          {/* Next */}
          {samples.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-yellow-400 text-black flex items-center justify-center hover:bg-lime-400 hover:translate-x-1 hover:-translate-y-1/2 transition-all duration-300 shadow-xl"
              aria-label="Next"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          )}

          {/* Image frame */}
          <div
            className="relative z-10 max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              key={activeSample.id}
              className={`relative mx-auto max-h-[85vh] rounded-2xl overflow-hidden border-4 border-yellow-400 shadow-2xl ${
                slideDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'
              }`}
              style={{ background: '#000' }}
            >
              <img
                src={activeSample.imageUrl}
                alt={activeSample.altText || activeSample.title}
                className="block w-full h-auto max-h-[85vh] object-contain"
              />
            </div>

            {/* Counter + title */}
            <div className="mt-4 flex items-center justify-between text-xs md:text-sm">
              <span className="text-yellow-400 font-black uppercase tracking-widest">
                {activeIndex + 1} / {samples.length}
              </span>
              <span className="text-neutral-400 truncate max-w-[60%] text-right">
                {activeSample.altText || activeSample.title}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
