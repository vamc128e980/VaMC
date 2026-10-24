// @ts-nocheck
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, KeyRound, User, ArrowRight, AlertCircle, ChefHat } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [loginRole, setLoginRole] = useState<'admin' | 'waiter'>('admin');
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
      // 1. Supabase staff_accounts direct lookup tawa ina reeni role cuɓaaɗo oo
      const { data: user, error } = await supabase
        .from('staff_accounts')
        .select('*')
        .ilike('identifier', cleanId)
        .eq('role', loginRole)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!user) {
        setErrorMsg(
          loginRole === 'admin' 
            ? 'Admin account alaa e nder doosgal ngal (check email).' 
            : 'Waiter account alaa e nder doosgal ngal (check ID/Mobile).'
        );
        setLoading(false);
        return;
      }

      if (user.password_hash !== cleanPass) {
        setErrorMsg('Finnde (Security Key) ndee fawaaki no haanirta.');
        setLoading(false);
        return;
      }

      // 2. Resde Cookies & LocalStorage
      const token = `${user.role}_verified_${Date.now()}`;
      document.cookie = `staff_role=${user.role}; path=/; max-age=86400; SameSite=Lax`;
      if (typeof window !== 'undefined') {
        localStorage.setItem('staff_role', user.role);
        localStorage.setItem('session_token', token);
        if (user.role === 'admin') {
          localStorage.setItem('admin_session', JSON.stringify(user));
        } else {
          localStorage.setItem('waiter_session', JSON.stringify(user));
        }
      }

      // 3. Jahgol laawol
      if (user.role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/waiter';
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Juumre heɓiima e naatgol ngol.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden select-none font-mono">
      {/* Jayngol seraaji */}
      <div 
        className={`absolute top-1/3 w-[360px] h-[360px] rounded-full blur-[110px] pointer-events-none transition-colors duration-500 ${
          loginRole === 'admin' ? 'bg-amber-500/10' : 'bg-cyan-500/10'
        }`} 
      />

      <div className="w-full max-w-sm p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 backdrop-blur-2xl relative z-10 shadow-2xl">
        {/* Butoŋaaji ceertuɗi hakkunde Admin e Waiter */}
        <div className="flex p-1 bg-black/60 border border-white/10 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setLoginRole('admin');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
              loginRole === 'admin'
                ? 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginRole('waiter');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
              loginRole === 'waiter'
                ? 'bg-gradient-to-r from-cyan-400 to-teal-500 text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Waiter Login</span>
          </button>
        </div>

        {/* Hoore portal oo */}
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <div 
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-lg transition-colors ${
              loginRole === 'admin' 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                : 'bg-cyan-500/10 border-cyan-400/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
            }`}
          >
            {loginRole === 'admin' ? <Shield className="w-6 h-6" /> : <ChefHat className="w-6 h-6" />}
          </div>
          <h1 className="text-lg font-black tracking-wider uppercase text-white">
            {loginRole === 'admin' ? 'Owner / Admin Portal' : 'Floor Waiter Terminal'}
          </h1>
          <p className="text-[11px] text-neutral-400 font-sans">
            {loginRole === 'admin' 
              ? 'Naatnu Email maa e Finnde ngam heɓde console oo' 
              : 'Naatnu Staff ID walla Mobile maa ngam heɓde terminal oo'}
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
            <label className="text-xs text-neutral-400 uppercase tracking-wider block">
              {loginRole === 'admin' ? 'Admin Email' : 'Staff ID / Mobile'}
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 absolute left-3.5 text-neutral-500" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={loginRole === 'admin' ? 'admin@vujwalasimha.com' : 'waiter1'}
                className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37] transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-neutral-400 uppercase tracking-wider block">
              Finnde (Security Password)
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 absolute left-3.5 text-neutral-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#D4AF37] transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 mt-2 rounded-xl text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg cursor-pointer ${
              loginRole === 'admin'
                ? 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] hover:brightness-110'
                : 'bg-gradient-to-r from-cyan-400 to-teal-500 hover:brightness-110'
            }`}
          >
            <span>
              {loading 
                ? 'Ina huɓɓoo...' 
                : loginRole === 'admin' 
                ? 'Naatu e Admin Console' 
                : 'Naatu e Waiter Terminal'}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </form>
      </div>
    </main>
  );
}