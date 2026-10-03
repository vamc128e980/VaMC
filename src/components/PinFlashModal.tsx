// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Zap, X, RotateCcw, Calendar, CheckCircle2 } from 'lucide-react';

const fastSpring = { type: 'spring', stiffness: 480, damping: 28, mass: 0.8 };
const iosModalSpring = { type: 'spring', stiffness: 420, damping: 26, mass: 0.85 };

export default function PinFlashModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [crackedList, setCrackedList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const getTodayISOString = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  };

  const fetchFlashData = async () => {
    setLoading(true);
    try {
      const todayStart = getTodayISOString();

      const { data } = await supabase
        .from('daily_pin_vault')
        .select('*')
        .eq('is_cracked', true)
        .gte('cracked_at', todayStart)
        .order('cracked_at', { ascending: false });

      if (data) setCrackedList(data);
    } catch (err) {
      console.error('Flash feed error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFlashData();

      const channel = supabase
        .channel(`flash-realtime-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'daily_pin_vault' },
          () => fetchFlashData()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen]);

  const handleResetDay = async () => {
    if (!confirm('Eeroju crack aina Flash Feed mariyu Vaults anni reset cheyala? (All 10 PINs will become safe/green again)')) return;

    setResetting(true);
    try {
      const { error } = await supabase
        .from('daily_pin_vault')
        .update({
          is_cracked: false,
          cracked_session_id: null,
          cracked_table_number: null,
          cracked_by_name: null,
          cracked_at: null,
          updated_at: new Date().toISOString()
        })
        .neq('slot_number', 0);

      if (error) throw error;
      await fetchFlashData();
      alert('Day Reset Complete! Flash feed clean aindi & 10 PINs malli ready ga unnai.');
    } catch (err: any) {
      alert('Reset error: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  const todayDateDisplay = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={iosModalSpring}
        className="w-full max-w-xl bg-black border border-[#D4AF37]/50 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,1)] relative space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar will-change-transform"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D4AF37]/25 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] p-0.5 shadow-md">
              <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#F3E5AB]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Today's Flash Cracking Feed</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#FCF6BA] font-mono text-[10px] font-bold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#D4AF37]" /> {todayDateDisplay}
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#D4AF37]/80">Daily live tracking — Resets every day</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[#D4AF37] hover:text-[#FCF6BA] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Reset Action Bar */}
        <div className="flex items-center justify-between bg-black border border-[#D4AF37]/30 p-3 rounded-2xl text-xs font-mono">
          <span className="text-[#F3E5AB]">
            Cracked Today: <strong className="text-[#FCF6BA]">{crackedList.length} / 10</strong>
          </span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleResetDay}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase text-[11px] transition disabled:opacity-50 cursor-pointer shadow-md"
            title="Reset today's tracking & vaults"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Resetting...' : 'Reset Day Feed'}</span>
          </motion.button>
        </div>

        {/* Content Feed */}
        {loading ? (
          <div className="text-center py-12 text-[#D4AF37] text-xs font-mono">
            SYNCING TODAY'S CRACKED VAULTS...
          </div>
        ) : crackedList.length === 0 ? (
          <div className="text-center py-12 text-[#D4AF37]/60 text-xs font-mono">
            Eeroju inka evaru PIN crack cheyaledhu. All 10 Vaults are fresh & safe!
          </div>
        ) : (
          <div className="space-y-2.5">
            {crackedList.map((item) => (
              <motion.div
                key={item.slot_number}
                whileHover={{ scale: 1.01 }}
                transition={fastSpring}
                className="p-4 rounded-2xl bg-black border border-[#D4AF37]/35 flex items-center justify-between text-xs shadow-md"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm">{item.cracked_by_name || 'Guest'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#FCF6BA] font-mono text-[10px] font-bold">
                      Table #{item.cracked_table_number}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#D4AF37]/80">
                    Cracked Code: <span className="font-bold text-[#FCF6BA] tracking-widest">{item.secret_pin}</span> (Vault #{item.slot_number})
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    Time: {item.cracked_at ? new Date(item.cracked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[#FCF6BA] font-mono font-black text-base block">
                    -₹{Number(item.discount_amount).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold">Discount Applied</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}