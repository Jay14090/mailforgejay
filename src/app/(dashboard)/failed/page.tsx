'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw, Download } from 'lucide-react';

interface Recipient {
  id: string;
  email: string;
  name: string;
  status: string;
  last_error: string;
  retry_count: number;
  assigned_account: string;
}

interface Campaign {
  id: string;
  name: string;
  failed_count: number;
}

export default function FailedPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [failed, setFailed] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(data => setCampaigns(data.campaigns || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/campaigns/${selectedId}/recipients?status=failed`)
      .then(r => r.json())
      .then(data => setFailed(data.recipients || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedId]);

  const retryAll = async () => {
    await fetch(`/api/campaigns/${selectedId}/retry`, { method: 'POST' });
    // Refresh
    const res = await fetch(`/api/campaigns/${selectedId}/recipients?status=failed`);
    const data = await res.json();
    setFailed(data.recipients || []);
  };

  const exportFailed = () => {
    window.open(`/api/export?campaignId=${selectedId}&type=failed`, '_blank');
  };

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h2>Failed Emails</h2>
          <p>Review and retry failed deliveries</p>
        </div>
        {selectedId && failed.length > 0 && (
          <div className="btn-group">
            <button className="btn btn-secondary btn-sm" onClick={exportFailed}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={retryAll}>
              <RotateCcw size={14} /> Retry All ({failed.length})
            </button>
          </div>
        )}
      </div>

      <div className="card mb-6">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Campaign</label>
          <select className="form-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">Select campaign...</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.failed_count} failed)</option>
            ))}
          </select>
        </div>
      </div>

      {selectedId && (
        loading ? (
          <div className="card">
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="skeleton" style={{ width: '30%', height: 14 }} />
                <div className="skeleton" style={{ width: '20%', height: 14 }} />
                <div className="skeleton" style={{ width: '40%', height: 14 }} />
              </div>
            ))}
          </div>
        ) : failed.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon" style={{ background: 'var(--success-bg)' }}>
                <AlertTriangle size={28} color="var(--success)" />
              </div>
              <h3>No failed emails</h3>
              <p>All recipients were processed successfully, or no campaign has been sent yet.</p>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Name</th>
                  <th>Error</th>
                  <th>Retries</th>
                  <th>Account</th>
                </tr>
              </thead>
              <tbody>
                {failed.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.email}</td>
                    <td>{r.name || '—'}</td>
                    <td>
                      <span style={{ color: 'var(--error)', fontSize: 12 }}>{r.last_error || 'Unknown'}</span>
                    </td>
                    <td>{r.retry_count}</td>
                    <td className="text-muted">{r.assigned_account || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
