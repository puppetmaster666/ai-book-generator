import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { getFreeCreditEmail } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds, credits = 1, sendEmailNotification = true } = body as {
      userIds: string[];
      credits?: number;
      sendEmailNotification?: boolean;
    };

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 });
    }

    if (credits < 1 || credits > 100) {
      return NextResponse.json({ error: 'Credits must be between 1 and 100' }, { status: 400 });
    }

    // Fetch users
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true, freeCredits: true },
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'No valid users found' }, { status: 400 });
    }

    let successCount = 0;
    let failCount = 0;
    let emailsSent = 0;
    const errors: string[] = [];

    // Process each user
    for (const targetUser of users) {
      try {
        // Add credits and create notification in a transaction
        await prisma.$transaction([
          prisma.user.update({
            where: { id: targetUser.id },
            data: {
              freeCredits: { increment: credits },
            },
          }),
          prisma.notification.create({
            data: {
              userId: targetUser.id,
              type: 'free_credit',
              title: `You received ${credits} free book credit${credits > 1 ? 's' : ''}!`,
              message: `You can now create ${credits} book${credits > 1 ? 's' : ''} for free. Visit the create page to get started!`,
            },
          }),
        ]);

        successCount++;

        // Send email if enabled
        if (sendEmailNotification) {
          const emailContent = getFreeCreditEmail(targetUser.name || 'there', credits);
          const sent = await sendEmail({
            to: targetUser.email,
            subject: emailContent.subject,
            html: emailContent.html,
          });

          if (sent) {
            emailsSent++;
          }
        }
      } catch (err) {
        failCount++;
        errors.push(`Error for ${targetUser.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      creditsAdded: successCount,
      failed: failCount,
      emailsSent: sendEmailNotification ? emailsSent : 0,
      total: users.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Gift credits error:', error);
    return NextResponse.json(
      { error: 'Failed to gift credits' },
      { status: 500 }
    );
  }
}
