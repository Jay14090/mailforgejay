import { google } from 'googleapis';

function createOAuth2Client(accessToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({ access_token: accessToken });
  return client;
}

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  fromEmail: string,
  fromName?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const auth = createOAuth2Client(accessToken);
    const gmail = google.gmail({ version: 'v1', auth });

    // Build RFC 2822 message
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

    // Build RFC 2822 message
    const message = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      '',
      body,
    ].join('\r\n');

    // Base64url encode
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });

    return { success: true, messageId: result.data.id || undefined };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: number; errors?: { reason?: string }[] };
    const reason = err.errors?.[0]?.reason || '';
    
    if (err.code === 429 || reason === 'rateLimitExceeded') {
      return { success: false, error: 'RATE_LIMITED' };
    }
    if (err.code === 401) {
      return { success: false, error: 'AUTH_EXPIRED' };
    }
    return { success: false, error: err.message || 'Unknown send error' };
  }
}
