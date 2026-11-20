import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['admin']);
  if (auth.ok === false) return auth.response;

  const envStatus = {
    supabaseUrl: Boolean((process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()),
    supabaseAnonKey: Boolean((process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()),
    supabaseServiceRoleKey: Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()),
    sessionSecret: Boolean((process.env.SESSION_SECRET || '').trim()),
    adminPasscodeSalt: Boolean((process.env.ADMIN_PASSCODE_SALT || '').trim()),
    cronSecret: Boolean((process.env.CRON_SECRET || '').trim()),
    useServerCounterSale: process.env.USE_SERVER_COUNTER_SALE === 'true',
  };

  const allCriticalReady =
    envStatus.supabaseUrl &&
    envStatus.supabaseAnonKey &&
    envStatus.supabaseServiceRoleKey &&
    envStatus.sessionSecret &&
    envStatus.cronSecret;

  return NextResponse.json(
    {
      ok: allCriticalReady,
      timestamp: new Date().toISOString(),
      environment: envStatus,
    },
    { status: allCriticalReady ? 200 : 503 },
  );
}
