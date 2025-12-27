'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, X } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string; illustrationId: string }>;
}

export default function ImageViewerPage({ params }: PageProps) {
  const { id, illustrationId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const imageUrl = `/api/books/${id}/illustrations/${illustrationId}`;

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
      <div className="flex-1 flex items-center justify-center p-4">
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
      </div>
    </div>
  );
}
