import { Metadata } from 'next';
import PricingContent from './PricingContent';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for AI book generation. One-time purchase at $19.99, monthly subscription at $69/mo, or yearly at $499/yr with 50 book credits.',
  openGraph: {
    title: 'Pricing - Draft My Book',
    description: 'Simple, transparent pricing for AI book generation. Create full-length books starting at $19.99.',
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
