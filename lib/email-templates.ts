// Styled email templates for DraftMyBook
// Design: Lime (#BFFF00) / Charcoal (#171717) / White

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
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f5f5f5;">
    <div style="background-color: #ffffff; margin: 20px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <!-- Header -->
      <div style="background-color: #171717; padding: 24px 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">draftmybook</h1>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        ${content}
      </div>

      <!-- Footer -->
      <div style="background-color: #f5f5f5; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e5e5;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #737373;">
          <a href="${APP_URL}" style="color: #171717; text-decoration: none;">draftmybook.com</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #a3a3a3;">
          You're receiving this email because you signed up for DraftMyBook.
        </p>
      </div>
    </div>
  </body>
</html>
`;
}

// Skewed accent text component (inline style simulation)
function accentText(text: string): string {
  return `<span style="display: inline-block; position: relative; padding: 2px 8px; background-color: #BFFF00; transform: skewX(-3deg); font-weight: 600;">${text}</span>`;
}

// CTA Button
function ctaButton(text: string, url: string): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="display: inline-block; background-color: #BFFF00; color: #171717; text-decoration: none; padding: 16px 32px; border-radius: 9999px; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </div>
  `;
}

// Email Templates

export function getWelcomeEmail(userName: string): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';

  return {
    subject: 'Welcome to DraftMyBook!',
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0; color: #171717;">
          Welcome, ${accentText(firstName)}!
        </h2>
        <p style="color: #525252; margin: 0; font-size: 16px;">We're excited to have you join our community of authors.</p>
      </div>

      <div style="background-color: #fafafa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #171717;">What you can do with DraftMyBook:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #525252;">
          <li style="margin-bottom: 8px;">Create complete novels with AI assistance</li>
          <li style="margin-bottom: 8px;">Generate children's picture books with illustrations</li>
          <li style="margin-bottom: 8px;">Design comic books with custom art styles</li>
          <li style="margin-bottom: 8px;">Export to EPUB or PDF for publishing</li>
        </ul>
      </div>

      <p style="color: #525252; text-align: center; margin-bottom: 8px;">Ready to bring your story to life?</p>

      ${ctaButton('Create Your First Book', `${APP_URL}/create`)}

      <p style="color: #737373; font-size: 14px; text-align: center; margin-top: 24px;">
        Questions? Just reply to this email - we're here to help!
      </p>
    `),
  };
}

export function getFreeCreditEmail(userName: string, credits: number): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';
  const bookWord = credits === 1 ? 'book' : 'books';

  return {
    subject: `You've received ${credits} free book credit${credits > 1 ? 's' : ''}!`,
    html: emailWrapper(`
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 80px; height: 80px; background-color: #BFFF00; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 36px;">&#127873;</span>
        </div>
        <h2 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0; color: #171717;">
          Hey ${firstName}, you've got a ${accentText('gift')}!
        </h2>
        <p style="color: #525252; margin: 0; font-size: 16px;">We've added free book credits to your account.</p>
      </div>

      <div style="background-color: #171717; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <p style="color: #a3a3a3; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Your free credits</p>
        <p style="color: #BFFF00; font-size: 48px; font-weight: bold; margin: 0;">${credits}</p>
        <p style="color: #ffffff; font-size: 16px; margin: 8px 0 0 0;">${bookWord} you can create for free</p>
      </div>

      <p style="color: #525252; text-align: center; margin-bottom: 8px;">Use your credits to create any type of book - novels, picture books, or comics!</p>

      ${ctaButton('Use Your Credits Now', `${APP_URL}/create`)}

      <p style="color: #737373; font-size: 14px; text-align: center; margin-top: 24px;">
        Your credits never expire. Create whenever you're ready!
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
      <div style="margin-bottom: 24px;">
        <p style="color: #525252; font-size: 16px; margin: 0 0 16px 0;">Hi ${firstName},</p>
        <div style="color: #171717; font-size: 16px; line-height: 1.7;">
          ${message.split('\n').map(p => `<p style="margin: 0 0 16px 0;">${p}</p>`).join('')}
        </div>
      </div>

      ${ctaSection}

      <p style="color: #737373; font-size: 14px; margin-top: 24px;">
        Best,<br>
        The DraftMyBook Team
      </p>
    `),
  };
}

// Template types for admin UI
export const EMAIL_TEMPLATES = {
  welcome: {
    id: 'welcome',
    label: 'Thanks for Joining',
    description: 'Welcome email for new users',
  },
  free_credit: {
    id: 'free_credit',
    label: 'Free Credit Gift',
    description: 'Notify user of free book credit',
  },
  announcement: {
    id: 'announcement',
    label: 'General Announcement',
    description: 'Custom promotional or news email',
  },
} as const;

export type EmailTemplateId = keyof typeof EMAIL_TEMPLATES;
