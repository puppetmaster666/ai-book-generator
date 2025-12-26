import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/book/', '/checkout/'],
    },
    sitemap: 'https://draftmybook.com/sitemap.xml',
  };
}
