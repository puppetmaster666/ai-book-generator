'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Loader2, Sparkles, X, Check, ChevronRight, Zap, BookOpen, Download, ExternalLink, FileCheck } from 'lucide-react';
import Footer from '@/components/Footer';
import NewYearPopup from '@/components/NewYearPopup';
import Header from '@/components/Header';

export default function Home() {
  const router = useRouter();
  const [bookIdea, setBookIdea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'single' | 'monthly' | 'yearly'>('monthly');
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
              Describe your story, get a professionally formatted manuscript ready for Amazon KDP. No writing experience needed.
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
                className="group relative block"
              >
                <div className="relative w-72 md:w-80 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl transform group-hover:scale-105 transition-transform duration-300">
                  <Image
                    src="/images/cover.jpg"
                    alt="Blood & Silver by Freddie Fabrevoie"
                    fill
                    className="object-contain"
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
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm mb-6">
              <FileCheck className="h-4 w-4" />
              Amazon KDP Ready
            </div>
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
              { src: '/images/screenshots/epub-cover.png', label: 'Cover (1600x2560px)' },
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Simple pricing
            </h2>
            <p className="text-lg text-neutral-600">
              Choose the plan that works for you
            </p>
          </div>

          {/* Illustrated Books - One-time only */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-2xl font-bold" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                Illustrated Books
              </h3>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                New
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-4">
              {/* Illustrated Chapter Book */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
                <h4 className="text-lg font-semibold mb-2">Illustrated Chapter Book</h4>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold">$29.99</span>
                  <span className="text-neutral-500">one-time</span>
                </div>
                <p className="text-sm text-neutral-600 mb-4">
                  5,000-15,000 words with 1 illustration per chapter
                </p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    AI-generated chapter illustrations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Custom cover design
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    8 art styles to choose from
                  </li>
                </ul>
              </div>

              {/* Picture Book */}
              <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-2xl p-6 border border-pink-100">
                <h4 className="text-lg font-semibold mb-2">Children&apos;s Picture Book</h4>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold">$39.99</span>
                  <span className="text-neutral-500">one-time</span>
                </div>
                <p className="text-sm text-neutral-600 mb-4">
                  500-1,500 words with full-page illustrations throughout
                </p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    2 illustrations per spread
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Child-friendly art styles
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Perfect for ages 3-8
                  </li>
                </ul>
              </div>
            </div>
            <p className="text-sm text-neutral-500 text-center">
              Illustrated books are one-time purchases only. AI illustration is cutting-edge technology and not yet available for subscriptions.
            </p>
          </div>

          {/* Text-Only Books */}
          <div>
            <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Text-Only Novels
            </h3>

            {/* Plan Toggle */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex bg-neutral-100 p-1 rounded-full">
                {(['single', 'monthly', 'yearly'] as const).map((plan) => (
                  <button
                    key={plan}
                    onClick={() => setSelectedPlan(plan)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedPlan === plan
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {plan === 'single' ? 'One Book' : plan === 'monthly' ? 'Monthly' : 'Yearly'}
                  </button>
                ))}
              </div>
            </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Single */}
            <div
              onClick={() => setSelectedPlan('single')}
              className={`relative rounded-2xl p-8 cursor-pointer transition-all card-hover ${
                selectedPlan === 'single'
                  ? 'bg-neutral-900 text-white ring-2 ring-neutral-900'
                  : 'bg-neutral-50 hover:bg-neutral-100'
              }`}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Single Book</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$19.99</span>
              </div>
              <p className={`text-sm mb-6 ${selectedPlan === 'single' ? 'text-neutral-300' : 'text-neutral-600'}`}>
                One-time payment
              </p>
              <ul className={`space-y-3 text-sm ${selectedPlan === 'single' ? 'text-neutral-200' : 'text-neutral-600'}`}>
                <li className="flex items-center gap-3">
                  <Check className={`h-4 w-4 ${selectedPlan === 'single' ? 'text-green-400' : 'text-green-600'}`} />
                  Complete 50k+ word book
                </li>
                <li className="flex items-center gap-3">
                  <Check className={`h-4 w-4 ${selectedPlan === 'single' ? 'text-green-400' : 'text-green-600'}`} />
                  EPUB + cover image
                </li>
                <li className="flex items-center gap-3">
                  <Check className={`h-4 w-4 ${selectedPlan === 'single' ? 'text-green-400' : 'text-green-600'}`} />
                  Full commercial rights
                </li>
              </ul>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-full mt-8 py-3 rounded-xl text-sm font-medium transition-all ${
                  selectedPlan === 'single'
                    ? 'bg-white text-neutral-900 hover:bg-neutral-100'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
              >
                Get started
              </button>
            </div>

            {/* Monthly */}
            <div
              onClick={() => setSelectedPlan('monthly')}
              className={`relative rounded-2xl p-8 cursor-pointer transition-all card-hover ${
                selectedPlan === 'monthly'
                  ? 'bg-neutral-900 text-white ring-2 ring-neutral-900'
                  : 'bg-neutral-50 hover:bg-neutral-100'
              }`}
            >
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium ${
                selectedPlan === 'monthly' ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white'
              }`}>
                Most Popular
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Monthly</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$69</span>
                <span className={selectedPlan === 'monthly' ? 'text-neutral-400' : 'text-neutral-500'}>/month</span>
              </div>
              <p className={`text-sm mb-6 ${selectedPlan === 'monthly' ? 'text-neutral-300' : 'text-neutral-600'}`}>
                5 books per month
              </p>
              <ul className={`space-y-3 text-sm ${selectedPlan === 'monthly' ? 'text-neutral-200' : 'text-neutral-600'}`}>
                <li className="flex items-center gap-3">
                  <Check className={`h-4 w-4 ${selectedPlan === 'monthly' ? 'text-green-400' : 'text-green-600'}`} />
                  Everything in Single
                </li>
                <li className="flex items-center gap-3">
                  <Check className={`h-4 w-4 ${selectedPlan === 'monthly' ? 'text-green-400' : 'text-green-600'}`} />
                  Priority generation
                </li>
                <li className="flex items-center gap-3">
                  <Check className={`h-4 w-4 ${selectedPlan === 'monthly' ? 'text-green-400' : 'text-green-600'}`} />
                  Cancel anytime
                </li>
              </ul>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-full mt-8 py-3 rounded-xl text-sm font-medium transition-all ${
                  selectedPlan === 'monthly'
                    ? 'bg-white text-neutral-900 hover:bg-neutral-100'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
              >
                Subscribe
              </button>
            </div>

            {/* Yearly */}
            <div
              onClick={() => setSelectedPlan('yearly')}
              className={`relative rounded-2xl p-8 cursor-pointer transition-all card-hover ${
                selectedPlan === 'yearly'
                  ? 'bg-neutral-900 text-white ring-2 ring-neutral-900'
                  : 'bg-neutral-50 hover:bg-neutral-100'
              }`}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Yearly</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$499</span>
                <span className={selectedPlan === 'yearly' ? 'text-neutral-400' : 'text-neutral-500'}>/year</span>
              </div>
              <p className={`text-sm mb-6 ${selectedPlan === 'yearly' ? 'text-neutral-300' : 'text-neutral-600'}`}>
                50 book credits
              </p>
              <ul className={`space-y-3 text-sm ${selectedPlan === 'yearly' ? 'text-neutral-200' : 'text-neutral-600'}`}>
                <li className="flex items-center gap-3">
                  <Check className={`h-4 w-4 ${selectedPlan === 'yearly' ? 'text-green-400' : 'text-green-600'}`} />
                  Best value ($10/book)
                </li>
                <li className="flex items-center gap-3">
                  <Check className={`h-4 w-4 ${selectedPlan === 'yearly' ? 'text-green-400' : 'text-green-600'}`} />
                  Credits never expire
                </li>
                <li className="flex items-center gap-3">
                  <Check className={`h-4 w-4 ${selectedPlan === 'yearly' ? 'text-green-400' : 'text-green-600'}`} />
                  Priority support
                </li>
              </ul>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-full mt-8 py-3 rounded-xl text-sm font-medium transition-all ${
                  selectedPlan === 'yearly'
                    ? 'bg-white text-neutral-900 hover:bg-neutral-100'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
              >
                Get started
              </button>
            </div>
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
