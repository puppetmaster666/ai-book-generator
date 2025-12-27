'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface GeneratingBook {
  id: string;
  title: string;
  status: 'pending' | 'outlining' | 'generating' | 'completed' | 'failed';
  currentChapter: number;
  totalChapters: number;
  totalWords: number;
  isVisualBook: boolean;
}

interface GeneratingBookContextType {
  generatingBook: GeneratingBook | null;
  setGeneratingBookId: (bookId: string | null) => void;
  clearGeneratingBook: () => void;
}

const GeneratingBookContext = createContext<GeneratingBookContextType | undefined>(undefined);

const STORAGE_KEY = 'draftmybook_generating_book';

export function GeneratingBookProvider({ children }: { children: ReactNode }) {
  const [generatingBook, setGeneratingBook] = useState<GeneratingBook | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);

  // Load bookId from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBookId(stored);
      }
    }
  }, []);

  // Poll for book status when we have a bookId
  useEffect(() => {
    if (!bookId) {
      setGeneratingBook(null);
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/books/${bookId}/status`);
        if (!res.ok) {
          // Book not found, clear it
          localStorage.removeItem(STORAGE_KEY);
          setBookId(null);
          setGeneratingBook(null);
          return;
        }

        const data = await res.json();
        const status = data.status;

        // Check if it's a visual book
        const isVisualBook = status.bookFormat === 'picture_book' ||
          status.dialogueStyle === 'bubbles' ||
          status.bookPreset === 'comic_story' ||
          status.bookPreset === 'childrens_picture';

        // Get title from a separate lightweight call if needed
        let title = 'Your Book';
        try {
          const titleRes = await fetch(`/api/books/${bookId}/title`);
          if (titleRes.ok) {
            const titleData = await titleRes.json();
            title = titleData.title || 'Your Book';
          }
        } catch {
          // Ignore title fetch errors
        }

        setGeneratingBook({
          id: status.id,
          title,
          status: status.status,
          currentChapter: status.currentChapter,
          totalChapters: status.totalChapters,
          totalWords: status.totalWords,
          isVisualBook,
        });

        // If completed or failed, clear after a delay
        if (status.status === 'completed' || status.status === 'failed') {
          setTimeout(() => {
            localStorage.removeItem(STORAGE_KEY);
            setBookId(null);
            setGeneratingBook(null);
          }, 10000); // Keep showing for 10 seconds after completion
        }
      } catch (err) {
        console.error('Error fetching generating book status:', err);
      }
    };

    // Fetch immediately
    fetchStatus();

    // Poll every 5 seconds (less aggressive than page polling)
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, [bookId]);

  const setGeneratingBookId = useCallback((id: string | null) => {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
      setBookId(id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setBookId(null);
      setGeneratingBook(null);
    }
  }, []);

  const clearGeneratingBook = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBookId(null);
    setGeneratingBook(null);
  }, []);

  return (
    <GeneratingBookContext.Provider value={{ generatingBook, setGeneratingBookId, clearGeneratingBook }}>
      {children}
    </GeneratingBookContext.Provider>
  );
}

export function useGeneratingBook() {
  const context = useContext(GeneratingBookContext);
  if (context === undefined) {
    throw new Error('useGeneratingBook must be used within a GeneratingBookProvider');
  }
  return context;
}
