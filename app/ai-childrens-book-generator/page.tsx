import { Metadata } from 'next';
import ChildrensBookContent from './ChildrensBookContent';

export const metadata: Metadata = {
  title: "AI Children's Book Generator - Create Illustrated Kids Books in Minutes",
  description: "Create beautiful illustrated children's books with AI. Generate custom stories, characters, and full-page illustrations. Download as PDF ready for printing or self-publishing. Try free!",
  keywords: [
    "AI children's book generator",
    "children's book maker",
    "kids book creator",
    "AI picture book generator",
    "illustrated children's book maker",
    "create children's book online",
    "AI story generator for kids",
    "personalized children's book",
    "custom kids book creator",
    "children's book illustration AI",
  ],
  openGraph: {
    title: "AI Children's Book Generator - Create Illustrated Kids Books",
    description: "Create beautiful illustrated children's books with AI. Custom stories, characters, and full-page illustrations. Download as PDF.",
    type: 'website',
    images: ['/images/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "AI Children's Book Generator",
    description: "Create illustrated children's books with AI in minutes",
  },
  alternates: {
    canonical: 'https://draftmybook.com/ai-childrens-book-generator',
  },
};

export default function ChildrensBookGeneratorPage() {
  return <ChildrensBookContent />;
}
