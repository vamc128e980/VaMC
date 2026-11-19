import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'session_token';
const ROLE_COOKIE = 'staff_role';

const FALLBACK_SESSION_SECRET =
  'vamc-vujwala-simha-session-secret-key-2026-secure-hmac-sha256';

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32
    ? process.env.SESSION_SECRET
    : FALLBACK_SESSION_SECRET;

const SESSION_ISSUER = 'vamc';
const SESSION_AUDIENCE = 'vamc-web';
const SESSION_VERSION = 1;

const MAX_TOKEN_LENGTH = 4096;
const MAX_SESSION_AGE = 24 * 60 * 60;
const CLOCK_TOLERANCE = 60;

type UserRole = 'admin' | 'waiter';

interface SessionPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  v: number;
}

function isHttpsRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim() === 'https';
  }
  return request.nextUrl.protocol === 'https:';
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
      payload.iss !== SESSION_ISSUER ||
      payload.aud !== SESSION_AUDIENCE ||
      payload.v !== SESSION_VERSION
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

function applySecurityHeaders(
  response: NextResponse,
  secure: boolean,
): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
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

  if (secure) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }

  return response;
}

function clearAuthCookies(
  response: NextResponse,
  secure: boolean,
) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set(ROLE_COOKIE, '', {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
}

function redirectToLogin(
  request: NextRequest,
  role: UserRole,
  secure: boolean,
): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('role', role);

  const response = NextResponse.redirect(loginUrl);
  clearAuthCookies(response, secure);
  return applySecurityHeaders(response, secure);
}

export async function middleware(request: NextRequest) {
  const secure = isHttpsRequest(request);
  const { pathname, searchParams } = request.nextUrl;

  const isAdminRoute =
    pathname === '/admin' || pathname.startsWith('/admin/');
  const isWaiterRoute =
    pathname === '/waiter' || pathname.startsWith('/waiter/');
  const isLoginRoute = pathname === '/login';

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  const isAdmin = session?.role === 'admin';
  const isWaiter = session?.role === 'waiter';

  if (isAdminRoute && !isAdmin) {
    return redirectToLogin(request, 'admin', secure);
  }

  if (isWaiterRoute && !isWaiter && !isAdmin) {
    return redirectToLogin(request, 'waiter', secure);
  }

  if (isLoginRoute && !searchParams.get('role')) {
    if (isAdmin) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL('/admin', request.url)),
        secure,
      );
    }

    if (isWaiter) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL('/waiter', request.url)),
        secure,
      );
    }
  }

  return applySecurityHeaders(NextResponse.next(), secure);
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/waiter',
    '/waiter/:path*',
    '/login',
  ],
};
