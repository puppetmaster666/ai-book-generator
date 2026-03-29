import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { getCreditInviteEmail, getCreditGiftFromMarieEmail } from '@/lib/email-templates';

/**
 * Gift credits by email address.
 * - If the user exists: credits are added immediately + email sent
 * - If the user doesn't exist: a PendingCredit is created + invite email sent
 *   Credits auto-apply when they sign up with that email.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true, email: true },
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, credits = 1, message, recipientName } = await request.json() as {
      email: string;
      credits?: number;
      message?: string;
      recipientName?: string;
    };

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (credits < 1 || credits > 100) {
      return NextResponse.json({ error: 'Credits must be between 1 and 100' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, freeCredits: true },
    });

    if (existingUser) {
      // User exists - add credits immediately
      await prisma.$transaction([
        prisma.user.update({
          where: { id: existingUser.id },
          data: { freeCredits: { increment: credits } },
        }),
        prisma.notification.create({
          data: {
            userId: existingUser.id,
            type: 'free_credit',
            title: `You received ${credits} free book credit${credits > 1 ? 's' : ''}!`,
            message: message || `You can now create ${credits} book${credits > 1 ? 's' : ''} for free.`,
          },
        }),
      ]);

      // Send branded email with Marie's signature
      const emailContent = getCreditGiftFromMarieEmail(
        existingUser.name || recipientName || 'there',
        credits,
        message
      );

      const sent = await sendEmail({
        to: existingUser.email,
        subject: emailContent.subject,
        html: emailContent.html,
      });

      // Log the email
      await prisma.emailLog.create({
        data: {
          to: existingUser.email,
          subject: emailContent.subject,
          template: 'credit_gift_marie',
          status: sent ? 'sent' : 'failed',
          userId: existingUser.id,
          metadata: { creditsGifted: credits, personalMessage: message },
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        type: 'existing_user',
        email: existingUser.email,
        credits,
        emailSent: sent,
        message: `Added ${credits} credit(s) to ${existingUser.email}'s account`,
      });
    }

    // User doesn't exist - create pending credit
    await prisma.pendingCredit.create({
      data: {
        email: normalizedEmail,
        credits,
        message: message || null,
        giftedBy: adminUser.email || session.user.id,
      },
    });

    // Send invite email with Marie's signature
    const emailContent = getCreditInviteEmail(recipientName || null, credits, message);

    const sent = await sendEmail({
      to: normalizedEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    // Log the email
    await prisma.emailLog.create({
      data: {
        to: normalizedEmail,
        subject: emailContent.subject,
        template: 'credit_invite_marie',
        status: sent ? 'sent' : 'failed',
        metadata: { creditsGifted: credits, personalMessage: message, recipientName },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      type: 'invite_sent',
      email: normalizedEmail,
      credits,
      emailSent: sent,
      message: `Invite sent to ${normalizedEmail} with ${credits} credit(s) waiting`,
    });
  } catch (error) {
    console.error('Gift credits by email error:', error);
    return NextResponse.json(
      { error: 'Failed to gift credits' },
      { status: 500 }
    );
  }
}
