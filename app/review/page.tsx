'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { BookOpen, Users, FileText, Loader2, ArrowLeft, CreditCard } from 'lucide-react';

interface BookPlan {
  title: string;
  genre: string;
  bookType: 'fiction' | 'non-fiction';
  premise: string;
  characters: { name: string; description: string }[];
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
}

export default function Review() {
  const router = useRouter();
  const [bookPlan, setBookPlan] = useState<BookPlan | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('bookPlan');
    if (!stored) {
      router.push('/');
      return;
    }
    setBookPlan(JSON.parse(stored));
  }, [router]);

  const handleCheckout = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }
    if (!authorName) {
      setError('Please enter your author name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First create the book record
      const bookResponse = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookPlan,
          authorName,
          email,
          chapterFormat: 'both',
          fontStyle: 'classic',
        }),
      });

      if (!bookResponse.ok) {
        throw new Error('Failed to create book');
      }

      const { id: bookId } = await bookResponse.json();

      // Then create checkout session
      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          email,
          productType: 'one-time',
        }),
      });

      if (!checkoutResponse.ok) {
        throw new Error('Failed to create checkout');
      }

      const { url } = await checkoutResponse.json();

      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  if (!bookPlan) {
    return (
      <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    );
  }

  const genreLabels: Record<string, string> = {
    romance: 'Romance',
    mystery: 'Mystery/Thriller',
    fantasy: 'Fantasy',
    'sci-fi': 'Science Fiction',
    thriller: 'Thriller',
    horror: 'Horror',
    ya: 'Young Adult',
    literary: 'Literary Fiction',
    'self-help': 'Self-Help',
    memoir: 'Memoir',
    'how-to': 'How-To Guide',
    business: 'Business',
  };

  return (
    <div className="min-h-screen bg-[#FFFDF8]">
      <Header />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-[#4A5568] hover:text-[#0F1A2A] mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Start over
          </button>

          <div className="bg-white rounded-2xl border border-[#E8E4DC] overflow-hidden shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2D4A73] p-8 text-white">
              <p className="text-sm opacity-80 mb-2">Your Book</p>
              <h1 className="text-3xl font-bold mb-2">{bookPlan.title}</h1>
              <div className="flex flex-wrap gap-3 mt-4">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  {genreLabels[bookPlan.genre] || bookPlan.genre}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm capitalize">
                  {bookPlan.bookType}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  ~{bookPlan.targetWords.toLocaleString()} words
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  {bookPlan.targetChapters} chapters
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8">
              {/* Premise */}
              <div>
                <div className="flex items-center gap-2 text-[#1E3A5F] mb-3">
                  <FileText className="h-5 w-5" />
                  <h2 className="font-semibold">Premise</h2>
                </div>
                <p className="text-[#4A5568]">{bookPlan.premise}</p>
              </div>

              {/* Characters */}
              {bookPlan.characters.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-[#1E3A5F] mb-3">
                    <Users className="h-5 w-5" />
                    <h2 className="font-semibold">Characters</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bookPlan.characters.map((char, i) => (
                      <div key={i} className="bg-[#F7F5F0] p-3 rounded-lg">
                        <p className="font-medium text-[#0F1A2A]">{char.name}</p>
                        <p className="text-sm text-[#4A5568]">{char.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plot Structure */}
              <div>
                <div className="flex items-center gap-2 text-[#1E3A5F] mb-3">
                  <BookOpen className="h-5 w-5" />
                  <h2 className="font-semibold">Story Arc</h2>
                </div>
                <div className="space-y-3">
                  <div className="bg-[#F7F5F0] p-4 rounded-lg">
                    <p className="text-sm font-medium text-[#1E3A5F] mb-1">Beginning</p>
                    <p className="text-sm text-[#4A5568]">{bookPlan.beginning}</p>
                  </div>
                  <div className="bg-[#F7F5F0] p-4 rounded-lg">
                    <p className="text-sm font-medium text-[#1E3A5F] mb-1">Middle</p>
                    <p className="text-sm text-[#4A5568]">{bookPlan.middle}</p>
                  </div>
                  <div className="bg-[#F7F5F0] p-4 rounded-lg">
                    <p className="text-sm font-medium text-[#1E3A5F] mb-1">Ending</p>
                    <p className="text-sm text-[#4A5568]">{bookPlan.ending}</p>
                  </div>
                </div>
              </div>

              {/* Checkout Form */}
              <div className="border-t border-[#E8E4DC] pt-8">
                <h2 className="text-xl font-semibold text-[#0F1A2A] mb-6">Complete Your Order</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-[#0F1A2A] mb-2">
                      Author Name (for the book cover)
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Your pen name or real name"
                      className="w-full px-4 py-3 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F1A2A] mb-2">
                      Email (for download link)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 text-sm mb-4">{error}</p>
                )}

                <div className="bg-[#F7F5F0] p-4 rounded-lg mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[#4A5568]">One complete book with AI cover</span>
                    <span className="text-2xl font-bold text-[#0F1A2A]">$19.99</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isLoading}
                  className="w-full bg-[#1E3A5F] text-white py-4 rounded-xl text-lg font-medium hover:bg-[#2D4A73] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Pay & Generate Book
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-[#4A5568] mt-4">
                  Book generation starts immediately after payment
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
