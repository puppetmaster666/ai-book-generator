// Backwards compatibility - all imports from '@/lib/gemini' still work
// This file re-exports everything from the modular generation system
//
// The monolithic gemini.ts has been refactored into:
//   lib/generation/
//   ├── shared/          - Safety, API client, JSON utils, writing quality
//   ├── text/            - Text book generation (outline, chapter, characters)
//   ├── visual/          - Visual book generation (comics, picture books)
//   ├── screenplay/      - Screenplay generation
//   ├── cover.ts         - Cover image generation
//   ├── marketing.ts     - Metadata and marketing generation
//   └── ideas.ts         - Book idea generation

export * from './generation';
