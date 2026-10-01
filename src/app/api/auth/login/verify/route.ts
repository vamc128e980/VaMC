import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // 1. Direct Server-Side Master Bypass (Client inspect lo idi eppatiki kanipinchadhu)
    let role = null;
    if (cleanId === 'admin@restaurant.com' && cleanPass === 'admin123') {
      role = 'admin';
    } else if (cleanId === '9876543210' && cleanPass === 'waiter123') {
      role = 'waiter';
    } else {
      // 2. Database Lookup
      const { data: user, error } = await supabase
        .from('staff_accounts')
        .select('role, identifier, password_hash')
        .eq('identifier', cleanId)
        .single();

      if (!error && user && user.password_hash === cleanPass) {
        role = user.role;
      }
    }

    if (!role) {
      return NextResponse.json(
        { error: 'Invalid credentials. Check your details and try again.' },
        { status: 401 }
      );
    }

    // 3. Response with Anti-Tamper httpOnly Cookie (Browser JS / Inspect deenini access cheyaledhu)
    const response = NextResponse.json({ success: true, role });
    
    response.cookies.set('staff_role', role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 Hours
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Server authentication failed' }, { status: 500 });
  }
}