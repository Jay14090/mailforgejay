'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, WifiOff } from 'lucide-react';

interface Account {
  id: string;
  email: string;
  name: string;
  picture: string;
  status: string;
  daily_sent: number;
  daily_limit: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAccounts();
    // Check for success/error in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'connected') {
      fetchAccounts();
      window.history.replaceState({}, '', '/accounts');
    }
  }, []);

  const connectGoogle = () => {
    window.location.href = '/api/google/authorize';
  };

  const updateStatus = async (email: string, status: string) => {
    await fetch('/api/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, status }),
    });
    fetchAccounts();
  };

  const disconnectAccount = async (email: string) => {
    if (!confirm('Are you sure you want to completely disconnect and remove this Google Account?')) return;
    await fetch('/api/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    fetchAccounts();
  };

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Connected Google Accounts</h2>
          <p>Connect Gmail accounts for sending campaigns</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary btn-sm" onClick={fetchAccounts}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={connectGoogle}>
            <Plus size={14} /> Connect Google Account
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="account-card">
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: '80%', height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><WifiOff size={28} /></div>
            <h3>No accounts connected</h3>
            <p>Click &ldquo;Connect Google Account&rdquo; to authorize a Gmail for sending.</p>
            <button className="btn btn-primary mt-4" onClick={connectGoogle}>
              <Plus size={16} /> Connect Google Account
            </button>
          </div>
        </div>
      ) : (
        <div className="grid-2">
          {accounts.map((account) => {
            const pct = (account.daily_sent / account.daily_limit) * 100;
            return (
              <div key={account.id} className="card" style={{ padding: 20 }}>
                <div className="account-card" style={{ background: 'transparent', border: 'none', padding: 0, marginBottom: 16 }}>
                  <div className="account-avatar">
                    {account.picture ? (
                      <img src={account.picture} alt={account.name} referrerPolicy="no-referrer" />
                    ) : (
                      (account.name || account.email)?.[0]?.toUpperCase() || 'G'
                    )}
                  </div>
                  <div className="account-info">
                    <h4>{account.name || account.email}</h4>
                    <p>{account.email}</p>
                  </div>
                  <span className={`badge badge-${account.status}`}>{account.status}</span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 4, fontSize: 13 }}>
                    <span className="text-secondary">Daily usage</span>
                    <span style={{ fontWeight: 600 }}>{account.daily_sent} / {account.daily_limit}</span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className={`progress-bar-fill ${pct >= 90 ? 'error' : pct >= 70 ? 'warning' : ''}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="btn-group">
                  {account.status === 'active' ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(account.email, 'paused')}>Pause</button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(account.email, 'active')}>Activate</button>
                  )}
                  <button className="btn btn-ghost btn-sm text-error" onClick={() => disconnectAccount(account.email)}>Disconnect</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
