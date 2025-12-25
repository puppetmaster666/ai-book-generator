// Pricing
export const PRICING = {
  ONE_TIME: {
    price: 1999, // cents
    priceDisplay: '$19.99',
    books: 1,
  },
  MONTHLY: {
    price: 6900,
    priceDisplay: '$69',
    books: 5,
    interval: 'month',
  },
  YEARLY: {
    price: 49900,
    priceDisplay: '$499',
    credits: 50,
    interval: 'year',
  },
} as const;

// Book Types & Genres
export const BOOK_TYPES = {
  FICTION: 'fiction',
  NON_FICTION: 'non-fiction',
} as const;

export const GENRES = {
  // Fiction
  romance: { label: 'Romance', type: 'fiction', targetWords: 70000, chapters: 22 },
  mystery: { label: 'Mystery/Thriller', type: 'fiction', targetWords: 80000, chapters: 25 },
  fantasy: { label: 'Fantasy', type: 'fiction', targetWords: 100000, chapters: 32 },
  scifi: { label: 'Science Fiction', type: 'fiction', targetWords: 90000, chapters: 28 },
  ya: { label: 'Young Adult', type: 'fiction', targetWords: 60000, chapters: 20 },
  horror: { label: 'Horror', type: 'fiction', targetWords: 75000, chapters: 23 },
  literary: { label: 'Literary Fiction', type: 'fiction', targetWords: 80000, chapters: 25 },
  // Non-Fiction
  selfhelp: { label: 'Self-Help', type: 'non-fiction', targetWords: 50000, chapters: 14 },
  memoir: { label: 'Memoir', type: 'non-fiction', targetWords: 70000, chapters: 18 },
  howto: { label: 'How-To Guide', type: 'non-fiction', targetWords: 40000, chapters: 12 },
  business: { label: 'Business', type: 'non-fiction', targetWords: 55000, chapters: 15 },
} as const;

export type GenreKey = keyof typeof GENRES;

// Writing Styles
export const WRITING_STYLES = {
  literary: {
    label: 'Literary',
    description: 'Elegant prose, metaphor-heavy, introspective',
  },
  commercial: {
    label: 'Commercial/Thriller',
    description: 'Punchy, short chapters, cliffhangers',
  },
  romance: {
    label: 'Romance',
    description: 'Emotional, dialogue-heavy, intimate POV',
  },
  ya: {
    label: 'Young Adult',
    description: 'First person, relatable voice, fast-paced',
  },
  horror: {
    label: 'Horror',
    description: 'Atmospheric, dread-building, visceral',
  },
  scifi: {
    label: 'Sci-Fi/Fantasy',
    description: 'World-building focused, technical but accessible',
  },
  conversational: {
    label: 'Conversational',
    description: 'Friendly, accessible, easy to read (great for non-fiction)',
  },
  academic: {
    label: 'Academic',
    description: 'Formal, well-researched, authoritative',
  },
} as const;

export type WritingStyleKey = keyof typeof WRITING_STYLES;

// Chapter Formats
export const CHAPTER_FORMATS = {
  numbers: { label: 'Numbers Only', example: 'Chapter 1' },
  titles: { label: 'Titles Only', example: 'The Dark Forest' },
  both: { label: 'Numbers + Titles', example: 'Chapter 1: The Dark Forest' },
  pov: { label: 'POV Labels', example: 'SARAH - Chapter 1' },
} as const;

export type ChapterFormatKey = keyof typeof CHAPTER_FORMATS;

// Font Styles
export const FONT_STYLES = {
  classic: { label: 'Classic', heading: 'Garamond', body: 'Garamond' },
  modern: { label: 'Modern', heading: 'Montserrat', body: 'Source Serif Pro' },
  literary: { label: 'Literary', heading: 'Playfair Display', body: 'Lora' },
  clean: { label: 'Clean', heading: 'Roboto Slab', body: 'Roboto' },
  elegant: { label: 'Elegant', heading: 'Cormorant', body: 'EB Garamond' },
} as const;

export type FontStyleKey = keyof typeof FONT_STYLES;

// Cover dimensions (Amazon KDP)
export const COVER_DIMENSIONS = {
  width: 1600,
  height: 2560,
  aspectRatio: 1.6,
} as const;
