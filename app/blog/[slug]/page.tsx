import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Clock, ArrowLeft, BookOpen } from 'lucide-react';

export const revalidate = 3600;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: { title: true, metaDescription: true, coverImageAlt: true, keywords: true },
  });

  if (!post) return { title: 'Article Not Found' };

  return {
    title: `${post.title} | DraftMyBook Blog`,
    description: post.metaDescription,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      type: 'article',
      url: `https://draftmybook.com/blog/${slug}`,
      images: [`https://draftmybook.com/api/blog/image/${slug}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.metaDescription,
    },
    alternates: {
      canonical: `https://draftmybook.com/blog/${slug}`,
    },
  };
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function BlogArticlePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug, published: true },
  });

  if (!post) notFound();

  // Get related posts
  const related = await prisma.blogPost.findMany({
    where: {
      published: true,
      id: { not: post.id },
      OR: [
        { primaryKeyword: post.primaryKeyword },
        { category: post.category },
      ],
    },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    select: { title: true, slug: true, excerpt: true, category: true, readingTime: true },
  });

  const hasCover = !!post.coverImageUrl;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-12 px-6">
        <article className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          {/* Cover image */}
          {hasCover && (
            <div className="aspect-video rounded-2xl overflow-hidden mb-8 bg-neutral-100">
              <img
                src={`/api/blog/image/${post.slug}`}
                alt={post.coverImageAlt || post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-medium px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-full capitalize">
                {post.category}
              </span>
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <Clock className="h-3 w-3" />
                {post.readingTime} min read
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 leading-tight">
              {post.title}
            </h1>
            <p className="text-neutral-500 text-sm">
              {formatDate(post.publishedAt)}
            </p>
          </header>

          {/* Article content */}
          <div
            className="prose prose-neutral prose-lg max-w-none
              prose-headings:font-bold prose-headings:text-neutral-900
              prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-5
              prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-4
              prose-p:text-neutral-700 prose-p:leading-[1.8] prose-p:mb-6
              prose-a:text-neutral-900 prose-a:underline prose-a:font-medium
              prose-li:text-neutral-700 prose-li:mb-2 prose-li:leading-[1.7]
              prose-ul:my-6 prose-ul:pl-6
              prose-ol:my-6 prose-ol:pl-6
              prose-strong:text-neutral-900
              prose-blockquote:border-l-neutral-300 prose-blockquote:text-neutral-600 prose-blockquote:my-8 prose-blockquote:pl-6
              prose-pre:bg-neutral-50 prose-pre:rounded-xl prose-pre:p-6 prose-pre:my-8
              prose-code:text-neutral-800 prose-code:bg-neutral-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-hr:my-10"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* CTA */}
          <div className="mt-12 bg-neutral-50 rounded-2xl p-8 border border-neutral-200 text-center">
            <BookOpen className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Ready to Create Your Own Book?</h2>
            <p className="text-neutral-600 mb-5">Turn any idea into a published book, comic, or screenplay with AI.</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 font-medium transition-colors"
            >
              Try Free Sample
            </Link>
          </div>

          {/* Related articles */}
          {related.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-neutral-900 mb-6">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {related.map(r => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="block p-4 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <span className="text-xs text-neutral-400 capitalize">{r.category}</span>
                    <h3 className="font-medium text-neutral-900 mt-1 line-clamp-2">{r.title}</h3>
                    <p className="text-xs text-neutral-500 mt-2">{r.readingTime} min read</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>

      <Footer />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.metaDescription,
            datePublished: post.publishedAt?.toISOString(),
            dateModified: post.updatedAt.toISOString(),
            author: { '@type': 'Organization', name: 'DraftMyBook' },
            publisher: {
              '@type': 'Organization',
              name: 'DraftMyBook',
              url: 'https://draftmybook.com',
            },
            mainEntityOfPage: `https://draftmybook.com/blog/${post.slug}`,
            image: `https://draftmybook.com/api/blog/image/${post.slug}`,
          }),
        }}
      />
    </div>
  );
}
