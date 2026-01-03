'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { ArrowRight, Loader2, Sparkles, X, Check, ChevronRight, Zap, BookOpen, Download, ExternalLink, ChevronDown, Play } from 'lucide-react';
import Footer from '@/components/Footer';
import NewYearPopup from '@/components/NewYearPopup';
import TrafficWarning from '@/components/TrafficWarning';
import Header from '@/components/Header';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';

// Idea categories for the Surprise Me feature
type IdeaCategory = 'random' | 'novel' | 'childrens' | 'comic' | 'nonfiction' | 'adult_comic';

const IDEA_CATEGORIES: { value: IdeaCategory; label: string; emoji: string }[] = [
  { value: 'random', label: 'Any Type', emoji: '🎲' },
  { value: 'novel', label: 'Novel', emoji: '📚' },
  { value: 'childrens', label: "Children's", emoji: '🧸' },
  { value: 'comic', label: 'Comic', emoji: '💥' },
  { value: 'nonfiction', label: 'Non-Fiction', emoji: '📖' },
  { value: 'adult_comic', label: 'Adult Comic (18+)', emoji: '🔥' },
];

// Locked accent color: Lime
const ACCENT = {
  bg: 'bg-lime-400',
  text: 'text-lime-400',
};

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [bookIdea, setBookIdea] = useState('');
  const [isLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; label: string } | null>(null);
  const [ideaCategory, setIdeaCategory] = useState<IdeaCategory>('random');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedComicCard, setSelectedComicCard] = useState<number | null>(null);
  const [showStickyBanner, setShowStickyBanner] = useState(false);
  const [stickyBannerDismissed, setStickyBannerDismissed] = useState(false);

  // Restore idea from sessionStorage on mount (for back navigation)
  useEffect(() => {
    const savedIdea = sessionStorage.getItem('bookIdea');
    if (savedIdea && !bookIdea) {
      setBookIdea(savedIdea);
    }
  }, []);

  // Show sticky banner after scrolling past hero section
  useEffect(() => {
    const handleScroll = () => {
      if (stickyBannerDismissed) return;
      const scrollY = window.scrollY;
      setShowStickyBanner(scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [stickyBannerDismissed]);

  const handleFindIdea = async () => {
    setIsGeneratingIdea(true);
    setError('');

    try {
      const response = await fetch('/api/generate-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: ideaCategory }),
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
    <div className="min-h-screen bg-white">
      <Header variant="transparent" />

      {/* Sticky CTA Banner - appears after scrolling */}
      {showStickyBanner && !stickyBannerDismissed && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800 animate-in slide-in-from-top duration-300">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-white text-sm hidden sm:block">
              <span className="font-medium">Ready to create your book?</span>
              <span className="text-neutral-400 ml-2">First book free, no credit card required</span>
            </p>
            <p className="text-white text-sm sm:hidden">
              First book free!
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => document.getElementById('hero-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-lime-400 text-neutral-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-lime-300 transition-colors flex items-center gap-2"
              >
                Create Your Free Book
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setStickyBannerDismissed(true)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col pt-0">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hg2.png"
            alt=""
            fill
            className="object-cover"
            priority
          />
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full text-sm text-white mb-8 border border-white/20 shadow-lg">
              <Zap className={`h-4 w-4 ${ACCENT.text} animate-pulse`} />
              <span className="font-medium">First book free - 50,000+ words in under an hour</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1] text-white" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Turn your idea into
              <br />
              <span className="relative inline-block">
                {/* Shadow rectangle */}
                <span className="absolute -inset-x-1 -inset-y-1 bg-black -skew-y-2 translate-x-1 translate-y-1" aria-hidden="true" />
                {/* Colored rectangle */}
                <span className={`absolute -inset-x-1 -inset-y-1 ${ACCENT.bg} -skew-y-2`} aria-hidden="true" />
                {/* Text */}
                <span className="relative text-neutral-900 px-2">a complete book</span>
              </span>
            </h1>

            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-12">
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
                  <div className="flex items-center gap-2">
                    {/* Category Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        disabled={isLoading || isGeneratingIdea}
                        className="text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50 flex items-center gap-1 px-2 py-2 rounded-lg hover:bg-neutral-100 transition-colors border border-neutral-200"
                      >
                        <span>{IDEA_CATEGORIES.find(c => c.value === ideaCategory)?.emoji}</span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showCategoryDropdown && (
                        <div className="absolute left-0 bottom-full mb-1 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50 min-w-[140px]">
                          {IDEA_CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => {
                                setIdeaCategory(cat.value);
                                setShowCategoryDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 flex items-center gap-2 ${
                                ideaCategory === cat.value ? 'bg-neutral-50 font-medium' : ''
                              }`}
                            >
                              <span>{cat.emoji}</span>
                              <span>{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Surprise Me Button */}
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
                        Create Your Free Book
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
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-white">
              <span className="flex items-center gap-2 font-medium">
                <Check className="h-4 w-4 text-lime-400" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Full commercial rights
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Ready for Amazon KDP
              </span>
              <span className="hidden sm:flex items-center gap-2">
                <Check className="h-4 w-4" />
                EPUB download
              </span>
            </div>

            {/* Watch Demo Button - scrolls to video section */}
            <button
              onClick={() => document.getElementById('video-tutorial')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-12 inline-flex items-center gap-3 text-white/80 hover:text-white transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Play className="h-5 w-5 ml-0.5 text-white" fill="currentColor" />
              </div>
              <span className="text-sm font-medium">Watch how it works</span>
            </button>
          </div>
        </div>
      </section>

      {/* Success Story - Blood & Silver */}
      <section className="py-20 px-6 bg-white">
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
                <div className="relative w-72 md:w-80 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl bg-neutral-100">
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
              <div className="inline-flex items-center gap-2 bg-neutral-100 px-4 py-2 rounded-full text-sm text-neutral-600 mb-6">
                <span className="w-2 h-2 bg-lime-400 rounded-full" />
                Published on Amazon KDP
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-neutral-900" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                Blood &{' '}
                <span className="relative inline-block">
                  <span className="absolute -inset-x-1 -inset-y-1 bg-black -skew-y-2 translate-x-1 translate-y-1" aria-hidden="true" />
                  <span className={`absolute -inset-x-1 -inset-y-1 ${ACCENT.bg} -skew-y-2`} aria-hidden="true" />
                  <span className="relative text-neutral-900 px-2">Silver</span>
                </span>
              </h2>
              <p className="text-xl text-neutral-600 mb-4">
                by Freddie Fabrevoie
              </p>
              <p className="text-neutral-500 mb-8 leading-relaxed">
                A complete 10-chapter historical fiction exploring history&apos;s most ruthless untold betrayals.
                Created with draftmybook, formatted to Amazon KDP specifications, and published in under an hour.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="https://a.co/d/f9GkEr9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-full font-medium hover:bg-neutral-800 transition-colors"
                >
                  View on Amazon
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comic Book Showcase - The Weaver's Mark */}
      <section className="py-20 px-6 bg-neutral-50 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Content - Left side on desktop */}
            <div className="order-2 md:order-1">
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full text-sm text-neutral-600 mb-6 border border-neutral-200">
                <span className="w-2 h-2 bg-lime-400 rounded-full" />
                Comic Book - 3 minutes to create
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-neutral-900" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                The Weaver&apos;s{' '}
                <span className="relative inline-block">
                  <span className="absolute -inset-x-1 -inset-y-1 bg-black -skew-y-2 translate-x-1 translate-y-1" aria-hidden="true" />
                  <span className={`absolute -inset-x-1 -inset-y-1 ${ACCENT.bg} -skew-y-2`} aria-hidden="true" />
                  <span className="relative text-neutral-900 px-2">Mark</span>
                </span>
              </h2>
              <p className="text-xl text-neutral-600 mb-4">
                by Jack Ripper
              </p>
              <p className="text-neutral-500 mb-8 leading-relaxed">
                A stunning illustrated comic book with AI-generated artwork and professional panel layouts.
                Each page features consistent character designs and dynamic compositions - all created in just 3 minutes.
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-lime-500" />
                  AI illustrations
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-lime-500" />
                  Panel layouts
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-lime-500" />
                  Speech bubbles
                </span>
              </div>
            </div>

            {/* Overlapping Cards - Right side */}
            <div className="order-1 md:order-2 flex justify-center">
              <div className="relative w-80 h-96">
                {/* Card Stack - Poker hand style */}
                {[
                  { src: '/images/illustration-cmjpl7ohv0003l804g1nj9jp8.jpeg', rotate: -12, left: 0 },
                  { src: '/images/illustration-cmjpl7q3x0003l8042kvaamsm.jpeg', rotate: -6, left: 30 },
                  { src: '/images/The_Weaver_s_Mark_cover.png', rotate: 0, left: 60 },
                  { src: '/images/illustration-cmjpl7qcr0003la045b05wbvs.jpeg', rotate: 6, left: 90 },
                  { src: '/images/illustration-cmjpl7r9e0003l404sadbtfwh.jpeg', rotate: 12, left: 120 },
                ].map((card, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedComicCard(selectedComicCard === i ? null : i)}
                    className={`absolute top-0 w-48 aspect-[2/3] rounded-lg overflow-hidden shadow-xl border-2 border-white bg-white transition-all duration-300 cursor-pointer ${
                      selectedComicCard === i ? 'scale-110 shadow-2xl' : 'hover:scale-105'
                    }`}
                    style={{
                      transform: `rotate(${selectedComicCard === i ? 0 : card.rotate}deg)`,
                      left: `${card.left}px`,
                      zIndex: selectedComicCard === i ? 10 : i + 1,
                    }}
                  >
                    <Image
                      src={card.src}
                      alt={`The Weaver's Mark - Page ${i + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
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
              Three steps to{' '}
              <span className="relative inline-block">
                <span className="absolute -inset-x-1 -inset-y-1 bg-black -skew-y-2 translate-x-1 translate-y-1" aria-hidden="true" />
                <span className={`absolute -inset-x-1 -inset-y-1 ${ACCENT.bg} -skew-y-2`} aria-hidden="true" />
                <span className="relative text-neutral-900 px-2">your book</span>
              </span>
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

      {/* Video Tutorial Section */}
      <section id="video-tutorial" className="py-24 px-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              See it in{' '}
              <span className="relative inline-block">
                <span className="absolute -inset-x-1 -inset-y-1 bg-black -skew-y-2 translate-x-1 translate-y-1" aria-hidden="true" />
                <span className={`absolute -inset-x-1 -inset-y-1 ${ACCENT.bg} -skew-y-2`} aria-hidden="true" />
                <span className="relative text-neutral-900 px-2">action</span>
              </span>
            </h2>
            <p className="text-lg text-neutral-600">
              Watch how to create a complete book in minutes
            </p>
          </div>

          {/* YouTube Embed */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-neutral-900">
            <iframe
              src="https://www.youtube.com/embed/XalUtL0ofEg?rel=0"
              title="How to Create an AI Book - Tutorial"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              loading="eager"
            />
          </div>

          <p className="text-center text-sm text-neutral-500 mt-6">
            Full walkthrough: from idea to published EPUB in under 10 minutes
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* Showcase */}
      <section className="py-24 px-6 bg-neutral-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Publication-
              <span className="relative inline-block">
                <span className="absolute -inset-x-1 -inset-y-1 bg-white/20 -skew-y-2 translate-x-1 translate-y-1" aria-hidden="true" />
                <span className={`absolute -inset-x-1 -inset-y-1 ${ACCENT.bg} -skew-y-2`} aria-hidden="true" />
                <span className="relative text-neutral-900 px-2">ready</span>
              </span>
              {' '}formatting
            </h2>
            <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
              Every book meets Amazon KDP specifications. Proper chapter breaks, table of contents,
              metadata, and cover dimensions included.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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
                <div className="aspect-[3/4] relative overflow-hidden rounded-xl shadow-2xl">
                  <Image
                    src={item.src}
                    alt={item.label}
                    fill
                    className="object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur px-4 py-2 rounded-full text-sm font-medium text-neutral-900">
                      Click to enlarge
                    </span>
                  </div>
                </div>
                <p className="text-center text-sm text-neutral-400 mt-4">{item.label}</p>
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
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Simple{' '}
              <span className="relative inline-block">
                <span className="absolute -inset-x-1 -inset-y-1 bg-black -skew-y-2 translate-x-1 translate-y-1" aria-hidden="true" />
                <span className={`absolute -inset-x-1 -inset-y-1 ${ACCENT.bg} -skew-y-2`} aria-hidden="true" />
                <span className="relative text-neutral-900 px-2">pricing</span>
              </span>
            </h2>
            <p className="text-lg text-neutral-600">
              Start free, then pay as you go
            </p>
          </div>

          {/* All pricing options */}
          <div className="grid md:grid-cols-4 gap-5">
            {/* Free Tier */}
            <button
              onClick={() => router.push(session ? '/create' : '/signup')}
              className="group bg-white rounded-2xl p-6 border-2 border-lime-400 hover:border-lime-500 card-hover text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-lime-400 rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-neutral-900" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Free</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold">$0</span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">Try it out - no credit card</p>
              <ul className="space-y-2 text-sm text-neutral-600 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-lime-600 flex-shrink-0" />
                  1 complete book
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-lime-600 flex-shrink-0" />
                  Any book type
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-lime-600 flex-shrink-0" />
                  Full EPUB download
                </li>
              </ul>
              <div className="w-full bg-lime-400 text-neutral-900 py-3 rounded-xl text-sm font-medium text-center group-hover:bg-lime-500 transition-colors">
                Start Free
              </div>
            </button>

            {/* Single Book */}
            <button
              onClick={() => router.push('/create')}
              className="group bg-white rounded-2xl p-6 border-2 border-neutral-200 hover:border-neutral-900 card-hover text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center group-hover:bg-neutral-900 transition-colors">
                  <BookOpen className="h-5 w-5 text-neutral-700 group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Single Book</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold">$9.99</span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">Novel, Comic, or Picture Book</p>
              <ul className="space-y-2 text-sm text-neutral-600 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  Any book type
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  AI cover + formatting
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  EPUB or PDF
                </li>
              </ul>
              <div className="w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-medium text-center group-hover:bg-neutral-800 transition-colors">
                Create Book
              </div>
            </button>

            {/* Author Plan */}
            <button
              onClick={() => router.push(session ? '/checkout?plan=monthly' : '/signup?plan=monthly')}
              className="group bg-neutral-900 text-white rounded-2xl p-6 border-2 border-neutral-900 card-hover text-left cursor-pointer relative"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-lime-400 text-neutral-900 px-3 py-1 rounded-full text-xs font-medium">
                Best Value
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Author Plan</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold">$39</span>
                <span className="text-neutral-400 text-sm">/mo</span>
              </div>
              <p className="text-sm text-neutral-300 mb-4">5 books per month</p>
              <ul className="space-y-2 text-sm text-neutral-200 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  $7.80 per book
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  Unused books roll over
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  Cancel anytime
                </li>
              </ul>
              <div className="w-full bg-white text-neutral-900 py-3 rounded-xl text-sm font-medium text-center group-hover:bg-neutral-100 transition-colors">
                Subscribe
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* CTA */}
      <section className="py-24 px-6 bg-neutral-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-white" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
            Ready to write{' '}
            <span className="relative inline-block">
              <span className="absolute -inset-x-1 -inset-y-1 bg-white/20 -skew-y-2 translate-x-1 translate-y-1" aria-hidden="true" />
              <span className={`absolute -inset-x-1 -inset-y-1 ${ACCENT.bg} -skew-y-2`} aria-hidden="true" />
              <span className="relative text-neutral-900 px-2">your book</span>
            </span>
            <span className="text-white">?</span>
          </h2>
          <p className="text-lg text-neutral-400 mb-10">
            {session ? 'Your next masterpiece is just a few clicks away.' : 'Start with a free book. No credit card required.'}
          </p>
          <button
            onClick={() => router.push(session ? '/create' : '/signup')}
            className="bg-lime-400 text-neutral-900 px-8 py-4 rounded-full text-base font-medium hover:bg-lime-300 transition-all hover:scale-105 inline-flex items-center gap-2"
          >
            {session ? 'Create a book' : 'Get your free book'}
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

      {/* Traffic Warning Banner */}
      <TrafficWarning />
    </div>
  );
}
