import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://draftmybook.com'),
  title: {
    default: "Draft My Book - AI Book Generator | Create Your Book in Minutes",
    template: "%s | Draft My Book",
  },
  description: "Transform your ideas into professionally written books with AI. Fiction, non-fiction, romance, thriller, self-help and more. Download as EPUB, ready for Amazon KDP.",
  keywords: ["AI book generator", "write a book", "book writing", "self-publishing", "Amazon KDP", "EPUB generator", "AI writer", "book creator", "novel generator"],
  authors: [{ name: "Draft My Book" }],
  creator: "Draft My Book",
  publisher: "Draft My Book",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://draftmybook.com",
    siteName: "Draft My Book",
    title: "Draft My Book - AI Book Generator",
    description: "Transform your ideas into professionally written books with AI. Create full-length novels, non-fiction, and more. Ready for Amazon KDP.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Draft My Book - AI Book Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Draft My Book - AI Book Generator",
    description: "Transform your ideas into professionally written books with AI. Create full-length novels ready for Amazon KDP.",
    images: ["/images/og-image.png"],
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
  verification: {
    // Add these when you have them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Draft My Book',
  url: 'https://draftmybook.com',
  logo: 'https://draftmybook.com/images/logo.png',
  description: 'AI-powered book generation platform. Create full-length novels, non-fiction, and more.',
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'lhllparis@gmail.com',
    contactType: 'customer service',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}
