'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Loader2, Check, X, Download, AlertCircle, RefreshCw, StopCircle, Clock } from 'lucide-react';

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
  const [error, setError] = useState('');
  const [allComplete, setAllComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // AbortController for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

        // Initialize panels from outline
        if (data.book.outline?.chapters) {
          const initialPanels: Panel[] = data.book.outline.chapters.map((ch: Panel) => ({
            ...ch,
            status: 'pending' as const,
          }));
          setPanels(initialPanels);
        }
      } catch (err) {
        console.error('Error loading book:', err);
        setError('Failed to load book data');
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();
  }, [bookId]);

  // Check if all panels are complete
  useEffect(() => {
    if (panels.length > 0) {
      const complete = panels.every(p => p.status === 'done');
      setAllComplete(complete);
    }
  }, [panels]);

  // Generate a single panel
  const generatePanel = useCallback(async (panelIndex: number, signal?: AbortSignal) => {
    if (!bookData || !panels[panelIndex]) return;

    const panel = panels[panelIndex];

    // Update status to generating
    setPanels(prev => prev.map((p, i) =>
      i === panelIndex ? { ...p, status: 'generating' as const } : p
    ));

    try {
      const response = await fetch('/api/generate-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: bookData.id,
          panelNumber: panel.number,
          scene: panel.scene,
          dialogue: panel.dialogue,
          artStyle: bookData.artStyle,
          bookFormat: bookData.bookFormat,
          characterVisualGuide: bookData.characterVisualGuide,
          visualStyleGuide: bookData.visualStyleGuide,
          chapterTitle: panel.title,
          chapterText: panel.text,
        }),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate');
      }

      const result = await response.json();

      setPanels(prev => prev.map((p, i) =>
        i === panelIndex
          ? { ...p, status: 'done' as const, imageUrl: result.imageUrl }
          : p
      ));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled
        setPanels(prev => prev.map((p, i) =>
          i === panelIndex
            ? { ...p, status: 'pending' as const, error: undefined }
            : p
        ));
        return;
      }
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setPanels(prev => prev.map((p, i) =>
        i === panelIndex
          ? { ...p, status: 'error' as const, error: errorMsg }
          : p
      ));
    }
  }, [bookData, panels]);

  // Generate ALL panels in parallel
  const generateAllPanels = useCallback(async () => {
    if (!bookData || panels.length === 0) return;

    // Create new AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsGenerating(true);
    setError('');

    // Fire ALL generations at once - true parallel!
    const promises = panels.map((_, index) => generatePanel(index, signal));
    await Promise.allSettled(promises);

    if (!signal.aborted) {
      setIsGenerating(false);
    }
  }, [bookData, panels, generatePanel]);

  // Cancel generation
  const cancelGeneration = useCallback(async () => {
    setIsCancelling(true);

    // Abort all pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset all generating panels to pending
    setPanels(prev => prev.map(p =>
      p.status === 'generating' ? { ...p, status: 'pending' as const } : p
    ));

    setIsGenerating(false);
    setIsCancelling(false);

    // Ask if user wants to delete the book
    if (confirm('Do you want to delete this book and go back home?')) {
      try {
        await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to delete book:', e);
      }
      router.push('/');
    }
  }, [bookId, router]);

  // Retry a failed panel
  const retryPanel = useCallback((index: number) => {
    generatePanel(index);
  }, [generatePanel]);

  // Retry all failed panels
  const retryAllFailed = useCallback(() => {
    const failedIndices = panels
      .map((p, i) => p.status === 'error' ? i : -1)
      .filter(i => i !== -1);

    failedIndices.forEach(index => generatePanel(index));
  }, [panels, generatePanel]);

  // Assemble the book when all panels are complete
  const assembleBook = async () => {
    if (!bookId) return;

    setIsAssembling(true);
    setError('');

    try {
      const response = await fetch(`/api/books/${bookId}/assemble`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assemble book');
      }

      // Redirect to book page (which shows completed state)
      router.push(`/book/${bookId}`);
    } catch (err) {
      console.error('Error assembling book:', err);
      setError(err instanceof Error ? err.message : 'Failed to assemble book');
      setIsAssembling(false);
    }
  };

  // Calculate progress
  const doneCount = panels.filter(p => p.status === 'done').length;
  const errorCount = panels.filter(p => p.status === 'error').length;
  const pendingCount = panels.filter(p => p.status === 'pending').length;
  const generatingCount = panels.filter(p => p.status === 'generating').length;

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
              {panels.length} {bookData?.dialogueStyle === 'bubbles' ? 'panels' : 'pages'} • {bookData?.artStyle} style
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8 bg-white rounded-2xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
              <span>Progress</span>
              <span>{doneCount} / {panels.length} {bookData?.dialogueStyle === 'bubbles' ? 'panels' : 'pages'} complete</span>
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
                Generate All {panels.length} {bookData?.dialogueStyle === 'bubbles' ? 'Panels' : 'Pages'}
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
                  This typically takes <strong>1-2 minutes</strong> for {panels.length} {bookData?.dialogueStyle === 'bubbles' ? 'panels' : 'pages'}.
                  Your book is being generated in parallel for faster results.
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
                Click the button above to start. All {panels.length} {bookData?.dialogueStyle === 'bubbles' ? 'panels' : 'pages'} will be generated in parallel.
              </p>
              <p className="text-xs mt-2">
                This typically takes 1-2 minutes depending on the number of illustrations.
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
