// Re-export everything for backwards compatibility
// All imports from '@/lib/generation' will work

// Shared utilities
export * from './shared/safety';
export * from './shared/api-client';
export * from './shared/json-utils';
export * from './shared/writing-quality';

// Text book generation
export * from './text/outline';
export * from './text/chapter';
export * from './text/characters';

// Visual book generation (comics, picture books)
export * from './visual/types';
export * from './visual/outline';
export * from './visual/prompts';
export * from './visual/assets';
export * from './visual/consistency';

// Screenplay generation
export * from './screenplay/outline';
export * from './screenplay/sequence';
export * from './screenplay/review';
export * from './screenplay/post-processing';

// Shared assets (cover, marketing, ideas)
export * from './cover';
export * from './marketing';
export * from './ideas';
