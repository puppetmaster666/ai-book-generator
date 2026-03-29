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
      'New 4-step comic pipeline: better stories, real dialogue, narration boxes',
      'Character consistency: portrait references now used in every panel',
      'Upgraded to Gemini 3.1 Pro for all text generation',
      'Screenplay dialogue refinement pass for subtext and voice',
      'Extended generation timeout to 13 minutes (Fluid Compute)',
    ],
  },
  {
    version: '2.3.0',
    date: '2026-03-29',
    title: 'SEO, Blog & Conversion Fixes',
    highlights: [
      'Automated weekly blog with AI-generated articles and cover images',
      'Fixed 3 SEO landing pages invisible to Google',
      'Added GA4 conversion tracking (purchase, checkout, signup)',
      'Desktop nav links now visible (not hidden behind menu)',
      'Pricing page now shows all 4 tiers',
    ],
  },
  {
    version: '2.2.0',
    date: '2026-03-29',
    title: 'Reliability & Safety Improvements',
    highlights: [
      'Generation safety net: auto-retries stuck paid books every 5 min',
      'Fixed promo code unlimited use bug',
      'Gift credits by email (works for non-users too)',
      'Error boundary on book page (no more white crash screens)',
      'Step-by-step progress with time estimates during generation',
    ],
  },
];

// Get the latest changelog entry
export function getLatestChangelog(): ChangelogEntry {
  return CHANGELOG[0];
}
