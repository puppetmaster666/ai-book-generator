import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import {
  getWelcomeEmail,
  getFreeCreditEmail,
  getAnnouncementEmail,
  EmailTemplateId,
} from '@/lib/email-templates';

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds, template, customMessage, customSubject } = body as {
      userIds: string[];
      template: EmailTemplateId;
      customMessage?: string;
      customSubject?: string;
    };

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 });
    }

    if (!template) {
      return NextResponse.json({ error: 'No template selected' }, { status: 400 });
    }

    // Fetch users
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'No valid users found' }, { status: 400 });
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Send emails
    for (const targetUser of users) {
      try {
        let emailContent: { subject: string; html: string };

        switch (template) {
          case 'welcome':
            emailContent = getWelcomeEmail(targetUser.name || 'there');
            break;
          case 'free_credit':
            // For free_credit template via this endpoint, default to 1 credit
            emailContent = getFreeCreditEmail(targetUser.name || 'there', 1);
            break;
          case 'announcement':
            if (!customMessage) {
              throw new Error('Custom message required for announcement');
            }
            emailContent = getAnnouncementEmail(
              targetUser.name || 'there',
              customSubject || 'News from DraftMyBook',
              customMessage
            );
            break;
          default:
            throw new Error(`Unknown template: ${template}`);
        }

        const sent = await sendEmail({
          to: targetUser.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        if (sent) {
          successCount++;
        } else {
          failCount++;
          errors.push(`Failed to send to ${targetUser.email}`);
        }
      } catch (err) {
        failCount++;
        errors.push(`Error for ${targetUser.email}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failCount,
      total: users.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}
