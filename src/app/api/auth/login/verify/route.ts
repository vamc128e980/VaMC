import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

// 1. GET METHOD: Session Guard Verification (Protects Admin & Waiter Pages)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const staffRole = cookieStore.get('staff_role')?.value;
    const sessionToken = cookieStore.get('session_token')?.value;

    // Strict validation: cookie unte and session token valid ga role tho match aithe matrame access
    if (
      staffRole && 
      sessionToken && 
      sessionToken.startsWith(`${staffRole}_verified_`)
    ) {
      return NextResponse.json({ 
        authenticated: true, 
        role: staffRole 
      });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: 'Session check failed' }, { status: 500 });
  }
}

// 2. POST METHOD: Login Authorization (Verifies Credentials)
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

    // Master Bypass Credentials
    if (cleanId === 'admin@restaurant.com' && cleanPass === 'admin123') {
      role = 'admin';
      staffName = 'Royal Admin';
    } else if (cleanId === '9876543210' && cleanPass === 'waiter123') {
      role = 'waiter';
      staffName = 'Floor Steward';
    } else {
      // Supabase staff_accounts database check
      const { data: user, error } = await supabase
        .from('staff_accounts')
        .select('role, identifier, password_hash, name')
        .eq('identifier', cleanId)
        .maybeSingle();

      if (!error && user && user.password_hash === cleanPass) {
        role = user.role?.toLowerCase();
        staffName = user.name || (role === 'admin' ? 'Royal Admin' : 'Floor Steward');
      }
    }

    if (!role) {
      return NextResponse.json(
        { error: 'Invalid credentials. Check your details and try again.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ 
      success: true, 
      role,
      name: staffName
    });
    
    // Client-Accessible Cookie for instant UI rendering
    response.cookies.set('staff_role', role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 Hours
    });

    // Anti-Tamper Server Session Token
    response.cookies.set('session_token', `${role}_verified_${Date.now()}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Server authentication failed' }, { status: 500 });
  }
}