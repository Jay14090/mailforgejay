'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Send, AlertTriangle, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

interface Stats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  sending: number;
  skipped: number;
  accounts: { email: string; status: string; daily_sent: number; daily_limit: number }[];
}

interface LogEntry {
  id: number;
  message: string;
  level: string;
  account_email: string;
  recipient_email: string;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/logs?limit=50'),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Campaign overview and real-time analytics</p>
        </div>
        <div className="kpi-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="kpi-card">
              <div className="skeleton" style={{ width: '40%', height: 12, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: '60%', height: 32 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const total = stats?.total || 0;
  const sent = stats?.sent || 0;
  const pending = stats?.pending || 0;
  const failed = stats?.failed || 0;
  const successRate = total > 0 ? ((sent / total) * 100).toFixed(1) : '0';
  const failureRate = total > 0 ? ((failed / total) * 100).toFixed(1) : '0';

  const kpis = [
    { label: 'Total Recipients', value: total, icon: Users, color: '#6366f1' },
    { label: 'Sent', value: sent, icon: CheckCircle, color: '#10b981' },
    { label: 'Pending', value: pending, icon: Clock, color: '#3b82f6' },
    { label: 'Failed', value: failed, icon: AlertTriangle, color: '#ef4444' },
    { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, color: '#10b981' },
    { label: 'Failure Rate', value: `${failureRate}%`, icon: AlertTriangle, color: '#ef4444' },
  ];

  // Doughnut data
  const doughnutData = {
    labels: ['Sent', 'Pending', 'Failed', 'Sending'],
    datasets: [{
      data: [sent, pending, failed, stats?.sending || 0],
      backgroundColor: ['#10b981', '#3b82f6', '#ef4444', '#6366f1'],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };

  // Account usage bar chart
  const accounts = stats?.accounts || [];
  const barData = {
    labels: accounts.map(a => a.email.split('@')[0]),
    datasets: [
      {
        label: 'Sent Today',
        data: accounts.map(a => a.daily_sent),
        backgroundColor: '#6366f1',
        borderRadius: 4,
      },
      {
        label: 'Remaining',
        data: accounts.map(a => Math.max(0, a.daily_limit - a.daily_sent)),
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#8888a0', font: { size: 11 } } },
    },
    scales: {
      x: {
        stacked: true,
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#8888a0', font: { size: 11 } },
      },
      y: {
        stacked: true,
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#8888a0', font: { size: 11 } },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#8888a0', font: { size: 11 }, padding: 16, usePointStyle: true },
      },
    },
    cutout: '70%',
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Campaign overview and real-time analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="kpi-card" style={{ '--kpi-color': kpi.color } as React.CSSProperties}>
              <div className="kpi-icon" style={{ background: `${kpi.color}15`, color: kpi.color }}>
                <Icon size={20} />
              </div>
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value">{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-header">
            <h3>Campaign Progress</h3>
          </div>
          <div className="chart-container">
            {total > 0 ? <Doughnut data={doughnutData} options={doughnutOptions} /> : (
              <div className="empty-state">
                <p className="text-muted">No campaign data yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Account Usage Today</h3>
          </div>
          <div className="chart-container">
            {accounts.length > 0 ? <Bar data={barData} options={chartOptions} /> : (
              <div className="empty-state">
                <p className="text-muted">No accounts connected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Per-account progress */}
      {accounts.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h3>Account Limits</h3>
          </div>
          {accounts.map((account, i) => {
            const pct = (account.daily_sent / account.daily_limit) * 100;
            return (
              <div key={i} style={{ marginBottom: i < accounts.length - 1 ? 16 : 0 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 13 }}>{account.email}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge badge-${account.status}`}>{account.status}</span>
                  </div>
                </div>
                <div className="progress-bar-container">
                  <div
                    className={`progress-bar-fill ${pct >= 90 ? 'error' : pct >= 70 ? 'warning' : ''}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="progress-info">
                  <span>{account.daily_sent} sent</span>
                  <span>{account.daily_limit - account.daily_sent} remaining</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Activity Log */}
      <div className="card">
        <div className="card-header">
          <h3>Activity Log</h3>
          <span className="text-muted" style={{ fontSize: 12 }}>Live • Updates every 5s</span>
        </div>
        <div className="log-feed">
          {logs.length === 0 ? (
            <div className="empty-state">
              <p className="text-muted">No activity yet. Start a campaign to see logs here.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="log-entry">
                <div className={`log-dot ${log.level}`} />
                <div className="log-message">
                  {log.account_email && <strong>[{log.account_email.split('@')[0]}] </strong>}
                  {log.message}
                  {log.recipient_email && <span className="text-muted"> → {log.recipient_email}</span>}
                </div>
                <div className="log-time">
                  {new Date(log.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
