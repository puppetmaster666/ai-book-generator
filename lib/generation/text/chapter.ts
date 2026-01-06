import { SAFETY_SETTINGS, sanitizeContentForSafety, isSafetyBlockError } from '../shared/safety';
import {
  getGeminiPro,
  getGeminiFlashLight,
  getGeminiFlashForReview,
  withTimeout,
  CHAPTER_GENERATION_TIMEOUT,
  FAST_TASK_TIMEOUT
} from '../shared/api-client';
import {
  ContentRating,
  getContentRatingInstructions,
  getDynamicWritingInstructions,
  getRollingContext,
  detectLanguageInstruction,
  detectFictionBannedPhrases,
  FICTION_BANNED_PHRASES
} from '../shared/writing-quality';

// Remove duplicate chapter headings that appear twice (e.g., ALL CAPS then Title Case)
function removeDuplicateChapterHeading(content: string, chapterNum: number, chapterTitle?: string): string {
  const lines = content.split('\n');
  if (lines.length < 3) return content;

  // Look for chapter heading patterns in the first few lines
  const chapterPatterns = [
    // "CHAPTER N" or "Chapter N" with optional title
    new RegExp(`^\\s*CHAPTER\\s+${chapterNum}\\s*[:.]?\\s*(.*)$`, 'i'),
    // Just number and title
    new RegExp(`^\\s*${chapterNum}\\s*[:.]?\\s+(.*)$`),
  ];

  // Find lines that look like chapter headings
  const headingIndices: number[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (!line) continue;

    for (const pattern of chapterPatterns) {
      if (pattern.test(line)) {
        headingIndices.push(i);
        break;
      }
    }

    // Also check if line matches the chapter title closely (case-insensitive)
    if (chapterTitle) {
      const normalizedLine = line.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedTitle = chapterTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
      // If line is mostly the title (>70% match)
      if (normalizedLine.includes(normalizedTitle) || normalizedTitle.includes(normalizedLine)) {
        if (normalizedLine.length > 10 && !headingIndices.includes(i)) {
          headingIndices.push(i);
        }
      }
    }
  }

  // If we found 2+ heading-like lines, remove the ALL CAPS one or the first duplicate
  if (headingIndices.length >= 2) {
    // Prefer to remove the ALL CAPS version
    let indexToRemove = -1;
    for (const idx of headingIndices) {
      const line = lines[idx].trim();
      // Check if line is ALL CAPS (or mostly caps)
      const upperCount = (line.match(/[A-Z]/g) || []).length;
      const letterCount = (line.match(/[A-Za-z]/g) || []).length;
      if (letterCount > 0 && upperCount / letterCount > 0.8) {
        indexToRemove = idx;
        break;
      }
    }

    // If no ALL CAPS version, just remove the first duplicate
    if (indexToRemove === -1) {
      indexToRemove = headingIndices[0];
    }

    // Remove that line and any following empty lines
    lines.splice(indexToRemove, 1);
    while (indexToRemove < lines.length && lines[indexToRemove].trim() === '') {
      lines.splice(indexToRemove, 1);
    }

    return lines.join('\n');
  }

  return content;
}

