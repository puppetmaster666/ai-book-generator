import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';

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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
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

        // Update payment record
        await prisma.payment.updateMany({
          where: { stripePaymentId: session.id },
          data: {
            status: 'completed',
            stripeCustomerId: session.customer as string,
          },
        });

        const { bookId, productType } = session.metadata || {};

        // Handle one-time purchase
        if (productType === 'one-time' && bookId) {
          // Save the customer email to the book for completion notifications
          const customerEmail = session.customer_email;

          await prisma.book.update({
            where: { id: bookId },
            data: {
              paymentStatus: 'completed',
              paymentId: session.id,
              // Save email for completion notification (only if book doesn't have one yet)
              ...(customerEmail && { email: customerEmail.toLowerCase() }),
            },
          });

          // Trigger book generation (fire and forget)
          fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/books/${bookId}/generate`, {
            method: 'POST',
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
