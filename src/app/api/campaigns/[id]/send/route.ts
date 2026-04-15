import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { processBatch } from '@/lib/sender';
import { updateCampaignStatus, addLog } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { batchSize } = await req.json().catch(() => ({ batchSize: 10 }));

  const userId = (session.user as any).id;

  addLog({ user_id: userId, campaign_id: id, message: `Processing batch of ${batchSize}...`, level: 'info' });
  updateCampaignStatus(id, 'running', userId);

  const result = await processBatch(id, batchSize, userId);

  if (result.remaining === 0 && !result.stopped) {
    updateCampaignStatus(id, 'completed', userId);
    addLog({ user_id: userId, campaign_id: id, message: 'Campaign completed! All recipients processed.', level: 'success' });
  }

  return NextResponse.json(result);
}
