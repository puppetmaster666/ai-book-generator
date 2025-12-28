'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Illustration {
  id: string;
  imageUrl: string;
  altText?: string;
}

interface PageProps {
  params: Promise<{ id: string; illustrationId: string }>;
}

export default function ImageViewerPage({ params }: PageProps) {
  const { id, illustrationId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allIllustrations, setAllIllustrations] = useState<Illustration[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const imageUrl = `/api/books/${id}/illustrations/${illustrationId}`;

  // Fetch all illustrations for navigation
  useEffect(() => {
    async function fetchIllustrations() {
      try {
        const response = await fetch(`/api/books/${id}`);
        if (response.ok) {
          const data = await response.json();
          // Collect all illustrations from chapters
          const illustrations: Illustration[] = [];
          data.book.chapters?.forEach((chapter: { illustrations?: Illustration[] }) => {
            chapter.illustrations?.forEach((ill: Illustration) => {
              illustrations.push(ill);
            });
          });
          setAllIllustrations(illustrations);
          const idx = illustrations.findIndex(ill => ill.id === illustrationId);
          setCurrentIndex(idx);
        }
      } catch (err) {
        console.error('Failed to fetch illustrations:', err);
      }
    }
    fetchIllustrations();
  }, [id, illustrationId]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allIllustrations.length - 1 && currentIndex >= 0;

  const goToPrev = () => {
    if (hasPrev) {
      router.push(`/book/${id}/image/${allIllustrations[currentIndex - 1].id}`);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      router.push(`/book/${id}/image/${allIllustrations[currentIndex + 1].id}`);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Escape') {
        router.push(`/book/${id}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, allIllustrations]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `illustration-${illustrationId}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800">
        <Link
          href={`/book/${id}`}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to book</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <Link
            href={`/book/${id}`}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Image Container */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {/* Left Navigation Arrow */}
        {hasPrev && (
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-neutral-800/80 hover:bg-neutral-700 text-white rounded-full transition-all shadow-lg backdrop-blur-sm"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}

        {/* Right Navigation Arrow */}
        {hasNext && (
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-neutral-800/80 hover:bg-neutral-700 text-white rounded-full transition-all shadow-lg backdrop-blur-sm"
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {error ? (
          <div className="text-center">
            <p className="text-neutral-400 mb-4">{error}</p>
            <Link
              href={`/book/${id}`}
              className="text-white underline hover:no-underline"
            >
              Return to book
            </Link>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt="Book illustration"
            className={`max-w-full max-h-[calc(100vh-120px)] object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${
              loading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError('Failed to load image');
            }}
          />
        )}

        {/* Page indicator */}
        {allIllustrations.length > 0 && currentIndex >= 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-neutral-800/80 backdrop-blur-sm rounded-full text-white text-sm">
            {currentIndex + 1} / {allIllustrations.length}
          </div>
        )}
      </div>
    </div>
  );
}
