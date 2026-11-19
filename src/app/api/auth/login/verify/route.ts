import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { getServerDb } from '@/lib/supabaseAdmin';
import { blockedFor, recordFailure, clearFailures } from '@/lib/rateLimit';
import {
  SESSION_COOKIE,
  LEGACY_ROLE_COOKIE,
  SESSION_DURATION,
  UserRole,
  createSessionToken,
  getSessionSecret,
  verifySessionToken,
} from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_CHARS = 4096;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_ACCOUNT = 5; // per IP + identifier
const MAX_FAILS_PER_IP = 20;
const BCRYPT_COST = 12;

// Used so "unknown user" takes as long as "wrong password" (no user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

/* ----------------------------- helpers ----------------------------- */

function isHttps(request: NextRequest): boolean {
  const proto = request.headers.get('x-forwarded-proto');
  if (proto) return proto.split(',')[0].trim() === 'https';
  return request.nextUrl.protocol === 'https:';
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim().slice(0, 64);
  return request.headers.get('x-real-ip')?.slice(0, 64) || 'unknown';
}

/** Blocks cross-site POST/DELETE (CSRF). Browsers always send Origin on these. */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // non-browser clients (curl) — cookies can't be abused cross-site
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

function json(data: Record<string, unknown>, status = 200, headers?: Record<string, string>) {
  const res = NextResponse.json(data, { status, headers });
  res.headers.set('Cache-Control', 'no-store, private');
  return res;
}

function setSessionCookie(res: NextResponse, token: string, secure: boolean) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  });
  // Remove the old, JS-readable role cookie if the browser still has it.
  res.cookies.set(LEGACY_ROLE_COOKIE, '', { path: '/', maxAge: 0, expires: new Date(0) });
}

function clearSessionCookies(res: NextResponse, secure: boolean) {
  const base = { path: '/', maxAge: 0, expires: new Date(0), sameSite: 'lax' as const, secure };
  res.cookies.set(SESSION_COOKIE, '', { ...base, httpOnly: true });
  res.cookies.set(LEGACY_ROLE_COOKIE, '', { ...base, httpOnly: false });
}

