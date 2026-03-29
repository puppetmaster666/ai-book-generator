import { Metadata } from 'next';
import ComicBookContent from './ComicBookContent';

export const metadata: Metadata = {
  title: 'AI Comic Book Maker - Create Comics with AI Art Generator | DraftMyBook',
  description: 'Create stunning comic books with AI. Our AI comic book maker generates professional comics with AI-powered story writing and illustration. Manga, superhero, indie, and more styles.',
  keywords: [
    'AI comic book maker',
    'create comics with AI',
    'AI comic generator',
    'comic book generator',
    'manga generator',
    'superhero comic maker',
    'AI art comic',
    'AI comic creator',
    'make comics with AI',
    'comic book maker online',
  ],
  openGraph: {
    title: 'AI Comic Book Maker - Create Comics with AI',
    description: 'Create stunning comic books with AI. Professional comics with AI-powered story writing and illustration in any style.',
    type: 'website',
    images: ['/images/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Comic Book Maker',
    description: 'Create professional comic books with AI art and story generation.',
  },
  alternates: {
    canonical: 'https://draftmybook.com/ai-comic-book-maker',
  },
};

export default function AIComicBookMakerPage() {
  return <ComicBookContent />;
}
