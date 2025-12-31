// Styled email templates for DraftMyBook
// Design: Lime (#BFFF00) / Charcoal (#171717) / White
// Clean, professional aesthetic matching homepage

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.draftmybook.com';

// Base email wrapper with DraftMyBook branding
function emailWrapper(content: string, preheader?: string): string {
  // Preheader is hidden text that appears in email previews
  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:#f5f5f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>`
    : '';

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DraftMyBook</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #171717; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
    ${preheaderHtml}
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
    subject: 'Your DraftMyBook account is ready',
    html: emailWrapper(`
      <h2 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #171717;">
        Welcome, ${firstName}.
      </h2>

      <p style="color: #525252; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
        Your account is ready. You can now create complete books from a simple description — novels, picture books, or comics.
      </p>

      <div style="background-color: #fafafa; border-radius: 8px; padding: 24px; margin: 24px 0;">
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #737373; text-transform: uppercase; letter-spacing: 0.5px;">Your first book is on us</p>
        <p style="margin: 0; font-size: 15px; color: #171717; line-height: 1.6;">
          50,000+ words, professionally formatted, ready to publish.
        </p>
      </div>

      ${ctaButton('Start Writing', `${APP_URL}/create`)}

      <p style="color: #737373; font-size: 13px; margin: 32px 0 0 0; text-align: center;">
        Questions? Reply to this email.
      </p>
    `, 'Your account is ready. Create your first book now.'),
  };
}

export function getFreeCreditEmail(userName: string, credits: number): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';
  const bookWord = credits === 1 ? 'book' : 'books';

  return {
    subject: `Your account has been updated`,
    html: emailWrapper(`
      <h2 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #171717;">
        ${firstName}, we've added ${credits} ${bookWord} to your account.
      </h2>

      <p style="color: #525252; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
        You can now create ${credits} additional ${bookWord} on us.
      </p>

      <div style="background-color: #171717; border-radius: 8px; padding: 32px; margin: 24px 0; text-align: center;">
        <p style="color: #BFFF00; font-size: 48px; font-weight: 700; margin: 0; line-height: 1;">${credits}</p>
        <p style="color: #a3a3a3; font-size: 14px; margin: 8px 0 0 0;">${bookWord} ready to create</p>
      </div>

      <p style="color: #525252; font-size: 15px; margin: 0 0 8px 0; line-height: 1.6;">
        Use them anytime — they never expire.
      </p>

      ${ctaButton('Create a Book', `${APP_URL}/create`)}
    `, `We've added ${credits} ${bookWord} to your account.`),
  };
}

export function getBookReadyEmail(
  bookTitle: string,
  authorName: string,
  bookUrl: string,
  options?: { isFirstBook?: boolean }
): { subject: string; html: string } {
  const firstBookDiscount = options?.isFirstBook ? `
      <div style="background-color: #171717; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <p style="color: #ffffff; font-size: 14px; margin: 0 0 8px 0;">Your next book is</p>
        <p style="color: #BFFF00; font-size: 32px; font-weight: 700; margin: 0 0 8px 0; line-height: 1;">50% OFF</p>
        <p style="color: #a3a3a3; font-size: 13px; margin: 0 0 16px 0;">Use code <strong style="color: #ffffff;">SECOND50</strong> at checkout</p>
      </div>
  ` : '';

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

      ${firstBookDiscount}

      <p style="color: #737373; font-size: 13px; margin: 32px 0 0 0; text-align: center;">
        <a href="${APP_URL}/create" style="color: #171717; text-decoration: none;">Create another book</a>
      </p>
    `, `${bookTitle} is ready to download.`),
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
    `, message.split('\n')[0].slice(0, 100)),
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
    label: 'Account Updated',
    description: 'Notify user of added books',
  },
  announcement: {
    id: 'announcement',
    label: 'Announcement',
    description: 'Custom message',
  },
  bug_apology: {
    id: 'bug_apology',
    label: 'Bug Apology',
    description: 'Apologize for generation bug + 1 book',
  },
  beta_feedback: {
    id: 'beta_feedback',
    label: 'Beta Feedback Request',
    description: 'Ask early users for feedback',
  },
} as const;

