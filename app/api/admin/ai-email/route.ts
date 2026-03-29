import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getGeminiPro } from '@/lib/generation/shared/api-client';
import { SAFETY_SETTINGS } from '@/lib/generation/shared/safety';
import { sendEmail } from '@/lib/email';

export const maxDuration = 60;

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

  // Bulk send to multiple recipients
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

    let sent = 0;
    let failed = 0;
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i].toLowerCase().trim();
      if (i > 0) await delay(500); // Respect Resend rate limits (2/sec)

      try {
        // Gift credits if requested
        if (includeCredits && includeCredits > 0) {
          const user = await prisma.user.findUnique({ where: { email } });
          if (user) {
            await prisma.user.update({ where: { id: user.id }, data: { freeCredits: { increment: includeCredits } } });
          } else {
            await prisma.pendingCredit.create({ data: { email, credits: includeCredits, giftedBy: session.user.id } });
          }
        }

        const ok = await sendEmail({ to: email, subject: draft.subject, html: draft.html });
        if (ok) sent++; else failed++;

        await prisma.emailLog.create({
          data: { to: email, subject: draft.subject, template: 'ai_bulk', status: ok ? 'sent' : 'failed', metadata: { situation, includeCredits } },
        }).catch(() => {});
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ success: true, sent, failed, total: emails.length });
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

      const sent = await sendEmail({
        to: recipientEmail,
        subject: draft.subject,
        html: draft.html,
      });

      await prisma.emailLog.create({
        data: {
          to: recipientEmail,
          subject: draft.subject,
          template: 'ai_custom',
          status: sent ? 'sent' : 'failed',
          metadata: { situation, includeCredits },
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, sent, message: sent ? 'Email sent!' : 'Failed to send' });
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

    // Check their recent books
    const recentBooks = await prisma.book.findMany({
      where: { email: recipientEmail.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { title: true, status: true, bookFormat: true, createdAt: true },
    });
    if (recentBooks.length > 0) {
      recipientContext += `\nRecent books: ${recentBooks.map(b => `"${b.title}" (${b.status}, ${b.bookFormat})`).join(', ')}`;
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
    const brandedHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
<div style="background-color: #ffffff; margin: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
<div style="background-color: #171717; padding: 28px 32px; text-align: center;">
<h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff; letter-spacing: -0.5px;">draftmybook</h1>
</div>
<div style="padding: 40px 32px;">
${htmlBody}
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
