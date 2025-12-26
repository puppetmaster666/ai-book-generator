'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Loader2, Sparkles, Menu, X, Star, Check } from 'lucide-react';
import Footer from '@/components/Footer';

type PricingPlan = 'basic' | 'subscription' | 'bulk';

export default function Home() {
  const router = useRouter();
  const [bookIdea, setBookIdea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>('subscription');

  const handleFindIdea = async () => {
    setIsGeneratingIdea(true);
    setError('');

    try {
      const response = await fetch('/api/generate-idea', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate idea');
      }

      const data = await response.json();
      setBookIdea(data.idea);
    } catch (err) {
      setError('Failed to generate idea. Please try again.');
    } finally {
      setIsGeneratingIdea(false);
    }
  };

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
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1">
        {/* Hero with Full Width Background */}
        <section className="relative min-h-[700px] lg:min-h-[800px]">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="/images/heatwriter-1766741433587.png"
              alt="Your Story Deserves To Be Told"
              fill
              className="object-cover object-top"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-white" />
          </div>

          {/* Overlay Header */}
          <div className="absolute top-0 left-0 right-0 z-20">
            <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
              <Link href="/" className="text-xl font-bold text-white drop-shadow-lg">
                Draft My Book
              </Link>

              {/* Hamburger Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 text-white hover:bg-white/20 rounded-sm transition-colors"
                >
                  {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <div className="absolute right-0 top-12 bg-white rounded-sm shadow-lg border border-neutral-100 py-2 min-w-[180px] z-50">
                    <Link
                      href="/how-it-works"
                      className="block px-4 py-2.5 text-neutral-700 hover:bg-neutral-50 text-sm"
                      onClick={() => setMenuOpen(false)}
                    >
                      How It Works
                    </Link>
                    <Link
                      href="/pricing"
                      className="block px-4 py-2.5 text-neutral-700 hover:bg-neutral-50 text-sm"
                      onClick={() => setMenuOpen(false)}
                    >
                      Pricing
                    </Link>
                    <Link
                      href="/faq"
                      className="block px-4 py-2.5 text-neutral-700 hover:bg-neutral-50 text-sm"
                      onClick={() => setMenuOpen(false)}
                    >
                      FAQ
                    </Link>
                    <div className="border-t border-neutral-100 my-2" />
                    <Link
                      href="/login"
                      className="block px-4 py-2.5 text-neutral-700 hover:bg-neutral-50 text-sm"
                      onClick={() => setMenuOpen(false)}
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      className="block px-4 py-2.5 text-neutral-900 hover:bg-neutral-50 text-sm font-medium"
                      onClick={() => setMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Overlay */}
          <div className="absolute bottom-0 left-0 right-0 z-10 pb-16 pt-40">
            <div className="max-w-7xl mx-auto px-6">
              <div className="max-w-lg">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white p-6 rounded-sm shadow-xl">
                    <label className="block text-neutral-900 font-semibold mb-3">
                      What&apos;s your book about?
                    </label>
                    <div className="relative">
                      <textarea
                        value={bookIdea}
                        onChange={(e) => setBookIdea(e.target.value)}
                        placeholder="A sci-fi novel about a lone astronaut discovering an ancient alien artifact..."
                        className="w-full h-28 px-4 py-3 pr-36 text-base bg-neutral-50 border border-neutral-200 rounded-sm focus:border-neutral-900 focus:outline-none resize-none text-neutral-900 placeholder-neutral-400"
                        disabled={isLoading || isGeneratingIdea}
                      />
                      <button
                        type="button"
                        onClick={handleFindIdea}
                        disabled={isLoading || isGeneratingIdea}
                        className="absolute right-2 top-2 px-3 py-1.5 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-sm hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        {isGeneratingIdea ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Finding...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            Find me an idea
                          </>
                        )}
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-neutral-500 font-medium">Starting at $19.99</p>
                      <button
                        type="submit"
                        disabled={isLoading || !bookIdea.trim()}
                        className="bg-neutral-900 text-white px-6 py-3 rounded-sm text-sm font-semibold hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Start Writing <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <p className="text-red-700 text-sm mt-3 font-medium bg-red-50 px-4 py-2 rounded-sm">{error}</p>
                  )}
                </form>
                <div className="mt-4 flex items-center gap-6 text-sm text-white font-medium drop-shadow">
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> No credit card required</span>
                  <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Free outline generation</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Book */}
        <section className="py-20 bg-neutral-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="text-neutral-500 font-medium tracking-wide uppercase text-sm">Made with Draft My Book</span>
              <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mt-2">See What&apos;s Possible</h2>
            </div>

            <div className="bg-white border border-neutral-200 rounded-sm overflow-hidden max-w-5xl mx-auto">
              <div className="md:flex">
                <div className="md:w-2/5 bg-neutral-100 relative min-h-[400px]">
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
                      <Star key={i} className="h-5 w-5 fill-neutral-900 text-neutral-900" />
                    ))}
                    <span className="text-sm text-neutral-500 ml-2 font-medium">Available on Amazon</span>
                  </div>
                  <h3 className="text-3xl font-bold text-neutral-900 mb-2">Blood &amp; Silver</h3>
                  <p className="text-lg text-neutral-600 font-medium mb-6">by F. Fabrevoie</p>
                  <h4 className="text-xl font-semibold text-neutral-700 mb-3 italic">&quot;History&apos;s Most Ruthless Untold Betrayals&quot;</h4>
                  <p className="text-neutral-600 mb-8 leading-relaxed">
                    From the Scottish Highlands to the gates of Thermopylae, from the Roman Senate to occupied France — 12 devastating acts of treachery that shaped empires and defined nations.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-1.5 bg-neutral-100 border border-neutral-200 rounded-sm text-sm text-neutral-700 font-medium">Non-Fiction</span>
                    <span className="px-4 py-1.5 bg-neutral-100 border border-neutral-200 rounded-sm text-sm text-neutral-700 font-medium">History</span>
                    <span className="px-4 py-1.5 bg-neutral-900 text-white rounded-sm text-sm font-medium">Available Now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900">Three Simple Steps</h2>
              <p className="text-neutral-600 mt-4 text-lg">Turn your idea into a published book faster than ever.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-sm bg-neutral-50 border border-neutral-200 hover:border-neutral-300 transition-colors text-center">
                <div className="w-14 h-14 bg-neutral-900 text-white rounded-sm flex items-center justify-center text-xl font-bold mx-auto mb-6">1</div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">Describe Your Idea</h3>
                <p className="text-neutral-600">Tell us what your book is about in a few sentences. The more detail, the better.</p>
              </div>
              <div className="p-8 rounded-sm bg-neutral-50 border border-neutral-200 hover:border-neutral-300 transition-colors text-center">
                <div className="w-14 h-14 bg-neutral-900 text-white rounded-sm flex items-center justify-center text-xl font-bold mx-auto mb-6">2</div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">Review &amp; Customize</h3>
                <p className="text-neutral-600">We&apos;ll generate a detailed outline. You can tweak chapters, characters, and tone.</p>
              </div>
              <div className="p-8 rounded-sm bg-neutral-50 border border-neutral-200 hover:border-neutral-300 transition-colors text-center">
                <div className="w-14 h-14 bg-neutral-900 text-white rounded-sm flex items-center justify-center text-xl font-bold mx-auto mb-6">3</div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">Generate &amp; Publish</h3>
                <p className="text-neutral-600">Your book is written chapter by chapter. Download as EPUB and publish instantly.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-neutral-50">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-4">Simple, Powerful Pricing</h2>
            <p className="text-neutral-600 mb-12 text-lg">Choose the plan that fits your writing goals.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {/* Basic */}
              <div
                onClick={() => handlePlanSelect('basic')}
                className={`bg-white p-8 rounded-sm border transition-all cursor-pointer flex flex-col h-full ${
                  selectedPlan === 'basic'
                    ? 'border-neutral-900 shadow-lg'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">One-Time</h3>
                  <div className="text-4xl font-bold text-neutral-900 mb-2">$19<span className="text-xl font-medium text-neutral-500">.99</span></div>
                  <div className="text-neutral-500 text-sm mb-6 font-medium">per book</div>
                  <ul className="text-left space-y-3 mb-8 text-neutral-700 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-900 flex-shrink-0" /> Full 50k+ word manuscript</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-900 flex-shrink-0" /> EPUB &amp; PDF download</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-900 flex-shrink-0" /> Standard Cover Design</li>
                  </ul>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleGetStarted('basic'); }}
                  className={`w-full py-3 font-semibold rounded-sm transition-colors ${
                    selectedPlan === 'basic'
                      ? 'bg-neutral-900 text-white hover:bg-black'
                      : 'border border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900'
                  }`}
                >
                  Get Started
                </button>
              </div>

              {/* Pro */}
              <div
                onClick={() => handlePlanSelect('subscription')}
                className={`bg-white p-8 rounded-sm border relative transition-all cursor-pointer flex flex-col h-full ${
                  selectedPlan === 'subscription'
                    ? 'border-neutral-900 shadow-lg'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-4 py-1 rounded-sm text-xs font-semibold uppercase tracking-wide">Best Value</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">Subscription</h3>
                  <div className="text-4xl font-bold text-neutral-900 mb-2">$69<span className="text-xl font-medium text-neutral-500">/mo</span></div>
                  <div className="text-neutral-500 text-sm mb-6 font-medium">5 books per month</div>
                  <ul className="text-left space-y-3 mb-8 text-neutral-700 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-900 flex-shrink-0" /> Everything in Basic</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-900 flex-shrink-0" /> Priority Generation</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-900 flex-shrink-0" /> Advanced Plot Tools</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-900 flex-shrink-0" /> Cancel Anytime</li>
                  </ul>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleGetStarted('subscription'); }}
                  className="w-full py-3 bg-neutral-900 text-white font-semibold rounded-sm hover:bg-black transition-colors"
                >
                  Start Free Trial
                </button>
              </div>

              {/* Bulk */}
              <div
                onClick={() => handlePlanSelect('bulk')}
                className={`bg-white p-8 rounded-sm border transition-all cursor-pointer flex flex-col h-full ${
                  selectedPlan === 'bulk'
                    ? 'border-neutral-900 shadow-lg'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">Bulk</h3>
                  <div className="text-4xl font-bold text-neutral-900 mb-2">$499<span className="text-xl font-medium text-neutral-500">/yr</span></div>
                  <div className="text-neutral-500 text-sm mb-6 font-medium">50 book credits</div>
                  <ul className="text-left space-y-3 mb-8 text-neutral-700 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-900 flex-shrink-0" /> Lowest price per book</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-900 flex-shrink-0" /> API Access</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-neutral-900 flex-shrink-0" /> White-label options</li>
                  </ul>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleGetStarted('bulk'); }}
                  className={`w-full py-3 font-semibold rounded-sm transition-colors ${
                    selectedPlan === 'bulk'
                      ? 'bg-neutral-900 text-white hover:bg-black'
                      : 'border border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900'
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
