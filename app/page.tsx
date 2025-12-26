'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, Loader2, BookOpen, Star } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-40 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
              Your Book, Written by AI
            </h1>
            <p className="text-xl text-gray-300 mb-12">
              From a single sentence to a complete manuscript. Get your story out of your head and onto the page.
            </p>

            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
              <div className="relative">
                <textarea
                  value={bookIdea}
                  onChange={(e) => setBookIdea(e.target.value)}
                  placeholder="A sci-fi novel about a lone astronaut discovering an ancient alien artifact that holds the key to humanity's survival..."
                  className="w-full h-40 px-6 py-5 text-lg bg-gray-800 border-2 border-gray-700 rounded-2xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none text-white shadow-lg"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm mt-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || !bookIdea.trim()}
                className="mt-8 bg-blue-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto shadow-lg transform hover:scale-105"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Analyzing Your Idea...
                  </>
                ) : (
                  <>
                    Start Writing <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <p className="text-sm text-gray-500 mt-6">
              Starts at just $19.99 per book.
            </p>
          </div>
        </section>

        {/* Example Book */}
        <section className="py-20 bg-gray-900/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-blue-400 mb-2 tracking-wider">FEATURED CREATION</p>
              <h2 className="text-4xl font-bold text-white">See What's Possible</h2>
            </div>

            <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
              <div className="md:flex">
                <div className="md:w-1/3 bg-gradient-to-br from-gray-800 to-gray-900 p-8 flex items-center justify-center">
                  <div className="text-center text-white">
                    <BookOpen className="h-20 w-20 mx-auto mb-6 opacity-50" />
                    <h3 className="text-3xl font-bold mb-2">Blood & Silver</h3>
                    <p className="text-base opacity-70">by Freddie Fabrevoie</p>
                  </div>
                </div>
                <div className="md:w-2/3 p-10">
                  <div className="flex items-center gap-1.5 mb-5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-sm text-gray-400 ml-2">Bestseller on Amazon</span>
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-4">
                    History's Most Ruthless Untold Betrayals
                  </h4>
                  <p className="text-gray-300 italic mb-5">
                    "History remembers the heroes. This book is about the ones who sold them out."
                  </p>
                  <p className="text-gray-400 text-base mb-6">
                    From the Scottish Highlands to the gates of Thermopylae, from the Roman Senate to occupied France - 12 devastating acts of treachery that shaped empires and defined nations.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-2 bg-gray-700 rounded-full text-sm text-gray-300 font-medium">Non-Fiction</span>
                    <span className="px-4 py-2 bg-gray-700 rounded-full text-sm text-gray-300 font-medium">History</span>
                    <span className="px-4 py-2 bg-gray-700 rounded-full text-sm text-gray-300 font-medium">12 Chapters</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white">Three Simple Steps</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
              <div className="border border-gray-800 p-8 rounded-xl">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">1</div>
                <h3 className="text-xl font-semibold text-white mb-3">Describe Your Idea</h3>
                <p className="text-base text-gray-400">Tell us what your book is about in a few sentences.</p>
              </div>
              <div className="border border-gray-800 p-8 rounded-xl">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">2</div>
                <h3 className="text-xl font-semibold text-white mb-3">Review & Customize</h3>
                <p className="text-base text-gray-400">We'll generate a detailed outline and plan for you to approve.</p>
              </div>
              <div className="border border-gray-800 p-8 rounded-xl">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">3</div>
                <h3 className="text-xl font-semibold text-white mb-3">Generate Your Book</h3>
                <p className="text-base text-gray-400">Our AI writes your book chapter by chapter, ready for download.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 bg-gray-900/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-10">Simple, Powerful Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-2">One-Time</h3>
                <div className="text-5xl font-extrabold text-white mb-2">$19<span className="text-2xl font-medium text-gray-400">.99</span></div>
                <div className="text-gray-400 text-base mb-6">per book</div>
                <p className="text-sm text-gray-400">Perfect for trying us out or for a single project.</p>
              </div>
              <div className="bg-gray-800 p-8 rounded-2xl border-2 border-blue-500 relative transform scale-105 shadow-2xl">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">Most Popular</div>
                <h3 className="text-xl font-semibold text-white mb-2">Subscription</h3>
                <div className="text-5xl font-extrabold text-white mb-2">$69<span className="text-2xl font-medium text-gray-400">/mo</span></div>
                <div className="text-gray-400 text-base mb-6">5 books per month</div>
                <p className="text-sm text-gray-400">Best value for authors and frequent creators.</p>
              </div>
              <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-2">Bulk</h3>
                <div className="text-5xl font-extrabold text-white mb-2">$499<span className="text-2xl font-medium text-gray-400">/yr</span></div>
                <div className="text-gray-400 text-base mb-6">50 book credits</div>
                <p className="text-sm text-gray-400">For publishers and businesses with high volume needs.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
