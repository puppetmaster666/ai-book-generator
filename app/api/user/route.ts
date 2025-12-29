import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/user - Get current user info including credits
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        credits: true,
        freeCredits: true,
        freeBookUsed: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate total available credits
    const totalCredits = user.credits + user.freeCredits;
    const hasFirstBookFree = !user.freeBookUsed;

    return NextResponse.json({
      user: {
        ...user,
        totalCredits,
        hasFirstBookFree,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
