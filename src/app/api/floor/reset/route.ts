import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth';
import { floorResetSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['admin', 'waiter']);
  if (auth.ok === false) return auth.response;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = floorResetSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid floor reset payload.' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { table_number, session_id } = parsed.data;

  if (!table_number && !session_id) {
    return NextResponse.json(
      { error: 'Provide table_number or session_id.' },
      { status: 400 },
    );
  }

  let query = supabaseAdmin
    .from('table_sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('status', 'active');

  if (session_id) {
    query = query.eq('id', session_id);
  } else if (table_number) {
    query = query.eq('table_number', table_number);
  }

  const { data, error } = await query.select();
  if (error) {
    return NextResponse.json({ error: 'Failed to reset table session.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, resetSessions: data ?? [] });
}
