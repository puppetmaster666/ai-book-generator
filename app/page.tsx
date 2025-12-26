'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, Loader2, Star, Check, Zap, Shield } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const [bookIdea, setBookIdea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

      // Store the plan and redirect to review
      sessionStorage.setItem('bookPlan', JSON.stringify(bookPlan));
      sessionStorage.setItem('originalIdea', bookIdea);
      router.push('/review');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2 text-center lg:text-left">
              <h1 className="text-5xl sm:text-6xl font-display font-bold text-gray-900 mb-6 leading-tight">
                Draft Your Dream Book <span className="text-primary">Instantly.</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                From a single sentence to a complete manuscript. Get your story out of your head and onto the page with our advanced AI writing assistant.
              </p>

              <form onSubmit={handleSubmit} className="w-full relative z-10">
                <div className="bg-white p-2 rounded-2xl shadow-xl border border-gray-200">
                  <textarea
                    value={bookIdea}
                    onChange={(e) => setBookIdea(e.target.value)}
                    placeholder="Describe your book idea here... (e.g., A sci-fi novel about a lone astronaut...)"
                    className="w-full h-32 px-5 py-4 text-lg bg-gray-50 border border-gray-200 rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-gray-900 placeholder-gray-400"
                    disabled={isLoading}
                  />
                  <div className="mt-2 flex justify-end">
                     <button
                      type="submit"
                      disabled={isLoading || !bookIdea.trim()}
                      className="bg-primary text-white px-8 py-3 rounded-lg text-lg font-bold hover:bg-primary-hover transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
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
                  <p className="text-error text-sm mt-3 font-medium">{error}</p>
                )}
              </form>
              <div className="mt-6 flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-500 font-medium">
                <span className="flex items-center gap-1"><Check className="h-4 w-4 text-success" /> No credit card required</span>
                <span className="flex items-center gap-1"><Check className="h-4 w-4 text-success" /> Free outline generation</span>
              </div>
            </div>

            <div className="lg:w-1/2 relative">
               {/* Placeholder for the user-generated Hero Image */}
               <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-100 aspect-[4/3] group">
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-400">
                     {/* Suggestion for user: Replace with generated image */}
                     <span className="text-center px-4">
                       [Hero Image Placeholder]<br/>
                       Generate: "A minimalist, high-quality workspace with a modern laptop, a steaming cup of coffee, and a stack of books, photorealistic, bright lighting"
                     </span>
                  </div>
                  {/* If you have an image, use Next.js Image component here */}
                  {/* <Image src="/path/to/hero.jpg" alt="Hero" fill className="object-cover" /> */}
               </div>
            </div>
          </div>
        </section>

        {/* Featured Book */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-primary font-bold tracking-wider uppercase text-sm">Made with Draft My Book</span>
              <h2 className="text-4xl font-display font-bold text-gray-900 mt-2">See What's Possible</h2>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 max-w-5xl mx-auto">
              <div className="md:flex">
                <div className="md:w-2/5 bg-gray-100 relative min-h-[400px]">
                   {/* Placeholder for Blood & Silver Book Cover */}
                   <div className="absolute inset-0 flex items-center justify-center">
                     {/* Using a placeholder service - in production use local asset */}
                     <img
                       src="https://placehold.co/400x600/EEE/31343C?text=Blood+%26+Silver+Cover"
                       alt="Blood and Silver Book Cover"
                       className="w-full h-full object-cover"
                     />
                   </div>
                </div>
                <div className="md:w-3/5 p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-1 mb-4">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-sm text-gray-500 ml-2 font-medium">4.9/5 on Amazon</span>
                  </div>
                  <h3 className="text-3xl font-display font-bold text-gray-900 mb-2">
                    Blood & Silver
                  </h3>
                   <p className="text-lg text-primary font-medium mb-6">by Freddie Fabrevoie</p>

                  <h4 className="text-xl font-bold text-gray-800 mb-3">
                    "History remembers the heroes. This book is about the ones who sold them out."
                  </h4>
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    From the Scottish Highlands to the gates of Thermopylae, from the Roman Senate to occupied France — 12 devastating acts of treachery that shaped empires and defined nations. A gripping non-fiction narrative generated entirely by our AI.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-600 font-medium">Non-Fiction</span>
                    <span className="px-4 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-600 font-medium">History</span>
                    <span className="px-4 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-600 font-medium">Bestseller</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 bg-white border-y border-gray-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-display font-bold text-gray-900">Three Simple Steps</h2>
              <p className="text-gray-500 mt-4 text-lg">Turn your idea into a published book faster than ever.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow duration-300 text-center group">
                <div className="w-16 h-16 bg-white border border-gray-200 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 text-primary group-hover:scale-110 transition-transform shadow-sm">1</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Describe Your Idea</h3>
                <p className="text-gray-600">Tell us what your book is about in a few sentences. The more detail, the better.</p>
              </div>
              <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow duration-300 text-center group">
                <div className="w-16 h-16 bg-white border border-gray-200 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 text-primary group-hover:scale-110 transition-transform shadow-sm">2</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Review & Customize</h3>
                <p className="text-gray-600">We'll generate a detailed outline. You can tweak chapters, characters, and tone.</p>
              </div>
              <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow duration-300 text-center group">
                <div className="w-16 h-16 bg-white border border-gray-200 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 text-primary group-hover:scale-110 transition-transform shadow-sm">3</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Generate & Publish</h3>
                <p className="text-gray-600">Our AI writes your book chapter by chapter. Download as EPUB and publish instantly.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Simple, Powerful Pricing</h2>
            <p className="text-gray-500 mb-12 text-lg">Choose the plan that fits your writing goals.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              {/* Basic */}
              <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-2">One-Time</h3>
                <div className="text-4xl font-extrabold text-gray-900 mb-2">$19<span className="text-xl font-medium text-gray-500">.99</span></div>
                <div className="text-gray-500 text-sm mb-6 font-medium">per book</div>
                <ul className="text-left space-y-3 mb-8 text-gray-600 text-sm">
                   <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Full 50k+ word manuscript</li>
                   <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> EPUB & PDF download</li>
                   <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Standard Cover Design</li>
                </ul>
                <button className="w-full py-3 border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-colors">Choose Basic</button>
              </div>

              {/* Pro (Highlighted) */}
              <div className="bg-white p-8 rounded-2xl border-2 border-primary relative transform scale-105 shadow-xl z-10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">Best Value</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Subscription</h3>
                <div className="text-5xl font-extrabold text-gray-900 mb-2">$69<span className="text-2xl font-medium text-gray-500">/mo</span></div>
                <div className="text-gray-500 text-sm mb-6 font-medium">5 books per month</div>
                <ul className="text-left space-y-3 mb-8 text-gray-600 text-sm">
                   <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Everything in Basic</li>
                   <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Priority Generation</li>
                   <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Advanced Plot Tools</li>
                   <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Cancel Anytime</li>
                </ul>
                <button className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-md">Start Free Trial</button>
              </div>

              {/* Enterprise */}
              <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Bulk</h3>
                <div className="text-4xl font-extrabold text-gray-900 mb-2">$499<span className="text-xl font-medium text-gray-500">/yr</span></div>
                <div className="text-gray-500 text-sm mb-6 font-medium">50 book credits</div>
                <ul className="text-left space-y-3 mb-8 text-gray-600 text-sm">
                   <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Lowest price per book</li>
                   <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> API Access</li>
                   <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> White-label options</li>
                </ul>
                <button className="w-full py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-lg hover:border-primary hover:text-primary transition-colors">Contact Sales</button>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
