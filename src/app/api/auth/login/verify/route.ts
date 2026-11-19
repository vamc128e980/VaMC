import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabase } from '@/lib/supabase';

// ======================================================
// CONFIGURATION
// ======================================================

const SESSION_COOKIE = 'session_token';
const ROLE_COOKIE = 'staff_role';

const SESSION_ISSUER = 'vamc';
const SESSION_AUDIENCE = 'vamc-web';
const SESSION_VERSION = 1;

const SESSION_DURATION = 24 * 60 * 60;
const CLOCK_TOLERANCE = 60;
const MAX_TOKEN_LENGTH = 4096;
const MAX_BODY_SIZE = 8192;

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

// ======================================================
// ENVIRONMENT VALIDATION
// ======================================================

function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return null;
  }
  return secret;
}

// ======================================================
// SESSION TOKEN GENERATION & VERIFICATION
// ======================================================

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

// ======================================================
// COOKIE & RESPONSE HELPERS
// ======================================================

function setSessionCookies(
  response: NextResponse,
  token: string,
  role: UserRole,
) {
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  });

  response.cookies.set(ROLE_COOKIE, role, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  });
}

function clearSessionCookies(response: NextResponse) {
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set(ROLE_COOKIE, '', {
    httpOnly: false,
    secure: isProduction,
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

function buildLogoutResponse() {
  const response = jsonResponse({
    success: true,
    authenticated: false,
    message: 'Logged out successfully.',
  });
  clearSessionCookies(response);
  return response;
}

// ======================================================
// POST: STAFF LOGIN (OR LOGOUT WHEN action === 'logout')
// ======================================================

export async function POST(request: NextRequest) {
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
      return buildLogoutResponse();
    }

    const secret = getSessionSecret();
    if (!secret) {
      return jsonResponse(
        { error: 'Server session configuration is missing.' },
        500,
      );
    }

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
      .eq('role', targetRole);

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
      user.is_active === false ||
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
    });

    setSessionCookies(response, token, targetRole);
    return response;
  } catch {
    return jsonResponse(
      { error: 'Unable to complete authentication.' },
      500,
    );
  }
}

// ======================================================
// GET: VERIFY ACTIVE SESSION
// ======================================================

export async function GET(request: NextRequest) {
  try {
    const secret = getSessionSecret();
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = secret ? verifySessionToken(token, secret) : null;

    if (!session) {
      const response = jsonResponse({ authenticated: false }, 401);
      clearSessionCookies(response);
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

// ======================================================
// DELETE: SECURE LOGOUT
// ======================================================

export async function DELETE() {
  return buildLogoutResponse();
}
