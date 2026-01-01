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
  bookFormat?: string; // text_only, illustrated, picture_book, comic_book
  dialogueStyle?: string; // prose, bubbles
}

// Helper to check if a string is a base64 data URL
function isBase64DataUrl(url: string): boolean {
  return url.startsWith('data:image/');
}

// Compress base64 image by reducing quality (simple approach)
// For large comics, this helps prevent memory issues
function processImageForEpub(imageUrl: string, maxSizeKb: number = 500): string {
  if (!isBase64DataUrl(imageUrl)) {
    return imageUrl;
  }

  // If the base64 is too large, we'll return a placeholder message
  // The epub-gen-memory library struggles with very large data URIs
  const base64Length = imageUrl.length;
  const estimatedSizeKb = (base64Length * 3) / 4 / 1024; // rough estimate

  if (estimatedSizeKb > maxSizeKb * 2) {
    console.warn(`Image too large (${Math.round(estimatedSizeKb)}KB), may cause issues`);
  }

  return imageUrl;
}

function formatIllustration(illustration: Illustration, format: 'picture_book' | 'comic' | 'standard'): string {
  const processedUrl = processImageForEpub(illustration.imageUrl);

  let imgStyle: string;
  if (format === 'comic') {
    // Comic panels should be full page
    imgStyle = 'width: 100%; height: auto; display: block; margin: 0;';
  } else if (format === 'picture_book') {
    imgStyle = 'width: 100%; max-width: 100%; height: auto; display: block; margin: 1em auto;';
  } else {
    imgStyle = 'width: 80%; max-width: 500px; height: auto; display: block; margin: 2em auto;';
  }

  // For comics, no caption - just the image
  if (format === 'comic') {
    return `
      <div style="page-break-after: always; page-break-inside: avoid;">
        <img src="${processedUrl}" alt="${illustration.altText || 'Comic panel'}" style="${imgStyle}" />
      </div>
    `;
  }

  return `
    <figure style="text-align: center; margin: 2em 0; page-break-inside: avoid;">
      <img src="${processedUrl}" alt="${illustration.altText || 'Illustration'}" style="${imgStyle}" />
      ${illustration.altText ? `<figcaption style="font-style: italic; font-size: 0.9em; margin-top: 0.5em; color: #666;">${illustration.altText}</figcaption>` : ''}
    </figure>
  `;
}

function formatChapterContent(
  content: string,
  fontStyle: keyof typeof FONT_STYLES,
  illustrations?: Illustration[],
  bookFormat?: string
): string {
  const fonts = FONT_STYLES[fontStyle];
  const isPictureBook = bookFormat === 'picture_book';
  const isComic = bookFormat === 'comic_book' || bookFormat === 'comic';

  // Keep AI-generated "The End" markers
  let cleanedContent = content.trim();

  // Convert plain text to HTML with proper formatting
  const paragraphsArray = cleanedContent
    .split('\n\n')
    .filter(p => p.trim());

  // For comics: primarily image-based, minimal text
  if (isComic && illustrations && illustrations.length > 0) {
    const sortedIllustrations = [...illustrations].sort((a, b) => a.position - b.position);

    // Comic format: just show the panel images
    let html = '';
    for (const ill of sortedIllustrations) {
      html += formatIllustration(ill, 'comic');
    }

    // Add any text content below (usually minimal for comics)
    if (paragraphsArray.length > 0 && paragraphsArray[0].trim()) {
      html += `<div style="text-align: center; padding: 1em; font-family: '${fonts.body}', serif;">`;
      html += paragraphsArray.map(p =>
        `<p style="margin: 0.5em 0; font-size: 1.1em;">${p}</p>`
      ).join('\n');
      html += '</div>';
    }

    return html;
  }

  // For picture books, we interleave images with short text
  if (isPictureBook && illustrations && illustrations.length > 0) {
    const sortedIllustrations = [...illustrations].sort((a, b) => a.position - b.position);

    // Picture book format: image at top, then text
    let html = '';

    // Add first illustration at the start
    if (sortedIllustrations[0]) {
      html += formatIllustration(sortedIllustrations[0], 'picture_book');
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
      html += formatIllustration(sortedIllustrations[1], 'picture_book');
    }

    return `<div style="font-family: '${fonts.body}', serif;">${html}</div>`;
  }

  // For illustrated books, add image at the start of the chapter
  let illustrationHtml = '';
  if (illustrations && illustrations.length > 0) {
    const sortedIllustrations = [...illustrations].sort((a, b) => a.position - b.position);
    illustrationHtml = sortedIllustrations.map(ill => formatIllustration(ill, 'standard')).join('\n');
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
  const isComic = bookData.dialogueStyle === 'bubbles' || bookData.bookFormat === 'comic_book';

  // Create title page HTML
  const titlePageHtml = `
    <div style="text-align: center; margin-top: 30%; font-family: '${fonts.heading}', Georgia, serif;">
      <h1 style="font-size: 2.5em; margin-bottom: 0.5em; font-weight: bold;">${bookData.title}</h1>
      <p style="font-size: 1.2em; margin-top: 2em; font-style: italic;">${isComic ? 'A Comic Story' : 'A Novel'}</p>
      <p style="font-size: 1.5em; margin-top: 3em;">by</p>
      <p style="font-size: 1.8em; margin-top: 0.5em; font-weight: bold;">${bookData.authorName}</p>
    </div>
  `;

  // Process cover image if it's a base64 data URL
  const coverUrl = bookData.coverImageUrl ? processImageForEpub(bookData.coverImageUrl) : undefined;

  const options = {
    title: bookData.title,
    author: bookData.authorName,
    cover: coverUrl,
    css: `
      body {
        font-family: '${fonts.body}', Georgia, serif;
        line-height: 1.6;
        margin: ${isComic ? '0' : '1em'};
      }
      h1, h2, h3 {
        font-family: '${fonts.heading}', Georgia, serif;
        text-align: center;
      }
      p {
        text-indent: ${isComic ? '0' : '1.5em'};
        margin: 0.5em 0;
      }
      .chapter-title {
        page-break-before: always;
        margin-top: 3em;
        margin-bottom: 2em;
      }
      img {
        max-width: 100%;
        height: auto;
      }
    `,
  };

  // Determine effective book format
  let effectiveFormat = bookData.bookFormat || 'text_only';
  if (isComic) {
    effectiveFormat = 'comic_book';
  }

  // Check if it's a picture book or visual book
  const isPictureBook = bookData.bookFormat === 'picture_book';
  const isVisualBook = isPictureBook || isComic;



  // Build chapters array
  const chapterContents = bookData.chapters.map((chapter, index) => {
    const isLastChapter = index === bookData.chapters.length - 1;
    let content = formatChapterContent(
      chapter.content,
      bookData.fontStyle,
      chapter.illustrations,
      effectiveFormat
    );



    return {
      title: isComic ? `Panel ${chapter.number}` : chapter.title,
      content,
    };
  });

  // Start with title page, then add chapters
  const chapters = [
    {
      title: 'Title Page',
      content: titlePageHtml,
      excludeFromToc: true,
    },
    ...chapterContents,
  ];



  console.log(`Generating EPUB for ${bookData.title} (format: ${effectiveFormat}, chapters: ${chapters.length})`);

  try {
    const epubBuffer = await epub(options, chapters);
    return Buffer.from(epubBuffer);
  } catch (error) {
    console.error('EPUB generation error:', error);
    throw new Error(`Failed to generate EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;
}
