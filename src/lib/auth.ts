import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const SESSION_COOKIE = 'session_token';
export const ROLE_COOKIE = 'staff_role';

export const SESSION_ISSUER = 'vamc';
export const SESSION_AUDIENCE = 'vamc-web';
export const SESSION_SCHEMA_VERSION = 1;

export const SESSION_DURATION = 24 * 60 * 60; // 24 hours
export const CLOCK_TOLERANCE = 60;
export const MAX_TOKEN_LENGTH = 4096;

export type UserRole = 'admin' | 'waiter';

export interface SessionPayload {
  sub: string;
  role: UserRole;
  sv: number;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  v: number;
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET environment variable must be set and at least 32 characters long.',
    );
  }
  return secret;
}

export function isHttpsRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim() === 'https';
  }
  return request.nextUrl.protocol === 'https:';
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 128);
  return 'unknown';
}

export function hashPasswordScrypt(plainPassword: string): string {
  const clean = plainPassword.trim();
  if (!clean) {
    throw new Error('Password cannot be empty.');
  }
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(clean, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPasswordScrypt(
  plainPassword: string,
  storedHash: string,
): boolean {
  const cleanPass = plainPassword.trim();
  const trimmedStored = storedHash.trim();
  if (!cleanPass || !trimmedStored) {
    return false;
  }

  const parts = trimmedStored.split(':');
  if (parts.length === 3 && parts[0] === 'scrypt') {
    const [, salt, expectedHex] = parts;
    if (!salt || !expectedHex || expectedHex.length % 2 !== 0) {
      return false;
    }

    const expectedKey = Buffer.from(expectedHex, 'hex');
    if (expectedKey.length === 0) {
      return false;
    }

    const derivedKey = scryptSync(cleanPass, salt, expectedKey.length);
    return (
      derivedKey.length === expectedKey.length &&
      timingSafeEqual(derivedKey, expectedKey)
    );
  }

  return false;
}

export function createSessionToken(
  identifier: string,
  role: UserRole,
  sessionVersion: number,
  secret: string,
): string {
  const now = Math.floor(Date.now() / 1000);

  const payload: SessionPayload = {
    sub: identifier,
    role,
    sv: Number.isInteger(sessionVersion) && sessionVersion > 0 ? sessionVersion : 1,
    iat: now,
    exp: now + SESSION_DURATION,
    iss: SESSION_ISSUER,
    aud: SESSION_AUDIENCE,
    v: SESSION_SCHEMA_VERSION,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifySessionTokenStructure(
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
    const actualSignature = Buffer.from(providedSignature, 'base64url');

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
      !Number.isSafeInteger(payload.sv) ||
      payload.sv < 1 ||
      !Number.isSafeInteger(payload.iat) ||
      !Number.isSafeInteger(payload.exp) ||
      payload.iss !== SESSION_ISSUER ||
      payload.aud !== SESSION_AUDIENCE ||
      payload.v !== SESSION_SCHEMA_VERSION ||
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

export interface VerifiedStaffSession {
  id: number;
  identifier: string;
  name: string;
  role: UserRole;
  sessionVersion: number;
  expiresAt: number;
}

export async function getVerifiedSession(
  request: NextRequest,
): Promise<VerifiedStaffSession | null> {
  const secret = getSessionSecret();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = verifySessionTokenStructure(token, secret);
  if (!payload) {
    return null;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: account, error } = await supabaseAdmin
    .from('staff_accounts')
    .select('id, identifier, name, role, is_active, session_version, locked_until')
    .eq('identifier', payload.sub)
    .eq('role', payload.role)
    .maybeSingle();

  if (error || !account || account.is_active === false) {
    return null;
  }

  const dbVersion = Number(account.session_version ?? 1);
  if (dbVersion !== payload.sv) {
    return null;
  }

  if (account.locked_until && new Date(account.locked_until).getTime() > Date.now()) {
    return null;
  }

  return {
    id: account.id,
    identifier: account.identifier,
    name: account.name || (payload.role === 'admin' ? 'Master Admin' : 'Floor Steward'),
    role: payload.role,
    sessionVersion: dbVersion,
    expiresAt: payload.exp,
  };
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[],
): Promise<
  | { ok: true; session: VerifiedStaffSession }
  | { ok: false; response: NextResponse }
> {
  try {
    const session = await getVerifiedSession(request);
    if (!session) {
      const res = NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
        { status: 401 },
      );
      res.headers.set('Cache-Control', 'no-store, private');
      clearSessionCookies(res, isHttpsRequest(request));
      return { ok: false, response: res };
    }

    if (!allowedRoles.includes(session.role)) {
      const res = NextResponse.json(
        { error: 'Forbidden. Insufficient permissions.' },
        { status: 403 },
      );
      res.headers.set('Cache-Control', 'no-store, private');
      return { ok: false, response: res };
    }

    return { ok: true, session };
  } catch (err) {
    console.error('Auth verification failure:', err);
    const res = NextResponse.json(
      { error: 'Authentication service misconfigured.' },
      { status: 500 },
    );
    res.headers.set('Cache-Control', 'no-store, private');
    return { ok: false, response: res };
  }
}

export function setSessionCookies(
  response: NextResponse,
  token: string,
  role: UserRole,
  secure: boolean,
): void {
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

export function clearSessionCookies(
  response: NextResponse,
  secure: boolean,
): void {
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

export async function checkRateLimit(
  rateKey: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date();
  const nowMs = now.getTime();

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('rate_limits')
    .select('rate_key, window_start, attempt_count')
    .eq('rate_key', rateKey)
    .maybeSingle();

  if (fetchError) {
    console.error('Rate limit read error:', fetchError.message);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (!existing) {
    await supabaseAdmin.from('rate_limits').insert({
      rate_key: rateKey,
      window_start: now.toISOString(),
      attempt_count: 1,
      updated_at: now.toISOString(),
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const windowStartMs = new Date(existing.window_start).getTime();
  const elapsedSeconds = Math.floor((nowMs - windowStartMs) / 1000);

  if (elapsedSeconds >= windowSeconds) {
    await supabaseAdmin
      .from('rate_limits')
      .update({
        window_start: now.toISOString(),
        attempt_count: 1,
        updated_at: now.toISOString(),
      })
      .eq('rate_key', rateKey);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const nextCount = Number(existing.attempt_count ?? 0) + 1;
  await supabaseAdmin
    .from('rate_limits')
    .update({
      attempt_count: nextCount,
      updated_at: now.toISOString(),
    })
    .eq('rate_key', rateKey);

  if (nextCount > maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, windowSeconds - elapsedSeconds),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export async function resetRateLimit(rateKey: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.from('rate_limits').delete().eq('rate_key', rateKey);
}
