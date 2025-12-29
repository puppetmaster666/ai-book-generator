import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/book/',
          '/checkout/',
          '/my-books/',
          '/account/',
          '/claim-credit/',
          '/review/',
        ],
      },
      {
        // Allow Googlebot more access for better indexing
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
        ],
      },
    ],
    sitemap: 'https://draftmybook.com/sitemap.xml',
  };
}
