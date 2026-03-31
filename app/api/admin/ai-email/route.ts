import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getGeminiPro } from '@/lib/generation/shared/api-client';
import { SAFETY_SETTINGS } from '@/lib/generation/shared/safety';
import { sendEmailWithDetails } from '@/lib/email';
import { getCreditGiftSection } from '@/lib/email-templates';

export const maxDuration = 120;

/**
 * AI Email Assistant - drafts and sends emails using Gemini.
 *
 * POST /api/admin/ai-email
 * Body:
 *   - action: 'draft' | 'send' | 'bulk-send'
 *   - situation: description of why you're emailing
 *   - recipientEmail: who to send to (single)
 *   - recipientEmails: array of emails (bulk)
 *   - recipientName: optional name
 *   - includeCredits: optional credits to gift
 *   - draft: pre-generated email to send
 *   - filter: optional { joinedAfter?, joinedBefore? } for user filtering
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!adminUser?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { action, situation, recipientEmail, recipientEmails, recipientName, includeCredits, draft, filter } = body as {
    action: 'draft' | 'send' | 'bulk-send';
    situation: string;
    recipientEmail?: string;
    recipientEmails?: string[];
    recipientName?: string;
    includeCredits?: number;
    draft?: { subject: string; html: string };
    filter?: { joinedAfter?: string; joinedBefore?: string };
  };

  // Bulk send to multiple recipients (with daily batching)
  if (action === 'bulk-send' && draft) {
    let emails = recipientEmails || [];

    // If no explicit list, query users based on filter
    if (emails.length === 0 && filter) {
      const where: Record<string, unknown> = {};
      if (filter.joinedAfter) where.createdAt = { ...(where.createdAt as object || {}), gte: new Date(filter.joinedAfter) };
      if (filter.joinedBefore) where.createdAt = { ...(where.createdAt as object || {}), lte: new Date(filter.joinedBefore) };

      const users = await prisma.user.findMany({
        where,
        select: { email: true, id: true, name: true },
      });
      emails = users.map(u => u.email);
    }

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
    }

    // Check daily limit (90 bulk emails/day, reserve 10 for transactional)
    const DAILY_BULK_LIMIT = 90;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sentToday = await prisma.emailLog.count({
      where: { createdAt: { gte: startOfDay }, status: 'sent' },
    });
    const remainingToday = Math.max(0, DAILY_BULK_LIMIT - sentToday);

    const sendNow = emails.slice(0, remainingToday);
    const sendLater = emails.slice(remainingToday);

    let sent = 0;
    let failed = 0;
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Gift credits to ALL recipients upfront (even queued ones get credits now)
    if (includeCredits && includeCredits > 0) {
      for (const email of emails) {
        try {
          const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
          if (user) {
            await prisma.user.update({ where: { id: user.id }, data: { freeCredits: { increment: includeCredits } } });
          } else {
            await prisma.pendingCredit.create({ data: { email: email.toLowerCase().trim(), credits: includeCredits, giftedBy: session.user.id } });
          }
        } catch { /* continue */ }
      }
    }

    // Send today's batch
    for (let i = 0; i < sendNow.length; i++) {
      const email = sendNow[i].toLowerCase().trim();
      if (i > 0) await delay(500);

      try {
        const result = await sendEmailWithDetails({ to: email, subject: draft.subject, html: draft.html, replyTo: 'lhllparis@gmail.com' });
        if (result.success) sent++; else failed++;

        await prisma.emailLog.create({
          data: { to: email, subject: draft.subject, template: 'ai_bulk', status: result.success ? 'sent' : 'failed', error: result.error, metadata: { situation, includeCredits } },
        }).catch(() => {});
      } catch {
        failed++;
      }
    }

    // Queue remaining for tomorrow via EmailBatch
    let batchId: string | null = null;
    if (sendLater.length > 0) {
      // Store the draft HTML in the batch's customMessage field
      const batch = await prisma.emailBatch.create({
        data: {
          template: 'ai_bulk',
          customSubject: draft.subject,
          customMessage: draft.html,
          includeCredit: false, // Credits already gifted above
          creditAmount: 0,
          isAnonymous: false,
          totalCount: sendLater.length,
          items: {
            create: sendLater.map(e => ({
              email: e.toLowerCase().trim(),
              userName: 'there',
            })),
          },
        },
      });
      batchId = batch.id;
    }

    const message = sendLater.length > 0
      ? `Sent ${sent} today (daily limit: ${DAILY_BULK_LIMIT}). ${sendLater.length} queued — they'll send automatically tomorrow.`
      : undefined;

    return NextResponse.json({ success: true, sent, failed, total: emails.length, queued: sendLater.length, batchId, message });
  }

  if (!recipientEmail?.includes('@')) {
    return NextResponse.json({ error: 'Valid recipient email required' }, { status: 400 });
  }

  // If sending a pre-drafted email
  if (action === 'send' && draft) {
    try {
      // Gift credits if requested
      if (includeCredits && includeCredits > 0) {
        const user = await prisma.user.findUnique({ where: { email: recipientEmail.toLowerCase() } });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { freeCredits: { increment: includeCredits } },
          });
        } else {
          // Create pending credit for non-users
          await prisma.pendingCredit.create({
            data: { email: recipientEmail.toLowerCase(), credits: includeCredits, giftedBy: session.user.id },
          });
        }
      }

      const result = await sendEmailWithDetails({
        to: recipientEmail,
        subject: draft.subject,
        html: draft.html,
        replyTo: 'lhllparis@gmail.com',
      });

      await prisma.emailLog.create({
        data: {
          to: recipientEmail,
          subject: draft.subject,
          template: 'ai_custom',
          status: result.success ? 'sent' : 'failed',
          error: result.error,
          metadata: { situation, includeCredits },
        },
      }).catch(() => {});

      return NextResponse.json({
        success: result.success,
        sent: result.success,
        message: result.success ? 'Email sent!' : `Failed to send: ${result.error}`,
        error: result.error,
      });
    } catch (error) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
  }

  // Draft mode - generate email with Gemini
  if (!situation) {
    return NextResponse.json({ error: 'Describe the situation for the AI' }, { status: 400 });
  }

  // Look up recipient info if they exist
  let recipientContext = '';
  try {
    const user = await prisma.user.findUnique({
      where: { email: recipientEmail.toLowerCase() },
      select: { name: true, plan: true, freeCredits: true, credits: true, createdAt: true },
    });
    if (user) {
      recipientContext = `\nRECIPIENT INFO (existing user):
- Name: ${user.name || 'Unknown'}
- Plan: ${user.plan}
- Free credits: ${user.freeCredits}
- Paid credits: ${user.credits}
- Member since: ${user.createdAt.toISOString().split('T')[0]}`;
    }

    // Check book count (don't include titles for privacy)
    const bookCount = await prisma.book.count({
      where: { email: recipientEmail.toLowerCase() },
    });
    if (bookCount > 0) {
      recipientContext += `\nBooks created: ${bookCount}`;
    }
  } catch {
    // Couldn't look up user - that's fine
  }

  const prompt = `You are Marie, a friendly customer success person at DraftMyBook (an AI book creation platform). Write a professional, warm email for this situation.

SITUATION: ${situation}

RECIPIENT: ${recipientName || 'the customer'} (${recipientEmail})
${recipientContext}
${includeCredits ? `\nINCLUDE: Mention that ${includeCredits} free book credit(s) have been added to their account.` : ''}

RULES:
- Warm, human tone - not corporate or robotic
- Keep it concise (3-5 short paragraphs max)
- Sign off as "Marie" from the DraftMyBook Team
- If apologizing, be genuine but solution-oriented
- If offering credits, make it feel like a gift not compensation
- Don't use "I hope this email finds you well" or similar cliches
- Use the recipient's first name if available
- NEVER use em dashes or en dashes. Use commas, periods, or semicolons instead
- NEVER mention specific book titles the user has created (privacy concern)
- Do NOT reference what the user has been working on specifically

OUTPUT FORMAT (follow exactly):
---SUBJECT---
The email subject line
---BODY---
The email body in HTML format. Use simple HTML: <p> tags for paragraphs, <strong> for emphasis.
Include a sign-off:
<p>Warm regards,</p>
<p><strong>Marie</strong><br/>DraftMyBook Team</p>`;

  try {
    const result = await getGeminiPro().generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      safetySettings: SAFETY_SETTINGS,
    });

    const response = (result.response.text() || '').trim();

    const subjectMatch = response.match(/---SUBJECT---\s*([\s\S]*?)---BODY---/);
    const bodyMatch = response.match(/---BODY---\s*([\s\S]*?)$/);

    const subject = subjectMatch?.[1]?.trim() || 'A message from DraftMyBook';
    const htmlBody = bodyMatch?.[1]?.trim() || '<p>Unable to generate email content.</p>';

    // Wrap in branded template
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://draftmybook.com';

    // Add credit redemption CTA if credits are included
    const creditSection = includeCredits && includeCredits > 0
      ? getCreditGiftSection(includeCredits, `${APP_URL}/create`)
      : '';

    const brandedHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
<div style="background-color: #ffffff; margin: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
<div style="background-color: #171717; padding: 28px 32px; text-align: center;">
<h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff; letter-spacing: -0.5px;">draftmybook</h1>
</div>
<div style="padding: 40px 32px;">
${htmlBody}
${creditSection}
</div>
<div style="padding: 24px 32px; text-align: center; border-top: 1px solid #e5e5e5;">
<p style="margin: 0; font-size: 13px; color: #737373;"><a href="${APP_URL}" style="color: #171717; text-decoration: none;">draftmybook.com</a></p>
</div>
</div>
</body></html>`;

    return NextResponse.json({
      success: true,
      draft: { subject, html: brandedHtml },
    });
  } catch (error) {
    console.error('AI email draft error:', error);
    return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 });
  }
}
