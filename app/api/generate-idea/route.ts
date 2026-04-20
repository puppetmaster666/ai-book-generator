import { NextRequest, NextResponse } from 'next/server';
import { generateBookIdea, type IdeaCategory } from '@/lib/gemini';
import { rateLimit, rateLimitPeek, getClientIP } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const FREE_IDEA_LIMIT = 3;
const IDEA_CREDIT_COST = 5;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// GET: Check remaining free idea generations + credit-based availability
export async function GET(request: NextRequest) {
  const ip = getClientIP(request.headers);
  const { remaining } = rateLimitPeek(`gen-idea:${ip}`, FREE_IDEA_LIMIT, ONE_MONTH_MS);

  const session = await auth();
  let totalCredits = 0;
  let canUseCredits = false;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { creditBalance: true, freeCredits: true, credits: true, isAdmin: true },
    });
    if (user) {
      totalCredits = (user.creditBalance || 0) + (user.freeCredits || 0) + (user.credits || 0);
      canUseCredits = user.isAdmin || totalCredits >= IDEA_CREDIT_COST;
    }
  }

  return NextResponse.json({
    remaining,
    limit: FREE_IDEA_LIMIT,
    creditCost: IDEA_CREDIT_COST,
    canUseCredits,
    credits: totalCredits,
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request.headers);

    // First, peek at free tier (do not consume yet)
    const peek = rateLimitPeek(`gen-idea:${ip}`, FREE_IDEA_LIMIT, ONE_MONTH_MS);
    const freeAvailable = peek.remaining > 0;

    // Parse category from request body (optional)
    let category: IdeaCategory = 'random';
    try {
      const body = await request.json();
      if (body.category && ['novel', 'childrens', 'comic', 'nonfiction', 'screenplay', 'adult_comic', 'tv_series', 'short_story', 'random'].includes(body.category)) {
        category = body.category;
      }
    } catch {
      // No body or invalid JSON - use random
    }

    if (freeAvailable) {
      // Consume a free try
      const { remaining } = rateLimit(`gen-idea:${ip}`, FREE_IDEA_LIMIT, ONE_MONTH_MS);
      const idea = await generateBookIdea(category);
      return NextResponse.json({
        idea,
        remaining,
        limit: FREE_IDEA_LIMIT,
        usedCredits: 0,
      });
    }

    // Free tier exhausted - require signed-in user with credits
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({
        error: `You\'ve used all ${FREE_IDEA_LIMIT} free idea generations. Sign in and use credits to generate more ideas, or type your own.`,
        remaining: 0,
        limit: FREE_IDEA_LIMIT,
        requiresSignIn: true,
      }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { creditBalance: true, freeCredits: true, credits: true, isAdmin: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = user.isAdmin || false;
    const totalCredits = (user.creditBalance || 0) + (user.freeCredits || 0) + (user.credits || 0);

    if (!isAdmin && totalCredits < IDEA_CREDIT_COST) {
      return NextResponse.json({
        error: `You\'ve used all ${FREE_IDEA_LIMIT} free idea generations. Each additional idea costs ${IDEA_CREDIT_COST} credits, but you have ${totalCredits}.`,
        remaining: 0,
        limit: FREE_IDEA_LIMIT,
        creditCost: IDEA_CREDIT_COST,
        creditsAvailable: totalCredits,
        needsCredits: true,
      }, { status: 402 });
    }

    // Generate the idea first; only charge if successful
    const idea = await generateBookIdea(category);

    // Deduct credits (skip for admins)
    if (!isAdmin) {
      if (user.creditBalance >= IDEA_CREDIT_COST) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { creditBalance: { decrement: IDEA_CREDIT_COST } },
        });
      } else if (user.freeCredits >= IDEA_CREDIT_COST) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { freeCredits: { decrement: IDEA_CREDIT_COST } },
        });
      } else {
        const fromBalance = Math.min(user.creditBalance, IDEA_CREDIT_COST);
        const fromFree = IDEA_CREDIT_COST - fromBalance;
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            creditBalance: { decrement: fromBalance },
            freeCredits: { decrement: fromFree },
          },
        });
      }
    }

    return NextResponse.json({
      idea,
      remaining: 0,
      limit: FREE_IDEA_LIMIT,
      usedCredits: isAdmin ? 0 : IDEA_CREDIT_COST,
      creditsRemaining: isAdmin ? totalCredits : totalCredits - IDEA_CREDIT_COST,
    });
  } catch (error) {
    console.error('Error generating idea:', error);
    return NextResponse.json(
      { error: 'Failed to generate idea. Please try again.' },
      { status: 500 }
    );
  }
}
