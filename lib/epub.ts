import epub from 'epub-gen-memory';
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
  const fonts = FONT_STYLES[bookData.fontStyle];

  // Create title page HTML
  const titlePageHtml = `
    <div style="text-align: center; margin-top: 30%; font-family: '${fonts.heading}', Georgia, serif;">
      <h1 style="font-size: 2.5em; margin-bottom: 0.5em; font-weight: bold;">${bookData.title}</h1>
      <p style="font-size: 1.2em; margin-top: 2em; font-style: italic;">A Novel</p>
      <p style="font-size: 1.5em; margin-top: 3em;">by</p>
      <p style="font-size: 1.8em; margin-top: 0.5em; font-weight: bold;">${bookData.authorName}</p>
    </div>
  `;

  const options = {
    title: bookData.title,
    author: bookData.authorName,
    cover: bookData.coverImageUrl,
    css: `
      body {
        font-family: '${fonts.body}', Georgia, serif;
        line-height: 1.6;
        margin: 1em;
      }
      h1, h2, h3 {
        font-family: '${fonts.heading}', Georgia, serif;
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

  // Start with title page, then add chapters
  const chapters = [
    {
      title: 'Title Page',
      content: titlePageHtml,
      excludeFromToc: true,
    },
    ...bookData.chapters.map(chapter => ({
      title: chapter.title,
      content: formatChapterContent(chapter.content, bookData.fontStyle),
    })),
  ];

  const epubBuffer = await epub(options, chapters);
  return Buffer.from(epubBuffer);
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;
}
