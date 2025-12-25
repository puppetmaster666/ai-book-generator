'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { BookOpen, Plus, Download, Clock, Check, AlertCircle } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  genre: string;
  status: string;
  currentChapter: number;
  totalChapters: number;
  totalWords: number;
  coverImageUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

export default function Dashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch user's books from API
    // For now, show empty state
    setLoading(false);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-[#10B981]" />;
      case 'generating':
      case 'outlining':
        return <Clock className="h-4 w-4 text-[#1E3A5F]" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-[#EF4444]" />;
      default:
        return <Clock className="h-4 w-4 text-[#4A5568]" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF8]">
      <Header />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-[#0F1A2A]">My Books</h1>
            <Link
              href="/create"
              className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D4A73]"
            >
              <Plus className="h-5 w-5" /> New Book
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-[#4A5568]">Loading...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-16 w-16 text-[#E8E4DC] mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-[#0F1A2A] mb-2">No books yet</h2>
              <p className="text-[#4A5568] mb-6">Create your first AI-generated book</p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D4A73]"
              >
                <Plus className="h-5 w-5" /> Create Your First Book
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  className="bg-white rounded-xl border border-[#E8E4DC] overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[3/4] relative bg-[#F7F5F0]">
                    {book.coverImageUrl ? (
                      <img
                        src={book.coverImageUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-[#4A5568]" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[#0F1A2A] mb-1 truncate">{book.title}</h3>
                    <p className="text-sm text-[#4A5568] mb-2">{book.genre}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm">
                        {getStatusIcon(book.status)}
                        <span className="capitalize text-[#4A5568]">{book.status}</span>
                      </div>
                      {book.status === 'completed' && (
                        <Download className="h-4 w-4 text-[#1E3A5F]" />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
