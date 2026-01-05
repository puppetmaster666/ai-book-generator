// Script to verify all password users who haven't verified yet
// Run with: node scripts/fix-unverified-users.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUnverifiedUsers() {
  console.log('Finding unverified password users...\n');

  // Find users who have a password but no emailVerified
  const unverifiedUsers = await prisma.user.findMany({
    where: {
      emailVerified: null,
      passwordHash: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  console.log(`Found ${unverifiedUsers.length} unverified password users\n`);

  if (unverifiedUsers.length === 0) {
    console.log('No users to fix!');
    return;
  }

  // Update each user
  for (const user of unverifiedUsers) {
    console.log(`Verifying: ${user.email}`);
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  console.log(`\nVerified ${unverifiedUsers.length} users!`);
}

fixUnverifiedUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
