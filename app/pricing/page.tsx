import { Metadata } from 'next';
import PricingContent from './PricingContent';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for AI book generation. Single generation at $5.99 or Author Plan at $29/mo for 5 generations with rollover.',
  openGraph: {
    title: 'Pricing - Draft My Book',
    description: 'Simple, transparent pricing for AI book generation. Create full-length books starting at $5.99.',
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