function logoutResponse(secure: boolean) {
  const res = json({ success: true, authenticated: false });
  clearSessionCookies(res, secure);
  return res;
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

/**
 * Checks a password against what is stored.
 *  - bcrypt hash ("$2a$/$2b$/$2y$...")  -> normal, secure path
 *  - anything else = LEGACY PLAIN TEXT  -> compared in constant time, then upgraded to bcrypt
 */
async function checkPassword(stored: unknown, supplied: string): Promise<{ ok: boolean; legacy: boolean }> {
  if (typeof stored !== 'string' || stored.length === 0) return { ok: false, legacy: false };

  if (/^\$2[aby]\$/.test(stored)) {
    return { ok: await bcrypt.compare(supplied, stored), legacy: false };
  }
  return { ok: timingSafeEqual(sha256(stored), sha256(supplied)), legacy: true };
}

/* ------------------------------ POST ------------------------------- */
/* Login ({identifier, password, role}) or logout ({action:'logout'}) */

export async function POST(request: NextRequest) {
  const secure = process.env.NODE_ENV === 'production' || isHttps(request);

  try {
    if (!isSameOrigin(request)) return json({ error: 'Invalid request.' }, 403);
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return json({ error: 'Invalid request.' }, 400);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_CHARS) return json({ error: 'Invalid request.' }, 413);

    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      body = parsed as Record<string, unknown>;
    } catch {
      return json({ error: 'Invalid request.' }, 400);
    }

    if (body.action === 'logout') return logoutResponse(secure);

    // Fail closed if the server is not configured.
    if (!getSessionSecret()) {
      console.error('[security] SESSION_SECRET is missing or too weak (need 32+ random characters). Login disabled.');
      return json({ error: 'Login is temporarily unavailable.' }, 503);
    }

    const { identifier: rawId, password: rawPass, role: rawRole } = body;
    if (typeof rawId !== 'string' || typeof rawPass !== 'string' || typeof rawRole !== 'string') {
      return json({ error: 'Invalid login details.' }, 400);
    }

    const identifier = rawId.trim().toLowerCase();
    const password = rawPass.trim();
    if (
      !identifier ||
      !password ||
      identifier.length > 128 ||
      password.length > 128 ||
      (rawRole !== 'admin' && rawRole !== 'waiter')
    ) {
      return json({ error: 'Invalid login details.' }, 400);
    }
    const role = rawRole as UserRole;

    // Brute-force protection (per account+IP, and per IP overall).
    const ip = clientIp(request);
    const accountKey = `acct:${ip}:${role}:${identifier}`;
    const ipKey = `ip:${ip}`;
    const wait = Math.max(
      blockedFor(accountKey, MAX_FAILS_PER_ACCOUNT),
      blockedFor(ipKey, MAX_FAILS_PER_IP),
    );
    if (wait > 0) {
      return json(
        { error: `Too many failed attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` },
        429,
        { 'Retry-After': String(wait) },
      );
    }

    const { db, privileged } = getServerDb();
    const { data: users, error } = await db
      .from('staff_accounts')
      .select('id, role, identifier, password_hash, name, is_active')
      .eq('role', role);

    if (error || !users) {
      console.error('[security] staff_accounts lookup failed:', error?.message);
      return json({ error: 'Authentication service unavailable.' }, 503);
    }

    // Active accounts whose login ID or display name matches what was typed.
    const candidates = users.filter((u) => {
      if (u.is_active === false) return false;
      const id = String(u.identifier || '').trim().toLowerCase();
      const nm = String(u.name || '').trim().toLowerCase();
      return id === identifier || nm === identifier;
    });

    let matched: (typeof users)[number] | null = null;
    let matchedLegacy = false;

    if (candidates.length === 0) {
      await bcrypt.compare(password, DUMMY_HASH); // equalise timing
    } else {
      for (const candidate of candidates) {
        const result = await checkPassword(candidate.password_hash, password);
        if (result.ok) {
          matched = candidate;
          matchedLegacy = result.legacy;
          break;
        }
      }
    }

    if (!matched) {
      recordFailure(accountKey, WINDOW_MS);
      recordFailure(ipKey, WINDOW_MS);
      return json({ error: 'Invalid credentials. Please verify your details.' }, 401);
    }

    clearFailures(accountKey);

    // Silent upgrade: plain-text password -> bcrypt (needs the service-role key).
    if (matchedLegacy) {
      if (privileged) {
        const newHash = await bcrypt.hash(password, BCRYPT_COST);
        const { error: upErr } = await db
          .from('staff_accounts')
          .update({ password_hash: newHash, updated_at: new Date().toISOString() })
          .eq('id', matched.id);
        if (upErr) console.error('[security] password upgrade failed:', upErr.message);
      } else {
        console.warn('[security] plain-text password still stored for', matched.identifier, '- set SUPABASE_SERVICE_ROLE_KEY to auto-upgrade.');
      }
    }

    const sessionId = String(matched.identifier || identifier).trim().toLowerCase();
    const staffName = String(matched.name || (role === 'admin' ? 'Master Admin' : 'Floor Steward'));
    const token = await createSessionToken(sessionId, role, staffName);

    const res = json({ success: true, authenticated: true, role, name: staffName });
    setSessionCookie(res, token, secure);
    return res;
  } catch (err) {
    console.error('[security] login error:', err instanceof Error ? err.message : err);
    return json({ error: 'Unable to complete authentication.' }, 500);
  }
}

/* ------------------------------- GET ------------------------------- */
/* "Who am I?" — the pages call this instead of trusting localStorage. */

export async function GET(request: NextRequest) {
  const secure = process.env.NODE_ENV === 'production' || isHttps(request);
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const res = json({ authenticated: false }, 401);
    clearSessionCookies(res, secure);
    return res;
  }

  return json({
    authenticated: true,
    role: session.role,
    name: session.name,
    identifier: session.sub,
    expiresAt: session.exp,
  });
}

/* ------------------------------ DELETE ----------------------------- */
/* Real logout: clears the httpOnly cookie that JavaScript cannot remove. */

export async function DELETE(request: NextRequest) {
  const secure = process.env.NODE_ENV === 'production' || isHttps(request);
  if (!isSameOrigin(request)) return json({ error: 'Invalid request.' }, 403);
  return logoutResponse(secure);
}
