'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function BookError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="py-20 px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Something went wrong</h1>
          <p className="text-neutral-600 mb-6">
            There was an error loading this book. This can happen if the book is still being set up or if generation was interrupted.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-6 py-3 border border-neutral-200 text-neutral-700 rounded-full hover:bg-neutral-50 font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
          {error.message && (
            <p className="text-xs text-neutral-400 mt-6">
              Error: {error.message}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
