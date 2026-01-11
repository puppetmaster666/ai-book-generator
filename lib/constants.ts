// Pricing
export const PRICING = {
  // Single generation purchase (any type)
  ONE_TIME: {
    price: 999, // cents
    priceDisplay: '$9.99',
    credits: 1,
  },
  // Author Plan - monthly subscription with rollover
  MONTHLY: {
    price: 3900,
    priceDisplay: '$39',
    credits: 5,
    interval: 'month',
    rollover: true, // unused credits roll over to next month
  },
  // Visual books use same pricing as text
  VISUAL: {
    price: 999, // cents
    priceDisplay: '$9.99',
  },
} as const;

// Free tier limits - hard stop at these limits for unpaid users
export const FREE_TIER_LIMITS = {
  text_only: { chapters: 1, description: '1 chapter preview' },
  picture_book: { panels: 5, description: '5 panels preview' },
  screenplay: { pages: 5, description: '5 pages preview' },
} as const;

// Note: Length tiers have been replaced with expanded BOOK_PRESETS.
// Users now select the specific book type with built-in length (e.g., short_novel, novel, epic_novel).
// Word count/chapters can be adjusted in the book review page if needed.

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
  screenplay: {
    label: 'Screenplay',
    description: 'Industry-standard movie script format',
    illustrationsPerChapter: 0,
    priceKey: 'ONE_TIME',
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
    prompt: 'STRICT MONOCHROME: noir comic book style, ABSOLUTELY NO COLORS - pure black and white only, grayscale only, high contrast shadows, stark lighting, Frank Miller Sin City aesthetic, ink-heavy style, cinematic. CRITICAL: Use ONLY black, white, and shades of gray - NO colors whatsoever',
    coverStyle: 'noir black and white comic style, pure monochrome',
    category: 'comic',
  },
  manga: {
    label: 'Manga',
    description: 'Japanese anime-style with vibrant colors',
    prompt: 'anime illustration style, vibrant colors, expressive eyes, dynamic action lines, Japanese anime aesthetic, clean linework, cel-shaded coloring, beautiful detailed backgrounds',
    coverStyle: 'anime style artwork with vibrant colors',
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

// Book Presets - includes length variants so users pick everything upfront
export const BOOK_PRESETS = {
  // === NOVELS ===
  short_novel: {
    label: 'Short Novel',
    description: '80-120 pages (~25,000 words), EPUB download',
    icon: 'BookOpen',
    format: 'text_only',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'literary',
    targetWords: 25000,
    chapters: 12,
    priceDisplay: '$9.99',
    downloadFormat: 'epub',
    contentRating: 'general',
    estimatedTime: '~15 min',
  },
  novel: {
    label: 'Novel',
    description: '200-250 pages (~60,000 words), EPUB download',
    icon: 'BookOpen',
    format: 'text_only',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'literary',
    targetWords: 60000,
    chapters: 20,
    priceDisplay: '$9.99',
    downloadFormat: 'epub',
    contentRating: 'general',
    estimatedTime: '~30 min',
  },
  epic_novel: {
    label: 'Epic Novel',
    description: '350-450 pages (~100,000 words), EPUB download',
    icon: 'BookOpen',
    format: 'text_only',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'literary',
    targetWords: 100000,
    chapters: 32,
    priceDisplay: '$9.99',
    downloadFormat: 'epub',
    contentRating: 'general',
    estimatedTime: '~60 min',
  },

  // === VISUAL BOOKS ===
  childrens_picture: {
    label: "Children's Picture Book",
    description: '20 illustrated pages, PDF download',
    icon: 'Palette',
    format: 'picture_book',
    artStyle: 'storybook',
    dialogueStyle: 'prose',
    defaultGenre: 'childrens',
    targetWords: 500,
    chapters: 20,
    priceDisplay: '$9.99',
    downloadFormat: 'pdf',
    contentRating: 'childrens',
    estimatedTime: '~10 min',
  },
  comic_story: {
    label: 'Comic Book',
    description: '24 panels with speech bubbles, PDF download',
    icon: 'Layers',
    format: 'picture_book',
    artStyle: 'noir',
    dialogueStyle: 'bubbles',
    defaultGenre: 'ya',
    targetWords: 1000,
    chapters: 24,
    priceDisplay: '$9.99',
    downloadFormat: 'pdf',
    contentRating: 'general',
    estimatedTime: '~12 min',
  },
  adult_comic: {
    label: 'Graphic Novel',
    description: '24 panels, dramatic themes, PDF download',
    icon: 'Skull',
    format: 'picture_book',
    artStyle: 'noir',
    dialogueStyle: 'bubbles',
    defaultGenre: 'horror',
    targetWords: 1200,
    chapters: 24,
    priceDisplay: '$9.99',
    downloadFormat: 'pdf',
    contentRating: 'mature',
    estimatedTime: '~12 min',
  },

  // === NON-FICTION ===
  lead_magnet: {
    label: 'Short Guide',
    description: '20-30 pages, perfect for lead magnets',
    icon: 'FileText',
    format: 'text_only',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'howto',
    targetWords: 7500,
    chapters: 5,
    priceDisplay: '$9.99',
    downloadFormat: 'epub',
    contentRating: 'general',
    estimatedTime: '~5 min',
  },
  nonfiction: {
    label: 'Non-Fiction Book',
    description: '150-200 pages, self-help/how-to/business',
    icon: 'GraduationCap',
    format: 'text_only',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'selfhelp',
    targetWords: 50000,
    chapters: 15,
    priceDisplay: '$9.99',
    downloadFormat: 'epub',
    contentRating: 'general',
    estimatedTime: '~25 min',
  },

  // === SCREENPLAYS - FILM ===
  short_screenplay: {
    label: 'Short Film Script',
    description: '30-45 pages (~30-45 min runtime), PDF download',
    icon: 'Film',
    format: 'screenplay',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'thriller_film',
    targetPages: 40,
    sequences: 4,
    priceDisplay: '$9.99',
    downloadFormat: 'pdf',
    contentRating: 'mature',
    estimatedTime: '~15 min',
  },
  screenplay: {
    label: 'Feature Film Script',
    description: '90-110 pages (~90-110 min runtime), PDF download',
    icon: 'Film',
    format: 'screenplay',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'thriller_film',
    targetPages: 100,
    sequences: 8,
    priceDisplay: '$9.99',
    downloadFormat: 'pdf',
    contentRating: 'mature',
    estimatedTime: '~35 min',
  },
  epic_screenplay: {
    label: 'Epic Film Script',
    description: '120-150 pages (~2-2.5 hr runtime), PDF download',
    icon: 'Film',
    format: 'screenplay',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'thriller_film',
    targetPages: 135,
    sequences: 10,
    priceDisplay: '$9.99',
    downloadFormat: 'pdf',
    contentRating: 'mature',
    estimatedTime: '~50 min',
  },

  // === SCREENPLAYS - TV ===
  tv_pilot_comedy: {
    label: 'TV Pilot (Comedy)',
    description: '25-35 pages, half-hour sitcom/comedy pilot',
    icon: 'Film',
    format: 'screenplay',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'comedy_film',
    targetPages: 30,
    sequences: 3, // 3-act structure for half-hour
    priceDisplay: '$9.99',
    downloadFormat: 'pdf',
    contentRating: 'general',
    estimatedTime: '~12 min',
  },
  tv_pilot_drama: {
    label: 'TV Pilot (Drama)',
    description: '55-65 pages, hour-long drama pilot',
    icon: 'Film',
    format: 'screenplay',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'drama_film',
    targetPages: 60,
    sequences: 5, // 5-act structure for hour-long drama
    priceDisplay: '$9.99',
    downloadFormat: 'pdf',
    contentRating: 'mature',
    estimatedTime: '~25 min',
  },
  tv_episode: {
    label: 'TV Episode',
    description: '45-55 pages, series episode (drama format)',
    icon: 'Film',
    format: 'screenplay',
    artStyle: null,
    dialogueStyle: null,
    defaultGenre: 'drama_film',
    targetPages: 50,
    sequences: 5,
    priceDisplay: '$9.99',
    downloadFormat: 'pdf',
    contentRating: 'mature',
    estimatedTime: '~20 min',
  },
} as const;

export type BookPresetKey = keyof typeof BOOK_PRESETS;

// Content rating definitions - affects generation prompts
export const CONTENT_RATINGS = {
  childrens: {
    label: 'Children',
    description: 'Age-appropriate for young readers',
    allowSwearing: false,
    allowViolence: false,
    allowRomance: false,
  },
  general: {
    label: 'General',
    description: 'Suitable for most audiences',
    allowSwearing: false,
    allowViolence: 'mild', // "pushed him back"
    allowRomance: 'mild', // "they kissed"
  },
  mature: {
    label: 'Mature',
    description: 'Dark themes, edgy content, intense drama',
    allowSwearing: true,
    allowViolence: 'suggested', // "the gun fired, blood dripped from his chest"
    allowRomance: 'suggested', // "they fell into bed together, kissing passionately"
  },
} as const;

export type ContentRatingKey = keyof typeof CONTENT_RATINGS;

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
  history: { label: 'History', type: 'non-fiction', targetWords: 60000, chapters: 18 },
  biography: { label: 'Biography', type: 'non-fiction', targetWords: 70000, chapters: 20 },
  educational: { label: 'Educational', type: 'non-fiction', targetWords: 45000, chapters: 14 },
  documentary: { label: 'Documentary', type: 'non-fiction', targetWords: 55000, chapters: 16 },
  // Screenplay/Film genres (pages not words, sequences not chapters)
  action_film: { label: 'Action', type: 'screenplay', targetPages: 110, sequences: 8 },
  thriller_film: { label: 'Thriller', type: 'screenplay', targetPages: 100, sequences: 8 },
  drama_film: { label: 'Drama', type: 'screenplay', targetPages: 120, sequences: 8 },
  comedy_film: { label: 'Comedy', type: 'screenplay', targetPages: 95, sequences: 8 },
  scifi_film: { label: 'Sci-Fi', type: 'screenplay', targetPages: 115, sequences: 8 },
  horror_film: { label: 'Horror', type: 'screenplay', targetPages: 90, sequences: 8 },
  romcom_film: { label: 'Romantic Comedy', type: 'screenplay', targetPages: 100, sequences: 8 },
  crime_film: { label: 'Crime/Heist', type: 'screenplay', targetPages: 105, sequences: 8 },
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
