'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, Loader2, Star, Check } from 'lucide-react';
import Image from 'next/image';

type PricingPlan = 'basic' | 'subscription' | 'bulk';

export default function Home() {
  const router = useRouter();
  const [bookIdea, setBookIdea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>('subscription');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookIdea.trim() || bookIdea.length < 10) {
      setError('Please describe your book idea in more detail');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/expand-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: bookIdea }),
      });

      if (!response.ok) {
        throw new Error('Failed to process idea');
      }

      const bookPlan = await response.json();
      sessionStorage.setItem('bookPlan', JSON.stringify(bookPlan));
      sessionStorage.setItem('originalIdea', bookIdea);
      router.push('/review');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const handlePlanSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan);
  };

  const handleGetStarted = (plan: PricingPlan) => {
    sessionStorage.setItem('selectedPlan', plan);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1a1a2e]">
      <Header />

      <main className="flex-1">
        {/* Hero with Background Image */}
        <section className="relative min-h-[650px] lg:min-h-[750px] flex items-end">
          <div className="absolute inset-0">
            <Image
              src="/images/heatwriter-1766741433587.png"
              alt="Your Story Deserves To Be Told"
              fill
              className="object-cover object-top"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-[#1a1a2e]/60 to-transparent" />
          </div>

          <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 pb-16 pt-40">
            <div className="max-w-xl">
              <form onSubmit={handleSubmit} className="w-full">
                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-2xl">
                  <label className="block text-gray-800 font-bold mb-3 text-lg">
                    What&apos;s your book about?
                  </label>
                  <textarea
                    value={bookIdea}
                    onChange={(e) => setBookIdea(e.target.value)}
                    placeholder="A sci-fi novel about a lone astronaut discovering an ancient alien artifact..."
                    className="w-full h-28 px-4 py-3 text-base bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-gray-900 placeholder-gray-400"
                    disabled={isLoading}
                  />
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-500 font-medium">Starting at $19.99</p>
                    <button
                      type="submit"
                      disabled={isLoading || !bookIdea.trim()}
                      className="bg-blue-600 text-white px-6 py-3 rounded-xl text-base font-bold hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Start Writing <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {error && (
                  <p className="text-red-300 text-sm mt-3 font-medium bg-red-900/50 px-4 py-2 rounded-lg">{error}</p>
                )}
              </form>
              <div className="mt-5 flex items-center gap-6 text-sm text-white/80 font-medium">
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-400" /> No credit card required</span>
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-green-400" /> Free outline generation</span>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Book */}
        <section className="py-20 bg-[#1a1a2e]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-blue-400 font-bold tracking-wider uppercase text-sm">Made with Draft My Book</span>
              <h2 className="text-4xl font-bold text-white mt-2">See What&apos;s Possible</h2>
            </div>

            <div className="bg-[#252542] rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50 max-w-5xl mx-auto">
              <div className="md:flex">
                <div className="md:w-2/5 bg-[#1a1a2e] relative min-h-[450px]">
                  <Image
                    src="/images/cover.jpg"
                    alt="Blood & Silver Book Cover"
                    fill
                    className="object-contain p-4"
                  />
                </div>
                <div className="md:w-3/5 p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-1 mb-4">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-sm text-gray-400 ml-2 font-medium">Available on Amazon</span>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2">Blood &amp; Silver</h3>
                  <p className="text-lg text-blue-400 font-medium mb-6">by F. Fabrevoie</p>
                  <h4 className="text-xl font-semibold text-gray-200 mb-3 italic">&quot;History&apos;s Most Ruthless Untold Betrayals&quot;</h4>
                  <p className="text-gray-400 mb-8 leading-relaxed">
                    From the Scottish Highlands to the gates of Thermopylae, from the Roman Senate to occupied France — 12 devastating acts of treachery that shaped empires and defined nations.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-1.5 bg-[#1a1a2e] border border-gray-600 rounded-full text-sm text-gray-300 font-medium">Non-Fiction</span>
                    <span className="px-4 py-1.5 bg-[#1a1a2e] border border-gray-600 rounded-full text-sm text-gray-300 font-medium">History</span>
                    <span className="px-4 py-1.5 bg-red-900/30 border border-red-700/50 rounded-full text-sm text-red-300 font-medium">Available Now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 bg-[#252542]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white">Three Simple Steps</h2>
              <p className="text-gray-400 mt-4 text-lg">Turn your idea into a published book faster than ever.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-[#1a1a2e] border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 text-center group">
                <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 text-blue-400 group-hover:scale-110 transition-transform">1</div>
                <h3 className="text-xl font-bold text-white mb-3">Describe Your Idea</h3>
                <p className="text-gray-400">Tell us what your book is about in a few sentences. The more detail, the better.</p>
              </div>
              <div className="p-8 rounded-2xl bg-[#1a1a2e] border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 text-center group">
                <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 text-blue-400 group-hover:scale-110 transition-transform">2</div>
                <h3 className="text-xl font-bold text-white mb-3">Review &amp; Customize</h3>
                <p className="text-gray-400">We&apos;ll generate a detailed outline. You can tweak chapters, characters, and tone.</p>
              </div>
              <div className="p-8 rounded-2xl bg-[#1a1a2e] border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 text-center group">
                <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 text-blue-400 group-hover:scale-110 transition-transform">3</div>
                <h3 className="text-xl font-bold text-white mb-3">Generate &amp; Publish</h3>
                <p className="text-gray-400">Your book is written chapter by chapter. Download as EPUB and publish instantly.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-[#1a1a2e]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, Powerful Pricing</h2>
            <p className="text-gray-400 mb-12 text-lg">Choose the plan that fits your writing goals.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {/* Basic */}
              <div
                onClick={() => handlePlanSelect('basic')}
                className={`bg-[#252542] p-8 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col h-full ${
                  selectedPlan === 'basic'
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'border-gray-700/50 hover:border-gray-600'
                }`}
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">One-Time</h3>
                  <div className="text-4xl font-extrabold text-white mb-2">$19<span className="text-xl font-medium text-gray-400">.99</span></div>
                  <div className="text-gray-400 text-sm mb-6 font-medium">per book</div>
                  <ul className="text-left space-y-3 mb-8 text-gray-300 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400 flex-shrink-0" /> Full 50k+ word manuscript</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400 flex-shrink-0" /> EPUB &amp; PDF download</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400 flex-shrink-0" /> Standard Cover Design</li>
                  </ul>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleGetStarted('basic'); }}
                  className={`w-full py-3 font-bold rounded-xl transition-all duration-300 ${
                    selectedPlan === 'basic'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-2 border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                  }`}
                >
                  Get Started
                </button>
              </div>

              {/* Pro */}
              <div
                onClick={() => handlePlanSelect('subscription')}
                className={`bg-[#252542] p-8 rounded-2xl border-2 relative transition-all duration-300 cursor-pointer flex flex-col h-full ${
                  selectedPlan === 'subscription'
                    ? 'border-blue-500 shadow-xl shadow-blue-500/30'
                    : 'border-gray-700/50 hover:border-gray-600'
                }`}
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">Best Value</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Subscription</h3>
                  <div className="text-4xl font-extrabold text-white mb-2">$69<span className="text-xl font-medium text-gray-400">/mo</span></div>
                  <div className="text-gray-400 text-sm mb-6 font-medium">5 books per month</div>
                  <ul className="text-left space-y-3 mb-8 text-gray-300 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400 flex-shrink-0" /> Everything in Basic</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400 flex-shrink-0" /> Priority Generation</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400 flex-shrink-0" /> Advanced Plot Tools</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400 flex-shrink-0" /> Cancel Anytime</li>
                  </ul>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleGetStarted('subscription'); }}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg"
                >
                  Start Free Trial
                </button>
              </div>

              {/* Bulk */}
              <div
                onClick={() => handlePlanSelect('bulk')}
                className={`bg-[#252542] p-8 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex flex-col h-full ${
                  selectedPlan === 'bulk'
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'border-gray-700/50 hover:border-gray-600'
                }`}
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Bulk</h3>
                  <div className="text-4xl font-extrabold text-white mb-2">$499<span className="text-xl font-medium text-gray-400">/yr</span></div>
                  <div className="text-gray-400 text-sm mb-6 font-medium">50 book credits</div>
                  <ul className="text-left space-y-3 mb-8 text-gray-300 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400 flex-shrink-0" /> Lowest price per book</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400 flex-shrink-0" /> API Access</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400 flex-shrink-0" /> White-label options</li>
                  </ul>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleGetStarted('bulk'); }}
                  className={`w-full py-3 font-bold rounded-xl transition-all duration-300 ${
                    selectedPlan === 'bulk'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-2 border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-400'
                  }`}
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
