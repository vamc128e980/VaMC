import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'session_token';
const ROLE_COOKIE = 'staff_role';

const SESSION_ISSUER = 'vamc';
const SESSION_AUDIENCE = 'vamc-web';
const SESSION_SCHEMA_VERSION = 1;

const MAX_TOKEN_LENGTH = 4096;
const MAX_SESSION_AGE = 24 * 60 * 60;
const CLOCK_TOLERANCE = 60;

type UserRole = 'admin' | 'waiter';

interface SessionPayload {
  sub: string;
  role: UserRole;
  sv: number;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  v: number;
}

let cachedCspHeader: string | null = null;

function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    return null;
  }
  return secret;
}

function isHttpsRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim() === 'https';
  }
  return request.nextUrl.protocol === 'https:';
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('Invalid base64url');
  }

  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);

  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeUtf8(value: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(value);
  const buffer = new ArrayBuffer(encoded.byteLength);
  const copy = new Uint8Array(buffer);
  copy.set(encoded);
  return copy;
}

async function verifySessionCrypto(
  token?: string,
): Promise<SessionPayload | null> {
  try {
    const secret = getSessionSecret();
    if (!secret || !token || token.length > MAX_TOKEN_LENGTH) {
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
      !Number.isSafeInteger(payload.sv) ||
      payload.sv < 1 ||
      !Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      payload.iss !== SESSION_ISSUER ||
      payload.aud !== SESSION_AUDIENCE ||
      payload.v !== SESSION_SCHEMA_VERSION
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
      encodeUtf8(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encodeUtf8(encodedPayload),
    );

    return valid ? payload : null;
  } catch {
    return null;
  }
}

async function verifySessionVersion(
  payload: SessionPayload,
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceKey) {
    return false;
  }

  try {
    const queryUrl = new URL('/rest/v1/staff_accounts', supabaseUrl);
    queryUrl.searchParams.set(
      'select',
      'session_version,is_active,locked_until',
    );
    queryUrl.searchParams.set('identifier', `eq.${payload.sub}`);
    queryUrl.searchParams.set('role', `eq.${payload.role}`);
    queryUrl.searchParams.set('limit', '1');

    const res = await fetch(queryUrl.toString(), {
      method: 'GET',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return false;
    }

    const rows = (await res.json()) as Array<{
      session_version?: number;
      is_active?: boolean;
      locked_until?: string | null;
    }>;

    const account = rows?.[0];
    if (!account || account.is_active === false) {
      return false;
    }

    if (
      account.locked_until &&
      new Date(account.locked_until).getTime() > Date.now()
    ) {
      return false;
    }

    const dbVersion = Number(account.session_version ?? 1);
    return dbVersion === payload.sv;
  } catch {
    return false;
  }
}

function getCspHeader(): string {
  if (cachedCspHeader) {
    return cachedCspHeader;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  let supabaseOrigin = '';
  let supabaseWsOrigin = '';

  try {
    if (supabaseUrl) {
      const parsed = new URL(supabaseUrl);
      supabaseOrigin = parsed.origin;
      supabaseWsOrigin = parsed.origin.replace(/^http/, 'ws');
    }
  } catch {
    supabaseOrigin = '';
    supabaseWsOrigin = '';
  }

  const connectSources = ["'self'", supabaseOrigin, supabaseWsOrigin]
    .filter(Boolean)
    .join(' ');

  cachedCspHeader = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: ${supabaseOrigin}`.trim(),
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "worker-src 'self' blob:",
    'upgrade-insecure-requests',
  ].join('; ');

  return cachedCspHeader;
}

function applySecurityHeaders(
  response: NextResponse,
  secure: boolean,
  isProtectedRoute: boolean,
): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  response.headers.set('Content-Security-Policy', getCspHeader());

  if (isProtectedRoute) {
    response.headers.set(
      'Cache-Control',
      'private, no-store, no-cache, must-revalidate',
    );
  }

  if (secure) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }

  return response;
}

function clearAuthCookies(response: NextResponse, secure: boolean): void {
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
  return applySecurityHeaders(response, secure, true);
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

  if (isAdminRoute || isWaiterRoute) {
    let session: SessionPayload | null = null;
    if (token) {
      const cryptoSession = await verifySessionCrypto(token);
      if (cryptoSession && (await verifySessionVersion(cryptoSession))) {
        session = cryptoSession;
      }
    }

    const isAdmin = session?.role === 'admin';
    const isWaiter = session?.role === 'waiter';

    if (isAdminRoute && !isAdmin) {
      return redirectToLogin(request, 'admin', secure);
    }

    if (isWaiterRoute && !isWaiter && !isAdmin) {
      return redirectToLogin(request, 'waiter', secure);
    }

    const response = NextResponse.next();
    return applySecurityHeaders(response, secure, true);
  }

  if (isLoginRoute && token && !searchParams.get('role')) {
    const cryptoSession = await verifySessionCrypto(token);
    if (cryptoSession) {
      const target = cryptoSession.role === 'admin' ? '/admin' : '/waiter';
      return applySecurityHeaders(
        NextResponse.redirect(new URL(target, request.url)),
        secure,
        true,
      );
    }
  }

  const response = NextResponse.next();
  if (token && isLoginRoute) {
    const valid = await verifySessionCrypto(token);
    if (!valid) {
      clearAuthCookies(response, secure);
    }
  }

  return applySecurityHeaders(response, secure, isLoginRoute);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)',
  ],
};
```[cite: 7]

GitHub lo idi commit chesi deploy chesinaka login speed ela undo choodu — inka emaina slowness unte exact ga ekkada lag avuthundo (login button click to `/admin` render varaku) cheppu!
