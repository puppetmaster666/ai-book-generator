// Styled email templates for DraftMyBook
// Design: Lime (#BFFF00) / Charcoal (#171717) / White
// Clean, professional aesthetic matching homepage

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.draftmybook.com';

// Base email wrapper with DraftMyBook branding
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DraftMyBook</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #171717; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
    <div style="background-color: #ffffff; margin: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">

      <!-- Header -->
      <div style="background-color: #171717; padding: 28px 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff; letter-spacing: -0.5px;">draftmybook</h1>
      </div>

      <!-- Content -->
      <div style="padding: 40px 32px;">
        ${content}
      </div>

      <!-- Footer -->
      <div style="padding: 24px 32px; text-align: center; border-top: 1px solid #e5e5e5;">
        <p style="margin: 0; font-size: 13px; color: #737373;">
          <a href="${APP_URL}" style="color: #171717; text-decoration: none;">draftmybook.com</a>
        </p>
      </div>
    </div>
  </body>
</html>
`;
}

// Primary CTA Button
function ctaButton(text: string, url: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin: 32px auto;">
      <tr>
        <td style="background-color: #171717; border-radius: 8px;">
          <a href="${url}" style="display: inline-block; color: #ffffff; text-decoration: none; padding: 14px 32px; font-weight: 500; font-size: 15px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

// Email Templates

export function getWelcomeEmail(userName: string): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';

  return {
    subject: 'Welcome to DraftMyBook',
    html: emailWrapper(`
      <h2 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #171717;">
        Welcome, ${firstName}.
      </h2>

      <p style="color: #525252; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
        Your account is ready. You can now create complete books from a simple description — novels, picture books, or comics.
      </p>

      <div style="background-color: #fafafa; border-radius: 8px; padding: 24px; margin: 24px 0;">
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Your first book is free</p>
        <p style="margin: 0; font-size: 15px; color: #171717; line-height: 1.6;">
          50,000+ words, professionally formatted, ready to publish. No credit card required.
        </p>
      </div>

      ${ctaButton('Start Writing', `${APP_URL}/create`)}

      <p style="color: #737373; font-size: 13px; margin: 32px 0 0 0; text-align: center;">
        Questions? Reply to this email.
      </p>
    `),
  };
}

export function getFreeCreditEmail(userName: string, credits: number): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';
  const bookWord = credits === 1 ? 'book' : 'books';

  return {
    subject: `You've received ${credits} free book credit${credits > 1 ? 's' : ''}`,
    html: emailWrapper(`
      <h2 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #171717;">
        ${firstName}, you have free credits.
      </h2>

      <p style="color: #525252; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
        We've added book credits to your account.
      </p>

      <div style="background-color: #171717; border-radius: 8px; padding: 32px; margin: 24px 0; text-align: center;">
        <p style="color: #BFFF00; font-size: 48px; font-weight: 700; margin: 0; line-height: 1;">${credits}</p>
        <p style="color: #a3a3a3; font-size: 14px; margin: 8px 0 0 0;">${bookWord} to create</p>
      </div>

      <p style="color: #525252; font-size: 15px; margin: 0 0 8px 0; line-height: 1.6;">
        Use them anytime — they never expire.
      </p>

      ${ctaButton('Create a Book', `${APP_URL}/create`)}
    `),
  };
}

export function getBookReadyEmail(bookTitle: string, authorName: string, bookUrl: string): { subject: string; html: string } {
  return {
    subject: `Your book is ready: ${bookTitle}`,
    html: emailWrapper(`
      <h2 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #171717;">
        Your book is complete.
      </h2>

      <p style="color: #525252; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
        It's ready to download.
      </p>

      <div style="background-color: #fafafa; border-radius: 8px; padding: 24px; margin: 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 0 0 12px 0;">
              <span style="color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Title</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 0 16px 0; border-bottom: 1px solid #e5e5e5;">
              <span style="color: #171717; font-size: 16px; font-weight: 600;">${bookTitle}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 0 12px 0;">
              <span style="color: #737373; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Author</span>
            </td>
          </tr>
          <tr>
            <td>
              <span style="color: #171717; font-size: 15px;">${authorName}</span>
            </td>
          </tr>
        </table>
      </div>

      ${ctaButton('Download Book', bookUrl)}

      <p style="color: #737373; font-size: 13px; margin: 32px 0 0 0; text-align: center;">
        <a href="${APP_URL}/create" style="color: #171717; text-decoration: none;">Create another book</a>
      </p>
    `),
  };
}

