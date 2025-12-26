'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { Download, BookOpen, Loader2, Check, AlertCircle, ImageIcon, Mail, User, Palette, PenTool, Clock, Zap } from 'lucide-react';
import Link from 'next/link';

interface Chapter {
  id: string;
  number: number;
  title: string;
  wordCount: number;
  createdAt: string;
}

interface Illustration {
  id: string;
  chapterId: string;
  imageUrl: string;
}

interface Book {
  id: string;
  title: string;
  authorName: string;
  genre: string;
  status: string;
  paymentStatus: string;
  currentChapter: number;
  totalChapters: number;
  totalWords: number;
  coverImageUrl: string | null;
  chapters: Chapter[];
  illustrations?: Illustration[];
  completedAt: string | null;
  bookFormat: string;
  artStyle: string | null;
  outline?: {
    chapters: Array<{
      number: number;
      title: string;
      summary: string;
    }>;
  };
}

const WRITING_MESSAGES = [
  "Crafting compelling prose",
  "Developing character arcs",
  "Building narrative tension",
  "Weaving plot threads",
  "Adding descriptive details",
  "Perfecting dialogue",
  "Creating memorable scenes",
];

const ILLUSTRATION_MESSAGES = [
  "Composing visual elements",
  "Rendering character details",
  "Applying art style",
  "Generating scene artwork",
  "Finalizing illustrations",
];

