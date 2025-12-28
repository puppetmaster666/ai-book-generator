'use client';

import { Star } from 'lucide-react';
import Image from 'next/image';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  bookTitle?: string;
  rating: number;
  image: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "I wrote my first children's book in under 2 hours. The illustrations were exactly what I imagined. Now it's published on Amazon!",
    author: 'Sarah Mitchell',
    role: "Children's Book Author",
    bookTitle: 'The Magic Garden',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  },
  {
    quote:
      "As a busy professional, I never had time to write the novel I always dreamed of. This tool made it possible. 50,000 words in an afternoon.",
    author: 'Jennifer Kowalski',
    role: 'First-time Author',
    bookTitle: 'Whispers in the Wind',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  },
  {
    quote:
      "The comic book generator blew my mind. Professional quality panels with speech bubbles, consistent characters - it's like having a team of artists.",
    author: 'Michael Reynolds',
    role: 'Comic Creator',
    bookTitle: 'Shadow Knight Chronicles',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300'
          }`}
        />
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4"
            style={{ fontFamily: 'FoundersGrotesk, system-ui' }}
          >
            Loved by Authors Everywhere
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Join thousands of writers who have published their dream books
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100 hover:border-neutral-200 transition-colors"
            >
              <StarRating rating={testimonial.rating} />

              <blockquote className="mt-4 mb-6 text-neutral-700 leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200 flex-shrink-0">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.author}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-neutral-900">
                    {testimonial.author}
                  </p>
                  <p className="text-sm text-neutral-500">{testimonial.role}</p>
                </div>
              </div>

              {testimonial.bookTitle && (
                <div className="mt-4 pt-4 border-t border-neutral-200">
                  <p className="text-xs text-neutral-400 uppercase tracking-wide">
                    Published Book
                  </p>
                  <p className="text-sm font-medium text-neutral-700 mt-1">
                    {testimonial.bookTitle}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
