# AI Book Generator - Architecture Plan

## The Core Problem
LLMs can't write 50,000+ words in one shot due to:
- Output token limits (usually 4K-8K tokens per response)
- Quality degrades over long outputs
- No memory between calls

## Solution: Chunked Generation with Memory System

---

## 1. User Input Structure

Break the book idea into structured sections:

| Field | Purpose | Min Words |
|-------|---------|-----------|
| **Title** | Book title | - |
| **Genre** | Dropdown selection | - |
| **Premise** | 1-2 sentence hook | 20 |
| **Main Characters** | Name + description for each | 50 per character |
| **Beginning** | How the story opens, inciting incident | 100 |
| **Middle/Plot Points** | Key events, conflicts, turning points | 200 |
| **Ending** | Resolution, how it concludes | 100 |
| **Writing Style** | Selection or custom description | - |
| **Target Length** | Word count goal (e.g., 50,000) | - |

**Why this works:** Forces user to actually think through their idea. More input = better output. Also creates friction that makes the product feel "premium."

---

## 2. Writing Style Options

Pre-built style templates:
- **Literary** - Elegant prose, metaphor-heavy, introspective
- **Commercial/Thriller** - Punchy, short chapters, cliffhangers
- **Romance** - Emotional, dialogue-heavy, intimate POV
- **YA** - First person, relatable voice, fast-paced
- **Horror** - Atmospheric, dread-building, visceral
- **Sci-Fi** - World-building focused, technical but accessible
- **Custom** - User describes their own style

Each style = a prompt template injected into every generation call.

---

## 3. The Generation Pipeline

### Phase A: AI Planning
```
Input: User's structured idea
Output: Detailed chapter-by-chapter outline

Prompt Structure:
- "You are a book outliner. Given this premise, characters, beginning, middle, and ending..."
- "Create a {X} chapter outline where each chapter is ~{Y} words"
- "For each chapter, provide: Chapter title, 2-3 sentence summary of events, POV character"
```

### Phase B: Chapter Generation Loop

For each chapter:
```
1. CONTEXT INJECTION
   - Master outline (full)
   - Character bible (names, descriptions, current states)
   - "Story so far" summary (compressed)
   - This chapter's specific plan
   - Style template

2. GENERATE
   - "Write Chapter {N}: {Title}"
   - Target word count for this chapter
   - Output: 2,000-5,000 words of prose

3. POST-PROCESS
   - Count words
   - Send to SUMMARIZER API (separate call, cheaper model)
   - Update "story so far" summary
   - Update character states if changed
   - Store chapter in DB
```

### Phase C: Summarization System (The Memory Hack)

**Problem:** Can't fit 40,000 words of previous chapters in context.

**Solution:** Running summary that compresses what happened.

```
After each chapter:
- Summarize that chapter into 100-200 words
- Update master "story so far" (keeps growing but stays compressed)
- Track: plot developments, character changes, unresolved threads

The summary prompt:
"Summarize this chapter in 150 words. Focus on: plot events, character development,
any setups that need payoff later. Be factual, not flowery."
```

**Character State Tracking:**
```json
{
  "John": {
    "last_seen": "Chapter 5",
    "status": "injured, hiding in warehouse",
    "knows": ["Sarah's secret", "location of the key"],
    "goal": "escape the city"
  }
}
```

This gets injected into each chapter generation to maintain consistency.

---

## 4. Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  - Multi-step form (idea input)                        │
│  - Progress tracker (chapters generating)               │
│  - Preview/download when done                          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    API ROUTES                           │
│  POST /api/books/create     - Start new book           │
│  GET  /api/books/:id/status - Check progress           │
│  POST /api/books/:id/generate-next - Generate chapter  │
│  GET  /api/books/:id/download - Get EPUB               │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 GENERATION ENGINE                       │
│  1. Outline Generator (Gemini 3 Pro)                   │
│  2. Chapter Generator (Gemini 3 Pro)                   │
│  3. Summarizer (Gemini 3 Pro or cheaper model)         │
│  4. EPUB Compiler (epub-gen library)                   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    DATABASE                             │
│  - books (id, user_id, title, genre, status, etc.)     │
│  - chapters (id, book_id, number, content, summary)    │
│  - character_states (id, book_id, character, state)    │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Handling API Limits

