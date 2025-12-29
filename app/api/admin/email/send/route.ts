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
  EmailTemplateId,
} from '@/lib/email-templates';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.draftmybook.com';

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

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Helper to delay between emails (avoid rate limiting - Resend allows 2/sec)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Send emails with rate limiting
    for (let i = 0; i < users.length; i++) {
      const targetUser = users[i];

      // Add delay between emails (500ms = max 2 per second)
      if (i > 0) {
        await delay(500);
      }

      try {
        let emailContent: { subject: string; html: string };
        let creditsIncluded = 0;

        switch (template) {
          case 'welcome':
            emailContent = getWelcomeEmail(targetUser.name || 'there');
            break;
          case 'free_credit':
            // For free_credit template via this endpoint, default to 1 credit
            emailContent = getFreeCreditEmail(targetUser.name || 'there', 1);
            creditsIncluded = 1;
            break;
          case 'announcement':
            if (!customMessage) {
              throw new Error('Custom message required for announcement');
            }

            // Check if we should include a claimable credit
            if (includeCredit && creditAmount && creditAmount > 0) {
              // Generate unique claim token
              const token = randomBytes(32).toString('hex');

              // Create CreditClaim record (expires in 30 days)
              await prisma.creditClaim.create({
                data: {
                  token,
                  userId: targetUser.id,
                  credits: creditAmount,
                  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                },
              });

              const claimUrl = `${APP_URL}/claim-credit?token=${token}`;

              emailContent = getAnnouncementEmailWithCredit(
                targetUser.name || 'there',
                customSubject || 'News from DraftMyBook',
                customMessage,
                creditAmount,
                claimUrl
              );
              creditsIncluded = creditAmount;
            } else {
              emailContent = getAnnouncementEmail(
                targetUser.name || 'there',
                customSubject || 'News from DraftMyBook',
                customMessage
              );
            }
            break;
          case 'bug_apology':
            // Bug apology template - always includes 1 claimable credit
            const bugToken = randomBytes(32).toString('hex');

            // Create CreditClaim record (expires in 30 days)
            await prisma.creditClaim.create({
              data: {
                token: bugToken,
                userId: targetUser.id,
                credits: 1,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              },
            });

            const bugClaimUrl = `${APP_URL}/claim-credit?token=${bugToken}`;
            emailContent = getBugApologyEmail(targetUser.name || 'there', bugClaimUrl);
            creditsIncluded = 1;
            break;
          default:
            throw new Error(`Unknown template: ${template}`);
        }

        const result = await sendEmail({
          to: targetUser.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        // Log the email
        await prisma.emailLog.create({
          data: {
            to: targetUser.email,
            subject: emailContent.subject,
            template,
            status: result ? 'sent' : 'failed',
            userId: targetUser.id,
            metadata: creditsIncluded > 0 ? { creditsIncluded } : undefined,
          },
        });

        if (result) {
          successCount++;
        } else {
          failCount++;
          errors.push(`Failed to send to ${targetUser.email}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        failCount++;
        errors.push(`Error for ${targetUser.email}: ${errorMsg}`);

        // Log failed email
        await prisma.emailLog.create({
          data: {
            to: targetUser.email,
            subject: `[${template}]`,
            template,
            status: 'failed',
            error: errorMsg,
            userId: targetUser.id,
          },
        }).catch(() => {}); // Don't fail if logging fails
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
