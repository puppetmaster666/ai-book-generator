import epub from 'epub-gen-memory';
import { FONT_STYLES } from './constants';

interface Illustration {
  imageUrl: string;
  altText?: string;
  position: number;
}

interface Chapter {
  number: number;
  title: string;
  content: string;
  illustrations?: Illustration[];
}

interface BookData {
  title: string;
  authorName: string;
  genre: string;
  chapters: Chapter[];
  fontStyle: keyof typeof FONT_STYLES;
  coverImageUrl?: string;
  bookFormat?: string; // text_only, illustrated, picture_book
}

function formatIllustration(illustration: Illustration, isPictureBook: boolean): string {
  const imgStyle = isPictureBook
    ? 'width: 100%; max-width: 100%; height: auto; display: block; margin: 1em auto;'
    : 'width: 80%; max-width: 500px; height: auto; display: block; margin: 2em auto;';

  return `
    <figure style="text-align: center; margin: 2em 0; page-break-inside: avoid;">
      <img src="${illustration.imageUrl}" alt="${illustration.altText || 'Illustration'}" style="${imgStyle}" />
      ${illustration.altText ? `<figcaption style="font-style: italic; font-size: 0.9em; margin-top: 0.5em; color: #666;">${illustration.altText}</figcaption>` : ''}
    </figure>
  `;
}

function formatChapterContent(
  content: string,
  fontStyle: keyof typeof FONT_STYLES,
  illustrations?: Illustration[],
  isPictureBook?: boolean
): string {
  const fonts = FONT_STYLES[fontStyle];

  // Convert plain text to HTML with proper formatting
  const paragraphsArray = content
    .split('\n\n')
    .filter(p => p.trim());

  // For picture books, we interleave images with short text
  if (isPictureBook && illustrations && illustrations.length > 0) {
    const sortedIllustrations = [...illustrations].sort((a, b) => a.position - b.position);

    // Picture book format: image at top, then text
    let html = '';

    // Add first illustration at the start
    if (sortedIllustrations[0]) {
      html += formatIllustration(sortedIllustrations[0], true);
    }

    // Add the text content
    html += paragraphsArray.map(p => {
      if (p.match(/^(Chapter \d+|[A-Z][A-Z\s]+$)/)) {
        return `<h2 style="font-family: '${fonts.heading}', serif; text-align: center; margin-top: 1em;">${p}</h2>`;
      }
      return `<p style="font-family: '${fonts.body}', serif; text-indent: 0; margin: 0.5em 0; text-align: center; font-size: 1.2em; line-height: 1.8;">${p}</p>`;
    }).join('\n');

    // Add second illustration at the end if exists
    if (sortedIllustrations[1]) {
      html += formatIllustration(sortedIllustrations[1], true);
    }

    return `<div style="font-family: '${fonts.body}', serif;">${html}</div>`;
  }

  // For illustrated books, add image at the start of the chapter
  let illustrationHtml = '';
  if (illustrations && illustrations.length > 0) {
    const sortedIllustrations = [...illustrations].sort((a, b) => a.position - b.position);
    illustrationHtml = sortedIllustrations.map(ill => formatIllustration(ill, false)).join('\n');
  }

  const paragraphs = paragraphsArray
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
      ${illustrationHtml}
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

  const isPictureBook = bookData.bookFormat === 'picture_book';

  // Start with title page, then add chapters
  const chapters = [
    {
      title: 'Title Page',
      content: titlePageHtml,
      excludeFromToc: true,
    },
    ...bookData.chapters.map(chapter => ({
      title: chapter.title,
      content: formatChapterContent(
        chapter.content,
        bookData.fontStyle,
        chapter.illustrations,
        isPictureBook
      ),
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
