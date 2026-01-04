'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'How long does it take to generate a book?',
    answer:
      'For comics and picture books, generation takes about 1-2 minutes. For full-length novels (50,000+ words), it typically takes 30-60 minutes. You can leave the page and come back - your book will continue generating in the background.',
  },
  {
    question: 'Can I edit the generated content?',
    answer:
      'Yes! Once your book is generated, you can download it as an EPUB file and edit it in any word processor or EPUB editor. You have full ownership and can modify it however you like.',
  },
  {
    question: 'What formats are supported for download?',
    answer:
      'Novels are downloaded as EPUB files, which are ready for Amazon KDP and other publishing platforms. Comics and picture books are downloaded as PDF files with all illustrations included.',
  },
  {
    question: 'How do I publish on Amazon KDP?',
    answer:
      'After downloading your book, simply upload the EPUB file to Amazon KDP (kdp.amazon.com). Our output is formatted to meet KDP requirements. For cover images, we generate a KDP-ready cover that you can upload separately.',
  },
  {
    question: "What's included in the free sample?",
    answer:
      'Your free sample includes 1 chapter for text books or 5 panels for visual books - no credit card required. This lets you experience the quality before upgrading to unlock the full book.',
  },
  {
    question: 'Do I own the rights to my generated book?',
    answer:
      'Yes, you have full commercial rights to everything we generate for you. You can publish, sell, and distribute your book however you want. There are no royalties or ongoing fees.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-neutral-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4"
            style={{ fontFamily: 'FoundersGrotesk, system-ui' }}
          >
            Frequently Asked Questions
          </h2>
          <p className="text-neutral-600">
            Everything you need to know about creating your book
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-neutral-200 overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-neutral-50 transition-colors"
              >
                <span className="font-medium text-neutral-900 pr-4">
                  {item.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-neutral-500 flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-5 pb-5 text-neutral-600 leading-relaxed">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
