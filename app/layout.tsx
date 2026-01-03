import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers";
import CookieConsent from "@/components/CookieConsent";

const GA_MEASUREMENT_ID = 'G-14TXZWW3NZ';

export const metadata: Metadata = {
  metadataBase: new URL('https://draftmybook.com'),
  title: {
    default: "AI Book Generator - Create Books, Comics & Picture Books in Minutes | DraftMyBook",
    template: "%s | DraftMyBook - AI Book Generator",
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/images/favicon.png', type: 'image/png', sizes: '500x500' },
    ],
    shortcut: '/favicon.png',
    apple: [
      { url: '/images/favicon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  description: "Free AI book generator that creates complete novels, children's books, comics, and picture books in minutes. Type one idea, get a full illustrated book with AI-generated cover. Download EPUB ready for Amazon KDP publishing. First book free!",
  keywords: [
    // Primary keywords
    "AI book generator",
    "book generator",
    "AI book writer",
    "AI story generator",
    // Comic/Visual keywords
    "comic book generator",
    "AI comic creator",
    "comic generator",
    "AI comic book maker",
    "graphic novel generator",
    // Picture book keywords
    "picture book generator",
    "children's book maker",
    "children's book generator",
    "kids book creator",
    "illustrated book generator",
    // Novel keywords
    "novel generator",
    "AI novel writer",
    "story writer AI",
    "fiction generator",
    "romance book generator",
    "thriller generator",
    // Self-publishing keywords
    "self-publishing tool",
    "Amazon KDP book creator",
    "EPUB generator",
    "ebook creator",
    "publish your book",
    // Action keywords
    "write a book with AI",
    "create a book online",
    "make a book",
    "book creator online",
    "free book generator",
    // Feature keywords
    "AI book cover generator",
    "AI illustration generator",
    "automatic book writer",
  ],
  authors: [{ name: "DraftMyBook" }],
  creator: "DraftMyBook",
  publisher: "DraftMyBook",
  applicationName: "DraftMyBook",
  category: "Technology",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://draftmybook.com",
    siteName: "DraftMyBook",
    title: "AI Book Generator - Create Complete Books in Minutes | DraftMyBook",
    description: "Turn any idea into a professionally written book with AI. Create novels, children's books, comics with illustrations and covers. First book free. Ready for Amazon KDP.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "DraftMyBook - AI Book Generator - Create books, comics, and picture books with AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Book Generator - Create Books in Minutes | DraftMyBook",
    description: "Turn any idea into a complete book with AI. Novels, comics, picture books with illustrations. First book free!",
    images: ["/images/og-image.png"],
    creator: "@draftmybook",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://draftmybook.com",
  },
  verification: {
    // Add these when you have them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

// Multiple structured data schemas for comprehensive SEO
const jsonLdOrganization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'DraftMyBook',
  url: 'https://draftmybook.com',
  logo: 'https://draftmybook.com/images/logo.png',
  description: 'AI-powered book generator. Create novels, comics, picture books, and illustrated children\'s books in minutes.',
  sameAs: [
    'https://twitter.com/draftmybook',
    'https://www.producthunt.com/products/draftmybook',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'lhllparis@gmail.com',
    contactType: 'customer service',
  },
};

const jsonLdSoftwareApp = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'DraftMyBook - AI Book Generator',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free preview, then $9.99 per book',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '150',
    bestRating: '5',
    worstRating: '1',
  },
  description: 'AI book generator that creates complete novels, children\'s books, comics, and picture books with illustrations and covers. Ready for Amazon KDP publishing.',
  featureList: [
    'AI-generated complete books',
    'Comic book and graphic novel creation',
    'Children\'s picture book generator',
    'AI cover art generation',
    'Chapter illustrations',
    'EPUB export for Amazon KDP',
    'Multiple book formats and genres',
  ],
};

const jsonLdWebsite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'DraftMyBook',
  url: 'https://draftmybook.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://draftmybook.com/create?idea={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const jsonLdFAQ = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does the AI book generator work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Simply type your book idea in one sentence, choose your book format (novel, children\'s book, comic, etc.), and our AI generates a complete book with chapters, illustrations, and cover art in minutes.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I publish my AI-generated book on Amazon?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! All books are exported as EPUB files that are ready for Amazon KDP (Kindle Direct Publishing). You own the content and can publish it immediately.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is the first book really free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, your first complete book is 100% free with no credit card required. This includes the full book, cover art, and illustrations.',
      },
    },
    {
      '@type': 'Question',
      name: 'What types of books can I create?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'You can create novels, children\'s picture books, comic books, self-help books, romance, thriller, fantasy, and many more genres. Each book type has customizable options for length and style.',
      },
    },
  ],
};

const jsonLd = [jsonLdOrganization, jsonLdSoftwareApp, jsonLdWebsite, jsonLdFAQ];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Step 1: Define dataLayer and gtag function, set consent defaults BEFORE loading gtag.js */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}

              // Set default consent to denied (for EU/EEA)
              gtag('consent', 'default', {
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'analytics_storage': 'denied',
                'wait_for_update': 500
              });

              // Region-specific: auto-grant for non-EU regions
              gtag('consent', 'default', {
                'ad_storage': 'granted',
                'ad_user_data': 'granted',
                'ad_personalization': 'granted',
                'analytics_storage': 'granted',
                'region': ['US', 'CA', 'AU', 'NZ', 'JP', 'KR', 'SG', 'HK', 'TW', 'MX', 'BR', 'AR', 'CL', 'CO']
              });

              // Enable URL passthrough for better conversion tracking when cookies denied
              gtag('set', 'url_passthrough', true);

              // Redact ad data when ad_storage is denied
              gtag('set', 'ads_data_redaction', true);
            `,
          }}
        />
        {/* Step 2: Load gtag.js */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        {/* Step 3: Configure gtag */}
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className={`antialiased`}>
        <Providers>{children}</Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