// Normalize "The End" - remove from non-final chapters, ensure single properly formatted instance on final chapter
function normalizeTheEnd(content: string, isLastChapter: boolean): string {
  // Pattern to match various forms of "The End"
  const theEndPatterns = [
    /\n*\s*\*?\*?\[?THE\s+END\]?\*?\*?\s*$/gi,
    /\n*\s*\*?\*?\[?The\s+End\]?\*?\*?\s*$/gi,
    /\n*\s*\*?\*?\[?the\s+end\]?\*?\*?\s*$/gi,
    /\n*\s*---+\s*THE\s+END\s*---*\s*$/gi,
    /\n*\s*~+\s*The\s+End\s*~*\s*$/gi,
  ];

  // Remove all "The End" variations first
  let cleaned = content;
  for (const pattern of theEndPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  cleaned = cleaned.trim();

  // If this is the last chapter, add "The End" properly formatted
  if (isLastChapter) {
    cleaned = cleaned + '\n\nThe End';
  }

  return cleaned;
}

// Generic version that detects duplicate chapter headings without needing chapter info
function removeDuplicateChapterHeadingGeneric(content: string): string {
  const lines = content.split('\n');
  if (lines.length < 3) return content;

  // Look for any chapter heading pattern in the first few lines
  const chapterPattern = /^\s*(CHAPTER\s+\d+|Chapter\s+\d+)\s*[:.]?\s*(.*)$/i;

  // Find lines that look like chapter headings
  const headings: { index: number; num: string; title: string; isUpperCase: boolean }[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const match = line.match(chapterPattern);
    if (match) {
      // Extract chapter number
      const numMatch = match[1].match(/\d+/);
      if (numMatch) {
        const upperCount = (line.match(/[A-Z]/g) || []).length;
        const letterCount = (line.match(/[A-Za-z]/g) || []).length;
        headings.push({
          index: i,
          num: numMatch[0],
          title: (match[2] || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
          isUpperCase: letterCount > 0 && upperCount / letterCount > 0.8,
        });
      }
    }
  }

  // If we have 2+ headings with the same chapter number, remove the ALL CAPS one
  if (headings.length >= 2) {
    const firstNum = headings[0].num;
    const duplicates = headings.filter(h => h.num === firstNum);

    if (duplicates.length >= 2) {
      // Prefer to remove the ALL CAPS version
      const upperCaseOne = duplicates.find(h => h.isUpperCase);
      const indexToRemove = upperCaseOne ? upperCaseOne.index : duplicates[0].index;

      // Remove that line and any following empty lines
      lines.splice(indexToRemove, 1);
      while (indexToRemove < lines.length && lines[indexToRemove].trim() === '') {
        lines.splice(indexToRemove, 1);
      }

      return lines.join('\n');
    }
  }

  return content;
}

// Smart fallback: extract meaningful summary when AI times out
function smartSummaryFallback(chapterContent: string): string {
  // Split into paragraphs
  const paragraphs = chapterContent.split(/\n\n+/).filter(p => p.trim().length > 0);

  if (paragraphs.length === 0) {
    return chapterContent.substring(0, 500) + '...';
  }

  // Take first paragraph (sets scene) + last 2 paragraphs (chapter ending/cliffhanger)
  const opener = paragraphs[0] || '';
  const closer = paragraphs.length > 2
    ? paragraphs.slice(-2).join('\n\n')
    : paragraphs[paragraphs.length - 1] || '';

  const combined = `${opener}\n...\n${closer}`;

  // Limit to ~600 chars
  return combined.length > 600
    ? combined.substring(0, 600) + '...'
    : combined;
}

export async function generateChapter(data: {
  title: string;
  genre: string;
  bookType: string;
  writingStyle: string;
  outline: object;
  storySoFar: string;
  characterStates: object;
  chapterNumber: number;
  chapterTitle: string;
  chapterPlan: string;
  chapterPov?: string;
  targetWords: number;
  chapterFormat: string;
  chapterKeyPoints?: string[]; // For non-fiction chapters
  contentRating?: ContentRating; // Content maturity level
  totalChapters?: number; // Total chapters in book (for "The End" on last chapter)
  correctiveInstructions?: string; // From consistency check - steering to fix drift
  onProgress?: (accumulatedText: string) => void; // Callback for live preview updates
}): Promise<string> {
  const isLastChapter = data.totalChapters && data.chapterNumber >= data.totalChapters;
  const formatInstruction = {
    numbers: `Start with EXACTLY "Chapter ${data.chapterNumber}" on its own line, then begin the content. Do NOT repeat or rephrase the chapter heading.`,
    titles: `Start with EXACTLY "${data.chapterTitle}" on its own line, then begin the content. Do NOT repeat or rephrase the title.`,
    both: `Start with EXACTLY "Chapter ${data.chapterNumber}: ${data.chapterTitle}" on its own line, then begin the content. Do NOT repeat or rephrase the heading.`,
    pov: `Start with EXACTLY "${data.chapterPov?.toUpperCase() || 'NARRATOR'}" then "Chapter ${data.chapterNumber}" on the next line, then begin content. Do NOT repeat headings.`,
  }[data.chapterFormat] || `Start with EXACTLY "Chapter ${data.chapterNumber}: ${data.chapterTitle}" on its own line, then begin the content. Do NOT repeat or rephrase the heading.`;

  // Detect language from title to ensure content matches input language
  const languageInstruction = detectLanguageInstruction(data.title);

  // Check if this is a non-fiction book
  const isNonFiction = data.bookType === 'non-fiction';

  let prompt: string;

  if (isNonFiction) {
    // Non-fiction prompt - educational, informative style with strict quality requirements
    const keyPointsSection = data.chapterKeyPoints && data.chapterKeyPoints.length > 0
      ? `\nKEY POINTS TO COVER:\n${data.chapterKeyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
      : '';

    prompt = `You are an expert author writing a professional ${data.genre} non-fiction book in ${data.writingStyle} style.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
BOOK: "${data.title}"

BOOK OUTLINE:
${JSON.stringify(data.outline, null, 2)}

CONTENT SO FAR:
${data.storySoFar || 'This is chapter 1, the beginning of the book.'}

WRITE CHAPTER ${data.chapterNumber}: "${data.chapterTitle}"
Topic: ${data.chapterPlan}
${keyPointsSection}

${formatInstruction}

=== MANDATORY WRITING STANDARDS ===

CONTENT REQUIREMENTS:
- Start with a VARIED hook. NEVER use "Have you ever..." - this is AI-detectable
- Chapter opening hooks should rotate through: surprising fact, brief anecdote, bold statement, vivid scene, counter-intuitive claim, or a specific example
- Explain concepts clearly before using technical terms
- Include 1-2 SPECIFIC real-world examples with concrete details (names, dates, places when possible)
- Case studies must have UNIQUE names - never reuse Marcus, Sarah, David, or Mark
- Provide actionable takeaways readers can apply immediately
- End with a transition that doesn't always follow "In the next chapter, we will..."

PROSE QUALITY:
- Write in clear, accessible language. Avoid jargon unless explained
- Use "you" to address readers directly, but don't overuse "You might wonder..."
- Vary paragraph length. Mix short punchy paragraphs with longer explanatory ones
- Use subheadings sparingly (only if chapter is very long)
- Complete all sentences properly. No fragments or garbled text
- SPECIFIC DETAILS matter: "a 2019 Stanford study" is better than "research shows"

AVOID THESE AI PATTERNS (CRITICAL):
- NEVER start chapters with "Have you ever..." - this is the #1 AI tell
- NEVER use the same chapter opening structure twice in the book
- Avoid formulaic case studies: "Consider the case of [Name]. [Name] was a [professional] who..."
- Don't use the same physical descriptions repeatedly ("shoulders dropped", "heart rate slowed")
- Vary your transition phrases - don't always use "In the next chapter..."
- Avoid repetitive 3-part structures: "It is not X. It is Y. It is Z."

AVOID THESE ERRORS:
- Making up statistics, studies, or fake research
- Vague claims without examples: "Research shows..." (which research?)
- Repeating the same point multiple ways without adding value
- Excessive bullet points. Integrate information into flowing prose
- Starting multiple paragraphs with the same word
- Using the same character names across different case studies

STRUCTURE:
- This is chapter ${data.chapterNumber} of ${(data.outline as { chapters?: unknown[] })?.chapters?.length || 15}
- Cover the key points thoroughly but don't repeat information from earlier chapters
- Each paragraph should add new information or a new perspective

FORBIDDEN:
- Em dashes (—) or en dashes (–). Use commas or periods instead
- "[END]", "[THE END]", "END OF CHAPTER" markers
- Author notes, meta-commentary, or markdown formatting
- Incomplete words or typos
- Citing specific authors/books unless you're certain they exist
${isLastChapter ? '' : '- "The End" - this is NOT the final chapter'}

WORD LIMIT: ${data.targetWords} words MAXIMUM. This is a hard limit. Cover the topic thoroughly within this limit.
${isLastChapter ? `
FINAL CHAPTER REQUIREMENT:
This is the FINAL chapter. End the book with "The End" on its own line at the very end. Do not use any other variation like "THE END" or "[The End]".` : ''}
OUTPUT: The chapter text only, starting with the chapter heading.`;
  } else {
    // Fiction prompt - narrative style with strict quality requirements
    // Get content rating instructions (defaults to general if not specified)
    const contentGuidelines = getContentRatingInstructions(data.contentRating || 'general');

    // Get dynamic tone guide for human-like writing
    const toneGuide = getDynamicWritingInstructions(data.genre, 'fiction');

    // Use rolling context (last 3 chapters only) to prevent AI recaps
    const rollingContext = getRollingContext(data.storySoFar);

    prompt = `You are a professional novelist writing publishable ${data.genre} fiction in ${data.writingStyle} style.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
BOOK: "${data.title}"
${contentGuidelines}
${toneGuide}

STORY OUTLINE:
${JSON.stringify(data.outline, null, 2)}

=== CONTINUITY (FOR MEMORY ONLY - DO NOT RECAP) ===
${rollingContext}

CHARACTER STATES:
${JSON.stringify(data.characterStates || {}, null, 2)}
${data.correctiveInstructions ? `
=== CORRECTIVE STEERING (MANDATORY) ===
A consistency check has identified issues that MUST be addressed in this chapter:
${data.correctiveInstructions}
Follow these instructions carefully to maintain story consistency.
` : ''}
WRITE CHAPTER ${data.chapterNumber}: "${data.chapterTitle}"
Plan: ${data.chapterPlan}
${data.chapterPov ? `POV: ${data.chapterPov}` : ''}

${formatInstruction}

=== CRITICAL PACING RULES ===
- START IN MEDIA RES: Jump DIRECTLY into action or dialogue for this chapter
- NO RECAPS: Do NOT summarize or reference previous chapter events in your opening
- The reader is already immersed. They know what happened. Begin with THIS chapter's first moment
- If the previous chapter ended on a cliffhanger, resolve or continue it immediately

=== MANDATORY WRITING STANDARDS ===

DIALOGUE FORMAT (REQUIRED):
- Every line of spoken dialogue MUST be enclosed in quotation marks
- CORRECT: "I don't understand," Maria said, shaking her head.
- WRONG: I don't understand, Maria said.
- New speaker = new paragraph
- Use "said" and "asked" primarily. Avoid fancy tags like "exclaimed" or "declared"
- Include brief action beats: She crossed her arms. "That's not what I meant."

PROSE QUALITY:
- Write clean, professional prose. No purple prose or overwrought descriptions
- SHOW emotions through actions: "Her hands trembled" not "She was terrified"
- Vary sentence length. Mix short punchy sentences with longer flowing ones
- Be specific: "oak door" not "the door", "1967 Mustang" not "old car"
- Use sensory details that aren't clichés: "metallic taste of adrenaline" not "heart pounded"

SENTENCE STRUCTURE (ELIMINATE AI RHYTHM):
- PRIORITIZE Direct Action (Subject + Verb + Object). This is how humans naturally write
- AVOID the "Participial Flourish" (e.g., "Sighing heavily, he sat down"). Use it MAX once per page
- NEVER start more than 2 consecutive sentences with the same word
- BAD: "She walked in. She sat down. She opened her laptop." (repetitive AI pattern)
- GOOD: "She walked in and sat down. The laptop screen glowed as she opened it."
- BAD: "Walking to the door, she reached for the handle. Turning the knob, she pushed it open."
- GOOD: "She walked to the door. The handle was cold. She pushed it open."
- Limit "She/He/It/The" sentence starters to max 20% of sentences

PRONOUN USAGE:
- After first mention in a scene, use "he/she/they" instead of character names
- Embed pronouns mid-sentence: "The screen flickered as she scrolled down"
- Character names should appear roughly once every 100-150 words for clarity

AVOID THESE AI PATTERNS:
- Clichés: "heart pounded", "blood ran cold", "time stood still", "shoulders dropped"
- Repetitive 2-word patterns: "She looked", "She thought", "She reached", "It was"
- Participial phrase chains: "Seeing this, he... Knowing that, she... Feeling the..."
- Adjective stacking: "the dark, gloomy, ominous shadows"
- Clinical euphemisms in mature content: Use atmospheric descriptions instead

STRUCTURE:
- This is chapter ${data.chapterNumber} of ${(data.outline as { chapters?: unknown[] })?.chapters?.length || 20}. Do NOT resolve major plot threads
- End at a natural scene break, not a forced cliffhanger
- Characters must act logically based on their established traits
- Complete all sentences. No fragments or garbled text

FORBIDDEN:
- Em dashes (—) or en dashes (–). Use commas or periods instead
- "[END]", "[THE END]", "END OF CHAPTER" markers
- Author notes, commentary, or markdown
- Inventing major characters not in the outline
- Incomplete words or typos like "susped" instead of "suspended"
${isLastChapter ? '' : '- "The End" - this is NOT the final chapter'}

WORD LIMIT: ${data.targetWords} words MAXIMUM. This is a hard limit. Write a complete, satisfying chapter within this limit. Do not pad with unnecessary description.
${isLastChapter ? `
FINAL CHAPTER REQUIREMENT:
This is the FINAL chapter. End the book with "The End" on its own line at the very end. Do not use any other variation like "THE END" or "[The End]".` : ''}
OUTPUT: The chapter text only, starting with the chapter heading.`;
  }

  // Try with progressively more tasteful rewrites (4 attempts)
  // Key insight: Don't corrupt the prompt with word-swapping. Instead, add rewrite instructions.
  const maxAttempts = 4;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let currentPrompt = prompt;

    if (attempt === 1) {
      // First retry: Add tasteful rewrite instructions (no word-swapping)
      console.log(`[Chapter ${data.chapterNumber}] Attempt 2: Retrying with tasteful rewrite instructions...`);
      currentPrompt = prompt + `

=== CONTENT FILTER TRIGGERED - REWRITE INSTRUCTIONS ===
The previous version was blocked by safety filters. Rewrite this chapter to:
- Replace explicit scenes with atmospheric implication ("the door closed behind them" + time skip)
- Use emotional focus: "she felt wanted for the first time in years" instead of physical description
- For violence: focus on the aftermath and emotional impact, not the act itself
- Keep the same plot beats but make them "prestige drama" (HBO level, not explicit)
- Characters can still be flirtatious and romantic, just fade-to-black on intimate scenes`;
    } else if (attempt === 2) {
      // Second retry: Summarize explicit scenes, don't write them
      console.log(`[Chapter ${data.chapterNumber}] Attempt 3: Skip-and-summarize mode...`);
      currentPrompt = prompt + `

=== SAFETY OVERRIDE - SUMMARIZE DON'T SHOW ===
Multiple attempts were blocked. For this version:
- If ANY scene could be explicit: write ONE LINE summarizing what happened, then skip ahead
  Example: "They spent the night together. By morning, everything had changed."
  Example: "The fight was brutal. When it was over, only Marcus was standing."
- Focus entirely on dialogue, emotions, and plot advancement
- Think PG-13: implications yes, details no
- This is still a good story - just safer to publish`;
    } else if (attempt === 3) {
      // Final fallback: Generate a minimal bridge chapter from just the summary
      console.log(`[Chapter ${data.chapterNumber}] Attempt 4: Generating safe bridge chapter from summary only...`);
      currentPrompt = `Write a brief, family-friendly chapter for a ${data.genre} story.

Chapter ${data.chapterNumber}: ${data.chapterTitle}

Summary of what happens: ${data.chapterPlan}

Requirements:
- Write approximately ${Math.min(data.targetWords, 1500)} words
- Focus on dialogue and character emotions only
- NO violence, NO mature themes, NO conflict descriptions
- Keep it simple and safe for all audiences
- Start with "Chapter ${data.chapterNumber}: ${data.chapterTitle}" as the heading
- This is a bridge chapter - just move the plot forward simply

Write the chapter now:`;
    }

    try {
      let content: string;

      // Use streaming if onProgress callback is provided for live preview
      if (data.onProgress && attempt === 0) {
        // Only use streaming on first attempt (retries use non-streaming for simplicity)
        const model = getGeminiPro();
        let accumulated = '';
        let lastProgressUpdate = 0;

        const streamResult = await model.generateContentStream(currentPrompt);
        for await (const chunk of streamResult.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            accumulated += chunkText;
            // Update progress every ~500 characters to avoid too many DB writes
            if (accumulated.length - lastProgressUpdate > 500) {
              data.onProgress(accumulated);
              lastProgressUpdate = accumulated.length;
            }
          }
        }
        // Final progress update
        if (accumulated.length > lastProgressUpdate) {
          data.onProgress(accumulated);
        }
        content = accumulated;
      } else {
        // Non-streaming generation (retries or no callback)
        const result = await withTimeout(
          () => getGeminiPro().generateContent(currentPrompt),
          CHAPTER_GENERATION_TIMEOUT,
          `Chapter ${data.chapterNumber} generation (attempt ${attempt + 1})`
        );
        content = result.response.text();
      }

      // Quick cleanup of obvious AI artifacts and word truncation errors
      content = content
        .replace(/\*?\*?\[?(THE )?END( OF BOOK| OF CHAPTER)?\]?\*?\*?/gi, '')
        .replace(/\*\*\[END OF BOOK\]\*\*/gi, '')
        .replace(/—/g, ', ')
        .replace(/–/g, ', ')
        .replace(/ , /g, ', ')
        .replace(/,\s*,/g, ',')
        // Fix common AI word truncation artifacts
        .replace(/\blegary\b/gi, 'legendary')
        .replace(/\bLeg of Zelda\b/g, 'Legend of Zelda')
        .replace(/\bsurrer\b/gi, 'surrender')
        .replace(/\bsurrering\b/gi, 'surrendering')
        .replace(/\bsurrered\b/gi, 'surrendered')
        .replace(/\brecomm\b/gi, 'recommend')
        .replace(/\brecommation\b/gi, 'recommendation')
        .replace(/\bsp\s+(\w)/g, 'spend $1')
        .replace(/\bbl\s+(\w)/g, 'blend $1')
        .replace(/\borphins\b/gi, 'endorphins')
        .replace(/\binted\b/gi, 'intended')
        .replace(/\bintions\b/gi, 'intentions')
        .replace(/\bdesced\b/gi, 'descended')
        .replace(/\bsusped\b/gi, 'suspended')
        .replace(/\bNinto\b/g, 'Nintendo')
        .trim();

      // Remove duplicate chapter titles (AI sometimes outputs title twice - ALL CAPS then Title Case)
      content = removeDuplicateChapterHeading(content, data.chapterNumber, data.chapterTitle);

      // Handle "The End" for final chapter
      content = normalizeTheEnd(content, isLastChapter || false);

      if (attempt > 0) {
        console.log(`[Chapter ${data.chapterNumber}] Successfully generated on attempt ${attempt + 1}`);
      }

      return content;
    } catch (error) {
      lastError = error as Error;
      if (isSafetyBlockError(error) && attempt < maxAttempts - 1) {
        console.log(`[Chapter ${data.chapterNumber}] Safety block on attempt ${attempt + 1}, trying next fallback...`);
        continue;
      }
      // If this is the last attempt and still failing, generate a placeholder
      if (attempt === maxAttempts - 1) {
        console.error(`[Chapter ${data.chapterNumber}] All ${maxAttempts} attempts failed. Generating emergency placeholder.`);
        // Return a minimal placeholder chapter so the book can complete
        const placeholder = `Chapter ${data.chapterNumber}: ${data.chapterTitle}

${data.chapterPlan}

[Note: This chapter was condensed due to content processing. The story continues in the next chapter.]`;
        return placeholder;
      }
      throw error;
    }
  }

  throw lastError || new Error(`Failed to generate chapter ${data.chapterNumber}`);
}

/**
 * CausalBridge for prose chapters - prevents chapter-to-chapter drift
 */
export interface ProseChapterCausalBridge {
  triggerEvent: string;
  therefore: string;
  but: string;
  nextChapterMustAddress: string;
}

/**
 * Extended chapter summary with CausalBridge for continuity
 */
export interface ChapterSummaryWithCausality {
  summary: string;
  causalBridge?: ProseChapterCausalBridge;
}

export async function summarizeChapter(chapterContent: string): Promise<string> {
  // Simplified, shorter prompt for faster generation
  const prompt = `Summarize this chapter in 100 words max. Include:
- Main plot events
- Character locations and emotional state at chapter end
- Critical setups for future chapters

CHAPTER:
${chapterContent}`;

  const startTime = Date.now();
  try {
    const result = await withTimeout(
      () => getGeminiFlashLight().generateContent(prompt), // Flash Light is faster
      FAST_TASK_TIMEOUT,
      'Chapter summary'
    );
    const summary = result.response.text().trim();
    const elapsed = Date.now() - startTime;
    const summaryWords = summary.split(/\s+/).filter(w => w.length > 0).length;
    console.log(`[Summary] SUCCESS in ${elapsed}ms. ${summaryWords} words`);
    return summary;
  } catch (error) {
    // Timeout or error - use smart fallback
    console.log(`[Summary] AI failed, using smart fallback`);
    return smartSummaryFallback(chapterContent);
  }
}

/**
 * Extended chapter summary that includes CausalBridge for preventing drift.
 * Use this for fiction books to maintain narrative momentum.
 */
export async function summarizeChapterWithCausality(
  chapterContent: string,
  chapterNumber: number,
  isLastChapter: boolean = false
): Promise<ChapterSummaryWithCausality> {
  // For the last chapter, we don't need causal bridge to next
  if (isLastChapter) {
    const summary = await summarizeChapter(chapterContent);
    return { summary };
  }

  const prompt = `Summarize this chapter for continuity tracking.

CHAPTER ${chapterNumber} CONTENT:
${chapterContent.substring(0, 6000)}

=== SUMMARY REQUIREMENTS ===
Provide a 100-word summary with SPECIFIC events (not themes or feelings).

=== CAUSAL BRIDGE (MANDATORY) ===
Human stories use THEREFORE/BUT logic. AI uses AND THEN (which causes drift).

You MUST provide:
1. TRIGGER EVENT: The key event that ended this chapter
2. THEREFORE: What the protagonist MUST do next as a result
3. BUT: The obstacle preventing easy resolution
4. NEXT CHAPTER MUST ADDRESS: The specific conflict to resolve

EXAMPLE:
- TRIGGER: "Maria discovered the forged documents"
- THEREFORE: "Maria must confront her business partner"
- BUT: "The partner controls the company finances and Maria's family depends on the income"
- NEXT MUST ADDRESS: "Confrontation with partner about the forgery"

This creates FORWARD MOMENTUM. Without it, chapters drift.

Return JSON:
{
  "summary": "100-word summary with SPECIFIC events...",
  "causalBridge": {
    "triggerEvent": "The key event that ended this chapter",
    "therefore": "What protagonist MUST do next",
    "but": "The obstacle preventing easy resolution",
    "nextChapterMustAddress": "The specific conflict for next chapter"
  }
}`;

  const startTime = Date.now();
  try {
    const result = await withTimeout(
      () => getGeminiFlashLight().generateContent(prompt),
      FAST_TASK_TIMEOUT,
      'Chapter summary with causality'
    );
    const response = result.response.text().trim();
    const elapsed = Date.now() - startTime;

    // Try to parse JSON response
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ChapterSummaryWithCausality;
        console.log(`[Summary+Causality] SUCCESS in ${elapsed}ms`);
        return parsed;
      }
    } catch {
      // JSON parsing failed, fall back to basic summary
      console.log(`[Summary+Causality] JSON parse failed, using basic summary`);
    }

    // Fallback: use the response as the summary
    return { summary: response.substring(0, 500) };
  } catch (error) {
    // Timeout or error - use smart fallback
    console.log(`[Summary+Causality] AI failed, using smart fallback`);
    return { summary: smartSummaryFallback(chapterContent) };
  }
}

export async function reviewAndPolishChapter(
  chapterContent: string,
  targetWords: number,
  bookType: string
): Promise<{ content: string; success: boolean }> {
  const currentWordCount = chapterContent.split(/\s+/).filter(w => w.length > 0).length;
  const isOverLength = currentWordCount > targetWords * 1.15; // More than 15% over

  const prompt = `You are a professional editor reviewing a chapter for publication. Your job is to FIX ERRORS while preserving the author's voice and story.

CHAPTER TO REVIEW:
---
${chapterContent}
---

TARGET WORD COUNT: ${targetWords} words
CURRENT WORD COUNT: ~${currentWordCount} words
BOOK TYPE: ${bookType}

YOUR EDITING TASKS:

1. FIX SPELLING AND TYPOS:
   - Correct any misspelled words (e.g., "susped" → "suspended", "desced" → "descended")
   - Fix incomplete or garbled words
   - Ensure proper capitalization

2. FIX DIALOGUE FORMATTING:
   - ALL spoken dialogue MUST be in quotation marks
   - Correct: "Hello," she said.
   - Incorrect: Hello, she said.
   - Each new speaker should start a new paragraph

3. FIX INCOMPLETE SENTENCES:
   - If a sentence is cut off or missing words, complete it logically
   - Remove any sentences that are clearly garbled and cannot be salvaged

4. FIX REPETITIVE SENTENCE STARTERS (CRITICAL):
   - Scan for paragraphs where more than 2 consecutive sentences start with the same word
   - Common offenders: "She [verb]", "He [verb]", "The [noun]", "It was/is"
   - Rewrite to vary sentence structure using dependent clauses, participial phrases, prepositional phrases
   - Example fix: "She opened the door. She walked inside. She saw the damage." → "She opened the door. Inside, the damage was immediately visible."
   - If 20%+ of sentences in a paragraph start with "She/He/It/The", rewrite for variety

5. REDUCE CHARACTER NAME OVERUSE:
   - Character names should appear roughly once every 100-150 words
   - Replace excessive name usage with pronouns (he/she/they)
   - Exception: Keep names when needed for clarity (multiple people in scene)
   - Don't just replace names with pronouns at sentence starts - vary the entire sentence structure

6. REMOVE WORD REPETITION:
   - If the same unusual word appears more than twice in a paragraph, replace some instances with synonyms
   - Remove redundant phrases that say the same thing twice
   - Watch for repetitive 2-word patterns: "She looked", "She thought", "She reached", "It was"

7. FIX AI-DETECTABLE PATTERNS:
   - If chapter opens with "Have you ever..." - REWRITE the opening with a different hook
   - Replace overused physical descriptions ("shoulders dropped", "heart rate slowed") with varied alternatives
   - Fix formulaic case study intros: "Consider the case of [Name]. [Name] was a..." - make them natural
   - Vary transition phrases - not every chapter should end with "In the next chapter, we will..."
   - Fix truncated words: "legary"→"legendary", "surrer"→"surrender", "sp time"→"spend time", "Ninto"→"Nintendo"

7b. REMOVE BANNED AI PHRASES (CRITICAL FOR FICTION):
   These phrases SCREAM "AI-generated" and MUST be rewritten or removed:

   NARRATIVE CLICHÉS - rewrite completely:
   - "little did [X] know" → just show what happens next
   - "couldn't help but" → "she [action]" directly
   - "before [X] knew it" → delete, show the action
   - "as if on cue" → delete or describe the timing naturally
   - "in that moment" → delete, redundant
   - "time seemed to slow/stop" → delete, use specific sensory details
   - "something inside [X] shifted" → show the emotion through action

   ACADEMIC TRANSITIONS - delete or replace with nothing:
   - "moreover", "furthermore", "additionally", "subsequently"
   - "it's worth noting", "interestingly", "needless to say"

   OVERWROUGHT PHYSICAL REACTIONS - replace with specific, unique descriptions:
   - "shivers ran down" → something specific to the character
   - "blood ran cold" → describe the actual physical sensation uniquely
   - "heart skipped a beat" → "her breath hitched" or similar
   - "stomach dropped" → find a fresh alternative

   CLICHÉ DESCRIPTIONS - rewrite entirely:
   - "a kaleidoscope/symphony/tapestry/whirlwind/cascade/myriad of"
   - These are lazy placeholder descriptions - be specific instead

8. FIX "CHAPTER RESET SYNDROME" (CRITICAL FOR FICTION):
   - If the chapter opening summarizes or recaps the previous chapter - REMOVE IT
   - Examples to DELETE or rewrite:
     * "After the events at the warehouse..." → Start with action instead
     * "Sarah had just learned that..." → Jump to the next scene
     * "Following their escape..." → Begin in the middle of the new scene
   - The reader JUST read the previous chapter. They don't need a reminder.
   - Start chapters "In Media Res" - in the middle of action, not with context

9. FIX PARTICIPIAL PHRASE OVERUSE (CRITICAL):
   - Count sentences starting with "-ing" phrases (participial phrases)
   - If more than 2 per page (~250 words), REWRITE some to Subject-Verb-Object
   - Examples to fix:
     * "Walking to the door, she..." → "She walked to the door and..."
     * "Feeling overwhelmed, he..." → "The weight of it hit him. He..."
     * "Clutching the letter, Sarah..." → "Sarah clutched the letter."
   - Participial phrases feel "writerly" and scream AI when overused
   - Prioritize DIRECT ACTION: Subject first, then verb

10. FIX DIRECT EMOTION STATEMENTS:
   - Replace "She felt [emotion]" with physical/action descriptions
   - Examples to fix:
     * "She felt angry" → "Her jaw tightened"
     * "He was nervous" → "His leg bounced under the table"
     * "Sarah felt relieved" → "Sarah exhaled. Finally."
   - SHOW emotions through the body and actions, don't TELL them

11. FIX PUNCTUATION:
   - Replace any em dashes (—) or en dashes (–) with commas or periods
   - Ensure sentences end with proper punctuation

${isOverLength ? `12. TRIM LENGTH:
   - The chapter is ${currentWordCount - targetWords} words over target
   - Remove unnecessary adjectives and adverbs
   - Tighten wordy phrases
   - Cut redundant descriptions
   - Target: ${targetWords} words (+/- 10%)` : ''}

CRITICAL RULES:
- DO NOT change the plot, characters, or story events
- DO NOT rewrite sections that are already well-written
- DO NOT add new content or expand scenes
- DO NOT change the author's writing style
- ONLY fix actual errors and issues listed above

OUTPUT:
Return ONLY the corrected chapter text. No explanations, no comments, no markdown.`;

  try {
    const startTime = Date.now();
    const result = await withTimeout(
      () => getGeminiFlashForReview().generateContent(prompt), // Use dedicated review API key
      45000, // 45s timeout
      'Chapter review'
    );
    let polished = result.response.text().trim();

    // Final cleanup pass
    polished = polished
      // Remove ugly AI end markers, but preserve properly formatted "The End"
      .replace(/\*+\s*(THE\s+)?END\s*\*+/gi, '') // *END* or **THE END**
      .replace(/\[+(THE\s+)?END\]+/gi, '') // [END] or [THE END]
      .replace(/(THE\s+)?END\s+OF\s+(BOOK|CHAPTER)/gi, '') // "END OF BOOK" etc
      .replace(/^\s*---+\s*$/gm, '')
      // Fix double punctuation
      .replace(/([.!?])\1+/g, '$1')
      // Fix double spaces
      .replace(/  +/g, ' ')
      // Fix em/en dashes that might have been missed
      .replace(/—/g, ', ')
      .replace(/–/g, ', ')
      .replace(/ , /g, ', ')
      .replace(/,\s*,/g, ',')
      // Fix common AI word truncation artifacts
      .replace(/\blegary\b/gi, 'legendary')
      .replace(/\bLeg of Zelda\b/g, 'Legend of Zelda')
      .replace(/\bsurrer\b/gi, 'surrender')
      .replace(/\bsurrering\b/gi, 'surrendering')
      .replace(/\bsurrered\b/gi, 'surrendered')
      .replace(/\brecomm\b/gi, 'recommend')
      .replace(/\brecommation\b/gi, 'recommendation')
      .replace(/\b(\w{2,})ed\s+(\1ing)\b/gi, '$1ed') // Fix doubled verbs
      .replace(/\bsp\s+(\w)/g, 'spend $1') // "sp time" -> "spend time"
      .replace(/\bbl\s+(\w)/g, 'blend $1') // "bl together" -> "blend together"
      .replace(/\bOrpheus\s+s\b/gi, 'Orpheus says')
      .replace(/\bends\s+s\b/gi, 'ends')
      .replace(/\b(\w+)s\s+s\b/g, '$1s') // Fix doubled 's'
      .replace(/\borphins\b/gi, 'endorphins')
      .replace(/\binted\b/gi, 'intended')
      .replace(/\bintions\b/gi, 'intentions')
      .replace(/\bdesced\b/gi, 'descended')
      .replace(/\bsusped\b/gi, 'suspended')
      .replace(/\bNinto\b/g, 'Nintendo')
      .trim();

    // Also remove duplicate chapter headings in review pass
    polished = removeDuplicateChapterHeadingGeneric(polished);

    const elapsed = Date.now() - startTime;
    const originalWords = chapterContent.split(/\s+/).filter(w => w.length > 0).length;
    const polishedWords = polished.split(/\s+/).filter(w => w.length > 0).length;

    // SAFETY CHECK: If review destroyed the chapter (< 50% of original), reject it
    if (polishedWords < originalWords * 0.5) {
      console.error(`[Review] REJECTED: Output too short (${polishedWords} vs ${originalWords} words). Keeping original.`);
      return { content: chapterContent, success: false };
    }

    // Check for remaining banned AI phrases (for monitoring/improvement)
    if (bookType === 'fiction' || bookType === 'novel') {
      const bannedCheck = detectFictionBannedPhrases(polished);
      if (bannedCheck.found) {
        console.warn(`[Review] WARNING: ${bannedCheck.patterns.length} AI phrases still present after review:`, bannedCheck.patterns.slice(0, 5).join(', '));
      }
    }

    console.log(`[Review] SUCCESS in ${elapsed}ms. Words: ${originalWords} -> ${polishedWords}`);
    return { content: polished, success: true };
  } catch (error) {
    console.error('[Review] FAILED:', error instanceof Error ? error.message : error);
    return { content: chapterContent, success: false }; // Return original if review fails
  }
}
