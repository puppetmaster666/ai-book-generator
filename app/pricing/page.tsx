'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Check } from 'lucide-react';

export default function Pricing() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-[#0F1A2A] mb-4">Simple, Transparent Pricing</h1>
            <p className="text-xl text-[#4A5568] max-w-2xl mx-auto">
              Choose the plan that fits your writing goals. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* One-Time */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E8E4DC]">
              <h3 className="text-xl font-semibold text-[#0F1A2A] mb-2">Single Book</h3>
              <div className="mb-4">
                <span className="text-5xl font-bold text-[#0F1A2A]">$19.99</span>
              </div>
              <p className="text-[#4A5568] mb-6">One-time payment</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>1 complete book (up to 100K words)</span>
                </li>
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>AI-generated professional cover</span>
                </li>
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>EPUB download (KDP-ready)</span>
                </li>
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>Full commercial rights</span>
                </li>
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>30-day money-back guarantee</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/create')}
                className="w-full bg-[#1E3A5F] text-white py-3 rounded-lg hover:bg-[#2D4A73] transition-colors font-medium"
              >
                Get Started
              </button>
            </div>

            {/* Monthly */}
            <div className="bg-white p-8 rounded-xl shadow-sm border-2 border-[#1E3A5F] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1E3A5F] text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold text-[#0F1A2A] mb-2">Monthly</h3>
              <div className="mb-4">
                <span className="text-5xl font-bold text-[#0F1A2A]">$69</span>
                <span className="text-[#4A5568]">/month</span>
              </div>
              <p className="text-[#4A5568] mb-6">$13.80 per book</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span><strong>5 books per month</strong></span>
                </li>
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>AI-generated covers for all books</span>
                </li>
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>Priority generation queue</span>
                </li>
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>Full commercial rights</span>
                </li>
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>Cancel anytime</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/signup?plan=monthly')}
                className="w-full bg-[#1E3A5F] text-white py-3 rounded-lg hover:bg-[#2D4A73] transition-colors font-medium"
              >
                Subscribe Monthly
              </button>
            </div>

            {/* Yearly */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E8E4DC]">
              <h3 className="text-xl font-semibold text-[#0F1A2A] mb-2">Yearly</h3>
              <div className="mb-4">
                <span className="text-5xl font-bold text-[#0F1A2A]">$499</span>
                <span className="text-[#4A5568]">/year</span>
              </div>
              <p className="text-[#4A5568] mb-6">$9.98 per book</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span><strong>50 book credits</strong> (use anytime)</span>
                </li>
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>AI-generated covers for all books</span>
                </li>
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>Priority generation queue</span>
                </li>
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>Full commercial rights</span>
                </li>
                <li className="flex items-start gap-3 text-[#4A5568]">
                  <Check className="h-5 w-5 text-[#10B981] mt-0.5" />
                  <span>Buy more credits anytime</span>
                </li>
              </ul>
              <button
                onClick={() => router.push('/signup?plan=yearly')}
                className="w-full bg-white text-[#1E3A5F] py-3 rounded-lg border-2 border-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white transition-colors font-medium"
              >
                Subscribe Yearly
              </button>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-[#0F1A2A] mb-8">Common Questions</h2>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-lg border border-[#E8E4DC]">
                <h3 className="font-medium text-[#0F1A2A] mb-2">Can I use the books commercially?</h3>
                <p className="text-[#4A5568]">Yes! You have full commercial rights to all books generated. Publish on Amazon, sell directly, or use however you like.</p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-[#E8E4DC]">
                <h3 className="font-medium text-[#0F1A2A] mb-2">How long does generation take?</h3>
                <p className="text-[#4A5568]">Typically 15-30 minutes depending on book length. You can watch progress in real-time.</p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-[#E8E4DC]">
                <h3 className="font-medium text-[#0F1A2A] mb-2">What if I am not satisfied?</h3>
                <p className="text-[#4A5568]">We offer a 30-day money-back guarantee. If you are not happy with your book, contact us for a full refund.</p>
              </div>
              <div className="bg-white p-6 rounded-lg border border-[#E8E4DC]">
                <h3 className="font-medium text-[#0F1A2A] mb-2">Do yearly credits expire?</h3>
                <p className="text-[#4A5568]">No! Use all 50 credits in the first month or spread them out over the year. Your call.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
