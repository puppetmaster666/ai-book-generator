import { prisma } from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogCard from '@/components/blog/BlogCard';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog - AI Book Writing Tips & Guides | DraftMyBook',
  description: 'Learn how to create books, comics, and screenplays with AI. Tips, tutorials, and guides for AI-powered writing and self-publishing.',
  keywords: ['AI book generator', 'AI writing tips', 'self-publishing', 'AI comic book maker', 'AI novel writer', 'write a book with AI'],
  openGraph: {
    title: 'Blog - AI Book Writing Tips & Guides | DraftMyBook',
    description: 'Learn how to create books, comics, and screenplays with AI. Tips, tutorials, and guides for AI-powered writing and self-publishing.',
    type: 'website',
    url: 'https://draftmybook.com/blog',
  },
  alternates: {
    canonical: 'https://draftmybook.com/blog',
  },
};

export const revalidate = 3600; // Revalidate every hour

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImageAlt: true,
      publishedAt: true,
      category: true,
      readingTime: true,
      primaryKeyword: true,
      coverImageUrl: true,
    },
  });

  // Check if cover images exist (don't send full base64 to client)
  const postsWithCoverFlag = posts.map(p => ({
    ...p,
    hasCover: !!p.coverImageUrl,
    coverImageUrl: undefined, // Don't send base64 to client
  }));

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
              AI Writing & Publishing Blog
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Tips, tutorials, and guides for creating books, comics, and screenplays with AI.
            </p>
          </div>

          {/* Posts grid */}
          {postsWithCoverFlag.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {postsWithCoverFlag.map(post => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-neutral-500 text-lg mb-4">No articles yet. Check back soon!</p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors"
              >
                Create a Book Instead
              </Link>
            </div>
          )}

          {/* CTA */}
          {postsWithCoverFlag.length > 0 && (
            <div className="mt-16 text-center bg-neutral-50 rounded-2xl p-10 border border-neutral-200">
              <h2 className="text-2xl font-bold text-neutral-900 mb-3">Ready to Create Your Own Book?</h2>
              <p className="text-neutral-600 mb-6">Turn any idea into a published book, comic, or screenplay in minutes.</p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 font-medium transition-colors text-lg"
              >
                Try Free Sample
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'DraftMyBook Blog',
            description: 'AI book writing tips, tutorials, and guides',
            url: 'https://draftmybook.com/blog',
            publisher: {
              '@type': 'Organization',
              name: 'DraftMyBook',
              url: 'https://draftmybook.com',
            },
          }),
        }}
      />
    </div>
  );
}
