'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  UserCheck,
  Mail,
  Lock,
  User,
  ArrowRight,
  Store,
} from 'lucide-react';

type UserRole = 'waiter' | 'admin';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRole = searchParams.get('role');

  const [role, setRole] = useState<UserRole>('waiter');

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [waiterInput, setWaiterInput] = useState('');
  const [waiterPassword, setWaiterPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    router.prefetch('/admin');
    router.prefetch('/waiter');
  }, [router]);

  useEffect(() => {
    if (queryRole === 'admin') {
      setRole('admin');
    } else if (queryRole === 'waiter') {
      setRole('waiter');
    }
    setErrorMsg('');
  }, [queryRole]);

  const handleLogin = async (
    identifier: string,
    password: string,
    targetRole: UserRole,
  ) => {
    if (loading) return;

    setErrorMsg('');
    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          identifier: cleanIdentifier,
          password: cleanPassword,
          role: targetRole,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      const result = contentType.includes('application/json')
        ? await response.json()
        : null;

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ||
            `Login failed (${response.status}). Please try again.`,
        );
      }

      if (result.role !== targetRole) {
        throw new Error('Invalid authentication response.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('staff_role', targetRole);
        localStorage.setItem(
          'staff_name',
          result.name ||
            (targetRole === 'admin' ? 'Master Admin' : 'Floor Steward'),
        );
        localStorage.setItem(
          'session_token',
          result.token || 'verified_session',
        );
      }

      const nextPath = targetRole === 'admin' ? '/admin' : '/waiter';
      window.location.assign(nextPath);
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('session_token');
      }
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Unable to login. Please try again.',
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-[#FCF6BA] flex items-center justify-center p-4 antialiased selection:bg-[#D4AF37] selection:text-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm rounded-[32px] bg-gradient-to-b from-[#111115] via-[#0b0b0e] to-[#070709] border border-[#D4AF37]/40 p-6 sm:p-8 shadow-[0_12px_45px_rgba(0,0,0,0.85)] space-y-5"
      >
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/50 flex items-center justify-center mx-auto shadow-lg text-[#D4AF37]">
            <Store className="w-6 h-6" />
          </div>

          <h1 className="text-base font-black uppercase tracking-wider text-white">
            STAFF COMMAND ACCESS
          </h1>

          <p className="text-[11px] font-mono text-neutral-400">
            Vujwala Simha Restaurant & Dine
          </p>
        </div>

        <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.03] border border-white/10 font-mono text-xs">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setRole('waiter');
              setErrorMsg('');
            }}
            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
              role === 'waiter'
                ? 'bg-[#D4AF37] text-black font-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Waiter Login
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setRole('admin');
              setErrorMsg('');
            }}
            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 ${
              role === 'admin'
                ? 'bg-[#D4AF37] text-black font-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Admin Login
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono text-center"
          >
            {errorMsg}
          </div>
        )}

        {role === 'waiter' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(waiterInput, waiterPassword, 'waiter');
            }}
            className="space-y-3 font-mono"
          >
            <div>
              <label
                htmlFor="waiter-identifier"
                className="text-[11px] text-neutral-400 block mb-1"
              >
                Staff / Waiter Name or ID
              </label>

              <div className="relative">
                <User className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />

                <input
                  id="waiter-identifier"
                  name="waiterIdentifier"
                  type="text"
                  required
                  autoComplete="username"
                  disabled={loading}
                  placeholder="e.g. Surya or 9392149329"
                  value={waiterInput}
                  onChange={(e) => setWaiterInput(e.target.value)}
                  className="w-full bg-[#161619] border border-white/10 focus:border-[#D4AF37] rounded-2xl pl-10 pr-3 py-2.5 text-white text-xs outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="waiter-password"
                className="text-[11px] text-neutral-400 block mb-1"
              >
                Waiter Password
              </label>

              <div className="relative">
                <Lock className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />

                <input
                  id="waiter-password"
                  name="waiterPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  placeholder="••••••••"
                  value={waiterPassword}
                  onChange={(e) => setWaiterPassword(e.target.value)}
                  className="w-full bg-[#161619] border border-white/10 focus:border-[#D4AF37] rounded-2xl pl-10 pr-3 py-2.5 text-white text-xs outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              type="submit"
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black text-xs uppercase shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>
                {loading ? 'Verifying Staff...' : 'Access Waiter Floor'}
              </span>

              {!loading && <ArrowRight className="w-4 h-4" />}
            </motion.button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(adminEmail, adminPassword, 'admin');
            }}
            className="space-y-3 font-mono"
          >
            <div>
              <label
                htmlFor="admin-email"
                className="text-[11px] text-neutral-400 block mb-1"
              >
                Admin Email Address
              </label>

              <div className="relative">
                <Mail className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />

                <input
                  id="admin-email"
                  name="adminEmail"
                  type="email"
                  required
                  autoComplete="username"
                  disabled={loading}
                  placeholder="admin@vujwalasimha.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-[#161619] border border-white/10 focus:border-[#D4AF37] rounded-2xl pl-10 pr-3 py-2.5 text-white text-xs outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="text-[11px] text-neutral-400 block mb-1"
              >
                Admin Password
              </label>

              <div className="relative">
                <Lock className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />

                <input
                  id="admin-password"
                  name="adminPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-[#161619] border border-white/10 focus:border-[#D4AF37] rounded-2xl pl-10 pr-3 py-2.5 text-white text-xs outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              type="submit"
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black text-xs uppercase shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>
                {loading ? 'Verifying Admin...' : 'Access Admin Dashboard'}
              </span>

              {!loading && <ArrowRight className="w-4 h-4" />}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
