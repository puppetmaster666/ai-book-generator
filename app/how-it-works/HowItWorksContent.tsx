'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Sparkles, FileText, Zap, Download, ArrowRight } from 'lucide-react';

export default function HowItWorksContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-[#0F1A2A] mb-4">How It Works</h1>
            <p className="text-xl text-[#4A5568] max-w-2xl mx-auto">
              From idea to published book in four simple steps
            </p>
          </div>

          {/* Steps */}
          <div className="max-w-4xl mx-auto space-y-16">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 w-20 h-20 bg-[#1E3A5F] rounded-2xl flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#0F1A2A] mb-3">1. Share Your Idea</h2>
                <p className="text-lg text-[#4A5568] mb-4">
                  Start with a simple description of your book idea. Then fill in details about your plot,
                  characters, and preferred writing style. The more detail you provide, the better your book will be.
                </p>
                <ul className="space-y-2 text-[#4A5568]">
                  <li>- Title and genre selection</li>
                  <li>- Character names and descriptions</li>
                  <li>- Beginning, middle, and ending plot points</li>
                  <li>- Writing style and chapter format preferences</li>
                </ul>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 w-20 h-20 bg-[#1E3A5F] rounded-2xl flex items-center justify-center">
                <FileText className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#0F1A2A] mb-3">2. AI Creates the Outline</h2>
                <p className="text-lg text-[#4A5568] mb-4">
                  Our AI analyzes your input and creates a detailed chapter-by-chapter outline.
                  This ensures your book has a coherent structure with proper pacing and plot development.
                </p>
                <ul className="space-y-2 text-[#4A5568]">
                  <li>- Automatic chapter planning based on genre conventions</li>
                  <li>- Word count distribution across chapters</li>
                  <li>- Character arc tracking</li>
                  <li>- Plot point placement for maximum impact</li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 w-20 h-20 bg-[#1E3A5F] rounded-2xl flex items-center justify-center">
                <Zap className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#0F1A2A] mb-3">3. Chapter-by-Chapter Generation</h2>
                <p className="text-lg text-[#4A5568] mb-4">
                  The AI writes each chapter sequentially, maintaining consistency throughout.
                  Our memory system tracks what happened before, keeping characters and plot consistent.
                </p>
                <ul className="space-y-2 text-[#4A5568]">
                  <li>- 2,000-5,000 words per chapter</li>
                  <li>- Running summary for story continuity</li>
                  <li>- Character state tracking (locations, knowledge, goals)</li>
                  <li>- Style consistency throughout the book</li>
                </ul>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 w-20 h-20 bg-[#1E3A5F] rounded-2xl flex items-center justify-center">
                <Download className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#0F1A2A] mb-3">4. Download and Publish</h2>
                <p className="text-lg text-[#4A5568] mb-4">
                  Once complete, download your book as a professionally formatted EPUB file
                  with an AI-generated cover. Ready to upload to Amazon KDP immediately.
                </p>
                <ul className="space-y-2 text-[#4A5568]">
                  <li>- EPUB format compatible with all e-readers</li>
                  <li>- Professional AI-generated cover (1600x2560px)</li>
                  <li>- Proper chapter formatting and table of contents</li>
                  <li>- Full commercial rights included</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-20 text-center">
            <h2 className="text-2xl font-bold text-[#0F1A2A] mb-4">Ready to Write Your Book?</h2>
            <button
              onClick={() => router.push('/create')}
              className="bg-[#1E3A5F] text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-[#2D4A73] transition-colors inline-flex items-center gap-2"
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
