'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  LayoutDashboard, Users, FileSpreadsheet, PenSquare, Send, AlertTriangle,
  Settings, ScrollText, LogOut, Menu, X, Shield, UserPlus
} from 'lucide-react';

interface SidebarProps {
  user?: { name?: string | null; email?: string | null; role?: string } | null;
  onSignOut?: () => void;
}

const userNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'OVERVIEW' },
  { href: '/accounts', label: 'Google Accounts', icon: Users, section: 'MANAGE' },
  { href: '/sheets', label: 'Sheet Import', icon: FileSpreadsheet },
  { href: '/compose', label: 'Campaign Composer', icon: PenSquare },
  { href: '/sending', label: 'Live Sending', icon: Send, section: 'CAMPAIGNS' },
  { href: '/failed', label: 'Failed Emails', icon: AlertTriangle },
  { href: '/logs', label: 'Activity Logs', icon: ScrollText, section: 'SYSTEM' },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const adminNavItems = [
  { href: '/admin', label: 'User Management', icon: UserPlus, section: 'ADMIN PANEL' },
  { href: '/settings', label: 'Settings', icon: Settings, section: 'SYSTEM' },
  { href: 'https://console.cloud.google.com/apis/credentials/consent', label: 'GCP Test Users', icon: Shield, external: true },
];

export default function Sidebar({ user, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : userNavItems;
  let lastSection = '';

  return (
    <>
      {/* Mobile header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={20} color="#6366f1" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>MailForge</span>
        </div>
        <button className="btn-ghost" onClick={() => setOpen(!open)} style={{ padding: 8, cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-primary)' }}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Overlay */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h1>⚡ MailForge</h1>
          <p>{isAdmin ? 'Admin Panel' : 'Campaign Engine'}</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const showSection = item.section && item.section !== lastSection;
            if (item.section) lastSection = item.section;
            const Icon = item.icon;
            return (
              <div key={item.href}>
                {showSection && <div className="sidebar-section">{item.section}</div>}
                {item.external ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`nav-link`}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={18} />
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <div className="account-avatar" style={{ width: 32, height: 32, fontSize: 14 }}>
                {(user.name || 'U')[0].toUpperCase()}
              </div>
              <div className="sidebar-user-info">
                <p>{user.name}</p>
                <span>{isAdmin ? '🔑 Admin' : '👤 User'}</span>
              </div>
            </div>
          )}
          {onSignOut && (
            <button className="nav-link" onClick={onSignOut} style={{ marginTop: 8 }}>
              <LogOut size={18} />
              Sign Out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
