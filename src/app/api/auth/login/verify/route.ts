import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  SESSION_COOKIE,
  UserRole,
  checkRateLimit,
  clearSessionCookies,
  createSessionToken,
  getClientIp,
  getSessionSecret,
  getVerifiedSession,
  isHttpsRequest,
  resetRateLimit,
  setSessionCookies,
  verifyPasswordScrypt,
} from '@/lib/auth';

const MAX_BODY_SIZE = 8192;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const ACCOUNT_COLUMNS =
  'id, role, identifier, password_hash, name, is_active, session_version, failed_attempts, locked_until';

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
  extraHeaders?: Record<string, string>,
): NextResponse {
  const response = NextResponse.json(data, { status });
  response.headers.set('Cache-Control', 'no-store, private');
  if (extraHeaders) {
    for (const [key, val] of Object.entries(extraHeaders)) {
      response.headers.set(key, val);
    }
  }
  return response;
}

function buildLogoutResponse(secure: boolean): NextResponse {
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
    const contentLength = Number(request.headers.get('content-length') || 0);
    const contentType = request.headers.get('content-type') || '';

    if (
      contentLength > MAX_BODY_SIZE ||
      !contentType.toLowerCase().includes('application/json')
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
    const supabaseAdmin = getSupabaseAdmin();

    const rawBody = body as Record<string, unknown>;
    const rawIdentifier =
      rawBody.identifier ??
      rawBody.username ??
      rawBody.name ??
      rawBody.waiterName ??
      rawBody.loginId ??
      '';
    const rawPassword = rawBody.password ?? rawBody.pin ?? '';
    const requestedRole = rawBody.role;

    if (
      typeof rawIdentifier !== 'string' ||
      typeof rawPassword !== 'string' ||
      typeof requestedRole !== 'string'
    ) {
      return jsonResponse({ error: 'Invalid login details.' }, 400);
    }

    const trimmedIdentifier = rawIdentifier.trim();
    const identifier = trimmedIdentifier.toLowerCase();
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
    const ip = getClientIp(request);
    const rateKey = `login:${targetRole}:${ip}:${identifier}`;

    // Run rate-limit check and primary account lookup in parallel
    const [rateCheck, primaryLookup] = await Promise.all([
      checkRateLimit(rateKey, 10, 300),
      supabaseAdmin
        .from('staff_accounts')
        .select(ACCOUNT_COLUMNS)
        .eq('role', targetRole)
        .eq('identifier', identifier)
        .limit(1)
        .maybeSingle(),
    ]);

    if (!rateCheck.allowed) {
      return jsonResponse(
        {
          error: `Too many login attempts. Try again in ${rateCheck.retryAfterSeconds} seconds.`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        429,
        { 'Retry-After': String(rateCheck.retryAfterSeconds) },
      );
    }

    let account = primaryLookup.data;
    let queryError = primaryLookup.error;

    // Fallback to case-insensitive name match for waiter login
    if (!queryError && !account && targetRole === 'waiter') {
      const escapedName = trimmedIdentifier.replace(/[%_\\]/g, '\\$&');
      const byName = await supabaseAdmin
        .from('staff_accounts')
        .select(ACCOUNT_COLUMNS)
        .eq('role', targetRole)
        .ilike('name', escapedName)
        .limit(1)
        .maybeSingle();
      account = byName.data;
      queryError = byName.error;
    }

    if (queryError) {
      console.error('Auth lookup error:', queryError.message);
      return jsonResponse(
        { error: 'Authentication service unavailable.' },
        503,
      );
    }

    if (!account || account.is_active === false) {
      return jsonResponse(
        { error: 'Invalid credentials. Please verify your details.' },
        401,
      );
    }

    if (account.locked_until) {
      const lockedUntilMs = new Date(account.locked_until).getTime();
      if (lockedUntilMs > Date.now()) {
        const remainingSeconds = Math.max(
          1,
          Math.ceil((lockedUntilMs - Date.now()) / 1000),
        );
        return jsonResponse(
          {
            error: `Account temporarily locked due to failed attempts. Try again in ${Math.ceil(remainingSeconds / 60)} minute(s).`,
            lockedUntil: account.locked_until,
            retryAfterSeconds: remainingSeconds,
          },
          423,
          { 'Retry-After': String(remainingSeconds) },
        );
      }
    }

    const validPassword =
      typeof account.password_hash === 'string' &&
      verifyPasswordScrypt(password, account.password_hash);

    if (!validPassword) {
      const nextAttempts = Number(account.failed_attempts ?? 0) + 1;
      const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;
      const lockExpiry = shouldLock
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
        : null;

      await supabaseAdmin
        .from('staff_accounts')
        .update({
          failed_attempts: shouldLock ? 0 : nextAttempts,
          locked_until: lockExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);

      if (shouldLock) {
        return jsonResponse(
          {
            error: `Account locked for ${LOCKOUT_MINUTES} minutes after too many failed attempts.`,
            lockedUntil: lockExpiry,
            retryAfterSeconds: LOCKOUT_MINUTES * 60,
          },
          423,
          { 'Retry-After': String(LOCKOUT_MINUTES * 60) },
        );
      }

      return jsonResponse(
        { error: 'Invalid credentials. Please verify your details.' },
        401,
      );
    }

    const hadFailures =
      Number(account.failed_attempts ?? 0) > 0 || Boolean(account.locked_until);

    // Clear lock/failure counters and rate limit in parallel
    await Promise.all([
      hadFailures
        ? supabaseAdmin
            .from('staff_accounts')
            .update({
              failed_attempts: 0,
              locked_until: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', account.id)
        : Promise.resolve(),
      resetRateLimit(rateKey),
    ]);

    const sessionIdentifier = String(account.identifier || identifier)
      .trim()
      .toLowerCase();
    const sessionVersion = Number(account.session_version ?? 1);
    const token = createSessionToken(
      sessionIdentifier,
      targetRole,
      sessionVersion,
      secret,
    );

    const staffName =
      account.name ||
      (targetRole === 'admin' ? 'Master Admin' : 'Floor Steward');

    const response = jsonResponse({
      success: true,
      authenticated: true,
      role: targetRole,
      name: staffName,
    });

    setSessionCookies(response, token, targetRole, secure);
    return response;
  } catch (err) {
    console.error('Auth POST error:', err);
    return jsonResponse(
      { error: 'Authentication service unavailable.' },
      500,
    );
  }
}

export async function GET(request: NextRequest) {
  const secure = isHttpsRequest(request);

  try {
    getSessionSecret();
    const session = await getVerifiedSession(request);

    if (!session) {
      const response = jsonResponse({ authenticated: false }, 401);
      if (request.cookies.get(SESSION_COOKIE)?.value) {
        clearSessionCookies(response, secure);
      }
      return response;
    }

    return jsonResponse({
      authenticated: true,
      role: session.role,
      identifier: session.identifier,
      name: session.name,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    console.error('Auth GET error:', err);
    return jsonResponse({ authenticated: false }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  return buildLogoutResponse(isHttpsRequest(request));
}
