import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabase } from '@/lib/supabase';

const SESSION_COOKIE = 'session_token';
const ROLE_COOKIE = 'staff_role';

const SESSION_ISSUER = 'vamc';
const SESSION_AUDIENCE = 'vamc-web';
const SESSION_VERSION = 1;

const SESSION_DURATION = 24 * 60 * 60;
const CLOCK_TOLERANCE = 60;
const MAX_TOKEN_LENGTH = 4096;
const MAX_BODY_SIZE = 8192;

const FALLBACK_SESSION_SECRET =
  'vamc-vujwala-simha-session-secret-key-2026-secure-hmac-sha256';

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

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  return FALLBACK_SESSION_SECRET;
}

function isHttpsRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim() === 'https';
  }
  return request.nextUrl.protocol === 'https:';
}

function createSessionToken(
  identifier: string,
  role: UserRole,
  secret: string,
): string {
  const now = Math.floor(Date.now() / 1000);

  const payload: SessionPayload = {
    sub: identifier,
    role,
    iat: now,
    exp: now + SESSION_DURATION,
    iss: SESSION_ISSUER,
    aud: SESSION_AUDIENCE,
    v: SESSION_VERSION,
  };

  const encodedPayload = Buffer
    .from(JSON.stringify(payload))
    .toString('base64url');

  const signature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(
  token: string | undefined,
  secret: string,
): SessionPayload | null {
  try {
    if (!token || token.length > MAX_TOKEN_LENGTH) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [encodedPayload, providedSignature] = parts;
    if (!encodedPayload || !providedSignature) {
      return null;
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(encodedPayload)
      .digest();

    const actualSignature = Buffer.from(
      providedSignature,
      'base64url',
    );

    if (
      actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as SessionPayload;

    const now = Math.floor(Date.now() / 1000);

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
      payload.v !== SESSION_VERSION ||
      payload.iat > now + CLOCK_TOLERANCE ||
      payload.exp <= now ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > SESSION_DURATION
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function setSessionCookies(
  response: NextResponse,
  token: string,
  role: UserRole,
  secure: boolean,
) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  });

  response.cookies.set(ROLE_COOKIE, role, {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  });
}

function clearSessionCookies(
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

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
) {
  const response = NextResponse.json(data, { status });
  response.headers.set('Cache-Control', 'no-store, private');
  return response;
}

function buildLogoutResponse(secure: boolean) {
  const response = jsonResponse({
    success: true,
    authenticated: false,
    message: 'Logged out successfully.',
  });
  clearSessionCookies(response, secure);
  return response;
}

export async function POST(request: NextRequest) {
  const secure = isHttpsRequest(request);

  try {
    const contentLength = Number(
      request.headers.get('content-length') || 0,
    );

    if (
      contentLength > MAX_BODY_SIZE ||
      !request.headers.get('content-type')?.includes('application/json')
    ) {
      return jsonResponse({ error: 'Invalid request.' }, 400);
    }

    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return jsonResponse({ error: 'Invalid request data.' }, 400);
    }

    if ((body as { action?: unknown }).action === 'logout') {
      return buildLogoutResponse(secure);
    }

    const secret = getSessionSecret();
    const rawBody = body as Record<string, unknown>;

    const rawIdentifier =
      rawBody.identifier ||
      rawBody.username ||
      rawBody.name ||
      rawBody.waiterName ||
      rawBody.loginId ||
      '';

    const rawPassword = rawBody.password || rawBody.pin || '';
    const requestedRole = rawBody.role;

    if (
      typeof rawIdentifier !== 'string' ||
      typeof rawPassword !== 'string' ||
      typeof requestedRole !== 'string'
    ) {
      return jsonResponse({ error: 'Invalid login details.' }, 400);
    }

    const identifier = rawIdentifier.trim().toLowerCase();
    const password = rawPassword.trim();

    if (
      !identifier ||
      !password ||
      identifier.length > 256 ||
      password.length > 1024 ||
      !['admin', 'waiter'].includes(requestedRole)
    ) {
      return jsonResponse({ error: 'Invalid login details.' }, 400);
    }

    const targetRole = requestedRole as UserRole;

    const { data: users, error } = await supabase
      .from('staff_accounts')
      .select('role, identifier, password_hash, name, is_active')
      .eq('role', targetRole)
      .neq('is_active', false);

    if (error || !users) {
      return jsonResponse(
        { error: 'Authentication service unavailable.' },
        503,
      );
    }

    const user = users.find((account) => {
      const accountIdentifier = String(account.identifier || '')
        .trim()
        .toLowerCase();
      const accountName = String(account.name || '')
        .trim()
        .toLowerCase();

      return accountIdentifier === identifier || accountName === identifier;
    });

    if (
      !user ||
      typeof user.password_hash !== 'string' ||
      user.password_hash !== password
    ) {
      return jsonResponse(
        { error: 'Invalid credentials. Please verify your details.' },
        401,
      );
    }

    const sessionIdentifier = String(user.identifier || identifier)
      .trim()
      .toLowerCase();

    const token = createSessionToken(sessionIdentifier, targetRole, secret);

    const staffName =
      user.name ||
      (targetRole === 'admin' ? 'Master Admin' : 'Floor Steward');

    const response = jsonResponse({
      success: true,
      authenticated: true,
      role: targetRole,
      name: staffName,
      token,
    });

    setSessionCookies(response, token, targetRole, secure);
    return response;
  } catch {
    return jsonResponse(
      { error: 'Unable to complete authentication.' },
      500,
    );
  }
}

export async function GET(request: NextRequest) {
  const secure = isHttpsRequest(request);

  try {
    const secret = getSessionSecret();
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = verifySessionToken(token, secret);

    if (!session) {
      const response = jsonResponse({ authenticated: false }, 401);
      clearSessionCookies(response, secure);
      return response;
    }

    return jsonResponse({
      authenticated: true,
      role: session.role,
      identifier: session.sub,
      expiresAt: session.exp,
    });
  } catch {
    return jsonResponse({ authenticated: false }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  return buildLogoutResponse(isHttpsRequest(request));
}
```[cite: 16]

---

### 2. `src/middleware.ts`
```ts
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

function securityHeaders(
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

function loginRedirect(
  request: NextRequest,
  role: UserRole,
  secure: boolean,
): NextResponse {
  const url = new URL('/login', request.url);
  url.searchParams.set('role', role);

  const response = NextResponse.redirect(url);
  clearAuthCookies(response, secure);

  return securityHeaders(response, secure);
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
    return loginRedirect(request, 'admin', secure);
  }

  if (isWaiterRoute && !isWaiter && !isAdmin) {
    return loginRedirect(request, 'waiter', secure);
  }

  if (isLoginRoute) {
    const requestedRole = searchParams.get('role');

    if (
      requestedRole !== 'admin' &&
      requestedRole !== 'waiter'
    ) {
      if (isAdmin) {
        return securityHeaders(
          NextResponse.redirect(new URL('/admin', request.url)),
          secure,
        );
      }

      if (isWaiter) {
        return securityHeaders(
          NextResponse.redirect(new URL('/waiter', request.url)),
          secure,
        );
      }
    }
  }

  return securityHeaders(NextResponse.next(), secure);
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
