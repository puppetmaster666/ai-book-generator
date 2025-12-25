'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { Download, BookOpen, Loader2, Check, AlertCircle } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-[#FFFDF8]">
        <Header />
        <main className="pt-24 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 text-[#EF4444] mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[#0F1A2A] mb-2">Book Not Found</h1>
            <p className="text-[#4A5568]">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  const progress = book.totalChapters > 0
    ? Math.round((book.currentChapter / book.totalChapters) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#FFFDF8]">
      <Header />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Book Header */}
          <div className="bg-white rounded-xl border border-[#E8E4DC] p-6 sm:p-8 mb-6">
            <div className="flex items-start gap-6">
              {book.coverImageUrl ? (
                <img
                  src={book.coverImageUrl}
                  alt={book.title}
                  className="w-32 h-48 object-cover rounded-lg shadow-md"
                />
              ) : (
                <div className="w-32 h-48 bg-[#F7F5F0] rounded-lg flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-[#4A5568]" />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[#0F1A2A] mb-1">{book.title}</h1>
                <p className="text-[#4A5568] mb-4">by {book.authorName}</p>

                {/* Status Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  book.status === 'completed'
                    ? 'bg-[#10B981]/10 text-[#10B981]'
                    : book.status === 'failed'
                    ? 'bg-[#EF4444]/10 text-[#EF4444]'
                    : 'bg-[#1E3A5F]/10 text-[#1E3A5F]'
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
            <div className="bg-white rounded-xl border border-[#E8E4DC] p-6 sm:p-8 mb-6">
              <h2 className="text-lg font-semibold text-[#0F1A2A] mb-4">Generation Progress</h2>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#4A5568]">
                    {book.status === 'outlining' ? 'Creating outline...' : `Chapter ${book.currentChapter} of ${book.totalChapters}`}
                  </span>
                  <span className="font-medium text-[#0F1A2A]">{progress}%</span>
                </div>
                <div className="h-3 bg-[#E8E4DC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1E3A5F] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <p className="text-sm text-[#4A5568]">
                {book.totalWords.toLocaleString()} words written so far
              </p>
            </div>
          )}

          {/* Completed Section */}
          {book.status === 'completed' && (
            <div className="bg-white rounded-xl border border-[#E8E4DC] p-6 sm:p-8 mb-6">
              <h2 className="text-lg font-semibold text-[#0F1A2A] mb-4">Your Book is Ready!</h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#F7F5F0] rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-[#0F1A2A]">{book.totalChapters}</p>
                  <p className="text-sm text-[#4A5568]">Chapters</p>
                </div>
                <div className="bg-[#F7F5F0] rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-[#0F1A2A]">{book.totalWords.toLocaleString()}</p>
                  <p className="text-sm text-[#4A5568]">Words</p>
                </div>
                <div className="bg-[#F7F5F0] rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-[#0F1A2A]">{Math.round(book.totalWords / 250)}</p>
                  <p className="text-sm text-[#4A5568]">Pages (approx)</p>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D4A73] font-medium"
              >
                <Download className="h-5 w-5" /> Download EPUB
              </button>
            </div>
          )}

          {/* Chapters List */}
          {book.chapters.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E8E4DC] p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-[#0F1A2A] mb-4">Chapters</h2>
              <div className="space-y-3">
                {book.chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="flex items-center justify-between p-3 bg-[#F7F5F0] rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-[#0F1A2A]">
                        Chapter {chapter.number}: {chapter.title}
                      </p>
                      <p className="text-sm text-[#4A5568]">
                        {chapter.wordCount.toLocaleString()} words
                      </p>
                    </div>
                    <Check className="h-5 w-5 text-[#10B981]" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
