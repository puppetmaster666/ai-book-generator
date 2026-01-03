import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Public endpoint to fetch site settings
export async function GET() {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { id: 'default', trafficWarningEnabled: false },
      });
    }

    return NextResponse.json({
      trafficWarningEnabled: settings.trafficWarningEnabled,
    });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
