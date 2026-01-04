import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { getVerifyEmailEmail } from '@/lib/email-templates';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.draftmybook.com';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If user exists but email is not verified, allow re-sending verification
      if (!existingUser.emailVerified && existingUser.passwordHash) {
        // Delete old verification tokens for this email
        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });

        // Create new verification token
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
        const verifyEmail = getVerifyEmailEmail(name || email, verifyUrl);
        sendEmail({
          to: email,
          subject: verifyEmail.subject,
          html: verifyEmail.html,
        }).catch((err) => {
          console.error('Failed to send verification email:', err);
        });

        return NextResponse.json({
          success: true,
          message: 'Verification email sent. Please check your inbox.',
          requiresVerification: true,
        });
      }

      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user (emailVerified will be null until they verify)
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        // emailVerified is null by default - user must verify
      },
    });

    // Create verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Send verification email (not welcome email - that comes after verification)
    const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
    const verifyEmail = getVerifyEmailEmail(name || email, verifyUrl);
    sendEmail({
      to: email,
      subject: verifyEmail.subject,
      html: verifyEmail.html,
    }).catch((err) => {
      console.error('Failed to send verification email:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Please check your email to verify your account.',
      requiresVerification: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
