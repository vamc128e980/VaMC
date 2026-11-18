
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'session_token';
const SESSION_SECRET = process.env.SESSION_SECRET;

const MAX_TOKEN_LENGTH = 4096;
const MAX_SESSION_AGE = 24 * 60 * 60;
const CLOCK_TOLERANCE = 60;

type UserRole = 'admin' | 'waiter';

interface SessionPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
  iss: 'vamc';
  aud: 'vamc-web';
  v: 1;
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('Invalid base64url');
  }

  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padded = base64.padEnd(
    Math.ceil(base64.length / 4) * 4,
    '=',
  );

  const binary = atob(padded);

  return Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0),
  );
}

async function verifySession(
  token?: string,
): Promise<SessionPayload | null> {
  try {
    if (
      !token ||
      token.length > MAX_TOKEN_LENGTH ||
      !SESSION_SECRET ||
      SESSION_SECRET.length < 32
    ) {
      return null;
    }

    const parts = token.split('.');

    if (parts.length !== 2) {
      return null;
    }

    const [encodedPayload, encodedSignature] = parts;

    if (!encodedPayload || !encodedSignature) {
      return null;
    }

    const payloadBytes = decodeBase64Url(encodedPayload);
    const signatureBytes = decodeBase64Url(encodedSignature);

    const payload = JSON.parse(
      new TextDecoder().decode(payloadBytes),
    ) as SessionPayload;

    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      payload.sub.length > 256 ||
      !['admin', 'waiter'].includes(payload.role) ||
      !Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      payload.iss !== 'vamc' ||
      payload.aud !== 'vamc-web' ||
      payload.v !== 1
    ) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);

    if (
      payload.iat > now + CLOCK_TOLERANCE ||
      payload.exp <= now ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > MAX_SESSION_AGE
    ) {
      return null;
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SESSION_SECRET),
      {
        name: 'HMAC',
        hash: 'SHA-256',
      },
      false,
      ['verify'],
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(encodedPayload),
    );

    return valid ? payload : null;
  } catch {
    return null;
  }
}

function securityHeaders(
  response: NextResponse,
): NextResponse {
  response.headers.set(
    'X-Content-Type-Options',
    'nosniff',
  );

  response.headers.set(
    'X-Frame-Options',
    'SAMEORIGIN',
  );

  response.headers.set(
    'Referrer-Policy',
    'strict-origin-when-cross-origin',
  );

  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );

  response.headers.set(
    'Cache-Control',
    'private, no-store, no-cache, must-revalidate',
  );

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }

  return response;
}

function loginRedirect(
  request: NextRequest,
  role: UserRole,
): NextResponse {
  const url = new URL('/login', request.url);

  url.searchParams.set('role', role);

  const response = NextResponse.redirect(url);

  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('staff_role', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return securityHeaders(response);
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const isAdminRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/');

  const isWaiterRoute =
    pathname === '/waiter' ||
    pathname.startsWith('/waiter/');

  const isLoginRoute = pathname === '/login';

  const token = request.cookies.get(
    SESSION_COOKIE,
  )?.value;

  const session = await verifySession(token);

  const isAdmin = session?.role === 'admin';
  const isWaiter = session?.role === 'waiter';

  if (isAdminRoute && !isAdmin) {
    return loginRedirect(request, 'admin');
  }

  if (isWaiterRoute && !isWaiter && !isAdmin) {
    return loginRedirect(request, 'waiter');
  }

  if (isLoginRoute) {
    const requestedRole = searchParams.get('role');

    if (
      requestedRole !== 'admin' &&
      requestedRole !== 'waiter'
    ) {
      if (isAdmin) {
        return securityHeaders(
          NextResponse.redirect(
            new URL('/admin', request.url),
          ),
        );
      }

      if (isWaiter) {
        return securityHeaders(
          NextResponse.redirect(
            new URL('/waiter', request.url),
          ),
        );
      }
    }
  }

  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/waiter/:path*',
    '/login',
  ],
};
