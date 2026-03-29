import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in.' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user - no email verification required
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
      },
    });

    // Auto-apply any pending credits for this email
    let creditsApplied = 0;
    try {
      const pendingCredits = await prisma.pendingCredit.findMany({
        where: { email: email.toLowerCase().trim(), claimed: false },
      });

      if (pendingCredits.length > 0) {
        const totalCredits = pendingCredits.reduce((sum, pc) => sum + pc.credits, 0);
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { freeCredits: { increment: totalCredits } },
          }),
          ...pendingCredits.map(pc =>
            prisma.pendingCredit.update({
              where: { id: pc.id },
              data: { claimed: true, claimedAt: new Date() },
            })
          ),
          prisma.notification.create({
            data: {
              userId: user.id,
              type: 'free_credit',
              title: `Welcome! You have ${totalCredits} free book credit${totalCredits > 1 ? 's' : ''}!`,
              message: `Someone gifted you ${totalCredits} book${totalCredits > 1 ? 's' : ''}. Start creating now!`,
            },
          }),
        ]);
        creditsApplied = totalCredits;
        console.log(`[Register] Applied ${totalCredits} pending credit(s) to new user ${email}`);
      }
    } catch (creditError) {
      console.error('[Register] Error applying pending credits:', creditError);
      // Don't block registration if credit claiming fails
    }

    return NextResponse.json({
      success: true,
      message: creditsApplied > 0
        ? `Account created! ${creditsApplied} free book credit${creditsApplied > 1 ? 's' : ''} applied to your account.`
        : 'Account created successfully.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      creditsApplied,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
