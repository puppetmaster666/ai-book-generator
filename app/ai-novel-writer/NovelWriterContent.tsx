'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, Sparkles, BookOpen, PenTool, Download, Check, FileText, Layers } from 'lucide-react';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Story Generation',
    description: 'Advanced AI writes compelling narratives with rich characters, plot twists, and engaging dialogue.',
  },
  {
    icon: Layers,
    title: 'Chapter by Chapter',
    description: 'Generate full-length novels chapter by chapter with consistent characters and plot continuity.',
  },
  {
    icon: PenTool,
    title: 'Multiple Genres',
    description: 'Romance, thriller, sci-fi, fantasy, mystery, and more. AI adapts to any genre.',
  },
  {
    icon: Download,
    title: 'EPUB & PDF Export',
    description: 'Download professionally formatted files ready for Kindle, print, or any e-reader.',
  },
];

const GENRES = [
  { name: 'Romance', description: 'Love stories and relationships' },
  { name: 'Thriller', description: 'Suspenseful page-turners' },
  { name: 'Fantasy', description: 'Magical worlds and adventures' },
  { name: 'Science Fiction', description: 'Futuristic and speculative' },
  { name: 'Mystery', description: 'Whodunits and detective stories' },
  { name: 'Literary Fiction', description: 'Character-driven narratives' },
];

export default function NovelWriterContent() {
  const router = useRouter();
  const [idea, setIdea] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) {
      sessionStorage.setItem('bookIdea', idea);
      sessionStorage.setItem('preferredFormat', 'novel');
      router.push('/create');
    }
  };

  return (
    <>
      <Head>
        <title>AI Novel Writer - Write Books with Artificial Intelligence</title>
        <meta name="description" content="Write complete novels with AI. Our AI novel writer generates full-length books with compelling characters, plot development, and professional formatting. All genres supported." />
        <meta name="keywords" content="AI novel writer, AI book writer, write novel with AI, AI story generator, AI fiction writer, book writing AI, novel generator" />
        <link rel="canonical" href="https://draftmybook.com/ai-novel-writer" />
      </Head>
      <div className="min-h-screen bg-white">
        <Header />

        {/* Hero Section */}
        <section className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-medium mb-6">
              <FileText className="h-4 w-4" />
              Full-Length Novel Generation
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              AI Novel Writer
            </h1>

            <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
              Write complete novels with AI. From a simple idea to a full manuscript with compelling characters, engaging plot, and professional formatting.
            </p>

            {/* CTA Form */}
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="A detective in 1920s Paris discovers..."
                  className="flex-1 px-6 py-4 text-lg border border-neutral-200 rounded-full focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
                <button
                  type="submit"
                  className="px-8 py-4 bg-amber-600 text-white rounded-full font-semibold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                >
                  Write Novel <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </form>

            <p className="text-sm text-neutral-500">
              Free preview available - no credit card required
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="pb-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-amber-600 mb-2">50k+</div>
                <div className="text-neutral-600">Words per novel</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-amber-600 mb-2">20+</div>
                <div className="text-neutral-600">Chapters generated</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-amber-600 mb-2">6+</div>
                <div className="text-neutral-600">Genres supported</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-6 bg-neutral-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              How AI Novel Writing Works
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {FEATURES.map((feature, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-neutral-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Genres */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Write in Any Genre
            </h2>
            <p className="text-center text-neutral-600 mb-12">
              Our AI adapts its writing style to match your chosen genre
            </p>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {GENRES.map((genre, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIdea(`A ${genre.name.toLowerCase()} novel about`);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left p-6 border border-neutral-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-colors"
                >
                  <h3 className="font-semibold mb-1">{genre.name}</h3>
                  <p className="text-sm text-neutral-500">{genre.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 px-6 bg-amber-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Why Writers Choose Our AI
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                'Full-length novels (50,000+ words)',
                'Consistent character development',
                'Compelling plot arcs',
                'Natural dialogue writing',
                'Chapter-by-chapter generation',
                'EPUB and PDF export',
                'Edit and refine your story',
                'Commercial rights included',
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-neutral-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Perfect For
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PenTool className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Aspiring Authors</h3>
                <p className="text-neutral-600 text-sm">Get past writer&apos;s block and complete your first novel</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Self-Publishers</h3>
                <p className="text-neutral-600 text-sm">Quickly generate content for Kindle and other platforms</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Creative Writers</h3>
                <p className="text-neutral-600 text-sm">Explore new genres and storytelling techniques</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-6 bg-neutral-900 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Start Writing Your Novel Today
            </h2>
            <p className="text-lg text-neutral-300 mb-8">
              Turn your story idea into a complete novel in minutes, not months.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 text-white rounded-full font-semibold hover:bg-amber-600 transition-colors text-lg"
            >
              Start Writing <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
