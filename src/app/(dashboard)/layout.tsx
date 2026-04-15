'use client';

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

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

  if (!session) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;

  return (
    <div className="app-layout">
      <Sidebar
        user={{ name: user?.name, email: user?.username, role: user?.role }}
        onSignOut={() => signOut({ callbackUrl: '/' })}
      />
      <main className="main-content fade-in">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </SessionProvider>
  );
}
