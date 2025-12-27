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
  // Illustrated books
  ILLUSTRATED: {
    price: 2999, // cents - illustrated chapter book
    priceDisplay: '$29.99',
  },
  CHILDRENS: {
    price: 3999, // cents - full picture book
    priceDisplay: '$39.99',
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
  illustrated: {
    label: 'Illustrated',
    description: '1 illustration per chapter',
    illustrationsPerChapter: 1,
    priceKey: 'ILLUSTRATED',
  },
  picture_book: {
    label: 'Picture Book',
    description: 'Full-page illustrations throughout',
    illustrationsPerChapter: 2, // 2 per spread
    priceKey: 'CHILDRENS',
  },
} as const;

export type BookFormatKey = keyof typeof BOOK_FORMATS;

// Art Styles for Illustrations
export const ART_STYLES = {
  watercolor: {
    label: 'Watercolor',
    description: 'Soft, dreamy watercolor paintings',
    prompt: 'watercolor illustration style, soft edges, flowing colors, artistic, hand-painted look',
    coverStyle: 'watercolor painting style',
  },
  cartoon: {
    label: 'Cartoon',
    description: 'Fun, animated cartoon style',
    prompt: 'cartoon illustration style, bold outlines, vibrant colors, expressive characters, animated look',
    coverStyle: 'cartoon animated style',
  },
  storybook: {
    label: 'Classic Storybook',
    description: 'Traditional children\'s book illustrations',
    prompt: 'classic storybook illustration, warm colors, gentle shading, whimsical, fairy tale aesthetic',
    coverStyle: 'classic storybook illustration',
  },
  modern: {
    label: 'Modern Minimal',
    description: 'Clean, contemporary illustrations',
    prompt: 'modern minimalist illustration, clean lines, limited color palette, geometric shapes, contemporary design',
    coverStyle: 'modern minimalist design',
  },
  realistic: {
    label: 'Realistic',
    description: 'Detailed, lifelike artwork',
    prompt: 'realistic detailed illustration, lifelike rendering, rich textures, photorealistic elements',
    coverStyle: 'realistic detailed artwork',
  },
  manga: {
    label: 'Manga/Anime',
    description: 'Japanese manga-inspired art',
    prompt: 'manga anime illustration style, expressive eyes, dynamic poses, Japanese comic aesthetic',
    coverStyle: 'manga anime style artwork',
  },
  vintage: {
    label: 'Vintage',
    description: 'Retro, nostalgic artwork',
    prompt: 'vintage retro illustration, muted colors, nostalgic feel, mid-century aesthetic, classic book art',
    coverStyle: 'vintage retro book cover',
  },
  fantasy: {
    label: 'Fantasy Art',
    description: 'Epic, magical fantasy artwork',
    prompt: 'fantasy art illustration, magical atmosphere, epic lighting, detailed fantasy world, enchanting',
    coverStyle: 'epic fantasy book cover art',
  },
} as const;

export type ArtStyleKey = keyof typeof ART_STYLES;

// Dialogue Styles for visual books
export const DIALOGUE_STYLES = {
  prose: {
    label: 'Classic Prose',
    description: 'Text displayed under or around images (traditional picture book style)',
  },
  bubbles: {
    label: 'Speech Bubbles',
    description: 'Comic-style speech bubbles overlaid on images',
  },
} as const;

export type DialogueStyleKey = keyof typeof DIALOGUE_STYLES;

// Quick Book Presets (simplified creation)
export const BOOK_PRESETS = {
  novel: {
    label: 'Novel',
    description: '50,000+ words, no illustrations',
    icon: 'BookOpen',
    format: 'text_only',
    artStyle: null,
    dialogueStyle: null, // No dialogue style for text-only
    defaultGenre: 'literary',
    targetWords: 60000,
    chapters: 20,
    priceDisplay: '$19.99',
  },
  childrens_picture: {
    label: "Children's Picture Book",
    description: '300-500 words with full illustrations',
    icon: 'Palette',
    format: 'picture_book',
    artStyle: 'storybook',
    dialogueStyle: 'prose', // Text under images
    defaultGenre: 'childrens',
    targetWords: 500, // Reduced from 1000 - picture books are minimal text
    chapters: 12, // 12 pages/spreads
    priceDisplay: '$39.99',
  },
  childrens_chapter: {
    label: "Children's Chapter Book",
    description: '5,000-10,000 words with illustrations',
    icon: 'BookMarked',
    format: 'illustrated',
    artStyle: 'cartoon',
    dialogueStyle: 'prose',
    defaultGenre: 'childrens',
    targetWords: 8000, // Reduced from 10000
    chapters: 10,
    priceDisplay: '$29.99',
  },
  illustrated_novel: {
    label: 'Illustrated Novel',
    description: '30,000+ words with chapter art',
    icon: 'Image',
    format: 'illustrated',
    artStyle: 'fantasy',
    dialogueStyle: 'prose',
    defaultGenre: 'fantasy',
    targetWords: 40000,
    chapters: 15,
    priceDisplay: '$29.99',
  },
  comic_story: {
    label: 'Comic/Graphic Story',
    description: 'Visual storytelling with speech bubbles',
    icon: 'Layers',
    format: 'picture_book',
    artStyle: 'manga',
    dialogueStyle: 'bubbles', // Speech bubbles for comics
    defaultGenre: 'ya',
    targetWords: 800, // Reduced from 3000 - comics are mostly visual
    chapters: 20, // 20 panels/pages
    priceDisplay: '$39.99',
  },
  self_help: {
    label: 'Self-Help Book',
    description: 'Practical advice, no illustrations',
    icon: 'Lightbulb',
    format: 'text_only',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'selfhelp',
    targetWords: 45000,
    chapters: 12,
    priceDisplay: '$19.99',
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
  // Standard illustrated novel - portrait orientation
  illustrated: {
    width: 768,
    height: 1024,
    aspectRatio: '3:4',
    prompt: 'portrait orientation (3:4 aspect ratio)',
  },
  // Picture book - full page/spread landscape
  picture_book: {
    width: 1024,
    height: 768,
    aspectRatio: '4:3',
    prompt: 'landscape orientation (4:3 aspect ratio), full-page spread',
  },
  // Square format (alternative)
  square: {
    width: 1024,
    height: 1024,
    aspectRatio: '1:1',
    prompt: 'square format (1:1 aspect ratio)',
  },
} as const;
