import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDashboardStats } from '@/lib/db';

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const campaignId = url.searchParams.get('campaignId') || undefined;
  const userId = (session.user as any).id;

  const stats = getDashboardStats(userId, campaignId);
  return NextResponse.json(stats);
}
