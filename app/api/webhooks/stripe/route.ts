import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { trackServerPurchase } from '@/lib/reddit-conversions-api';
import { PRICING, CREDIT_PACKS } from '@/lib/constants';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(secretKey);
}

// Map productType to credit amount for subscriptions
function getSubscriptionCredits(productType: string): number {
  switch (productType) {
    case 'starter_monthly': return PRICING.STARTER_MONTHLY.credits;
    case 'starter_yearly': return PRICING.STARTER_YEARLY.credits;
    case 'author_monthly': return PRICING.AUTHOR_MONTHLY.credits;
    case 'author_yearly': return PRICING.AUTHOR_YEARLY.credits;
    case 'pro_monthly': return PRICING.PRO_MONTHLY.credits;
    case 'pro_yearly': return PRICING.PRO_YEARLY.credits;
    // Legacy plans: convert old credits to new scale (1 old = ~120 new)
    case 'monthly': return 600;
    case 'yearly': return 7200;
    default: return 0;
  }
}

// Map productType to credit amount for credit packs
function getCreditPackAmount(productType: string): number {
  switch (productType) {
    case 'credit_single': return CREDIT_PACKS.single.credits;
    case 'credit_five': return CREDIT_PACKS.five_pack.credits;
    case 'credit_ten': return CREDIT_PACKS.ten_pack.credits;
    default: return 0;
  }
}

const SUBSCRIPTION_TYPES = [
  'starter_monthly', 'starter_yearly',
  'author_monthly', 'author_yearly',
  'pro_monthly', 'pro_yearly',
  'monthly', 'yearly',
];

const CREDIT_PACK_TYPES = ['credit_single', 'credit_five', 'credit_ten'];

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { bookId, productType, promoCode } = session.metadata || {};

        // Increment promo code usage now that payment is confirmed
        if (promoCode) {
          try {
            await prisma.promoCode.update({
              where: { code: promoCode },
              data: { currentUses: { increment: 1 } },
            });
          } catch (err) {
            console.error('Failed to increment promo usage for code:', promoCode, err);
          }
        }

        // Create payment record
        await prisma.payment.create({
          data: {
            stripePaymentId: session.id,
            stripeCustomerId: session.customer as string,
            email: session.customer_email || session.customer_details?.email || 'unknown',
            amount: session.amount_total || 0,
            status: 'completed',
            productType: productType || 'one-time',
            bookId: bookId || null,
          },
        });

        // Track purchase conversion
        trackServerPurchase({
          email: session.customer_email || session.customer_details?.email || undefined,
          value: (session.amount_total || 0) / 100,
          currency: session.currency?.toUpperCase() || 'USD',
          conversionId: session.id,
        }).catch(err => console.error('Reddit conversion tracking failed:', err));

        // === SINGLE BOOK PURCHASE (one-time or upgrade) ===
        if ((productType === 'one-time' || productType === 'upgrade') && bookId) {
          const customerEmail = session.customer_email;
          await prisma.book.update({
            where: { id: bookId },
            data: {
              paymentStatus: 'completed',
              paymentId: session.id,
              ...(customerEmail && { email: customerEmail.toLowerCase() }),
            },
          });

          // Trigger generation (fire and forget)
          console.log(`[Webhook] Triggering generation for book ${bookId}`);
          fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/books/${bookId}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverDriven: true }),
          }).catch(console.error);
        }

        // === CREDIT PACK PURCHASE ===
        if (productType && CREDIT_PACK_TYPES.includes(productType)) {
          const creditsToAdd = getCreditPackAmount(productType);
          const email = session.customer_email;
          if (email && creditsToAdd > 0) {
            await prisma.user.upsert({
              where: { email },
              update: { creditBalance: { increment: creditsToAdd } },
              create: {
                email,
                creditBalance: creditsToAdd,
                stripeCustomerId: session.customer as string,
              },
            });
            console.log(`[Webhook] Added ${creditsToAdd} credits to ${email} (credit pack: ${productType})`);
          }
        }

        // === SUBSCRIPTION PURCHASE ===
        if (productType && SUBSCRIPTION_TYPES.includes(productType)) {
          const creditsToAdd = getSubscriptionCredits(productType);
          const email = session.customer_email;
          if (email) {
            await prisma.user.upsert({
              where: { email },
              update: {
                plan: productType,
                creditBalance: { increment: creditsToAdd },
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
              },
              create: {
                email,
                plan: productType,
                creditBalance: creditsToAdd,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
              },
            });
            console.log(`[Webhook] Subscription ${productType}: added ${creditsToAdd} credits to ${email}`);
          }
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // If subscription becomes inactive, set plan to free (keep credits for rollover)
        if (subscription.status !== 'active') {
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: { plan: 'free' },
          });
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Cancel: set plan to free, keep remaining credits (rollover)
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            plan: 'free',
            stripeSubscriptionId: null,
          },
        });

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;

        // Subscription renewal: ADD credits (rollover), don't reset
        if (subscriptionId && invoice.billing_reason === 'subscription_cycle') {
          const user = await prisma.user.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
            select: { id: true, plan: true },
          });

          if (user) {
            const creditsToAdd = getSubscriptionCredits(user.plan);
            if (creditsToAdd > 0) {
              await prisma.user.update({
                where: { id: user.id },
                data: { creditBalance: { increment: creditsToAdd } },
              });
              console.log(`[Webhook] Renewal: added ${creditsToAdd} credits to user ${user.id} (plan: ${user.plan})`);
            }
          }
        }

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
