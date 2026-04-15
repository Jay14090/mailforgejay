import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const portalType = process.env.PORTAL_TYPE; // 'admin' or 'user' or undefined (local dev)
  
  if (!portalType) return NextResponse.next();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Protect Admin Portal
  if (portalType === 'admin') {
    // Hide regular user login and redirect to admin login
    if (path === '/') {
      url.pathname = '/admin-login';
      return NextResponse.redirect(url);
    }
  }

  // Protect User Portal
  if (portalType === 'user') {
    // Hide admin routes on user portal
    if (path.startsWith('/admin') || path === '/admin-login') {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
