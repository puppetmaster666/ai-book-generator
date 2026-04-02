# DraftMyBook - Project Guidelines

## Color Palette (STRICT - DO NOT DEVIATE)

The app uses a neutral-first design system. Do not introduce new colors outside this palette.

### Primary Palette
- **Backgrounds:** neutral-900 (dark), neutral-100 (light), neutral-50 (subtle), white
- **Text:** neutral-900 (headings), neutral-700 (emphasis), neutral-600 (body), neutral-500 (secondary), neutral-400 (muted)
- **Borders:** neutral-200 (standard), neutral-300 (medium), neutral-100 (subtle)
- **Primary buttons:** bg-neutral-900 text-white, hover:bg-neutral-800
- **Secondary buttons:** bg-neutral-100 text-neutral-700, hover:bg-neutral-200
- **Primary accent:** lime-400 (sparingly, for highlights and CTAs on dark backgrounds)

### Status Colors (ONLY for status indicators)
- **Success/Completed:** green-600 (icon/text), green-100 (bg), green-200 (border)
- **Error/Failed:** red-600 (icon/text), red-50 (bg), red-200 (border)
- **Warning/Caution:** amber-600 (icon/text), amber-50 (bg), amber-200 (border) -- ONLY for actual warnings like "don't close page", missing content, payment pending

### Rules
- Default to neutral colors for all new UI elements
- Do NOT use blue, purple, pink, emerald, teal, cyan, indigo, violet, fuchsia, rose, sky, or orange for new components
- Status colors (green/red/amber) are ONLY for their semantic purpose, not decoration
- When in doubt, use neutral-900 for emphasis and neutral-100 for subtle backgrounds
- Modals: neutral icon backgrounds, neutral-900 confirm buttons (except delete which uses red-600)
- Loading/spinner states: use neutral colors, not colored ones

## User-Facing Language
- Never expose AI/automation internals in changelogs, UI copy, or user-facing text
- Say "your book is being created" not "AI is generating your content"
