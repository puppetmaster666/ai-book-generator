import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Delete ALL blog posts
  const deleted = await prisma.blogPost.deleteMany({});
  console.log(`Deleted all ${deleted.count} blog posts.`);
  console.log('Blog is now empty. Generate fresh articles from admin dashboard.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
