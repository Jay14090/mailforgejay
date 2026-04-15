import { google } from 'googleapis';

export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function readSheet(
  accessToken: string,
  spreadsheetId: string,
  range: string = 'Sheet1'
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: 'v4', auth });

  let actualRange = range;
  if (!range || range === 'Sheet1') {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const firstSheetName = meta.data.sheets?.[0]?.properties?.title;
    if (firstSheetName) {
      actualRange = firstSheetName;
    }
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: actualRange,
  });

  const values = response.data.values;
  if (!values || values.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = values[0].map((h: string) => h.toLowerCase().trim());
  const rows = values.slice(1).map((row: string[]) => {
    const obj: Record<string, string> = {};
    headers.forEach((h: string, i: number) => {
      obj[h] = row[i] || '';
    });
    return obj;
  });

  return { headers, rows };
}
