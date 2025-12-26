'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft, ArrowRight, Loader2, BookOpen, Palette, FileText, Check, Users, Tag, X, Mail, Pencil } from 'lucide-react';
import { PRICING, BOOK_FORMATS, ART_STYLES } from '@/lib/constants';

interface BookData {
  id: string;
  title: string;
  authorName: string;
  genre: string;
  bookType: string;
  premise: string;
  characters: Array<{ name: string; description: string }>;
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  bookFormat: string;
  artStyle: string | null;
  targetWords: number;
  targetChapters: number;
  outline?: Array<{
    chapterNum: number;
    title: string;
    summary: string;
  }>;
}

function ReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookId = searchParams.get('bookId');
  const urlPromoCode = searchParams.get('promo');

  const [book, setBook] = useState<BookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User details
  const [email, setEmail] = useState('');
  const [authorName, setAuthorName] = useState('');

  // Promo code state
  const [promoCode, setPromoCode] = useState(urlPromoCode || '');
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  useEffect(() => {
    if (!bookId) {
      router.push('/create');
      return;
    }

    fetch(`/api/books/${bookId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError('Book not found');
        } else {
          setBook(data.book);
          setAuthorName(data.book.authorName || '');
        }
        setIsLoading(false);
      })
      .catch(() => {
        setError('Failed to load book details');
        setIsLoading(false);
      });
  }, [bookId, router]);

  // Auto-validate promo code from URL
  useEffect(() => {
    if (urlPromoCode) {
      validatePromoCode(urlPromoCode);
    }
  }, [urlPromoCode]);

  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoDiscount(null);
      setPromoError('');
      return;
    }

    setIsValidatingPromo(true);
    setPromoError('');

    try {
      const response = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCode: code }),
      });

      const data = await response.json();

      if (data.valid) {
        setPromoDiscount(data.discount);
        setPromoError('');
      } else {
        setPromoDiscount(null);
        setPromoError(data.error || 'Invalid promo code');
      }
    } catch {
      setPromoDiscount(null);
      setPromoError('Failed to validate promo code');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const clearPromoCode = () => {
    setPromoCode('');
    setPromoDiscount(null);
    setPromoError('');
  };

  const getBasePrice = () => {
    if (!book) return PRICING.ONE_TIME.price;
    if (book.bookFormat === 'picture_book') return PRICING.CHILDRENS.price;
    if (book.bookFormat === 'illustrated') return PRICING.ILLUSTRATED.price;
    return PRICING.ONE_TIME.price;
  };

  const getFormatLabel = () => {
    if (!book) return 'Book';
    return BOOK_FORMATS[book.bookFormat as keyof typeof BOOK_FORMATS]?.label || 'Book';
  };

  const originalPrice = getBasePrice() / 100;
  let finalPrice = originalPrice;
  let discountLabel = '';
  const isFree = promoDiscount === 1;

  if (promoDiscount) {
    finalPrice = originalPrice * (1 - promoDiscount);
    discountLabel = promoDiscount === 1 ? 'FREE' : `${Math.round(promoDiscount * 100)}% off`;
  }

  const handleContinueToCheckout = async () => {
    // Validate email
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // First, update the book with email and author name
    try {
      await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          authorName: authorName.trim() || 'Anonymous',
        }),
      });
    } catch {
      // Continue even if update fails
    }

    // If 100% discount, use free-order flow
    if (isFree) {
      try {
        const response = await fetch('/api/free-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId,
            promoCode: promoCode.toUpperCase(),
            email: email.trim().toLowerCase(),
          }),
        });

        const data = await response.json();
        if (data.success) {
          router.push(`/book/${bookId}?success=true`);
        } else {
          setError(data.error || 'Failed to process free order');
          setIsSubmitting(false);
        }
      } catch {
        setError('Something went wrong. Please try again.');
        setIsSubmitting(false);
      }
    } else {
      // Normal checkout flow
      const checkoutUrl = promoDiscount
        ? `/checkout?bookId=${bookId}&promo=${promoCode}`
        : `/checkout?bookId=${bookId}`;
      router.push(checkoutUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-900" />
          <p className="text-neutral-600">Loading your book...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <Header />
        <main className="py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-neutral-600 mb-8">{error || 'Book not found'}</p>
            <button
              onClick={() => router.push('/create')}
              className="px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800"
            >
              Start Over
            </button>
          </div>
        </main>
      </div>
    );
  }

  const genreLabels: Record<string, string> = {
    romance: 'Romance',
    mystery: 'Mystery/Thriller',
    fantasy: 'Fantasy',
    scifi: 'Science Fiction',
    horror: 'Horror',
    ya: 'Young Adult',
    literary: 'Literary Fiction',
    childrens: "Children's",
    selfhelp: 'Self-Help',
    memoir: 'Memoir',
    howto: 'How-To Guide',
    business: 'Business',
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <main className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/create')}
            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-8 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" /> Back to book types
          </button>

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Review Your Book
            </h1>
            <p className="text-lg text-neutral-600">
              Here&apos;s what we&apos;ll create based on your idea
            </p>
          </div>

          {/* Book Overview Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 mb-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                  {book.title}
                </h2>
                <p className="text-neutral-500">by {book.authorName}</p>
              </div>
              <div className="text-left md:text-right">
                {promoDiscount ? (
                  <>
                    <span className="text-lg text-neutral-400 line-through mr-2">${originalPrice.toFixed(2)}</span>
                    <span className="text-2xl font-bold text-green-600">
                      {isFree ? 'FREE' : `$${finalPrice.toFixed(2)}`}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold">${originalPrice.toFixed(2)}</span>
                )}
                <p className="text-sm text-neutral-500">{getFormatLabel()}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm">
                {genreLabels[book.genre] || book.genre}
              </span>
              <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm capitalize">
                {book.bookType}
              </span>
              {book.artStyle && (
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  {ART_STYLES[book.artStyle as keyof typeof ART_STYLES]?.label || book.artStyle}
                </span>
              )}
              <span className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm">
                ~{book.targetWords.toLocaleString()} words
              </span>
            </div>

            {/* Premise */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-neutral-400" />
                Story Premise
              </h3>
              <p className="text-neutral-700 leading-relaxed">{book.premise}</p>
            </div>

            {/* Story Arc */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-neutral-400" />
                Story Arc
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-neutral-50 rounded-xl p-4">
                  <h4 className="font-medium text-sm text-neutral-500 mb-2">Beginning</h4>
                  <p className="text-sm text-neutral-700">{book.beginning}</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4">
                  <h4 className="font-medium text-sm text-neutral-500 mb-2">Middle</h4>
                  <p className="text-sm text-neutral-700">{book.middle}</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4">
                  <h4 className="font-medium text-sm text-neutral-500 mb-2">Ending</h4>
                  <p className="text-sm text-neutral-700">{book.ending}</p>
                </div>
              </div>
            </div>

            {/* Characters */}
            {book.characters && book.characters.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-neutral-400" />
                  Characters
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {book.characters.map((char, idx) => (
                    <div key={idx} className="bg-neutral-50 rounded-lg p-3">
                      <span className="font-medium">{char.name}</span>
                      <p className="text-sm text-neutral-600 mt-1">{char.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Book Details */}
            <div className="border-t border-neutral-200 pt-6">
              <h3 className="font-semibold text-lg mb-3">Book Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-neutral-500">Chapters</span>
                  <p className="font-medium">{book.targetChapters}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Target Words</span>
                  <p className="font-medium">{book.targetWords.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Writing Style</span>
                  <p className="font-medium capitalize">{book.writingStyle}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Format</span>
                  <p className="font-medium">{getFormatLabel()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Promo Code */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4">Have a promo code?</h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="w-full pl-10 pr-10 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none transition-colors uppercase"
                  disabled={!!promoDiscount}
                />
                {promoCode && !promoDiscount && (
                  <button
                    onClick={clearPromoCode}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {promoDiscount ? (
                <button
                  onClick={clearPromoCode}
                  className="px-4 py-3 bg-green-100 text-green-700 rounded-xl font-medium flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {discountLabel}
                </button>
              ) : (
                <button
                  onClick={() => validatePromoCode(promoCode)}
                  disabled={!promoCode.trim() || isValidatingPromo}
                  className="px-4 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isValidatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </button>
              )}
            </div>
            {promoError && (
              <p className="text-xs text-red-600 mt-2">{promoError}</p>
            )}
          </div>

          {/* Your Details */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-6">
            <h3 className="font-semibold text-lg mb-4">Your Details</h3>
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none transition-colors"
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  We&apos;ll send you a link when your book is ready
                </p>
              </div>

              {/* Author Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Author Name
                </label>
                <div className="relative">
                  <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your pen name or real name"
                    className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none transition-colors"
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  This will appear on your book cover
                </p>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-8">
            <h3 className="font-semibold text-lg mb-4">What&apos;s Included</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                Complete {book.targetChapters}-chapter book
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                AI-generated cover design
              </div>
              {book.bookFormat !== 'text_only' && (
                <div className="flex items-center gap-2 text-sm text-neutral-700">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  {book.bookFormat === 'picture_book' ? 'Full-page illustrations' : 'Chapter illustrations'}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                EPUB download (Amazon KDP ready)
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                Full commercial rights
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                30-day money-back guarantee
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-900 text-white rounded-2xl p-6">
            <div>
              <p className="text-neutral-400 text-sm mb-1">Total</p>
              {promoDiscount ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg text-neutral-400 line-through">${originalPrice.toFixed(2)}</span>
                  <span className="text-3xl font-bold text-green-400">
                    {isFree ? 'FREE' : `$${finalPrice.toFixed(2)}`}
                  </span>
                </div>
              ) : (
                <p className="text-3xl font-bold">${originalPrice.toFixed(2)}</p>
              )}
            </div>
            <button
              onClick={handleContinueToCheckout}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-4 bg-white text-neutral-900 rounded-full hover:bg-neutral-100 font-medium transition-all hover:scale-105 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : isFree ? (
                <>
                  Generate Book Free <ArrowRight className="h-5 w-5" />
                </>
              ) : (
                <>
                  Continue to Checkout <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-red-600 text-center mt-4">{error}</p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neutral-900" />
      </div>
    }>
      <ReviewContent />
    </Suspense>
  );
}
