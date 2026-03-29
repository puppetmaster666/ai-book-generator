'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Check, ArrowRight, Zap, BookOpen, Sparkles, Crown } from 'lucide-react';

export default function PricingContent() {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Pay per generation or subscribe for the best value. No hidden fees.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 max-w-6xl mx-auto">

            {/* Free Tier */}
            <button
              onClick={() => router.push(session ? '/create' : '/signup')}
              className="group bg-white rounded-2xl p-6 border-2 border-lime-400 hover:border-lime-500 hover:shadow-lg transition-all text-left cursor-pointer flex flex-col"
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
              <ul className="space-y-2 text-sm text-neutral-600 mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-lime-600 flex-shrink-0" />
                  Free sample preview
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-lime-600 flex-shrink-0" />
                  1 chapter or 5 panels
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-lime-600 flex-shrink-0" />
                  Upgrade to unlock full book
                </li>
              </ul>
              <div className="w-full bg-lime-400 text-neutral-900 py-3 rounded-xl text-sm font-medium text-center group-hover:bg-lime-500 transition-colors">
                Start Free
              </div>
            </button>

            {/* Single Generation */}
            <button
              onClick={() => router.push('/create')}
              className="group bg-white rounded-2xl p-6 border-2 border-neutral-200 hover:border-neutral-900 hover:shadow-lg transition-all text-left cursor-pointer flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center group-hover:bg-neutral-900 transition-colors">
                  <BookOpen className="h-5 w-5 text-neutral-700 group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Single Generation</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold">$9.99</span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">Novel, Comic, Screenplay, or Picture Book</p>
              <ul className="space-y-2 text-sm text-neutral-600 mb-6 flex-grow">
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
              className="group bg-neutral-900 text-white rounded-2xl p-6 border-2 border-neutral-900 hover:shadow-lg transition-all text-left cursor-pointer relative flex flex-col"
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
              <p className="text-sm text-neutral-300 mb-4">5 generations per month</p>
              <ul className="space-y-2 text-sm text-neutral-200 mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  $7.80 per generation
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  Unused credits roll over
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

            {/* Yearly Plan */}
            <button
              onClick={() => router.push(session ? '/checkout?plan=yearly' : '/signup?plan=yearly')}
              className="group bg-white rounded-2xl p-6 border-2 border-neutral-200 hover:border-neutral-900 hover:shadow-lg transition-all text-left cursor-pointer flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center group-hover:bg-neutral-900 transition-colors">
                  <Crown className="h-5 w-5 text-neutral-700 group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Yearly Plan</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold">$299</span>
                <span className="text-neutral-400 text-sm">/yr</span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">50 books per year</p>
              <ul className="space-y-2 text-sm text-neutral-600 mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  $5.98 per book
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  Use anytime within year
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  Best for power users
                </li>
              </ul>
              <div className="w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-medium text-center group-hover:bg-neutral-800 transition-colors">
                Get Yearly
              </div>
            </button>
          </div>

          {/* Free Preview Note */}
          <div className="mt-12 text-center">
            <div className="inline-block bg-neutral-100 rounded-xl px-6 py-4">
              <p className="text-neutral-600">
                <strong>Try before you buy:</strong> Generate a free sample preview (1 chapter for novels, 5 panels for visual books)
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Common Questions
            </h2>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-xl border border-neutral-200">
                <h3 className="font-medium mb-2">Can I use the books commercially?</h3>
                <p className="text-neutral-600">Yes! You have full commercial rights to all books generated. Publish on Amazon, sell directly, or use however you like.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-neutral-200">
                <h3 className="font-medium mb-2">What do I get with the free preview?</h3>
                <p className="text-neutral-600">For text books: 1 full chapter to see the writing quality. For visual books: 5 illustrated panels. If you like it, pay to unlock the full book.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-neutral-200">
                <h3 className="font-medium mb-2">Do unused subscription credits roll over?</h3>
                <p className="text-neutral-600">Yes! With the Author Plan, any unused credits roll over to the next month. Use them whenever you need them.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-neutral-200">
                <h3 className="font-medium mb-2">How do I know if I will like my book?</h3>
                <p className="text-neutral-600">Preview chapters are generated free so you can review the writing style and content before purchasing.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
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
