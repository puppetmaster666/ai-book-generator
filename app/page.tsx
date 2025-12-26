'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Loader2, Sparkles, Menu, X, Check, BookOpen } from 'lucide-react';
import Footer from '@/components/Footer';

export default function Home() {
  const router = useRouter();
  const [bookIdea, setBookIdea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleFindIdea = async () => {
    setIsGeneratingIdea(true);
    setError('');

    try {
      const response = await fetch('/api/generate-idea', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate idea');
      }

      const data = await response.json();
      setBookIdea(data.idea);
    } catch (err) {
      setError('Failed to generate idea. Please try again.');
    } finally {
      setIsGeneratingIdea(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookIdea.trim() || bookIdea.length < 10) {
      setError('Please describe your book idea in more detail');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/expand-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: bookIdea }),
      });

      if (!response.ok) {
        throw new Error('Failed to process idea');
      }

      const bookPlan = await response.json();
      sessionStorage.setItem('bookPlan', JSON.stringify(bookPlan));
      sessionStorage.setItem('originalIdea', bookIdea);
      router.push('/review');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F3EF' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: '#E0DDD6' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-wide" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
            Draft My Book
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              How It Works
            </Link>
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Pricing
            </Link>
            <Link href="/faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              FAQ
            </Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              Log In
            </Link>
          </nav>

          {/* Mobile Menu */}
          <div className="md:hidden relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-black/5 rounded transition-colors"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 bg-white rounded shadow-lg border py-2 min-w-[160px] z-50" style={{ borderColor: '#E0DDD6' }}>
                <Link href="/how-it-works" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                  How It Works
                </Link>
                <Link href="/pricing" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                  Pricing
                </Link>
                <Link href="/faq" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                  FAQ
                </Link>
                <div className="border-t my-2" style={{ borderColor: '#E0DDD6' }} />
                <Link href="/login" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                  Log In
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 lg:py-32">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left Column - Content */}
              <div>
                <p className="text-sm text-gray-500 mb-4 tracking-wide uppercase">AI-Powered Book Generation</p>
                <h1 className="text-4xl md:text-5xl lg:text-5xl leading-tight mb-6" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
                  Your story deserves to be told.
                </h1>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
                  Transform your idea into a professionally written book. From concept to complete manuscript in minutes, not months.
                </p>

                <form onSubmit={handleSubmit} className="mb-6">
                  <div className="bg-white p-6 rounded border shadow-sm" style={{ borderColor: '#E0DDD6' }}>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      What&apos;s your book about?
                    </label>
                    <div className="relative">
                      <textarea
                        value={bookIdea}
                        onChange={(e) => setBookIdea(e.target.value)}
                        placeholder="A thriller about a detective who discovers her own name in an old cold case file..."
                        className="w-full h-24 px-4 py-3 text-base border rounded focus:border-gray-900 focus:outline-none resize-none placeholder-gray-400"
                        style={{ borderColor: '#E0DDD6', backgroundColor: '#FAFAF8' }}
                        disabled={isLoading || isGeneratingIdea}
                      />
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={handleFindIdea}
                        disabled={isLoading || isGeneratingIdea}
                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isGeneratingIdea ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Finding idea...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Find me an idea
                          </>
                        )}
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || !bookIdea.trim()}
                        className="bg-gray-900 text-white px-6 py-3 rounded text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Start Writing <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <p className="text-red-700 text-sm mt-3 bg-red-50 px-4 py-2 rounded">{error}</p>
                  )}
                </form>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> No credit card required</span>
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Free outline generation</span>
                </div>
              </div>

              {/* Right Column - Hero Image */}
              <div className="hidden lg:block">
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200" style={{ borderColor: '#E0DDD6' }}>
                  {/* Placeholder - Replace with hero image once downloaded */}
                  {/* <Image src="/images/hero.jpg" alt="Book writing" fill className="object-cover" /> */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Hero image coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 border-t" style={{ borderColor: '#E0DDD6' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-sm text-gray-500 mb-4 tracking-wide uppercase">How It Works</p>
                <h2 className="text-3xl md:text-4xl mb-6" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
                  From idea to published book.
                </h2>
                <p className="text-gray-600 mb-8 leading-relaxed" style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '1.125rem' }}>
                  Our AI understands story structure, character development, and genre conventions.
                  You provide the vision, we handle the writing.
                </p>
                <Link
                  href="/how-it-works"
                  className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors inline-flex items-center gap-2"
                >
                  Learn more <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-6">
                <div className="bg-white p-6 rounded border" style={{ borderColor: '#E0DDD6' }}>
                  <div className="flex items-start gap-4">
                    <span className="w-8 h-8 bg-gray-900 text-white rounded flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Describe your idea</h3>
                      <p className="text-sm text-gray-600">Tell us about your book in a few sentences. Genre, plot, characters.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded border" style={{ borderColor: '#E0DDD6' }}>
                  <div className="flex items-start gap-4">
                    <span className="w-8 h-8 bg-gray-900 text-white rounded flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Review the outline</h3>
                      <p className="text-sm text-gray-600">We generate a detailed chapter-by-chapter outline for your approval.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded border" style={{ borderColor: '#E0DDD6' }}>
                  <div className="flex items-start gap-4">
                    <span className="w-8 h-8 bg-gray-900 text-white rounded flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">Download your book</h3>
                      <p className="text-sm text-gray-600">Get your complete manuscript as an EPUB, ready for Amazon KDP.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Book Showcase */}
        <section className="py-20 border-t" style={{ borderColor: '#E0DDD6' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-sm text-gray-500 mb-4 tracking-wide uppercase">See The Result</p>
              <h2 className="text-3xl md:text-4xl mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
                Professional quality books.
              </h2>
              <p className="text-gray-600" style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '1.125rem' }}>
                Every book includes a formatted title page, table of contents, and beautifully typeset chapters ready for e-readers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded border shadow-sm" style={{ borderColor: '#E0DDD6' }}>
                <div className="aspect-[3/4] relative overflow-hidden rounded mb-4 bg-gray-100">
                  <Image
                    src="/images/screenshots/epub-cover.png"
                    alt="EPUB title page example"
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Title Page</h3>
                <p className="text-sm text-gray-600">Professional title page with your book title and author name.</p>
              </div>

              <div className="bg-white p-4 rounded border shadow-sm" style={{ borderColor: '#E0DDD6' }}>
                <div className="aspect-[3/4] relative overflow-hidden rounded mb-4 bg-gray-100">
                  <Image
                    src="/images/screenshots/epub-toc.png"
                    alt="EPUB table of contents example"
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Table of Contents</h3>
                <p className="text-sm text-gray-600">Clickable chapter navigation for easy reading.</p>
              </div>

              <div className="bg-white p-4 rounded border shadow-sm" style={{ borderColor: '#E0DDD6' }}>
                <div className="aspect-[3/4] relative overflow-hidden rounded mb-4 bg-gray-100">
                  <Image
                    src="/images/screenshots/epub-chapter-1.png"
                    alt="EPUB chapter content example"
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">Chapter Content</h3>
                <p className="text-sm text-gray-600">Beautifully formatted text that flows naturally on any device.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 border-t" style={{ borderColor: '#E0DDD6' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-sm text-gray-500 mb-4 tracking-wide uppercase">Pricing</p>
              <h2 className="text-3xl md:text-4xl mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
                Simple, transparent pricing.
              </h2>
              <p className="text-gray-600" style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '1.125rem' }}>
                Pay per book or subscribe for more value. No hidden fees.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* One-Time */}
              <div className="bg-white p-8 rounded border" style={{ borderColor: '#E0DDD6' }}>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Single Book</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">$19.99</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">One-time payment</p>
                <ul className="space-y-3 mb-8 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-900" /> Complete 50k+ word book</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-900" /> EPUB download</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-900" /> Full commercial rights</li>
                </ul>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="w-full py-3 border border-gray-900 text-gray-900 rounded text-sm font-medium hover:bg-gray-900 hover:text-white transition-colors"
                >
                  Get Started
                </button>
              </div>

              {/* Monthly */}
              <div className="bg-white p-8 rounded border-2 border-gray-900 relative">
                <div className="absolute -top-3 left-6 bg-gray-900 text-white px-3 py-1 rounded text-xs font-medium">
                  Popular
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Monthly</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">$69</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">5 books per month</p>
                <ul className="space-y-3 mb-8 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-900" /> Everything in Single</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-900" /> Priority generation</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-900" /> Cancel anytime</li>
                </ul>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="w-full py-3 bg-gray-900 text-white rounded text-sm font-medium hover:bg-black transition-colors"
                >
                  Subscribe
                </button>
              </div>

              {/* Yearly */}
              <div className="bg-white p-8 rounded border" style={{ borderColor: '#E0DDD6' }}>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Yearly</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">$499</span>
                  <span className="text-gray-500">/year</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">50 book credits</p>
                <ul className="space-y-3 mb-8 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-900" /> Best value per book</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-900" /> Credits never expire</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-gray-900" /> Priority support</li>
                </ul>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="w-full py-3 border border-gray-900 text-gray-900 rounded text-sm font-medium hover:bg-gray-900 hover:text-white transition-colors"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t" style={{ borderColor: '#E0DDD6' }}>
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
              Ready to write your book?
            </h2>
            <p className="text-gray-600 mb-8" style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '1.125rem' }}>
              Join thousands of authors who have brought their stories to life.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-gray-900 text-white px-8 py-4 rounded text-sm font-medium hover:bg-black transition-colors inline-flex items-center gap-2"
            >
              Start Writing <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
