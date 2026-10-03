import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    let role: string | null = null;
    let staffName = 'Staff Member';

    // 1. Master Emergency Fallback
    if (cleanId === 'admin@restaurant.com' && cleanPass === 'admin123') {
      role = 'admin';
      staffName = 'Royal Admin';
    } else if (cleanId === '9876543210' && cleanPass === 'waiter123') {
      role = 'waiter';
      staffName = 'Floor Steward';
    } else {
      // 2. Supabase DB Lookup
      const { data: user, error } = await supabase
        .from('staff_accounts')
        .select('role, identifier, password_hash, name')
        .eq('identifier', cleanId)
        .maybeSingle();

      if (!error && user && user.password_hash === cleanPass) {
        role = user.role?.toLowerCase();
        staffName = user.name || (role === 'admin' ? 'Admin' : 'Waiter');
      }
    }

    if (!role) {
      return NextResponse.json(
        { error: 'Invalid credentials. Please verify your details.' },
        { status: 401 }
      );
    }

    // 3. Response payload
    const response = NextResponse.json({
      success: true,
      role,
      name: staffName
    });

    // Client-accessible cookie for Frontend Route Guards
    response.cookies.set('staff_role', role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 Hours
    });

    // Extra httpOnly verified session token
    response.cookies.set('session_token', `${role}_verified_${Date.now()}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Server authentication encountered an unexpected error.' },
      { status: 500 }
    );
  }
}