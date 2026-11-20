import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireRole } from '@/lib/auth';
import { inventoryAdjustmentSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['admin']);
  if (auth.ok === false) return auth.response;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = inventoryAdjustmentSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid inventory payload.' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const payload = parsed.data;

  if (payload.purchase_qty && payload.purchase_qty > 0) {
    const unitCost = Number(payload.unit_cost ?? 0);
    const totalCost = Number((payload.purchase_qty * unitCost).toFixed(2));

    if (payload.kind === 'df') {
      const { error: pErr } = await supabaseAdmin.from('df_purchases').insert({
        item_id: payload.item_id,
        quantity: payload.purchase_qty,
        cost_price: unitCost,
        total_cost: totalCost,
        notes: payload.notes ?? null,
      });
      if (pErr) {
        return NextResponse.json({ error: 'Failed to log DF purchase.' }, { status: 500 });
      }
    } else if (payload.kind === 'ice_cream') {
      const { error: pErr } = await supabaseAdmin.from('ice_cream_purchases').insert({
        item_id: payload.item_id,
        quantity: payload.purchase_qty,
        cost_price: unitCost,
        total_cost: totalCost,
        notes: payload.notes ?? null,
      });
      if (pErr) {
        return NextResponse.json({ error: 'Failed to log ice cream purchase.' }, { status: 500 });
      }
    }
  }

  const delta = payload.delta ?? payload.purchase_qty ?? 0;
  if (delta !== 0) {
    const { error: rpcErr } = await supabaseAdmin.rpc('adjust_inventory_stock', {
      p_table:
        payload.kind === 'vamc'
          ? 'vamc_menu_items'
          : payload.kind === 'ice_cream'
            ? 'ice_cream_menu_items'
            : 'df_menu_items',
      p_item_id: String(payload.item_id),
      p_delta: delta,
    });

    if (rpcErr) {
      return NextResponse.json(
        { error: rpcErr.message || 'Stock adjustment failed.' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ success: true });
}
