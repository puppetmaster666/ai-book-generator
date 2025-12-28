import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy - Draft My Book',
  description: 'Privacy policy for Draft My Book. Learn how we collect, use, and protect your personal information.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight mb-8" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
            Privacy Policy
          </h1>
          <p className="text-neutral-500 mb-12">Last updated: December 2024</p>

          <div className="prose prose-neutral max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>1. Information We Collect</h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                When you use Draft My Book, we collect information you provide directly:
              </p>
              <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                <li>Email address (for account creation and book delivery)</li>
                <li>Author name (for book covers)</li>
                <li>Book ideas and content you submit for generation</li>
                <li>Payment information (processed securely by Stripe)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>2. How We Use Your Information</h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                We use your information to:
              </p>
              <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                <li>Generate your books and deliver them to you</li>
                <li>Process payments and send receipts</li>
                <li>Send transactional emails about your orders</li>
                <li>Improve our services and user experience</li>
                <li>Respond to support inquiries</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>3. Data Storage and Security</h2>
              <p className="text-neutral-600 leading-relaxed">
                Your data is stored securely using industry-standard encryption. We use Stripe for payment processing,
                which is PCI DSS compliant. We do not store your full credit card information on our servers.
                Book content and user data are stored on secure cloud infrastructure with encryption at rest.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>4. Data Sharing</h2>
              <p className="text-neutral-600 leading-relaxed">
                We do not sell your personal information. We may share data with:
              </p>
              <ul className="list-disc pl-6 text-neutral-600 space-y-2 mt-4">
                <li>Payment processors (Stripe) to complete transactions</li>
                <li>Cloud service providers who help us deliver our services</li>
                <li>Law enforcement if required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>5. Your Rights</h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                <li>Access your personal data</li>
                <li>Request deletion of your data</li>
                <li>Update or correct your information</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>6. Cookies</h2>
              <p className="text-neutral-600 leading-relaxed">
                We use essential cookies to maintain your session and preferences. We may use analytics
                cookies to understand how visitors use our site. You can disable cookies in your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>7. Children&apos;s Privacy</h2>
              <p className="text-neutral-600 leading-relaxed">
                Our service is not intended for users under 18 years of age. We do not knowingly collect
                information from children under 18.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>8. Changes to This Policy</h2>
              <p className="text-neutral-600 leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of significant changes
                by email or through our website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>9. Contact Us</h2>
              <p className="text-neutral-600 leading-relaxed">
                For privacy-related questions, contact us at{' '}
                <a href="mailto:lhllparis@gmail.com" className="text-neutral-900 underline">
                  lhllparis@gmail.com
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
