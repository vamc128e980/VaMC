import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const staffRole = request.cookies.get('staff_role')?.value;

  // 1. Admin Route Protection
  if (pathname.startsWith('/admin')) {
    if (staffRole !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. Waiter Route Protection
  if (pathname.startsWith('/waiter')) {
    if (staffRole !== 'waiter' && staffRole !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/waiter/:path*'],
};