import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllAccounts, updateAccountStatus } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const accounts = getAllAccounts((session.user as any).id);
  return NextResponse.json({ accounts });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email, status } = await req.json();
  updateAccountStatus(email, status, (session.user as any).id);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email } = await req.json();
  const { getDb } = await import('@/lib/db');
  
  try {
    getDb().prepare(`DELETE FROM accounts WHERE email = ? AND user_id = ?`).run(email, (session.user as any).id);
    return NextResponse.json({ success: true, removed: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
