/**
 * Generate a blog article about the v2.5.0 patch with a cover image.
 * Run with: npx tsx scripts/create-patch-blog.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const prisma = new PrismaClient();

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const genAI = new GoogleGenerativeAI(apiKey);

  // Step 1: Generate the article
  console.log('Generating article...');
  const textModel = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    safetySettings: SAFETY_SETTINGS,
  });

  const articlePrompt = `Write a blog article for DraftMyBook.com announcing version 2.5.0.

TONE: Excited but professional. Written for aspiring authors and creators who use the platform. Not technical — focus on what's better for them.

KEY UPDATES TO COVER:
1. Picture books completely redesigned — new 3-step pipeline produces richer stories with varied page layouts (full-bleed, bordered, vignette, spot illustrations), professional text positioning, and an editorial quality review pass
2. All art styles upgraded — watercolor now looks like Jerry Pinkney, cartoon like Pixar, storybook like Beatrix Potter, fantasy like Studio Ghibli, manga like Makoto Shinkai, superhero like Jim Lee
3. Much more reliable generation — books fail far less often, and when they do they auto-recover
4. Automatic content softening — instead of failing on sensitive content, the system now gracefully tones things down and keeps generating
5. Automatic credit refund if something can't be generated
6. Screenplay improvements — sharper dialogue, varied scene lengths, no robotic patterns
7. Prompt history — reuse your previous ideas
8. Credit counter and notifications always visible in the header

RULES:
- 800-1200 words
- Don't mention AI, automation, or pipelines — focus on the creative outcome
- Use subheadings
- Include a call-to-action at the end
- Don't use em dashes, use commas or periods instead
- Mention DraftMyBook naturally 2-3 times

OUTPUT FORMAT:
---TITLE---
The article title (catchy, not technical)
---META---
Meta description for SEO (under 160 chars)
---EXCERPT---
Short excerpt (1-2 sentences)
---BODY---
The full article in markdown format`;

  const articleResult = await textModel.generateContent(articlePrompt);
  const articleText = articleResult.response.text().trim();

  const titleMatch = articleText.match(/---TITLE---\s*([\s\S]*?)---META---/);
  const metaMatch = articleText.match(/---META---\s*([\s\S]*?)---EXCERPT---/);
  const excerptMatch = articleText.match(/---EXCERPT---\s*([\s\S]*?)---BODY---/);
  const bodyMatch = articleText.match(/---BODY---\s*([\s\S]*?)$/);

  const title = titleMatch?.[1]?.trim() || 'What\'s New in DraftMyBook v2.5';
  const metaDescription = metaMatch?.[1]?.trim() || 'DraftMyBook v2.5 brings redesigned picture books, upgraded art styles, and much more reliable book generation.';
  const excerpt = excerptMatch?.[1]?.trim() || 'A major upgrade to picture books, art quality, and generation reliability.';
  const markdownBody = bodyMatch?.[1]?.trim() || '';

  console.log(`Title: ${title}`);
  console.log(`Body length: ${markdownBody.length} chars`);

  // Convert markdown to HTML
  const htmlBody = markdownBody
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hp])/gm, '')
    .replace(/^(.+)$/gm, (line) => {
      if (line.startsWith('<h') || line.startsWith('<p') || line.trim() === '') return line;
      return `<p>${line}</p>`;
    });

  const wrappedHtml = `<article>${htmlBody}</article>`;

  // Step 2: Generate cover image
  console.log('Generating cover image...');
  const imageModel = genAI.getGenerativeModel({
    model: 'gemini-3-pro-image-preview',
    safetySettings: SAFETY_SETTINGS,
  });

  const coverPrompt = `Create a modern, professional blog cover image for a creative writing platform update announcement.

Theme: "Picture Books and Art Quality Upgrade"

Visual concept: A beautiful open picture book with colorful illustrations coming to life, floating off the pages. Mix of watercolor splashes, cartoon characters, and fantasy elements emerging from the book. Warm, inviting lighting.

Style: Modern tech blog cover, clean composition, 16:9 landscape format.
Color palette: Dark charcoal (#171717) background with lime green (#BFFF00) accent, white highlights, and colorful illustration elements.
Typography: Include the text "v2.5" in a clean modern font somewhere subtle.

NO other text besides "v2.5". Professional, premium feel. Magazine-quality composition.`;

  let coverImageUrl: string | null = null;
  try {
    const imageResult = await imageModel.generateContent(coverPrompt);
    const parts = imageResult.response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        coverImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        console.log('Cover image generated');
        break;
      }
    }
  } catch (err) {
    console.error('Cover generation failed (continuing without):', err);
  }

  // Step 3: Save to database
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);

  // Check for existing slug
  const existing = await prisma.blogPost.findUnique({ where: { slug } });
  if (existing) {
    console.log(`Article with slug "${slug}" already exists. Updating...`);
    await prisma.blogPost.update({
      where: { slug },
      data: {
        title,
        content: wrappedHtml,
        excerpt,
        metaDescription,
        coverImageUrl: coverImageUrl,
        published: true,
        publishedAt: new Date(),
      },
    });
  } else {
    await prisma.blogPost.create({
      data: {
        slug,
        title,
        content: wrappedHtml,
        excerpt,
        metaDescription,
        primaryKeyword: 'picture book maker',
        category: 'updates',
        keywords: ['picture book', 'art styles', 'book generation', 'writing tools', 'update'],
        readingTime: Math.ceil(markdownBody.split(/\s+/).length / 200),
        coverImageUrl: coverImageUrl,
        published: true,
        publishedAt: new Date(),
      },
    });
  }

  console.log(`\nBlog article created: "${title}"`);
  console.log(`Slug: /blog/${slug}`);
  console.log(`Cover: ${coverImageUrl ? 'Yes' : 'No'}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
