// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap, X, RotateCcw, Calendar } from 'lucide-react';

export default function PinFlashModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [crackedList, setCrackedList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Today start date (midnight 00:00:00) filter
  const getTodayISOString = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  };

  const fetchFlashData = async () => {
    setLoading(true);
    try {
      const todayStart = getTodayISOString();

      // Only fetch vaults cracked TODAY
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
        .channel('flash-modal-realtime')
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

  // Day to Day Complete Reset (Clears Flash & Restores 10 PINs to Uncracked)
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
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-black border border-[#D4AF37]/50 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,1)] relative space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D4AF37]/25 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#F3E5AB]">
              <Zap className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Today's Flash Cracking Feed</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#FCF6BA] font-mono text-[10px] font-bold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#D4AF37]" /> {todayDateDisplay}
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#D4AF37]/80">Daily live tracking — Resets every day</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-[#D4AF37] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Reset Action Bar */}
        <div className="flex items-center justify-between bg-[#0a0802] border border-[#D4AF37]/30 p-2.5 rounded-2xl text-xs font-mono">
          <span className="text-[#F3E5AB]">
            Cracked Today: <strong className="text-[#FCF6BA]">{crackedList.length} / 10</strong>
          </span>
          <button
            onClick={handleResetDay}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 hover:bg-[#D4AF37]/30 text-[#FCF6BA] font-bold transition disabled:opacity-50"
            title="Reset today's tracking & vaults"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Resetting...' : 'Reset Day Feed'}</span>
          </button>
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
              <div
                key={item.slot_number}
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
                  <span className="text-[10px] text-[#D4AF37]/80 font-mono uppercase">Discount Applied</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}