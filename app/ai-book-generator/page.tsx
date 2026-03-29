import { Metadata } from 'next';
import BookGeneratorContent from './BookGeneratorContent';

export const metadata: Metadata = {
  title: 'AI Book Generator - Create a Book with AI in Minutes | DraftMyBook',
  description: 'Create complete books with AI. Our AI book generator writes novels, children\'s books, comics, and non-fiction with professional quality writing and illustrations. Free to try!',
  keywords: [
    'AI book generator',
    'create a book with AI',
    'AI writing tool',
    'AI book writer',
    'book generator',
    'generate book with AI',
    'AI author',
    'book creation AI',
    'write book with AI',
    'AI book maker',
  ],
  openGraph: {
    title: 'AI Book Generator - Create Complete Books with AI',
    description: 'Create complete books with AI. Novels, children\'s books, comics, and non-fiction with professional quality writing and illustrations.',
    type: 'website',
    images: ['/images/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Book Generator - Create a Book with AI',
    description: 'Create complete books with AI in minutes. All genres supported.',
  },
  alternates: {
    canonical: 'https://draftmybook.com/ai-book-generator',
  },
};

export default function AIBookGeneratorPage() {
  return <BookGeneratorContent />;
}
