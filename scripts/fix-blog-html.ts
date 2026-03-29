/**
 * Fix the HTML formatting of all existing blog articles.
 * Re-wraps content with proper <p>, <h2>, <h3>, <ul> tags.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function fixHtml(html: string): string {
  // Strip all existing tags to get plain text, then re-wrap
  let text = html
    // Remove existing tags but keep their content
    .replace(/<h[1-6][^>]*>/gi, '\n\n## ')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/?ul[^>]*>/gi, '\n')
    .replace(/<\/?ol[^>]*>/gi, '\n')
    .replace(/<\/?blockquote[^>]*>/gi, '\n> ')
    .replace(/<\/?strong>/gi, '**')
    .replace(/<\/?em>/gi, '*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<\/?[^>]+>/gi, '') // Strip remaining tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&middot;/g, '·')
    .replace(/&mdash;/g, ', ')
    .replace(/&ndash;/g, ', ')
    .replace(/—/g, ', ')
    .replace(/–/g, ', ');

  // Normalize whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // Now convert back to clean HTML
  const blocks = text.split(/\n\n+/);
  const htmlBlocks: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Check if all lines are list items
    const lines = trimmed.split('\n');
    const isListBlock = lines.every(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));

    if (isListBlock) {
      const items = lines.map(l => {
        const content = l.trim().replace(/^[-*]\s+/, '');
        return `  <li>${applyInline(content)}</li>`;
      });
      htmlBlocks.push(`<ul>\n${items.join('\n')}\n</ul>`);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      htmlBlocks.push(`<h3>${applyInline(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith('## ')) {
      htmlBlocks.push(`<h2>${applyInline(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith('# ')) {
      htmlBlocks.push(`<h2>${applyInline(trimmed.slice(2))}</h2>`);
    } else if (trimmed.startsWith('> ')) {
      htmlBlocks.push(`<blockquote><p>${applyInline(trimmed.slice(2))}</p></blockquote>`);
    } else {
      // Regular paragraph - join lines
      const joined = lines.map(l => l.trim()).join(' ');
      htmlBlocks.push(`<p>${applyInline(joined)}</p>`);
    }
  }

  return htmlBlocks.join('\n\n');
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

async function main() {
  const posts = await prisma.blogPost.findMany({
    select: { id: true, title: true, content: true },
  });

  console.log(`Processing ${posts.length} articles...`);

  for (const post of posts) {
    const fixed = fixHtml(post.content);
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { content: fixed },
    });
    console.log(`Fixed: ${post.title}`);
  }

  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
