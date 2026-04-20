'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Flame } from 'lucide-react';

interface RoastSample {
  id: string;
  bookId: string;
  title: string;
  altText: string | null;
  imageUrl: string;
}

const FAN_LAYOUT = [
  { rotate: -14, left: 0 },
  { rotate: -7, left: 48 },
  { rotate: 0, left: 96 },
  { rotate: 7, left: 144 },
  { rotate: 14, left: 192 },
];

export default function RoastSampleSection({ variant = 'homepage' }: { variant?: 'homepage' | 'roast' }) {
  const [samples, setSamples] = useState<RoastSample[]>([]);
  const [selected, setSelected] = useState<number | null>(2);
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

  if (!loaded) return null;
  if (samples.length === 0) return null;

  const layout = FAN_LAYOUT.slice(0, samples.length);

  return (
    <section className={`py-20 px-6 overflow-hidden ${variant === 'homepage' ? 'bg-white' : 'bg-neutral-50'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className={variant === 'homepage' ? 'order-2 md:order-1' : 'order-2 md:order-1'}>
            <div className="inline-flex items-center gap-2 bg-neutral-100 px-4 py-2 rounded-full text-sm text-neutral-700 mb-6 border border-neutral-200">
              <Flame className="h-4 w-4 text-neutral-900" />
              Roast Someone - $3.99
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-neutral-900" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Turn your friend into{' '}
              <span className="relative inline-block">
                <span className="absolute -inset-x-1 -inset-y-1 bg-black -skew-y-2 translate-x-1 translate-y-1" aria-hidden="true" />
                <span className="absolute -inset-x-1 -inset-y-1 bg-lime-400 -skew-y-2" aria-hidden="true" />
                <span className="relative text-neutral-900 px-2">a comic</span>
              </span>
            </h2>
            <p className="text-neutral-500 mb-8 leading-relaxed text-lg">
              12 panels of pure chaos. Upload a photo, describe your victim, pick an art style, done.
              Real samples from real roasts below. Tap any card to enlarge.
            </p>
            <Link
              href="/roast"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors font-medium"
            >
              <Flame className="h-5 w-5" />
              Roast Someone
            </Link>
          </div>

          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative w-80 h-96">
              {samples.map((sample, i) => {
                const card = layout[i] || layout[layout.length - 1];
                const isSelected = selected === i;
                return (
                  <button
                    key={sample.id}
                    onClick={() => setSelected(isSelected ? null : i)}
                    className={`absolute top-0 w-48 aspect-[2/3] rounded-lg overflow-hidden shadow-xl border-2 border-white bg-white transition-all duration-300 cursor-pointer ${
                      isSelected ? 'scale-110 shadow-2xl' : 'hover:scale-105'
                    }`}
                    style={{
                      transform: `rotate(${isSelected ? 0 : card.rotate}deg)`,
                      left: `${card.left}px`,
                      zIndex: isSelected ? 10 : i + 1,
                    }}
                    aria-label={sample.altText || sample.title}
                  >
                    <Image
                      src={sample.imageUrl}
                      alt={sample.altText || `${sample.title} panel`}
                      fill
                      className="object-cover"
                      sizes="192px"
                      unoptimized
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
