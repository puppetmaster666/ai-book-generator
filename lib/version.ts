/**
 * App version and changelog.
 * Update this file with each release.
 */

export const APP_VERSION = '2.5.1';

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.5.1',
    date: '2026-04-02',
    title: 'Writing Quality & UI Polish',
    highlights: [
      'Books and screenplays now read more naturally with improved writing engine',
      'Surprise Me ideas are now far more creative and varied every time you click',
      'Book page redesigned with cleaner layout and consistent styling',
      'You can now expand and read the full premise on any book page',
      'Added back button to the creation flow so you can go back and edit your idea',
      'Sharper blog cover images with better visual quality',
      'Duplicate tags removed from book detail pages',
    ],
  },
  {
    version: '2.5.0',
    date: '2026-04-02',
    title: 'Picture Books & Reliability Overhaul',
    highlights: [
      'Completely redesigned picture book engine with richer stories, varied layouts, and professional text integration',
      'Upgraded art styles across the board: watercolor, cartoon, storybook, fantasy, and all comic styles now look stunning',
      'Books now generate much more reliably with fewer failures and automatic recovery',
      'Credit counter and notification bell always visible in the header',
      'Content that can\'t be generated is automatically softened and retried',
      'If something still fails, your credit is refunded automatically',
      'Prompt history: reuse your previous ideas when creating a new book',
      'Screenplays now write like real scripts with sharper dialogue, varied scene lengths, and no more robotic patterns',
    ],
  },
  {
    version: '2.4.0',
    date: '2026-03-29',
    title: 'Major Comic & Screenplay Upgrade',
    highlights: [
      'Richer comic stories with real dialogue and narration boxes',
      'Consistent character appearance across all panels',
      'Higher quality text generation across all book types',
      'More natural screenplay dialogue with deeper character voices',
      'Longer books now generate reliably without timeouts',
    ],
  },
  {
    version: '2.3.0',
    date: '2026-03-29',
    title: 'New Blog & Navigation Improvements',
    highlights: [
      'New weekly blog with writing tips and inspiration',
      'Improved site navigation on desktop',
      'Pricing page now shows all available plans',
    ],
  },
  {
    version: '2.2.0',
    date: '2026-03-29',
    title: 'Reliability & Quality of Life',
    highlights: [
      'Books that get stuck now automatically retry',
      'Gift credits to friends by email',
      'Smoother error handling throughout the site',
      'Step-by-step progress with time estimates during generation',
    ],
  },
];

// Get the latest changelog entry
export function getLatestChangelog(): ChangelogEntry {
  return CHANGELOG[0];
}
