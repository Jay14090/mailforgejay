import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getRecipientsByCampaign, getCampaignById } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any).id;
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;

  const campaign = getCampaignById(id, userId);
  if (!campaign) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recipients = getRecipientsByCampaign(id, status);
  return NextResponse.json({ recipients });
}
