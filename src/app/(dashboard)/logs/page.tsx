'use client';

import { useEffect, useState, useCallback } from 'react';
import { ScrollText, Download, RefreshCw } from 'lucide-react';

interface LogEntry {
  id: number;
  campaign_id: string;
  message: string;
  level: string;
  account_email: string;
  recipient_email: string;
  created_at: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs?limit=200');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  const counts = {
    all: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    success: logs.filter(l => l.level === 'success').length,
    warning: logs.filter(l => l.level === 'warning').length,
    error: logs.filter(l => l.level === 'error').length,
  };

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h2>Activity Logs</h2>
          <p>Full system log with timestamps</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => {
            if (logs[0]) {
              const campaignId = logs[0].campaign_id;
              if (campaignId) window.open(`/api/export?campaignId=${campaignId}&type=logs`, '_blank');
            }
          }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="filter-bar">
        {Object.entries(counts).map(([key, count]) => (
          <button
            key={key}
            className={`filter-btn ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
            <span className="count">({count})</span>
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          [...Array(10)].map((_, i) => (
            <div key={i} className="log-entry">
              <div className="skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '70%', height: 14 }} />
              </div>
              <div className="skeleton" style={{ width: 60, height: 12 }} />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ScrollText size={28} /></div>
            <h3>No logs yet</h3>
            <p>Activity will appear here when you start sending campaigns.</p>
          </div>
        ) : (
          <div className="log-feed" style={{ maxHeight: 600 }}>
            {filtered.map(log => (
              <div key={log.id} className="log-entry">
                <div className={`log-dot ${log.level}`} />
                <div className="log-message">
                  {log.account_email && <strong>[{log.account_email.split('@')[0]}] </strong>}
                  {log.message}
                  {log.recipient_email && <span className="text-muted"> → {log.recipient_email}</span>}
                </div>
                <div className="log-time">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
