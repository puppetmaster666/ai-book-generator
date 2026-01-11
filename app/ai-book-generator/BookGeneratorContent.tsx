'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, Sparkles, BookOpen, PenTool, Download, Check, FileText, Palette, Layers, Zap } from 'lucide-react';

const BOOK_TYPES = [
  {
    icon: BookOpen,
    title: 'Novels & Fiction',
    description: 'Full-length novels with compelling plots, rich characters, and engaging narratives.',
    format: 'novel',
    color: 'amber',
  },
  {
    icon: Palette,
    title: "Children's Books",
    description: 'Illustrated picture books with age-appropriate stories and beautiful artwork.',
    format: 'picture_book',
    color: 'pink',
  },
  {
    icon: Layers,
    title: 'Comics & Manga',
    description: 'Visual storytelling with dynamic panels, speech bubbles, and stunning art.',
    format: 'comic',
    color: 'purple',
  },
  {
    icon: FileText,
    title: 'Non-Fiction',
    description: 'Informative books, guides, memoirs, and educational content.',
    format: 'non_fiction',
    color: 'blue',
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-Powered Writing',
    description: 'Advanced AI generates complete books from your ideas with professional quality.',
  },
  {
    icon: PenTool,
    title: 'Any Genre or Style',
    description: 'Romance, thriller, fantasy, sci-fi, educational - AI adapts to any genre.',
  },
  {
    icon: Palette,
    title: 'AI Illustrations',
    description: 'Generate stunning cover art and interior illustrations automatically.',
  },
  {
    icon: Download,
    title: 'Export Anywhere',
    description: 'Download as EPUB, PDF, or print-ready files for Amazon KDP and more.',
  },
];

const STATS = [
  { value: '50,000+', label: 'Books created' },
  { value: '100+', label: 'Genres supported' },
  { value: '< 1 hour', label: 'Average creation time' },
];

export default function BookGeneratorContent() {
  const router = useRouter();
  const [idea, setIdea] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) {
      sessionStorage.setItem('bookIdea', idea);
      router.push('/create');
    }
  };

  const selectBookType = (format: string) => {
    sessionStorage.setItem('preferredFormat', format);
    router.push('/create');
  };

  return (
    <>
      <Head>
        <title>AI Book Generator - Create Complete Books with AI in Minutes</title>
        <meta name="description" content="Generate complete books with AI. Create novels, children's books, comics, and non-fiction with AI-powered writing and illustrations. Free to try, no credit card required." />
        <meta name="keywords" content="AI book generator, AI book writer, book generator, AI writing, generate book with AI, AI author, book creation AI, write book with AI" />
        <link rel="canonical" href="https://draftmybook.com/ai-book-generator" />
      </Head>
      <div className="min-h-screen bg-white">
        <Header />

        {/* Hero Section */}
        <section className="pt-24 pb-16 px-6 bg-gradient-to-b from-neutral-50 to-white">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-full text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              #1 AI Book Generator
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              AI Book Generator
            </h1>

            <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
              Create complete books with AI. From novels to children&apos;s books to comics - just describe your idea and watch AI write and illustrate your book.
            </p>

            {/* CTA Form */}
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Describe your book idea..."
                  className="flex-1 px-6 py-4 text-lg border border-neutral-200 rounded-full focus:outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
                />
                <button
                  type="submit"
                  className="px-8 py-4 bg-neutral-900 text-white rounded-full font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                >
                  Generate Book <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </form>

            <p className="text-sm text-neutral-500">
              Free preview - no credit card required
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="py-8 px-6 border-y border-neutral-100">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-3 gap-8 text-center">
              {STATS.map((stat, i) => (
                <div key={i}>
                  <div className="text-2xl md:text-3xl font-bold text-neutral-900 mb-1">{stat.value}</div>
                  <div className="text-neutral-500 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Book Types */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              What Type of Book Do You Want to Create?
            </h2>
            <p className="text-center text-neutral-600 mb-12">
              Our AI book generator supports all formats and genres
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {BOOK_TYPES.map((type, i) => (
                <button
                  key={i}
                  onClick={() => selectBookType(type.format)}
                  className="text-left p-6 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all group"
                >
                  <div className={`w-12 h-12 bg-${type.color}-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <type.icon className={`h-6 w-6 text-${type.color}-600`} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{type.title}</h3>
                  <p className="text-neutral-600 text-sm">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Sample Image */}
        <section className="py-8 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border border-neutral-200">
              <Image
                src="/images/hg2.png"
                alt="AI-generated book example"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-6 bg-neutral-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              How the AI Book Generator Works
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {FEATURES.map((feature, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm">
                  <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-neutral-700" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-neutral-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process Steps */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Create Your Book in 3 Simple Steps
            </h2>

            <div className="space-y-8">
              {[
                { step: '1', title: 'Describe Your Idea', description: 'Tell us what your book is about. A sentence or a paragraph - AI works with any level of detail.' },
                { step: '2', title: 'AI Generates Your Book', description: 'Our AI writes your complete book chapter by chapter, maintaining consistency throughout.' },
                { step: '3', title: 'Download & Publish', description: 'Export as EPUB or PDF. Ready for Kindle, print-on-demand, or personal use.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="w-12 h-12 bg-neutral-900 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-2">{item.title}</h3>
                    <p className="text-neutral-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 px-6 bg-neutral-900 text-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Why Choose Our AI Book Generator
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                'Complete books in under an hour',
                'Professional quality writing',
                'AI-generated cover art included',
                'EPUB & PDF export formats',
                'Amazon KDP ready files',
                'Edit and refine your content',
                'Multiple genres and styles',
                'Commercial rights included',
                'No writing experience needed',
                'Consistent characters & plot',
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-neutral-900" />
                  </div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              What Will You Create?
            </h2>
            <p className="text-center text-neutral-600 mb-12">
              Our AI book generator is perfect for
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: 'Self-Publishers', description: 'Create books for Amazon Kindle, print-on-demand, and other platforms' },
                { title: 'Authors', description: 'Overcome writer\'s block and generate first drafts quickly' },
                { title: 'Parents', description: 'Make personalized children\'s books starring your kids' },
                { title: 'Educators', description: 'Create custom educational materials and stories' },
                { title: 'Entrepreneurs', description: 'Generate lead magnets, guides, and content books' },
                { title: 'Creators', description: 'Bring your comic and graphic novel ideas to life' },
              ].map((item, i) => (
                <div key={i} className="text-center p-6">
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-neutral-600 text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-6 bg-gradient-to-b from-white to-neutral-50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Start Generating Your Book Now
            </h2>
            <p className="text-lg text-neutral-600 mb-8">
              Join thousands of creators who have used AI to write and publish their books.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white rounded-full font-semibold hover:bg-neutral-800 transition-colors text-lg"
            >
              Create Your Book <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="text-sm text-neutral-500 mt-4">
              Free preview available - no credit card required
            </p>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
