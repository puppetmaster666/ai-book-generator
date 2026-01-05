'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VideoEmbed from '@/components/VideoEmbed';
import { Sparkles, FileText, Zap, Download, ArrowRight, Check, FileCheck, BookOpen, Palette, Layers, Shield, RefreshCw, Pencil } from 'lucide-react';

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
              From your idea to a publication-ready book in minutes
            </p>
          </div>

          {/* Full Walkthrough Video */}
          <div className="mb-16">
            <VideoEmbed
              videoId="XalUtL0ofEg"
              title="Full Walkthrough: Creating a Book from Start to Finish"
              className="max-w-3xl mx-auto"
            />
            <p className="text-center text-sm text-neutral-500 mt-4">
              Watch the full walkthrough to see the entire process in action
            </p>
          </div>

          {/* Book Types */}
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-6 text-center" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Three Ways to Create
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
                <div className="w-12 h-12 bg-neutral-900 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Novel</h3>
                <p className="text-sm text-neutral-600 mb-3">
                  Full-length novels with 50,000+ words, natural prose, and story consistency.
                </p>
                <ul className="text-xs text-neutral-500 space-y-1">
                  <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> Human-quality writing</li>
                  <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> EPUB download</li>
                  <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> AI-generated cover</li>
                </ul>
              </div>
              <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
                <div className="w-12 h-12 bg-neutral-900 rounded-lg flex items-center justify-center mb-4">
                  <Palette className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Children&apos;s Picture Book</h3>
                <p className="text-sm text-neutral-600 mb-3">
                  Illustrated stories with 20 full-page images in various art styles.
                </p>
                <ul className="text-xs text-neutral-500 space-y-1">
                  <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> Watercolor, Cartoon, Storybook styles</li>
                  <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> PDF download</li>
                  <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> AI-generated illustrations</li>
                </ul>
              </div>
              <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
                <div className="w-12 h-12 bg-neutral-900 rounded-lg flex items-center justify-center mb-4">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Comic Book</h3>
                <p className="text-sm text-neutral-600 mb-3">
                  Visual stories with dialogue subtext and page-turn hooks across 24 illustrated pages.
                </p>
                <ul className="text-xs text-neutral-500 space-y-1">
                  <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> Noir, Manga, Superhero, Retro styles</li>
                  <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> Natural dialogue with subtext</li>
                  <li className="flex items-center gap-1"><Check className="h-3 w-3 text-green-600" /> Speech bubbles on images</li>
                </ul>
              </div>
            </div>
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
                    Start with a simple description of your book idea. Choose your book type&mdash;novel, children&apos;s picture book, or comic&mdash;and we&apos;ll tailor the experience accordingly.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm text-neutral-600">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Choose book type and genre</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Select art style (for visual books)</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Describe characters and plot</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Set writing style preferences</li>
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
                    Our AI analyzes your input and creates a detailed outline tailored to your book type.
                    Novels get chapter-by-chapter breakdowns with character arcs; comics get page-by-page scene
                    descriptions with causal chain logic and dialogue subtext.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm text-neutral-600">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Structured by book type</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Cause-and-effect story logic</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Character arc planning</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Page-turn hooks and transitions</li>
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
                    3. Content Generation
                  </h2>
                  <p className="text-neutral-600 mb-4">
                    The AI creates your book chapter by chapter or page by page, with built-in quality systems that ensure
                    natural-sounding prose and story consistency. Each chapter goes through multiple refinement passes.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm text-neutral-600">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Novels: 2,000-5,000 words/chapter</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Comics: Speech bubbles on art</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Picture books: Text under images</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Professional editing pass</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quality Systems */}
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl border border-neutral-200 p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                  Human-Quality Writing Systems
                </h2>
                <p className="text-neutral-600">
                  Our AI uses advanced techniques to produce natural, engaging prose
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-5 border border-neutral-200">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                    <Shield className="h-5 w-5 text-green-700" />
                  </div>
                  <h3 className="font-semibold mb-2">Anti-AI Detection</h3>
                  <p className="text-sm text-neutral-600">
                    50+ banned AI phrases automatically detected and rewritten. No &quot;little did she know&quot; or
                    &quot;in that moment&quot;&mdash;just natural storytelling.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-neutral-200">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                    <RefreshCw className="h-5 w-5 text-blue-700" />
                  </div>
                  <h3 className="font-semibold mb-2">Story Memory</h3>
                  <p className="text-sm text-neutral-600">
                    Chapter 1 anchor system ensures the AI never forgets your opening conflicts.
                    Consistency checks every 5 chapters prevent plot drift.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-5 border border-neutral-200">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                    <Pencil className="h-5 w-5 text-purple-700" />
                  </div>
                  <h3 className="font-semibold mb-2">Professional Polish</h3>
                  <p className="text-sm text-neutral-600">
                    Every chapter goes through an editing pass that fixes dialogue formatting,
                    sentence variety, and repetitive patterns.
                  </p>
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
                    Download your completed book with an AI-generated cover. Novels come as EPUB files;
                    comic books and picture books come as PDF files. All formats are ready for Amazon KDP.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm text-neutral-600">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Novels: EPUB 3.0 format</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Visual books: High-res PDF</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> Cover at 1600x2560px (KDP spec)</li>
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
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Proper metadata (title, author, language)</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Cover dimensions meet KDP specs</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> EPUB: Reflowable text, embedded fonts</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> PDF: Print-ready resolution</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Clean chapter/page breaks</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" /> Navigable table of contents</li>
            </ul>
          </div>

          {/* Art Styles */}
          <div className="mt-12 bg-neutral-50 rounded-2xl p-8 border border-neutral-200">
            <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Art Styles for Visual Books
            </h3>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2 text-neutral-900">Children&apos;s Picture Books</h4>
                <ul className="text-sm text-neutral-600 space-y-1">
                  <li className="flex items-center gap-2"><Palette className="h-4 w-4 text-neutral-400" /> Watercolor &ndash; Soft, dreamy paintings</li>
                  <li className="flex items-center gap-2"><Palette className="h-4 w-4 text-neutral-400" /> Cartoon &ndash; Fun, animated style</li>
                  <li className="flex items-center gap-2"><Palette className="h-4 w-4 text-neutral-400" /> Classic Storybook &ndash; Traditional illustrations</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-neutral-900">Comic Books</h4>
                <ul className="text-sm text-neutral-600 space-y-1">
                  <li className="flex items-center gap-2"><Layers className="h-4 w-4 text-neutral-400" /> Noir &ndash; High contrast black and white</li>
                  <li className="flex items-center gap-2"><Layers className="h-4 w-4 text-neutral-400" /> Manga &ndash; Japanese comic style</li>
                  <li className="flex items-center gap-2"><Layers className="h-4 w-4 text-neutral-400" /> Superhero &ndash; Classic American comics</li>
                  <li className="flex items-center gap-2"><Layers className="h-4 w-4 text-neutral-400" /> Retro &ndash; Vintage 1950s style</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Ready to Create Your Book?
            </h2>
            <p className="text-neutral-600 mb-6">
              Novel, picture book, or comic&mdash;your story is just a few clicks away.
            </p>
            <button
              onClick={() => router.push('/create')}
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
