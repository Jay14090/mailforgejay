import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DB_PATH = process.env.DATABASE_PATH || './data/campaign.db';

let db: Database.Database | null = null;

// Password hashing
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, s, 64).toString('hex');
  return { hash, salt: s };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = crypto.scryptSync(password, salt, 64).toString('hex');
  return result === hash;
}

export function getDb(): Database.Database {
  if (db) return db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      display_name TEXT,
      role TEXT DEFAULT 'user' CHECK(role IN ('admin','user')),
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      picture TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expiry INTEGER,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','rate-limited','failed','disconnected')),
      daily_sent INTEGER DEFAULT 0,
      daily_limit INTEGER DEFAULT 300,
      last_reset_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, email)
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      sheet_id TEXT,
      sheet_url TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','running','paused','stopped','completed')),
      total_recipients INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipients (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','skipped')),
      sent_at TEXT,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      assigned_account TEXT,
      row_index INTEGER,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      UNIQUE(campaign_id, email)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      campaign_id TEXT,
      account_email TEXT,
      recipient_email TEXT,
      message TEXT NOT NULL,
      level TEXT DEFAULT 'info' CHECK(level IN ('info','success','warning','error')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON recipients(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_recipients_status ON recipients(status);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_campaign ON activity_logs(campaign_id);
  `);

  // Seed admin user if not exists
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const { hash, salt } = hashPassword('JayCr7@140905');
    db.prepare(`INSERT INTO users (id, username, password_hash, password_salt, display_name, role) VALUES (?, ?, ?, ?, ?, ?)`)
      .run('admin-001', 'admin', hash, salt, 'Administrator', 'admin');
  }

  return db;
}

// ============ USER HELPERS ============
export function getUserByUsername(username: string) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as {
    id: string; username: string; password_hash: string; password_salt: string;
    display_name: string; role: string; active: number;
  } | undefined;
}

export function getAllUsers() {
  return getDb().prepare('SELECT id, username, display_name, role, active, created_at FROM users ORDER BY created_at DESC').all();
}

export function createUser(user: { id: string; username: string; password: string; display_name: string; role?: string }) {
  const { hash, salt } = hashPassword(user.password);
  return getDb().prepare(`INSERT INTO users (id, username, password_hash, password_salt, display_name, role) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(user.id, user.username, hash, salt, user.display_name, user.role || 'user');
}

export function updateUserActive(id: string, active: boolean) {
  return getDb().prepare('UPDATE users SET active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(active ? 1 : 0, id);
}

export function deleteUser(id: string) {
  return getDb().prepare('DELETE FROM users WHERE id = ? AND role != \'admin\'').run(id);
}

export function resetUserPassword(id: string, newPassword: string) {
  const { hash, salt } = hashPassword(newPassword);
  return getDb().prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, salt, id);
}

// ============ ACCOUNT HELPERS ============
export function getAllAccounts(userId: string) {
  return getDb().prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

export function getActiveAccounts(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  getDb().prepare(`UPDATE accounts SET daily_sent = 0, status = 'active', last_reset_date = ? WHERE (last_reset_date != ? OR last_reset_date IS NULL) AND user_id = ?`).run(today, today, userId);
  return getDb().prepare(`SELECT * FROM accounts WHERE status = 'active' AND daily_sent < daily_limit AND user_id = ? ORDER BY daily_sent ASC`).all(userId);
}

export function getAccountById(id: string, userId: string) {
  return getDb().prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(id, userId);
}

export function upsertAccount(account: { id: string; user_id: string; email: string; name: string; picture?: string; access_token: string; refresh_token?: string; token_expiry?: number }) {
  const today = new Date().toISOString().split('T')[0];
  return getDb().prepare(`
    INSERT INTO accounts (id, user_id, email, name, picture, access_token, refresh_token, token_expiry, last_reset_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, email) DO UPDATE SET
      name = excluded.name,
      picture = excluded.picture,
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, accounts.refresh_token),
      token_expiry = excluded.token_expiry,
      status = 'active',
      updated_at = datetime('now')
  `).run(account.id, account.user_id, account.email, account.name, account.picture || null, account.access_token, account.refresh_token || null, account.token_expiry || null, today);
}

export function updateAccountStatus(email: string, status: string, userId: string) {
  return getDb().prepare(`UPDATE accounts SET status = ?, updated_at = datetime('now') WHERE email = ? AND user_id = ?`).run(status, email, userId);
}

export function incrementAccountSent(email: string, userId: string) {
  return getDb().prepare(`UPDATE accounts SET daily_sent = daily_sent + 1, updated_at = datetime('now') WHERE email = ? AND user_id = ?`).run(email, userId);
}

// ============ CAMPAIGN HELPERS ============
export function getAllCampaigns(userId: string) {
  return getDb().prepare('SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

export function getCampaignById(id: string, userId: string) {
  return getDb().prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(id, userId);
}

export function createCampaign(campaign: { id: string; user_id: string; name: string; subject: string; body: string; sheet_id?: string; sheet_url?: string }) {
  return getDb().prepare(`INSERT INTO campaigns (id, user_id, name, subject, body, sheet_id, sheet_url) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(campaign.id, campaign.user_id, campaign.name, campaign.subject, campaign.body, campaign.sheet_id || null, campaign.sheet_url || null);
}

export function updateCampaignStatus(id: string, status: string, userId: string) {
  return getDb().prepare(`UPDATE campaigns SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`).run(status, id, userId);
}

export function updateCampaignCounts(id: string) {
  const stats = getDb().prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent, SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM recipients WHERE campaign_id = ?
  `).get(id) as { total: number; sent: number; failed: number };
  getDb().prepare(`UPDATE campaigns SET total_recipients = ?, sent_count = ?, failed_count = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(stats.total, stats.sent, stats.failed, id);
}

// ============ RECIPIENT HELPERS ============
export function getRecipientsByCampaign(campaignId: string, status?: string) {
  if (status) return getDb().prepare('SELECT * FROM recipients WHERE campaign_id = ? AND status = ? ORDER BY row_index').all(campaignId, status);
  return getDb().prepare('SELECT * FROM recipients WHERE campaign_id = ? ORDER BY row_index').all(campaignId);
}

export function getPendingRecipients(campaignId: string, limit: number = 10) {
  return getDb().prepare('SELECT * FROM recipients WHERE campaign_id = ? AND status = \'pending\' ORDER BY row_index LIMIT ?').all(campaignId, limit);
}

export function updateRecipientStatus(id: string, status: string, extra?: { sent_at?: string; last_error?: string; assigned_account?: string; retry_count?: number }) {
  let query = `UPDATE recipients SET status = ?`;
  const params: (string | number)[] = [status];
  if (extra?.sent_at) { query += `, sent_at = ?`; params.push(extra.sent_at); }
  if (extra?.last_error !== undefined) { query += `, last_error = ?`; params.push(extra.last_error); }
  if (extra?.assigned_account) { query += `, assigned_account = ?`; params.push(extra.assigned_account); }
  if (extra?.retry_count !== undefined) { query += `, retry_count = ?`; params.push(extra.retry_count); }
  query += ` WHERE id = ?`;
  params.push(id);
  return getDb().prepare(query).run(...params);
}

export function bulkInsertRecipients(campaignId: string, recipients: { email: string; name?: string }[]) {
  const insert = getDb().prepare(`INSERT OR IGNORE INTO recipients (id, campaign_id, email, name, row_index) VALUES (?, ?, ?, ?, ?)`);
  const insertMany = getDb().transaction((items: { email: string; name?: string }[]) => {
    let idx = 0;
    for (const r of items) {
      const id = `${campaignId}-${r.email.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      insert.run(id, campaignId, r.email, r.name || null, idx);
      idx++;
    }
  });
  insertMany(recipients);
}

// ============ LOG HELPERS ============
export function addLog(log: { user_id: string; campaign_id?: string; account_email?: string; recipient_email?: string; message: string; level?: string }) {
  return getDb().prepare(`INSERT INTO activity_logs (user_id, campaign_id, account_email, recipient_email, message, level) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(log.user_id, log.campaign_id || null, log.account_email || null, log.recipient_email || null, log.message, log.level || 'info');
}

export function getLogs(userId: string, campaignId?: string, limit: number = 100) {
  if (campaignId) return getDb().prepare('SELECT * FROM activity_logs WHERE user_id = ? AND campaign_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, campaignId, limit);
  return getDb().prepare('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit);
}

// ============ DASHBOARD STATS ============
export function getDashboardStats(userId: string, campaignId?: string) {
  let stats;
  if (campaignId) {
    stats = getDb().prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'sending' THEN 1 ELSE 0 END) as sending,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
      FROM recipients r JOIN campaigns c ON r.campaign_id = c.id
      WHERE c.id = ? AND c.user_id = ?
    `).get(campaignId, userId) as Record<string, number>;
  } else {
    stats = getDb().prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN r.status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN r.status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN r.status = 'sending' THEN 1 ELSE 0 END) as sending,
      SUM(CASE WHEN r.status = 'skipped' THEN 1 ELSE 0 END) as skipped
      FROM recipients r JOIN campaigns c ON r.campaign_id = c.id
      WHERE c.user_id = ?
    `).get(userId) as Record<string, number>;
  }

  const accounts = getDb().prepare('SELECT email, status, daily_sent, daily_limit FROM accounts WHERE user_id = ?').all(userId);
  return { ...stats, accounts };
}
