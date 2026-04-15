import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllCampaigns, createCampaign, getCampaignById, updateCampaignStatus, addLog } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const campaigns = getAllCampaigns((session.user as any).id);
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, subject, body, sheetUrl } = await req.json();

  if (!name || !subject || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const id = uuid();
  const userId = (session.user as any).id;
  createCampaign({ id, user_id: userId, name, subject, body, sheet_url: sheetUrl });
  addLog({ user_id: userId, campaign_id: id, message: `Campaign "${name}" created`, level: 'info' });

  return NextResponse.json({ success: true, id });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await req.json();
  
  const userId = (session.user as any).id;
  const campaign = getCampaignById(id, userId);
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  updateCampaignStatus(id, status, userId);
  addLog({ user_id: userId, campaign_id: id, message: `Campaign status changed to ${status}`, level: 'info' });

  return NextResponse.json({ success: true });
}
