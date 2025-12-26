'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Loader2, Sparkles, Menu, X, Check } from 'lucide-react';
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
      {/* Hero Section with Integrated Header */}
      <section className="min-h-[90vh] flex flex-col">
        {/* Navigation - Part of Hero */}
        <nav className="w-full px-6 py-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 hover:bg-black/5 rounded transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop Left Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                How It Works
              </Link>
              <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
            </div>

            {/* Center Logo */}
            <Link
              href="/"
              className="absolute left-1/2 -translate-x-1/2 font-bold text-2xl md:text-3xl tracking-wide text-center"
              style={{ fontFamily: 'Cinzel, Georgia, serif' }}
            >
              Draft My Book
            </Link>

            {/* Desktop Right Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                FAQ
              </Link>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Log In
              </Link>
            </div>

            {/* Mobile placeholder for balance */}
            <div className="md:hidden w-9" />
          </div>
        </nav>

        {/* Mobile Menu Drawer */}
        {menuOpen && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setMenuOpen(false)} />
            <div className="fixed top-0 left-0 bottom-0 w-64 bg-[#F5F3EF] z-50 p-6 shadow-xl">
              <button onClick={() => setMenuOpen(false)} className="mb-8">
                <X className="h-6 w-6" />
              </button>
              <div className="flex flex-col gap-4">
                <Link href="/how-it-works" className="text-lg text-gray-800 hover:text-black" onClick={() => setMenuOpen(false)}>
                  How It Works
                </Link>
                <Link href="/pricing" className="text-lg text-gray-800 hover:text-black" onClick={() => setMenuOpen(false)}>
                  Pricing
                </Link>
                <Link href="/faq" className="text-lg text-gray-800 hover:text-black" onClick={() => setMenuOpen(false)}>
                  FAQ
                </Link>
                <div className="h-px bg-gray-300 my-2" />
                <Link href="/login" className="text-lg text-gray-800 hover:text-black" onClick={() => setMenuOpen(false)}>
                  Log In
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Hero Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-xl w-full text-center">
            <h1 className="text-4xl md:text-5xl leading-tight mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
              Write Your Book
            </h1>
            <p className="text-lg text-gray-600 mb-10" style={{ fontFamily: 'EB Garamond, Georgia, serif' }}>
              From idea to complete manuscript, ready for publishing.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="bg-white p-6 rounded-lg border shadow-sm text-left" style={{ borderColor: '#E0DDD6' }}>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  What&apos;s your book about?
                </label>
                <textarea
                  value={bookIdea}
                  onChange={(e) => setBookIdea(e.target.value)}
                  placeholder="A detective discovers her own name in an old cold case file..."
                  className="w-full h-28 px-4 py-3 text-base border rounded-lg focus:border-gray-900 focus:outline-none resize-none placeholder-gray-400"
                  style={{ borderColor: '#E0DDD6', backgroundColor: '#FAFAF8' }}
                  disabled={isLoading || isGeneratingIdea}
                />
                <div className="mt-4 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleFindIdea}
                    disabled={isLoading || isGeneratingIdea}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isGeneratingIdea ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Finding...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Surprise me
                      </>
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !bookIdea.trim()}
                    className="bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Get Started <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-red-700 text-sm mt-3 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
              )}
            </form>

            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Free to start</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Full ownership</span>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* How It Works */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl text-center mb-16" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center text-lg font-medium mx-auto mb-6">1</div>
                <h3 className="font-semibold text-gray-900 mb-2">Describe your idea</h3>
                <p className="text-gray-600 text-sm">Tell us your story concept in a few sentences.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center text-lg font-medium mx-auto mb-6">2</div>
                <h3 className="font-semibold text-gray-900 mb-2">Review the outline</h3>
                <p className="text-gray-600 text-sm">Get a detailed chapter outline before we write.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center text-lg font-medium mx-auto mb-6">3</div>
                <h3 className="font-semibold text-gray-900 mb-2">Download your book</h3>
                <p className="text-gray-600 text-sm">Get your EPUB ready for Amazon KDP.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Book Showcase */}
        <section className="py-20" style={{ backgroundColor: '#F5F3EF' }}>
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl text-center mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
              Professional Quality
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto" style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '1.125rem' }}>
              Formatted title page, table of contents, and beautifully typeset chapters.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg border shadow-sm" style={{ borderColor: '#E0DDD6' }}>
                <div className="aspect-[3/4] relative overflow-hidden rounded-lg mb-4 bg-gray-50">
                  <Image
                    src="/images/screenshots/epub-cover.png"
                    alt="Title page"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-center text-sm text-gray-600">Title Page</p>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm" style={{ borderColor: '#E0DDD6' }}>
                <div className="aspect-[3/4] relative overflow-hidden rounded-lg mb-4 bg-gray-50">
                  <Image
                    src="/images/screenshots/epub-toc.png"
                    alt="Table of contents"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-center text-sm text-gray-600">Table of Contents</p>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm" style={{ borderColor: '#E0DDD6' }}>
                <div className="aspect-[3/4] relative overflow-hidden rounded-lg mb-4 bg-gray-50">
                  <Image
                    src="/images/screenshots/epub-chapter-1.png"
                    alt="Chapter content"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-center text-sm text-gray-600">Chapter Content</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl text-center mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
              Simple Pricing
            </h2>
            <p className="text-gray-600 text-center mb-12" style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '1.125rem' }}>
              Pay per book or subscribe for better value.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* Single */}
              <div className="bg-[#F5F3EF] p-8 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Single Book</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">$19.99</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">One-time</p>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> 50k+ word book</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> EPUB download</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Commercial rights</li>
                </ul>
              </div>

              {/* Monthly */}
              <div className="bg-gray-900 text-white p-8 rounded-lg relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-gray-900 px-3 py-1 rounded text-xs font-medium">
                  Popular
                </div>
                <h3 className="font-semibold mb-2">Monthly</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">$69</span>
                  <span className="text-gray-400">/mo</span>
                </div>
                <p className="text-sm text-gray-400 mb-6">5 books/month</p>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Everything in Single</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Priority generation</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Cancel anytime</li>
                </ul>
              </div>

              {/* Yearly */}
              <div className="bg-[#F5F3EF] p-8 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Yearly</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">$499</span>
                  <span className="text-gray-500">/yr</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">50 book credits</p>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Best value</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Credits never expire</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Priority support</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20" style={{ backgroundColor: '#F5F3EF' }}>
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl mb-4" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
              Ready to start?
            </h2>
            <p className="text-gray-600 mb-8" style={{ fontFamily: 'EB Garamond, Georgia, serif', fontSize: '1.125rem' }}>
              Your book is waiting to be written.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-gray-900 text-white px-8 py-4 rounded-lg font-medium hover:bg-black transition-colors inline-flex items-center gap-2"
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
