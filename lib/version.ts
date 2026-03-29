/**
 * App version and changelog.
 * Update this file with each release.
 */

export const APP_VERSION = '2.4.0';

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
