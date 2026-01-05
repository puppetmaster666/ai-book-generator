// Script to fix emailVerified for existing Google OAuth users
// Run with: node scripts/fix-oauth-email-verified.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOAuthEmailVerified() {
  console.log('Finding Google OAuth users with unverified emails...\n');

  // Find users who have Google OAuth accounts but no emailVerified
  const usersWithGoogleAccounts = await prisma.user.findMany({
    where: {
      emailVerified: null,
      accounts: {
        some: {
          provider: 'google',
        },
      },
    },
    include: {
      accounts: {
        select: { provider: true },
      },
    },
  });

  console.log(`Found ${usersWithGoogleAccounts.length} Google OAuth users with unverified emails\n`);

  if (usersWithGoogleAccounts.length === 0) {
    console.log('No users to fix!');
    return;
  }

  // Update each user
  for (const user of usersWithGoogleAccounts) {
    console.log(`Fixing: ${user.email}`);
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  console.log(`\nFixed ${usersWithGoogleAccounts.length} users!`);
}

fixOAuthEmailVerified()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
