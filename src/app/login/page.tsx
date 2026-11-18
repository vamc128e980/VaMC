// @ts-nocheck
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, UserCheck, Mail, Lock, User, ArrowRight, Store } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRole = searchParams.get('role');

  const [role, setRole] = useState<'waiter' | 'admin'>('waiter');
  
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [waiterInput, setWaiterInput] = useState('');
  const [waiterPassword, setWaiterPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (queryRole === 'admin') {
      setRole('admin');
    } else {
      setRole('waiter');
    }
  }, [queryRole]);

  // Completely bypasses API route 404s by querying Supabase directly on the client
  const handleDirectLogin = async (identifierVal: string, passwordVal: string, targetRole: 'admin' | 'waiter') => {
    setErrorMsg('');
    setLoading(true);

    try {
      const cleanId = identifierVal.trim().toLowerCase();
      const cleanPass = passwordVal.trim();

      if (!cleanId || !cleanPass) {
        throw new Error('All fields are required.');
      }

      // Fetch all staff accounts from Supabase directly
      const { data: users, error } = await supabase
        .from('staff_accounts')
        .select('*');

      if (error || !users) {
        throw new Error('Database connection failed.');
      }

      // Find matching user for the target role
      const user = users.find(u => {
        const uRole = (u.role || '').toLowerCase();
        if (uRole !== targetRole) return false;

        const dbId = (u.identifier || '').trim().toLowerCase();
        const dbName = (u.name || '').trim().toLowerCase();

        return dbId === cleanId || dbName === cleanId;
      });

      if (!user || user.password_hash !== cleanPass) {
        throw new Error('Invalid credentials. Please verify your details.');
      }

      const verifiedRole = user.role.toLowerCase();
      const staffName = user.name || (verifiedRole === 'admin' ? 'Master Admin' : 'Floor Steward');
      const token = `${verifiedRole}_verified_${Date.now()}`;

      // Set cookies & storage
      document.cookie = `staff_role=${verifiedRole}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `session_token=${token}; path=/; max-age=86400; SameSite=Lax`;
      localStorage.setItem('staff_role', verifiedRole);
      localStorage.setItem('session_token', token);
      localStorage.setItem('staff_name', staffName);

      // Hard redirect based on role
      if (verifiedRole === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/waiter';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-[#FCF6BA] flex items-center justify-center p-4 antialiased selection:bg-[#D4AF37] selection:text-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-[32px] bg-gradient-to-b from-[#111115] via-[#0b0b0e] to-[#070709] border border-[#D4AF37]/40 p-6 sm:p-8 shadow-[0_12px_45px_rgba(0,0,0,0.85)] space-y-5"
      >
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/50 flex items-center justify-center mx-auto shadow-lg text-[#D4AF37]">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-base font-black uppercase tracking-wider text-white">STAFF COMMAND ACCESS</h1>
          <p className="text-[11px] font-mono text-neutral-400">Vujwala Simha Restaurant & Dine</p>
        </div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.03] border border-white/10 font-mono text-xs">
          <button
            type="button"
            onClick={() => { setRole('waiter'); setErrorMsg(''); }}
            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              role === 'waiter' ? 'bg-[#D4AF37] text-black font-black shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Waiter Login
          </button>
          <button
            type="button"
            onClick={() => { setRole('admin'); setErrorMsg(''); }}
            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              role === 'admin' ? 'bg-[#D4AF37] text-black font-black shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Admin Login
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono text-center">
            {errorMsg}
          </div>
        )}

        {/* 1. Waiter Login */}
        {role === 'waiter' ? (
          <form 
            onSubmit={(e) => { e.preventDefault(); handleDirectLogin(waiterInput, waiterPassword, 'waiter'); }} 
            className="space-y-3 font-mono"
          >
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Staff / Waiter Name or ID</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Surya or 9392149329"
                  value={waiterInput}
                  onChange={(e) => setWaiterInput(e.target.value)}
                  className="w-full bg-[#161619] border border-white/10 focus:border-[#D4AF37] rounded-2xl pl-10 pr-3 py-2.5 text-white text-xs outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Waiter Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={waiterPassword}
                  onChange={(e) => setWaiterPassword(e.target.value)}
                  className="w-full bg-[#161619] border border-white/10 focus:border-[#D4AF37] rounded-2xl pl-10 pr-3 py-2.5 text-white text-xs outline-none"
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              disabled={loading}
              type="submit"
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black text-xs uppercase shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Verifying Staff...' : 'Access Waiter Floor'}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </form>
        ) : (
          /* 2. Admin Login */
          <form 
            onSubmit={(e) => { e.preventDefault(); handleDirectLogin(adminEmail, adminPassword, 'admin'); }} 
            className="space-y-3 font-mono"
          >
            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Admin Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="admin@vujwalasimha.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-[#161619] border border-white/10 focus:border-[#D4AF37] rounded-2xl pl-10 pr-3 py-2.5 text-white text-xs outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-[#161619] border border-white/10 focus:border-[#D4AF37] rounded-2xl pl-10 pr-3 py-2.5 text-white text-xs outline-none"
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              disabled={loading}
              type="submit"
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black text-xs uppercase shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Verifying Admin...' : 'Access Admin Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
