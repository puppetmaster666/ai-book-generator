import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { PRICING, CREDIT_PACKS } from '@/lib/constants';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(secretKey);
}

// Product types that are subscriptions (recurring)
const SUBSCRIPTION_TYPES = [
  'starter_monthly', 'starter_yearly',
  'author_monthly', 'author_yearly',
  'pro_monthly', 'pro_yearly',
  'monthly', 'yearly', // legacy
];

// Product types that are credit pack purchases (one-time)
const CREDIT_PACK_TYPES = ['credit_single', 'credit_five', 'credit_ten'];

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
    let isSubscription = false;
    let interval: 'month' | 'year' = 'month';

    switch (productType) {
      // === UPGRADE FROM FREE PREVIEW ===
      case 'upgrade':
        if (!bookId) {
          return NextResponse.json({ error: 'Book ID required for upgrade' }, { status: 400 });
        }
        amount = PRICING.UPGRADE.price;
        description = 'DraftMyBook - Unlock Full Book (Upgrade)';
        break;

      // === SINGLE BOOK PURCHASE ===
      case 'one-time': {
        if (!bookId) {
          return NextResponse.json({ error: 'Book ID required' }, { status: 400 });
        }
        const book = await prisma.book.findUnique({
          where: { id: bookId },
          select: { bookFormat: true },
        });
        if (book?.bookFormat === 'picture_book') {
          amount = PRICING.VISUAL.price;
          description = 'DraftMyBook - Visual Book';
        } else {
          amount = PRICING.ONE_TIME.price;
          description = 'DraftMyBook - Single Book';
        }
        break;
      }

      // === CREDIT PACKS (one-time) ===
      case 'credit_single':
        amount = CREDIT_PACKS.single.price;
        description = `DraftMyBook - ${CREDIT_PACKS.single.credits} Credits`;
        break;
      case 'credit_five':
        amount = CREDIT_PACKS.five_pack.price;
        description = `DraftMyBook - ${CREDIT_PACKS.five_pack.credits} Credits`;
        break;
      case 'credit_ten':
        amount = CREDIT_PACKS.ten_pack.price;
        description = `DraftMyBook - ${CREDIT_PACKS.ten_pack.credits} Credits`;
        break;

      // === SUBSCRIPTIONS ===
      case 'starter_monthly':
        amount = PRICING.STARTER_MONTHLY.price;
        description = 'DraftMyBook Starter - 600 credits/month';
        isSubscription = true;
        interval = 'month';
        break;
      case 'starter_yearly':
        amount = PRICING.STARTER_YEARLY.price;
        description = 'DraftMyBook Starter - 7,200 credits/year';
        isSubscription = true;
        interval = 'year';
        break;
      case 'author_monthly':
        amount = PRICING.AUTHOR_MONTHLY.price;
        description = 'DraftMyBook Author - 1,500 credits/month';
        isSubscription = true;
        interval = 'month';
        break;
      case 'author_yearly':
        amount = PRICING.AUTHOR_YEARLY.price;
        description = 'DraftMyBook Author - 18,000 credits/year';
        isSubscription = true;
        interval = 'year';
        break;
      case 'pro_monthly':
        amount = PRICING.PRO_MONTHLY.price;
        description = 'DraftMyBook Pro - 4,000 credits/month';
        isSubscription = true;
        interval = 'month';
        break;
      case 'pro_yearly':
        amount = PRICING.PRO_YEARLY.price;
        description = 'DraftMyBook Pro - 48,000 credits/year';
        isSubscription = true;
        interval = 'year';
        break;

      // === LEGACY SUBSCRIPTIONS ===
      case 'monthly':
        amount = PRICING.MONTHLY.price;
        description = 'DraftMyBook Author Plan (Legacy)';
        isSubscription = true;
        interval = 'month';
        break;
      case 'yearly':
        amount = PRICING.YEARLY.price;
        description = 'DraftMyBook Author Yearly (Legacy)';
        isSubscription = true;
        interval = 'year';
        break;

      default:
        return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
    }

    // Apply promo code discount if valid
    let appliedPromo = '';
    if (promoCode) {
      const code = promoCode.toUpperCase();
      const dbPromo = await prisma.promoCode.findUnique({ where: { code } });

      if (dbPromo && dbPromo.isActive &&
          (!dbPromo.validUntil || new Date() <= dbPromo.validUntil) &&
          dbPromo.currentUses < dbPromo.maxUses) {
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

    // Determine mode and success/cancel URLs
    const isOneTimeBookPurchase = productType === 'one-time' || productType === 'upgrade';
    const isCreditPack = CREDIT_PACK_TYPES.includes(productType);

    const successUrl = productType === 'upgrade'
      ? `${process.env.NEXT_PUBLIC_APP_URL}/generate-comic?bookId=${bookId}&upgraded=true`
      : isOneTimeBookPurchase
        ? `${process.env.NEXT_PUBLIC_APP_URL}/book/${bookId}?success=true&session_id={CHECKOUT_SESSION_ID}`
        : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&plan=${productType}&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = productType === 'upgrade'
      ? `${process.env.NEXT_PUBLIC_APP_URL}/generate-comic?bookId=${bookId}`
      : isOneTimeBookPurchase
        ? `${process.env.NEXT_PUBLIC_APP_URL}/checkout?canceled=true&bookId=${bookId}`
        : `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: description },
            unit_amount: amount,
            ...(isSubscription && {
              recurring: { interval },
            }),
          },
          quantity: 1,
        },
      ],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      metadata: {
        bookId: bookId || '',
        productType,
        promoCode: appliedPromo,
      },
    });

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
