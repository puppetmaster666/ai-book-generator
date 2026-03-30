import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmailWithDetails } from '@/lib/email';
import { randomBytes } from 'crypto';
import {
  getWelcomeEmail,
  getFreeCreditEmail,
  getAnnouncementEmail,
  getAnnouncementEmailWithCredit,
  getBugApologyEmail,
  getBetaFeedbackEmail,
  EmailTemplateId,
} from '@/lib/email-templates';

// Reply-to address for user responses
const REPLY_TO_EMAIL = 'lhllparis@gmail.com';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.draftmybook.com';

// Resend free tier: 100 emails/day. Reserve 10 for transactional (book ready, verification, etc.)
const DAILY_BULK_LIMIT = 90;

async function getEmailsSentToday(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.emailLog.count({
    where: {
      createdAt: { gte: startOfDay },
      status: 'sent',
    },
  });
}

async function sendTemplateEmail(
  targetEmail: string,
  targetName: string,
  targetUserId: string | null,
  template: EmailTemplateId,
  customMessage?: string,
  customSubject?: string,
  includeCredit?: boolean,
  creditAmount?: number,
): Promise<{ success: boolean; error?: string }> {
  let emailContent: { subject: string; html: string };
  let creditsIncluded = 0;

  switch (template) {
    case 'welcome':
      emailContent = getWelcomeEmail(targetName);
      break;
    case 'free_credit':
      emailContent = getFreeCreditEmail(targetName, 1);
      creditsIncluded = 1;
      break;
    case 'announcement':
      if (!customMessage) {
        return { success: false, error: 'Custom message required for announcement' };
      }
      if (includeCredit && creditAmount && creditAmount > 0) {
        const token = randomBytes(32).toString('hex');
        await prisma.creditClaim.create({
          data: {
            token,
            ...(targetUserId ? { userId: targetUserId } : { email: targetEmail.toLowerCase() }),
            credits: creditAmount,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        const claimUrl = `${APP_URL}/claim-credit?token=${token}`;
        emailContent = getAnnouncementEmailWithCredit(
          targetName,
          customSubject || 'News from DraftMyBook',
          customMessage,
          creditAmount,
          claimUrl
        );
        creditsIncluded = creditAmount;
      } else {
        emailContent = getAnnouncementEmail(
          targetName,
          customSubject || 'News from DraftMyBook',
          customMessage
        );
      }
      break;
    case 'bug_apology': {
      const bugToken = randomBytes(32).toString('hex');
      await prisma.creditClaim.create({
        data: {
          token: bugToken,
          ...(targetUserId ? { userId: targetUserId } : { email: targetEmail.toLowerCase() }),
          credits: 1,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      const bugClaimUrl = `${APP_URL}/claim-credit?token=${bugToken}`;
      emailContent = getBugApologyEmail(targetName, bugClaimUrl);
      creditsIncluded = 1;
      break;
    }
    case 'beta_feedback':
      emailContent = getBetaFeedbackEmail(targetName);
      break;
    default:
      return { success: false, error: `Unknown template: ${template}` };
  }

  const result = await sendEmailWithDetails({
    to: targetEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    replyTo: REPLY_TO_EMAIL,
  });

  await prisma.emailLog.create({
    data: {
      to: targetEmail,
      subject: emailContent.subject,
      template,
      status: result.success ? 'sent' : 'failed',
      error: result.error,
      userId: targetUserId,
      metadata: creditsIncluded > 0 ? { creditsIncluded } : undefined,
    },
  });

  return { success: result.success, error: result.error || (result.success ? undefined : `Failed to send to ${targetEmail}`) };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds, template, customMessage, customSubject, includeCredit, creditAmount } = body as {
      userIds: string[];
      template: EmailTemplateId;
      customMessage?: string;
      customSubject?: string;
      includeCredit?: boolean;
      creditAmount?: number;
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

    // Check how many emails we can still send today
    const sentToday = await getEmailsSentToday();
    const remainingToday = Math.max(0, DAILY_BULK_LIMIT - sentToday);

    // Split into: send now (within daily limit) and queue for later
    const sendNow = users.slice(0, remainingToday);
    const sendLater = users.slice(remainingToday);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Send immediate batch with 500ms delay between each
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < sendNow.length; i++) {
      const targetUser = sendNow[i];
      if (i > 0) await delay(500);

      try {
        const result = await sendTemplateEmail(
          targetUser.email, targetUser.name || 'there', targetUser.id,
          template, customMessage, customSubject, includeCredit, creditAmount
        );
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          if (result.error) errors.push(result.error);
        }
      } catch (err) {
        failCount++;
        errors.push(`Error for ${targetUser.email}: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    // Queue remaining users in a batch for later days
    let batchId: string | null = null;
    if (sendLater.length > 0) {
      const batch = await prisma.emailBatch.create({
        data: {
          template,
          customSubject,
          customMessage,
          includeCredit: includeCredit || false,
          creditAmount: creditAmount || 0,
          isAnonymous: false,
          totalCount: sendLater.length,
          items: {
            create: sendLater.map(u => ({
              email: u.email,
              userId: u.id,
              userName: u.name || 'there',
            })),
          },
        },
      });
      batchId = batch.id;
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failCount,
      total: users.length,
      queued: sendLater.length,
      batchId,
      errors: errors.length > 0 ? errors : undefined,
      message: sendLater.length > 0
        ? `Sent ${successCount} today (daily limit: ${DAILY_BULK_LIMIT}). ${sendLater.length} queued — they'll be sent automatically over the next ${Math.ceil(sendLater.length / DAILY_BULK_LIMIT)} day(s).`
        : undefined,
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}
