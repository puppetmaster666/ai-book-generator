'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';

interface LivePreviewProps {
  bookId: string;
  isGenerating: boolean;
  isOutlining?: boolean;
  currentChapter: number;
  bookFormat?: string;
  onChapterComplete?: (chapterNum: number, wordCount: number) => void;
}

export default function LivePreview({
  bookId,
  isGenerating,
  isOutlining = false,
  currentChapter,
  bookFormat,
  onChapterComplete,
}: LivePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [streamText, setStreamText] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [lastChapter, setLastChapter] = useState(currentChapter);
  const contentRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Count words in text
  const countWords = (text: string) => {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  };

  const wordCount = countWords(streamText);

  // Poll for live preview content
  const fetchLivePreview = useCallback(async () => {
    try {
      const response = await fetch(`/api/books/${bookId}/live-preview`);
      if (!response.ok) return;

      const data = await response.json();

      if (data.livePreview) {
        setStreamText(data.livePreview);
        setIsActive(true);
      }

      // Detect chapter completion
      if (data.currentChapter > lastChapter) {
        setLastChapter(data.currentChapter);
        if (onChapterComplete) {
          onChapterComplete(data.currentChapter, countWords(data.livePreview || ''));
        }
        // Clear preview text when chapter completes
        if (!data.livePreview) {
          setStreamText('');
        }
      }

      // Stop polling if no longer generating
      if (!data.isGenerating) {
        setIsActive(false);
      }
    } catch (error) {
      // Ignore errors - polling is best-effort
    }
  }, [bookId, lastChapter, onChapterComplete]);

  // Start/stop polling based on generation status
  useEffect(() => {
    if (!isGenerating || !bookId) {
      // Stop polling when not generating
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setIsActive(false);
      return;
    }

    // Don't poll for visual books
    if (bookFormat && ['comic', 'picture_book', 'illustrated'].includes(bookFormat)) {
      return;
    }

    // Start polling every 1 second
    fetchLivePreview(); // Initial fetch
    pollIntervalRef.current = setInterval(fetchLivePreview, 1000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isGenerating, bookId, bookFormat, fetchLivePreview]);

  // Update lastChapter when prop changes
  useEffect(() => {
    setLastChapter(currentChapter);
  }, [currentChapter]);

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

  // Get last ~800 characters for the preview
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
          <Sparkles className={`h-4 w-4 animate-pulse ${isOutlining ? 'text-blue-400' : 'text-lime-400'}`} />
          <span className="text-sm font-medium text-white">
            {isOutlining ? 'Planning Outline' : `${bookFormat === 'screenplay' || bookFormat === 'tv_series' ? 'Sequence' : 'Chapter'} ${currentChapter + 1}`}
          </span>
          {isActive && (
            <span className={`flex items-center gap-1 text-xs ${isOutlining ? 'text-blue-400' : 'text-lime-400'}`}>
              <Loader2 className="h-3 w-3 animate-spin" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {wordCount > 0 && !isOutlining && (
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
          {!streamText ? (
            <div className="flex items-center justify-center h-full text-neutral-500">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p>Waiting for AI...</p>
              </div>
            </div>
          ) : (
            <>
              <span className="whitespace-pre-wrap">{previewText}</span>
              {isActive && (
                <span className="inline-block w-2 h-4 bg-lime-400 ml-0.5 animate-pulse" />
              )}
            </>
          )}
        </div>
      )}

      {/* Footer */}
      {isExpanded && (
        <div className="px-4 py-2 bg-neutral-800 border-t border-neutral-700">
          <p className="text-xs text-neutral-500 text-center">
            {isOutlining
              ? 'Planning your book structure...'
              : 'Watch the AI write your story in real-time'}
          </p>
        </div>
      )}
    </div>
  );
}
