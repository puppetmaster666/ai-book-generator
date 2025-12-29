import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Fallback hardcoded codes (for codes not in DB)
const HARDCODED_PROMOS: Record<string, { discount: number; validUntil: Date; description: string }> = {
  'NY26': {
    discount: 0.50,
    validUntil: new Date('2026-01-02T00:00:00Z'),
    description: 'New Year 2026 Special - 50% Off',
  },
  'SECOND50': {
    discount: 0.50,
    validUntil: new Date('2030-01-01T00:00:00Z'),
    description: '50% Off Your Second Book',
  },
};

export async function POST(request: NextRequest) {
  try {
    const { promoCode } = await request.json();

    if (!promoCode) {
      return NextResponse.json({ valid: false, error: 'No promo code provided' });
    }

    const code = promoCode.toUpperCase();

    // First check database
    const dbPromo = await prisma.promoCode.findUnique({
      where: { code },
    });

    if (dbPromo) {
      // Check if active
      if (!dbPromo.isActive) {
        return NextResponse.json({ valid: false, error: 'Promo code is no longer active' });
      }

      // Check expiration
      if (dbPromo.validUntil && new Date() > dbPromo.validUntil) {
        return NextResponse.json({ valid: false, error: 'Promo code has expired' });
      }

      // Check usage limit
      if (dbPromo.currentUses >= dbPromo.maxUses) {
        return NextResponse.json({ valid: false, error: 'Promo code has reached its usage limit' });
      }

      return NextResponse.json({
        valid: true,
        discount: dbPromo.discount,
        discountPercent: Math.round(dbPromo.discount * 100),
        description: dbPromo.discount === 1 ? 'Free Book' : `${Math.round(dbPromo.discount * 100)}% Off`,
        remaining: dbPromo.maxUses - dbPromo.currentUses,
      });
    }

    // Fallback to hardcoded promos
    const promo = HARDCODED_PROMOS[code];

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
