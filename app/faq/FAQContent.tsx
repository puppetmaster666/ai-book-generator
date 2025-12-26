'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ChevronDown, ChevronUp, ArrowRight, HelpCircle } from 'lucide-react';

const faqs = [
  {
    category: 'General',
    questions: [
      {
        q: 'What is Draft My Book?',
        a: 'Draft My Book is an AI-powered book generation platform. You provide your book idea, characters, and plot points, and our AI writes a complete book for you with consistent characters, plot, and style.'
      },
      {
        q: 'What types of books can I create?',
        a: 'We support fiction genres (romance, thriller, fantasy, sci-fi, horror, YA, literary fiction) and non-fiction (self-help, memoir, how-to guides, business books). Each genre has optimized prompts and typical word counts.'
      },
      {
        q: 'How long does it take to generate a book?',
        a: 'Typically 30-60 minutes depending on the target length. A 50,000 word book takes about 30-40 minutes, while a 100,000 word epic fantasy might take 45-60 minutes. You can watch progress in real-time.'
      },
      {
        q: 'Can I edit the book after generation?',
        a: 'The EPUB file you download can be opened in any EPUB editor (like Sigil or Calibre) for editing. We recommend reviewing and polishing your book before publishing.'
      }
    ]
  },
  {
    category: 'Quality & Content',
    questions: [
      {
        q: 'How good is the writing quality?',
        a: 'Our AI produces professional-quality prose suitable for self-publishing. The quality depends significantly on the detail you provide in your input. More detailed character descriptions and plot points lead to better output.'
      },
      {
        q: 'Will my book be unique?',
        a: 'Yes. Every book is generated fresh based on your specific inputs. The AI does not copy from existing books. Your plot, characters, and details make each book unique.'
      },
      {
        q: 'How does the AI maintain consistency?',
        a: 'We use a "memory system" that tracks what happened in previous chapters, character states (location, knowledge, goals), and unresolved plot threads. This is injected into each chapter generation to maintain continuity.'
      },
      {
        q: 'What about the cover?',
        a: 'We generate a professional book cover using AI image generation. The cover includes your title and author name, and is sized correctly for Amazon KDP (1600x2560 pixels).'
      }
    ]
  },
  {
    category: 'Rights & Publishing',
    questions: [
      {
        q: 'Do I own the rights to my book?',
        a: 'Yes, 100%. You have full commercial rights to everything generated. Publish on Amazon, sell on your own site, or use however you like. No attribution required.'
      },
      {
        q: 'Can I publish on Amazon KDP?',
        a: 'Absolutely. The EPUB file is formatted to meet KDP requirements. Simply upload it along with the cover image. Many of our users successfully publish on KDP.'
      },
      {
        q: 'Do I need to disclose AI was used?',
        a: 'This depends on the platform. Amazon KDP currently requires disclosure if AI was used for content creation. Check the current guidelines for your publishing platform.'
      }
    ]
  },
  {
    category: 'Pricing & Billing',
    questions: [
      {
        q: 'What does each plan include?',
        a: 'Single Book ($19.99): 1 book + cover. Monthly ($69): 5 books/month + covers. Yearly ($499): 50 credits to use anytime. All plans include full commercial rights and EPUB downloads.'
      },
      {
        q: 'Do yearly credits expire?',
        a: 'No. Your 50 credits are available until you use them. Use them all in month one or spread them over the year. When you run out, simply purchase another yearly plan.'
      },
      {
        q: 'What is your refund policy?',
        a: 'We offer a 30-day money-back guarantee. If you are not satisfied with your book, contact us within 30 days of purchase for a full refund. No questions asked.'
      },
      {
        q: 'Can I cancel my subscription?',
        a: 'Yes, you can cancel anytime. For monthly plans, you keep access until the end of your billing period. For yearly plans, you keep your remaining credits.'
      }
    ]
  }
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-neutral-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-medium text-neutral-900 group-hover:text-neutral-600 transition-colors">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-neutral-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-neutral-400 flex-shrink-0" />
        )}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-5' : 'max-h-0'}`}>
        <p className="text-neutral-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default function FAQContent() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-neutral-100 text-neutral-700 px-4 py-2 rounded-full text-sm mb-6">
              <HelpCircle className="h-4 w-4" />
              Get Answers
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-neutral-600">
              Everything you need to know about Draft My Book
            </p>
          </div>

          <div className="space-y-8">
            {faqs.map((section) => (
              <div key={section.category}>
                <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                  {section.category}
                </h2>
                <div className="bg-white rounded-2xl border border-neutral-200 px-6">
                  {section.questions.map((faq) => (
                    <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center p-8 bg-neutral-900 text-white rounded-2xl">
            <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Still have questions?
            </h3>
            <p className="text-neutral-300 mb-4">We are here to help. Reach out anytime.</p>
            <a
              href="mailto:lhllparis@gmail.com"
              className="text-white font-medium hover:underline"
            >
              lhllparis@gmail.com
            </a>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Link
              href="/"
              className="bg-neutral-900 text-white px-8 py-4 rounded-full text-base font-medium hover:bg-neutral-800 transition-all hover:scale-105 inline-flex items-center gap-2"
            >
              Start Creating <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