export function getAnnouncementEmail(userName: string, title: string, message: string, ctaText?: string, ctaUrl?: string): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';

  const ctaSection = ctaText && ctaUrl ? ctaButton(ctaText, ctaUrl) : '';

  return {
    subject: title,
    html: emailWrapper(`
      <p style="color: #525252; font-size: 15px; margin: 0 0 24px 0;">Hi ${firstName},</p>

      <div style="color: #171717; font-size: 15px; line-height: 1.7;">
        ${message.split('\n').map(p => `<p style="margin: 0 0 16px 0;">${p}</p>`).join('')}
      </div>

      ${ctaSection}

      <p style="color: #737373; font-size: 14px; margin-top: 32px;">
        — DraftMyBook
      </p>
    `),
  };
}

// Template types for admin UI
export const EMAIL_TEMPLATES = {
  welcome: {
    id: 'welcome',
    label: 'Welcome',
    description: 'Sent when users sign up',
  },
  free_credit: {
    id: 'free_credit',
    label: 'Free Credits',
    description: 'Notify user of gifted credits',
  },
  announcement: {
    id: 'announcement',
    label: 'Announcement',
    description: 'Custom message',
  },
  bug_apology: {
    id: 'bug_apology',
    label: 'Bug Apology',
    description: 'Apologize for generation bug + 1 free credit',
  },
} as const;

export type EmailTemplateId = keyof typeof EMAIL_TEMPLATES;

// Credit gift button for claimable credits in emails
export function getCreditGiftSection(credits: number, claimUrl: string): string {
  const bookWord = credits === 1 ? 'book credit' : 'book credits';

  return `
    <div style="background-color: #171717; border-radius: 12px; padding: 32px; margin: 28px 0; text-align: center;">
      <p style="color: #ffffff; font-size: 16px; margin: 0 0 8px 0; font-weight: 500;">You've been gifted</p>
      <p style="color: #BFFF00; font-size: 56px; font-weight: 700; margin: 0; line-height: 1;">${credits}</p>
      <p style="color: #a3a3a3; font-size: 14px; margin: 8px 0 24px 0;">free ${bookWord}</p>
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="background-color: #BFFF00; border-radius: 8px;">
            <a href="${claimUrl}" style="display: inline-block; color: #171717; text-decoration: none; padding: 14px 32px; font-weight: 600; font-size: 15px;">
              Claim Your Free Credit${credits > 1 ? 's' : ''}
            </a>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// Announcement email with optional credit gift
export function getAnnouncementEmailWithCredit(
  userName: string,
  title: string,
  message: string,
  credits: number,
  claimUrl: string,
  ctaText?: string,
  ctaUrl?: string
): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';
  const ctaSection = ctaText && ctaUrl ? ctaButton(ctaText, ctaUrl) : '';

  return {
    subject: title,
    html: emailWrapper(`
      <p style="color: #525252; font-size: 15px; margin: 0 0 24px 0;">Hi ${firstName},</p>

      <div style="color: #171717; font-size: 15px; line-height: 1.7;">
        ${message.split('\n').map(p => `<p style="margin: 0 0 16px 0;">${p}</p>`).join('')}
      </div>

      ${getCreditGiftSection(credits, claimUrl)}

      ${ctaSection}

      <p style="color: #737373; font-size: 14px; margin-top: 32px;">
        — DraftMyBook
      </p>
    `),
  };
}

// Bug apology email - sent when a generation bug occurred
export function getBugApologyEmail(
  userName: string,
  claimUrl: string
): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';

  return {
    subject: "We're sorry - here's a free credit on us",
    html: emailWrapper(`
      <p style="color: #525252; font-size: 15px; margin: 0 0 24px 0;">Hi ${firstName},</p>

      <div style="color: #171717; font-size: 15px; line-height: 1.7;">
        <p style="margin: 0 0 16px 0;">
          We noticed that something went wrong during your recent book generation, and we sincerely apologize for the inconvenience.
        </p>
        <p style="margin: 0 0 16px 0;">
          DraftMyBook is still in beta, and while we're working hard to squash every bug, sometimes things slip through. We really appreciate your patience as we continue to improve.
        </p>
        <p style="margin: 0 0 16px 0;">
          To make it up to you, we're giving you <strong>1 free book credit</strong> so you can try again. Just click the button below to claim it.
        </p>
      </div>

      ${getCreditGiftSection(1, claimUrl)}

      <p style="color: #171717; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
        Thank you for being an early supporter of DraftMyBook. Your feedback helps us build a better product for everyone.
      </p>

      <p style="color: #737373; font-size: 14px; margin-top: 32px;">
        — The DraftMyBook Team
      </p>
    `),
  };
}
