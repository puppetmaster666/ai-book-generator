// Styled email templates for DraftMyBook
// Design: Lime (#BFFF00) / Charcoal (#171717) / White
// Matching homepage aesthetic with skewed rectangles

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
      <!-- Header with Logo -->
      <div style="background-color: #171717; padding: 32px; text-align: center;">
        <!-- Logo Icon -->
        <div style="display: inline-block; margin-bottom: 16px;">
          <img src="${APP_URL}/icon.svg" alt="D" width="48" height="48" style="display: block; border-radius: 10px;" />
        </div>
        <!-- Brand Name -->
        <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: -0.5px;">draftmybook</h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #a3a3a3;">Turn your ideas into complete books</p>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        ${content}
      </div>

      <!-- Footer -->
      <div style="background-color: #fafafa; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e5e5;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #737373;">
          <a href="${APP_URL}" style="color: #171717; text-decoration: none; font-weight: 500;">draftmybook.com</a>
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

// Simpler inline accent for email compatibility
function accentText(text: string): string {
  return `<span style="background-color: #BFFF00; padding: 2px 10px; font-weight: 600; color: #171717;">${text}</span>`;
}

// Primary CTA Button - lime with shadow
function ctaButton(text: string, url: string): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="display: inline-block; background-color: #BFFF00; color: #171717; text-decoration: none; padding: 16px 40px; border-radius: 9999px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(191, 255, 0, 0.4);">
        ${text}
      </a>
    </div>
  `;
}

// Secondary/Ghost Button
function secondaryButton(text: string, url: string): string {
  return `
    <div style="text-align: center; margin: 16px 0;">
      <a href="${url}" style="display: inline-block; background-color: transparent; color: #171717; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 500; font-size: 14px; border: 2px solid #e5e5e5;">
        ${text}
      </a>
    </div>
  `;
}

// Email Templates

export function getWelcomeEmail(userName: string): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';

  return {
    subject: 'Welcome to DraftMyBook - Your first book is free!',
    html: emailWrapper(`
      <!-- Hero Section -->
      <div style="text-align: center; margin-bottom: 32px;">
        <p style="font-size: 14px; color: #BFFF00; background-color: #171717; display: inline-block; padding: 6px 16px; border-radius: 20px; margin: 0 0 20px 0; font-weight: 500;">
          YOUR FIRST BOOK IS FREE
        </p>
        <h2 style="font-size: 32px; font-weight: bold; margin: 0 0 12px 0; color: #171717; line-height: 1.2;">
          Welcome, ${accentText(firstName)}!
        </h2>
        <p style="color: #525252; margin: 0; font-size: 17px; max-width: 400px; margin: 0 auto;">
          You're now part of a community of authors creating amazing books with AI.
        </p>
      </div>

      <!-- Stats Banner -->
      <div style="background: linear-gradient(135deg, #171717 0%, #262626 100%); border-radius: 16px; padding: 24px; margin-bottom: 28px; text-align: center;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="text-align: center; padding: 8px;">
              <p style="color: #BFFF00; font-size: 28px; font-weight: bold; margin: 0;">50,000+</p>
              <p style="color: #a3a3a3; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Words per book</p>
            </td>
            <td width="50%" style="text-align: center; padding: 8px;">
              <p style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0;">&lt;1hr</p>
              <p style="color: #a3a3a3; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Generation time</p>
            </td>
          </tr>
        </table>
      </div>

      <!-- What You Can Create -->
      <div style="background-color: #fafafa; border-radius: 16px; padding: 28px; margin-bottom: 28px;">
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 20px 0; color: #171717; text-align: center;">What you can create:</h3>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
          <tr>
            <td width="50%" style="padding: 8px;">
              <div style="background: white; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e5e5e5;">
                <span style="font-size: 32px; display: block; margin-bottom: 8px;">&#128218;</span>
                <span style="font-weight: 600; color: #171717; font-size: 14px;">Novels</span>
                <p style="color: #737373; font-size: 12px; margin: 4px 0 0 0;">Full-length fiction</p>
              </div>
            </td>
            <td width="50%" style="padding: 8px;">
              <div style="background: white; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e5e5e5;">
                <span style="font-size: 32px; display: block; margin-bottom: 8px;">&#127912;</span>
                <span style="font-weight: 600; color: #171717; font-size: 14px;">Picture Books</span>
                <p style="color: #737373; font-size: 12px; margin: 4px 0 0 0;">Illustrated children's</p>
              </div>
            </td>
          </tr>
          <tr>
            <td width="50%" style="padding: 8px;">
              <div style="background: white; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e5e5e5;">
                <span style="font-size: 32px; display: block; margin-bottom: 8px;">&#128165;</span>
                <span style="font-weight: 600; color: #171717; font-size: 14px;">Comics</span>
                <p style="color: #737373; font-size: 12px; margin: 4px 0 0 0;">Graphic novels</p>
              </div>
            </td>
            <td width="50%" style="padding: 8px;">
              <div style="background: white; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e5e5e5;">
                <span style="font-size: 32px; display: block; margin-bottom: 8px;">&#128214;</span>
                <span style="font-weight: 600; color: #171717; font-size: 14px;">EPUB Export</span>
                <p style="color: #737373; font-size: 12px; margin: 4px 0 0 0;">Ready to publish</p>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- CTA Section -->
      <div style="text-align: center; padding: 8px 0 16px;">
        <p style="color: #171717; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">Ready to write your first book?</p>
        <p style="color: #737373; font-size: 14px; margin: 0 0 24px 0;">It's completely free - no credit card required.</p>
        ${ctaButton('Claim Your Free Book', `${APP_URL}/create`)}
      </div>

      <!-- Help Note -->
      <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e5e5;">
        <p style="color: #737373; font-size: 14px; margin: 0;">
          Questions? Just reply to this email - we're here to help!
        </p>
      </div>
    `),
  };
}

export function getFreeCreditEmail(userName: string, credits: number): { subject: string; html: string } {
  const firstName = userName?.split(' ')[0] || 'there';
  const bookWord = credits === 1 ? 'book' : 'books';

  return {
    subject: `You've received ${credits} free book credit${credits > 1 ? 's' : ''}!`,
    html: emailWrapper(`
      <!-- Gift Icon -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #BFFF00 0%, #a3e600 100%); border-radius: 50%; margin: 0 auto 20px; line-height: 80px; box-shadow: 0 8px 24px rgba(191, 255, 0, 0.3);">
          <span style="font-size: 40px;">&#127873;</span>
        </div>
        <h2 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0; color: #171717;">
          Hey ${firstName}, you've got a ${accentText('gift')}!
        </h2>
        <p style="color: #525252; margin: 0; font-size: 16px;">We've added free book credits to your account.</p>
      </div>

      <!-- Credit Display -->
      <div style="background: linear-gradient(135deg, #171717 0%, #262626 100%); border-radius: 16px; padding: 32px; margin-bottom: 28px; text-align: center;">
        <p style="color: #a3a3a3; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 2px;">Your free credits</p>
        <p style="color: #BFFF00; font-size: 64px; font-weight: bold; margin: 0; line-height: 1;">${credits}</p>
        <p style="color: #ffffff; font-size: 18px; margin: 12px 0 0 0;">${bookWord} you can create for free</p>
      </div>

      <p style="color: #525252; text-align: center; margin-bottom: 8px; font-size: 16px;">
        Use your credits to create any type of book - novels, picture books, or comics!
      </p>

      ${ctaButton('Use Your Credits Now', `${APP_URL}/create`)}

      <p style="color: #737373; font-size: 14px; text-align: center; margin-top: 24px;">
        Your credits never expire. Create whenever you're ready!
      </p>
    `),
  };
}

