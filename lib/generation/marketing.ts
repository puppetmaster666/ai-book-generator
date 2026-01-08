import { getGeminiFlash, withTimeout } from './shared/api-client';
import { SAFETY_SETTINGS } from './shared/safety';

export async function generateMetadataAndMarketing(data: {
  title: string;
  genre: string;
  bookType: string;
  bookFormat?: string; // 'text_only', 'screenplay', etc.
  authorName: string;
  chapterSummaries: string; // Concatenated chapter/sequence summaries
  originalIdea: string;
}): Promise<{
  logline: string;
  backCoverCopy: string; // For books: back cover blurb. For screenplays: synopsis/treatment
  amazonKeywords: string[]; // For books: Amazon keywords. For screenplays: industry tags
}> {
  const isNonFiction = data.bookType === 'non-fiction';
  const isScreenplay = data.bookFormat === 'screenplay';

  // Use different prompt for screenplays vs books
  const prompt = isScreenplay
    ? `You are a professional Hollywood Script Consultant and Coverage Analyst.

SCREENPLAY: "${data.title}"
GENRE: ${data.genre}
WRITER: ${data.authorName || 'Anonymous'}

STORY SYNOPSIS:
${data.chapterSummaries.substring(0, 4000)}

ORIGINAL CONCEPT:
${data.originalIdea?.substring(0, 500) || 'N/A'}

YOUR TASK - CREATE PITCH MATERIALS:

1. LOGLINE: A high-concept, one-sentence pitch under 30 words.
   - Format: When [INCITING INCIDENT], a [SPECIFIC PROTAGONIST] must [GOAL] before [STAKES].
   - Include the central irony or hook that makes this story unique.

2. SYNOPSIS: Write a 150-200 word pitch treatment.
   - Open with the HOOK - the most compelling visual or premise element
   - Introduce protagonist with their defining trait and flaw
   - Present the central conflict and antagonist
   - Build to the "impossible choice" or dramatic question
   - End with what's at stake - make it emotional AND high-concept
   - Write in present tense, active voice

3. INDUSTRY TAGS: Identify 7 specific tags for this screenplay.
   - Include comparable films (e.g., "Meets: KNIVES OUT x GET OUT")
   - Genre hybrids (e.g., "neo-noir thriller", "contained horror")
   - Tone descriptors (e.g., "darkly comedic", "emotionally grounded")
   - Market positioning (e.g., "festival circuit", "streaming original", "studio tentpole")

ANTI-AI WRITING RULES:
- NO "In a world..." or "When everything changes..."
- NO "But little does he know..." or "Soon, they'll discover..."
- Be SPECIFIC: Names, places, visceral details
- Match the tone to genre (noir=cynical, horror=dread, comedy=ironic)

Output ONLY valid JSON with no markdown:
{"logline": "...", "backCoverCopy": "...", "amazonKeywords": ["tag1", "tag2", ...]}`
    : `You are a professional Book Publicist and Amazon Marketing Expert.

BOOK TITLE: "${data.title}"
GENRE: ${data.genre}
BOOK TYPE: ${data.bookType}
AUTHOR: ${data.authorName || 'Anonymous'}

BOOK SUMMARY:
${data.chapterSummaries.substring(0, 4000)}

ORIGINAL CONCEPT:
${data.originalIdea?.substring(0, 500) || 'N/A'}

YOUR MARKETING TASK:

1. LOGLINE: Create a high-concept, one-sentence pitch under 30 words that captures the "Promise of the Premise".
   - For fiction: Focus on the protagonist, their goal, and the central conflict
   - For non-fiction: Focus on the transformation or outcome the reader will achieve

2. BACK COVER COPY (The Blurb): Write a 150-200 word marketing description.
   ${isNonFiction ? `
   FOR NON-FICTION:
   - Open with the PROBLEM the reader faces
   - Present the book's unique VALUE PROPOSITION
   - Use authoritative but accessible language
   - End with a clear call-to-action or promise
   - Use bullet points sparingly for key takeaways` : `
   FOR FICTION:
   - Open with atmosphere or an intriguing hook
   - Introduce the protagonist and their world
   - Present the inciting incident and stakes
   - Build tension with "But when..." or "Until..."
   - End on a question or cliffhanger that compels reading
   - DO NOT reveal the ending`}

3. AMAZON KEYWORDS: Identify 7 highly specific, search-optimized keywords/phrases.
   - Use specific niche terms (e.g., "enemies-to-lovers fantasy romance" not just "romance")
   - Include comparable author names if applicable (e.g., "fans of Brandon Sanderson")
   - Mix broad category terms with specific sub-genre terms

MANDATORY ANTI-AI STANDARDS:
- NEVER start with "In a world..." or "Have you ever wondered..."
- NEVER use "Dive into..." or "Embark on a journey..."
- NEVER use "This book will change..." or "Discover the secrets..."
- Use ACTIVE voice and SPECIFIC details
- For mature content: Be suggestive and evocative, not clinical
- Match the tone to the genre (thriller=tense, romance=emotional, etc.)

Output ONLY valid JSON with no markdown formatting:
{"logline": "...", "backCoverCopy": "...", "amazonKeywords": ["keyword1", "keyword2", ...]}`;

  try {
    const result = await withTimeout(
      () => getGeminiFlash().generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
        safetySettings: SAFETY_SETTINGS,
      }),
      60000,
      'generateMetadataAndMarketing'
    );

    const responseText = result.response.text().trim();

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    // Sanitize common JSON issues from AI responses
    // Fix unescaped newlines inside string values
    jsonStr = jsonStr.replace(/("(?:[^"\\]|\\.)*")|[\n\r]/g, (match, group1) => {
      if (group1) return group1; // Keep string content as-is
      return '\\n'; // Escape stray newlines
    });

    // Fix unescaped quotes inside strings (common AI mistake)
    // This is a best-effort fix - look for patterns like: "text "quoted" text"
    jsonStr = jsonStr.replace(/"([^"]*)"([^":,}\]]*)"([^"]*)":/g, '"$1\\"$2\\"$3":');

    // Remove control characters except common whitespace
    jsonStr = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    const parsed = JSON.parse(jsonStr);

    return {
      logline: parsed.logline || '',
      backCoverCopy: parsed.backCoverCopy || '',
      amazonKeywords: Array.isArray(parsed.amazonKeywords) ? parsed.amazonKeywords : [],
    };
  } catch (error) {
    console.error('[Metadata] Failed to generate marketing metadata:', error);
    // Return empty defaults if generation fails
    return {
      logline: '',
      backCoverCopy: '',
      amazonKeywords: [],
    };
  }
}
