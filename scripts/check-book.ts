import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const book = await prisma.book.findUnique({
    where: { id: '007fbae7-fc02-4f17-958c-6b808b348801' },
    select: {
      paymentStatus: true, paymentMethod: true, status: true,
      bookPreset: true, bookFormat: true, targetChapters: true,
      totalChapters: true, currentChapter: true,
      userId: true,
      _count: { select: { illustrations: true, chapters: true } },
    },
  });
  console.log('BOOK:', JSON.stringify(book, null, 2));

  if (book?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: book.userId },
      select: { email: true, credits: true, freeCredits: true, freeBookUsed: true, isAdmin: true, plan: true },
    });
    console.log('USER:', JSON.stringify(user, null, 2));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
