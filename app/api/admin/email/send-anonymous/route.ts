import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { randomBytes } from 'crypto';
import {
  getAnnouncementEmail,
  getAnnouncementEmailWithCredit,
  getBugApologyEmail,
} from '@/lib/email-templates';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.draftmybook.com';

// Resend free tier: 100 emails/day. Reserve 10 for transactional.
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
    const { emails, template, customMessage, customSubject, includeCredit, creditAmount } = body as {
      emails: string[];
      template: 'announcement' | 'bug_apology';
      customMessage?: string;
      customSubject?: string;
      includeCredit?: boolean;
      creditAmount?: number;
    };

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'No emails provided' }, { status: 400 });
    }

    if (!template) {
      return NextResponse.json({ error: 'No template selected' }, { status: 400 });
    }

    // Check daily limit
    const sentToday = await getEmailsSentToday();
    const remainingToday = Math.max(0, DAILY_BULK_LIMIT - sentToday);

    const sendNow = emails.slice(0, remainingToday);
    const sendLater = emails.slice(remainingToday);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < sendNow.length; i++) {
      const email = sendNow[i];
      if (i > 0) await delay(500);

      try {
        let emailContent: { subject: string; html: string };
        let claimToken: string | null = null;
        let creditsIncluded = 0;

        if (template === 'bug_apology' || (template === 'announcement' && includeCredit && creditAmount && creditAmount > 0)) {
          claimToken = randomBytes(32).toString('hex');
          const creditsToGive = template === 'bug_apology' ? 1 : creditAmount!;
          creditsIncluded = creditsToGive;

          await prisma.creditClaim.create({
            data: {
              token: claimToken,
              email: email.toLowerCase(),
              credits: creditsToGive,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }

        switch (template) {
          case 'announcement':
            if (!customMessage) throw new Error('Custom message required');
            if (includeCredit && creditAmount && creditAmount > 0 && claimToken) {
              const claimUrl = `${APP_URL}/claim-credit?token=${claimToken}`;
              emailContent = getAnnouncementEmailWithCredit('there', customSubject || 'News from DraftMyBook', customMessage, creditAmount, claimUrl);
            } else {
              emailContent = getAnnouncementEmail('there', customSubject || 'News from DraftMyBook', customMessage);
            }
            break;
          case 'bug_apology':
            if (!claimToken) throw new Error('Failed to generate claim token');
            emailContent = getBugApologyEmail('there', `${APP_URL}/claim-credit?token=${claimToken}`);
            break;
          default:
            throw new Error(`Unknown template: ${template}`);
        }

        const result = await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html });

        await prisma.emailLog.create({
          data: {
            to: email,
            subject: emailContent.subject,
            template,
            status: result ? 'sent' : 'failed',
            metadata: creditsIncluded > 0 ? { creditsIncluded, anonymous: true } : { anonymous: true },
          },
        });

        if (result) {
          successCount++;
        } else {
          failCount++;
          errors.push(`Failed to send to ${email}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        failCount++;
        errors.push(`Error for ${email}: ${errorMsg}`);

        await prisma.emailLog.create({
          data: { to: email, subject: `[${template}]`, template, status: 'failed', error: errorMsg, metadata: { anonymous: true } },
        }).catch(() => {});
      }
    }

    // Queue remaining for later days
    let batchId: string | null = null;
    if (sendLater.length > 0) {
      const batch = await prisma.emailBatch.create({
        data: {
          template,
          customSubject,
          customMessage,
          includeCredit: includeCredit || false,
          creditAmount: creditAmount || 0,
          isAnonymous: true,
          totalCount: sendLater.length,
          items: {
            create: sendLater.map(e => ({
              email: e,
              userName: 'there',
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
      total: emails.length,
      queued: sendLater.length,
      batchId,
      errors: errors.length > 0 ? errors : undefined,
      message: sendLater.length > 0
        ? `Sent ${successCount} today (daily limit: ${DAILY_BULK_LIMIT}). ${sendLater.length} queued — they'll be sent automatically over the next ${Math.ceil(sendLater.length / DAILY_BULK_LIMIT)} day(s).`
        : undefined,
    });
  } catch (error) {
    console.error('Anonymous email error:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}
