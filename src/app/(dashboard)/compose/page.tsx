'use client';

import { useState } from 'react';
import { PenSquare, Eye, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ComposePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name || !subject || !body) {
      setError('Please fill in all required fields');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, body, sheetUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/sending');
      } else {
        setError(data.error || 'Failed to create campaign');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const previewBody = body
    .replace(/\{\{name\}\}/gi, 'John Doe')
    .replace(/\{\{email\}\}/gi, 'john@example.com');

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Campaign Composer</h2>
        <p>Create a new email campaign with personalization support</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Compose</h3>
            <PenSquare size={18} className="text-accent" />
          </div>

          <div className="form-group">
            <label className="form-label">Campaign Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Spring 2025 Newsletter"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Subject Line</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Hey {{name}}, check this out!"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Body (HTML supported)</label>
            <textarea
              className="form-textarea"
              placeholder={'Hi {{name}},\n\nWe have exciting news to share...\n\nBest regards,\nTeam'}
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={10}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Google Sheet URL (optional — can also add from Sheet Import)</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>{error}</p>
          )}

          <div className="btn-group">
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              <Send size={16} /> {saving ? 'Creating...' : 'Create Campaign'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowPreview(!showPreview)}>
              <Eye size={16} /> {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="card">
          <div className="card-header">
            <h3>Preview</h3>
          </div>
          {!showPreview && !subject && !body ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Eye size={28} /></div>
              <h3>Live Preview</h3>
              <p>Start typing to see a preview of your email</p>
            </div>
          ) : (
            <div className="composer-preview">
              <div className="subject">
                {subject
                  .replace(/\{\{name\}\}/gi, 'John Doe')
                  .replace(/\{\{email\}\}/gi, 'john@example.com')
                  || 'No subject'}
              </div>
              <div
                className="body"
                dangerouslySetInnerHTML={{ __html: previewBody || '<em>No body content</em>' }}
              />
            </div>
          )}

          <div className="mt-4" style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
              PERSONALIZATION TOKENS
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <code style={{ background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: 4, fontSize: 12, color: 'var(--accent)' }}>
                {'{{name}}'}
              </code>
              <code style={{ background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: 4, fontSize: 12, color: 'var(--accent)' }}>
                {'{{email}}'}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
