import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  clearSessionCookies,
  createSessionToken,
  hashPasswordScrypt,
  isHttpsRequest,
  requireRole,
  setSessionCookies,
  verifyPasswordScrypt,
  getSessionSecret,
} from '@/lib/auth';

function jsonNoStore(data: Record<string, unknown>, status = 200): NextResponse {
  const res = NextResponse.json(data, { status });
  res.headers.set('Cache-Control', 'no-store, private');
  return res;
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['admin']);
  if (!auth.ok) return auth.response;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('staff_accounts')
    .select('id, identifier, name, role, is_active, created_at, updated_at')
    .eq('role', 'waiter')
    .order('id', { ascending: true });

  if (error) {
    return jsonNoStore({ error: 'Failed to load staff directory.' }, 500);
  }

  return jsonNoStore({ waiters: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['admin']);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: 'Invalid JSON payload.' }, 400);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const identifier =
    typeof body.identifier === 'string' ? body.identifier.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password.trim() : '';

  if (!name || name.length > 100) {
    return jsonNoStore({ error: 'Valid staff name is required.' }, 400);
  }
  if (!identifier || identifier.length > 128) {
    return jsonNoStore({ error: 'Valid login ID is required.' }, 400);
  }
  if (!password || password.length < 4 || password.length > 128) {
    return jsonNoStore({ error: 'PIN / password must be at least 4 characters.' }, 400);
  }

  const supabaseAdmin = getSupabaseAdmin();
  const passwordHash = hashPasswordScrypt(password);

  const { data, error } = await supabaseAdmin
    .from('staff_accounts')
    .insert({
      name,
      role: 'waiter',
      identifier,
      password_hash: passwordHash,
      is_active: true,
      session_version: 1,
      failed_attempts: 0,
      locked_until: null,
    })
    .select('id, identifier, name, role, is_active, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505' || error.message.toLowerCase().includes('unique')) {
      return jsonNoStore(
        { error: `"${identifier}" is already assigned to another account.` },
        409,
      );
    }
    return jsonNoStore({ error: 'Unable to create waiter account.' }, 500);
  }

  return jsonNoStore({ success: true, waiter: data }, 201);
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(request, ['admin']);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: 'Invalid JSON payload.' }, 400);
  }

  const scope = body.scope === 'admin_self' ? 'admin_self' : 'waiter';
  const supabaseAdmin = getSupabaseAdmin();

  if (scope === 'admin_self') {
    const currentPassword =
      typeof body.currentPassword === 'string' ? body.currentPassword.trim() : '';
    const newIdentifier =
      typeof body.identifier === 'string' ? body.identifier.trim().toLowerCase() : '';
    const newPassword =
      typeof body.newPassword === 'string' ? body.newPassword.trim() : '';

    if (!currentPassword) {
      return jsonNoStore({ error: 'Current password is required.' }, 400);
    }
    if (!newIdentifier && !newPassword) {
      return jsonNoStore({ error: 'Provide a new email/ID or new password.' }, 400);
    }
    if (newPassword && (newPassword.length < 6 || newPassword.length > 128)) {
      return jsonNoStore({ error: 'New admin password must be 6–128 characters.' }, 400);
    }

    const { data: adminRow, error: fetchErr } = await supabaseAdmin
      .from('staff_accounts')
      .select('id, identifier, name, password_hash, session_version')
      .eq('id', auth.session.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (fetchErr || !adminRow || typeof adminRow.password_hash !== 'string') {
      return jsonNoStore({ error: 'Admin account not found.' }, 404);
    }

    if (!verifyPasswordScrypt(currentPassword, adminRow.password_hash)) {
      return jsonNoStore({ error: 'Incorrect current password.' }, 401);
    }

    const nextVersion = Number(adminRow.session_version ?? 1) + 1;
    const nextIdentifier = newIdentifier || adminRow.identifier;
    const updates: Record<string, unknown> = {
      session_version: nextVersion,
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    };

    if (newIdentifier) updates.identifier = newIdentifier;
    if (newPassword) updates.password_hash = hashPasswordScrypt(newPassword);

    const { error: updateErr } = await supabaseAdmin
      .from('staff_accounts')
      .update(updates)
      .eq('id', adminRow.id);

    if (updateErr) {
      if (updateErr.code === '23505') {
        return jsonNoStore({ error: 'That email/login ID is already in use.' }, 409);
      }
      return jsonNoStore({ error: 'Failed to update admin credentials.' }, 500);
    }

    const secret = getSessionSecret();
    const refreshedToken = createSessionToken(
      nextIdentifier,
      'admin',
      nextVersion,
      secret,
    );
    const res = jsonNoStore({
      success: true,
      message: 'Admin credentials updated.',
    });
    setSessionCookies(res, refreshedToken, 'admin', isHttpsRequest(request));
    return res;
  }

  // Waiter update
  const waiterId = Number(body.id);
  if (!Number.isInteger(waiterId) || waiterId <= 0) {
    return jsonNoStore({ error: 'Valid waiter ID is required.' }, 400);
  }

  const { data: existingWaiter, error: findErr } = await supabaseAdmin
    .from('staff_accounts')
    .select('id, role, session_version')
    .eq('id', waiterId)
    .eq('role', 'waiter')
    .maybeSingle();

  if (findErr || !existingWaiter) {
    return jsonNoStore({ error: 'Waiter account not found.' }, 404);
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  let revokeSessions = false;

  if (typeof body.name === 'string') {
    const cleanName = body.name.trim();
    if (!cleanName || cleanName.length > 100) {
      return jsonNoStore({ error: 'Valid name is required.' }, 400);
    }
    updates.name = cleanName;
  }

  if (typeof body.identifier === 'string') {
    const cleanId = body.identifier.trim().toLowerCase();
    if (!cleanId || cleanId.length > 128) {
      return jsonNoStore({ error: 'Valid login ID is required.' }, 400);
    }
    updates.identifier = cleanId;
    revokeSessions = true;
  }

  if (typeof body.password === 'string') {
    const cleanPass = body.password.trim();
    if (!cleanPass || cleanPass.length < 4 || cleanPass.length > 128) {
      return jsonNoStore({ error: 'PIN / password must be at least 4 characters.' }, 400);
    }
    updates.password_hash = hashPasswordScrypt(cleanPass);
    updates.failed_attempts = 0;
    updates.locked_until = null;
    revokeSessions = true;
  }

  if (typeof body.is_active === 'boolean') {
    updates.is_active = body.is_active;
    if (!body.is_active) revokeSessions = true;
  }

  if (revokeSessions) {
    updates.session_version = Number(existingWaiter.session_version ?? 1) + 1;
  }

  const { data: updatedWaiter, error: updateError } = await supabaseAdmin
    .from('staff_accounts')
    .update(updates)
    .eq('id', waiterId)
    .select('id, identifier, name, role, is_active, created_at, updated_at')
    .single();

  if (updateError) {
    if (updateError.code === '23505') {
      return jsonNoStore({ error: 'Login ID already in use.' }, 409);
    }
    return jsonNoStore({ error: 'Failed to update waiter account.' }, 500);
  }

  return jsonNoStore({ success: true, waiter: updatedWaiter });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole(request, ['admin']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get('id');
  const waiterId = Number(idParam);

  if (!Number.isInteger(waiterId) || waiterId <= 0) {
    return jsonNoStore({ error: 'Valid waiter ID is required.' }, 400);
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('staff_accounts')
    .delete()
    .eq('id', waiterId)
    .eq('role', 'waiter');

  if (error) {
    return jsonNoStore({ error: 'Failed to delete waiter account.' }, 500);
  }

  const res = jsonNoStore({ success: true });
  if (auth.session.id === waiterId) {
    clearSessionCookies(res, isHttpsRequest(request));
  }
  return res;
}
