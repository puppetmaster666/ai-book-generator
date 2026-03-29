import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { trackServerPurchase } from '@/lib/reddit-conversions-api';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(secretKey);
}

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

        // Create payment record now that payment is confirmed
        // We don't create it during checkout to avoid tracking abandoned sessions
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

        // Track purchase conversion server-side (Reddit Conversions API)
        // This is more reliable than client-side pixel (works with ad blockers)
        trackServerPurchase({
          email: session.customer_email || session.customer_details?.email || undefined,
          value: (session.amount_total || 0) / 100, // Convert cents to dollars
          currency: session.currency?.toUpperCase() || 'USD',
          conversionId: session.id, // Use Stripe session ID for deduplication
        }).catch(err => console.error('Reddit conversion tracking failed:', err));

        // Handle one-time purchase
        if (productType === 'one-time' && bookId) {
          // Save the customer email to the book for completion notifications
          const customerEmail = session.customer_email;

          // Get book to check if it's a visual book
          const book = await prisma.book.findUnique({
            where: { id: bookId },
            select: { bookFormat: true, dialogueStyle: true, bookPreset: true },
          });

          await prisma.book.update({
            where: { id: bookId },
            data: {
              paymentStatus: 'completed',
              paymentId: session.id,
              // Save email for completion notification (only if book doesn't have one yet)
              ...(customerEmail && { email: customerEmail.toLowerCase() }),
            },
          });

          // Trigger server-driven generation for ALL book types (fire and forget)
          // User can leave the page - server handles everything, email sent on completion
          console.log(`[Webhook] Triggering server-driven generation for book ${bookId} (format: ${book?.bookFormat})`);
          fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/books/${bookId}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverDriven: true }),
          }).catch(console.error);
        }

        // Handle subscription
        if (productType === 'monthly' || productType === 'yearly') {
          const email = session.customer_email;
          if (email) {
            // Find or create user
            let user = await prisma.user.findUnique({
              where: { email },
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  email,
                  plan: productType,
                  credits: productType === 'monthly' ? 5 : 50,
                  stripeCustomerId: session.customer as string,
                  stripeSubscriptionId: session.subscription as string,
                },
              });
            } else {
              await prisma.user.update({
                where: { email },
                data: {
                  plan: productType,
                  credits: productType === 'monthly'
                    ? 5
                    : { increment: 50 }, // Add credits for yearly
                  stripeCustomerId: session.customer as string,
                  stripeSubscriptionId: session.subscription as string,
                },
              });
            }
          }
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            plan: subscription.status === 'active'
              ? (subscription.items.data[0]?.plan?.interval === 'month' ? 'monthly' : 'yearly')
              : 'free',
          },
        });

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

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

        // Refresh credits for monthly subscribers
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          if (subscription.items.data[0]?.plan?.interval === 'month') {
            await prisma.user.updateMany({
              where: { stripeSubscriptionId: subscription.id },
              data: { credits: 5 },
            });
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
