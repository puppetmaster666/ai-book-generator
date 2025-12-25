'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, BookOpen, Zap, Download, Sparkles, Check } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [bookIdea, setBookIdea] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bookIdea.trim()) {
      sessionStorage.setItem('bookIdea', bookIdea);
      router.push('/create');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0F1A2A] mb-6 leading-tight">
              Turn Your Idea Into a<span className="text-[#1E3A5F]"> Complete Book</span>
            </h1>
            <p className="text-xl text-[#4A5568] mb-10 max-w-2xl mx-auto">
              Write novels, memoirs, self-help books, and more. AI-powered generation with professional quality. Ready for Amazon KDP in minutes.
            </p>
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <textarea
                  value={bookIdea}
                  onChange={(e) => setBookIdea(e.target.value)}
                  placeholder="Describe your book idea... (e.g., A romance novel about a chef who falls in love with a food critic in Paris)"
                  className="w-full h-32 px-6 py-4 text-lg border-2 border-[#E8E4DC] rounded-xl focus:border-[#1E3A5F] focus:outline-none resize-none bg-white shadow-sm"
                />
                <button type="submit" disabled={!bookIdea.trim()} className="absolute bottom-4 right-4 bg-[#1E3A5F] text-white px-6 py-3 rounded-lg hover:bg-[#2D4A73] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium">
                  Start Writing <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </form>
            <p className="text-sm text-[#4A5568]">No credit card required to start. Pay only when ready to generate.</p>
          </div>
        </section>

        <section className="py-20 bg-[#F7F5F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-[#0F1A2A] mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E8E4DC]">
                <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center mb-4"><Sparkles className="h-6 w-6 text-[#1E3A5F]" /></div>
                <h3 className="text-xl font-semibold text-[#0F1A2A] mb-2">1. Share Your Idea</h3>
                <p className="text-[#4A5568]">Tell us about your book concept, characters, and plot.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E8E4DC]">
                <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center mb-4"><Zap className="h-6 w-6 text-[#1E3A5F]" /></div>
                <h3 className="text-xl font-semibold text-[#0F1A2A] mb-2">2. AI Generates</h3>
                <p className="text-[#4A5568]">Our AI creates a detailed outline and writes each chapter.</p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E8E4DC]">
                <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center mb-4"><Download className="h-6 w-6 text-[#1E3A5F]" /></div>
                <h3 className="text-xl font-semibold text-[#0F1A2A] mb-2">3. Download and Publish</h3>
                <p className="text-[#4A5568]">Get your complete book as EPUB, ready for Amazon KDP.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-[#0F1A2A] mb-4">Write Any Genre</h2>
            <p className="text-center text-[#4A5568] mb-12 max-w-2xl mx-auto">From steamy romances to thrilling mysteries, self-help guides to memoirs.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Romance', 'Mystery/Thriller', 'Fantasy', 'Sci-Fi', 'Young Adult', 'Horror', 'Self-Help', 'Memoir', 'How-To Guide', 'Business', 'Literary Fiction', 'More...'].map((genre) => (
                <div key={genre} className="bg-white p-4 rounded-lg border border-[#E8E4DC] text-center hover:border-[#1E3A5F] transition-colors cursor-pointer">
                  <span className="text-[#0F1A2A] font-medium">{genre}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-[#F7F5F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-[#0F1A2A] mb-4">Simple Pricing</h2>
            <p className="text-center text-[#4A5568] mb-12">Choose the plan that works for you</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E8E4DC]">
                <h3 className="text-xl font-semibold text-[#0F1A2A] mb-2">Single Book</h3>
                <div className="mb-4"><span className="text-4xl font-bold text-[#0F1A2A]">$19.99</span></div>
                <p className="text-[#4A5568] mb-6">Perfect for trying it out</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-[#4A5568]"><Check className="h-5 w-5 text-[#10B981]" />1 complete book</li>
                  <li className="flex items-center gap-2 text-[#4A5568]"><Check className="h-5 w-5 text-[#10B981]" />AI-generated cover</li>
                  <li className="flex items-center gap-2 text-[#4A5568]"><Check className="h-5 w-5 text-[#10B981]" />EPUB download</li>
                </ul>
                <button onClick={() => router.push('/create')} className="w-full bg-[#1E3A5F] text-white py-3 rounded-lg hover:bg-[#2D4A73] transition-colors">Get Started</button>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-sm border-2 border-[#1E3A5F] relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1E3A5F] text-white px-4 py-1 rounded-full text-sm">Popular</div>
                <h3 className="text-xl font-semibold text-[#0F1A2A] mb-2">Monthly</h3>
                <div className="mb-4"><span className="text-4xl font-bold text-[#0F1A2A]">$69</span><span className="text-[#4A5568]">/month</span></div>
                <p className="text-[#4A5568] mb-6">For regular writers</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-[#4A5568]"><Check className="h-5 w-5 text-[#10B981]" />5 books per month</li>
                  <li className="flex items-center gap-2 text-[#4A5568]"><Check className="h-5 w-5 text-[#10B981]" />AI-generated covers</li>
                  <li className="flex items-center gap-2 text-[#4A5568]"><Check className="h-5 w-5 text-[#10B981]" />Priority generation</li>
                </ul>
                <button onClick={() => router.push('/pricing')} className="w-full bg-[#1E3A5F] text-white py-3 rounded-lg hover:bg-[#2D4A73] transition-colors">Subscribe</button>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E8E4DC]">
                <h3 className="text-xl font-semibold text-[#0F1A2A] mb-2">Yearly</h3>
                <div className="mb-4"><span className="text-4xl font-bold text-[#0F1A2A]">$499</span><span className="text-[#4A5568]">/year</span></div>
                <p className="text-[#4A5568] mb-6">Best value for pros</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-[#4A5568]"><Check className="h-5 w-5 text-[#10B981]" />50 book credits</li>
                  <li className="flex items-center gap-2 text-[#4A5568]"><Check className="h-5 w-5 text-[#10B981]" />Use anytime</li>
                  <li className="flex items-center gap-2 text-[#4A5568]"><Check className="h-5 w-5 text-[#10B981]" />$9.98 per book</li>
                </ul>
                <button onClick={() => router.push('/pricing')} className="w-full bg-white text-[#1E3A5F] py-3 rounded-lg border-2 border-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white transition-colors">Subscribe</button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <BookOpen className="h-16 w-16 text-[#1E3A5F] mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-[#0F1A2A] mb-4">Ready to Write Your Book?</h2>
            <p className="text-xl text-[#4A5568] mb-8">Join thousands of authors who have brought their stories to life.</p>
            <button onClick={() => router.push('/create')} className="bg-[#1E3A5F] text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-[#2D4A73] transition-colors inline-flex items-center gap-2">
              Start Creating <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
