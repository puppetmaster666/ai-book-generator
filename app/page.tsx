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
    <div className="min-h-screen flex flex-col bg-[#FFFDF8]">
      <Header />

      <main className="flex-1">
        {/* Hero - Super Simple */}
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0F1A2A] mb-6 leading-tight">
              Write a Book with AI
            </h1>
            <p className="text-xl text-[#4A5568] mb-10">
              Describe your idea. We handle the rest.
            </p>

            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
              <div className="relative">
                <textarea
                  value={bookIdea}
                  onChange={(e) => setBookIdea(e.target.value)}
                  placeholder="What's your book about? (e.g., 'A history book exploring the 12 most devastating betrayals in human history, from ancient Rome to modern espionage')"
                  className="w-full h-40 px-6 py-5 text-lg border-2 border-[#E8E4DC] rounded-2xl focus:border-[#1E3A5F] focus:outline-none resize-none bg-white shadow-lg"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || !bookIdea.trim()}
                className="mt-6 bg-[#1E3A5F] text-white px-10 py-4 rounded-xl text-lg font-medium hover:bg-[#2D4A73] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating your book plan...
                  </>
                ) : (
                  <>
                    Create My Book <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <p className="text-sm text-[#4A5568] mt-6">
              Starting at $19.99 per book
            </p>
          </div>
        </section>

        {/* Example Book - Blood & Silver */}
        <section className="py-16 bg-[#F7F5F0]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-sm font-medium text-[#1E3A5F] mb-2">MADE WITH BOOKFORGE</p>
              <h2 className="text-2xl font-bold text-[#0F1A2A]">See What's Possible</h2>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#E8E4DC]">
              <div className="md:flex">
                <div className="md:w-1/3 bg-gradient-to-br from-[#1E3A5F] to-[#0F1A2A] p-8 flex items-center justify-center">
                  <div className="text-center text-white">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-80" />
                    <h3 className="text-2xl font-bold mb-2">Blood & Silver</h3>
                    <p className="text-sm opacity-80">by Freddie Fabrevoie</p>
                  </div>
                </div>
                <div className="md:w-2/3 p-8">
                  <div className="flex items-center gap-1 mb-4">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="h-5 w-5 fill-[#F59E0B] text-[#F59E0B]" />
                    ))}
                    <span className="text-sm text-[#4A5568] ml-2">Available on Amazon</span>
                  </div>
                  <h4 className="text-xl font-semibold text-[#0F1A2A] mb-3">
                    History's Most Ruthless Untold Betrayals
                  </h4>
                  <p className="text-[#4A5568] mb-4">
                    "History remembers the heroes. This book is about the ones who sold them out."
                  </p>
                  <p className="text-[#4A5568] text-sm mb-6">
                    From the Scottish Highlands to the gates of Thermopylae, from the Roman Senate to occupied France - 12 devastating acts of treachery that shaped empires.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-[#F7F5F0] rounded-full text-sm text-[#4A5568]">Non-Fiction</span>
                    <span className="px-3 py-1 bg-[#F7F5F0] rounded-full text-sm text-[#4A5568]">History</span>
                    <span className="px-3 py-1 bg-[#F7F5F0] rounded-full text-sm text-[#4A5568]">12 Chapters</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Simple Steps */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-12 h-12 bg-[#1E3A5F] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                <h3 className="font-semibold text-[#0F1A2A] mb-2">Describe Your Idea</h3>
                <p className="text-sm text-[#4A5568]">Tell us what your book is about in a few sentences</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-[#1E3A5F] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                <h3 className="font-semibold text-[#0F1A2A] mb-2">Review & Pay</h3>
                <p className="text-sm text-[#4A5568]">See your book plan, then pay to start generation</p>
              </div>
              <div>
                <div className="w-12 h-12 bg-[#1E3A5F] text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                <h3 className="font-semibold text-[#0F1A2A] mb-2">Download Your Book</h3>
                <p className="text-sm text-[#4A5568]">Get your complete book as EPUB, ready for Amazon</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing - Compact */}
        <section className="py-16 bg-[#F7F5F0]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-[#0F1A2A] mb-8">Simple Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-[#E8E4DC]">
                <div className="text-3xl font-bold text-[#0F1A2A] mb-1">$19.99</div>
                <div className="text-[#4A5568] text-sm mb-4">per book</div>
                <div className="text-sm text-[#4A5568]">Perfect for trying it out</div>
              </div>
              <div className="bg-white p-6 rounded-xl border-2 border-[#1E3A5F] relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1E3A5F] text-white px-3 py-0.5 rounded-full text-xs">Popular</div>
                <div className="text-3xl font-bold text-[#0F1A2A] mb-1">$69<span className="text-lg font-normal">/mo</span></div>
                <div className="text-[#4A5568] text-sm mb-4">5 books/month</div>
                <div className="text-sm text-[#4A5568]">$13.80 per book</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-[#E8E4DC]">
                <div className="text-3xl font-bold text-[#0F1A2A] mb-1">$499<span className="text-lg font-normal">/yr</span></div>
                <div className="text-[#4A5568] text-sm mb-4">50 book credits</div>
                <div className="text-sm text-[#4A5568]">$9.98 per book</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
