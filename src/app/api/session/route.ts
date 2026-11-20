import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = (searchParams.get('sessionId') || '').trim();
  const tableParam = searchParams.get('table');
  const tableNumber = tableParam ? Number(tableParam) : NaN;

  const supabaseAdmin = getSupabaseAdmin();

  if (sessionId) {
    const { data: session, error } = await supabaseAdmin
      .from('table_sessions')
      .select('id, table_number, status, payment_status, order_pin, total_amount, created_at')
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    const { data: batches } = await supabaseAdmin
      .from('order_batches')
      .select('id, session_id, table_number, status, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('id, session_id, batch_id, menu_item_id, item_name, quantity, unit_price, is_complimentary, cooking_notes, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      session,
      batches: batches ?? [],
      items: items ?? [],
    });
  }

  if (Number.isInteger(tableNumber) && tableNumber > 0) {
    const { data: activeSession } = await supabaseAdmin
      .from('table_sessions')
      .select('id, table_number, status, payment_status, total_amount, created_at')
      .eq('table_number', tableNumber)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ session: activeSession ?? null });
  }

  return NextResponse.json({ error: 'Provide sessionId or table.' }, { status: 400 });
}
