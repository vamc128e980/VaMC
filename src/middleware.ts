import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const staffRole = request.cookies.get('staff_role')?.value?.toLowerCase();
  const sessionToken = request.cookies.get('session_token')?.value;

  const isAdminRoute = pathname.startsWith('/admin');
  const isWaiterRoute = pathname.startsWith('/waiter');
  const isLoginRoute = pathname === '/login';

  const hasAdminAuth = staffRole === 'admin' && sessionToken && sessionToken.startsWith('admin_verified_');
  const hasWaiterAuth = (staffRole === 'waiter' || staffRole === 'admin') && sessionToken && (sessionToken.startsWith('waiter_verified_') || sessionToken.startsWith('admin_verified_'));

  // 1. Admin route protection
  if (isAdminRoute && !hasAdminAuth) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('role', 'admin');
    return NextResponse.redirect(loginUrl);
  }

  // 2. Waiter route protection
  if (isWaiterRoute && !hasWaiterAuth) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('role', 'waiter');
    return NextResponse.redirect(loginUrl);
  }

  // 3. Login page meedha unnapudu query role ki priority ivvali (auto-redirect loop aagadaniki)
  if (isLoginRoute) {
    const requestedRole = searchParams.get('role');
    // Specific role switch kosam click chesthe redirect cheyakunda login form chupinchali
    if (requestedRole) {
      return NextResponse.next();
    }

    if (hasAdminAuth) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (hasWaiterAuth) {
      return NextResponse.redirect(new URL('/waiter', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/waiter/:path*', '/login'],
};