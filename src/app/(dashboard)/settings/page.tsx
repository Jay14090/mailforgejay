'use client';

import { Settings as SettingsIcon, Shield, Zap, Database } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Settings</h2>
        <p>System configuration and preferences</p>
      </div>

      <div className="settings-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Shield size={18} className="text-accent" />
          <h3 style={{ margin: 0 }}>Authentication</h3>
        </div>
        <div className="settings-row">
          <span className="label">Signed in as</span>
          <span className="value">{session?.user?.email || 'Not signed in'}</span>
        </div>
        <div className="settings-row">
          <span className="label">OAuth Provider</span>
          <span className="value">Google</span>
        </div>
        <div className="settings-row">
          <span className="label">Scopes Granted</span>
          <span className="value text-muted" style={{ fontSize: 12 }}>Gmail Send, Sheets Read</span>
        </div>
      </div>

      <div className="settings-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Zap size={18} className="text-accent" />
          <h3 style={{ margin: 0 }}>Sending Defaults</h3>
        </div>
        <div className="settings-row">
          <span className="label">Default daily limit per account</span>
          <span className="value">300 emails</span>
        </div>
        <div className="settings-row">
          <span className="label">Default batch size</span>
          <span className="value">10 emails</span>
        </div>
        <div className="settings-row">
          <span className="label">Auto-retry on rate limit</span>
          <span className="value text-success">Enabled</span>
        </div>
        <div className="settings-row">
          <span className="label">Account rotation</span>
          <span className="value text-success">Round-robin</span>
        </div>
        <div className="settings-row">
          <span className="label">Duplicate prevention</span>
          <span className="value text-success">Strict (by email + campaign)</span>
        </div>
      </div>

      <div className="settings-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Database size={18} className="text-accent" />
          <h3 style={{ margin: 0 }}>Storage</h3>
        </div>
        <div className="settings-row">
          <span className="label">Database</span>
          <span className="value">SQLite (campaign.db)</span>
        </div>
        <div className="settings-row">
          <span className="label">Persistence</span>
          <span className="value text-success">All state persisted — safe to restart</span>
        </div>
        <div className="settings-row">
          <span className="label">Daily limit reset</span>
          <span className="value">Automatic at midnight UTC</span>
        </div>
      </div>

      <div className="settings-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <SettingsIcon size={18} className="text-accent" />
          <h3 style={{ margin: 0 }}>Google Cloud Setup</h3>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p>To use MailForge, you need:</p>
          <ol style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>A Google Cloud Console project</li>
            <li>OAuth 2.0 credentials (Web application type)</li>
            <li>Gmail API enabled</li>
            <li>Google Sheets API enabled</li>
            <li>Authorized redirect URI: <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>http://localhost:3000/api/auth/callback/google</code></li>
          </ol>
          <p className="mt-4" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Add your Client ID and Secret to <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>.env.local</code>
          </p>
        </div>
      </div>
    </div>
  );
}
