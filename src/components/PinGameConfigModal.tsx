// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { KeyRound, X, RefreshCw } from 'lucide-react';

export default function PinGameConfigModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [vaults, setVaults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const fetchVaults = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('daily_pin_vault')
      .select('*')
      .order('slot_number', { ascending: true });
    if (data) setVaults(data);
    setLoading(false);
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

  const handleResetAllVaults = async () => {
    if (!confirm('Anni 10 PINs status ni uncracked (Not Safe / Green) ga reset cheyala?')) return;
    setLoading(true);
    await supabase
      .from('daily_pin_vault')
      .update({
        is_cracked: false,
        cracked_session_id: null,
        cracked_table_number: null,
        cracked_by_name: null,
        cracked_at: null
      })
      .neq('slot_number', 0);
    await fetchVaults();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0c0c14] border border-[#D4AF37]/50 rounded-3xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <h3 className="text-base font-black text-white">Daily 10 PINs Vault Manager</h3>
              <p className="text-[11px] font-mono text-neutral-400">Manage 10 secret codes & cash discounts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAllVaults}
              className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition"
            >
              Reset 10 Vaults
            </button>
            <button onClick={onClose} className="p-1 rounded-full text-neutral-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1 to 10 Rows Matrix */}
        <div className="space-y-2">
          {vaults.map((v) => (
            <div
              key={v.slot_number}
              className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-[#D4AF37]/15 text-[#F3E5AB] border border-[#D4AF37]/30 flex items-center justify-center font-mono font-black">
                  #{v.slot_number}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 font-mono text-[10px] uppercase">PIN:</span>
                  <input
                    type="text"
                    maxLength={4}
                    defaultValue={v.secret_pin}
                    onBlur={(e) => handleUpdateVault(v.slot_number, e.target.value, v.discount_amount)}
                    className="w-16 bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-center font-mono font-black text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 font-mono text-[10px] uppercase">Disc:</span>
                  <div className="relative flex items-center">
                    <span className="absolute left-2 text-neutral-400 font-bold">₹</span>
                    <input
                      type="number"
                      defaultValue={v.discount_amount}
                      onBlur={(e) => handleUpdateVault(v.slot_number, v.secret_pin, Number(e.target.value))}
                      className="w-20 pl-5 pr-2 py-1 bg-black/60 border border-white/10 rounded-lg font-mono font-bold text-[#F3E5AB] outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                    v.is_cracked
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${v.is_cracked ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                  {v.is_cracked ? 'Cracked' : 'Not Safe'}
                </span>

                {savingIndex === v.slot_number && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}