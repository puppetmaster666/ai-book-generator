// Email utility using Resend
// Get your API key at https://resend.com

// Re-export branded email templates for backward compatibility
export { getBookReadyEmail } from './email-templates';

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
        from: process.env.EMAIL_FROM || 'DraftMyBook <noreply@send.draftmybook.com>',
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

    console.log(`Email sent successfully to ${to}: "${subject}"`);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}
