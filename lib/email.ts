// Email utility using Resend
// Get your API key at https://resend.com

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log('RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'DraftMyBook <lhllparis@gmail.com>',
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export function getBookReadyEmail(bookTitle: string, authorName: string, bookUrl: string): { subject: string; html: string } {
  return {
    subject: `Your book "${bookTitle}" is ready!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0;">DraftMyBook</h1>
          </div>

          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
            <h2 style="font-size: 24px; font-weight: bold; margin: 0 0 8px 0;">Your Book is Ready!</h2>
            <p style="color: #525252; margin: 0;">Time to download your masterpiece</p>
          </div>

          <div style="background: #fafafa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; color: #737373; font-size: 14px;">Book Title</p>
            <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">${bookTitle}</p>
            <p style="margin: 0 0 8px 0; color: #737373; font-size: 14px;">Author</p>
            <p style="margin: 0; font-size: 16px;">${authorName}</p>
          </div>

          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${bookUrl}" style="display: inline-block; background: #171717; color: white; text-decoration: none; padding: 16px 32px; border-radius: 9999px; font-weight: 500; font-size: 16px;">
              Download Your Book
            </a>
          </div>

          <div style="border-top: 1px solid #e5e5e5; padding-top: 24px; text-align: center; color: #737373; font-size: 14px;">
            <p style="margin: 0 0 8px 0;">Thank you for using DraftMyBook!</p>
            <p style="margin: 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.draftmybook.com'}" style="color: #171717;">Create another book</a>
            </p>
          </div>
        </body>
      </html>
    `,
  };
}
