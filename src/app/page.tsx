// @ts-nocheck
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, UserCheck, QrCode, Sparkles, Utensils } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col justify-between p-6 relative overflow-hidden font-sans">
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_70%)] blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <header className="max-w-md mx-auto w-full pt-8 text-center space-y-2">
        <span className="text-[10px] font-black tracking-widest text-[#F3E5AB] uppercase bg-[#D4AF37]/20 px-3 py-1 rounded-full border border-[#D4AF37]/40 shadow-sm">
          FINE DINE OPS SUITE
        </span>
        <h1 className="text-3xl font-black tracking-wide text-white">
          THE ROYAL PALACE
        </h1>
        <p className="text-xs text-neutral-400 font-mono">Real-time Luxury Dining System</p>
      </header>

      {/* Action Navigation Cards */}
      <main className="max-w-md mx-auto w-full space-y-4 my-auto py-8">
        {/* Customer QR Demo */}
        <Link href="/table/1">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-2xl border border-[#D4AF37]/40 shadow-[0_8px_30px_rgba(212,175,55,0.15)] flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                <QrCode className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Customer Menu View</h3>
                <p className="text-[11px] text-neutral-400 font-mono">Simulate scanning Table #1 QR</p>
              </div>
            </div>
            <span className="text-sm font-bold text-[#F3E5AB]">Launch ➔</span>
          </motion.div>
        </Link>

        {/* Waiter Panel */}
        <Link href="/waiter">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-5 rounded-3xl bg-cyan-950/20 hover:bg-cyan-950/30 backdrop-blur-2xl border border-cyan-500/40 shadow-[0_8px_30px_rgba(6,182,212,0.15)] flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Waiter Service Panel</h3>
                <p className="text-[11px] text-neutral-400 font-mono">Floor staff order management</p>
              </div>
            </div>
            <span className="text-sm font-bold text-cyan-300">Launch ➔</span>
          </motion.div>
        </Link>

        {/* Admin Console */}
        <Link href="/admin">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-2xl border border-white/10 shadow-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-neutral-200" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Admin Management</h3>
                <p className="text-[11px] text-neutral-400 font-mono">Sales, Menu edits & Banners</p>
              </div>
            </div>
            <span className="text-sm font-bold text-neutral-200">Launch ➔</span>
          </motion.div>
        </Link>
      </main>

      <footer className="text-center text-[11px] font-mono text-neutral-600 pb-4">
        © 2026 Powered by Next.js & Supabase Realtime
      </footer>
    </div>
  );
}