**Rate Limits:**
- Queue system for generation requests
- Process one chapter at a time per book
- Multiple users = multiple books in parallel queue

**Token Limits:**
- Cap chapter generation at 4,000 tokens output
- If chapter needs to be longer, split into parts
- Summarizer keeps context under control

**Cost Control:**
- Track tokens used per book
- Set max tokens per pricing tier
- Cheaper model for summarization (if available)

---

## 6. EPUB Generation

After all chapters complete:
```javascript
const Epub = require('epub-gen');

const options = {
  title: book.title,
  author: "User Name", // or their pen name
  chapters: chapters.map(ch => ({
    title: ch.title,
    content: ch.content // HTML formatted
  }))
};

new Epub(options, './output.epub');
```

Output is KDP-ready EPUB file.

---

## 7. User Flow

1. **Input Phase** (5-10 min)
   - Fill out structured form
   - Select genre, style, length
   - Pay or use credits

2. **Planning Phase** (30 sec - 1 min)
   - AI generates outline
   - User can review/approve or regenerate

3. **Generation Phase** (10-30 min depending on length)
   - Progress bar shows chapters completing
   - User can preview chapters as they finish
   - Background job handles generation

4. **Download Phase**
   - Download EPUB
   - Optional: Download as PDF, DOCX
   - Instructions for KDP upload

---

## 8. Decisions Made

- **Outline editing:** NO - Fully automatic, no user review
- **Chapter regeneration:** NO - One shot only, keeps it simple
- **Tech stack:** Next.js (React + API routes, deploy to Vercel)

---

## 9. MVP Scope

**V1 (MVP):**
- Single structured input form
- 3 genre/style options
- Auto-generated outline (no editing)
- Sequential chapter generation
- Basic progress tracking
- EPUB download

**V2:**
- Outline editing
- Chapter regeneration
- More styles
- Character consistency improvements
- Cover image generation (DALL-E/Midjourney API)

**V3:**
- Series support (multiple books, same world)
- Fine-tuned style matching
- "Write like [author]" feature

---

## 10. Project Structure (Next.js)

```
ai-book-generator/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing page
│   ├── create/
│   │   └── page.tsx                # Book creation form
│   ├── book/
│   │   └── [id]/
│   │       └── page.tsx            # Progress/download page
│   └── api/
│       ├── books/
│       │   ├── route.ts            # POST: create book
│       │   └── [id]/
│       │       ├── route.ts        # GET: book status
│       │       ├── generate/
│       │       │   └── route.ts    # POST: trigger generation
│       │       └── download/
│       │           └── route.ts    # GET: download EPUB
│       └── webhooks/
│           └── stripe/
│               └── route.ts        # Payment webhooks
├── components/
│   ├── BookForm.tsx                # Multi-section input form
│   ├── ProgressTracker.tsx         # Chapter generation progress
│   ├── StyleSelector.tsx           # Genre/style picker
│   └── DownloadButton.tsx
├── lib/
│   ├── gemini.ts                   # Gemini API wrapper
│   ├── prompts/
│   │   ├── outline.ts              # Outline generation prompt
│   │   ├── chapter.ts              # Chapter generation prompt
│   │   ├── summarize.ts            # Summarization prompt
│   │   └── styles.ts               # Style templates
│   ├── epub.ts                     # EPUB generation
│   ├── db.ts                       # Database client
│   └── queue.ts                    # Job queue for generation
├── prisma/
│   └── schema.prisma               # Database schema
├── public/
└── package.json
```

---

