import Epub from 'epub-gen-memory';
import { FONT_STYLES } from './constants';

interface Chapter {
  number: number;
  title: string;
  content: string;
}

interface BookData {
  title: string;
  authorName: string;
  genre: string;
  chapters: Chapter[];
  fontStyle: keyof typeof FONT_STYLES;
  coverImageUrl?: string;
}

function formatChapterContent(content: string, fontStyle: keyof typeof FONT_STYLES): string {
  const fonts = FONT_STYLES[fontStyle];

  // Convert plain text to HTML with proper formatting
  const paragraphs = content
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => {
      // Check if it's a chapter heading
      if (p.match(/^(Chapter \d+|[A-Z][A-Z\s]+$)/)) {
        return `<h2 style="font-family: '${fonts.heading}', serif; text-align: center; margin-top: 2em;">${p}</h2>`;
      }
      // Check if it's dialogue
      if (p.startsWith('"') || p.startsWith("'") || p.startsWith('"')) {
        return `<p style="font-family: '${fonts.body}', serif; text-indent: 1.5em; margin: 0.5em 0;">${p}</p>`;
      }
      // Regular paragraph
      return `<p style="font-family: '${fonts.body}', serif; text-indent: 1.5em; margin: 0.5em 0; line-height: 1.6;">${p}</p>`;
    })
    .join('\n');

  return `
    <div style="font-family: '${fonts.body}', serif; font-size: 1em; line-height: 1.6;">
      ${paragraphs}
    </div>
  `;
}

export async function generateEpub(bookData: BookData): Promise<Buffer> {
  const options = {
    title: bookData.title,
    author: bookData.authorName,
    publisher: 'AI Book Generator',
    cover: bookData.coverImageUrl,
    content: bookData.chapters.map(chapter => ({
      title: chapter.title,
      data: formatChapterContent(chapter.content, bookData.fontStyle),
    })),
    css: `
      body {
        font-family: '${FONT_STYLES[bookData.fontStyle].body}', Georgia, serif;
        line-height: 1.6;
        margin: 1em;
      }
      h1, h2, h3 {
        font-family: '${FONT_STYLES[bookData.fontStyle].heading}', Georgia, serif;
        text-align: center;
      }
      p {
        text-indent: 1.5em;
        margin: 0.5em 0;
      }
      .chapter-title {
        page-break-before: always;
        margin-top: 3em;
        margin-bottom: 2em;
      }
    `,
  };

  const epub = await new Epub(options).genEpub();
  return Buffer.from(epub);
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;
}
