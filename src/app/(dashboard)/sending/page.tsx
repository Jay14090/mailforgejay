'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Zap } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
}

interface LogEntry {
  id: number;
  message: string;
  level: string;
  created_at: string;
  account_email: string;
  recipient_email: string;
}

export default function SendingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [batchSize, setBatchSize] = useState(10);
  const [sending, setSending] = useState(false);
  const [autoSend, setAutoSend] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number; remaining: number } | null>(null);
  const autoRef = useRef(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/logs?campaignId=${selectedId}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) { console.error(e); }
  }, [selectedId]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  useEffect(() => {
    if (!selectedId) return;
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [selectedId, fetchLogs]);

  const sendBatch = async () => {
    if (!selectedId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/campaigns/${selectedId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize }),
      });
      const data = await res.json();
      setLastResult(data);
      fetchCampaigns();
      fetchLogs();

      // Continue auto-sending if enabled and there are remaining recipients
      if (autoRef.current && data.remaining > 0 && !data.stopped) {
        setTimeout(sendBatch, 2000);
      } else {
        setAutoSend(false);
        autoRef.current = false;
      }
    } catch (e) {
      console.error(e);
      setAutoSend(false);
      autoRef.current = false;
    } finally {
      setSending(false);
    }
  };

  const startAutoSend = () => {
    setAutoSend(true);
    autoRef.current = true;
    sendBatch();
  };

  const stopAutoSend = () => {
    setAutoSend(false);
    autoRef.current = false;
  };

  const updateCampaignStatus = async (status: string) => {
    await fetch('/api/campaigns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedId, status }),
    });
    fetchCampaigns();
  };

  const retryFailed = async () => {
    await fetch(`/api/campaigns/${selectedId}/retry`, { method: 'POST' });
    fetchCampaigns();
    fetchLogs();
  };

  const selected = campaigns.find(c => c.id === selectedId);
  const sentPct = selected && selected.total_recipients > 0
    ? (selected.sent_count / selected.total_recipients) * 100
    : 0;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Live Sending</h2>
        <p>Control and monitor your active campaign in real-time</p>
      </div>

      {/* Campaign selector */}
      <div className="card mb-6">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Select Campaign</label>
          <select
            className="form-select"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
          >
            <option value="">Choose a campaign...</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.status} ({c.sent_count}/{c.total_recipients} sent)
              </option>
            ))}
          </select>
        </div>
      </div>

      {selected && (
        <>
          {/* Progress */}
          <div className="sending-progress">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</h3>
                <p className="text-secondary" style={{ fontSize: 13 }}>{selected.subject}</p>
              </div>
              <span className={`badge badge-${selected.status}`}>{selected.status}</span>
            </div>

            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)' }}>{selected.sent_count}</div>
                <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Sent</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--info)' }}>
                  {selected.total_recipients - selected.sent_count - selected.failed_count}
                </div>
                <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Pending</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--error)' }}>{selected.failed_count}</div>
                <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Failed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{selected.total_recipients}</div>
                <div className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Total</div>
              </div>
            </div>

            <div className="progress-bar-container" style={{ height: 12 }}>
              <div
                className="progress-bar-fill success"
                style={{ width: `${sentPct}%` }}
              />
            </div>
            <div className="progress-info">
              <span>{sentPct.toFixed(1)}% complete</span>
              <span>{selected.total_recipients - selected.sent_count} remaining</span>
            </div>
          </div>

          {/* Controls */}
          <div className="sending-controls">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="text-secondary" style={{ fontSize: 12, fontWeight: 600 }}>BATCH SIZE:</span>
              <input
                type="number"
                className="batch-size-input"
                value={batchSize}
                onChange={e => setBatchSize(parseInt(e.target.value) || 10)}
                min={1}
                max={50}
              />
            </div>

            <div className="btn-group" style={{ flex: 1 }}>
              {!autoSend ? (
                <>
                  <button className="btn btn-primary" onClick={sendBatch} disabled={sending}>
                    <Zap size={16} /> {sending ? 'Sending...' : 'Send Batch'}
                  </button>
                  <button className="btn btn-success" onClick={startAutoSend} disabled={sending}>
                    <Play size={16} /> Auto Send
                  </button>
                </>
              ) : (
                <button className="btn btn-warning" onClick={stopAutoSend}>
                  <Pause size={16} /> Stop Auto
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => updateCampaignStatus('paused')}>
                <Pause size={16} /> Pause
              </button>
              <button className="btn btn-danger" onClick={() => updateCampaignStatus('stopped')}>
                <Square size={16} /> Stop
              </button>
              {selected.failed_count > 0 && (
                <button className="btn btn-secondary" onClick={retryFailed}>
                  <RotateCcw size={16} /> Retry Failed ({selected.failed_count})
                </button>
              )}
            </div>
          </div>

          {lastResult && (
            <div className="card mb-6" style={{ padding: 16 }}>
              <p style={{ fontSize: 13 }}>
                Last batch: <span className="text-success">{lastResult.sent} sent</span>,{' '}
                <span className="text-error">{lastResult.failed} failed</span>,{' '}
                {lastResult.remaining > 0 ? 'more pending' : 'queue empty'}
              </p>
            </div>
          )}

          {/* Live log */}
          <div className="card">
            <div className="card-header">
              <h3>Live Activity</h3>
              {autoSend && <span className="badge badge-running">Auto-sending</span>}
            </div>
            <div className="log-feed">
              {logs.length === 0 ? (
                <div className="empty-state"><p className="text-muted">No activity yet for this campaign</p></div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="log-entry">
                    <div className={`log-dot ${log.level}`} />
                    <div className="log-message">
                      {log.account_email && <strong>[{log.account_email.split('@')[0]}] </strong>}
                      {log.message}
                      {log.recipient_email && <span className="text-muted"> → {log.recipient_email}</span>}
                    </div>
                    <div className="log-time">{new Date(log.created_at).toLocaleTimeString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
