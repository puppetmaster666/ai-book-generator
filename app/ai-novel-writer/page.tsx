import { Metadata } from 'next';
import NovelWriterContent from './NovelWriterContent';

export const metadata: Metadata = {
  title: 'AI Novel Writer - Write a Novel with AI Story Generator | DraftMyBook',
  description: 'Write complete novels with AI. Our AI novel writer generates full-length books with compelling characters, plot development, and professional formatting. All genres supported. Free to try!',
  keywords: [
    'AI novel writer',
    'write a novel with AI',
    'AI story generator',
    'AI book writer',
    'AI fiction writer',
    'novel generator',
    'book writing AI',
    'write novel with AI',
    'AI writing assistant',
    'novel writing tool',
  ],
  openGraph: {
    title: 'AI Novel Writer - Write a Novel with AI',
    description: 'Write complete novels with AI. Full-length books with compelling characters, plot development, and professional formatting.',
    type: 'website',
    images: ['/images/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Novel Writer',
    description: 'Write complete novels with AI in any genre. From idea to manuscript.',
  },
  alternates: {
    canonical: 'https://draftmybook.com/ai-novel-writer',
  },
};

export default function AINovelWriterPage() {
  return <NovelWriterContent />;
}
