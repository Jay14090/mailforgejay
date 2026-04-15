'use client';

import { signIn } from 'next-auth/react';
import { SessionProvider, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Shield, User, AlertCircle } from 'lucide-react';

function AdminLoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const role = (session.user as any)?.role;
      router.push(role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="skeleton" style={{ width: 60, height: 60, borderRadius: '50%', margin: '0 auto 16px' }} />
          <div className="skeleton" style={{ height: 24, width: '60%', margin: '0 auto 8px' }} />
          <div className="skeleton" style={{ height: 16, width: '80%', margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      username,
      password,
      portal: 'admin',
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      // Extract error message from NextAuth
      const errorMessage = result.error.includes('Access denied') 
        ? 'Access denied. You must be an administrator.' 
        : 'Invalid username or password';
      setError(errorMessage);
    } else {
      window.location.href = '/admin';
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ borderColor: 'var(--accent)', borderWidth: 1 }}>
        <div style={{ width: 56, height: 56, borderRadius: '14px', background: 'var(--bg-elevated)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 30px rgba(99,102,241,0.1)' }}>
          <Shield size={26} color="var(--accent)" />
        </div>
        <h1>Admin Portal</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 28, color: 'var(--warning)' }}>
          Restricted access. Administrators only.
        </p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Admin ID"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{ paddingLeft: 40 }}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ position: 'relative' }}>
              <Shield size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-input"
                placeholder="Passcode"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: 40 }}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--error-bg)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
              <AlertCircle size={16} color="var(--error)" />
              <span style={{ color: 'var(--error)', fontSize: 13 }}>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 15 }}
          >
            {loading ? 'Authenticating...' : 'Enter Admin Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <SessionProvider>
      <AdminLoginContent />
    </SessionProvider>
  );
}
