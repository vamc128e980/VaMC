import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { claimRewardSchema } from '@/lib/validation';

const QUALIFYING_VISITS_PER_REWARD = 5;

export async function GET(request: NextRequest) {
  const phone = (new URL(request.url).searchParams.get('phone') || '').trim();
  if (!phone) {
    return NextResponse.json({ error: 'Phone is required.' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('customer_loyalty')
    .select('phone, successful_visits, last_visit_date, rewards_claimed')
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Failed to check loyalty.' }, { status: 500 });
  }

  const visits = Number(data?.successful_visits ?? 0);
  const claimed = Number(data?.rewards_claimed ?? 0);
  const earned = Math.floor(visits / QUALIFYING_VISITS_PER_REWARD);
  const availableRewards = Math.max(0, earned - claimed);

  return NextResponse.json({
    phone,
    successful_visits: visits,
    last_visit_date: data?.last_visit_date ?? null,
    rewards_claimed: claimed,
    available_rewards: availableRewards,
  });
}

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = claimRewardSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid reward claim request.' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: loyalty, error: fetchErr } = await supabaseAdmin
    .from('customer_loyalty')
    .select('id, phone, successful_visits, rewards_claimed')
    .eq('phone', parsed.data.phone)
    .maybeSingle();

  if (fetchErr || !loyalty) {
    return NextResponse.json({ error: 'Loyalty record not found.' }, { status: 404 });
  }

  const visits = Number(loyalty.successful_visits ?? 0);
  const claimed = Number(loyalty.rewards_claimed ?? 0);
  const earned = Math.floor(visits / QUALIFYING_VISITS_PER_REWARD);

  if (claimed >= earned) {
    return NextResponse.json(
      { error: 'No unclaimed reward available for this visit count.' },
      { status: 409 },
    );
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('customer_loyalty')
    .update({ rewards_claimed: claimed + 1 })
    .eq('id', loyalty.id)
    .eq('rewards_claimed', claimed)
    .select('phone, successful_visits, rewards_claimed')
    .single();

  if (updateErr || !updated) {
    return NextResponse.json(
      { error: 'Reward claim conflict. Please retry.' },
      { status: 409 },
    );
  }

  return NextResponse.json({
    success: true,
    loyalty: updated,
    available_rewards: Math.max(0, earned - Number(updated.rewards_claimed ?? 0)),
  });
}
