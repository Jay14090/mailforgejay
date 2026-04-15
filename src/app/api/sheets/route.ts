import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { readSheet, extractSheetId } from '@/lib/sheets';
import { bulkInsertRecipients, updateCampaignCounts, getAllAccounts, getCampaignById } from '@/lib/db';

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sheetUrl, campaignId, range } = await req.json();

  if (!sheetUrl || !campaignId) {
    return NextResponse.json({ error: 'Missing sheetUrl or campaignId' }, { status: 400 });
  }

  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) {
    return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const campaign = getCampaignById(campaignId, userId);
  if (!campaign) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use the first connected account's token to read the sheet
  const accounts = getAllAccounts(userId) as { access_token: string }[];
  if (accounts.length === 0) {
    return NextResponse.json({ error: 'No connected Google accounts. Connect one first.' }, { status: 400 });
  }

  const accessToken = accounts[0].access_token;

  try {
    const data = await readSheet(accessToken, sheetId, range || 'Sheet1');

    if (!data.headers.includes('email')) {
      return NextResponse.json({ error: 'Sheet must have an "email" column' }, { status: 400 });
    }

    const recipients = data.rows
      .filter(row => row.email && row.email.includes('@'))
      .map(row => ({
        email: row.email.trim().toLowerCase(),
        name: row.name || row.first_name || row.firstname || '',
      }));

    bulkInsertRecipients(campaignId, recipients);
    updateCampaignCounts(campaignId);

    return NextResponse.json({
      success: true,
      imported: recipients.length,
      headers: data.headers,
      total_rows: data.rows.length,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || 'Failed to read sheet' }, { status: 500 });
  }
}
