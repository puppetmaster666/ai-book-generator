// Sync pending payments with Stripe to update their actual status
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');

const prisma = new PrismaClient();

async function syncPayments() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY not set');
    process.exit(1);
  }

  const stripe = new Stripe(stripeSecretKey);

  // Get all pending payments
  const pendingPayments = await prisma.payment.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${pendingPayments.length} pending payments. Checking Stripe...`);

  let updated = 0;
  let failed = 0;
  let stillPending = 0;

  for (const payment of pendingPayments) {
    try {
      // Fetch session from Stripe
      const session = await stripe.checkout.sessions.retrieve(payment.stripePaymentId);

      console.log(`\nSession ${payment.stripePaymentId.slice(-10)}:`);
      console.log(`  Email: ${payment.email}`);
      console.log(`  Amount: $${payment.amount / 100}`);
      console.log(`  Stripe status: ${session.status}`);
      console.log(`  Payment status: ${session.payment_status}`);

      if (session.payment_status === 'paid') {
        // Update to completed
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'completed',
            stripeCustomerId: session.customer || null,
          },
        });
        console.log(`  ✓ Updated to COMPLETED`);
        updated++;
      } else if (session.status === 'expired' || session.status === 'complete' && session.payment_status === 'unpaid') {
        // Mark as failed (expired/abandoned)
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'failed' },
        });
        console.log(`  ✗ Marked as FAILED (${session.status})`);
        failed++;
      } else {
        console.log(`  - Still pending`);
        stillPending++;
      }
    } catch (error) {
      console.error(`  Error checking ${payment.stripePaymentId}: ${error.message}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated to completed: ${updated}`);
  console.log(`Marked as failed: ${failed}`);
  console.log(`Still pending: ${stillPending}`);

  await prisma.$disconnect();
}

syncPayments().catch(console.error);
