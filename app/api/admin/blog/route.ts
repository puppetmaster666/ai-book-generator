import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Admin blog management - list and delete posts.
 */

// GET - list all posts
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } });
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, primaryKeyword: true, published: true, publishedAt: true, createdAt: true },
  });

  return NextResponse.json({ posts });
}

// DELETE - delete posts by IDs
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } });
  if (!admin?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { ids } = await request.json() as { ids: string[] };
  if (!ids || ids.length === 0) return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });

  const result = await prisma.blogPost.deleteMany({ where: { id: { in: ids } } });

  return NextResponse.json({ deleted: result.count });
}
