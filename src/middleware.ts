import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const staffRole = request.cookies.get('staff_role')?.value;
  const sessionToken = request.cookies.get('session_token')?.value;

  // 1. Admin Route Protection
  if (pathname.startsWith('/admin')) {
    const isValidAdmin = 
      staffRole === 'admin' && 
      sessionToken && 
      sessionToken.startsWith('admin_verified_');

    if (!isValidAdmin) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Waiter Route Protection
  if (pathname.startsWith('/waiter')) {
    const isValidWaiter = 
      (staffRole === 'waiter' && sessionToken && sessionToken.startsWith('waiter_verified_')) ||
      (staffRole === 'admin' && sessionToken && sessionToken.startsWith('admin_verified_'));

    if (!isValidWaiter) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/waiter/:path*'],
};