import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const post = await prisma.blogPost.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { title: true, content: true },
  });
  if (!post) { console.log('No posts'); return; }
  console.log(`Title: ${post.title}\n`);
  console.log('First 2000 chars of HTML:\n');
  console.log(post.content.substring(0, 2000));
}

main().catch(console.error).finally(() => prisma.$disconnect());
