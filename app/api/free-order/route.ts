import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Valid promo codes - must match the frontend
const VALID_PROMO_CODES: Record<string, number> = {
  'FREEBOK': 100,
  'FOUNDER2024': 100,
};

export async function POST(request: NextRequest) {
  try {
    const { bookId, promoCode } = await request.json();

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID required' }, { status: 400 });
    }

    if (!promoCode || !VALID_PROMO_CODES[promoCode]) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
    }

    // Check if book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Update book as paid with promo
    await prisma.book.update({
      where: { id: bookId },
      data: {
        paymentStatus: 'completed',
        paymentId: `promo_${promoCode}_${Date.now()}`,
      },
    });

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
