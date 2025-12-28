import { Metadata } from 'next';
import HowItWorksContent from './HowItWorksContent';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Learn how Draft My Book transforms your idea into a complete book in 4 simple steps. Create novels (EPUB), comic books, or children\'s picture books (PDF) with AI-generated content and illustrations.',
  openGraph: {
    title: 'How It Works - Draft My Book',
    description: 'From idea to published book in 4 simple steps. Create novels, comics, or picture books with AI-generated content, illustrations, and covers.',
  },
};

export default function HowItWorksPage() {
  return <HowItWorksContent />;
}
