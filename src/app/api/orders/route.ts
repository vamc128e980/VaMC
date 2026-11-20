import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { placeOrderSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = placeOrderSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid order details.', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const supabaseAdmin = getSupabaseAdmin();

  // Verify table exists in restaurant_tables before accepting order
  const { data: tableRow, error: tableErr } = await supabaseAdmin
    .from('restaurant_tables')
    .select('table_number')
    .eq('table_number', input.table_number)
    .maybeSingle();

  if (tableErr) {
    return NextResponse.json({ error: 'Unable to verify table.' }, { status: 500 });
  }
  if (!tableRow) {
    return NextResponse.json({ error: 'Table does not exist.' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin.rpc('place_order_atomic', {
    p_table_number: input.table_number,
    p_session_id: input.session_id ?? null,
    p_source: input.source,
    p_customer_name: input.customer_name ?? null,
    p_customer_phone: input.customer_phone ?? null,
    p_items: input.items,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to place order.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, order: data }, { status: 201 });
}
