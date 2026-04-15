import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { bulkInsertRecipients, updateCampaignCounts, getCampaignById } from '@/lib/db';
import * as xlsx from 'xlsx';

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const campaignId = formData.get('campaignId') as string | null;

    if (!file || !campaignId) {
      return NextResponse.json({ error: 'Missing file or campaignId' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const campaign = getCampaignById(campaignId, userId);
    if (!campaign) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON array
    // using defval as '' to ensure all properties exist even if cell is empty
    const rawRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: 'The uploaded file is empty' }, { status: 400 });
    }

    // Convert headers to lowercase to find 'email' robustly
    const headers = Object.keys(rawRows[0] || {}).map(k => k.toLowerCase().trim());
    
    if (!headers.includes('email')) {
      return NextResponse.json({ error: 'Sheet must have an "Email" column' }, { status: 400 });
    }

    // Map rows to recipients
    const recipients = rawRows
      .map(raw => {
        // Find email taking case insensitivity into account
        const emailKey = Object.keys(raw).find(k => k.toLowerCase().trim() === 'email');
        const nameKey = Object.keys(raw).find(k => {
          const lower = k.toLowerCase().trim();
          return lower === 'name' || lower === 'first_name' || lower === 'firstname';
        });

        const email = emailKey && typeof raw[emailKey] === 'string' ? raw[emailKey].trim().toLowerCase() : '';
        const name = nameKey && typeof raw[nameKey] === 'string' ? raw[nameKey].trim() : '';

        return { email, name };
      })
      .filter(row => row.email && row.email.includes('@'));

    bulkInsertRecipients(campaignId, recipients);
    updateCampaignCounts(campaignId);

    return NextResponse.json({
      success: true,
      imported: recipients.length,
      headers: headers,
      total_rows: rawRows.length,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json({ error: err.message || 'Failed to parse Excel file' }, { status: 500 });
  }
}
