import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const { bookId, promoCode, email } = await request.json();

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID required' }, { status: 400 });
    }

    if (!promoCode) {
      return NextResponse.json({ error: 'Promo code required' }, { status: 400 });
    }

    const code = promoCode.toUpperCase();
    const clientIP = getClientIP(request);

    // Check promo code in database
    const dbPromo = await prisma.promoCode.findUnique({
      where: { code },
    });

    if (!dbPromo) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
    }

    if (!dbPromo.isActive) {
      return NextResponse.json({ error: 'Promo code is no longer active' }, { status: 400 });
    }

    if (dbPromo.validUntil && new Date() > dbPromo.validUntil) {
      return NextResponse.json({ error: 'Promo code has expired' }, { status: 400 });
    }

    if (dbPromo.currentUses >= dbPromo.maxUses) {
      return NextResponse.json({ error: 'Promo code has reached its usage limit' }, { status: 400 });
    }

    // Check one-per-user limit
    if (dbPromo.onePerUser) {
      const existingUsage = await prisma.promoCodeUsage.findFirst({
        where: {
          promoCodeId: dbPromo.id,
          OR: [
            { email: email?.toLowerCase() },
            { ipAddress: clientIP },
          ],
        },
      });

      if (existingUsage) {
        return NextResponse.json(
          { error: 'You have already used this promo code' },
          { status: 400 }
        );
      }
    }

    // Only allow 100% discount codes for free orders
    if (dbPromo.discount < 1) {
      return NextResponse.json({ error: 'This promo code requires payment' }, { status: 400 });
    }

    // Check if book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Atomically increment promo usage, track usage, and update book
    await prisma.$transaction([
      prisma.promoCode.update({
        where: { code },
        data: { currentUses: { increment: 1 } },
      }),
      prisma.promoCodeUsage.create({
        data: {
          promoCodeId: dbPromo.id,
          email: email?.toLowerCase() || book.email?.toLowerCase(),
          ipAddress: clientIP,
          bookId,
        },
      }),
      prisma.book.update({
        where: { id: bookId },
        data: {
          paymentStatus: 'completed',
          paymentId: `promo_${code}_${Date.now()}`,
        },
      }),
    ]);

    // Trigger book generation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${appUrl}/api/books/${bookId}/generate`, {
      method: 'POST',
    }).catch(console.error);

    return NextResponse.json({ success: true, bookId });
  } catch (error) {
    console.error('Free order error:', error);
    return NextResponse.json(
      { error: 'Failed to process free order' },
      { status: 500 }
    );
  }
}
