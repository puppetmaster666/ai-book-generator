// Pricing - Two tiers: text ($4.99) and visual ($6.99)
export const PRICING = {
  // Single text book purchase (novels, non-fiction, screenplays)
  ONE_TIME: {
    price: 499, // cents
    priceDisplay: '$4.99',
    credits: 1,
  },
  // Single visual book purchase (comics, picture books)
  VISUAL: {
    price: 699, // cents
    priceDisplay: '$6.99',
  },
  // Upgrade from free preview (discounted)
  UPGRADE: {
    price: 399, // cents
    priceDisplay: '$3.99',
  },
  // Roast book (12 panels)
  ROAST: {
    price: 199, // cents
    priceDisplay: '$1.99',
  },
  // Subscriptions - credit-based with rollover
  STARTER_MONTHLY: {
    price: 1999, // cents
    priceDisplay: '$19.99',
    credits: 600,
    interval: 'month',
    rollover: true,
  },
  STARTER_YEARLY: {
    price: 17988, // cents ($14.99/mo)
    priceDisplay: '$179.88',
    priceMonthly: '$14.99',
    credits: 7200,
    interval: 'year',
    rollover: true,
  },
  AUTHOR_MONTHLY: {
    price: 3999, // cents
    priceDisplay: '$39.99',
    credits: 1500,
    interval: 'month',
    rollover: true,
  },
  AUTHOR_YEARLY: {
    price: 35988, // cents ($29.99/mo)
    priceDisplay: '$359.88',
    priceMonthly: '$29.99',
    credits: 18000,
    interval: 'year',
    rollover: true,
  },
  PRO_MONTHLY: {
    price: 6999, // cents
    priceDisplay: '$69.99',
    credits: 4000,
    interval: 'month',
    rollover: true,
  },
  PRO_YEARLY: {
    price: 62988, // cents ($52.49/mo)
    priceDisplay: '$629.88',
    priceMonthly: '$52.49',
    credits: 48000,
    interval: 'year',
    rollover: true,
  },
  // Legacy - keep for backward compat
  MONTHLY: {
    price: 2900,
    priceDisplay: '$29',
    credits: 5,
    interval: 'month',
    rollover: true,
  },
  YEARLY: {
    price: 27900,
    priceDisplay: '$279',
    priceMonthly: '$23.25',
    credits: 60,
    interval: 'year',
    rollover: true,
  },
} as const;

// Credit costs per generation type
export const CREDIT_COSTS: Record<string, number> = {
  lead_magnet: 30,
  tv_pilot_comedy: 30,
  short_screenplay: 40,
  tv_pilot_drama: 50,
  tv_episode: 50,
  short_novel: 80,
  screenplay: 80,
  epic_screenplay: 100,
  nonfiction: 100,
  novel: 120,
  epic_novel: 200,
  childrens_picture: 200,
  comic_story: 250,
  adult_comic: 250,
  roast_comic: 100, // $1.99 roast book (12 panels)
};

// Credit packs - one-time credit purchases (no subscription)
export const CREDIT_PACKS = {
  single: { credits: 250, price: 499, priceDisplay: '$4.99', label: 'Single Book' },
  five_pack: { credits: 1100, price: 1999, priceDisplay: '$19.99', label: '5-Pack' },
  ten_pack: { credits: 2200, price: 3499, priceDisplay: '$34.99', label: '10-Pack' },
} as const;

// Plan display names
export const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  starter_monthly: 'Starter',
  starter_yearly: 'Starter (Yearly)',
  author_monthly: 'Author',
  author_yearly: 'Author (Yearly)',
  pro_monthly: 'Pro',
  pro_yearly: 'Pro (Yearly)',
  // Legacy
  monthly: 'Author (Legacy)',
  yearly: 'Author Yearly (Legacy)',
};

