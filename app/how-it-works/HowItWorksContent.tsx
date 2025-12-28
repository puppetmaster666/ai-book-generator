'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Sparkles, FileText, Zap, Download, ArrowRight, Check, FileCheck } from 'lucide-react';

export default function HowItWorksContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm mb-6">
              <FileCheck className="h-4 w-4" />
              Amazon KDP Ready Output
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              How It Works
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              From your idea to a publication-ready manuscript in 30-60 minutes
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-12">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-neutral-900 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold mb-3" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                    1. Share Your Idea
                  </h2>
                  <p className="text-neutral-600 mb-4">
                    Start with a simple description of your book idea. The more detail you provide about your plot,
                    characters, and preferred writing style, the better your book will be.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm text-neutral-600">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Title and genre selection</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Character names and descriptions</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Beginning, middle, and ending</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Writing style preferences</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-neutral-900 rounded-xl flex items-center justify-center">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold mb-3" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                    2. AI Creates the Outline
                  </h2>
                  <p className="text-neutral-600 mb-4">
                    Our AI analyzes your input and creates a detailed chapter-by-chapter outline.
                    This ensures your book has coherent structure with proper pacing and plot development.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm text-neutral-600">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Chapter planning by genre</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Word count distribution</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Character arc tracking</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Plot point placement</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-neutral-900 rounded-xl flex items-center justify-center">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold mb-3" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                    3. Chapter-by-Chapter Generation
                  </h2>
                  <p className="text-neutral-600 mb-4">
                    The AI writes each chapter sequentially, maintaining consistency throughout.
                    Our memory system tracks what happened before, keeping characters and plot consistent.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm text-neutral-600">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> 2,000-5,000 words per chapter</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Story continuity tracking</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Character state management</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Consistent writing style</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-neutral-900 rounded-xl flex items-center justify-center">
                  <Download className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold mb-3" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                    4. Download and Publish
                  </h2>
                  <p className="text-neutral-600 mb-4">
                    Download your book as a professionally formatted EPUB file with an AI-generated cover.
                    Files meet Amazon KDP specifications and are ready for immediate upload.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm text-neutral-600">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> EPUB 3.0 format</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Cover at 1600x2560px (KDP spec)</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Auto-generated table of contents</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Full commercial rights</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* KDP Info */}
          <div className="mt-12 bg-neutral-900 text-white rounded-2xl p-8">
            <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Ready for Amazon KDP
            </h3>
            <p className="text-neutral-300 mb-4">
              Every book we generate is formatted to meet Amazon Kindle Direct Publishing requirements:
            </p>
            <ul className="grid sm:grid-cols-2 gap-3 text-sm text-neutral-300">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Proper EPUB metadata (title, author, language)</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Cover dimensions meet KDP specs</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Reflowable text for all devices</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Embedded fonts for consistency</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Clean chapter breaks</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Navigable table of contents</li>
            </ul>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Ready to Write Your Book?
            </h2>
            <button
              onClick={() => router.push('/')}
              className="bg-neutral-900 text-white px-8 py-4 rounded-full text-base font-medium hover:bg-neutral-800 transition-all hover:scale-105 inline-flex items-center gap-2"
            >
              Start Creating <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
