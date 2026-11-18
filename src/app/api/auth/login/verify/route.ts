import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

const AUTH_SECRET = process.env.AUTH_SECRET || 'change-this-in-vercel-env-immediately';

function signSession(role: string, name: string): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${role}|${name}|${expiresAt}`;
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

function verifySession(token: string): { valid: boolean; role?: string; name?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [role, name, expiresAtStr, sig] = decoded.split('|');
    if (!role || !expiresAtStr || !sig) return { valid: false };
    if (Date.now() > Number(expiresAtStr)) return { valid: false };

    const expectedSig = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(`${role}|${name}|${expiresAtStr}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return { valid: false };
    }
    return { valid: true, role, name };
  } catch {
    return { valid: false };
  }
}

// 1. GET METHOD: Server-Verified Session Guard
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const check = verifySession(sessionToken);
    if (!check.valid || !check.role) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      role: check.role,
      name: check.name
    });
  } catch {
    return NextResponse.json({ authenticated: false, error: 'Session check failed' }, { status: 500 });
  }
}

// 2. POST METHOD: Secure Login Authorization
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cleanId = (body?.identifier || '').trim().toLowerCase();
    const cleanPass = (body?.password || '').trim();

    if (!cleanId || !cleanPass) {
      return NextResponse.json(
        { error: 'Identifier and password are required.' },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from('staff_accounts')
      .select('role, identifier, password_hash, name')
      .eq('identifier', cleanId)
      .maybeSingle();

    if (error || !user || !user.password_hash) {
      return NextResponse.json(
        { error: 'Invalid credentials. Check your details and try again.' },
        { status: 401 }
      );
    }

    // Supports bcrypt hashes (and legacy plaintext fallback during migration)
    const isBcrypt = user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$');
    const passwordMatches = isBcrypt
      ? await bcrypt.compare(cleanPass, user.password_hash)
      : user.password_hash === cleanPass;

    if (!passwordMatches) {
      return NextResponse.json(
        { error: 'Invalid credentials. Check your details and try again.' },
        { status: 401 }
      );
    }

    const role = user.role?.toLowerCase();
    const staffName = user.name || (role === 'admin' ? 'Royal Admin' : 'Floor Steward');
    const signedToken = signSession(role, staffName);

    const response = NextResponse.json({
      success: true,
      role,
      name: staffName
    });

    response.cookies.set('staff_role', role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    response.cookies.set('session_token', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Server authentication failed' }, { status: 500 });
  }
}

// 3. DELETE METHOD: Proper HttpOnly Cookie Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('staff_role', '', { path: '/', maxAge: 0 });
  response.cookies.set('session_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
