// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, X, RefreshCw, Dices, RotateCcw, Check, Sparkles, ShieldCheck } from 'lucide-react';

const fastSpring = { type: 'spring', stiffness: 480, damping: 28, mass: 0.8 };
const iosModalSpring = { type: 'spring', stiffness: 420, damping: 26, mass: 0.85 };

export default function PinGameConfigModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [vaults, setVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchVaults = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('daily_pin_vault')
        .select('*')
        .order('slot_number', { ascending: true });
      if (data) setVaults(data);
    } catch (err) {
      console.error('Error fetching vaults:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVaults();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateVault = async (slotNumber: number, pin: string, discount: number) => {
    setSavingIndex(slotNumber);
    try {
      await supabase
        .from('daily_pin_vault')
        .update({
          secret_pin: pin.trim(),
          discount_amount: Number(discount) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('slot_number', slotNumber);
      await fetchVaults();
    } catch (err: any) {
      alert('Error updating slot: ' + err.message);
    } finally {
      setSavingIndex(null);
    }
  };

  // Generate 10 Random 4-digit PINs instantly
  const handleGenerateRandomPins = async () => {
    if (!confirm('Anni 10 slots ki kotha random 4-digit PINs generate cheyala?')) return;
    setGenerating(true);
    try {
      const updates = vaults.map(v => {
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        return supabase
          .from('daily_pin_vault')
          .update({
            secret_pin: randomPin,
            is_cracked: false,
            cracked_session_id: null,
            cracked_table_number: null,
            cracked_by_name: null,
            cracked_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('slot_number', v.slot_number);
      });

      await Promise.all(updates);
      await fetchVaults();
      alert('10 Fresh Random PINs Generated & Vaults Reset!');
    } catch (err: any) {
      alert('Generate error: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleResetAllVaults = async () => {
    if (!confirm('Anni 10 PINs status ni UNCRACKED (Active / Safe) ga reset cheyala?')) return;
    setLoading(true);
    try {
      await supabase
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
      await fetchVaults();
    } catch (err: any) {
      alert('Reset error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={iosModalSpring}
        className="w-full max-w-2xl bg-black border border-[#D4AF37]/50 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,1)] relative space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar will-change-transform"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D4AF37]/25 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] p-0.5 shadow-md">
              <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-[#F3E5AB]" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-black text-white">Daily 10 PINs Vault Manager</h3>
              <p className="text-[11px] font-mono text-[#D4AF37]/80">Manage secret codes, discounts & game status</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[#D4AF37] hover:text-[#FCF6BA] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/25 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#F3E5AB]">
              Active Vaults: <strong className="text-[#FCF6BA]">{vaults.filter(v => !v.is_cracked).length} / 10</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleGenerateRandomPins}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black text-[11px] uppercase shadow-md cursor-pointer disabled:opacity-50"
            >
              <Dices className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Generating...' : 'Auto Roll 10 PINs'}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleResetAllVaults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black border border-[#D4AF37]/40 text-[#FCF6BA] hover:bg-[#D4AF37]/15 font-bold text-[11px] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Reset Status</span>
            </motion.button>
          </div>
        </div>

        {/* 10 Vault Slots Matrix */}
        <div className="space-y-2">
          {vaults.map((v) => (
            <motion.div
              key={v.slot_number}
              whileHover={{ scale: 1.01 }}
              transition={fastSpring}
              className="p-3.5 rounded-2xl bg-black border border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-[#D4AF37]/15 text-[#FCF6BA] border border-[#D4AF37]/35 flex items-center justify-center font-mono font-black text-xs">
                  #{v.slot_number}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[#D4AF37]/80 font-mono text-[10px] uppercase font-bold">PIN:</span>
                  <input
                    type="text"
                    maxLength={4}
                    defaultValue={v.secret_pin}
                    onBlur={(e) => handleUpdateVault(v.slot_number, e.target.value, v.discount_amount)}
                    className="w-16 bg-black border border-[#D4AF37]/40 rounded-xl px-2 py-1 text-center font-mono font-black text-white text-xs outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[#D4AF37]/80 font-mono text-[10px] uppercase font-bold">Discount:</span>
                  <div className="relative flex items-center">
                    <span className="absolute left-2 text-[#D4AF37] font-bold text-xs">₹</span>
                    <input
                      type="number"
                      defaultValue={v.discount_amount}
                      onBlur={(e) => handleUpdateVault(v.slot_number, v.secret_pin, Number(e.target.value))}
                      className="w-20 pl-5 pr-2 py-1 bg-black border border-[#D4AF37]/40 rounded-xl font-mono font-bold text-[#FCF6BA] text-xs outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase font-mono tracking-wider border flex items-center gap-1.5 ${
                    v.is_cracked
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${v.is_cracked ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                  {v.is_cracked ? 'Cracked' : 'Active / Safe'}
                </span>

                {savingIndex === v.slot_number && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}