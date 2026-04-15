import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAllUsers, createUser, updateUserActive, deleteUser, resetUserPassword } from '@/lib/db';
import { v4 as uuid } from 'uuid';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSession(): Promise<any> {
  return await auth();
}

export async function GET() {
  const session = await getSession();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const users = getAllUsers();
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { username, password, displayName } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  try {
    createUser({ id: uuid(), username, password, display_name: displayName || username });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { id, action, password } = await req.json();
  
  if (action === 'activate') updateUserActive(id, true);
  else if (action === 'deactivate') updateUserActive(id, false);
  else if (action === 'resetPassword' && password) resetUserPassword(id, password);
  else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { id } = await req.json();
  deleteUser(id);
  return NextResponse.json({ success: true });
}
