'use client';

import { useState, useEffect } from 'react';
import { FileSpreadsheet, Upload, CheckCircle, AlertCircle } from 'lucide-react';

export default function SheetsPage() {
  const [importType, setImportType] = useState<'url' | 'file'>('url');
  const [sheetUrl, setSheetUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [range, setRange] = useState('Sheet1');
  const [campaignId, setCampaignId] = useState('');
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; imported?: number; error?: string } | null>(null);

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(data => setCampaigns(data.campaigns || []))
      .catch(() => {});
  }, []);

  const handleImport = async () => {
    if (!campaignId) return;
    if (importType === 'url' && !sheetUrl) return;
    if (importType === 'file' && !file) return;

    setImporting(true);
    setResult(null);

    try {
      let res;
      if (importType === 'url') {
        res = await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetUrl, campaignId, range }),
        });
      } else {
        const formData = new FormData();
        formData.append('campaignId', campaignId);
        formData.append('file', file as Blob);
        
        res = await fetch('/api/excel', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, imported: data.imported });
      } else {
        setResult({ error: data.error });
      }
    } catch (e) {
      setResult({ error: 'Network error' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Google Sheet Import</h2>
        <p>Attach a Google Sheet to import recipient data for your campaign</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Import Settings</h3>
            <FileSpreadsheet size={18} className="text-accent" />
          </div>

          <div className="form-group">
            <label className="form-label">Campaign</label>
            <select
              className="form-select"
              value={campaignId}
              onChange={e => setCampaignId(e.target.value)}
            >
              <option value="">Select a campaign...</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {campaigns.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4 }}>
                Create a campaign first in the Campaign Composer page.
              </p>
            )}
          </div>

          <div className="tabs" style={{ marginBottom: 20 }}>
            <button 
              className={`tab ${importType === 'url' ? 'active' : ''}`}
              onClick={() => { setImportType('url'); setResult(null); }}
              style={{ flex: 1 }}
            >
              Google Sheet URL
            </button>
            <button 
              className={`tab ${importType === 'file' ? 'active' : ''}`}
              onClick={() => { setImportType('file'); setResult(null); }}
              style={{ flex: 1 }}
            >
              Upload Excel (.xlsx)
            </button>
          </div>

          {importType === 'url' ? (
            <>
              <div className="form-group">
                <label className="form-label">Google Sheet URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sheet Range (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Sheet1"
                  value={range}
                  onChange={e => setRange(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label">Select Excel File (.xlsx, .csv)</label>
              <input
                type="file"
                className="form-input"
                accept=".xlsx, .xls, .csv"
                onChange={e => setFile(e.target.files?.[0] || null)}
                style={{ padding: '10px' }}
              />
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                Upload any Excel file directly from your computer. No Google permissions required!
              </p>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={importing || !campaignId || (importType === 'url' && !sheetUrl) || (importType === 'file' && !file)}
          >
            {importing ? (
              <>Importing...</>
            ) : (
              <><Upload size={16} /> Import Recipients</>
            )}
          </button>

          {result && (
            <div className={`mt-4`} style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: result.success ? 'var(--success-bg)' : 'var(--error-bg)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              {result.success ? (
                <>
                  <CheckCircle size={16} color="var(--success)" />
                  <span style={{ color: 'var(--success)' }}>
                    Successfully imported {result.imported} recipients
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} color="var(--error)" />
                  <span style={{ color: 'var(--error)' }}>{result.error}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Sheet Requirements</h3>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <p style={{ marginBottom: 12 }}>Your Google Sheet must have these columns:</p>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td><strong>email</strong></td><td><span className="badge badge-error">Required</span></td><td>Recipient email address</td></tr>
                  <tr><td><strong>name</strong></td><td><span className="badge badge-pending">Optional</span></td><td>Recipient name for personalization</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              💡 Use <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>{'{{name}}'}</code> and{' '}
              <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>{'{{email}}'}</code> in your email body for personalization.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              ⚠️ The sheet must be shared with your Google account or be publicly accessible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
