import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase-server';

function isAuthorizedCron(request: NextRequest): boolean {
  const expectedSecret = (process.env.CRON_SECRET || '').trim();
  if (!expectedSecret) return false;

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return false;

  const a = Buffer.from(token);
  const b = Buffer.from(expectedSecret);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.rpc('run_system_cleanup', {
    p_stale_session_hours: 18,
    p_stale_call_hours: 6,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Cleanup failed.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, cleanup: data });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
