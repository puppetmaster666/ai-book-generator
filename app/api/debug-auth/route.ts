import { NextResponse } from 'next/server';

export async function GET() {
  // Check which environment variables are set (just presence, not values)
  const envCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'not set',
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json(envCheck);
}
