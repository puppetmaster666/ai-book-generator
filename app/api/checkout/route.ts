import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { PRICING } from '@/lib/constants';

// No hardcoded promos - all promo codes must be in the database

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
    const body = await request.json();
    const { bookId, email, productType, promoCode, applyDiscount } = body;

    if (!email || !productType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let amount: number;
    let description: string;

    switch (productType) {
      case 'one-time':
        if (!bookId) {
          return NextResponse.json(
            { error: 'Book ID required for one-time purchase' },
            { status: 400 }
          );
        }
        // Get book format to determine price
        const book = await prisma.book.findUnique({
          where: { id: bookId },
          select: { bookFormat: true },
        });

        // Set price based on book format
        if (book?.bookFormat === 'picture_book') {
          amount = PRICING.VISUAL.price;
          description = 'AI Book Generator - Visual Book';
        } else {
          amount = PRICING.ONE_TIME.price;
          description = 'AI Book Generator - Single Generation';
        }
        break;
      case 'monthly':
        amount = PRICING.MONTHLY.price;
        description = 'AI Book Generator - Author Plan (5 generations/month, rollover)';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid product type' },
          { status: 400 }
        );
    }

    // Apply promo code discount if valid
    let appliedPromo = '';
    if (promoCode) {
      const code = promoCode.toUpperCase();

      // Check database first
      const dbPromo = await prisma.promoCode.findUnique({
        where: { code },
      });

      if (dbPromo && dbPromo.isActive &&
          (!dbPromo.validUntil || new Date() <= dbPromo.validUntil) &&
          dbPromo.currentUses < dbPromo.maxUses) {
        // Fixed price takes priority over percentage discount
        if (dbPromo.fixedPrice !== null) {
          amount = dbPromo.fixedPrice;
        } else {
          amount = Math.round(amount * (1 - dbPromo.discount));
        }
        appliedPromo = code;
      }
    }

    // Apply one-time 15% idle discount (only if no promo code was applied)
    if (!appliedPromo && applyDiscount) {
      amount = Math.round(amount * 0.85);
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description,
            },
            unit_amount: amount,
            ...(productType !== 'one-time' && {
              recurring: {
                interval: productType === 'monthly' ? 'month' : 'year',
              },
            }),
          },
          quantity: 1,
        },
      ],
      mode: productType === 'one-time' ? 'payment' : 'subscription',
      success_url: productType === 'one-time'
        ? `${process.env.NEXT_PUBLIC_APP_URL}/book/${bookId}?success=true&session_id={CHECKOUT_SESSION_ID}`
        : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: productType === 'one-time'
        ? `${process.env.NEXT_PUBLIC_APP_URL}/checkout?canceled=true&bookId=${bookId}`
        : `${process.env.NEXT_PUBLIC_APP_URL}/checkout?canceled=true&plan=${productType}`,
      customer_email: email,
      metadata: {
        bookId: bookId || '',
        productType,
        promoCode: appliedPromo,
      },
    });

    // Promo usage is incremented in the Stripe webhook after payment confirms

    // Don't create payment record here - wait for webhook to confirm actual payment
    // This prevents "pending" payments from cluttering admin when users abandon checkout

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create checkout session: ${errorMessage}` },
      { status: 500 }
    );
  }
}
