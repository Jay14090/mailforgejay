import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { upsertAccount } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/admin-login`);
  }
  
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=no_code`);
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    upsertAccount({
      id: uuid(),
      user_id: (session.user as any).id,
      email: userInfo.data.email || '',
      name: userInfo.data.name || '',
      picture: userInfo.data.picture || '',
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || undefined,
      token_expiry: tokens.expiry_date || undefined,
    });

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/accounts?success=connected`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/accounts?error=auth_failed`);
  }
}
