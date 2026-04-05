'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useGeneratingBook } from '@/contexts/GeneratingBookContext';
import ConfirmModal from '@/components/ConfirmModal';
import { Loader2, Check, X, Download, AlertCircle, RefreshCw, StopCircle, Clock, ShieldAlert, Zap, BookOpen, ChevronDown, Lock, Pencil } from 'lucide-react';

// Format elapsed time as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface Panel {
  number: number;
  title: string;
  text: string;
  scene: {
    description: string;
    characters: string[];
    characterActions: Record<string, string>;
    background: string;
    mood: string;
    cameraAngle: string;
  };
  dialogue?: Array<{
    speaker: string;
    text: string;
    position: string;
    type?: string;
  }>;
  status: 'pending' | 'generating' | 'done' | 'error';
  imageUrl?: string;
  error?: string;
}

interface BookData {
  id: string;
  title: string;
  artStyle: string;
  bookFormat: string;
  dialogueStyle: string;
  paymentStatus: string;
  generationStartedAt: string | null;
  characterVisualGuide: object | null;
  visualStyleGuide: object | null;
  outline: {
    chapters: Array<{
      number: number;
      title: string;
      text: string;
      scene: Panel['scene'];
      dialogue?: Panel['dialogue'];
    }>;
  };
}

function GenerateComicContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookId = searchParams.get('bookId');
  const upgraded = searchParams.get('upgraded') === 'true';
  const { data: session } = useSession();
  const { setGeneratingBookId } = useGeneratingBook();

  const [bookData, setBookData] = useState<BookData | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false);
  const [error, setError] = useState('');
  const [expandedPanel, setExpandedPanel] = useState<number | null>(null);
  const [allComplete, setAllComplete] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [editingPanelPrompt, setEditingPanelPrompt] = useState<number | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isWaitingForOutline, setIsWaitingForOutline] = useState(false);
  const [outlineElapsed, setOutlineElapsed] = useState(0);
  const outlineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showAdminForceConfirm, setShowAdminForceConfirm] = useState(false);

  // AbortController for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const outlinePollRef = useRef<NodeJS.Timeout | null>(null);
  const outlineTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync generation state to header progress bar
  useEffect(() => {
    if ((isGenerating || isWaitingForOutline) && bookId) {
      setGeneratingBookId(bookId);
    } else if (!isGenerating && !isWaitingForOutline) {
      setGeneratingBookId(null);
    }
  }, [isGenerating, isWaitingForOutline, bookId, setGeneratingBookId]);

  // Outline preparation timer
  useEffect(() => {
    if (isWaitingForOutline) {
      setOutlineElapsed(0);
      outlineTimerRef.current = setInterval(() => {
        setOutlineElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (outlineTimerRef.current) {
        clearInterval(outlineTimerRef.current);
        outlineTimerRef.current = null;
      }
    }
    return () => {
      if (outlineTimerRef.current) clearInterval(outlineTimerRef.current);
    };
  }, [isWaitingForOutline]);

  // Timer effect: use server's generationStartedAt so it persists across page loads
  useEffect(() => {
    if (isGenerating) {
      // Calculate initial elapsed from server timestamp
      if (bookData?.generationStartedAt) {
        const startTime = new Date(bookData.generationStartedAt).getTime();
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }

      timerRef.current = setInterval(() => {
        if (bookData?.generationStartedAt) {
          const startTime = new Date(bookData.generationStartedAt).getTime();
          setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        } else {
          setElapsedTime(prev => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGenerating]);

  // Load book data and outline
  useEffect(() => {
    if (!bookId) {
      setError('No book ID provided');
      setIsLoading(false);
      return;
    }

    const loadBook = async () => {
      try {
        const response = await fetch(`/api/books/${bookId}`);
        if (!response.ok) throw new Error('Failed to load book');

        const data = await response.json();
        setBookData(data.book);

        // Check if book failed due to content moderation
        if (data.book.status === 'failed' && data.book.errorMessage === 'content_blocked') {
          setError('Your book content was blocked by AI safety filters. Please create a new book with different content (avoid adult themes, violence, or controversial topics).');
          setIsLoading(false);
          return;
        }

        // If book is already completed, redirect to book page
        if (data.book.status === 'completed') {
          router.replace(`/book/${bookId}`);
          return;
        }

        // Check if current user is admin
        try {
          const userRes = await fetch('/api/user');
          if (userRes.ok) {
            const userData = await userRes.json();
            // Only show admin UI for the actual admin, not test accounts
            const ADMIN_EMAILS = ['lhllparis@gmail.com'];
            setIsAdmin(userData.user?.isAdmin && ADMIN_EMAILS.includes(session?.user?.email || ''));
          }
        } catch {
          // Ignore - just means not admin
        }

        // Initialize panels from outline, checking for existing illustrations
        if (data.book.outline?.chapters && data.book.outline.chapters.length > 0) {
          // Get existing illustrations by chapter/page number
          const existingIllustrations = new Map<number, string>();
          if (data.book.illustrations) {
            data.book.illustrations.forEach((ill: { pageNumber?: number; chapterNumber?: number; imageUrl?: string }) => {
              const num = ill.pageNumber || ill.chapterNumber;
              if (num && ill.imageUrl) {
                existingIllustrations.set(num, ill.imageUrl);
              }
            });
          }

          const initialPanels: Panel[] = data.book.outline.chapters.map((ch: Panel) => {
            const existingImage = existingIllustrations.get(ch.number);
            return {
              ...ch,
              status: existingImage ? 'done' as const : 'pending' as const,
              imageUrl: existingImage,
            };
          });
          setPanels(initialPanels);
          setIsWaitingForOutline(false);
        } else if (data.book.status === 'outlining' || data.book.status === 'pending' || data.book.status === 'generating') {
          // Outline not ready yet - start polling
          console.log(`Outline not ready, book status: ${data.book.status}. Starting to poll...`);
          setIsWaitingForOutline(true);

          // If book is pending, trigger outline generation
          if (data.book.status === 'pending') {
            console.log('Book is pending, triggering outline generation...');
            fetch(`/api/books/${bookId}/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ outlineOnly: true }),
            }).catch(console.error);
          }

          // Poll for outline every 3 seconds
          outlinePollRef.current = setInterval(async () => {
            try {
              const pollRes = await fetch(`/api/books/${bookId}`);
              if (pollRes.ok) {
                const pollData = await pollRes.json();
                if (pollData.book.outline?.chapters && pollData.book.outline.chapters.length > 0) {
                  if (outlinePollRef.current) clearInterval(outlinePollRef.current);
                  if (outlineTimeoutRef.current) clearTimeout(outlineTimeoutRef.current);
                  setBookData(pollData.book);
                  setIsWaitingForOutline(false);

                  const existingIllustrations = new Map<number, string>();
                  if (pollData.book.illustrations) {
                    pollData.book.illustrations.forEach((ill: { pageNumber?: number; chapterNumber?: number; imageUrl?: string }) => {
                      const num = ill.pageNumber || ill.chapterNumber;
                      if (num && ill.imageUrl) {
                        existingIllustrations.set(num, ill.imageUrl);
                      }
                    });
                  }

                  const initialPanels: Panel[] = pollData.book.outline.chapters.map((ch: Panel) => {
                    const existingImage = existingIllustrations.get(ch.number);
                    return {
                      ...ch,
                      status: existingImage ? 'done' as const : 'pending' as const,
                      imageUrl: existingImage,
                    };
                  });
                  setPanels(initialPanels);
                } else if (pollData.book.status === 'failed') {
                  if (outlinePollRef.current) clearInterval(outlinePollRef.current);
                  if (outlineTimeoutRef.current) clearTimeout(outlineTimeoutRef.current);
                  setIsWaitingForOutline(false);
                  setError(pollData.book.errorMessage || 'Failed to generate book outline');
                }
              }
            } catch (pollErr) {
              console.error('Error polling for outline:', pollErr);
            }
          }, 3000);

          // Cleanup interval after 5 minutes (timeout)
          outlineTimeoutRef.current = setTimeout(() => {
            if (outlinePollRef.current) clearInterval(outlinePollRef.current);
            // Use functional update to check current state
            setIsWaitingForOutline(current => {
              if (current) {
                setError('Timed out waiting for outline generation. Please refresh the page to try again.');
              }
              return false;
            });
          }, 5 * 60 * 1000);
        }
      } catch (err) {
        console.error('Error loading book:', err);
        setError('Failed to load book data');
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();

    // Cleanup function for polling intervals
    return () => {
      if (outlinePollRef.current) {
        clearInterval(outlinePollRef.current);
        outlinePollRef.current = null;
      }
      if (outlineTimeoutRef.current) {
        clearTimeout(outlineTimeoutRef.current);
        outlineTimeoutRef.current = null;
      }
    };
  }, [bookId, router]);

  // Check if all panels are complete (for free preview, "all" means first 5)
  useEffect(() => {
    if (panels.length > 0) {
      const isFreePreview = bookData?.paymentStatus === 'free_preview';
      if (isFreePreview) {
        const freePanels = panels.filter(p => p.number <= 5);
        setAllComplete(freePanels.length > 0 && freePanels.every(p => p.status === 'done'));
      } else {
        setAllComplete(panels.every(p => p.status === 'done'));
      }
    }
  }, [panels, bookData?.paymentStatus]);

  // Background generation trigger
  const startBackgroundGeneration = useCallback(async () => {
    if (!bookId || isGenerating) return;

    setIsGenerating(true);
    setError('');

    try {
      // Trigger background generation
      const res = await fetch(`/api/books/${bookId}/generate-visual`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        // Preview limit reached — not an error, just stop generating
        // The locked panels + upgrade CTA are shown inline
        if (data.error === 'preview_limit') {
          setIsGenerating(false);
          return;
        }
        throw new Error(data.error || 'Failed to start generation');
      }

      // We don't await the whole process, just the kickoff.
      // Now we poll.
    } catch (err) {
      console.error('Failed to start background generation:', err);
      setError('Failed to start generation process. Please try again.');
      setIsGenerating(false);
    }
  }, [bookId, isGenerating]);

  // Polling for progress
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (bookId && (isGenerating || (panels.length > 0 && !allComplete))) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/books/${bookId}`);
          if (!res.ok) return;

          const data = await res.json();
          const book = data.book;

          if (book.status === 'completed') {
            setAllComplete(true);
            setIsGenerating(false);
            clearInterval(pollInterval);
            router.replace(`/book/${bookId}`);
            return;
          }

          // Detect failed generation
          if (book.status === 'failed') {
            setIsGenerating(false);
            setError(book.errorMessage || 'Generation failed. Please try again.');
            clearInterval(pollInterval);
            return;
          }

          // Detect preview_complete
          if (book.status === 'preview_complete') {
            setAllComplete(true);
            setIsGenerating(false);
            clearInterval(pollInterval);
            return;
          }

          // Update panels from DB illustrations
          if (book.illustrations) {
            const illustrationMap = new Map<number, any>();
            book.illustrations.forEach((ill: any) => {
              // Use position as the key source of truth
              illustrationMap.set(ill.position || ill.chapterNumber || ill.pageNumber, ill);
            });

            setPanels(prev => prev.map(p => {
              const ill = illustrationMap.get(p.number);
              if (ill) {
                if (ill.status === 'failed') {
                  return { ...p, status: 'error', error: ill.errorMessage || 'Failed to generate' };
                }
                return { ...p, status: 'done', imageUrl: ill.imageUrl };
              }
              return p;
            }));

            // Do NOT auto-assemble here - let the user see their panels first
            // Assembly is triggered by the user clicking the button, or by the
            // generate-visual route when it finishes all panels for paid books
          }

        } catch (e) {
          console.error('Polling error:', e);
        }
      }, 3000);
    }

    return () => clearInterval(pollInterval);
  }, [bookId, isGenerating, panels.length, allComplete, isAssembling, router]);

  // Generate all panels (Now just starts the background process)
  const generateAllPanels = startBackgroundGeneration;

  // Auto-start generation when all panels are pending on a paid book
  const autoStartTriggered = useRef(false);
  useEffect(() => {
    if (autoStartTriggered.current) return;
    if (panels.length > 0 && !isGenerating && !isLoading) {
      const allPending = panels.every(p => p.status === 'pending');
      if (allPending) {
        console.log('[AutoStart] All panels pending, auto-starting generation');
        autoStartTriggered.current = true;
        generateAllPanels();
      }
    }
  }, [panels, isGenerating, isLoading, bookData?.paymentStatus, generateAllPanels]);

  // Auto-continue after upgrade: payment completed, some panels done, locked ones remaining
  const upgradeTriggered = useRef(false);
  useEffect(() => {
    if (upgradeTriggered.current) return;
    if (upgraded && panels.length > 0 && !isGenerating && !isLoading && bookData?.paymentStatus === 'completed') {
      const hasPending = panels.some(p => p.status === 'pending');
      if (hasPending) {
        console.log('[Upgrade] Payment confirmed, auto-continuing remaining panels');
        upgradeTriggered.current = true;
        generateAllPanels();
      }
    }
  }, [upgraded, panels, isGenerating, isLoading, bookData?.paymentStatus, generateAllPanels]);

  // Cancel generation - show confirmation first
  const cancelGeneration = useCallback(async () => {
    setShowCancelConfirm(true);
  }, []);

  // Handle cancel confirmation - actually stop server-side generation
  const handleCancelConfirm = useCallback(async () => {
    setIsCancelling(true);
    try {
      await fetch(`/api/books/${bookId}/cancel`, { method: 'POST' });
    } catch {
      // Continue to redirect even if cancel fails
    }
    setIsGenerating(false);
    setIsCancelling(false);
    router.push(`/book/${bookId}`);
  }, [bookId, router]);

  // Emergency stop for admins - show modal
  const emergencyStop = useCallback(() => {
    setShowAdminForceConfirm(true);
  }, []);

  // Handle admin force complete confirmation
  const handleAdminForceConfirm = useCallback(async () => {
    setIsEmergencyStopping(true);
    try {
      const response = await fetch(`/api/books/${bookId}/emergency-stop`, {
        method: 'POST',
      });
      if (response.ok) {
        router.replace(`/book/${bookId}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEmergencyStopping(false);
    }
  }, [bookId, router]);


  // Assemble the book when all panels are complete
  const assembleBook = async () => {
    if (!bookId || isAssembling) return;

    setIsAssembling(true);

    try {
      const response = await fetch(`/api/books/${bookId}/assemble`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to assemble');
      router.push(`/book/${bookId}`);
    } catch (err) {
      console.error('Error assembling book:', err);
      // Don't show error to user if it's just a timing issue, stick to polling
      setIsAssembling(false);
    }
  };

  // Calculate progress
  const doneCount = panels.filter(p => p.status === 'done').length;
  const errorCount = panels.filter(p => p.status === 'error').length;
  // If we are generating in background, we consider non-done/non-error as generating implicitly for the progress bar
  // But strictly, panels remain 'pending' in state until 'done'.
  // We can treat all pending as generating if isGenerating is true for the UI.
  const isFreePreviewGlobal = bookData?.paymentStatus === 'free_preview';
  const activePanels = isFreePreviewGlobal ? panels.filter(p => p.number <= 5) : panels;
  const pendingCount = activePanels.filter(p => p.status === 'pending').length;
  const generatingCount = isGenerating ? pendingCount : 0;

  // retryPanel matches signature (index: number) -> void
  const retryPanel = useCallback((_index: number) => {
    startBackgroundGeneration();
  }, [startBackgroundGeneration]);

  // retryAllFailed matches signature () -> void
  const retryAllFailed = startBackgroundGeneration;


  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="py-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-900" />
            <p className="text-neutral-600">Loading your illustrated book...</p>
          </div>
        </main>
      </div>
    );
  }

  if (isWaitingForOutline) {
    // Estimate which step we're on based on elapsed time
    const currentStep = outlineElapsed < 15 ? 1 : outlineElapsed < 40 ? 2 : 3;

    const steps = [
      { num: 1, label: 'Writing the story and dialogue' },
      { num: 2, label: 'Planning scenes and panel layouts' },
      { num: 3, label: 'Generating character portraits' },
    ];

    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="py-20 px-6">
          <div className="max-w-lg mx-auto text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-900" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Preparing Your Book</h2>
            <p className="text-neutral-600 mb-4">
              Setting up your illustrated book...
            </p>
            {/* Elapsed timer */}
            <p className="text-2xl font-mono font-bold text-neutral-900 mb-6">{formatTime(outlineElapsed)}</p>

            {/* Progress steps */}
            <div className="space-y-3 text-left max-w-sm mx-auto mb-6">
              {steps.map(step => {
                const isDone = currentStep > step.num;
                const isActive = currentStep === step.num;
                return (
                  <div key={step.num} className="flex items-center gap-3 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isDone ? 'bg-neutral-900 text-white' : isActive ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'
                    }`}>
                      {isDone ? <Check className="h-3.5 w-3.5" /> : step.num}
                    </div>
                    <span className={isDone ? 'text-neutral-500 line-through' : isActive ? 'text-neutral-900 font-medium' : 'text-neutral-400'}>
                      {step.label}
                    </span>
                    {isActive && <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-neutral-400">
              You can leave this page and come back. We&apos;ll keep working on your book.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // preview_limit is handled inline (locked panels + CTA), not as an error page

  if (error && !bookData) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="py-20 px-6">
          <div className="max-w-md mx-auto text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-neutral-500" />
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Error</h1>
            <p className="text-neutral-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors"
            >
              Go Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-2">
              {bookData?.title || 'Generate Illustrated Book'}
            </h1>
            <p className="text-neutral-600">
              {bookData?.paymentStatus === 'free_preview'
                ? `5 of ${panels.length} panels (free preview)`
                : `${panels.length} panels`
              } • {bookData?.artStyle} style
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8 bg-white rounded-2xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
              <span>Progress</span>
              {bookData?.paymentStatus === 'free_preview' ? (
                <span>{Math.min(doneCount, 5)} / 5 free preview panels</span>
              ) : (
                <span>{doneCount} / {panels.length} panels complete</span>
              )}
            </div>
            <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-neutral-900 transition-all duration-300"
                style={{ width: `${bookData?.paymentStatus === 'free_preview' ? (Math.min(doneCount, 5) / 5) * 100 : (doneCount / panels.length) * 100}%` }}
              />
            </div>
            {(generatingCount > 0 || errorCount > 0) && (
              <div className="flex gap-4 mt-2 text-xs">
                {generatingCount > 0 && (
                  <span className="text-neutral-600">{generatingCount} generating</span>
                )}
                {errorCount > 0 && (
                  <span className="text-neutral-500">{errorCount} failed</span>
                )}
              </div>
            )}
            {/* Time estimate and disclaimer during generation */}
            {isGenerating && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>~{Math.max(1, Math.ceil(((bookData?.paymentStatus === 'free_preview' ? 5 : panels.length) - doneCount) * 0.15))} min remaining ({Math.ceil(elapsedTime / 60)}m elapsed)</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <span>You can leave and come back anytime</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            {pendingCount > 0 && doneCount === 0 && !isGenerating && (
              <button
                onClick={generateAllPanels}
                disabled={isGenerating}
                className="flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 disabled:opacity-50 font-medium transition-all"
              >
                Generate {bookData?.paymentStatus === 'free_preview' ? '5 Preview' : `All ${panels.length}`} Panels
              </button>
            )}

            {/* Admin Emergency Stop */}
            {isAdmin && (
              <button
                onClick={emergencyStop}
                disabled={isEmergencyStopping}
                className="flex items-center gap-2 px-6 py-4 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 font-medium transition-all"
              >
                {isEmergencyStopping ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Stopping...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-5 w-5" />
                    ADMIN: Force Complete
                  </>
                )}
              </button>
            )}

            {errorCount > 0 && !isGenerating && (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={retryAllFailed}
                  className="flex items-center gap-2 px-6 py-3 bg-neutral-700 text-white rounded-full hover:bg-neutral-600 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry {errorCount} Failed
                </button>
                <p className="text-sm text-neutral-500">Wait 5-10 seconds between retries for best results</p>
              </div>
            )}

            {/* Only show assemble button when ALL expected panels have actual images */}
            {!isGenerating && (() => {
              const expectedCount = isFreePreviewGlobal ? 5 : panels.length;
              const panelsWithImages = activePanels.filter(p => p.status === 'done' && p.imageUrl).length;
              const allDone = panelsWithImages >= expectedCount && expectedCount > 0;

              return allDone ? (
                <button
                  onClick={assembleBook}
                  disabled={isAssembling}
                  className="flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 disabled:opacity-50 font-medium transition-all"
                >
                  {isAssembling ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Assembling book...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      Assemble & Download Book
                    </>
                  )}
                </button>
              ) : null;
            })()}
          </div>

          {/* Generating Status with Timer */}
          {isGenerating && (() => {
            const totalActive = isFreePreviewGlobal ? 5 : panels.length;
            const genProgress = totalActive > 0 ? Math.round((doneCount / totalActive) * 100) : 0;

            return (
            <div className="mb-8 bg-white border border-neutral-200 rounded-2xl overflow-hidden">
              {/* Timer Header */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-900" />
                  <div>
                    <p className="font-semibold text-neutral-900">Generating Illustrations</p>
                    <p className="text-sm text-neutral-500">
                      {doneCount} of {totalActive} panels complete
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-mono font-bold text-neutral-900">{formatTime(elapsedTime)}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-6 pb-2">
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 transition-all duration-500"
                    style={{ width: `${Math.max(genProgress, 3)}%` }}
                  />
                </div>
              </div>

              {/* Panel-by-panel progress */}
              <div className="px-6 py-3 flex gap-1.5">
                {activePanels.map(p => (
                  <div
                    key={p.number}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${
                      p.status === 'done' ? 'bg-neutral-900'
                        : p.status === 'generating' ? 'bg-neutral-400 animate-pulse'
                        : 'bg-neutral-200'
                    }`}
                    title={`Panel ${p.number}: ${p.status}`}
                  />
                ))}
              </div>

              {/* Info */}
              <div className="px-6 py-3 border-t border-neutral-100">
                <p className="text-xs text-neutral-400 text-center">
                  You can leave and come back anytime. Generation continues in the background.
                </p>
              </div>
            </div>
            );
          })()}

          {error && (() => {
            const failedPanelsList = panels.filter(p => p.status === 'error');
            const missingPanels = activePanels.filter(p => p.status === 'pending' && doneCount > 0);

            return (
            <div className="mb-8 p-5 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-neutral-900 font-medium mb-2 text-center">Generation Issue</p>
              <p className="text-sm text-neutral-600 mb-3 text-center">{error}</p>

              {/* Show which panels failed */}
              {(failedPanelsList.length > 0 || missingPanels.length > 0) && (
                <div className="mb-4 text-sm text-neutral-600">
                  {failedPanelsList.map(p => (
                    <div key={p.number} className="flex items-center gap-2 py-1">
                      <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      <span>Panel {p.number}: {p.error || 'Failed'}</span>
                    </div>
                  ))}
                  {missingPanels.map(p => (
                    <div key={p.number} className="flex items-center gap-2 py-1">
                      <AlertCircle className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                      <span>Panel {p.number}: Not generated</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setError('');
                    startBackgroundGeneration();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-full text-sm font-medium hover:bg-neutral-800 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Failed Panels
                </button>
              </div>
            </div>
            );
          })()}

          {/* Panel Grid - split into free panels and locked panels for preview users */}
          {(() => {
            const isFreePreview = bookData?.paymentStatus === 'free_preview';
            const FREE_PANEL_LIMIT = 5;
            const freePanels = isFreePreview ? panels.filter(p => p.number <= FREE_PANEL_LIMIT) : panels;
            const lockedPanels = isFreePreview ? panels.filter(p => p.number > FREE_PANEL_LIMIT) : [];

            return (<>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {freePanels.map((panel, index) => {
              const isLocked = false;

              return (
              <div
                key={panel.number}
                className={`bg-white rounded-xl overflow-hidden border shadow-sm ${isLocked ? 'border-neutral-100 opacity-60' : 'border-neutral-200'}`}
              >
                {/* Panel Image Area */}
                <div className="aspect-[3/4] bg-neutral-100 relative">
                  {isLocked ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50">
                      <Lock className="h-5 w-5 text-neutral-300 mb-1" />
                      <span className="text-xs text-neutral-400 mb-2">Locked</span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await fetch('/api/checkout', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                bookId,
                                email: session?.user?.email || '',
                                productType: 'upgrade',
                              }),
                            });
                            const data = await res.json();
                            if (data.url) window.location.href = data.url;
                          } catch {}
                        }}
                        className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-full hover:bg-neutral-800 transition-colors"
                      >
                        Unlock $3.99
                      </button>
                    </div>
                  ) : panel.status === 'pending' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
                      <span className="text-3xl font-bold mb-2">{panel.number}</span>
                      <span className="text-xs">Waiting</span>
                    </div>
                  ) : panel.status === 'generating' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50">
                      <Loader2 className="h-8 w-8 animate-spin text-neutral-900 mb-2" />
                      <span className="text-xs text-neutral-600">Generating...</span>
                    </div>
                  ) : panel.status === 'done' && panel.imageUrl ? (
                    <div
                      onClick={() => setLightboxImage(panel.imageUrl!)}
                      className="w-full h-full cursor-pointer"
                    >
                      <Image
                        src={panel.imageUrl}
                        alt={`Panel ${panel.number}: ${panel.scene?.description || 'Illustration'}`}
                        fill
                        className="object-cover hover:opacity-90 transition-opacity"
                        unoptimized
                      />
                    </div>
                  ) : panel.status === 'error' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-neutral-100">
                      <X className="h-8 w-8 text-neutral-500 mb-2" />
                      <span className="text-xs text-neutral-600 text-center line-clamp-2">
                        {panel.error || 'Failed'}
                      </span>
                      <button
                        onClick={() => retryPanel(index)}
                        className="mt-3 flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Retry
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Panel Info */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-500">{bookData?.dialogueStyle === 'bubbles' ? 'Panel' : 'Page'} {panel.number}</span>
                    <div className="flex items-center gap-1">
                      {panel.status === 'done' && (
                        <Check className="h-4 w-4 text-neutral-900" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPanel(expandedPanel === panel.number ? null : panel.number);
                        }}
                        className="p-1 hover:bg-neutral-100 rounded transition-colors"
                        title="See details"
                      >
                        <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${expandedPanel === panel.number ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-900 font-medium line-clamp-1">
                    {panel.title}
                  </p>
                  {expandedPanel !== panel.number && (
                    <>
                      <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
                        {panel.scene?.description || ''}
                      </p>
                      {panel.dialogue && panel.dialogue.length > 0 && (
                        <p className="text-xs text-neutral-600 mt-1">
                          {panel.dialogue.length} bubble{panel.dialogue.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </>
                  )}
                  {/* Expanded panel details */}
                  {expandedPanel === panel.number && (
                    <div className="mt-2 space-y-2 text-xs">
                      {panel.text && (
                        <div>
                          <span className="text-neutral-400 uppercase tracking-wider text-[10px]">Story text</span>
                          <p className="text-neutral-700 mt-0.5">{panel.text}</p>
                        </div>
                      )}
                      {panel.scene?.description && (
                        <div>
                          <span className="text-neutral-400 uppercase tracking-wider text-[10px]">Scene prompt</span>
                          {editingPanelPrompt === panel.number ? (
                            <div className="mt-1">
                              <textarea
                                value={editedPrompt}
                                onChange={(e) => setEditedPrompt(e.target.value)}
                                rows={3}
                                className="w-full px-2 py-1.5 border border-neutral-300 rounded-lg text-xs focus:border-neutral-900 focus:outline-none resize-none"
                              />
                              <div className="flex gap-2 mt-1">
                                <button
                                  onClick={async () => {
                                    // Save edited prompt to DB
                                    try {
                                      await fetch(`/api/books/${bookId}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          updatePanelScene: { number: panel.number, description: editedPrompt },
                                        }),
                                      });
                                      // Update local state
                                      setPanels(prev => prev.map(p =>
                                        p.number === panel.number
                                          ? { ...p, scene: { ...p.scene, description: editedPrompt }, status: 'pending', error: undefined }
                                          : p
                                      ));
                                      setEditingPanelPrompt(null);
                                    } catch { /* ignore */ }
                                  }}
                                  className="px-2 py-1 bg-neutral-900 text-white rounded text-[10px] font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingPanelPrompt(null)}
                                  className="px-2 py-1 text-neutral-500 text-[10px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-1 mt-0.5">
                              <p className="text-neutral-700 flex-1">{panel.scene.description}</p>
                              {(panel.status === 'error' || panel.status === 'pending') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPanelPrompt(panel.number);
                                    setEditedPrompt(panel.scene?.description || '');
                                  }}
                                  className="text-neutral-400 hover:text-neutral-900 flex-shrink-0 mt-0.5"
                                  title="Edit scene prompt"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {panel.scene?.background && (
                        <div>
                          <span className="text-neutral-400 uppercase tracking-wider text-[10px]">Background</span>
                          <p className="text-neutral-500 mt-0.5">{panel.scene.background}</p>
                        </div>
                      )}
                      {panel.scene?.mood && (
                        <div className="flex gap-2">
                          <span className="text-neutral-400">Mood:</span>
                          <span className="text-neutral-600">{panel.scene.mood}</span>
                        </div>
                      )}
                      {panel.scene?.cameraAngle && (
                        <div className="flex gap-2">
                          <span className="text-neutral-400">Camera:</span>
                          <span className="text-neutral-600">{panel.scene.cameraAngle}</span>
                        </div>
                      )}
                      {panel.dialogue && panel.dialogue.length > 0 && (
                        <div>
                          <span className="text-neutral-400 uppercase tracking-wider text-[10px]">Dialogue</span>
                          {panel.dialogue.map((d, di) => (
                            <p key={di} className="text-neutral-700 mt-0.5">
                              <strong>{d.speaker}:</strong> &ldquo;{d.text}&rdquo;
                            </p>
                          ))}
                        </div>
                      )}
                      {Object.keys(panel.scene?.characterActions || {}).length > 0 && (
                        <div>
                          <span className="text-neutral-400 uppercase tracking-wider text-[10px]">Actions</span>
                          {Object.entries(panel.scene.characterActions).map(([char, action]) => (
                            <p key={char} className="text-neutral-600 mt-0.5">
                              <strong>{char}:</strong> {action}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>

          {/* Free Preview Upgrade CTA - between free and locked panels */}
          {isFreePreview && doneCount >= 5 && !isGenerating && (
            <div className="my-6 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-8 text-white text-center">
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                Like what you see?
              </h2>
              <p className="text-neutral-300 mb-1">
                You&apos;ve previewed {doneCount} of {panels.length} panels.
              </p>
              <p className="text-neutral-400 text-sm mb-6">
                Unlock the complete book with all {panels.length} illustrated panels.
              </p>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        bookId,
                        email: session?.user?.email || '',
                        productType: 'upgrade',
                      }),
                    });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  } catch (err) {
                    console.error('Checkout error:', err);
                  }
                }}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-neutral-900 rounded-full hover:bg-neutral-100 font-medium transition-colors text-lg"
              >
                <Zap className="h-5 w-5" />
                Finish My Book: $3.99
              </button>
              <p className="text-neutral-500 text-xs mt-3">
                <span className="line-through">$6.99</span> limited time discount
              </p>

              {/* Promo code input */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-neutral-400 text-xs mb-2">Have a promo code?</p>
                <div className="flex gap-2 max-w-xs mx-auto">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-white/40 uppercase"
                  />
                  <button
                    onClick={async () => {
                      if (!promoCode.trim()) return;
                      setPromoLoading(true);
                      setPromoError('');
                      try {
                        const res = await fetch('/api/free-order', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ bookId, promoCode, email: session?.user?.email }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          window.location.reload();
                        } else {
                          setPromoError(data.error || 'Invalid code');
                        }
                      } catch {
                        setPromoError('Failed to apply code');
                      } finally {
                        setPromoLoading(false);
                      }
                    }}
                    disabled={promoLoading || !promoCode.trim()}
                    className="px-4 py-2 bg-white text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 transition-colors"
                  >
                    {promoLoading ? '...' : 'Apply'}
                  </button>
                </div>
                {promoError && <p className="text-red-400 text-xs mt-1">{promoError}</p>}
              </div>
            </div>
          )}

          {/* Locked panels below the CTA */}
          {lockedPanels.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {lockedPanels.map((panel) => (
                <div
                  key={panel.number}
                  className="bg-white rounded-xl overflow-hidden border border-neutral-100 opacity-60 shadow-sm"
                >
                  <div className="aspect-[3/4] bg-neutral-50 relative">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Lock className="h-5 w-5 text-neutral-300 mb-1" />
                      <span className="text-xs text-neutral-400">Panel {panel.number}</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-neutral-400 font-medium line-clamp-1">{panel.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          </>);
          })()}

          {/* Instructions */}
          {pendingCount === panels.length && !isGenerating && (
            <div className="mt-12 text-center text-neutral-500">
              <p className="text-sm">
                Click the button above to start. {bookData?.paymentStatus === 'free_preview' ? '5 preview panels' : `All ${panels.length} panels`} will be generated.
              </p>
              <p className="text-xs mt-2">
                You can leave this page and come back anytime. Generation continues in the background.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Cancel Generation Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelConfirm}
        title="Cancel Generation?"
        message="This will stop generating new panels. Any panels already completed will be saved."
        confirmText="Stop Generation"
        cancelText="Keep Going"
        type="warning"
      />

      {/* Admin Force Complete Confirmation Modal */}
      <ConfirmModal
        isOpen={showAdminForceConfirm}
        onClose={() => setShowAdminForceConfirm(false)}
        onConfirm={handleAdminForceConfirm}
        title="Force Complete Book"
        message="Are you sure you want to force mark this book as completed? This is an admin action and should only be used when generation is stuck."
        confirmText="Force Complete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size panel"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-900" />
          <p className="text-neutral-600">Loading...</p>
        </div>
      </main>
    </div>
  );
}

export default function GenerateComicPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GenerateComicContent />
    </Suspense>
  );
}
