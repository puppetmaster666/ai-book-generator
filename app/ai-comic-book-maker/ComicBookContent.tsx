'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, Sparkles, BookOpen, Palette, Download, Check, Zap, Layers } from 'lucide-react';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Story Generation',
    description: 'Describe your comic idea and AI creates compelling storylines with dialogue and narration.',
  },
  {
    icon: Palette,
    title: 'Multiple Art Styles',
    description: 'Choose from manga, superhero, indie, noir, and more visual styles for your comic.',
  },
  {
    icon: Layers,
    title: 'Panel Layouts',
    description: 'Professional comic panel layouts with dynamic compositions and speech bubbles.',
  },
  {
    icon: Download,
    title: 'Print-Ready Export',
    description: 'Download high-resolution PDFs ready for printing or digital distribution.',
  },
];

const STYLES = [
  { name: 'Manga', description: 'Japanese comic style with expressive characters' },
  { name: 'Superhero', description: 'Bold, dynamic action-packed visuals' },
  { name: 'Indie/Alternative', description: 'Unique artistic expressions' },
  { name: 'Noir', description: 'Dark, moody atmospheric storytelling' },
];

export default function ComicBookContent() {
  const router = useRouter();
  const [idea, setIdea] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) {
      sessionStorage.setItem('bookIdea', idea);
      sessionStorage.setItem('preferredFormat', 'comic');
      router.push('/create');
    }
  };

  return (
    <>
      <Head>
        <title>AI Comic Book Maker - Create Comics with AI Art Generator</title>
        <meta name="description" content="Create stunning comic books with AI. Generate professional comics with AI-powered story writing and illustration. Multiple art styles including manga, superhero, and indie." />
        <meta name="keywords" content="AI comic book maker, comic generator, AI comic creator, manga generator, superhero comic maker, comic book generator, AI art comic" />
        <link rel="canonical" href="https://draftmybook.com/ai-comic-book-maker" />
      </Head>
      <div className="min-h-screen bg-white">
        <Header />

        {/* Hero Section */}
        <section className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              AI-Powered Comic Creation
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              AI Comic Book Maker
            </h1>

            <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
              Create professional comic books with AI. Generate stunning artwork, dynamic panels, and engaging stories in any style from manga to superhero.
            </p>

            {/* CTA Form */}
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="A superhero who can control time..."
                  className="flex-1 px-6 py-4 text-lg border border-neutral-200 rounded-full focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                />
                <button
                  type="submit"
                  className="px-8 py-4 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  Create Comic <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </form>

            <p className="text-sm text-neutral-500">
              Free preview available - no credit card required
            </p>
          </div>
        </section>

        {/* Sample Image */}
        <section className="pb-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border border-neutral-200">
              <Image
                src="/images/comic-sample.png"
                alt="AI-generated comic book illustration example"
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
              How It Works
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {FEATURES.map((feature, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-neutral-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Art Styles */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Choose Your Art Style
            </h2>
            <p className="text-center text-neutral-600 mb-12">
              Create comics in any visual style you can imagine
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {STYLES.map((style, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIdea(`A ${style.name.toLowerCase()} style comic about`);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left p-6 border border-neutral-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-colors"
                >
                  <h3 className="font-semibold mb-1">{style.name}</h3>
                  <p className="text-sm text-neutral-500">{style.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 px-6 bg-purple-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Why Choose Our AI Comic Maker
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                'No drawing skills required',
                'Professional panel layouts',
                'Consistent character designs',
                'Multiple art styles available',
                'Speech bubbles and effects',
                'Print-ready high resolution',
                'Commercial rights included',
                'Fast generation in minutes',
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-neutral-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Start Creating Your Comic Today
            </h2>
            <p className="text-lg text-neutral-600 mb-8">
              Join thousands of creators making comics with AI.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors text-lg"
            >
              Start Creating <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
