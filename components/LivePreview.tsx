'use client';

import { useEffect, useState, useRef } from 'react';
import { Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';

interface LivePreviewProps {
  bookId: string;
  isGenerating: boolean;
  currentChapter: number;
  bookFormat?: string;
  onChapterComplete?: (chapterNum: number, wordCount: number) => void;
}

export default function LivePreview({
  bookId,
  isGenerating,
  currentChapter,
  bookFormat,
  onChapterComplete,
}: LivePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [streamText, setStreamText] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE stream when generation starts
  useEffect(() => {
    if (!isGenerating || !bookId) {
      // Clean up when not generating
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // Don't stream for visual books (comics, picture books) - they have different flow
    if (bookFormat && ['comic', 'picture_book', 'illustrated'].includes(bookFormat)) {
      return;
    }

    // Connect to the stream
    const eventSource = new EventSource(`/api/books/${bookId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setStreamText('');
      setHasStarted(false);
    };

    eventSource.addEventListener('start', (e) => {
      const data = JSON.parse(e.data);
      setChapterTitle(data.chapterTitle || `Chapter ${data.chapterNum}`);
      setStreamText('');
      setWordCount(0);
      setHasStarted(true);
    });

    eventSource.addEventListener('chunk', (e) => {
      const data = JSON.parse(e.data);
      setStreamText(prev => prev + data.text);
      setWordCount(data.wordCount);
    });

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      setIsConnected(false);
      if (onChapterComplete && data.chapterNum) {
        onChapterComplete(data.chapterNum, data.wordCount);
      }
      eventSource.close();
    });

    eventSource.addEventListener('error', (e) => {
      console.error('SSE error:', e);
      setIsConnected(false);
      eventSource.close();
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isGenerating, bookId, bookFormat, onChapterComplete]);

  // Auto-scroll to bottom as new text arrives
  useEffect(() => {
    if (contentRef.current && isExpanded) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamText, isExpanded]);

  // Don't show for visual formats
  if (bookFormat && ['comic', 'picture_book', 'illustrated'].includes(bookFormat)) {
    return null;
  }

  // Don't show if not generating
  if (!isGenerating) {
    return null;
  }

  // Get last ~500 characters for the preview
  const previewText = streamText.length > 800
    ? '...' + streamText.slice(-800)
    : streamText;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 md:w-96 bg-neutral-900 rounded-xl shadow-2xl border border-neutral-700 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-neutral-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-lime-400 animate-pulse" />
          <span className="text-sm font-medium text-white">
            {hasStarted ? chapterTitle : 'AI Writing...'}
          </span>
          {isConnected && (
            <span className="flex items-center gap-1 text-xs text-lime-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {wordCount > 0 && (
            <span className="text-xs text-neutral-400">
              {wordCount.toLocaleString()} words
            </span>
          )}
          <button className="text-neutral-400 hover:text-white">
            {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div
          ref={contentRef}
          className="p-4 h-48 overflow-y-auto bg-neutral-900 font-mono text-xs text-neutral-300 leading-relaxed"
          style={{ scrollBehavior: 'smooth' }}
        >
          {!hasStarted ? (
            <div className="flex items-center justify-center h-full text-neutral-500">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p>Preparing chapter...</p>
              </div>
            </div>
          ) : previewText ? (
            <>
              <span className="whitespace-pre-wrap">{previewText}</span>
              <span className="inline-block w-2 h-4 bg-lime-400 ml-0.5 animate-pulse" />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {isExpanded && (
        <div className="px-4 py-2 bg-neutral-800 border-t border-neutral-700">
          <p className="text-xs text-neutral-500 text-center">
            Watch the AI write your story in real-time
          </p>
        </div>
      )}
    </div>
  );
}
