'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Valid promo codes - FREEBOK gives 100% off
  const VALID_PROMO_CODES: Record<string, number> = {
    'FREEBOK': 100,
    'FOUNDER2024': 100,
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('bookPlan');
    if (!stored) {
      router.push('/');
      return;
    }
    setBookPlan(JSON.parse(stored));
  }, [router]);

  const applyPromoCode = () => {
    const code = promoCode.trim().toUpperCase();
    if (VALID_PROMO_CODES[code]) {
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoApplied(false);
      setPromoError('Invalid promo code');
    }
  };

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

      // If promo code applied with 100% off, skip payment and go to generation
      if (promoApplied) {
        // Mark as paid and redirect to generation
        const freeOrderResponse = await fetch('/api/free-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId,
            promoCode: promoCode.trim().toUpperCase(),
          }),
        });

        if (!freeOrderResponse.ok) {
          throw new Error('Failed to process free order');
        }

        // Redirect to book page to watch generation
        router.push(`/book/${bookId}`);
        return;
      }

      // Otherwise create checkout session for paid orders
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F3EF' }}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
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
    <div className="min-h-screen" style={{ backgroundColor: '#F5F3EF' }}>
      {/* Simple Header */}
      <header className="border-b" style={{ borderColor: '#E0DDD6' }}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/" className="text-xl font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
            Draft My Book
          </Link>
        </div>
      </header>

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 mb-6 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Start over
          </button>

          <div className="bg-white rounded-sm border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className="bg-neutral-900 p-8 text-white">
              <p className="text-sm opacity-70 mb-2">Your Book</p>
              <h1 className="text-3xl font-bold mb-2 text-white">{bookPlan.title}</h1>
              <div className="flex flex-wrap gap-3 mt-4">
                <span className="px-3 py-1 bg-white/10 rounded-sm text-sm">
                  {genreLabels[bookPlan.genre] || bookPlan.genre}
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-sm text-sm capitalize">
                  {bookPlan.bookType}
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-sm text-sm">
                  ~{bookPlan.targetWords.toLocaleString()} words
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-sm text-sm">
                  {bookPlan.targetChapters} chapters
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8">
              {/* Premise */}
              <div>
                <div className="flex items-center gap-2 text-neutral-900 mb-3">
                  <FileText className="h-5 w-5" />
                  <h2 className="font-semibold">Premise</h2>
                </div>
                <p className="text-neutral-600">{bookPlan.premise}</p>
              </div>

              {/* Characters */}
              {bookPlan.characters.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-neutral-900 mb-3">
                    <Users className="h-5 w-5" />
                    <h2 className="font-semibold">Characters</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bookPlan.characters.map((char, i) => (
                      <div key={i} className="bg-neutral-50 p-3 rounded-sm border border-neutral-100">
                        <p className="font-medium text-neutral-900">{char.name}</p>
                        <p className="text-sm text-neutral-600">{char.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plot Structure */}
              <div>
                <div className="flex items-center gap-2 text-neutral-900 mb-3">
                  <BookOpen className="h-5 w-5" />
                  <h2 className="font-semibold">Story Arc</h2>
                </div>
                <div className="space-y-3">
                  <div className="bg-neutral-50 p-4 rounded-sm border border-neutral-100">
                    <p className="text-sm font-medium text-neutral-900 mb-1">Beginning</p>
                    <p className="text-sm text-neutral-600">{bookPlan.beginning}</p>
                  </div>
                  <div className="bg-neutral-50 p-4 rounded-sm border border-neutral-100">
                    <p className="text-sm font-medium text-neutral-900 mb-1">Middle</p>
                    <p className="text-sm text-neutral-600">{bookPlan.middle}</p>
                  </div>
                  <div className="bg-neutral-50 p-4 rounded-sm border border-neutral-100">
                    <p className="text-sm font-medium text-neutral-900 mb-1">Ending</p>
                    <p className="text-sm text-neutral-600">{bookPlan.ending}</p>
                  </div>
                </div>
              </div>

              {/* Checkout Form */}
              <div className="border-t border-neutral-200 pt-8">
                <h2 className="text-xl font-semibold text-neutral-900 mb-6">Complete Your Order</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 mb-2">
                      Author Name (for the book cover)
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Your pen name or real name"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-sm focus:border-neutral-900 focus:outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 mb-2">
                      Email (for download link)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-sm focus:border-neutral-900 focus:outline-none bg-white"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-700 text-sm mb-4">{error}</p>
                )}

                {/* Promo Code Section */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-neutral-900 mb-2">
                    Promo Code (optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoApplied(false);
                        setPromoError('');
                      }}
                      placeholder="Enter promo code"
                      className="flex-1 px-4 py-3 border border-neutral-200 rounded-sm focus:border-neutral-900 focus:outline-none bg-white uppercase"
                    />
                    <button
                      type="button"
                      onClick={applyPromoCode}
                      disabled={!promoCode.trim()}
                      className="px-6 py-3 border border-neutral-900 text-neutral-900 rounded-sm hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-red-700 text-sm mt-2">{promoError}</p>
                  )}
                  {promoApplied && (
                    <p className="text-green-700 text-sm mt-2">Promo code applied - 100% off!</p>
                  )}
                </div>

                <div className="bg-neutral-50 p-4 rounded-sm border border-neutral-100 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">One complete book with AI cover</span>
                    {promoApplied ? (
                      <div className="text-right">
                        <span className="text-sm text-neutral-400 line-through mr-2">$19.99</span>
                        <span className="text-2xl font-bold text-green-700">FREE</span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold text-neutral-900">$19.99</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isLoading}
                  className="w-full bg-neutral-900 text-white py-4 rounded-sm text-lg font-medium hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : promoApplied ? (
                    <>
                      <BookOpen className="h-5 w-5" />
                      Generate Book Free
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Pay & Generate Book
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-neutral-500 mt-4">
                  {promoApplied
                    ? 'Book generation starts immediately'
                    : 'Book generation starts immediately after payment'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
