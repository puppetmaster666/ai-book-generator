import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmailWithDetails } from '@/lib/email';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view'); // 'campaigns' for campaign grouping
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // 'sent', 'failed', or null for all
    const skip = (page - 1) * limit;

    // Campaign view: group by subject to show send stats per campaign
    if (view === 'campaigns') {
      const campaigns = await prisma.$queryRaw<Array<{
        subject: string;
        template: string;
        sent_count: bigint;
        failed_count: bigint;
        total_count: bigint;
        first_sent: Date;
        last_sent: Date;
      }>>`
        SELECT
          subject,
          MAX(template) as template,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
          COUNT(*) as total_count,
          MIN("createdAt") as first_sent,
          MAX("createdAt") as last_sent
        FROM "EmailLog"
        GROUP BY subject
        ORDER BY MAX("createdAt") DESC
        LIMIT 20
      `;

      // Get total user count for "unsent" calculation
      const totalUsers = await prisma.user.count();

      return NextResponse.json({
        campaigns: campaigns.map(c => ({
          subject: c.subject,
          template: c.template,
          sentCount: Number(c.sent_count),
          failedCount: Number(c.failed_count),
          totalCount: Number(c.total_count),
          unsentCount: Math.max(0, totalUsers - Number(c.sent_count)),
          firstSent: c.first_sent,
          lastSent: c.last_sent,
        })),
        totalUsers,
      });
    }

    // Default: flat log view
    const where = status ? { status } : {};

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.emailLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
}

// POST: Get unsent users for a campaign subject, or trigger resend
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
    const { action, subject } = body as { action: 'get-unsent' | 'retry-failed' | 'resend-unsent'; subject: string };

    if (!subject) {
      return NextResponse.json({ error: 'Subject required' }, { status: 400 });
    }

    if (action === 'get-unsent') {
      // Find all users who did NOT receive this email successfully
      const sentEmails = await prisma.emailLog.findMany({
        where: { subject, status: 'sent' },
        select: { to: true },
      });

      const sentSet = new Set(sentEmails.map(e => e.to.toLowerCase()));

      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, name: true },
      });

      const unsentUsers = allUsers.filter(u => !sentSet.has(u.email.toLowerCase()));

      return NextResponse.json({
        subject,
        totalUsers: allUsers.length,
        sentCount: sentSet.size,
        unsentUsers: unsentUsers.map(u => ({ id: u.id, email: u.email, name: u.name })),
        unsentCount: unsentUsers.length,
      });
    }

    if (action === 'retry-failed') {
      // Get failed emails for this subject so admin can re-queue them
      const failedLogs = await prisma.emailLog.findMany({
        where: { subject, status: 'failed' },
        select: { to: true },
      });

      return NextResponse.json({
        subject,
        failedEmails: failedLogs.map(l => l.to),
        failedCount: failedLogs.length,
      });
    }

    if (action === 'resend-unsent') {
      // Find the last sent email with this subject to get the HTML content
      const lastSentLog = await prisma.emailLog.findFirst({
        where: { subject, status: 'sent' },
        orderBy: { createdAt: 'desc' },
      });

      if (!lastSentLog) {
        return NextResponse.json({ error: 'No sent email found with this subject to use as template' }, { status: 400 });
      }

      // Find unsent users
      const sentEmails = await prisma.emailLog.findMany({
        where: { subject, status: 'sent' },
        select: { to: true },
      });
      const sentSet = new Set(sentEmails.map(e => e.to.toLowerCase()));
      const allUsers = await prisma.user.findMany({ select: { email: true } });
      const unsentEmails = allUsers.filter(u => !sentSet.has(u.email.toLowerCase())).map(u => u.email);

      if (unsentEmails.length === 0) {
        return NextResponse.json({ success: true, sent: 0, message: 'All users already received this email' });
      }

      // Check daily limit
      const DAILY_BULK_LIMIT = 90;
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const sentToday = await prisma.emailLog.count({
        where: { createdAt: { gte: startOfDay }, status: 'sent' },
      });
      const remainingToday = Math.max(0, DAILY_BULK_LIMIT - sentToday);

      const sendNow = unsentEmails.slice(0, remainingToday);
      const sendLater = unsentEmails.slice(remainingToday);

      let sent = 0;
      let failed = 0;
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

      // We need the HTML content. Check if it's stored in an EmailBatch or reconstruct from subject.
      // Since we can't store full HTML in email logs, queue as a batch with the subject
      // For now, we need to find a matching batch or the original HTML
      // Check if there's a batch with this subject
      const existingBatch = await prisma.emailBatch.findFirst({
        where: { customSubject: subject },
        orderBy: { createdAt: 'desc' },
      });

      const emailHtml = existingBatch?.customMessage;

      if (!emailHtml) {
        // No stored HTML — queue the emails and tell admin to resend via AI mail
        return NextResponse.json({
          success: false,
          error: 'No stored email content found for this campaign. Use AI Mail to compose and send to these users.',
          unsentEmails,
          unsentCount: unsentEmails.length,
        });
      }

      // Send to unsent users
      for (let i = 0; i < sendNow.length; i++) {
        const email = sendNow[i];
        if (i > 0) await delay(500);

        try {
          const result = await sendEmailWithDetails({
            to: email,
            subject,
            html: emailHtml,
            replyTo: 'lhllparis@gmail.com',
          });

          await prisma.emailLog.create({
            data: {
              to: email,
              subject,
              template: 'resend',
              status: result.success ? 'sent' : 'failed',
              error: result.error,
            },
          }).catch(() => {});

          if (result.success) sent++; else failed++;
        } catch {
          failed++;
        }
      }

      // Queue remainder
      let queued = 0;
      if (sendLater.length > 0) {
        await prisma.emailBatch.create({
          data: {
            template: 'resend',
            customSubject: subject,
            customMessage: emailHtml,
            totalCount: sendLater.length,
            items: {
              create: sendLater.map(e => ({ email: e, userName: 'there' })),
            },
          },
        });
        queued = sendLater.length;
      }

      return NextResponse.json({
        success: true,
        sent,
        failed,
        queued,
        total: unsentEmails.length,
        message: queued > 0
          ? `Sent ${sent} now. ${queued} queued for tomorrow (daily limit: ${DAILY_BULK_LIMIT}).`
          : `Sent ${sent} email(s)${failed > 0 ? `, ${failed} failed` : ''}.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in email logs POST:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
