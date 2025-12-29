import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find the credit claim
    const claim = await prisma.creditClaim.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!claim) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 404 }
      );
    }

    // Check if already claimed
    if (claim.claimed) {
      return NextResponse.json(
        { error: 'This credit has already been claimed', alreadyClaimed: true },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date() > claim.expiresAt) {
      return NextResponse.json(
        { error: 'This link has expired', expired: true },
        { status: 400 }
      );
    }

    // Determine which user to credit
    let targetUserId = claim.userId;

    // If this is an anonymous claim (no userId), require login
    if (!claim.userId) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Please log in to claim this credit', requiresLogin: true },
          { status: 401 }
        );
      }

      // For anonymous claims with email, verify email matches
      if (claim.email) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { email: true },
        });

        if (user?.email.toLowerCase() !== claim.email.toLowerCase()) {
          return NextResponse.json(
            { error: `This credit is for ${claim.email}. Please log in with that email address.`, emailMismatch: true },
            { status: 403 }
          );
        }
      }

      targetUserId = session.user.id;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Unable to determine target user' },
        { status: 400 }
      );
    }

    // Add credits to user and mark as claimed
    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: {
          freeCredits: { increment: claim.credits },
        },
      }),
      prisma.creditClaim.update({
        where: { id: claim.id },
        data: {
          claimed: true,
          userId: targetUserId, // Link to user if it was anonymous
        },
      }),
      prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'credit_claimed',
          title: 'Credit Claimed!',
          message: `You've claimed ${claim.credits} free book credit${claim.credits > 1 ? 's' : ''}. Start creating your book now!`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      credits: claim.credits,
      message: `Successfully claimed ${claim.credits} free book credit${claim.credits > 1 ? 's' : ''}!`,
    });
  } catch (error) {
    console.error('Error claiming credit:', error);
    return NextResponse.json(
      { error: 'Failed to claim credit' },
      { status: 500 }
    );
  }
}

// GET endpoint for checking claim status (used by the page)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const claim = await prisma.creditClaim.findUnique({
      where: { token },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: 'Invalid or expired link', valid: false },
        { status: 404 }
      );
    }

    // Check if user is logged in for anonymous claims
    const session = await auth();
    const isLoggedIn = !!session?.user?.id;
    const isAnonymousClaim = !claim.userId;

    return NextResponse.json({
      valid: true,
      claimed: claim.claimed,
      expired: new Date() > claim.expiresAt,
      credits: claim.credits,
      userEmail: claim.user?.email || claim.email,
      isAnonymousClaim,
      requiresLogin: isAnonymousClaim && !isLoggedIn,
      targetEmail: claim.email, // Email the credit is intended for (anonymous claims)
    });
  } catch (error) {
    console.error('Error checking claim:', error);
    return NextResponse.json(
      { error: 'Failed to check claim status' },
      { status: 500 }
    );
  }
}
