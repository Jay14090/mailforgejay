'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Shield, ShieldOff, Key, RefreshCw } from 'lucide-react';

interface AppUser {
  id: string;
  username: string;
  display_name: string;
  role: string;
  active: number;
  created_at: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!newUsername || !newPassword) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, displayName: newDisplayName || newUsername }),
      });
      if (res.ok) {
        setNewUsername('');
        setNewPassword('');
        setNewDisplayName('');
        setShowCreate(false);
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create user');
      }
    } catch { setError('Network error'); }
    finally { setCreating(false); }
  };

  const toggleActive = async (id: string, currentActive: number) => {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: currentActive ? 'deactivate' : 'activate' }),
    });
    fetchUsers();
  };



  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>User Management</h2>
          <p>Create and manage user access to the dashboard</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary btn-sm" onClick={fetchUsers}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
            <UserPlus size={14} /> Create User
          </button>
        </div>
      </div>

      {/* Create user form */}
      {showCreate && (
        <div className="card mb-6" style={{ borderColor: 'var(--accent)', borderWidth: 1 }}>
          <div className="card-header">
            <h3>Create New User</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input className="form-input" placeholder="Display Name (optional)" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} />
            </div>
          </div>
          {error && <p style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div className="btn-group">
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={creating || !newUsername || !newPassword}>
              {creating ? 'Creating...' : 'Create User'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}



      {/* Users table */}
      {loading ? (
        <div className="card">
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="skeleton" style={{ width: '25%', height: 16 }} />
              <div className="skeleton" style={{ width: '20%', height: 16 }} />
              <div className="skeleton" style={{ width: '15%', height: 16 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="account-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                        {(user.display_name || user.username)[0].toUpperCase()}
                      </div>
                      {user.display_name}
                    </div>
                  </td>
                  <td>{user.username}</td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'badge-running' : 'badge-active'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.active ? 'badge-active' : 'badge-failed'}`}>
                      {user.active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="text-muted">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    {user.role !== 'admin' && (
                      <div className="btn-group">
                        <button
                          className={`btn btn-ghost btn-sm`}
                          onClick={() => toggleActive(user.id, user.active)}
                          title={user.active ? 'Revoke access' : 'Grant access'}
                        >
                          {user.active ? <ShieldOff size={14} /> : <Shield size={14} />}
                          {user.active ? 'Revoke' : 'Activate'}
                        </button>
                      </div>
                    )}
                    {user.role === 'admin' && (
                      <span className="text-muted" style={{ fontSize: 12 }}>Protected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
