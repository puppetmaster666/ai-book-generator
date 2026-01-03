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
        text: 'Picture books and comics take 1-2 minutes. Novels take 30-60 minutes depending on length (50,000-100,000 words).',
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
        text: 'Single Book ($9.99): 1 book + cover. Author Plan ($39/month): 5 books/month with rollover. All plans include full commercial rights and downloads.',
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
