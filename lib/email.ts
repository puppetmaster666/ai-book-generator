// Email utility using Resend
// Get your API key at https://resend.com

// Re-export branded email templates for backward compatibility
export { getBookReadyEmail } from './email-templates';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

interface SendResult {
  success: boolean;
  error?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: EmailOptions): Promise<boolean> {
  const result = await sendEmailWithDetails({ to, subject, html, replyTo });
  return result.success;
}

export async function sendEmailWithDetails({ to, subject, html, replyTo }: EmailOptions): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    const msg = 'RESEND_API_KEY not configured, skipping email';
    console.log(msg);
    return { success: false, error: msg };
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || 'DraftMyBook <noreply@draftmybook.com>';
    const emailPayload: Record<string, string> = {
      from: fromAddress,
      to,
      subject,
      html,
    };

    if (replyTo) {
      emailPayload.reply_to = replyTo;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      let errorDetail: string;
      try {
        const errorJson = await response.json();
        errorDetail = JSON.stringify(errorJson);
      } catch {
        errorDetail = await response.text();
      }
      console.error(`Failed to send email to ${to} (${response.status}):`, errorDetail);
      console.error(`From address: ${fromAddress}, API key prefix: ${apiKey.substring(0, 8)}...`);
      return { success: false, error: `Resend ${response.status}: ${errorDetail}` };
    }

    console.log(`Email sent successfully to ${to}: "${subject}"`);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Email] Failed to send:', msg);
    return { success: false, error: msg };
  }
}
