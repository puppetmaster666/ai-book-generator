'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Check, ArrowRight } from 'lucide-react';

export default function PricingContent() {
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Pay per book or subscribe for the best value. No hidden fees.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">

            {/* Single Book */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 hover:shadow-lg transition-shadow flex flex-col">
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                Single Book
              </h3>
              <div className="mb-4">
                <span className="text-5xl font-bold tracking-tight" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>$9.99</span>
              </div>
              <p className="text-neutral-500 mb-6">One-time purchase</p>
              <ul className="space-y-4 flex-grow">
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Novel, comic, or picture book</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>AI-generated professional cover</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>EPUB or PDF download</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Full commercial rights</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/create')}
                className="w-full bg-white text-neutral-900 py-3 rounded-full border-2 border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors font-medium mt-8"
              >
                Create Book
              </button>
            </div>

            {/* Author Plan */}
            <div className="bg-white rounded-2xl border-2 border-neutral-900 p-8 relative hover:shadow-lg transition-shadow flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-4 py-1 rounded-full text-sm font-medium">
                Best Value
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                Author Plan
              </h3>
              <div className="mb-4">
                <span className="text-5xl font-bold tracking-tight" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>$39</span>
                <span className="text-neutral-500">/month</span>
              </div>
              <p className="text-neutral-500 mb-6">$7.80 per book</p>
              <ul className="space-y-4 flex-grow">
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>5 books per month</strong> (any type)</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Unused books roll over</strong></span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>AI-generated covers for all books</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Full commercial rights</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Cancel anytime</span>
                </li>
              </ul>
              <button
                onClick={() => router.push(session ? '/checkout?plan=monthly' : '/signup?plan=monthly')}
                className="w-full bg-neutral-900 text-white py-3 rounded-full hover:bg-neutral-800 transition-colors font-medium mt-8"
              >
                Subscribe
              </button>
            </div>
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
                <h3 className="font-medium mb-2">Do unused subscription books roll over?</h3>
                <p className="text-neutral-600">Yes! With the Author Plan, any unused books roll over to the next month. Use them whenever you need them.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-neutral-200">
                <h3 className="font-medium mb-2">What if I am not satisfied?</h3>
                <p className="text-neutral-600">We offer a 30-day money-back guarantee. If you are not happy with your book, contact us for a full refund.</p>
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
