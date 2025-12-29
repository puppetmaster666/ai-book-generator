import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Mark book as completed
    await prisma.book.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    console.log(`[ADMIN] Emergency stop triggered for book ${id} by ${session.user.email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Emergency stop error:', error);
    return NextResponse.json(
      { error: 'Failed to stop generation' },
      { status: 500 }
    );
  }
}
