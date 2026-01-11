'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, Sparkles, BookOpen, Palette, Download, Check, Star } from 'lucide-react';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-Generated Stories',
    description: 'Enter any idea and watch AI create an engaging, age-appropriate story with memorable characters.',
  },
  {
    icon: Palette,
    title: 'Beautiful Illustrations',
    description: 'Every page features unique AI-generated illustrations that bring your story to life.',
  },
  {
    icon: BookOpen,
    title: '20 Illustrated Pages',
    description: 'Complete picture books with full-page illustrations, just like professional publications.',
  },
  {
    icon: Download,
    title: 'Print-Ready PDF',
    description: 'Download high-quality PDFs perfect for home printing or professional self-publishing.',
  },
];

const EXAMPLES = [
  { title: 'Bedtime Adventures', age: '3-6 years', theme: 'Dreams & imagination' },
  { title: 'Learning Numbers', age: '2-4 years', theme: 'Educational' },
  { title: 'Friendship Stories', age: '4-8 years', theme: 'Social skills' },
  { title: 'Animal Tales', age: '3-7 years', theme: 'Nature & animals' },
];

export default function ChildrensBookContent() {
  const router = useRouter();
  const [idea, setIdea] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) {
      sessionStorage.setItem('bookIdea', idea);
      sessionStorage.setItem('preferredFormat', 'picture_book');
      router.push('/create');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 rounded-full text-sm font-medium mb-6">
            <Star className="h-4 w-4" />
            Loved by parents & educators
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
            AI Children&apos;s Book Generator
          </h1>

          <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
            Create beautiful, illustrated children&apos;s books in minutes.
            Just describe your story idea and AI generates the text, characters, and full-page illustrations.
          </p>

          {/* CTA Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="A brave little rabbit who learns to share..."
                className="flex-1 px-6 py-4 text-lg border border-neutral-200 rounded-full focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-colors flex items-center justify-center gap-2"
              >
                Create Book <ArrowRight className="h-5 w-5" />
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
              src="/images/hg2.png"
              alt="AI-generated children's book illustration example"
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
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-pink-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-neutral-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Ideas */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
            Story Ideas to Get You Started
          </h2>
          <p className="text-center text-neutral-600 mb-12">
            Create personalized books for any occasion or learning goal
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {EXAMPLES.map((example, i) => (
              <button
                key={i}
                onClick={() => {
                  setIdea(`A children's story about ${example.title.toLowerCase()}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-left p-6 border border-neutral-200 rounded-xl hover:border-pink-300 hover:bg-pink-50 transition-colors"
              >
                <h3 className="font-semibold mb-1">{example.title}</h3>
                <p className="text-sm text-neutral-500">Ages {example.age} - {example.theme}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-6 bg-pink-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
            Why Parents Love Our AI Book Maker
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              'Personalize stories with your child\'s name',
              'Age-appropriate content guaranteed',
              'Beautiful illustrations on every page',
              'Download and print at home',
              'Perfect for gifts and special occasions',
              'Educational themes available',
              'Multiple art styles to choose from',
              'Commercial rights included',
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
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
            Create Your Child&apos;s Book Today
          </h2>
          <p className="text-lg text-neutral-600 mb-8">
            Join thousands of parents who have created magical stories for their children.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-4 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-colors text-lg"
          >
            Start Creating <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
