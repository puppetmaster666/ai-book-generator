'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface LightboxImage {
  url: string;
  alt?: string;
  caption?: string;
}

interface Props {
  images: LightboxImage[];
  startIndex: number;
  onClose: () => void;
}

// Reusable fullscreen image viewer with keyboard navigation, sliding transitions,
// and the yellow/lime roast palette so it ties into the rest of the product.
// Used by the homepage roast sample section and the book viewer for covers
// and panels.
export default function ImageLightbox({ images, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const next = useCallback(() => {
    setDirection('right');
    setIndex(i => (i + 1) % images.length);
  }, [images.length]);

  const prev = useCallback(() => {
    setDirection('left');
    setIndex(i => (i - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handler);
    };
  }, [onClose, next, prev]);

  if (images.length === 0) return null;
  const active = images[index];
  const hasMany = images.length > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* subtle spinning rays in the background for theme consistency */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="roast-section-rays" />
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-20 w-11 h-11 rounded-full bg-yellow-400 text-black flex items-center justify-center hover:bg-lime-400 hover:rotate-90 transition-all duration-300 shadow-xl"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {hasMany && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-yellow-400 text-black flex items-center justify-center hover:bg-lime-400 hover:-translate-x-1 hover:-translate-y-1/2 transition-all duration-300 shadow-xl"
            aria-label="Previous"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-yellow-400 text-black flex items-center justify-center hover:bg-lime-400 hover:translate-x-1 hover:-translate-y-1/2 transition-all duration-300 shadow-xl"
            aria-label="Next"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </>
      )}

      <div
        className="relative z-10 max-w-5xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          key={active.url}
          className={`relative mx-auto max-h-[85vh] rounded-2xl overflow-hidden border-4 border-yellow-400 shadow-2xl ${
            direction === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'
          }`}
          style={{ background: '#000' }}
        >
          <img
            src={active.url}
            alt={active.alt || ''}
            className="block w-full h-auto max-h-[85vh] object-contain"
          />
        </div>
        {hasMany && (
          <div className="mt-4 flex items-center justify-between text-xs md:text-sm">
            <span className="text-yellow-400 font-black uppercase tracking-widest">
              {index + 1} / {images.length}
            </span>
            {active.caption && (
              <span className="text-neutral-400 truncate max-w-[60%] text-right">
                {active.caption}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
