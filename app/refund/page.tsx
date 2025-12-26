import { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Refund Policy - Draft My Book',
  description: 'Refund policy for Draft My Book. Learn about our refund terms for AI book generation services.',
};

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link href="/" className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
            draftmybook
          </Link>
        </div>
      </header>

      <main className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight mb-8" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
            Refund Policy
          </h1>
          <p className="text-neutral-500 mb-12">Last updated: December 2024</p>

          <div className="prose prose-neutral max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Our Commitment</h2>
              <p className="text-neutral-600 leading-relaxed">
                We want you to be satisfied with your book. If something goes wrong during generation,
                we&apos;ll make it right.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Single Book Purchases ($19.99)</h2>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6">
                <p className="text-neutral-600 leading-relaxed mb-4">
                  <strong>Full refund available if:</strong>
                </p>
                <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                  <li>Book generation fails completely and cannot be recovered</li>
                  <li>The generated content is substantially incomplete (missing chapters, corrupted file)</li>
                  <li>Technical issues prevent you from downloading your book</li>
                </ul>
                <p className="text-neutral-600 leading-relaxed mt-4">
                  <strong>Refund requests must be submitted within 7 days of purchase.</strong>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Subscription Plans</h2>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6">
                <p className="text-neutral-600 leading-relaxed mb-4">
                  <strong>Monthly ($69/month):</strong>
                </p>
                <ul className="list-disc pl-6 text-neutral-600 space-y-2 mb-6">
                  <li>Cancel anytime before your next billing date</li>
                  <li>No refunds for partial months</li>
                  <li>Access continues until end of billing period</li>
                </ul>
                <p className="text-neutral-600 leading-relaxed mb-4">
                  <strong>Yearly ($499/year):</strong>
                </p>
                <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                  <li>Pro-rated refund available within first 30 days if fewer than 5 books generated</li>
                  <li>After 30 days, unused credits remain available until expiration</li>
                  <li>No refunds after credits have been substantially used</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>What We Cannot Refund</h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                Refunds are not available for:
              </p>
              <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                <li>Dissatisfaction with creative output or writing style (you can regenerate for free)</li>
                <li>Change of mind after generation has completed</li>
                <li>Issues arising from user-provided content or instructions</li>
                <li>Third-party platform rejections (e.g., Amazon KDP content policy violations)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Free Regeneration</h2>
              <p className="text-neutral-600 leading-relaxed">
                If you&apos;re not satisfied with your book&apos;s content, we offer <strong>one free regeneration</strong> per
                purchase. This allows you to adjust your prompts or try a different approach without additional cost.
                Contact support to request a regeneration.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>How to Request a Refund</h2>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6">
                <ol className="list-decimal pl-6 text-neutral-600 space-y-3">
                  <li>Email <a href="mailto:support@draftmybook.com" className="text-neutral-900 underline">support@draftmybook.com</a> with the subject &quot;Refund Request&quot;</li>
                  <li>Include your order email and the book title</li>
                  <li>Describe the issue you experienced</li>
                  <li>We&apos;ll respond within 2 business days</li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Processing Time</h2>
              <p className="text-neutral-600 leading-relaxed">
                Approved refunds are processed within 5-10 business days. The refund will be credited to your original
                payment method. Depending on your bank, it may take an additional 5-10 business days to appear in your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>Contact Us</h2>
              <p className="text-neutral-600 leading-relaxed">
                Questions about refunds? Contact us at{' '}
                <a href="mailto:support@draftmybook.com" className="text-neutral-900 underline">
                  support@draftmybook.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
