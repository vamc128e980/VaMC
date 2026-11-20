import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth';
import { counterSaleSchema } from '@/lib/validation';

export async function createCounterSale(input: {
  payment_mode: 'cash' | 'upi' | 'card';
  customer_name?: string | null;
  customer_phone?: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    cooking_notes?: string | null;
    source_table?: 'vamc_menu_items' | 'ice_cream_menu_items' | 'df_menu_items';
    source_item_id?: string | number;
  }>;
}) {
  const supabaseAdmin = getSupabaseAdmin();

  const totalAmount = Number(
    input.items
      .reduce((acc, item) => acc + Number(item.unit_price) * Number(item.quantity), 0)
      .toFixed(2),
  );

  const { data: sessionRow, error: sessionErr } = await supabaseAdmin
    .from('table_sessions')
    .insert({
      table_number: 0,
      status: 'completed',
      payment_status: 'paid',
      payment_mode: input.payment_mode,
      customer_name: input.customer_name?.trim() || null,
      customer_phone: input.customer_phone?.trim() || null,
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (sessionErr || !sessionRow) {
    throw new Error(sessionErr?.message || 'Failed to create counter session');
  }

  const orderItemsPayload = input.items.map((item) => ({
    session_id: sessionRow.id,
    menu_item_id: null,
    item_name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    is_complimentary: false,
    cooking_notes: item.cooking_notes?.trim()
      ? item.cooking_notes.trim()
      : `VaMC Counter Item: ${item.name}`,
  }));

  const { data: insertedItems, error: itemsErr } = await supabaseAdmin
    .from('order_items')
    .insert(orderItemsPayload)
    .select();

  if (itemsErr) {
    throw new Error(itemsErr.message || 'Failed to insert counter order items');
  }

  return {
    session: sessionRow,
    items: insertedItems ?? [],
    total_amount: totalAmount,
  };
}

export async function POST(request: NextRequest) {
  if (process.env.USE_SERVER_COUNTER_SALE !== 'true') {
    return NextResponse.json(
      { error: 'Server counter sale route is disabled (USE_SERVER_COUNTER_SALE != true).' },
      { status: 403 },
    );
  }

  const auth = await requireRole(request, ['admin', 'waiter']);
  if (auth.ok === false) return auth.response;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = counterSaleSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid counter sale payload.' }, { status: 400 });
  }

  try {
    const result = await createCounterSale(parsed.data);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Counter sale failed.' },
      { status: 500 },
    );
  }
}
