'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Film, Palette, ImageIcon, Sparkles, ArrowRight } from 'lucide-react';

interface FeaturedItem {
  id: string;
  title: string;
  genre: string;
  bookType: string;
  bookFormat: string;
  coverImageUrl: string | null;
  authorName: string;
  totalWords: number;
  totalChapters: number;
}

// Placeholder data for empty slots
const PLACEHOLDERS: Omit<FeaturedItem, 'id'>[] = [
  { title: 'Your Novel Here', genre: 'Fantasy', bookType: 'text', bookFormat: 'text_only', coverImageUrl: null, authorName: 'Your Name', totalWords: 50000, totalChapters: 15 },
  { title: 'Epic Comic Adventure', genre: 'Action', bookType: 'visual', bookFormat: 'comic', coverImageUrl: null, authorName: 'Your Name', totalWords: 8000, totalChapters: 24 },
  { title: 'Award-Winning Script', genre: 'Drama', bookType: 'screenplay', bookFormat: 'screenplay', coverImageUrl: null, authorName: 'Your Name', totalWords: 25000, totalChapters: 8 },
  { title: 'Children\'s Picture Book', genre: 'Adventure', bookType: 'visual', bookFormat: 'picture_book', coverImageUrl: null, authorName: 'Your Name', totalWords: 500, totalChapters: 12 },
  { title: 'Sci-Fi Thriller', genre: 'Science Fiction', bookType: 'text', bookFormat: 'text_only', coverImageUrl: null, authorName: 'Your Name', totalWords: 80000, totalChapters: 20 },
  { title: 'Romance Novel', genre: 'Romance', bookType: 'text', bookFormat: 'text_only', coverImageUrl: null, authorName: 'Your Name', totalWords: 60000, totalChapters: 18 },
  { title: 'TV Series Pilot', genre: 'Mystery', bookType: 'screenplay', bookFormat: 'tv_series', coverImageUrl: null, authorName: 'Your Name', totalWords: 12000, totalChapters: 1 },
  { title: 'Graphic Novel', genre: 'Horror', bookType: 'visual', bookFormat: 'comic', coverImageUrl: null, authorName: 'Your Name', totalWords: 15000, totalChapters: 40 },
];

function getTypeIcon(bookFormat: string) {
  switch (bookFormat) {
    case 'screenplay':
    case 'tv_series':
      return <Film className="h-4 w-4" />;
    case 'comic':
      return <BookOpen className="h-4 w-4" />;
    case 'picture_book':
      return <Palette className="h-4 w-4" />;
    default:
      return <BookOpen className="h-4 w-4" />;
  }
}

function getTypeLabel(bookFormat: string) {
  switch (bookFormat) {
    case 'screenplay': return 'Movie Script';
    case 'tv_series': return 'TV Series';
    case 'comic': return 'Comic';
    case 'picture_book': return 'Picture Book';
    case 'text_only': return 'Novel';
    default: return 'Book';
  }
}

function getTypeColor(bookFormat: string) {
  switch (bookFormat) {
    case 'screenplay':
    case 'tv_series':
      return 'bg-purple-100 text-purple-700';
    case 'comic':
      return 'bg-blue-100 text-blue-700';
    case 'picture_book':
      return 'bg-pink-100 text-pink-700';
    default:
      return 'bg-neutral-100 text-neutral-700';
  }
}

export default function FeaturedShowcase() {
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/featured')
      .then(res => res.json())
      .then(data => {
        setFeatured(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fill remaining slots with placeholders to always show 8
  const displayItems: (FeaturedItem | (Omit<FeaturedItem, 'id'> & { id?: string; isPlaceholder: true }))[] = [
    ...featured,
    ...PLACEHOLDERS.slice(0, 8 - featured.length).map((p, i) => ({ ...p, id: `placeholder-${i}`, isPlaceholder: true as const })),
  ];

  return (
    <section className="py-20 px-6 bg-neutral-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-lime-100 px-4 py-2 rounded-full text-sm text-lime-700 mb-4">
            <Sparkles className="h-4 w-4" />
            Community Creations
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
            Featured{' '}
            <span className="relative inline-block">
              <span className="absolute -inset-x-1 -inset-y-1 bg-black -skew-y-2 translate-x-1 translate-y-1" aria-hidden="true" />
              <span className="absolute -inset-x-1 -inset-y-1 bg-lime-400 -skew-y-2" aria-hidden="true" />
              <span className="relative text-neutral-900 px-2">showcase</span>
            </span>
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Explore books, comics, and screenplays created by our community. Get inspired for your next creation.
          </p>
        </div>

        {/* Grid - 4 columns on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {displayItems.slice(0, 8).map((item, index) => {
            const isPlaceholder = 'isPlaceholder' in item && item.isPlaceholder;

            return (
              <div
                key={item.id || index}
                className={`group relative bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
                  isPlaceholder
                    ? 'border-dashed border-neutral-300 hover:border-lime-400'
                    : 'border-neutral-200 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                {/* Cover */}
                <div className={`aspect-[3/4] relative ${isPlaceholder ? 'bg-neutral-50' : 'bg-neutral-100'}`}>
                  {item.coverImageUrl ? (
                    <Image
                      src={item.coverImageUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                      {isPlaceholder ? (
                        <>
                          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                            <ImageIcon className="h-8 w-8 text-neutral-300" />
                          </div>
                          <span className="text-xs text-neutral-400 text-center">Your creation could be here</span>
                        </>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center">
                          {getTypeIcon(item.bookFormat)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Type Badge */}
                  <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getTypeColor(item.bookFormat)}`}>
                    {getTypeIcon(item.bookFormat)}
                    {getTypeLabel(item.bookFormat)}
                  </div>

                  {/* Hover Overlay for real items */}
                  {!isPlaceholder && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Link
                        href={`/book/${item.id}`}
                        className="px-4 py-2 bg-white text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-100 transition-colors flex items-center gap-2"
                      >
                        View Details
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}

                  {/* Placeholder CTA overlay */}
                  {isPlaceholder && (
                    <div className="absolute inset-0 bg-lime-400/0 group-hover:bg-lime-400/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Link
                        href="/create"
                        className="px-4 py-2 bg-lime-400 text-neutral-900 rounded-lg text-sm font-medium hover:bg-lime-500 transition-colors flex items-center gap-2"
                      >
                        Create Yours
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className={`font-semibold mb-1 line-clamp-1 ${isPlaceholder ? 'text-neutral-400' : 'text-neutral-900'}`}>
                    {item.title}
                  </h3>
                  <p className={`text-sm ${isPlaceholder ? 'text-neutral-300' : 'text-neutral-500'}`}>
                    {item.genre}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors"
          >
            Create Your Own
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