// Get credit cost for a book preset
export function getCreditCost(bookPreset: string | null): number {
  if (!bookPreset) return 120; // Default to novel cost
  return CREDIT_COSTS[bookPreset] || 120;
}

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
    prompt: 'professional watercolor illustration, wet-on-wet technique with visible paper grain and pigment blooms, soft translucent color washes that bleed at edges, warm muted palette with occasional saturated accents, deckled soft edges, hand-painted texture with visible brushstrokes, light pencil underdrawing showing through washes, atmospheric depth through layered transparent glazes, inspired by Jerry Pinkney and Lisbeth Zwerger picture book art, museum-quality children\'s book illustration',
    coverStyle: 'watercolor painting with visible paper texture and soft pigment bleeds',
    category: 'childrens',
  },
  cartoon: {
    label: 'Cartoon',
    description: 'Fun, animated cartoon style',
    prompt: 'premium animation-quality cartoon illustration, thick clean black outlines with consistent 3px weight, flat cel-shaded coloring with subtle gradient shadows, exaggerated expressive character proportions (large heads, small bodies), vibrant saturated color palette with complementary color theory, smooth vector-clean edges, dynamic squash-and-stretch poses, Pixar-meets-Cartoon-Network quality, rich detailed backgrounds with depth layers (foreground/midground/background), professional character design with appeal and silhouette readability',
    coverStyle: 'premium animated cartoon style with bold clean lines and vibrant colors',
    category: 'childrens',
  },
  storybook: {
    label: 'Classic Storybook',
    description: 'Traditional children\'s book illustrations',
    prompt: 'classic children\'s book illustration in the tradition of Beatrix Potter and Arthur Rackham, fine cross-hatching and ink wash technique, muted earth-tone palette (ochre, sage, dusty rose, cream) with selective warm accents, detailed naturalistic backgrounds with whimsical elements, hand-drawn texture with visible pen strokes, gentle dappled lighting through leaves and windows, cozy intimate compositions, antique book plate quality with aged paper warmth, charming character expressions with old-world craftsmanship',
    coverStyle: 'classic illustrated book plate with cross-hatching and muted earth tones',
    category: 'childrens',
  },
  fantasy: {
    label: 'Fantasy',
    description: 'Magical fantasy art with rich details',
    prompt: 'breathtaking fantasy illustration with luminous magical lighting, oil-on-canvas painterly texture with visible impasto brushwork, rich jewel-tone palette (emerald, sapphire, amethyst, gold), epic sense of scale with layered atmospheric perspective, Ghibli-inspired background depth and environmental storytelling, magical particle effects (floating lights, glowing runes, sparkle dust), dramatic chiaroscuro lighting with warm-cool contrast, enchanted forest and castle environments with intricate architectural detail, professional fantasy book art inspired by Brian Froud, Alan Lee, and Studio Ghibli',
    coverStyle: 'epic fantasy painting with luminous lighting and jewel-tone colors',
    category: 'childrens',
  },
  // Comic Book Styles
  noir: {
    label: 'Noir / Sin City',
    description: 'High contrast black and white',
    prompt: 'STRICT MONOCHROME noir graphic novel, ABSOLUTELY NO COLORS - pure black and white only. Heavy India ink style with stark chiaroscuro contrast, deep pooling blacks consuming 60%+ of frame, razor-sharp light edges cutting through darkness, Frank Miller Sin City aesthetic with Mike Mignola shadow blocking, dramatic German Expressionist angles, rain-slicked surfaces reflecting harsh light, cigarette smoke wisps in spotlight beams, venetian blind shadow patterns, gritty urban atmosphere. CRITICAL: Use ONLY black, white, and shades of gray - NO colors whatsoever',
    coverStyle: 'noir black and white graphic novel with heavy ink shadows and stark contrast',
    category: 'comic',
  },
  manga: {
    label: 'Manga',
    description: 'Japanese anime-style with vibrant colors',
    prompt: 'professional Japanese manga illustration with clean G-pen inking and screentone shading, vibrant cel-shaded coloring with precise highlight placement, large expressive eyes with detailed iris reflections, dynamic speed lines and motion blur for action, beautiful painted backgrounds with Makoto Shinkai-level atmospheric lighting, character designs with distinct anime face shapes and proportions, hair rendered with individual strand detail and glossy highlights, emotional micro-expressions (sweat drops, blush lines, sparkle effects), panel-ready composition with strong foreground-background separation',
    coverStyle: 'vibrant Japanese anime artwork with detailed cel-shading and expressive characters',
    category: 'comic',
  },
  superhero: {
    label: 'Superhero',
    description: 'Classic American comic style',
    prompt: 'premium American comic book illustration, bold black inking with dynamic line weight variation (thick outlines, thin details), dramatic foreshortening and heroic perspective angles, vivid saturated colors with Ben-Day dot halftone texture, Kirby Krackle energy effects for power displays, muscular anatomically dynamic poses with cape and fabric flow physics, dramatic rim lighting and color holds, detailed urban environments with forced perspective depth, professional sequential art quality inspired by Jim Lee, Alex Ross, and Jack Kirby, Silver Age grandeur meets modern rendering',
    coverStyle: 'dynamic superhero comic art with bold inking, heroic poses, and vivid colors',
    category: 'comic',
  },
  retro: {
    label: 'Retro Comics',
    description: 'Vintage 1950s comic style',
    prompt: 'authentic vintage 1950s-60s comic book style with visible halftone Ben-Day dot printing pattern, limited CMYK four-color process palette (primary red, blue, yellow with black), aged yellowed newsprint paper texture, offset printing registration artifacts (slight color misalignment), bold simplified character designs with thick confident ink lines, classic pop art compositions inspired by Roy Lichtenstein and Jack Kirby, melodramatic expressions and dynamic sound effect typography, retro speech bubbles with hand-lettered style text, Silver Age comic book aesthetic with authentic period printing imperfections',
    coverStyle: 'vintage 1950s comic cover with halftone dots, yellowed paper, and limited color palette',
    category: 'comic',
  },
  // Roast-specific Styles
  shonen: {
    label: 'Shonen Anime',
    description: 'Sharp dramatic anime with bold action poses',
    prompt: 'professional shonen anime illustration in the style of Buso Renkin and Bleach, sharp clean ink outlines with dynamic line weight, vibrant saturated cel-shaded coloring with hard shadow edges, dramatic lighting with rim-light highlights and lens flare accents, spiky detailed hair with individual strand rendering, large expressive eyes with intense reflections, exaggerated dynamic action poses with foreshortening, speed lines and energy effects radiating from characters, detailed costume and weapon designs with metallic sheen, bold dramatic compositions with diagonal framing, high-contrast color palette with deep blacks and vivid highlights, professional Japanese animation production quality',
    coverStyle: 'dynamic shonen anime art with sharp lines, dramatic poses, and vibrant cel-shading',
    category: 'comic',
  },
  animated: {
    label: 'Western Animation',
    description: 'Clean animated style like classic cartoons',
    prompt: 'premium Western animation illustration in the style of Batman: The Animated Series and modern Disney animation, clean geometric character designs with strong angular silhouettes, art deco influenced backgrounds with simplified architectural forms, dramatic noir-inspired lighting with bold colored shadows (no black shadows, use deep blues and purples), flat cel-shaded coloring with limited but striking palette, thick confident outlines with consistent weight, exaggerated but grounded character proportions, cinematic widescreen compositions with dramatic camera angles, moody atmospheric backgrounds with gradient skies, stylized but expressive facial features with strong jawlines and distinctive profiles, professional broadcast animation quality',
    coverStyle: 'stylized Western animation art with clean shapes, dramatic lighting, and bold color palette',
    category: 'comic',
  },
  realistic: {
    label: 'Realistic',
    description: 'Photorealistic cinematic style',
    prompt: 'photorealistic cinematic illustration with professional photography quality, natural skin textures with subsurface scattering and visible pores, accurate facial anatomy with realistic proportions and bone structure, cinematic shallow depth-of-field with bokeh background blur, professional studio or natural lighting with soft diffused key light and subtle fill, detailed fabric textures and realistic clothing wrinkles, environmental storytelling with real-world settings, color graded with film-like tonal curve (slight teal shadows, warm highlights), hyperrealistic hair rendering with individual strands catching light, photographically accurate eye detail with realistic iris patterns, 35mm or 85mm lens perspective, editorial photography meets graphic novel realism',
    coverStyle: 'photorealistic cinematic portrait with professional lighting and film-quality color grading',
    category: 'comic',
  },
  puppet: {
    label: 'Puppet / Doll',
    description: 'Marionette puppet style like Team America',
    prompt: 'Team America World Police marionette puppet style illustration, characters as realistic wooden and plastic marionette dolls with visible ball joints at shoulders elbows and knees, slightly oversized heads with painted-on facial features and glassy fixed eyes, stiff awkward puppet poses with dangling limbs and unnatural body angles suggesting string control from above, waxy plastic skin texture with visible seam lines along jaw and forehead, miniature set environments built from painted foam and balsa wood, slightly uncanny valley aesthetic mixing realistic detail with obvious artificiality, soft studio lighting on miniature diorama sets, characters wearing meticulously detailed tiny fabric costumes, comedic deadpan expressions on molded plastic faces, stop-motion animation frame quality with shallow depth of field on miniature scale',
    coverStyle: 'Team America style marionette puppet characters with visible joints on miniature sets',
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
    priceDisplay: '$4.99',
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
    priceDisplay: '$4.99',
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
    priceDisplay: '$4.99',
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
    priceDisplay: '$6.99',
    downloadFormat: 'pdf',
    contentRating: 'childrens',
    estimatedTime: '~10 min',
  },
  roast_comic: {
    label: 'Roast Book',
    description: '12 panels roasting your friend, PDF download',
    icon: 'Flame',
    format: 'picture_book',
    artStyle: 'shonen',
    dialogueStyle: 'bubbles',
    defaultGenre: 'comedy',
    targetWords: 600,
    chapters: 12,
    priceDisplay: '$1.99',
    downloadFormat: 'pdf',
    contentRating: 'mature',
    estimatedTime: '~10 min',
    skipFreePreview: true,
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
    priceDisplay: '$6.99',
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
    priceDisplay: '$6.99',
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
    priceDisplay: '$4.99',
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
    priceDisplay: '$4.99',
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
    priceDisplay: '$4.99',
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
    priceDisplay: '$4.99',
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
    priceDisplay: '$4.99',
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
    priceDisplay: '$4.99',
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
    priceDisplay: '$4.99',
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
    priceDisplay: '$4.99',
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
