'use client';

import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';

interface BlogCardProps {
  post: {
    title: string;
    slug: string;
    excerpt: string;
    coverImageAlt: string | null;
    publishedAt: Date | null;
    category: string;
    readingTime: number;
    hasCover: boolean;
  };
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  guides: 'bg-blue-50 text-blue-700',
  tutorials: 'bg-emerald-50 text-emerald-700',
  tips: 'bg-amber-50 text-amber-700',
  comparisons: 'bg-purple-50 text-purple-700',
  inspiration: 'bg-pink-50 text-pink-700',
};

export default function BlogCard({ post }: BlogCardProps) {
  const categoryClass = CATEGORY_COLORS[post.category] || 'bg-neutral-50 text-neutral-700';

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
        {/* Cover image */}
        <div className="aspect-video bg-neutral-100 relative overflow-hidden">
          {post.hasCover ? (
            <img
              src={`/api/blog/image/${post.slug}`}
              alt={post.coverImageAlt || post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
              <span className="text-4xl">📝</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          {/* Category + reading time */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${categoryClass}`}>
              {post.category}
            </span>
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <Clock className="h-3 w-3" />
              {post.readingTime} min read
            </div>
          </div>

          {/* Title */}
          <h2 className="font-semibold text-neutral-900 text-lg mb-2 group-hover:text-neutral-700 transition-colors line-clamp-2">
            {post.title}
          </h2>

          {/* Excerpt */}
          <p className="text-sm text-neutral-500 line-clamp-3 flex-1">
            {post.excerpt}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
            <span className="text-xs text-neutral-400">{formatDate(post.publishedAt)}</span>
            <span className="text-sm text-neutral-900 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              Read <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
