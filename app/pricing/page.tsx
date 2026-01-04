import { Metadata } from 'next';
import PricingContent from './PricingContent';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for AI book generation. Single generation at $9.99 or Author Plan at $39/mo for 5 generations with rollover.',
  openGraph: {
    title: 'Pricing - Draft My Book',
    description: 'Simple, transparent pricing for AI book generation. Create full-length books starting at $9.99.',
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
