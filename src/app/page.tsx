// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Crown, 
  QrCode, 
  ShieldCheck, 
  UtensilsCrossed, 
  ArrowRight, 
  Sparkles,
  ChefHat
} from 'lucide-react';

const fluidSpring = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.55
};

export default function RestaurantLandingPage() {
  const router = useRouter();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [shopName, setShopName] = useState('VUJWALA SIMHA');
  const [tagline, setTagline] = useState('DRY FRUITS, NUTS & ROYAL FINE-DINE');

  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        const [
          { data: tbls },
          { data: settings }
        ] = await Promise.all([
          supabase.from('restaurant_tables').select('*').order('table_number', { ascending: true }),
          supabase.from('restaurant_settings').select('*').eq('id', 1).maybeSingle()
        ]);

        if (tbls) setTables(tbls);
        if (settings) {
          if (settings.restaurant_name) setShopName(settings.restaurant_name);
          if (settings.tagline) setTagline(settings.tagline);
        }
      } catch (err) {
        console.error('Landing load error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLandingData();
  }, []);

  const handleWaiterClick = () => {
    // Clear any active session cookies to prevent auto-redirecting to admin
    document.cookie = 'staff_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    if (typeof window !== 'undefined') {
      localStorage.removeItem('staff_role');
      localStorage.removeItem('session_token');
    }
    window.location.href = '/login?role=waiter';
  };

  const handleAdminClick = () => {
    window.location.href = '/login?role=admin';
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-[#FCF6BA] font-sans antialiased relative overflow-hidden flex flex-col justify-between p-4 sm:p-8 selection:bg-[#D4AF37] selection:text-black">
      
      {/* Ambient Luxury Golden Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#D4AF37]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header with Distinct Admin & Waiter Portals */}
      <header className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 z-20 pt-2 pb-4 border-b border-white/[0.06]">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center shadow-lg shrink-0">
              <Crown className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <span className="text-[9px] font-mono tracking-[0.25em] text-[#D4AF37] font-bold block uppercase">
                FINE-DINE OPERATIONS
              </span>
              <h1 className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
                {shopName}
              </h1>
            </div>
          </div>
        </div>

        {/* Dedicated Portal Action Blocks in Header */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Waiter Portal Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            transition={fluidSpring}
            onClick={handleWaiterClick}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 text-[#FCF6BA] text-xs font-mono font-bold transition shadow-md cursor-pointer backdrop-blur-md"
          >
            <ChefHat className="w-4 h-4 text-[#D4AF37]" />
            <span>Waiter Floor</span>
          </motion.button>

          {/* Admin Command Portal Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            transition={fluidSpring}
            onClick={handleAdminClick}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black text-xs font-mono font-black uppercase transition shadow-[0_2px_15px_rgba(212,175,55,0.3)] cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            <span>Admin Portal</span>
          </motion.button>
        </div>
      </header>

      {/* Main Center Hero */}
      <main className="w-full max-w-2xl mx-auto text-center space-y-6 z-10 my-auto py-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#FCF6BA] text-xs font-mono font-bold shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>QR Touch Dining Experience</span>
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-tight">
            Delicious Flavors <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27]">
              Crafted For You
            </span>
          </h2>
          <p className="text-xs sm:text-sm font-sans text-neutral-400 max-w-md mx-auto leading-relaxed">
            {tagline}. Physical dining table QR scan chesi live digital menu and instant order place cheyandi.
          </p>
        </div>

        {/* Customer Dining Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 font-mono">
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={fluidSpring}
            onClick={() => setShowTablePicker(true)}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black text-xs uppercase shadow-[0_4px_30px_rgba(212,175,55,0.35)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <UtensilsCrossed className="w-4 h-4 stroke-[2.5]" />
            <span>Select Table Menu</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={fluidSpring}
            onClick={() => router.push('/table/1')}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-[#D4AF37]/40 text-neutral-300 hover:text-white font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md"
          >
            <QrCode className="w-4 h-4 text-[#D4AF37]" />
            <span>Quick Demo (Table #1)</span>
          </motion.button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto flex items-center justify-between text-[11px] font-mono text-neutral-500 z-10 pt-4 border-t border-white/[0.06]">
        <span>© {new Date().getFullYear()} {shopName}</span>
        <span className="text-[#D4AF37]">Zero-GST Flat Dining Hub</span>
      </footer>

      {/* Table Selection Modal */}
      <AnimatePresence>
        {showTablePicker && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={fluidSpring}
              className="w-full max-w-md bg-[#0d0d0f] border border-[#D4AF37]/50 rounded-[32px] p-6 shadow-2xl space-y-4 font-mono max-h-[85vh] overflow-y-auto custom-gold-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-[#D4AF37]" /> Choose Dining Table
                  </h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Select your seated table number</p>
                </div>
                <button 
                  onClick={() => setShowTablePicker(false)}
                  className="p-1 rounded-xl text-neutral-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-neutral-500">Loading floor tables...</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {tables.map((t) => (
                    <motion.button
                      key={t.table_number}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push(`/table/${t.table_number}`)}
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 flex flex-col items-center justify-center gap-1 transition text-left cursor-pointer"
                    >
                      <span className="text-sm font-black text-white">#{t.table_number}</span>
                      <span className="text-[10px] text-[#D4AF37] truncate max-w-full">
                        {t.table_name || `Table-${t.table_number}`}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}