export type EmailTemplateId = keyof typeof EMAIL_TEMPLATES;

// Credit section for claimable books in emails
export function getCreditGiftSection(credits: number, claimUrl: string): string {
  const bookWord = credits === 1 ? 'book' : 'books';

  return `
    <div style="background-color: #171717; border-radius: 12px; padding: 32px; margin: 28px 0; text-align: center;">
      <p style="color: #ffffff; font-size: 16px; margin: 0 0 8px 0; font-weight: 500;">We've added to your account</p>
      <p style="color: #BFFF00; font-size: 56px; font-weight: 700; margin: 0; line-height: 1;">${credits}</p>
      <p style="color: #a3a3a3; font-size: 14px; margin: 8px 0 24px 0;">${bookWord} on the house</p>
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="background-color: #BFFF00; border-radius: 8px;">
            <a href="${claimUrl}" style="display: inline-block; color: #171717; text-decoration: none; padding: 14px 32px; font-weight: 600; font-size: 15px;">
              Activate Your ${bookWord === 'book' ? 'Book' : 'Books'}
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
    `, message.split('\n')[0].slice(0, 100)),
  };
}

// Beta feedback request email - ask early users for feedback
export function getBetaFeedbackEmail(
  userName: string
): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';

  return {
    subject: 'Quick question about your book',
    html: emailWrapper(`
      <p style="color: #525252; font-size: 15px; margin: 0 0 24px 0;">Hi ${firstName},</p>

      <p style="color: #171717; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
        Thanks for being one of our first users. We launched just a few days ago and we're still in beta, which means we're actively improving things and some bugs are expected.
      </p>

      <p style="color: #171717; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
        I'd love to hear your honest feedback. Just hit reply and let me know:
      </p>

      <div style="background-color: #fafafa; border-radius: 8px; padding: 24px; margin: 24px 0;">
        <p style="color: #171717; font-size: 15px; line-height: 1.8; margin: 0;">
          <strong>1.</strong> How was your free book? Did it meet your expectations?<br><br>
          <strong>2.</strong> What would you create next if you had another book?<br><br>
          <strong>3.</strong> What would make you pay $19.99 for your next one?<br><br>
          <strong>4.</strong> Did you run into any bugs or confusing parts?
        </p>
      </div>

      <p style="color: #171717; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
        Your feedback directly shapes what we build next. Every reply gets read personally.
      </p>

      <div style="background-color: #171717; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="color: #a3a3a3; font-size: 13px; margin: 0 0 8px 0;">🚧 BETA NOTE</p>
        <p style="color: #ffffff; font-size: 14px; line-height: 1.6; margin: 0;">
          We're polishing the product daily. If something didn't work right, let us know and we'll make it right.
        </p>
      </div>

      <p style="color: #737373; font-size: 14px; margin-top: 32px;">
        Thanks for being an early supporter,<br>
        Jonathan, DraftMyBook
      </p>
    `, 'How was your first book? Just 4 quick questions, reply directly to this email.'),
  };
}

// Bug apology email - sent when a generation bug occurred
export function getBugApologyEmail(
  userName: string,
  claimUrl: string
): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';

  return {
    subject: 'A note about your recent book',
    html: emailWrapper(`
      <p style="color: #525252; font-size: 15px; margin: 0 0 24px 0;">Hi ${firstName},</p>

      <p style="color: #171717; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
        Something went wrong with your recent book. We've added 1 book to your account so you can try again.
      </p>

      ${getCreditGiftSection(1, claimUrl)}

      <p style="color: #737373; font-size: 14px; margin-top: 32px;">
        — DraftMyBook
      </p>
    `, 'Something went wrong. We added 1 book to your account.'),
  };
}
