'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Loader2, Sparkles, X, Check, ChevronRight, Zap, BookOpen, Download, ExternalLink } from 'lucide-react';
import Footer from '@/components/Footer';
import NewYearPopup from '@/components/NewYearPopup';
import Header from '@/components/Header';

export default function Home() {
  const router = useRouter();
  const [bookIdea, setBookIdea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; label: string } | null>(null);

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
    if (!bookIdea.trim() || bookIdea.length < 20) {
      setError('Please describe your book idea in at least 20 characters');
      return;
    }

    // Store the idea and redirect to /create where user can choose book type
    sessionStorage.setItem('bookIdea', bookIdea);
    router.push('/create');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col pt-0">
        {/* Hero Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-neutral-100 px-4 py-2 rounded-full text-sm text-neutral-600 mb-8">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>50,000+ words in 30-60 minutes</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Turn your idea into
              <br />
              <span className="text-neutral-400">a complete book</span>
            </h1>

            <p className="text-xl text-neutral-600 max-w-2xl mx-auto mb-12">
              Create novels, comics, or picture books from a simple description. Professionally formatted and ready to publish.
            </p>

            {/* Form */}
            <form id="hero-form" onSubmit={handleSubmit} className="max-w-2xl mx-auto">
              <div className="bg-white/90 backdrop-blur rounded-2xl border border-neutral-200 shadow-lg p-2">
                <textarea
                  value={bookIdea}
                  onChange={(e) => setBookIdea(e.target.value)}
                  placeholder="Describe your book idea... A mystery novel about a detective who discovers her own name in a cold case file from 1985..."
                  className="w-full h-32 px-4 py-3 text-base bg-transparent focus:outline-none resize-none placeholder-neutral-400"
                  disabled={isLoading || isGeneratingIdea}
                />
                <div className="flex items-center justify-between gap-4 px-2 pb-2">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={handleFindIdea}
                      disabled={isLoading || isGeneratingIdea}
                      className="text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
                    >
                      {isGeneratingIdea ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {isGeneratingIdea ? 'Generating...' : 'Surprise me'}
                    </button>
                    <span className={`text-xs ${bookIdea.length >= 20 ? 'text-green-600' : 'text-neutral-400'}`}>
                      {bookIdea.length}/20 min
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || bookIdea.length < 20}
                    className="bg-neutral-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:scale-105"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating outline...
                      </>
                    ) : (
                      <>
                        Start writing
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-red-600 text-sm mt-3 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
              )}
            </form>

            {/* Trust signals */}
            <div className="mt-8 flex items-center justify-center gap-8 text-sm text-neutral-500">
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Full commercial rights
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Ready for Amazon KDP
              </span>
              <span className="hidden sm:flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                EPUB download
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Success Story - Blood & Silver */}
      <section className="py-20 px-6 bg-neutral-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Book Cover */}
            <div className="flex justify-center">
              <a
                href="https://a.co/d/f9GkEr9"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block no-underline focus:outline-none hover:scale-105 transition-transform duration-300"
              >
                <div className="relative w-72 md:w-80 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl">
                  <Image
                    src="/images/cover.jpg"
                    alt="Blood & Silver by Freddie Fabrevoie"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  <span className="text-white flex items-center gap-2">
                    View on Amazon <ExternalLink className="h-4 w-4" />
                  </span>
                </div>
              </a>
            </div>

            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Published on Amazon KDP
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                Blood & Silver
              </h2>
              <p className="text-xl text-neutral-300 mb-4">
                by Freddie Fabrevoie
              </p>
              <p className="text-neutral-400 mb-8 leading-relaxed">
                A complete 10-chapter historical fiction exploring history&apos;s most ruthless untold betrayals.
                Created with draftmybook, formatted to Amazon KDP specifications, and published in under an hour.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="https://a.co/d/f9GkEr9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-neutral-900 px-6 py-3 rounded-full font-medium hover:bg-neutral-100 transition-colors"
                >
                  View on Amazon
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Three steps to your book
            </h2>
            <p className="text-lg text-neutral-600">
              From idea to published manuscript in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                title: 'Describe',
                description: 'Tell us your book idea in a few sentences. Genre, characters, plot - whatever you have.',
              },
              {
                icon: BookOpen,
                title: 'Review',
                description: 'Get a detailed chapter-by-chapter outline. Approve it or request changes.',
              },
              {
                icon: Download,
                title: 'Download',
                description: 'Receive your complete EPUB manuscript, formatted and ready for publishing.',
              },
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className="bg-neutral-50 rounded-2xl p-8 h-full card-hover border border-transparent hover:border-neutral-200">
                  <div className="w-12 h-12 bg-neutral-900 text-white rounded-xl flex items-center justify-center mb-6">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                    {step.title}
                  </h3>
                  <p className="text-neutral-600">
                    {step.description}
                  </p>
                </div>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-neutral-300 h-6 w-6" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Publication-ready formatting
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Every book meets Amazon KDP specifications. Proper chapter breaks, table of contents,
              metadata, and cover dimensions included.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { src: '/images/screenshots/epub-cover.png', label: 'Title Page & Author' },
              { src: '/images/screenshots/epub-toc.png', label: 'Auto-generated TOC' },
              { src: '/images/screenshots/epub-chapter-1.png', label: 'Formatted Chapters' },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => setLightboxImage(item)}
                className="group text-left cursor-pointer"
              >
                <div className="bg-white rounded-2xl border border-neutral-200 p-4 card-hover hover:border-neutral-300">
                  <div className="aspect-[3/4] relative overflow-hidden rounded-xl bg-neutral-100">
                    <Image
                      src={item.src}
                      alt={item.label}
                      fill
                      className="object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur px-4 py-2 rounded-full text-sm font-medium text-neutral-900">
                        Click to enlarge
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-neutral-600 mt-4">{item.label}</p>
              </button>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-neutral-500">
              All exports include EPUB 3.0 format, reflowable text, and embedded fonts for consistent display across all devices.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Simple pricing
            </h2>
            <p className="text-lg text-neutral-600">
              Choose the book type that fits your project
            </p>
          </div>

          {/* Book Types - 3 options */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {/* Novel */}
            <div className="bg-white rounded-2xl p-8 border border-neutral-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-neutral-700" />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Novel</h3>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-4xl font-bold">$19.99</span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">Text-only, EPUB download</p>
              <ul className="space-y-3 text-sm text-neutral-600 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  50,000+ words, 20+ chapters
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  AI-generated cover
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Amazon KDP ready
                </li>
              </ul>
              <button
                onClick={() => router.push('/create')}
                className="w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Create Novel
              </button>
            </div>

            {/* Comic Book */}
            <div className="bg-white rounded-2xl p-8 border border-neutral-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Comic Book</h3>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-4xl font-bold">$19.99</span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">With speech bubbles, PDF download</p>
              <ul className="space-y-3 text-sm text-neutral-600 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  20 full-page panels
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  4 art styles (noir, manga, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Print-ready PDF
                </li>
              </ul>
              <button
                onClick={() => router.push('/create')}
                className="w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Create Comic
              </button>
            </div>

            {/* Children's Picture Book */}
            <div className="bg-white rounded-2xl p-8 border border-neutral-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Picture Book</h3>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-4xl font-bold">$19.99</span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">For children, PDF download</p>
              <ul className="space-y-3 text-sm text-neutral-600 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  12 illustrated pages
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  3 art styles (watercolor, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Ages 3-8 friendly
                </li>
              </ul>
              <button
                onClick={() => router.push('/create')}
                className="w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Create Picture Book
              </button>
            </div>
          </div>

          {/* Subscription Plans */}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Subscription Plans
            </h3>
            <p className="text-neutral-600">For authors creating multiple books</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Monthly */}
            <div className="bg-neutral-900 text-white rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-neutral-900 px-3 py-1 rounded-full text-xs font-medium">
                Most Popular
              </div>
              <h4 className="text-lg font-semibold mb-2">Monthly</h4>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$69</span>
                <span className="text-neutral-400">/month</span>
              </div>
              <p className="text-sm text-neutral-300 mb-6">5 books per month (any type)</p>
              <ul className="space-y-3 text-sm text-neutral-200 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Priority generation
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  Cancel anytime
                </li>
              </ul>
              <button
                onClick={() => router.push('/signup?plan=monthly')}
                className="w-full bg-white text-neutral-900 py-3 rounded-xl text-sm font-medium hover:bg-neutral-100 transition-colors"
              >
                Subscribe
              </button>
            </div>

            {/* Yearly */}
            <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-200">
              <h4 className="text-lg font-semibold mb-2">Yearly</h4>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$499</span>
                <span className="text-neutral-500">/year</span>
              </div>
              <p className="text-sm text-neutral-600 mb-6">50 book credits ($10 each)</p>
              <ul className="space-y-3 text-sm text-neutral-600 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Credits never expire
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Priority support
                </li>
              </ul>
              <button
                onClick={() => router.push('/signup?plan=yearly')}
                className="w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
            Ready to write your book?
          </h2>
          <p className="text-lg text-neutral-600 mb-10">
            Join thousands of authors who have brought their stories to life.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-neutral-900 text-white px-8 py-4 rounded-full text-base font-medium hover:bg-neutral-800 transition-all hover:scale-105 inline-flex items-center gap-2"
          >
            Start writing
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      <Footer />

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 md:p-8"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-8 w-8" />
          </button>
          <div className="relative w-full max-w-3xl max-h-[90vh] aspect-[3/4]">
            <Image
              src={lightboxImage.src}
              alt={lightboxImage.label}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 80vw"
            />
          </div>
          <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {lightboxImage.label}
          </p>
        </div>
      )}

      {/* New Year Promo Popup */}
      <NewYearPopup />
    </div>
  );
}
