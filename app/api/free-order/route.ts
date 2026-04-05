import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 free order attempts per minute per IP
    const ip = getClientIP(request.headers);
    const { limited } = rateLimit(`free-order:${ip}`, 10, 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const { bookId, promoCode, email } = await request.json();

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID required' }, { status: 400 });
    }

    if (!promoCode) {
      return NextResponse.json({ error: 'Promo code required' }, { status: 400 });
    }

    const code = promoCode.toUpperCase();
    const clientIP = getClientIP(request.headers);

    // Check if current user is admin
    let isAdmin = false;
    const session = await auth();
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
      });
      isAdmin = user?.isAdmin || false;
    }

    // Check promo code in database
    const dbPromo = await prisma.promoCode.findUnique({
      where: { code },
    });

    if (!dbPromo) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
    }

    // Admin-only promo codes: reject non-admin users
    if (dbPromo.adminOnly && !isAdmin) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
    }

    if (!dbPromo.isActive) {
      return NextResponse.json({ error: 'Promo code is no longer active' }, { status: 400 });
    }

    if (dbPromo.validUntil && new Date() > dbPromo.validUntil) {
      return NextResponse.json({ error: 'Promo code has expired' }, { status: 400 });
    }

    // Admins bypass usage limits and one-per-user checks
    if (!isAdmin) {
      if (dbPromo.currentUses >= dbPromo.maxUses) {
        return NextResponse.json({ error: 'Promo code has reached its usage limit' }, { status: 400 });
      }

      // Check one-per-user limit BEFORE incrementing
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
    }

    // Only allow 100% discount codes for free orders
    if (dbPromo.discount < 1) {
      return NextResponse.json({ error: 'This promo code requires payment' }, { status: 400 });
    }

    // Atomically increment usage AFTER all validation passes (skip for admins on unlimited codes)
    if (!isAdmin) {
      const updated = await prisma.promoCode.updateMany({
        where: {
          code,
          currentUses: { lt: dbPromo.maxUses },
          isActive: true,
        },
        data: { currentUses: { increment: 1 } },
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: 'Promo code has reached its usage limit' }, { status: 400 });
      }
    }

    // Check if book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Track usage and update book
    await prisma.$transaction([
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
          // Reset status so generation can continue for upgraded preview books
          ...(book.status === 'preview_complete' || book.status === 'failed' ? { status: 'generating' } : {}),
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
