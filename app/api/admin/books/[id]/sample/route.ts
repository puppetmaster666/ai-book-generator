import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/admin/books/[id]/sample - Toggle featured sample and upload PDF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const action = formData.get('action') as string;

    if (action === 'toggle') {
      // Toggle isFeaturedSample
      const book = await prisma.book.findUnique({
        where: { id },
        select: { isFeaturedSample: true },
      });

      if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      }

      const updated = await prisma.book.update({
        where: { id },
        data: { isFeaturedSample: !book.isFeaturedSample },
        select: { isFeaturedSample: true },
      });

      return NextResponse.json({
        success: true,
        isFeaturedSample: updated.isFeaturedSample,
      });
    }

    if (action === 'upload') {
      // Upload PDF file
      const file = formData.get('pdf') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
      }

      // Max 10MB
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
      }

      // Convert to base64
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64}`;

      await prisma.book.update({
        where: { id },
        data: {
          samplePdfUrl: dataUrl,
          isFeaturedSample: true, // Auto-enable when uploading PDF
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Sample PDF uploaded',
      });
    }

    if (action === 'remove') {
      // Remove sample PDF
      await prisma.book.update({
        where: { id },
        data: {
          samplePdfUrl: null,
          isFeaturedSample: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Sample removed',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Sample management error:', error);
    return NextResponse.json({ error: 'Failed to manage sample' }, { status: 500 });
  }
}

// GET /api/admin/books/[id]/sample - Get sample status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        isFeaturedSample: true,
        samplePdfUrl: true,
      },
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json({
      isFeaturedSample: book.isFeaturedSample,
      hasSamplePdf: !!book.samplePdfUrl,
    });
  } catch (error) {
    console.error('Get sample status error:', error);
    return NextResponse.json({ error: 'Failed to get sample status' }, { status: 500 });
  }
}