export function getBookReadyEmail(bookTitle: string, authorName: string, bookUrl: string): { subject: string; html: string } {
  return {
    subject: `Your book "${bookTitle}" is ready!`,
    html: emailWrapper(`
      <!-- Success Icon -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto 20px; line-height: 80px; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);">
          <span style="font-size: 40px;">&#10024;</span>
        </div>
        <h2 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0; color: #171717;">
          Your Book is ${accentText('Ready')}!
        </h2>
        <p style="color: #525252; margin: 0; font-size: 16px;">Time to download your masterpiece</p>
      </div>

      <!-- Book Details -->
      <div style="background-color: #fafafa; border-radius: 16px; padding: 24px; margin-bottom: 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
              <span style="color: #737373; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Title</span>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">
              <span style="color: #171717; font-size: 16px; font-weight: 600;">${bookTitle}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #737373; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Author</span>
            </td>
            <td style="padding: 8px 0; text-align: right;">
              <span style="color: #171717; font-size: 16px;">${authorName}</span>
            </td>
          </tr>
        </table>
      </div>

      ${ctaButton('Download Your Book', bookUrl)}

      <!-- Create Another -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e5e5; margin-top: 20px;">
        <p style="color: #525252; font-size: 14px; margin: 0 0 12px 0;">Ready for your next story?</p>
        ${secondaryButton('Create Another Book', `${APP_URL}/create`)}
      </div>
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
