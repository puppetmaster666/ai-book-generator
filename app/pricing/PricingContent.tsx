'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Check, ArrowRight, Zap, Sparkles, Crown, BookOpen } from 'lucide-react';
import { CREDIT_COSTS, CREDIT_PACKS } from '@/lib/constants';

const CREDIT_COST_TABLE = [
  { label: 'Short Guide / Lead Magnet', credits: CREDIT_COSTS.lead_magnet },
  { label: 'TV Pilot (Comedy)', credits: CREDIT_COSTS.tv_pilot_comedy },
  { label: 'Short Screenplay', credits: CREDIT_COSTS.short_screenplay },
  { label: 'TV Pilot (Drama) / Episode', credits: CREDIT_COSTS.tv_pilot_drama },
  { label: 'Short Novel', credits: CREDIT_COSTS.short_novel },
  { label: 'Screenplay', credits: CREDIT_COSTS.screenplay },
  { label: 'Non-Fiction Book', credits: CREDIT_COSTS.nonfiction },
  { label: 'Novel', credits: CREDIT_COSTS.novel },
  { label: 'Epic Novel', credits: CREDIT_COSTS.epic_novel },
  { label: "Children's Picture Book", credits: CREDIT_COSTS.childrens_picture },
  { label: 'Comic Book', credits: CREDIT_COSTS.comic_story },
  { label: 'Graphic Novel (Adult)', credits: CREDIT_COSTS.adult_comic },
];

