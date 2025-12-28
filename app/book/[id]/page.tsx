'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import { Download, BookOpen, Loader2, Check, AlertCircle, ImageIcon, Mail, Palette, PenTool, Clock, Zap, AlertTriangle, Save, Trash2 } from 'lucide-react';
import { useGeneratingBook } from '@/contexts/GeneratingBookContext';
import Link from 'next/link';

interface Chapter {
  id: string;
  number: number;
  title: string;
  content: string;
  wordCount: number;
  createdAt: string;
}

interface Illustration {
  id: string;
  chapterId: string;
  imageUrl: string;
  altText: string;
  position: number;
  createdAt: string;
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
  dialogueStyle: string | null;
  bookPreset: string | null;
  userId: string | null;
  outline?: {
    chapters: Array<{
      number: number;
      title: string;
      summary: string;
    }>;
  };
}

// Lightweight status for polling (no heavy content/images)
interface BookStatus {
  id: string;
  status: string;
  paymentStatus: string;
  currentChapter: number;
  totalChapters: number;
  totalWords: number;
  bookFormat: string;
  dialogueStyle: string | null;
  bookPreset: string | null;
  artStyle: string | null;
  completedAt: string | null;
  generationStartedAt: string | null;
  chapterCount: number;
  illustrationCount: number;
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
  const router = useRouter();
  const { data: session } = useSession();
  const success = searchParams.get('success');
  const claimBook = searchParams.get('claimBook');

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectingToComic, setRedirectingToComic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writingMessage, setWritingMessage] = useState(WRITING_MESSAGES[0]);
  const [generationStarted, setGenerationStarted] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [bookClaimed, setBookClaimed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [serverStartTime, setServerStartTime] = useState<Date | null>(null);
  const [orchestrating, setOrchestrating] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const orchestrationRef = useRef<boolean>(false);
  const autoRetryRef = useRef<boolean>(false);
  const { setGeneratingBookId } = useGeneratingBook();

  // Claim book for user after Google sign-in redirect
  useEffect(() => {
    const claimBookForUser = async () => {
      if (claimBook && session && !bookClaimed) {
        const userId = (session.user as { id?: string })?.id;
        if (userId) {
          try {
            await fetch(`/api/books/${claimBook}/claim`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId }),
            });
            setBookClaimed(true);
            // Remove claimBook from URL
            router.replace(`/book/${id}`);
          } catch (err) {
            console.error('Failed to claim book:', err);
          }
        }
      }
    };
    claimBookForUser();
  }, [claimBook, session, id, router, bookClaimed]);

  // Check if this is a visual book (should use parallel panel generation page)
  const isVisualBook = book?.bookFormat === 'picture_book' || book?.dialogueStyle === 'bubbles' || book?.bookPreset === 'comic_story' || book?.bookPreset === 'childrens_picture';

  // Get current user ID for ownership check
  const currentUserId = (session?.user as { id?: string })?.id;

  // First: Load book and check if we need to redirect to visual generation page
  // This happens BEFORE any UI is shown
  useEffect(() => {
    const loadAndCheck = async () => {
      try {
        const res = await fetch(`/api/books/${id}`);
        if (!res.ok) throw new Error('Failed to fetch book');
        const data = await res.json();
        const loadedBook = data.book;

        // Check if current user owns this book (or it's a guest book with no owner)
        const isOwner = !loadedBook?.userId || loadedBook?.userId === currentUserId;

        // Check if this is a visual book that needs generation (comics OR picture books)
        const isVisual = loadedBook?.bookFormat === 'picture_book' ||
                         loadedBook?.dialogueStyle === 'bubbles' ||
                         loadedBook?.bookPreset === 'comic_story' ||
                         loadedBook?.bookPreset === 'childrens_picture';
        const needsGeneration = success === 'true' ||
          (loadedBook?.paymentStatus === 'completed' && loadedBook?.status === 'pending');

        // If it's a visual book that needs generation AND user owns it, redirect IMMEDIATELY
        if (isVisual && needsGeneration && isOwner) {
          setRedirectingToComic(true);
          // Start timer for preparation phase
          startTimeRef.current = Date.now();
          // Set generating book ID for header notification (visual books require staying on page)
          setGeneratingBookId(id);
          console.log('Visual book detected, generating outline and redirecting...');

          const genRes = await fetch(`/api/books/${id}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outlineOnly: true }),
          });
          const genData = await genRes.json();
          if (genData.success || genData.outlineOnly) {
            router.replace(`/generate-comic?bookId=${id}`);
            return; // Don't show this page at all
          }
        }

        // Not a comic, or already in progress - show this page
        setBook(loadedBook);
        setLoading(false);
      } catch (err) {
        setError('Failed to load book');
        console.error(err);
        setLoading(false);
      }
    };

    loadAndCheck();
  }, [id, success, router, currentUserId, setGeneratingBookId]);

  // Check if current user owns this book
  const isOwner = !book?.userId || book?.userId === currentUserId;

  // Start generation for text-only books (visual books use the parallel generation page)
  // This only creates the outline - chapters are generated by the orchestration effect below
  useEffect(() => {
    if (!book || isVisualBook || redirectingToComic) return;

    // Only start generation if user owns the book
    const shouldStartGeneration =
      (success === 'true' || (book.paymentStatus === 'completed' && book.status === 'pending'))
      && !generationStarted
      && isOwner;

    if (shouldStartGeneration) {
      setGenerationStarted(true);
      startTimeRef.current = Date.now();
      // Set generating book ID so header shows progress badge
      setGeneratingBookId(id);
      // Start with outline generation only - chapters will be orchestrated separately
      fetch(`/api/books/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outlineOnly: true }),
      }).catch(console.error);
    }
  }, [success, id, generationStarted, book, isVisualBook, redirectingToComic, setGeneratingBookId, isOwner]);

  // Client-side orchestration: automatically generate chapters one by one
  // This avoids Vercel's 300-second timeout by breaking generation into smaller chunks
  useEffect(() => {
    if (!book || isVisualBook || redirectingToComic) return;
    if (!isOwner) return; // Don't orchestrate for other users' books

    // Start orchestrating when:
    // 1. Book is in 'generating' status (outline is ready)
    // 2. We're not already orchestrating
    // 3. There are more chapters to generate
    const shouldOrchestrate =
      book.status === 'generating' &&
      !orchestrationRef.current &&
      book.currentChapter < book.totalChapters;

    if (!shouldOrchestrate) return;

    const orchestrateGeneration = async () => {
      orchestrationRef.current = true;
      setOrchestrating(true);

      let retryCount = 0;
      const maxRetries = 3;

      while (orchestrationRef.current) {
        try {
          console.log(`Orchestrating: generating next chapter...`);
          const res = await fetch(`/api/books/${id}/generate-next`, { method: 'POST' });
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || 'Generation failed');
          }

          // Reset retry count on success
          retryCount = 0;

          if (data.done) {
            console.log('Orchestration complete: all chapters generated');
            orchestrationRef.current = false;
            setOrchestrating(false);
            // Fetch full book data
            const fullRes = await fetch(`/api/books/${id}`);
            if (fullRes.ok) {
              const fullData = await fullRes.json();
              setBook(fullData.book);
            }
            break;
          }

          console.log(`Chapter ${data.currentChapter}/${data.totalChapters} complete`);

          // Small delay between chapters to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
          console.error('Orchestration error:', err);
          retryCount++;

          if (retryCount >= maxRetries) {
            console.error(`Max retries (${maxRetries}) reached, stopping orchestration`);
            orchestrationRef.current = false;
            setOrchestrating(false);
            break;
          }

          // Wait before retrying (exponential backoff)
          const waitTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(`Retrying in ${waitTime}ms (attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    };

    orchestrateGeneration();

    // Cleanup: stop orchestration when component unmounts
    return () => {
      orchestrationRef.current = false;
    };
  }, [book?.status, book?.currentChapter, book?.totalChapters, id, isOwner, isVisualBook, redirectingToComic]);

  // Auto-retry for failed generations (max 2 automatic retries)
  useEffect(() => {
    if (!book || isVisualBook || redirectingToComic) return;
    if (!isOwner) return; // Don't auto-retry for other users' books
    if (autoRetryRef.current) return; // Already retrying

    const MAX_AUTO_RETRIES = 2;

    // Auto-retry when book fails and we haven't exceeded retry limit
    if (book.status === 'failed' && autoRetryCount < MAX_AUTO_RETRIES) {
      autoRetryRef.current = true;

      // Wait a moment before retrying
      const retryDelay = (autoRetryCount + 1) * 3000; // 3s, 6s
      console.log(`Auto-retry ${autoRetryCount + 1}/${MAX_AUTO_RETRIES} in ${retryDelay}ms...`);

      const timer = setTimeout(async () => {
        try {
          console.log(`Executing auto-retry ${autoRetryCount + 1}...`);
          setAutoRetryCount(prev => prev + 1);
          orchestrationRef.current = false; // Reset orchestration

          const res = await fetch(`/api/books/${id}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outlineOnly: true }),
          });

          if (res.ok) {
            console.log('Auto-retry initiated successfully');
          } else {
            const data = await res.json();
            console.error('Auto-retry failed:', data.error);
          }
        } catch (err) {
          console.error('Auto-retry error:', err);
        } finally {
          autoRetryRef.current = false;
        }
      }, retryDelay);

      return () => clearTimeout(timer);
    }
  }, [book?.status, autoRetryCount, id, isOwner, isVisualBook, redirectingToComic]);

  // Timer for elapsed time during generation OR preparation
  // Uses server's generationStartedAt when available for accurate time across page visits
  useEffect(() => {
    const isActive = book?.status === 'generating' || book?.status === 'outlining' || redirectingToComic;

    if (isActive) {
      // Use server start time if available (accurate even when viewing someone else's book)
      // Otherwise fall back to local time for new generations
      const getStartTime = () => {
        if (serverStartTime) {
          return serverStartTime.getTime();
        }
        if (!startTimeRef.current) {
          startTimeRef.current = Date.now();
        }
        return startTimeRef.current;
      };

      const interval = setInterval(() => {
        const startTime = getStartTime();
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Calculate initial elapsed time immediately
      const startTime = getStartTime();
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));

      return () => clearInterval(interval);
    } else if (book?.status === 'completed' || book?.status === 'failed') {
      startTimeRef.current = null;
    }
  }, [book?.status, redirectingToComic, serverStartTime]);

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

  // Poll for book status using lightweight endpoint (saves ~99% bandwidth)
  useEffect(() => {
    // Lightweight status fetch for polling (only essential fields, no content/images)
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/books/${id}/status`);
        if (!res.ok) throw new Error('Failed to fetch status');
        const data = await res.json();
        const status: BookStatus = data.status;

        // Capture the server's generation start time (actual time generation began)
        if (status.generationStartedAt && !serverStartTime) {
          setServerStartTime(new Date(status.generationStartedAt));
        }

        // Update book with status info (preserves existing heavy data)
        setBook(prev => prev ? {
          ...prev,
          status: status.status,
          paymentStatus: status.paymentStatus,
          currentChapter: status.currentChapter,
          totalChapters: status.totalChapters,
          totalWords: status.totalWords,
        } : prev);

        // When generation completes, fetch full book with all content
        if (status.status === 'completed' && book?.status !== 'completed') {
          const fullRes = await fetch(`/api/books/${id}`);
          if (fullRes.ok) {
            const fullData = await fullRes.json();
            setBook(fullData.book);
          }
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    };

    // Fetch immediately if generating to get the serverStartTime
    if ((book?.status === 'generating' || book?.status === 'outlining') && !serverStartTime) {
      fetchStatus();
    }

    // Poll every 3 seconds if still generating or if retrying
    const interval = setInterval(() => {
      if (book?.status === 'generating' || book?.status === 'outlining' || book?.status === 'pending' || retrying) {
        fetchStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, book?.status, retrying, serverStartTime]);

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

  const handleRetry = async () => {
    if (!book || retrying) return;

    setRetrying(true);
    startTimeRef.current = Date.now();
    setElapsedTime(0);
    orchestrationRef.current = false; // Reset orchestration state

    try {
      // For visual books, call generate without outlineOnly (they have their own flow)
      // For text books, use outlineOnly so client-side orchestration takes over
      const isVisual = isVisualBook;
      const res = await fetch(`/api/books/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outlineOnly: !isVisual }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Retry failed:', data.error);
      }
      // After outline is ready, the orchestration effect will pick up and continue
    } catch (err) {
      console.error('Retry error:', err);
    } finally {
      setRetrying(false);
    }
  };

  const handleDelete = async () => {
    if (!book || deleting) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/');
      } else {
        const data = await res.json();
        console.error('Delete failed:', data.error);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      console.error('Delete error:', err);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading || redirectingToComic) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-neutral-900 mx-auto mb-4" />
          <p className="text-neutral-600">
            {redirectingToComic ? 'Preparing your illustrated book...' : 'Loading your book...'}
          </p>
          {redirectingToComic && (
            <>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Clock className="h-5 w-5 text-neutral-500" />
                <span className="font-mono text-2xl font-bold text-neutral-900">{formatElapsedTime(elapsedTime)}</span>
              </div>
              <p className="text-sm text-neutral-500 mt-2">Creating story outline and character guides...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-white">
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
    <div className="min-h-screen bg-white">
      <Header />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900 mb-2">Delete Book?</h2>
              <p className="text-neutral-600">
                This will permanently delete &quot;{book?.title}&quot; and all its content. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="w-32 h-48 bg-neutral-100 rounded-xl flex items-center justify-center relative overflow-hidden border border-neutral-200">
                  {isGenerating ? (
                    <PenTool className="h-12 w-12 text-neutral-400" />
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
                    ? 'bg-neutral-900 text-white'
                    : book.status === 'failed'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : isPending
                    ? 'bg-neutral-100 text-neutral-600'
                    : 'bg-neutral-100 text-neutral-700'
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
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-medium border border-neutral-200">
                      <Palette className="h-3 w-3" />
                      {book.artStyle.charAt(0).toUpperCase() + book.artStyle.slice(1)} Style
                    </span>
                  </div>
                )}

                {/* Delete Button */}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Book
                </button>
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
                    <div className="absolute inset-0 rounded-full border-4 border-t-neutral-900 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-neutral-700" />
                    </div>
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                    Initializing Generation
                  </h2>
                  <p className="text-neutral-600 mb-4">
                    Your book is being prepared. This page updates automatically.
                  </p>
                  <div className="inline-flex items-center gap-2 text-sm text-neutral-500">
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-pulse" />
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

          {/* Failed Section - Retry Available */}
          {book.status === 'failed' && (
            <div className="bg-white rounded-2xl border border-red-200 p-8 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                  Generation Encountered an Issue
                </h2>
                <p className="text-neutral-600 mb-2">
                  Don&apos;t worry - your progress has been saved.
                </p>
                {book.currentChapter > 0 && (
                  <p className="text-sm text-green-600 mb-4">
                    ✓ {book.currentChapter} chapter{book.currentChapter > 1 ? 's' : ''} already completed ({book.totalWords.toLocaleString()} words)
                  </p>
                )}
                <p className="text-sm text-neutral-500 mb-6">
                  Click retry to continue from where we left off. This is free - you&apos;ve already paid!
                </p>
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {retrying ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Resuming...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      Retry Generation
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Progress Section */}
          {isGenerating && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 mb-6">
              {/* Header with Timer */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center">
                      <PenTool className="h-6 w-6 text-neutral-700" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-neutral-900 rounded-full border-2 border-white" />
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

              {/* Safe to leave message - only for text-only books (novels) */}
              {!isIllustrated && (
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-800">
                      <span className="font-medium">Safe to leave!</span> Your book will continue generating in the background. Use the notification badge in the header to track progress.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Estimated time: 30-60 minutes</span> for a full novel. Each chapter takes 2-4 minutes to write with rich, detailed prose.
                    </p>
                  </div>
                </div>
              )}

              {/* Stay on page warning - illustrated books only */}
              {isIllustrated && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">Please stay on this page.</span> Illustrated books require an active connection to generate images.
                  </p>
                </div>
              )}

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
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${Math.max(progress, 2)}%` }}
                  />
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

              {/* Live Content Preview - Text Only Books */}
              {!isIllustrated && book.chapters.length > 0 && (
                <div className="mt-6 border-t border-neutral-100 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-wide text-neutral-400">Live Preview</p>
                    <span className="text-xs text-neutral-400">Chapter {book.chapters[book.chapters.length - 1].number}</span>
                  </div>
                  <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 max-h-48 overflow-y-auto">
                    <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                      {book.chapters[book.chapters.length - 1].content.substring(0, 800)}
                      {book.chapters[book.chapters.length - 1].content.length > 800 && '...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Illustration Progress - Illustrated Books */}
              {isIllustrated && (
                <div className="mt-6 border-t border-neutral-100 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-neutral-600" />
                      <p className="text-sm font-medium text-neutral-900">Illustrations</p>
                    </div>
                    <span className="text-sm text-neutral-500">
                      {book.illustrations?.length || 0} generated
                    </span>
                  </div>
                  {book.illustrations && book.illustrations.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {book.illustrations.slice(-12).map((illustration, index) => (
                        <div
                          key={illustration.id}
                          className="aspect-square rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200"
                        >
                          <img
                            src={illustration.imageUrl}
                            alt={illustration.altText || `Illustration ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {isGenerating && (
                        <div className="aspect-square rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 text-neutral-500 animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-sm text-neutral-600 bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-200">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating first illustration...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Completed Section */}
          {book.status === 'completed' && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 mb-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Your Book is Ready!</h2>
                <p className="text-neutral-600">Download your masterpiece below</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-neutral-50 rounded-xl p-4 text-center border border-neutral-100">
                  <p className="text-2xl font-bold text-neutral-900">{book.totalChapters}</p>
                  <p className="text-sm text-neutral-600">Chapters</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4 text-center border border-neutral-100">
                  <p className="text-2xl font-bold text-neutral-900">{book.totalWords.toLocaleString()}</p>
                  <p className="text-sm text-neutral-600">Words</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4 text-center border border-neutral-100">
                  <p className="text-2xl font-bold text-neutral-900">~{Math.round(book.totalWords / 250)}</p>
                  <p className="text-sm text-neutral-600">Pages</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium transition-colors"
                >
                  <Download className="h-5 w-5" /> Download {isIllustrated ? 'PDF' : 'EPUB'}
                </button>

                {book.coverImageUrl && (
                  <button
                    onClick={handleCoverDownload}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-neutral-900 border border-neutral-200 rounded-xl hover:bg-neutral-50 font-medium transition-colors"
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
                        ? 'bg-neutral-100 border border-neutral-300'
                        : 'bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index === book.chapters.length - 1 && isGenerating
                          ? 'bg-neutral-200 text-neutral-700'
                          : 'bg-neutral-900 text-white'
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

          {/* Illustration Gallery - Completed Illustrated Books */}
          {book.status === 'completed' && isIllustrated && book.illustrations && book.illustrations.length > 0 && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                  <Palette className="h-5 w-5 text-neutral-600" />
                  Illustrations
                </h2>
                <span className="text-sm text-neutral-500">{book.illustrations.length} images</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {book.illustrations.map((illustration, index) => (
                  <div
                    key={illustration.id}
                    className="aspect-square rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 hover:border-neutral-400 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/book/${id}/image/${illustration.id}`)}
                  >
                    <img
                      src={illustration.imageUrl}
                      alt={illustration.altText || `Illustration ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-400 mt-3 text-center">Click any image to view full size</p>
            </div>
          )}

          {/* Save Your Work Section - show when book is completed and user is NOT logged in */}
          {book.status === 'completed' && !session && (
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-6 sm:p-8 text-white">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Save className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold mb-2">Save Your Book</h2>
                <p className="text-neutral-300 text-sm">
                  Create a free account to save &quot;{book.title}&quot; to your library and access it anytime.
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  href={`/signup?bookId=${id}&callbackUrl=/book/${id}`}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-neutral-900 rounded-xl hover:bg-neutral-100 font-medium transition-colors"
                >
                  <Mail className="h-5 w-5" /> Sign up with Email
                </Link>

                <Link
                  href={`/api/auth/signin/google?callbackUrl=/book/${id}?claimBook=true`}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white/10 text-white rounded-xl hover:bg-white/20 font-medium transition-colors border border-white/20"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Link>
              </div>

              <p className="text-center text-sm text-neutral-400 mt-4">
                Already have an account?{' '}
                <Link href={`/login?bookId=${id}&callbackUrl=/book/${id}`} className="text-white underline hover:no-underline">
                  Log in to save
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
