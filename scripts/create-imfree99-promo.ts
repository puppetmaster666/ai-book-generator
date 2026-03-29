/**
 * Script to create the IMFREE99 promo code in the database.
 * Run with: npx tsx scripts/create-imfree99-promo.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Deactivate all existing promo codes
  const deactivated = await prisma.promoCode.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
  console.log(`Deactivated ${deactivated.count} existing promo codes.`);

  // Create or update IMFREE99
  const promo = await prisma.promoCode.upsert({
    where: { code: 'IMFREE99' },
    update: {
      discount: 1.0, // 100% off = free
      maxUses: 99,
      currentUses: 0,
      isActive: true,
      onePerUser: true,
      validUntil: new Date('2027-01-01T00:00:00Z'),
    },
    create: {
      code: 'IMFREE99',
      discount: 1.0,
      maxUses: 99,
      currentUses: 0,
      isActive: true,
      onePerUser: true,
      validUntil: new Date('2027-01-01T00:00:00Z'),
    },
  });

  console.log('Created promo code:', promo);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
