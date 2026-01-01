'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2, Check, X, Download, AlertCircle, RefreshCw, StopCircle, Clock, ShieldAlert } from 'lucide-react';

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

  const [bookData, setBookData] = useState<BookData | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false);
  const [error, setError] = useState('');
  const [allComplete, setAllComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isWaitingForOutline, setIsWaitingForOutline] = useState(false);

  // AbortController for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const outlinePollRef = useRef<NodeJS.Timeout | null>(null);
  const outlineTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (isGenerating) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
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
            setIsAdmin(userData.user?.isAdmin || false);
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

  // Check if all panels are complete
  useEffect(() => {
    if (panels.length > 0) {
      const complete = panels.every(p => p.status === 'done');
      setAllComplete(complete);
    }
  }, [panels]);

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

      if (!res.ok) {
        throw new Error('Failed to start generation');
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
                return { ...p, status: 'done', imageUrl: ill.imageUrl };
              }
              return p;
            }));

            // Check if we are done based on book status or counts
            const doneCount = book.illustrations.length;
            const targetCount = Math.min(book.outline?.chapters?.length || 0, 24); // Cap at 24/20

            if (doneCount >= targetCount && targetCount > 0) {
              // Trigger assembly if not already triggering
              if (!isAssembling) {
                assembleBook();
              }
            }
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

  // Cancel generation
  const cancelGeneration = useCallback(async () => {
    setIsCancelling(true);
    // For background process, we can't easily "cancel" the running server request without an API.
    // We'll just stop polling and redirect user home.
    // Ideally we'd have a cancel endpoint.

    setIsGenerating(false);
    setIsCancelling(false);

    if (confirm('Generation will continue in the background. Do you want to go to the book page to verify later?')) {
      router.push(`/book/${bookId}`);
    }
  }, [bookId, router]);

  // Emergency stop for admins
  const emergencyStop = useCallback(async () => {
    if (!confirm('ADMIN: Force mark this book as completed?')) {
      return;
    }
    // ... same as before ...
    try {
      const response = await fetch(`/api/books/${bookId}/emergency-stop`, {
        method: 'POST',
      });
      if (response.ok) {
        router.replace(`/book/${bookId}`);
      }
    } catch (err) {
      console.error(err);
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
  const pendingCount = panels.filter(p => p.status === 'pending').length;
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
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="py-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-900" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Preparing Your Comic</h2>
            <p className="text-neutral-600 mb-4">
              Creating your story outline and planning each panel...
            </p>
            <p className="text-sm text-neutral-500">
              This usually takes 15-30 seconds. Please don&apos;t close this page.
            </p>
          </div>
        </main>
      </div>
    );
  }

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
              {panels.length} {bookData?.dialogueStyle === 'bubbles' ? 'panels' : 'panels'} • {bookData?.artStyle} style
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8 bg-white rounded-2xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
              <span>Progress</span>
              <span>{doneCount} / {panels.length} {bookData?.dialogueStyle === 'bubbles' ? 'panels' : 'panels'} complete</span>
            </div>
            <div className="h-3 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-neutral-900 transition-all duration-300"
                style={{ width: `${(doneCount / panels.length) * 100}%` }}
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
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            {pendingCount === panels.length && !isGenerating && (
              <button
                onClick={generateAllPanels}
                disabled={isGenerating}
                className="flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 disabled:opacity-50 font-medium transition-all"
              >
                Generate All {panels.length} {bookData?.dialogueStyle === 'bubbles' ? 'Panels' : 'Panels'}
              </button>
            )}

            {isGenerating && (
              <button
                onClick={cancelGeneration}
                disabled={isCancelling}
                className="flex items-center gap-2 px-8 py-4 bg-neutral-700 text-white rounded-full hover:bg-neutral-600 disabled:opacity-50 font-medium transition-all"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <StopCircle className="h-5 w-5" />
                    Cancel Generation
                  </>
                )}
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

            {allComplete && (
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
            )}
          </div>

          {/* Generating Status with Timer */}
          {isGenerating && (
            <div className="mb-8 bg-neutral-100 border border-neutral-300 rounded-2xl overflow-hidden">
              {/* Timer Header */}
              <div className="bg-neutral-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-300 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-neutral-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900">Generating Your Illustrations</p>
                    <p className="text-sm text-neutral-600">{generatingCount} {bookData?.dialogueStyle === 'bubbles' ? 'panels' : 'pages'} in progress</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-mono font-bold text-neutral-900">{formatTime(elapsedTime)}</p>
                  <p className="text-xs text-neutral-500">elapsed</p>
                </div>
              </div>

              {/* Warning Message */}
              <div className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2 text-neutral-800 mb-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium">Please do not leave this page</span>
                </div>
                <p className="text-sm text-neutral-600">
                  This typically takes <strong>5-10 minutes</strong> for {panels.length} {bookData?.dialogueStyle === 'bubbles' ? 'panels' : 'pages'}.
                  Images are generated one at a time to ensure quality and reliability.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-8 p-4 bg-neutral-100 border border-neutral-300 rounded-xl text-center text-neutral-700">
              {error}
            </div>
          )}

          {/* Panel Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {panels.map((panel, index) => (
              <div
                key={panel.number}
                className="bg-white rounded-xl overflow-hidden border border-neutral-200 shadow-sm"
              >
                {/* Panel Image Area */}
                <div className="aspect-[3/4] bg-neutral-100 relative">
                  {panel.status === 'pending' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
                      <span className="text-3xl font-bold mb-2">{panel.number}</span>
                      <span className="text-xs">Waiting</span>
                    </div>
                  )}

                  {panel.status === 'generating' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50">
                      <Loader2 className="h-8 w-8 animate-spin text-neutral-900 mb-2" />
                      <span className="text-xs text-neutral-600">Generating...</span>
                    </div>
                  )}

                  {panel.status === 'done' && panel.imageUrl && (
                    <Image
                      src={panel.imageUrl}
                      alt={`Panel ${panel.number}: ${panel.scene.description}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}

                  {panel.status === 'error' && (
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
                  )}
                </div>

                {/* Panel Info */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-neutral-500">{bookData?.dialogueStyle === 'bubbles' ? 'Panel' : 'Page'} {panel.number}</span>
                    {panel.status === 'done' && (
                      <Check className="h-4 w-4 text-neutral-900" />
                    )}
                  </div>
                  <p className="text-sm text-neutral-900 font-medium line-clamp-1">
                    {panel.title}
                  </p>
                  <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
                    {panel.scene.description}
                  </p>
                  {panel.dialogue && panel.dialogue.length > 0 && (
                    <p className="text-xs text-neutral-600 mt-1">
                      {panel.dialogue.length} bubble{panel.dialogue.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          {pendingCount === panels.length && !isGenerating && (
            <div className="mt-12 text-center text-neutral-500">
              <p className="text-sm">
                Click the button above to start. All {panels.length} {bookData?.dialogueStyle === 'bubbles' ? 'panels' : 'pages'} will be generated one at a time.
              </p>
              <p className="text-xs mt-2">
                This typically takes 5-10 minutes depending on the number of illustrations.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
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
