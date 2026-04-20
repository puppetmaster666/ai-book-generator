import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

async function requireAdmin(): Promise<{ error: string | null; status: number }> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized', status: 401 };

  const orClauses: Array<{ id?: string; email?: string }> = [];
  if (session.user.id) orClauses.push({ id: session.user.id });
  if (session.user.email) orClauses.push({ email: session.user.email });
  if (orClauses.length === 0) return { error: 'Unauthorized', status: 401 };

  const user = await prisma.user.findFirst({
    where: { OR: orClauses },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return { error: 'Forbidden', status: 403 };
  return { error: null, status: 200 };
}

// GET /api/admin/roast-panels - list all featured roast panels in display order
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const panels = await prisma.illustration.findMany({
    where: {
      isFeaturedRoastPanel: true,
      status: 'completed',
      imageUrl: { not: null },
    },
    select: {
      id: true,
      bookId: true,
      altText: true,
      featuredRoastOrder: true,
      createdAt: true,
      book: { select: { title: true } },
    },
    orderBy: [
      { featuredRoastOrder: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'desc' },
    ],
  });

  return NextResponse.json({
    panels: panels.map(p => ({
      id: p.id,
      bookId: p.bookId,
      title: p.book?.title || 'Roast',
      altText: p.altText,
      featuredRoastOrder: p.featuredRoastOrder,
      imageUrl: `/api/books/${p.bookId}/illustrations/${p.id}`,
    })),
  });
}

// POST /api/admin/roast-panels/reorder - persist full ordering at once
// Body: { orderedIds: string[] }  (illustration ids in desired order)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { orderedIds } = body as { orderedIds?: unknown };

  if (!Array.isArray(orderedIds) || !orderedIds.every(id => typeof id === 'string')) {
    return NextResponse.json({ error: 'orderedIds must be an array of strings' }, { status: 400 });
  }

  await prisma.$transaction(
    (orderedIds as string[]).map((id, index) =>
      prisma.illustration.update({
        where: { id },
        data: { featuredRoastOrder: index },
      }),
    ),
  );

  return NextResponse.json({ success: true, count: orderedIds.length });
}
