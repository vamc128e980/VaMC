// @ts-nocheck
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, KeyRound, User, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    try {
      // 1. Supabase staff_accounts direct lookup
      const { data: user, error } = await supabase
        .from('staff_accounts')
        .select('*')
        .ilike('identifier', cleanId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!user) {
        setErrorMsg('Identifier not found in database.');
        setLoading(false);
        return;
      }

      if (user.password_hash !== cleanPass) {
        setErrorMsg('Incorrect Security Key. Try again.');
        setLoading(false);
        return;
      }

      // 2. Set Cookies & LocalStorage
      document.cookie = `staff_role=${user.role}; path=/; max-age=86400; SameSite=Lax`;
      if (typeof window !== 'undefined') {
        localStorage.setItem('staff_role', user.role);
      }

      // 3. Instant Page Redirect
      if (user.role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/waiter';
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication error.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden select-none">
      <div className="absolute top-1/3 w-[360px] h-[360px] bg-amber-500/10 rounded-full blur-[110px] pointer-events-none" />

      <div className="w-full max-w-sm p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 backdrop-blur-2xl relative z-10 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Staff Verification Portal</h1>
          <p className="text-xs text-neutral-400">
            Enter Admin Email or Waiter Mobile Number to continue
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block">
              Identifier (Email / Mobile)
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 absolute left-3.5 text-neutral-500" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@restaurant.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block">
              Security Key
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 absolute left-3.5 text-neutral-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter key"
                className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 mt-2 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : 'Authorize Access'}</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </form>
      </div>
    </main>
  );
}