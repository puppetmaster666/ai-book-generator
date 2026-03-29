/**
 * Blog topic pool and keyword rotation strategy.
 * Each keyword has multiple article angle templates to ensure variety.
 */

export interface TopicTemplate {
  primaryKeyword: string;
  title: string;
  category: 'guides' | 'tutorials' | 'tips' | 'comparisons' | 'inspiration';
  angle: string; // Brief description of the article's angle/approach
}

const YEAR = new Date().getFullYear();
const MONTH = new Date().toLocaleString('en-US', { month: 'long' });

export const TOPIC_POOL: TopicTemplate[] = [
  // AI Book Generator
  { primaryKeyword: 'AI book generator', title: `How to Write Your First Book with an AI Book Generator in ${YEAR}`, category: 'guides', angle: 'step-by-step beginner guide' },
  { primaryKeyword: 'AI book generator', title: `AI Book Generator vs Traditional Writing: Pros, Cons, and When to Use Each`, category: 'comparisons', angle: 'honest comparison' },
  { primaryKeyword: 'AI book generator', title: `7 Mistakes to Avoid When Using an AI Book Generator`, category: 'tips', angle: 'common pitfalls' },
  { primaryKeyword: 'AI book generator', title: `From Idea to Published Book in 24 Hours: An AI Book Generator Walkthrough`, category: 'tutorials', angle: 'speed-focused tutorial' },
  { primaryKeyword: 'AI book generator', title: `The Self-Publisher's Guide to AI Book Generation`, category: 'guides', angle: 'self-publishing focus' },
  { primaryKeyword: 'AI book generator', title: `How AI Book Generators Are Changing the Publishing Industry in ${YEAR}`, category: 'inspiration', angle: 'industry trends' },

  // AI Comic Book Maker
  { primaryKeyword: 'AI comic book maker', title: `How to Create a Comic Book with AI: Complete ${YEAR} Guide`, category: 'guides', angle: 'full tutorial for comics' },
  { primaryKeyword: 'AI comic book maker', title: `AI Comic Book Maker: Turn Any Story into a Visual Masterpiece`, category: 'tutorials', angle: 'story-to-comic workflow' },
  { primaryKeyword: 'AI comic book maker', title: `5 Art Styles You Can Create with an AI Comic Book Maker`, category: 'inspiration', angle: 'showcase art styles' },
  { primaryKeyword: 'AI comic book maker', title: `Manga, Noir, or Superhero? Choosing the Right Style for Your AI Comic`, category: 'tips', angle: 'style selection guide' },
  { primaryKeyword: 'AI comic book maker', title: `How to Write Dialogue for AI-Generated Comics That Actually Sounds Real`, category: 'tips', angle: 'dialogue writing tips' },
  { primaryKeyword: 'AI comic book maker', title: `Creating a Graphic Novel with AI: What Works and What Doesn't`, category: 'comparisons', angle: 'realistic expectations' },

  // AI Novel Writer
  { primaryKeyword: 'AI novel writer', title: `Can AI Write a Novel? What ${YEAR}'s Technology Actually Delivers`, category: 'comparisons', angle: 'realistic assessment' },
  { primaryKeyword: 'AI novel writer', title: `How to Use an AI Novel Writer Without Losing Your Creative Voice`, category: 'guides', angle: 'maintaining authorship' },
  { primaryKeyword: 'AI novel writer', title: `AI Novel Writer: Generate a 60,000-Word Book in Under an Hour`, category: 'tutorials', angle: 'speed and scale' },
  { primaryKeyword: 'AI novel writer', title: `The Best Genres for AI Novel Writing (And Which Ones to Avoid)`, category: 'tips', angle: 'genre suitability' },
  { primaryKeyword: 'AI novel writer', title: `From NaNoWriMo to AI: How Novel Writers Are Embracing Technology`, category: 'inspiration', angle: 'community perspective' },

  // Write a Book with AI
  { primaryKeyword: 'write a book with AI', title: `How to Write a Book with AI: The Complete Beginner's Guide`, category: 'guides', angle: 'absolute beginner' },
  { primaryKeyword: 'write a book with AI', title: `Write a Book with AI in ${YEAR}: Tools, Tips, and What to Expect`, category: 'guides', angle: 'tool landscape overview' },
  { primaryKeyword: 'write a book with AI', title: `10 Book Ideas You Can Write with AI This Weekend`, category: 'inspiration', angle: 'quick project ideas' },
  { primaryKeyword: 'write a book with AI', title: `Writing a Non-Fiction Book with AI: From Outline to Published`, category: 'tutorials', angle: 'non-fiction focus' },

  // AI Script Writer
  { primaryKeyword: 'AI script writer', title: `How to Write a Screenplay with AI: A Screenwriter's Honest Review`, category: 'comparisons', angle: 'practitioner perspective' },
  { primaryKeyword: 'AI script writer', title: `AI Script Writer: Generate Film-Quality Screenplays with Save the Cat Structure`, category: 'tutorials', angle: 'structure-focused' },
  { primaryKeyword: 'AI script writer', title: `Can AI Write Movie Scripts? We Tested It — Here's What Happened`, category: 'comparisons', angle: 'hands-on test' },
  { primaryKeyword: 'AI script writer', title: `5 Ways to Improve AI-Generated Screenplays`, category: 'tips', angle: 'refinement techniques' },

  // Self-publishing with AI
  { primaryKeyword: 'self-publishing with AI', title: `Self-Publishing with AI in ${YEAR}: Everything You Need to Know`, category: 'guides', angle: 'comprehensive overview' },
  { primaryKeyword: 'self-publishing with AI', title: `How AI Is Making Self-Publishing Accessible to Everyone`, category: 'inspiration', angle: 'democratization angle' },
  { primaryKeyword: 'self-publishing with AI', title: `The Cost of Self-Publishing with AI vs Traditional Methods`, category: 'comparisons', angle: 'cost comparison' },

  // AI Children's Book
  { primaryKeyword: 'AI children\'s book', title: `How to Create a Children's Book with AI: A Parent's Guide`, category: 'guides', angle: 'parent-focused' },
  { primaryKeyword: 'AI children\'s book', title: `Make a Personalized Children's Book with AI in Minutes`, category: 'tutorials', angle: 'personalization angle' },
  { primaryKeyword: 'AI children\'s book', title: `AI Children's Book Illustrations: Watercolor, Cartoon, or Storybook Style?`, category: 'tips', angle: 'art style guide' },
  { primaryKeyword: 'AI children\'s book', title: `Creating Bedtime Stories with AI: A New Way to Bond with Your Kids`, category: 'inspiration', angle: 'emotional angle' },

  // Create a Comic with AI
  { primaryKeyword: 'create a comic with AI', title: `Create a Comic with AI: No Drawing Skills Required`, category: 'guides', angle: 'accessibility angle' },
  { primaryKeyword: 'create a comic with AI', title: `How to Create a Comic with AI That People Actually Want to Read`, category: 'tips', angle: 'quality focus' },
  { primaryKeyword: 'create a comic with AI', title: `From Script to Panels: The AI Comic Creation Process Explained`, category: 'tutorials', angle: 'process breakdown' },
];

// Internal link mappings for post-processing
export const INTERNAL_LINKS: Record<string, string> = {
  'AI book generator': '/ai-book-generator',
  'ai book generator': '/ai-book-generator',
  'create a book': '/create',
  'write a book': '/create',
  'comic book maker': '/ai-comic-book-maker',
  'create a comic': '/ai-comic-book-maker',
  'AI comic': '/ai-comic-book-maker',
  'children\'s book': '/ai-childrens-book-generator',
  'AI novel writer': '/ai-novel-writer',
  'write a novel': '/ai-novel-writer',
  'how it works': '/how-it-works',
  'DraftMyBook': '/',
};
