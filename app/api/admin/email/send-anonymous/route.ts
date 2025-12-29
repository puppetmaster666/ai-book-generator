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

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Helper to delay between emails (avoid rate limiting - Resend allows 2/sec)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Send emails to each anonymous contact with rate limiting
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      // Add delay between emails (500ms = max 2 per second)
      if (i > 0) {
        await delay(500);
      }

      try {
        let emailContent: { subject: string; html: string };
        let claimToken: string | null = null;
        let creditsIncluded = 0;

        // For credits, we create a pending claim that requires registration
        // The token is stored with email instead of userId - they must register to claim
        if (template === 'bug_apology' || (template === 'announcement' && includeCredit && creditAmount && creditAmount > 0)) {
          claimToken = randomBytes(32).toString('hex');
          const creditsToGive = template === 'bug_apology' ? 1 : creditAmount!;
          creditsIncluded = creditsToGive;

          // Create an anonymous credit claim - email-based, userId is null
          await prisma.creditClaim.create({
            data: {
              token: claimToken,
              email: email.toLowerCase(), // Store email for matching when they register
              credits: creditsToGive,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
          });
        }

        switch (template) {
          case 'announcement':
            if (!customMessage) {
              throw new Error('Custom message required for announcement');
            }

            if (includeCredit && creditAmount && creditAmount > 0 && claimToken) {
              const claimUrl = `${APP_URL}/claim-credit?token=${claimToken}`;
              emailContent = getAnnouncementEmailWithCredit(
                'there', // Anonymous users don't have names
                customSubject || 'News from DraftMyBook',
                customMessage,
                creditAmount,
                claimUrl
              );
            } else {
              emailContent = getAnnouncementEmail(
                'there',
                customSubject || 'News from DraftMyBook',
                customMessage
              );
            }
            break;
          case 'bug_apology':
            if (!claimToken) {
              throw new Error('Failed to generate claim token');
            }
            const bugClaimUrl = `${APP_URL}/claim-credit?token=${claimToken}`;
            emailContent = getBugApologyEmail('there', bugClaimUrl);
            break;
          default:
            throw new Error(`Unknown template: ${template}`);
        }

        const result = await sendEmail({
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        // Log the email
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

        // Log failed email
        await prisma.emailLog.create({
          data: {
            to: email,
            subject: `[${template}]`,
            template,
            status: 'failed',
            error: errorMsg,
            metadata: { anonymous: true },
          },
        }).catch(() => {}); // Don't fail if logging fails
      }
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failCount,
      total: emails.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Anonymous email error:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}
