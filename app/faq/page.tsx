import { Metadata } from 'next';
import FAQContent from './FAQContent';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about Draft My Book AI book generator. Learn about pricing, book quality, publishing rights, and how our AI writing works.',
  openGraph: {
    title: 'FAQ - Draft My Book',
    description: 'Get answers to common questions about AI book generation, pricing, commercial rights, and publishing on Amazon KDP.',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Draft My Book?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Draft My Book is an AI-powered book generation platform. You provide your book idea, characters, and plot points, and our AI writes a complete book for you with consistent characters, plot, and style.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to generate a book?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Typically 1-2 minutes for picture books and comics. Novels take longer depending on length - about 5-10 minutes for a full-length book.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I own the rights to my book?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, 100%. You have full commercial rights to everything generated. Publish on Amazon, sell on your own site, or use however you like. No attribution required.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I publish on Amazon KDP?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely. The EPUB file is formatted to meet KDP requirements. Simply upload it along with the cover image. Many of our users successfully publish on KDP.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does each plan include?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Single Book ($19.99): 1 book + cover. Monthly ($69): 5 books/month + covers. Yearly ($499): 50 credits to use anytime. All plans include full commercial rights and EPUB downloads.',
      },
    },
  ],
};

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FAQContent />
    </>
  );
}
