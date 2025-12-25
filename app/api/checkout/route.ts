import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { PRICING } from '@/lib/constants';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, email, productType, applyDiscount } = body;

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
        amount = PRICING.ONE_TIME.price;
        description = 'AI Book Generator - Single Book';
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

    // Apply 15% discount if applicable
    if (applyDiscount) {
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
