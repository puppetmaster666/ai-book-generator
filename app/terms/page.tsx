import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service - Draft My Book',
  description: 'Terms of service for Draft My Book. Read our terms and conditions for using our AI book generation service.',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight mb-8" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
            Terms of Service
          </h1>
          <p className="text-neutral-500 mb-12">Last updated: December 2024</p>

          <div className="prose prose-neutral max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>1. Acceptance of Terms</h2>
              <p className="text-neutral-600 leading-relaxed">
                By accessing or using Draft My Book (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
                If you do not agree to these terms, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>2. Description of Service</h2>
              <p className="text-neutral-600 leading-relaxed">
                Draft My Book is an AI-powered book generation service. You provide book ideas, characters, and plot elements,
                and our system generates complete manuscripts formatted for publication on platforms like Amazon Kindle Direct Publishing (KDP).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>3. Intellectual Property Rights</h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                <strong>Your Content:</strong> You retain full commercial rights to all content generated through our service.
                You may publish, sell, distribute, or modify the generated content as you see fit. No attribution to Draft My Book is required.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                <strong>Our Service:</strong> The Draft My Book platform, including its design, features, and underlying technology,
                remains our intellectual property.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>4. User Responsibilities</h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                You agree to:
              </p>
              <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                <li>Provide accurate account information</li>
                <li>Not use the service to generate illegal, harmful, or infringing content</li>
                <li>Not attempt to reverse engineer or copy our technology</li>
                <li>Not use the service to harass, defame, or harm others</li>
                <li>Comply with all applicable laws when publishing generated content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>5. Prohibited Content</h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                You may not use our service to generate content that:
              </p>
              <ul className="list-disc pl-6 text-neutral-600 space-y-2">
                <li>Promotes violence, hatred, or discrimination</li>
                <li>Contains illegal material or promotes illegal activities</li>
                <li>Infringes on copyrights, trademarks, or other intellectual property</li>
                <li>Contains sexually explicit content involving minors</li>
                <li>Constitutes spam, fraud, or deceptive practices</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>6. Payment Terms</h2>
              <p className="text-neutral-600 leading-relaxed">
                Payments are processed securely through Stripe. Prices are in USD and are subject to change.
                Subscription plans renew automatically unless cancelled. See our{' '}
                <Link href="/refund" className="text-neutral-900 underline">Refund Policy</Link> for details on refunds.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>7. Service Availability</h2>
              <p className="text-neutral-600 leading-relaxed">
                We strive to maintain high availability but do not guarantee uninterrupted service.
                We may perform maintenance, updates, or modifications that temporarily affect availability.
                We are not liable for any losses resulting from service interruptions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>8. Disclaimer of Warranties</h2>
              <p className="text-neutral-600 leading-relaxed">
                The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that generated
                content will be error-free, unique, or suitable for any particular purpose. You are responsible for
                reviewing and editing content before publication.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>9. Limitation of Liability</h2>
              <p className="text-neutral-600 leading-relaxed">
                To the maximum extent permitted by law, Draft My Book shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages arising from your use of the Service. Our total liability
                shall not exceed the amount you paid for the Service in the 12 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>10. Termination</h2>
              <p className="text-neutral-600 leading-relaxed">
                We reserve the right to suspend or terminate your access to the Service for violation of these terms
                or for any other reason at our sole discretion. You may terminate your account at any time by contacting support.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>11. Changes to Terms</h2>
              <p className="text-neutral-600 leading-relaxed">
                We may update these terms at any time. Continued use of the Service after changes constitutes acceptance
                of the new terms. We will notify you of significant changes via email or website notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>12. Governing Law</h2>
              <p className="text-neutral-600 leading-relaxed">
                These terms shall be governed by and construed in accordance with the laws of the United States.
                Any disputes shall be resolved in the courts of competent jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>13. Contact</h2>
              <p className="text-neutral-600 leading-relaxed">
                For questions about these terms, contact us at{' '}
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
