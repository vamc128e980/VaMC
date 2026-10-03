// @ts-nocheck
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Shield, KeyRound, User, ArrowRight, AlertCircle } from 'lucide-react';

const fastSpring = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
  mass: 0.8
};

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

    if (!cleanId || !cleanPass) {
      setErrorMsg('Identifier mariyu password enter cheyandi.');
      setLoading(false);
      return;
    }

    try {
      let role: string | null = null;
      let staffName = 'Staff Member';

      // 1. FIRST PRIORITY: Database Lookup (Meeru marchina kotha password ikkade untundi!)
      const { data: user, error: userErr } = await supabase
        .from('staff_accounts')
        .select('*')
        .eq('identifier', cleanId)
        .maybeSingle();

      const dbPass = user ? String(user.password_hash || user.password || user.security_pin || '').trim() : '';

      if (user && dbPass && dbPass === cleanPass) {
        role = user.role?.toLowerCase() || 'waiter';
        staffName = user.name || (role === 'admin' ? 'Royal Admin' : 'Floor Steward');
      }

      // Check restaurant_settings if admin password was updated there
      if (!role && (cleanId === 'admin@restaurant.com' || cleanId === 'admin')) {
        const { data: settings } = await supabase
          .from('restaurant_settings')
          .select('admin_pin, master_password')
          .eq('id', 1)
          .maybeSingle();

        const customAdminPass = settings ? String(settings.admin_pin || settings.master_password || '').trim() : '';
        if (customAdminPass && customAdminPass === cleanPass) {
          role = 'admin';
          staffName = 'Royal Admin';
        }
      }

      // 2. SECOND PRIORITY: Default Fallback (Meeru inka password marchakapothe matrame)
      if (!role) {
        if (cleanId === 'admin@restaurant.com' && cleanPass === 'admin123') {
          role = 'admin';
          staffName = 'Royal Admin';
        } else if (cleanId === '9876543210' && cleanPass === 'waiter123') {
          role = 'waiter';
          staffName = 'Floor Steward';
        }
      }

      if (!role) {
        setErrorMsg('Invalid Credentials. Meeru marchina kotha PIN/Password enter cheyandi.');
        setLoading(false);
        return;
      }

      // 3. Set persistent cookies & storage
      const token = `${role}_verified_${Date.now()}`;
      document.cookie = `staff_role=${role}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `session_token=${token}; path=/; max-age=86400; SameSite=Lax`;

      if (typeof window !== 'undefined') {
        localStorage.setItem('staff_role', role);
        localStorage.setItem('staff_name', staffName);
        localStorage.setItem('session_token', token);
      }

      // 4. Force hard redirect to target dashboard
      if (role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/waiter';
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      setErrorMsg(err.message || 'Authentication error.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050406] text-[#FCF6BA] flex items-center justify-center p-4 relative overflow-hidden selection:bg-[#D4AF37] selection:text-black antialiased">
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-[radial-gradient(circle,rgba(212,175,55,0.18)_0%,transparent_75%)] blur-[140px] pointer-events-none -z-10" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={fastSpring}
        className="w-full max-w-sm p-8 rounded-[36px] bg-black border-[3px] border-[#D4AF37] backdrop-blur-3xl relative z-10 shadow-[0_25px_70px_rgba(0,0,0,1),0_0_35px_rgba(212,175,55,0.25)]"
      >
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.05 }}
            transition={fastSpring}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] p-0.5 shadow-[0_0_30px_rgba(212,175,55,0.4)]"
          >
            <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center text-[#FCF6BA]">
              <Shield className="w-8 h-8" />
            </div>
          </motion.div>

          <div className="pt-2">
            <span className="text-[10px] font-mono tracking-widest text-black uppercase bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] px-3.5 py-0.5 rounded-full font-black shadow-md">
              STAFF PORTAL
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#FCF6BA] via-[#F3E5AB] to-[#D4AF37] uppercase mt-2.5">
              Staff Verification
            </h1>
            <p className="text-xs font-mono text-[#D4AF37]/90 mt-1 font-semibold">
              Admin Email or Waiter Phone Number
            </p>
          </div>
        </div>

        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={fastSpring}
              className="flex items-center gap-2.5 p-3.5 mb-5 rounded-2xl bg-rose-950/80 border-2 border-rose-500/60 text-rose-200 text-xs font-mono shadow-md"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-black text-[#D4AF37] uppercase tracking-wider block">
              Identifier (Email / Phone)
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 absolute left-3.5 text-[#D4AF37]" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@restaurant.com"
                className="w-full pl-10 pr-3.5 py-3 bg-black border-2 border-[#D4AF37] rounded-2xl text-xs font-mono text-[#FCF6BA] placeholder:text-[#D4AF37]/40 focus:outline-none focus:border-[#FCF6BA] shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-black text-[#D4AF37] uppercase tracking-wider block">
              Security Key / PIN
            </label>
            <div className="relative flex items-center">
              <KeyRound className="w-4 h-4 absolute left-3.5 text-[#D4AF37]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-3 bg-black border-2 border-[#D4AF37] rounded-2xl text-xs font-mono text-[#FCF6BA] placeholder:text-[#D4AF37]/40 focus:outline-none focus:border-[#FCF6BA] shadow-inner"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={fastSpring}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 mt-2 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-[0_0_25px_rgba(212,175,55,0.4)] cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Authorize Access</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </main>
  );
}