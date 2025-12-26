import { NextRequest, NextResponse } from 'next/server';

// Promo codes configuration (same as checkout)
const PROMO_CODES: Record<string, { discount: number; validUntil: Date; description: string }> = {
  'NY26': {
    discount: 0.50, // 50% off
    validUntil: new Date('2026-01-02T00:00:00Z'),
    description: 'New Year 2026 Special - 50% Off',
  },
};

export async function POST(request: NextRequest) {
  try {
    const { promoCode } = await request.json();

    if (!promoCode) {
      return NextResponse.json({ valid: false, error: 'No promo code provided' });
    }

    const code = promoCode.toUpperCase();
    const promo = PROMO_CODES[code];

    if (!promo) {
      return NextResponse.json({ valid: false, error: 'Invalid promo code' });
    }

    if (new Date() > promo.validUntil) {
      return NextResponse.json({ valid: false, error: 'Promo code has expired' });
    }

    return NextResponse.json({
      valid: true,
      discount: promo.discount,
      discountPercent: Math.round(promo.discount * 100),
      description: promo.description,
    });
  } catch (error) {
    console.error('Error validating promo:', error);
    return NextResponse.json({ valid: false, error: 'Failed to validate promo code' });
  }
}