// Format elapsed time as MM:SS or HH:MM:SS
function formatElapsedTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function BookProgress({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [writingMessage, setWritingMessage] = useState(WRITING_MESSAGES[0]);
  const [generationStarted, setGenerationStarted] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  // Start generation if payment successful (either from URL param or from book status)
  useEffect(() => {
    const shouldStartGeneration =
      (success === 'true' || (book?.paymentStatus === 'completed' && book?.status === 'pending'))
      && !generationStarted;

    if (shouldStartGeneration) {
      setGenerationStarted(true);
      startTimeRef.current = Date.now();
      fetch(`/api/books/${id}/generate`, { method: 'POST' }).catch(console.error);
    }
  }, [success, id, generationStarted, book?.paymentStatus, book?.status]);

  // Timer for elapsed time during generation
  useEffect(() => {
    const isActive = book?.status === 'generating' || book?.status === 'outlining';

    if (isActive) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      const interval = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);

      return () => clearInterval(interval);
    } else if (book?.status === 'completed' || book?.status === 'failed') {
      startTimeRef.current = null;
    }
  }, [book?.status]);

  // Rotate writing messages
  useEffect(() => {
    if (book?.status === 'generating' || book?.status === 'outlining') {
      const interval = setInterval(() => {
        setWritingMessage(prev => {
          const messages = book?.bookFormat !== 'text_only' ? [...WRITING_MESSAGES, ...ILLUSTRATION_MESSAGES] : WRITING_MESSAGES;
          const currentIndex = messages.indexOf(prev);
          return messages[(currentIndex + 1) % messages.length];
        });
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [book?.status, book?.bookFormat]);

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

    // Poll every 3 seconds if still generating (faster updates)
    const interval = setInterval(() => {
      if (book?.status === 'generating' || book?.status === 'outlining' || book?.status === 'pending') {
        fetchBook();
      }
    }, 3000);

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
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-neutral-900 mx-auto mb-4" />
          <p className="text-neutral-600">Loading your book...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <Header />
        <main className="pt-24 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Book Not Found</h1>
            <p className="text-neutral-600 mb-6">{error}</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800"
            >
              Create a New Book
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const progress = book.totalChapters > 0
    ? Math.round((book.currentChapter / book.totalChapters) * 100)
    : 0;

  const isGenerating = book.status === 'generating' || book.status === 'outlining';
  const isPending = book.status === 'pending';
  const isIllustrated = book.bookFormat !== 'text_only';
  const currentChapterOutline = book.outline?.chapters?.[book.currentChapter];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Book Header */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {book.coverImageUrl ? (
                <img
                  src={book.coverImageUrl}
                  alt={book.title}
                  className="w-32 h-48 object-cover rounded-xl shadow-lg"
                />
              ) : (
                <div className="w-32 h-48 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-xl flex items-center justify-center relative overflow-hidden">
                  {isGenerating ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-100/50 to-transparent animate-pulse" />
                      <PenTool className="h-12 w-12 text-neutral-400" />
                    </>
                  ) : (
                    <BookOpen className="h-12 w-12 text-neutral-400" />
                  )}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-neutral-900 mb-1" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                  {book.title}
                </h1>
                <p className="text-neutral-600 mb-4">by {book.authorName}</p>

                {/* Status Badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  book.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : book.status === 'failed'
                    ? 'bg-red-100 text-red-700'
                    : isPending
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {book.status === 'completed' && <Check className="h-4 w-4" />}
                  {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isPending && <Clock className="h-4 w-4" />}
                  {book.status === 'failed' && <AlertCircle className="h-4 w-4" />}
                  <span className="capitalize">
                    {isPending ? 'Queued' : book.status}
                  </span>
                </div>

                {isIllustrated && book.artStyle && (
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                      <Palette className="h-3 w-3" />
                      {book.artStyle.charAt(0).toUpperCase() + book.artStyle.slice(1)} Style
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pending - Waiting for Generation */}
          {isPending && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 mb-6">
              {book.paymentStatus === 'completed' ? (
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-neutral-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                    Initializing Generation
                  </h2>
                  <p className="text-neutral-600 mb-4">
                    Your book is being prepared. This page updates automatically.
                  </p>
                  <div className="inline-flex items-center gap-2 text-sm text-neutral-500">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    <span>Connecting to AI</span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-amber-50 rounded-full flex items-center justify-center">
                    <Clock className="h-8 w-8 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                    Awaiting Payment
                  </h2>
                  <p className="text-neutral-600 mb-6">
                    Complete your purchase to start generating your book.
                  </p>
                  <Link
                    href={`/review?bookId=${id}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 font-medium transition-colors"
                  >
                    Continue to Checkout
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Progress Section */}
          {isGenerating && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 mb-6">
              {/* Header with Timer */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                      <PenTool className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">
                      {book.status === 'outlining' ? 'Creating Outline' : 'Writing Your Book'}
                    </h2>
                    <p className="text-sm text-neutral-500 transition-opacity duration-300">{writingMessage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-neutral-500">
                    <Clock className="h-4 w-4" />
                    <span className="font-mono text-lg font-medium text-neutral-900">{formatElapsedTime(elapsedTime)}</span>
                  </div>
                  <p className="text-xs text-neutral-400">elapsed</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600">
                    {book.status === 'outlining'
                      ? 'Preparing chapters...'
                      : `Chapter ${book.currentChapter} of ${book.totalChapters}`
                    }
                  </span>
                  <span className="font-medium text-neutral-900">{progress}%</span>
                </div>
                <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out rounded-full relative"
                    style={{ width: `${Math.max(progress, 2)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
              </div>

              {/* Current Chapter Info */}
              {currentChapterOutline && book.status === 'generating' && (
                <div className="bg-neutral-50 rounded-xl p-4 mb-4 border border-neutral-100">
                  <p className="text-xs uppercase tracking-wide text-neutral-400 mb-1">Currently writing</p>
                  <p className="font-medium text-neutral-900">
                    Chapter {book.currentChapter + 1}: {currentChapterOutline.title}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">{book.totalWords.toLocaleString()}</p>
                  <p className="text-xs text-neutral-500">Words</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">{book.chapters.length}</p>
                  <p className="text-xs text-neutral-500">Chapters</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">~{Math.round(book.totalWords / 250)}</p>
                  <p className="text-xs text-neutral-500">Pages</p>
                </div>
              </div>

              {isIllustrated && (
                <div className="mt-4 flex items-center gap-2 text-sm text-purple-700 bg-purple-50 rounded-xl px-4 py-3 border border-purple-100">
                  <Palette className="h-4 w-4" />
                  <span>Generating illustrations with each chapter</span>
                </div>
              )}
            </div>
          )}

          {/* Completed Section */}
          {book.status === 'completed' && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6 sm:p-8 mb-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Your Book is Ready!</h2>
                <p className="text-neutral-600">Download your masterpiece below</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">{book.totalChapters}</p>
                  <p className="text-sm text-neutral-600">Chapters</p>
                </div>
                <div className="bg-white/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">{book.totalWords.toLocaleString()}</p>
                  <p className="text-sm text-neutral-600">Words</p>
                </div>
                <div className="bg-white/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">~{Math.round(book.totalWords / 250)}</p>
                  <p className="text-sm text-neutral-600">Pages</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium transition-all hover:scale-[1.02]"
                >
                  <Download className="h-5 w-5" /> Download EPUB
                </button>

                {book.coverImageUrl && (
                  <button
                    onClick={handleCoverDownload}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-neutral-900 border border-neutral-200 rounded-xl hover:bg-neutral-50 font-medium transition-all"
                  >
                    <ImageIcon className="h-5 w-5" /> Download Cover Image
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Chapters List */}
          {book.chapters.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                Chapters {isGenerating && <span className="text-sm font-normal text-neutral-500">(updating live)</span>}
              </h2>
              <div className="space-y-2">
                {book.chapters.map((chapter, index) => (
                  <div
                    key={chapter.id}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                      index === book.chapters.length - 1 && isGenerating
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index === book.chapters.length - 1 && isGenerating
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {index === book.chapters.length - 1 && isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">
                          Chapter {chapter.number}: {chapter.title}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {chapter.wordCount.toLocaleString()} words
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sign Up Section - show when book is completed */}
          {book.status === 'completed' && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8">
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
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium"
                >
                  <Mail className="h-5 w-5" /> Sign up with Email
                </Link>

                <button
                  onClick={() => {/* TODO: Implement Google OAuth */}}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 border border-neutral-200 text-neutral-900 rounded-xl hover:bg-neutral-50 font-medium"
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
