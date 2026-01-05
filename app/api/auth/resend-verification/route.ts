import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { getVerifyEmailEmail } from '@/lib/email-templates';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.draftmybook.com';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, emailVerified: true, passwordHash: true },
    });

    // Don't reveal if user exists or not for security
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      });
    }

    // Only resend for password-based accounts (not OAuth)
    if (!user.passwordHash) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      });
    }

    // Already verified
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Your email is already verified. You can log in.',
        alreadyVerified: true,
      });
    }

    // Rate limit: check for recent verification tokens
    const recentToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        expires: { gt: new Date() },
      },
      orderBy: { expires: 'desc' },
    });

    // If token was created within last 2 minutes, don't send another
    if (recentToken) {
      const tokenAge = Date.now() - (recentToken.expires.getTime() - 24 * 60 * 60 * 1000);
      if (tokenAge < 2 * 60 * 1000) { // Less than 2 minutes old
        return NextResponse.json({
          success: true,
          message: 'A verification email was recently sent. Please check your inbox and spam folder.',
          rateLimited: true,
        });
      }
    }

    // Delete old tokens
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Create new token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Send verification email
    const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
    const verifyEmail = getVerifyEmailEmail(user.name || email, verifyUrl);

    const emailSent = await sendEmail({
      to: email,
      subject: verifyEmail.subject,
      html: verifyEmail.html,
    });

    if (!emailSent) {
      console.error(`[Resend Verification] Failed to send email to ${email}`);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later or contact support.' },
        { status: 500 }
      );
    }

    console.log(`[Resend Verification] Sent verification email to ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent! Please check your inbox and spam folder.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}
