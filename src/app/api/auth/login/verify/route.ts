import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

const AUTH_SECRET = process.env.AUTH_SECRET || 'vamc-royal-secret-key-2026';

function signSession(role: string, name: string): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  const payload = `${role}|${name}|${expiresAt}`;
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

// 1. GET: Verify Active HttpOnly Session
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

// 2. POST: Login via Supabase staff_accounts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawId = body?.identifier || body?.username || body?.name || body?.waiterName || body?.loginId || '';
    const cleanId = rawId.trim().toLowerCase();
    const cleanPass = (body?.password || body?.pin || '').trim();

    if (!cleanId || !cleanPass) {
      return NextResponse.json(
        { error: 'Identifier and password are required.' },
        { status: 400 }
      );
    }

    const { data: users, error } = await supabase
      .from('staff_accounts')
      .select('role, identifier, password_hash, name');

    if (error) {
      return NextResponse.json({ error: 'Database connection error.' }, { status: 500 });
    }

    const user = users?.find(u => 
      (u.identifier || '').toLowerCase() === cleanId || 
      (u.name || '').toLowerCase() === cleanId
    );

    if (!user || user.password_hash !== cleanPass) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please verify your details.' },
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
  } catch (err) {
    return NextResponse.json({ error: 'Server authentication failed.' }, { status: 500 });
  }
}

// 3. DELETE: Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('staff_role', '', { path: '/', maxAge: 0 });
  response.cookies.set('session_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
