import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const all = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, title: true } });
  console.log(`Total: ${all.length}`);

  // Keep 6 most recent, delete the rest
  const toDelete = all.slice(6);
  console.log(`\nKeeping ${Math.min(6, all.length)} articles`);
  console.log(`Deleting ${toDelete.length} older articles:`);
  for (const p of toDelete) console.log(`  - ${p.title}`);

  if (toDelete.length > 0) {
    const result = await prisma.blogPost.deleteMany({ where: { id: { in: toDelete.map(p => p.id) } } });
    console.log(`\nDeleted: ${result.count}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