export default function PricingContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isYearly, setIsYearly] = useState(false);

  const getCheckoutUrl = (plan: string) => {
    return session ? `/checkout?plan=${plan}` : `/signup?plan=${plan}`;
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Simple, Credit-Based Pricing
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Buy credits and use them on any book type. Unused credits always roll over.
            </p>
          </div>

          {/* Monthly / Yearly Toggle */}
          <div className="flex justify-center mb-10">
            <div className="bg-neutral-100 rounded-full p-1 flex">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  !isYearly ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  isYearly ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Yearly <span className="text-xs opacity-75">save ~25%</span>
              </button>
            </div>
          </div>

          {/* Subscription Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-16">

            {/* Starter */}
            <button
              onClick={() => router.push(getCheckoutUrl(isYearly ? 'starter_yearly' : 'starter_monthly'))}
              className="group bg-white rounded-2xl p-6 border-2 border-neutral-200 hover:border-neutral-900 hover:shadow-lg transition-all text-left cursor-pointer flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center group-hover:bg-neutral-900 transition-colors">
                  <Zap className="h-5 w-5 text-neutral-700 group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Starter</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold">{isYearly ? '$14.99' : '$19.99'}</span>
                <span className="text-neutral-400 text-sm">/{isYearly ? 'mo' : 'mo'}</span>
              </div>
              {isYearly && <p className="text-xs text-neutral-400 mb-2">$179.88 billed yearly</p>}
              <p className="text-sm text-neutral-500 mb-4">
                {isYearly ? '7,200' : '600'} credits{isYearly ? '/year' : '/month'}
              </p>
              <ul className="space-y-2 text-sm text-neutral-600 mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  2 comics or 5 novels/mo
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
              <div className="w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-medium text-center group-hover:bg-neutral-800 transition-colors">
                Get Starter
              </div>
            </button>

            {/* Author (highlighted) */}
            <button
              onClick={() => router.push(getCheckoutUrl(isYearly ? 'author_yearly' : 'author_monthly'))}
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
              <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Author</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold">{isYearly ? '$29.99' : '$39.99'}</span>
                <span className="text-neutral-400 text-sm">/{isYearly ? 'mo' : 'mo'}</span>
              </div>
              {isYearly && <p className="text-xs text-neutral-400 mb-2">$359.88 billed yearly</p>}
              <p className="text-sm text-neutral-300 mb-4">
                {isYearly ? '18,000' : '1,500'} credits{isYearly ? '/year' : '/month'}
              </p>
              <ul className="space-y-2 text-sm text-neutral-200 mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  6 comics or 12 novels/mo
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
                Get Author
              </div>
            </button>

            {/* Pro */}
            <button
              onClick={() => router.push(getCheckoutUrl(isYearly ? 'pro_yearly' : 'pro_monthly'))}
              className="group bg-white rounded-2xl p-6 border-2 border-neutral-200 hover:border-neutral-900 hover:shadow-lg transition-all text-left cursor-pointer flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center group-hover:bg-neutral-900 transition-colors">
                  <Crown className="h-5 w-5 text-neutral-700 group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Pro</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold">{isYearly ? '$52.49' : '$69.99'}</span>
                <span className="text-neutral-400 text-sm">/{isYearly ? 'mo' : 'mo'}</span>
              </div>
              {isYearly && <p className="text-xs text-neutral-400 mb-2">$629.88 billed yearly</p>}
              <p className="text-sm text-neutral-500 mb-4">
                {isYearly ? '48,000' : '4,000'} credits{isYearly ? '/year' : '/month'}
              </p>
              <ul className="space-y-2 text-sm text-neutral-600 mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  16 comics or 33 novels/mo
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  Unused credits roll over
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  Best for agencies and studios
                </li>
              </ul>
              <div className="w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-medium text-center group-hover:bg-neutral-800 transition-colors">
                Get Pro
              </div>
            </button>
          </div>

          {/* Pay-as-you-go Credit Packs */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-2xl font-bold text-center mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Or pay as you go
            </h2>
            <p className="text-neutral-500 text-center mb-8">Buy credit packs with no subscription. No expiry.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(CREDIT_PACKS).map(([key, pack]) => (
                <button
                  key={key}
                  onClick={() => router.push(session
                    ? `/checkout?plan=credit_${key === 'five_pack' ? 'five' : key === 'ten_pack' ? 'ten' : 'single'}`
                    : `/signup?plan=credit_${key === 'five_pack' ? 'five' : key === 'ten_pack' ? 'ten' : 'single'}`
                  )}
                  className="group bg-white rounded-xl p-5 border border-neutral-200 hover:border-neutral-900 hover:shadow-md transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-neutral-900">{pack.label}</span>
                    <span className="text-2xl font-bold">{pack.priceDisplay}</span>
                  </div>
                  <p className="text-sm text-neutral-500">{pack.credits.toLocaleString()} credits</p>
                </button>
              ))}
            </div>
          </div>

          {/* Credit Costs Table */}
          <div className="max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl font-bold text-center mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Credit Costs
            </h2>
            <p className="text-neutral-500 text-center mb-6">How many credits each book type uses</p>

            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              {CREDIT_COST_TABLE.map((item, i) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between px-5 py-3 text-sm ${
                    i < CREDIT_COST_TABLE.length - 1 ? 'border-b border-neutral-100' : ''
                  }`}
                >
                  <span className="text-neutral-700">{item.label}</span>
                  <span className="font-medium text-neutral-900">{item.credits} credits</span>
                </div>
              ))}
            </div>
          </div>

          {/* Free Preview Note */}
          <div className="text-center mb-16">
            <div className="inline-block bg-neutral-100 rounded-xl px-6 py-4">
              <p className="text-neutral-600">
                <strong>Try before you buy:</strong> Generate a free sample preview (1 chapter for novels, 5 panels for visual books). No credit card required.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Common Questions
            </h2>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-xl border border-neutral-200">
                <h3 className="font-medium mb-2">How do credits work?</h3>
                <p className="text-neutral-600">Each book type costs a set number of credits. A novel costs 120 credits, a comic costs 250. Subscribe for credits monthly, or buy packs whenever you need them.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-neutral-200">
                <h3 className="font-medium mb-2">Do unused credits expire?</h3>
                <p className="text-neutral-600">No. Unused credits always roll over to the next billing period. Credit packs never expire.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-neutral-200">
                <h3 className="font-medium mb-2">Can I use the books commercially?</h3>
                <p className="text-neutral-600">Yes! You have full commercial rights to all books generated. Publish on Amazon, sell directly, or use however you like.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-neutral-200">
                <h3 className="font-medium mb-2">What if I run out of credits?</h3>
                <p className="text-neutral-600">You can buy a credit pack anytime, or upgrade your subscription for more monthly credits. Your existing books and previews are never deleted.</p>
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
