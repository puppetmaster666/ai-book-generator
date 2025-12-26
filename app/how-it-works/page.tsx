import { Metadata } from 'next';
import HowItWorksContent from './HowItWorksContent';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Learn how Draft My Book transforms your idea into a complete book in 4 simple steps. AI-powered outline generation, chapter writing, and professional EPUB export.',
  openGraph: {
    title: 'How It Works - Draft My Book',
    description: 'From idea to published book in 4 simple steps. Our AI creates outlines, writes chapters, and generates professional covers.',
  },
};

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
