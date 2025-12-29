'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import { Download, BookOpen, Loader2, Check, AlertCircle, ImageIcon, Mail, Palette, PenTool, Clock, Zap, AlertTriangle, Save, Trash2, RefreshCw, X } from 'lucide-react';
import { useGeneratingBook } from '@/contexts/GeneratingBookContext';
import Link from 'next/link';
import FirstBookDiscountPopup from '@/components/FirstBookDiscountPopup';

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
  errorMessage?: string | null;
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

// Per-chapter status tracking for the new grid UI
interface ChapterCardStatus {
  number: number;
  title: string;
  summary: string;
  targetWords: number;
  status: 'pending' | 'generating' | 'done' | 'error';
  wordCount?: number;
  error?: string;
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
  const [deleted, setDeleted] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showFirstBookDiscount, setShowFirstBookDiscount] = useState(false);
  const [isFirstCompletedBook, setIsFirstCompletedBook] = useState(false);
  const [chapterStatuses, setChapterStatuses] = useState<ChapterCardStatus[]>([]);
  const [serverStartTime, setServerStartTime] = useState<Date | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const orchestrationRef = useRef<boolean>(false);
  // Session ID to prevent multiple orchestration loops - incremented on each new generation attempt
  const orchestrationSessionRef = useRef<number>(0);
  // Track chapter count to detect new chapters in status polling (avoids stale closure issues)
  const lastKnownChapterCountRef = useRef<number>(0);
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

          try {
            const genRes = await fetch(`/api/books/${id}/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ outlineOnly: true }),
            });
            const genData = await genRes.json();

            // Check for content blocked error - don't redirect, show error
            if (genData.contentBlocked) {
              setRedirectingToComic(false);
              setError('Your book content was blocked by AI safety filters. Please create a new book with different content (avoid adult themes, violence, or controversial topics).');
              setLoading(false);
              return;
            }

            // Always redirect to comic generation page for visual books
            // Even if outline generation returned an unexpected response,
            // the comic page can handle resuming from wherever we are
            if (genData.success || genData.outlineOnly || genData.alreadyComplete) {
              router.replace(`/generate-comic?bookId=${id}`);
              return;
            }

            // If we got an error response, still try redirecting - the comic page
            // can show appropriate status/errors
            console.log('Generate response:', genData);
            router.replace(`/generate-comic?bookId=${id}`);
            return;
          } catch (err) {
            console.error('Error starting visual book generation:', err);
            // On error, still redirect - comic page can handle recovery
            router.replace(`/generate-comic?bookId=${id}`);
            return;
          }
        }

        // Also check if it's a visual book that's already generating/has outline
        // and redirect to the comic generation page
        if (isVisual && loadedBook?.status !== 'completed' && loadedBook?.status !== 'failed' && isOwner) {
          const hasOutline = loadedBook?.outline && typeof loadedBook.outline === 'object';
          if (hasOutline || loadedBook?.status === 'generating' || loadedBook?.status === 'outlining') {
            console.log('Visual book already in progress, redirecting to comic generation page...');
            router.replace(`/generate-comic?bookId=${id}`);
            return;
          }
        }

        // Not a comic, or already in progress - show this page
        setBook(loadedBook);
        lastKnownChapterCountRef.current = loadedBook?.chapters?.length || 0;
        setIsFirstCompletedBook(data.isFirstCompletedBook || false);
        setLoading(false);
      } catch (err) {
        setError('Failed to load book');
        console.error(err);
        setLoading(false);
      }
    };

    loadAndCheck();
  }, [id, success, router, currentUserId, setGeneratingBookId]);

  // Check if current user owns this book (or is admin)
  const ADMIN_EMAILS = ['lhllparis@gmail.com'];
  const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);
  const isOwner = !book?.userId || book?.userId === currentUserId || isAdmin;

  // Initialize chapter statuses from outline when book loads
  useEffect(() => {
    if (!book?.outline?.chapters) return;

    // Build chapter statuses from outline
    const statuses: ChapterCardStatus[] = book.outline.chapters.map((ch) => {
      // Check if this chapter already exists in the book
      const existingChapter = book.chapters.find(c => c.number === ch.number);

      return {
        number: ch.number,
        title: ch.title,
        summary: ch.summary,
        targetWords: (ch as { targetWords?: number }).targetWords || 2500,
        status: existingChapter ? 'done' : 'pending',
        wordCount: existingChapter?.wordCount,
      };
    });

    setChapterStatuses(statuses);
  }, [book?.outline?.chapters, book?.chapters]);

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

    // Increment session ID to invalidate any previous loops
    orchestrationSessionRef.current += 1;
    const currentSession = orchestrationSessionRef.current;

    const orchestrateGeneration = async () => {
      orchestrationRef.current = true;

      let consecutiveErrors = 0;
      const maxConsecutiveErrors = 10; // Only stop after 10 consecutive REAL errors (not timeouts)

      while (orchestrationRef.current && orchestrationSessionRef.current === currentSession) {
        try {
          // Check if this session is still valid
          if (orchestrationSessionRef.current !== currentSession) {
            console.log(`Session ${currentSession} superseded by session ${orchestrationSessionRef.current}, stopping`);
            break;
          }

          // First, check current book status - the chapter might have completed during a timeout
          const statusRes = await fetch(`/api/books/${id}/status`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            const serverChapterCount = statusData.status?.chapterCount || 0;
            const localChapterCount = lastKnownChapterCountRef.current;

            // If server has more chapters, fetch full data and update
            if (serverChapterCount > localChapterCount) {
              console.log(`[Session ${currentSession}] Detected new chapters on server (${localChapterCount} -> ${serverChapterCount})`);
              const fullRes = await fetch(`/api/books/${id}`);
              if (fullRes.ok) {
                const fullData = await fullRes.json();
                setBook(fullData.book);
                lastKnownChapterCountRef.current = fullData.book?.chapters?.length || 0;

                // Update chapter statuses
                if (fullData.book?.chapters) {
                  setChapterStatuses(prev => prev.map(ch => {
                    const serverChapter = fullData.book.chapters.find((c: { number: number }) => c.number === ch.number);
                    if (serverChapter) {
                      return { ...ch, status: 'done' as const, wordCount: serverChapter.wordCount };
                    }
                    return ch;
                  }));
                }

                // Check if book is complete
                if (fullData.book?.status === 'completed') {
                  console.log(`[Session ${currentSession}] Book completed!`);
                  orchestrationRef.current = false;
                  break;
                }
              }
            }
          }

          // Mark current chapter as generating in the UI
          const nextChapterNum = (lastKnownChapterCountRef.current || 0) + 1;
          setChapterStatuses(prev => prev.map(ch =>
            ch.number === nextChapterNum ? { ...ch, status: 'generating' as const, error: undefined } : ch
          ));

          console.log(`[Session ${currentSession}] Orchestrating: generating chapter ${nextChapterNum}...`);
          const res = await fetch(`/api/books/${id}/generate-next`, { method: 'POST' });

          // Detect Vercel timeouts (502, 503, 504) - these are NOT failures, just timeouts
          // The chapter generation might have actually completed on the server
          if (res.status === 502 || res.status === 503 || res.status === 504) {
            console.log(`[Session ${currentSession}] Server timeout (${res.status}) - will check status and retry...`);
            // Don't increment error count for timeouts - they're expected with long generations
            // Wait a bit then check if chapter completed
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue; // Go back to top of loop which checks status first
          }

          // Handle empty/malformed responses
          let data;
          try {
            data = await res.json();
          } catch (parseError) {
            console.error('Failed to parse response:', parseError);
            // Might be a timeout, check status and retry
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }

          if (!res.ok) {
            // If book was deleted or not found, stop orchestrating silently
            if (data.aborted || res.status === 404) {
              console.log('Book was deleted or not found, stopping orchestration');
              orchestrationRef.current = false;
              break;
            }
            throw new Error(data.error || 'Generation failed');
          }

          // Reset error count on success
          consecutiveErrors = 0;

          if (data.done) {
            console.log(`[Session ${currentSession}] Orchestration complete: all chapters generated`);
            orchestrationRef.current = false;
            // Fetch full book data
            const fullRes = await fetch(`/api/books/${id}`);
            if (fullRes.ok) {
              const fullData = await fullRes.json();
              setBook(fullData.book);
              lastKnownChapterCountRef.current = fullData.book?.chapters?.length || 0;
            }
            break;
          }

          console.log(`[Session ${currentSession}] Chapter ${data.currentChapter}/${data.totalChapters} complete`);

          // Mark chapter as done in the UI
          setChapterStatuses(prev => prev.map(ch =>
            ch.number === data.currentChapter
              ? { ...ch, status: 'done' as const, wordCount: data.wordCount || ch.wordCount }
              : ch
          ));

          // Fetch updated book data to show new chapters in UI
          const updatedRes = await fetch(`/api/books/${id}`);
          if (updatedRes.ok) {
            const updatedData = await updatedRes.json();
            setBook(updatedData.book);
            lastKnownChapterCountRef.current = updatedData.book?.chapters?.length || 0;
          }

          // Small delay between chapters to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
          console.error(`[Session ${currentSession}] Orchestration error:`, err);
          consecutiveErrors++;

          // Only stop after many consecutive REAL errors (not timeouts)
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.error(`[Session ${currentSession}] Too many consecutive errors (${maxConsecutiveErrors}), stopping orchestration`);
            orchestrationRef.current = false;

            // Mark current chapter as error in the UI
            const errorMsg = err instanceof Error ? err.message : 'Generation failed';
            setChapterStatuses(prev => prev.map(ch =>
              ch.status === 'generating' ? { ...ch, status: 'error' as const, error: errorMsg } : ch
            ));

            // Mark book as failed so UI shows the error
            try {
              await fetch(`/api/books/${id}/cancel`, { method: 'POST' });
              // Refresh book data to show failed state
              const failedRes = await fetch(`/api/books/${id}`);
              if (failedRes.ok) {
                const failedData = await failedRes.json();
                setBook(failedData.book);
                lastKnownChapterCountRef.current = failedData.book?.chapters?.length || 0;
              }
            } catch (cancelErr) {
              console.error('Failed to mark book as failed:', cancelErr);
            }
            break;
          }

          // Wait before retrying (exponential backoff, capped at 30 seconds)
          const waitTime = Math.min(1000 * Math.pow(2, consecutiveErrors), 30000);
          console.log(`[Session ${currentSession}] Retrying in ${waitTime}ms (consecutive errors: ${consecutiveErrors}/${maxConsecutiveErrors})`);
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

  // Auto-retry removed - was causing race conditions with manual resume
  // The orchestration loop already has its own retry logic (3 retries with backoff)
  // Users can manually click "Resume" if generation fails

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
    // Don't poll if book is deleted
    if (deleted) return;

    // Lightweight status fetch for polling (only essential fields, no content/images)
    const fetchStatus = async () => {
      // Double-check deleted state before fetching
      if (deleted) return;

      try {
        const res = await fetch(`/api/books/${id}/status`);
        if (!res.ok) throw new Error('Failed to fetch status');
        const data = await res.json();
        const status: BookStatus = data.status;

        // Capture the server's generation start time (actual time generation began)
        if (status.generationStartedAt && !serverStartTime) {
          setServerStartTime(new Date(status.generationStartedAt));
        }

        // Check if there are new chapters we don't have locally (use ref to avoid stale closure)
        const localChapterCount = lastKnownChapterCountRef.current;
        const serverChapterCount = status.chapterCount || 0;
        const hasNewChapters = serverChapterCount > localChapterCount;

        // Fetch full book data if there are new chapters OR status completed
        if (hasNewChapters || (status.status === 'completed' && book?.status !== 'completed')) {
          console.log(`Fetching full book data: ${hasNewChapters ? 'new chapters detected' : 'book completed'} (local: ${localChapterCount}, server: ${serverChapterCount})`);
          const fullRes = await fetch(`/api/books/${id}`);
          if (fullRes.ok) {
            const fullData = await fullRes.json();
            setBook(fullData.book);
            // Update ref with new chapter count
            lastKnownChapterCountRef.current = fullData.book?.chapters?.length || 0;
          }
        } else {
          // Just update status fields (preserves existing heavy data)
          setBook(prev => prev ? {
            ...prev,
            status: status.status,
            paymentStatus: status.paymentStatus,
            currentChapter: status.currentChapter,
            totalChapters: status.totalChapters,
            totalWords: status.totalWords,
          } : prev);
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    };

    // Fetch immediately if generating to get the serverStartTime
    if ((book?.status === 'generating' || book?.status === 'outlining') && !serverStartTime) {
      fetchStatus();
    }

    // Poll every 15 seconds during generation (chapters take 2-4 minutes each)
    // This reduces database load while still providing reasonable update frequency
    const interval = setInterval(() => {
      if (!deleted && (book?.status === 'generating' || book?.status === 'outlining' || book?.status === 'pending' || retrying)) {
        fetchStatus();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [id, book?.status, retrying, serverStartTime, deleted]);

  // Show first book discount popup
  useEffect(() => {
    if (book?.status === 'completed' && isFirstCompletedBook) {
      // Check if user has already seen this popup
      const dismissedKey = `firstBookDiscount_${id}`;
      const dismissed = localStorage.getItem(dismissedKey);
      if (!dismissed) {
        // Small delay to let the completion UI render first
        const timer = setTimeout(() => {
          setShowFirstBookDiscount(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [book?.status, isFirstCompletedBook, id]);

  const handleDismissFirstBookDiscount = () => {
    setShowFirstBookDiscount(false);
    // Remember that user dismissed this popup
    localStorage.setItem(`firstBookDiscount_${id}`, 'true');
  };

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
      // Check if this is a text book with an existing outline that can be resumed
      const hasOutline = book.outline && typeof book.outline === 'object';
      const hasProgress = book.currentChapter > 0 || (book.chapters && book.chapters.length > 0);
      const isTextBook = !isVisualBook;

      if (isTextBook && hasOutline) {
        // Resume text book: Just update status and let orchestration continue
        // Don't call /generate which would delete existing chapters
        // Use /resume for ANY text book with an outline - even if chapters were lost
        console.log('Resuming text book from chapter', book.currentChapter, 'hasProgress:', hasProgress);
        const res = await fetch(`/api/books/${id}/resume`, {
          method: 'POST',
        });
        if (!res.ok) {
          const data = await res.json();
          console.error('Resume failed:', data.error);
          // Show error to user if concurrent generation limit hit
          if (res.status === 409 && data.existingBookTitle) {
            setError(`You already have "${data.existingBookTitle}" generating. Please wait for it to complete or cancel it first.`);
          } else {
            setError(data.error || 'Failed to resume generation');
          }
        } else {
          setError(null);
          // Refresh book data to update local state - this triggers orchestration
          const bookRes = await fetch(`/api/books/${id}`);
          if (bookRes.ok) {
            const bookData = await bookRes.json();
            setBook(bookData.book);
            lastKnownChapterCountRef.current = bookData.book?.chapters?.length || 0;
          }
        }
      } else {
        // For visual books or books without outline, call generate
        const res = await fetch(`/api/books/${id}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outlineOnly: isTextBook }),
        });
        if (!res.ok) {
          const data = await res.json();
          console.error('Retry failed:', data.error);
          // Show error to user if concurrent generation limit hit
          if (res.status === 409 && data.existingBookTitle) {
            setError(`You already have "${data.existingBookTitle}" generating. Please wait for it to complete or cancel it first.`);
          } else {
            setError(data.error || 'Failed to start generation');
          }
        } else {
          setError(null);
          // Refresh book data to update local state - this triggers orchestration
          const bookRes = await fetch(`/api/books/${id}`);
          if (bookRes.ok) {
            const bookData = await bookRes.json();
            setBook(bookData.book);
            lastKnownChapterCountRef.current = bookData.book?.chapters?.length || 0;
          }
        }
      }
    } catch (err) {
      console.error('Retry error:', err);
    } finally {
      setRetrying(false);
    }
  };

  // Retry a specific failed chapter
  const handleRetryChapter = async (chapterNumber: number) => {
    if (!book || retrying) return;

    // Mark this chapter as generating
    setChapterStatuses(prev => prev.map(ch =>
      ch.number === chapterNumber ? { ...ch, status: 'generating' as const, error: undefined } : ch
    ));

    try {
      // Resume generation from this chapter
      const res = await fetch(`/api/books/${id}/resume`, { method: 'POST' });

      if (!res.ok) {
        const data = await res.json();
        setChapterStatuses(prev => prev.map(ch =>
          ch.number === chapterNumber ? { ...ch, status: 'error' as const, error: data.error || 'Failed to resume' } : ch
        ));
        return;
      }

      // Refresh book data - this will trigger orchestration to continue
      const bookRes = await fetch(`/api/books/${id}`);
      if (bookRes.ok) {
        const bookData = await bookRes.json();
        setBook(bookData.book);
        lastKnownChapterCountRef.current = bookData.book?.chapters?.length || 0;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Retry failed';
      setChapterStatuses(prev => prev.map(ch =>
        ch.number === chapterNumber ? { ...ch, status: 'error' as const, error: errorMsg } : ch
      ));
    }
  };

  const handleCancelGeneration = async () => {
    if (!book || cancelling) return;

    setCancelling(true);
    try {
      // Stop the orchestration loop
      orchestrationRef.current = false;

      // Update book status to 'cancelled' on the server
      await fetch(`/api/books/${id}/cancel`, { method: 'POST' });

      // Refresh book data to show updated status
      const res = await fetch(`/api/books/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBook(data.book);
        lastKnownChapterCountRef.current = data.book?.chapters?.length || 0;
      }
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    if (!book || deleting) return;

    setDeleting(true);
    // Stop any ongoing orchestration first
    orchestrationRef.current = false;

    try {
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Mark as deleted to prevent 404 screen from showing
        setDeleted(true);
        // Clear generating book ID from context
        setGeneratingBookId(null);
        // Redirect to profile if logged in, otherwise home
        router.push(session ? '/profile' : '/');
      } else {
        const data = await res.json();
        console.error('Delete failed:', data.error);
        setShowDeleteConfirm(false);
        setDeleting(false);
      }
    } catch (err) {
      console.error('Delete error:', err);
      setShowDeleteConfirm(false);
      setDeleting(false);
    }
  };

  // Show clean redirect screen when book is deleted
  if (deleted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-neutral-900 mx-auto mb-4" />
          <p className="text-neutral-600">Book deleted. Redirecting...</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* First Book Discount Popup */}
      {showFirstBookDiscount && (
        <FirstBookDiscountPopup onDismiss={handleDismissFirstBookDiscount} />
      )}

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

          {/* Failed Section - Content Blocked */}
          {book.status === 'failed' && book.errorMessage === 'content_blocked' && (
            <div className="bg-white rounded-2xl border border-red-200 p-8 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                  Content Blocked
                </h2>
                <p className="text-neutral-600 mb-4">
                  Your book content was blocked by AI safety filters.
                </p>
                <p className="text-sm text-neutral-500 mb-6">
                  Please create a new book with different content. Avoid adult themes, explicit violence, or controversial topics.
                </p>
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 font-medium transition-colors"
                >
                  Create New Book
                </Link>
              </div>
            </div>
          )}

          {/* Failed Section - Retry Available */}
          {book.status === 'failed' && book.errorMessage !== 'content_blocked' && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-neutral-600" />
                </div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                  Generation Paused
                </h2>
                <p className="text-neutral-600 mb-2">
                  Your progress has been saved.
                </p>
                {book.currentChapter > 0 && (
                  <p className="text-sm text-neutral-600 mb-4">
                    {book.currentChapter} chapter{book.currentChapter > 1 ? 's' : ''} completed ({book.totalWords.toLocaleString()} words)
                  </p>
                )}
                <p className="text-sm text-neutral-500 mb-6">
                  Click retry to continue from where you left off.
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
                      Resume Generation
                    </>
                  )}
                </button>
                {error && (
                  <p className="text-red-600 text-sm mt-4">{error}</p>
                )}
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

              {/* Info messages */}
              {!isIllustrated ? (
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-neutral-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm text-neutral-700">
                        <span className="font-medium">Safe to leave.</span> Your book will continue generating in the background.
                      </p>
                      <p className="text-xs text-neutral-500">
                        Estimated: 30-60 minutes for a full novel. Each chapter takes 2-4 minutes.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-neutral-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-neutral-700">
                        <span className="font-medium">Please stay on this page.</span> Illustrated books require an active connection to generate images.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-600">
                    {book.status === 'outlining'
                      ? 'Preparing chapters...'
                      : chapterStatuses.length > 0
                      ? `${chapterStatuses.filter(c => c.status === 'done').length} of ${chapterStatuses.length} chapters`
                      : `Chapter ${book.currentChapter} of ${book.totalChapters}`
                    }
                  </span>
                  <span className="font-medium text-neutral-900">
                    {chapterStatuses.length > 0
                      ? `${Math.round((chapterStatuses.filter(c => c.status === 'done').length / chapterStatuses.length) * 100)}%`
                      : `${progress}%`
                    }
                  </span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 transition-all duration-700 ease-out rounded-full"
                    style={{
                      width: `${Math.max(
                        chapterStatuses.length > 0
                          ? (chapterStatuses.filter(c => c.status === 'done').length / chapterStatuses.length) * 100
                          : progress,
                        2
                      )}%`
                    }}
                  />
                </div>
              </div>

              {/* Chapter Card Grid */}
              {chapterStatuses.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs uppercase tracking-wide text-neutral-400 mb-3">Chapter Progress</p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                    {chapterStatuses.map((chapter) => (
                      <div
                        key={chapter.number}
                        className={`relative rounded-xl p-3 text-center transition-all ${
                          chapter.status === 'done'
                            ? 'bg-neutral-900 text-white'
                            : chapter.status === 'generating'
                            ? 'bg-neutral-100 border-2 border-neutral-900'
                            : chapter.status === 'error'
                            ? 'bg-red-50 border border-red-200'
                            : 'bg-neutral-50 border border-neutral-200'
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="flex justify-center mb-1">
                          {chapter.status === 'done' && (
                            <Check className="h-5 w-5" />
                          )}
                          {chapter.status === 'generating' && (
                            <Loader2 className="h-5 w-5 text-neutral-900 animate-spin" />
                          )}
                          {chapter.status === 'error' && (
                            <X className="h-5 w-5 text-red-600" />
                          )}
                          {chapter.status === 'pending' && (
                            <span className="text-lg font-bold text-neutral-400">{chapter.number}</span>
                          )}
                        </div>

                        {/* Chapter Label */}
                        <p className={`text-xs font-medium truncate ${
                          chapter.status === 'done'
                            ? 'text-white'
                            : chapter.status === 'generating'
                            ? 'text-neutral-900'
                            : chapter.status === 'error'
                            ? 'text-red-700'
                            : 'text-neutral-500'
                        }`}>
                          {chapter.status === 'generating'
                            ? 'Writing...'
                            : chapter.status === 'pending'
                            ? 'Waiting'
                            : chapter.status === 'error'
                            ? 'Failed'
                            : `Ch. ${chapter.number}`
                          }
                        </p>

                        {/* Word Count for Done */}
                        {chapter.status === 'done' && chapter.wordCount && (
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            {chapter.wordCount.toLocaleString()}w
                          </p>
                        )}

                        {/* Retry Button for Error */}
                        {chapter.status === 'error' && (
                          <button
                            onClick={() => handleRetryChapter(chapter.number)}
                            className="mt-1 text-[10px] text-red-600 hover:text-red-700 font-medium flex items-center justify-center gap-0.5"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Retry
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">{book.totalWords.toLocaleString()}</p>
                  <p className="text-xs text-neutral-500">Words</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">
                    {chapterStatuses.length > 0
                      ? `${chapterStatuses.filter(c => c.status === 'done').length}/${chapterStatuses.length}`
                      : book.chapters.length
                    }
                  </p>
                  <p className="text-xs text-neutral-500">Chapters</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-900">~{Math.round(book.totalWords / 250)}</p>
                  <p className="text-xs text-neutral-500">Pages</p>
                </div>
              </div>

              {/* Cancel Generation Button */}
              <div className="mt-6 pt-6 border-t border-neutral-100">
                <button
                  onClick={handleCancelGeneration}
                  disabled={cancelling}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Generation'
                  )}
                </button>
                <p className="text-xs text-neutral-400 text-center mt-2">
                  Progress will be saved. You can retry later.
                </p>
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
