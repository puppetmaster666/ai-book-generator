/**
 * One-time script to clean up duplicate blog posts.
 * Keeps the latest version of each unique title, deletes older duplicates.
 *
 * Run: npx tsx scripts/cleanup-blog.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allPosts = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, primaryKeyword: true, createdAt: true },
  });

  console.log(`Total posts: ${allPosts.length}`);

  // Group by normalized title
  const groups = new Map<string, typeof allPosts>();
  for (const post of allPosts) {
    const key = post.title.toLowerCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(post);
  }

  const toDelete: string[] = [];
  for (const [title, posts] of groups) {
    if (posts.length > 1) {
      console.log(`\nDuplicate: "${title}" (${posts.length} copies)`);
      // Keep the first (newest), delete the rest
      for (let i = 1; i < posts.length; i++) {
        console.log(`  DELETE: ${posts[i].id} (${posts[i].slug}) created ${posts[i].createdAt.toISOString()}`);
        toDelete.push(posts[i].id);
      }
    }
  }

  // Also check for posts with very similar titles (only keep 4 most recent unique ones)
  // Keep max 4 articles total for now (the latest 4 unique titles)
  const uniqueTitles = [...groups.keys()];
  console.log(`\nUnique titles: ${uniqueTitles.length}`);

  if (toDelete.length > 0) {
    console.log(`\nDeleting ${toDelete.length} duplicate posts...`);
    const result = await prisma.blogPost.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`Deleted: ${result.count}`);
  } else {
    console.log('\nNo duplicates found.');
  }

  // Show remaining posts
  const remaining = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, createdAt: true },
  });
  console.log(`\nRemaining posts (${remaining.length}):`);
  for (const p of remaining) {
    console.log(`  - ${p.title} (${p.slug})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
