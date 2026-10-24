import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { role, token, user } = await request.json();

    if (!role || !token) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, role });

    const isProd = process.env.NODE_ENV === 'production';

    // Server-level Secure Cookie Injection
    response.cookies.set('staff_role', role, {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: 'lax',
      secure: isProd,
      httpOnly: false,
    });

    response.cookies.set('session_token', token, {
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
      secure: isProd,
      httpOnly: false,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server cookie error' }, { status: 500 });
  }
}