// Pricing
export const PRICING = {
  // Text-only books
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
  // Visual books (comics & children's)
  VISUAL: {
    price: 1999, // cents
    priceDisplay: '$19.99',
  },
} as const;

// Book Formats (illustration level)
export const BOOK_FORMATS = {
  text_only: {
    label: 'Text Only',
    description: 'Traditional novel format',
    illustrationsPerChapter: 0,
    priceKey: 'ONE_TIME',
  },
  picture_book: {
    label: 'Picture Book',
    description: 'Full-page illustrations throughout',
    illustrationsPerChapter: 1,
    priceKey: 'VISUAL',
  },
} as const;

export type BookFormatKey = keyof typeof BOOK_FORMATS;

// Art Styles for Illustrations - Simplified for 2 visual book types
export const ART_STYLES = {
  // Children's Book Styles
  watercolor: {
    label: 'Watercolor',
    description: 'Soft, dreamy watercolor paintings',
    prompt: 'watercolor illustration style, soft edges, flowing colors, artistic, hand-painted look, gentle and warm',
    coverStyle: 'watercolor painting style',
    category: 'childrens',
  },
  cartoon: {
    label: 'Cartoon',
    description: 'Fun, animated cartoon style',
    prompt: 'cartoon illustration style, bold outlines, vibrant colors, expressive characters, animated look, friendly',
    coverStyle: 'cartoon animated style',
    category: 'childrens',
  },
  storybook: {
    label: 'Classic Storybook',
    description: 'Traditional children\'s book illustrations',
    prompt: 'classic storybook illustration, warm colors, gentle shading, whimsical, fairy tale aesthetic, cozy',
    coverStyle: 'classic storybook illustration',
    category: 'childrens',
  },
  fantasy: {
    label: 'Fantasy',
    description: 'Magical fantasy art with rich details',
    prompt: 'fantasy illustration style, magical atmosphere, rich vibrant colors, detailed backgrounds, enchanted lighting, mystical elements, epic scenery, fairytale magic, ethereal glow, professional fantasy book art',
    coverStyle: 'fantasy art illustration',
    category: 'childrens',
  },
  // Comic Book Styles
  noir: {
    label: 'Noir / Sin City',
    description: 'High contrast black and white',
    prompt: 'noir comic book style, high contrast black and white only, no colors, dramatic shadows, stark lighting, Frank Miller Sin City aesthetic, monochrome, ink style, cinematic',
    coverStyle: 'noir black and white comic style',
    category: 'comic',
  },
  manga: {
    label: 'Manga',
    description: 'Japanese manga black and white',
    prompt: 'manga illustration style, black and white, screentones, expressive eyes, dynamic action lines, Japanese comic aesthetic, monochrome ink style',
    coverStyle: 'manga style artwork',
    category: 'comic',
  },
  superhero: {
    label: 'Superhero',
    description: 'Classic American comic style',
    prompt: 'classic American superhero comic book style, bold colors, dynamic poses, action-packed, muscular characters, dramatic lighting, Marvel DC aesthetic',
    coverStyle: 'superhero comic book cover',
    category: 'comic',
  },
  retro: {
    label: 'Retro Comics',
    description: 'Vintage 1950s comic style',
    prompt: 'vintage 1950s comic book style, halftone dots, limited color palette, retro aesthetic, pulp comic look, classic pop art style',
    coverStyle: 'vintage retro comic cover',
    category: 'comic',
  },
} as const;

export type ArtStyleKey = keyof typeof ART_STYLES;

// Dialogue Styles for visual books
export const DIALOGUE_STYLES = {
  prose: {
    label: 'Classic Prose',
    description: 'Text displayed under images (children\'s book style)',
  },
  bubbles: {
    label: 'Speech Bubbles',
    description: 'Comic-style speech bubbles on images',
  },
} as const;

export type DialogueStyleKey = keyof typeof DIALOGUE_STYLES;

// Simplified Book Presets - Only 3 types
export const BOOK_PRESETS = {
  novel: {
    label: 'Novel',
    description: '50,000+ words, text only, EPUB download',
    icon: 'BookOpen',
    format: 'text_only',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'literary',
    targetWords: 60000,
    chapters: 20,
    priceDisplay: '$19.99',
    downloadFormat: 'epub',
  },
  childrens_picture: {
    label: "Children's Picture Book",
    description: '300-500 words with illustrations, PDF download',
    icon: 'Palette',
    format: 'picture_book',
    artStyle: 'storybook',
    dialogueStyle: 'prose',
    defaultGenre: 'childrens',
    targetWords: 500,
    chapters: 20, // Standard picture books have 24-32 pages
    priceDisplay: '$19.99',
    downloadFormat: 'pdf',
  },
  comic_story: {
    label: 'Comic Book',
    description: 'Visual story with speech bubbles, PDF download',
    icon: 'Layers',
    format: 'picture_book',
    artStyle: 'noir',
    dialogueStyle: 'bubbles',
    defaultGenre: 'ya',
    targetWords: 1000,
    chapters: 24, // Standard comic issues have 22-24 pages
    priceDisplay: '$19.99',
    downloadFormat: 'pdf',
  },
} as const;

export type BookPresetKey = keyof typeof BOOK_PRESETS;

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
  // Children's
  childrens: { label: "Children's", type: 'fiction', targetWords: 5000, chapters: 10 },
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

// Illustration dimensions for different book formats
export const ILLUSTRATION_DIMENSIONS = {
  // Picture book - full page landscape
  picture_book: {
    width: 1024,
    height: 768,
    aspectRatio: '4:3',
    prompt: 'landscape orientation (4:3 aspect ratio), full-page spread',
  },
  // Square format for social sharing
  square: {
    width: 1024,
    height: 1024,
    aspectRatio: '1:1',
    prompt: 'square format (1:1 aspect ratio)',
  },
} as const;
