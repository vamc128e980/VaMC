import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth';
import { settleSessionSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['admin', 'waiter']);
  if (auth.ok === false) return auth.response;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = settleSessionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid settlement payload.' }, { status: 400 });
  }

  const { session_id, payment_mode, customer_phone, customer_name } = parsed.data;
  const supabaseAdmin = getSupabaseAdmin();

  const { data: session, error: sessionErr } = await supabaseAdmin
    .from('table_sessions')
    .select('id, table_number, status, payment_status, payment_mode, total_amount, customer_phone, customer_name')
    .eq('id', session_id)
    .maybeSingle();

  if (sessionErr) {
    return NextResponse.json(
      { error: sessionErr.message || 'Failed to load session.' },
      { status: 500 },
    );
  }
  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  if (session.status === 'completed' && session.payment_status === 'paid') {
    return NextResponse.json({
      success: true,
      alreadySettled: true,
      session,
    });
  }

  const { data: items, error: itemsErr } = await supabaseAdmin
    .from('order_items')
    .select('quantity, unit_price, is_complimentary')
    .eq('session_id', session_id);

  if (itemsErr) {
    return NextResponse.json(
      { error: itemsErr.message || 'Failed to calculate session bill.' },
      { status: 500 },
    );
  }

  const computedTotal = (items ?? []).reduce((sum, row) => {
    if (row.is_complimentary) return sum;
    return sum + Number(row.unit_price ?? 0) * Number(row.quantity ?? 0);
  }, 0);

  const finalTotal =
    computedTotal > 0 ? Number(computedTotal.toFixed(2)) : Number(session.total_amount ?? 0);

  const phone = (customer_phone || session.customer_phone || '').trim();
  const name = (customer_name || session.customer_name || '').trim() || null;

  const { data: updatedSession, error: updateErr } = await supabaseAdmin
    .from('table_sessions')
    .update({
      status: 'completed',
      payment_status: 'paid',
      payment_mode,
      total_amount: finalTotal,
      customer_phone: phone || null,
      customer_name: name,
      settled_at: new Date().toISOString(),
    })
    .eq('id', session_id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json(
      { error: updateErr.message || 'Failed to settle session.' },
      { status: 500 },
    );
  }

  if (phone) {
    const todayIso = new Date().toISOString().slice(0, 10);
    const { data: existingLoyalty } = await supabaseAdmin
      .from('customer_loyalty')
      .select('id, phone, successful_visits, last_visit_date, rewards_claimed')
      .eq('phone', phone)
      .maybeSingle();

    if (existingLoyalty) {
      await supabaseAdmin
        .from('customer_loyalty')
        .update({
          successful_visits: Number(existingLoyalty.successful_visits ?? 0) + 1,
          last_visit_date: todayIso,
        })
        .eq('id', existingLoyalty.id);
    } else {
      await supabaseAdmin.from('customer_loyalty').insert({
        phone,
        successful_visits: 1,
        last_visit_date: todayIso,
        rewards_claimed: 0,
      });
    }
  }

  return NextResponse.json({
    success: true,
    alreadySettled: false,
    session: updatedSession,
  });
}
