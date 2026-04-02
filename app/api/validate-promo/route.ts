import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

// No hardcoded promos - all promo codes must be in the database

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 attempts per minute per IP to prevent brute-forcing
    const ip = getClientIP(request.headers);
    const { limited } = rateLimit(`promo:${ip}`, 20, 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { valid: false, error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

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
      // Admin-only codes: check if user is admin
      if (dbPromo.adminOnly) {
        const session = await auth();
        let isAdmin = false;
        if (session?.user?.id) {
          const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { isAdmin: true },
          });
          isAdmin = user?.isAdmin || false;
        }
        if (!isAdmin) {
          return NextResponse.json({ valid: false, error: 'Invalid promo code' });
        }
      }

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

      // Handle fixed price promos vs percentage discounts
      if (dbPromo.fixedPrice !== null) {
        const fixedPriceFormatted = (dbPromo.fixedPrice / 100).toFixed(2);
        return NextResponse.json({
          valid: true,
          discount: 1, // Treat as "discount applied" for UI
          fixedPrice: dbPromo.fixedPrice,
          discountPercent: null,
          description: `Beta Price: $${fixedPriceFormatted}`,
          remaining: dbPromo.maxUses - dbPromo.currentUses,
        });
      }

      return NextResponse.json({
        valid: true,
        discount: dbPromo.discount,
        discountPercent: Math.round(dbPromo.discount * 100),
        description: dbPromo.discount === 1 ? 'Free Book' : `${Math.round(dbPromo.discount * 100)}% Off`,
        remaining: dbPromo.maxUses - dbPromo.currentUses,
      });
    }

    return NextResponse.json({ valid: false, error: 'Invalid promo code' });
  } catch (error) {
    console.error('Error validating promo:', error);
    return NextResponse.json({ valid: false, error: 'Failed to validate promo code' });
  }
}
