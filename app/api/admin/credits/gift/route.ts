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

    // Helper to delay between emails (avoid rate limiting - Resend allows 2/sec)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Process each user
    for (let i = 0; i < users.length; i++) {
      const targetUser = users[i];

      // Add delay between emails (500ms = max 2 per second)
      if (i > 0 && sendEmailNotification) {
        await delay(500);
      }

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

          // Log the email
          await prisma.emailLog.create({
            data: {
              to: targetUser.email,
              subject: emailContent.subject,
              template: 'free_credit',
              status: sent ? 'sent' : 'failed',
              userId: targetUser.id,
              metadata: { creditsGifted: credits },
            },
          });

          if (sent) {
            emailsSent++;
          }
        }
      } catch (err) {
        failCount++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Error for ${targetUser.email}: ${errorMsg}`);

        // Log failed email if we were trying to send
        if (sendEmailNotification) {
          await prisma.emailLog.create({
            data: {
              to: targetUser.email,
              subject: `[free_credit] ${credits} credit(s)`,
              template: 'free_credit',
              status: 'failed',
              error: errorMsg,
              userId: targetUser.id,
            },
          }).catch(() => {}); // Don't fail if logging fails
        }
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
