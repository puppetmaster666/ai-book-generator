'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Check, ArrowRight } from 'lucide-react';

export default function PricingContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Choose the plan that fits your writing goals. No hidden fees, no surprises.
            </p>
          </div>

          {/* Single Book Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Novel */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 hover:shadow-lg transition-shadow flex flex-col">
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                Novel
              </h3>
              <div className="mb-4">
                <span className="text-5xl font-bold tracking-tight" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>$19.99</span>
              </div>
              <p className="text-neutral-500 mb-6">Text-only book</p>
              <ul className="space-y-4 flex-grow">
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>50,000+ words, 20+ chapters</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>AI-generated professional cover</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>EPUB download (KDP-ready)</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Full commercial rights</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/create')}
                className="w-full bg-neutral-900 text-white py-3 rounded-full hover:bg-neutral-800 transition-colors font-medium mt-8"
              >
                Create Novel
              </button>
            </div>

            {/* Visual Book */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 hover:shadow-lg transition-shadow flex flex-col">
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                Comic or Picture Book
              </h3>
              <div className="mb-4">
                <span className="text-5xl font-bold tracking-tight" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>$19.99</span>
              </div>
              <p className="text-neutral-500 mb-6">Visual book with illustrations</p>
              <ul className="space-y-4 flex-grow">
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>12-20 full-page illustrations</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Comic with speech bubbles OR children's book</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>PDF download (print-ready)</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Full commercial rights</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/create')}
                className="w-full bg-neutral-900 text-white py-3 rounded-full hover:bg-neutral-800 transition-colors font-medium mt-8"
              >
                Create Visual Book
              </button>
            </div>
          </div>

          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Subscription Plans
            </h2>
            <p className="text-neutral-600">For authors creating multiple books</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* Monthly */}
            <div className="bg-white rounded-2xl border-2 border-neutral-900 p-8 relative hover:shadow-lg transition-shadow flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                Monthly
              </h3>
              <div className="mb-4">
                <span className="text-5xl font-bold tracking-tight" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>$69</span>
                <span className="text-neutral-500">/month</span>
              </div>
              <p className="text-neutral-500 mb-6">$13.80 per book</p>
              <ul className="space-y-4 flex-grow">
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>5 books per month</strong> (any type)</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>AI-generated covers for all books</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Priority generation queue</span>
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
                onClick={() => router.push('/signup?plan=monthly')}
                className="w-full bg-neutral-900 text-white py-3 rounded-full hover:bg-neutral-800 transition-colors font-medium mt-8"
              >
                Subscribe Monthly
              </button>
            </div>

            {/* Yearly */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 hover:shadow-lg transition-shadow flex flex-col">
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                Yearly
              </h3>
              <div className="mb-4">
                <span className="text-5xl font-bold tracking-tight" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>$499</span>
                <span className="text-neutral-500">/year</span>
              </div>
              <p className="text-neutral-500 mb-6">$9.98 per book</p>
              <ul className="space-y-4 flex-grow">
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>50 book credits</strong> (use anytime)</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>AI-generated covers for all books</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Priority generation queue</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Full commercial rights</span>
                </li>
                <li className="flex items-start gap-3 text-neutral-600">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Buy more credits anytime</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/signup?plan=yearly')}
                className="w-full bg-white text-neutral-900 py-3 rounded-full border-2 border-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors font-medium mt-8"
              >
                Subscribe Yearly
              </button>
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
                <h3 className="font-medium mb-2">How long does generation take?</h3>
                <p className="text-neutral-600">Typically 30-60 minutes depending on book length. You can watch progress in real-time.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-neutral-200">
                <h3 className="font-medium mb-2">What if I am not satisfied?</h3>
                <p className="text-neutral-600">We offer a 30-day money-back guarantee. If you are not happy with your book, contact us for a full refund.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-neutral-200">
                <h3 className="font-medium mb-2">Do yearly credits expire?</h3>
                <p className="text-neutral-600">No! Use all 50 credits in the first month or spread them out over the year. Your call.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
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
