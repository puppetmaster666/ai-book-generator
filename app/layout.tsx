import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers";
import CookieConsent from "@/components/CookieConsent";

const GA_MEASUREMENT_ID = 'G-14TXZWW3NZ';

export const metadata: Metadata = {
  metadataBase: new URL('https://draftmybook.com'),
  title: {
    default: "Draft My Book - AI Book Generator | Create Your Book in Minutes",
    template: "%s | Draft My Book",
  },
  icons: {
    icon: '/images/favicon.png',
    shortcut: '/images/favicon.png',
    apple: '/images/favicon.png',
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