## 11. Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  credits   Int      @default(0)
  books     Book[]
  createdAt DateTime @default(now())
}

model Book {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])

  // User inputs
  title           String
  genre           String
  premise         String    @db.Text
  characters      Json      // Array of {name, description}
  beginning       String    @db.Text
  middle          String    @db.Text
  ending          String    @db.Text
  style           String
  targetWords     Int

  // Generated content
  outline         Json?     // Array of {chapterNum, title, summary}
  storySoFar      String?   @db.Text  // Running summary
  characterStates Json?     // Current state of each character

  // Status
  status          String    @default("pending") // pending, generating, completed, failed
  currentChapter  Int       @default(0)
  totalChapters   Int       @default(0)
  totalWords      Int       @default(0)

  chapters        Chapter[]
  createdAt       DateTime  @default(now())
  completedAt     DateTime?
}

model Chapter {
  id        String   @id @default(cuid())
  bookId    String
  book      Book     @relation(fields: [bookId], references: [id])
  number    Int
  title     String
  content   String   @db.Text
  summary   String   @db.Text  // Compressed summary for memory
  wordCount Int
  createdAt DateTime @default(now())

  @@unique([bookId, number])
}
```

---

## 12. Key Prompts

### Outline Generation Prompt
```
You are a professional book outliner. Create a detailed chapter-by-chapter outline.

BOOK DETAILS:
- Title: {title}
- Genre: {genre}
- Premise: {premise}
- Characters: {characters}
- Beginning: {beginning}
- Key Plot Points: {middle}
- Ending: {ending}
- Target Length: {targetWords} words ({numChapters} chapters)

Create an outline with exactly {numChapters} chapters. For each chapter provide:
1. Chapter number
2. Chapter title
3. 2-3 sentence summary of what happens
4. Which characters appear
5. Approximate word count target

Output as JSON array.
```

### Chapter Generation Prompt
```
You are a novelist writing in {style} style.

BOOK OUTLINE:
{outline}

STORY SO FAR:
{storySoFar}

CHARACTER STATES:
{characterStates}

NOW WRITE CHAPTER {chapterNum}: "{chapterTitle}"

Chapter plan: {chapterPlan}
Target words: {targetWords}

Write the complete chapter. Include dialogue, description, and internal thoughts as appropriate for the genre. End the chapter at a natural breaking point.
```

### Summarization Prompt
```
Summarize this chapter in exactly 150 words. Focus on:
- Key plot events that happened
- Character development or revelations
- Any setups that need payoff later
- Where characters ended up (location, emotional state)

Be factual and precise. This summary will be used to maintain story continuity.

CHAPTER TEXT:
{chapterContent}
```

---

## 13. Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "@google/generative-ai": "latest",
    "@prisma/client": "^5.0.0",
    "epub-gen-memory": "^1.0.0",
    "stripe": "^14.0.0",
    "bull": "^4.0.0",
    "ioredis": "^5.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0"
  }
}
```

---

## 14. Implementation Order

1. **Setup** - Next.js project, Prisma, database
2. **Gemini integration** - API wrapper, test basic generation
3. **Prompts** - Write and test all prompt templates
4. **Book creation API** - Accept user input, store in DB
5. **Generation engine** - Outline → chapters → summaries loop
6. **EPUB export** - Compile chapters to downloadable file
7. **Frontend** - Form, progress tracking, download
8. **Payments** - Stripe integration, credits system
9. **Queue system** - Bull/Redis for background generation
10. **Deploy** - Vercel + PlanetScale/Supabase

---

## 15. Cost Estimation

Assuming Gemini 3 Pro pricing (estimate):
- Outline: ~2K tokens in, ~2K out = ~$0.02
- Per chapter: ~4K in, ~4K out = ~$0.04
- Summary: ~4K in, ~200 out = ~$0.02
- 20 chapters = ~$1.20 per book

**Pricing recommendation:** $4.99-9.99 per book = 4-8x margin
