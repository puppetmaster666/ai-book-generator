import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { PRICING } from '@/lib/constants';

// Promo codes configuration
const PROMO_CODES: Record<string, { discount: number; validUntil: Date; description: string }> = {
  'NY26': {
    discount: 0.50, // 50% off
    validUntil: new Date('2026-01-02T00:00:00Z'), // Valid until Jan 1, 2026 midnight
    description: 'New Year 2026 Special - 50% Off',
  },
};

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-12-15.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const body = await request.json();
    const { bookId, email, productType, applyDiscount, promoCode } = body;

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
          amount = PRICING.CHILDRENS.price;
          description = 'AI Book Generator - Picture Book';
        } else if (book?.bookFormat === 'illustrated') {
          amount = PRICING.ILLUSTRATED.price;
          description = 'AI Book Generator - Illustrated Book';
        } else {
          amount = PRICING.ONE_TIME.price;
          description = 'AI Book Generator - Single Book';
        }
        break;
      case 'monthly':
        amount = PRICING.MONTHLY.price;
        description = 'AI Book Generator - Monthly Plan (5 books/month)';
        break;
      case 'yearly':
        amount = PRICING.YEARLY.price;
        description = 'AI Book Generator - Yearly Plan (50 credits)';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid product type' },
          { status: 400 }
        );
    }

    // Apply promo code discount if valid
    let appliedPromo = '';
    if (promoCode && PROMO_CODES[promoCode.toUpperCase()]) {
      const promo = PROMO_CODES[promoCode.toUpperCase()];
      if (new Date() <= promo.validUntil) {
        amount = Math.round(amount * (1 - promo.discount));
        appliedPromo = promoCode.toUpperCase();
      }
    } else if (applyDiscount) {
      // Apply 15% idle discount if no promo code
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/${bookId || 'dashboard'}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?canceled=true&bookId=${bookId || ''}`,
      customer_email: email,
      metadata: {
        bookId: bookId || '',
        productType,
        applyDiscount: applyDiscount ? 'true' : 'false',
        promoCode: appliedPromo,
      },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        stripePaymentId: session.id,
        email,
        amount,
        status: 'pending',
        productType,
        bookId: bookId || null,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
