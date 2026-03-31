import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
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

const REPLY_TO_EMAIL = 'lhllparis@gmail.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.draftmybook.com';
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

/**
 * Process pending email batches. Call this daily (via cron or manually from admin).
 * Sends up to DAILY_BULK_LIMIT emails from the oldest pending batches.
 *
 * Can be triggered:
 * - Manually from admin dashboard
 * - Via Vercel Cron: add to vercel.json { "crons": [{ "path": "/api/admin/email/process-batch", "schedule": "0 9 * * *" }] }
 * - Via external cron service hitting this endpoint
 */
export async function POST(request: NextRequest) {
  // Allow cron invocation via secret header OR admin auth
  const cronSecret = request.headers.get('x-cron-secret');
  const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isValidCron) {
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
  }

  try {
    const sentToday = await getEmailsSentToday();
    const remainingToday = Math.max(0, DAILY_BULK_LIMIT - sentToday);

    if (remainingToday === 0) {
      return NextResponse.json({
        success: true,
        message: 'Daily limit already reached. Will resume tomorrow.',
        sent: 0,
        remaining: 0,
      });
    }

    // Get pending items from oldest batches first
    const pendingItems = await prisma.emailBatchItem.findMany({
      where: { status: 'pending' },
      include: { batch: true },
      orderBy: [{ batch: { createdAt: 'asc' } }, { id: 'asc' }],
      take: remainingToday,
    });

    if (pendingItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending emails to send.',
        sent: 0,
      });
    }

    let successCount = 0;
    let failCount = 0;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      const batch = item.batch;
      if (i > 0) await delay(500);

      try {
        let emailContent: { subject: string; html: string };
        const template = batch.template as EmailTemplateId;
        const targetName = item.userName || 'there';

        switch (template) {
          case 'welcome':
            emailContent = getWelcomeEmail(targetName);
            break;
          case 'free_credit':
            emailContent = getFreeCreditEmail(targetName, 1);
            break;
          case 'announcement':
            if (!batch.customMessage) throw new Error('Missing custom message');
            if (batch.includeCredit && batch.creditAmount > 0) {
              const token = randomBytes(32).toString('hex');
              await prisma.creditClaim.create({
                data: {
                  token,
                  ...(item.userId ? { userId: item.userId } : { email: item.email.toLowerCase() }),
                  credits: batch.creditAmount,
                  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
              });
              const claimUrl = `${APP_URL}/claim-credit?token=${token}`;
              emailContent = getAnnouncementEmailWithCredit(
                targetName, batch.customSubject || 'News from DraftMyBook',
                batch.customMessage, batch.creditAmount, claimUrl
              );
            } else {
              emailContent = getAnnouncementEmail(
                targetName, batch.customSubject || 'News from DraftMyBook', batch.customMessage
              );
            }
            break;
          case 'bug_apology': {
            const bugToken = randomBytes(32).toString('hex');
            await prisma.creditClaim.create({
              data: {
                token: bugToken,
                ...(item.userId ? { userId: item.userId } : { email: item.email.toLowerCase() }),
                credits: 1,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });
            emailContent = getBugApologyEmail(targetName, `${APP_URL}/claim-credit?token=${bugToken}`);
            break;
          }
          case 'beta_feedback':
            emailContent = getBetaFeedbackEmail(targetName);
            break;
          default:
            // Handle ai_bulk and other custom templates — HTML stored in customMessage
            if (batch.customMessage && batch.customSubject) {
              emailContent = { subject: batch.customSubject, html: batch.customMessage };
            } else {
              throw new Error(`Unknown template: ${template}`);
            }
        }

        const result = await sendEmail({
          to: item.email,
          subject: emailContent.subject,
          html: emailContent.html,
          replyTo: batch.isAnonymous ? undefined : REPLY_TO_EMAIL,
        });

        // Update batch item status
        await prisma.emailBatchItem.update({
          where: { id: item.id },
          data: {
            status: result ? 'sent' : 'failed',
            error: result ? null : 'Send failed',
            sentAt: result ? new Date() : null,
          },
        });

        // Log it
        await prisma.emailLog.create({
          data: {
            to: item.email,
            subject: emailContent.subject,
            template,
            status: result ? 'sent' : 'failed',
            userId: item.userId,
            metadata: batch.isAnonymous ? { anonymous: true, batchId: batch.id } : { batchId: batch.id },
          },
        });

        if (result) {
          successCount++;
          await prisma.emailBatch.update({
            where: { id: batch.id },
            data: { sentCount: { increment: 1 } },
          });
        } else {
          failCount++;
          await prisma.emailBatch.update({
            where: { id: batch.id },
            data: { failedCount: { increment: 1 } },
          });
        }
      } catch (err) {
        failCount++;
        await prisma.emailBatchItem.update({
          where: { id: item.id },
          data: { status: 'failed', error: err instanceof Error ? err.message : 'Unknown error' },
        });
        await prisma.emailBatch.update({
          where: { id: item.batch.id },
          data: { failedCount: { increment: 1 } },
        });
      }
    }

    // Mark completed batches
    const activeBatchIds = [...new Set(pendingItems.map(i => i.batchId))];
    for (const batchId of activeBatchIds) {
      const remaining = await prisma.emailBatchItem.count({
        where: { batchId, status: 'pending' },
      });
      if (remaining === 0) {
        await prisma.emailBatch.update({
          where: { id: batchId },
          data: { status: 'completed' },
        });
      }
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failCount,
      processed: pendingItems.length,
      remainingToday: remainingToday - pendingItems.length,
    });
  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json({ error: 'Failed to process batch' }, { status: 500 });
  }
}

// GET: Check batch status
export async function GET(request: NextRequest) {
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

  const batches = await prisma.emailBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      _count: {
        select: {
          items: { where: { status: 'pending' } },
        },
      },
    },
  });

  const sentToday = await getEmailsSentToday();

  return NextResponse.json({
    batches: batches.map(b => ({
      id: b.id,
      template: b.template,
      status: b.status,
      total: b.totalCount,
      sent: b.sentCount,
      failed: b.failedCount,
      pending: b._count.items,
      createdAt: b.createdAt,
    })),
    sentToday,
    dailyLimit: DAILY_BULK_LIMIT,
    remainingToday: Math.max(0, DAILY_BULK_LIMIT - sentToday),
  });
}
