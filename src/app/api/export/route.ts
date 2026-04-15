import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getRecipientsByCampaign, getLogs, getCampaignById } from '@/lib/db';

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const campaignId = url.searchParams.get('campaignId');
  const type = url.searchParams.get('type') || 'sent'; // sent, failed, logs

  if (!campaignId) {
    return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const campaign = getCampaignById(campaignId, userId);
  if (!campaign) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let data: unknown[];
  let filename: string;

  if (type === 'logs') {
    data = getLogs(userId, campaignId, 10000) as Record<string, unknown>[];
    filename = `logs_${campaignId}.csv`;
  } else {
    data = getRecipientsByCampaign(campaignId, type) as Record<string, unknown>[];
    filename = `${type}_${campaignId}.csv`;
  }

  if (!data.length) {
    return NextResponse.json({ error: 'No data to export' }, { status: 404 });
  }

  const headers = Object.keys(data[0] as Record<string, unknown>);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${String((row as Record<string, unknown>)[h] || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
