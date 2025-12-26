'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { Download, BookOpen, Loader2, Check, AlertCircle, ImageIcon, Mail, User } from 'lucide-react';
import Link from 'next/link';

interface Chapter {
  id: string;
  number: number;
  title: string;
  wordCount: number;
  createdAt: string;
}

interface Book {
  id: string;
  title: string;
  authorName: string;
  genre: string;
  status: string;
  currentChapter: number;
  totalChapters: number;
  totalWords: number;
  coverImageUrl: string | null;
  chapters: Chapter[];
  completedAt: string | null;
}

export default function BookProgress({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Start generation if payment successful
  useEffect(() => {
    if (success === 'true') {
      fetch(`/api/books/${id}/generate`, { method: 'POST' }).catch(console.error);
    }
  }, [success, id]);

  // Poll for book status
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await fetch(`/api/books/${id}`);
        if (!res.ok) throw new Error('Failed to fetch book');
        const data = await res.json();
        setBook(data.book);
      } catch (err) {
        setError('Failed to load book');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBook();

    // Poll every 5 seconds if still generating
    const interval = setInterval(() => {
      if (book?.status === 'generating' || book?.status === 'outlining') {
        fetchBook();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, book?.status]);

  const handleDownload = () => {
    window.open(`/api/books/${id}/download`, '_blank');
  };

  const handleCoverDownload = () => {
    if (book?.coverImageUrl) {
      const link = document.createElement('a');
      link.href = book.coverImageUrl;
      link.download = `${book.title.replace(/[^a-z0-9]/gi, '_')}_cover.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-900" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-24 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 text-red-700 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Book Not Found</h1>
            <p className="text-neutral-600">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  const progress = book.totalChapters > 0
    ? Math.round((book.currentChapter / book.totalChapters) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Book Header */}
          <div className="bg-white rounded-sm border border-neutral-200 p-6 sm:p-8 mb-6">
            <div className="flex items-start gap-6">
              {book.coverImageUrl ? (
                <img
                  src={book.coverImageUrl}
                  alt={book.title}
                  className="w-32 h-48 object-cover rounded-sm shadow-md"
                />
              ) : (
                <div className="w-32 h-48 bg-neutral-100 rounded-sm flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-neutral-500" />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-neutral-900 mb-1">{book.title}</h1>
                <p className="text-neutral-600 mb-4">by {book.authorName}</p>

                {/* Status Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-sm text-sm ${
                  book.status === 'completed'
                    ? 'bg-green-50 text-green-700'
                    : book.status === 'failed'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-neutral-100 text-neutral-900'
                }`}>
                  {book.status === 'completed' && <Check className="h-4 w-4" />}
                  {book.status === 'generating' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {book.status === 'outlining' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {book.status === 'failed' && <AlertCircle className="h-4 w-4" />}
                  <span className="capitalize">{book.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          {(book.status === 'generating' || book.status === 'outlining') && (
            <div className="bg-white rounded-sm border border-neutral-200 p-6 sm:p-8 mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Generation Progress</h2>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600">
                    {book.status === 'outlining' ? 'Creating outline...' : `Chapter ${book.currentChapter} of ${book.totalChapters}`}
                  </span>
                  <span className="font-medium text-neutral-900">{progress}%</span>
                </div>
                <div className="h-3 bg-neutral-200 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <p className="text-sm text-neutral-600">
                {book.totalWords.toLocaleString()} words written so far
              </p>
            </div>
          )}

          {/* Completed Section */}
          {book.status === 'completed' && (
            <div className="bg-white rounded-sm border border-neutral-200 p-6 sm:p-8 mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Your Book is Ready!</h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-neutral-50 rounded-sm p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">{book.totalChapters}</p>
                  <p className="text-sm text-neutral-600">Chapters</p>
                </div>
                <div className="bg-neutral-50 rounded-sm p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">{book.totalWords.toLocaleString()}</p>
                  <p className="text-sm text-neutral-600">Words</p>
                </div>
                <div className="bg-neutral-50 rounded-sm p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">{Math.round(book.totalWords / 250)}</p>
                  <p className="text-sm text-neutral-600">Pages (approx)</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-neutral-900 text-white rounded-sm hover:bg-black font-medium"
                >
                  <Download className="h-5 w-5" /> Download EPUB
                </button>

                {book.coverImageUrl && (
                  <button
                    onClick={handleCoverDownload}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 border border-neutral-900 text-neutral-900 rounded-sm hover:bg-neutral-100 font-medium"
                  >
                    <ImageIcon className="h-5 w-5" /> Download Cover Image
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Chapters List */}
          {book.chapters.length > 0 && (
            <div className="bg-white rounded-sm border border-neutral-200 p-6 sm:p-8 mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Chapters</h2>
              <div className="space-y-3">
                {book.chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-sm"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">
                        Chapter {chapter.number}: {chapter.title}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {chapter.wordCount.toLocaleString()} words
                      </p>
                    </div>
                    <Check className="h-5 w-5 text-green-700" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sign Up Section - show when book is completed */}
          {book.status === 'completed' && (
            <div className="bg-neutral-50 rounded-sm border border-neutral-200 p-6 sm:p-8">
              <div className="text-center mb-6">
                <User className="h-10 w-10 text-neutral-900 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-neutral-900 mb-2">Create an Account</h2>
                <p className="text-neutral-600 text-sm">
                  Save your books, generate more, and access them anytime.
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  href="/signup"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-neutral-900 text-white rounded-sm hover:bg-black font-medium"
                >
                  <Mail className="h-5 w-5" /> Sign up with Email
                </Link>

                <button
                  onClick={() => {/* TODO: Implement Google OAuth */}}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 border border-neutral-300 text-neutral-900 rounded-sm hover:bg-neutral-100 font-medium"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>

              <p className="text-center text-sm text-neutral-500 mt-4">
                Already have an account?{' '}
                <Link href="/login" className="text-neutral-900 underline hover:no-underline">
                  Log in
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
