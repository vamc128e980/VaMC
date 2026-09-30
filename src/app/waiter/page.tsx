// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  Utensils, 
  RefreshCw, 
  ChefHat, 
  Receipt, 
  Sparkles,
  AlertCircle,
  Eye,
  Check,
  X
} from 'lucide-react';

export default function WaiterNeonPanel() {
  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Live Clock
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadWaiterData = async () => {
    setLoading(true);
    try {
      const { data: tbls } = await supabase.from('restaurant_tables').select('*').order('table_number');
      const { data: sess } = await supabase.from('table_sessions').select('*').eq('status', 'active');
      const { data: bths } = await supabase.from('order_batches').select('*').order('created_at', { ascending: false });
      const { data: items } = await supabase.from('order_items').select('*, menu_items(name_en, price)');

      if (tbls) setTables(tbls);
      if (sess) setSessions(sess);
      if (bths) setBatches(bths);
      if (items) setOrderItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaiterData();

    // Realtime Master Listener
    const channel = supabase
      .channel('waiter-neon-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => loadWaiterData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => loadWaiterData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_batches' }, () => loadWaiterData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadWaiterData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Accept Batch and dispatch to kitchen
  const handleAcknowledgeBatch = async (batchId: string) => {
    try {
      await supabase
        .from('order_batches')
        .update({ status: 'sent_to_kitchen' })
        .eq('id', batchId);

      await supabase
        .from('order_items')
        .update({ item_status: 'preparing' })
        .eq('batch_id', batchId);

      await loadWaiterData();
    } catch (err: any) {
      alert('Error updating batch: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#030305] text-slate-100 font-sans pb-28 relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Cyber Neon Ambient Lighting */}
      <div className="fixed -top-40 left-10 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-1/2 -right-40 w-[500px] h-[500px] bg-fuchsia-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-1/3 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#07070a]/75 backdrop-blur-3xl border-b border-white/[0.08] px-6 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <ChefHat className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-cyan-300 uppercase bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-400/40 shadow-sm">
                  FLOOR SERVICE
                </span>
                <h1 className="text-base font-extrabold tracking-wide text-white">
                  WAITER COMMAND
                </h1>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">NEON MATRIX DASHBOARD</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/60 border border-white/10 px-3 py-1.5 rounded-2xl font-mono text-xs font-bold text-cyan-300 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{timeStr || 'Live'}</span>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={loadWaiterData}
              className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-200 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Floor Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Utensils className="w-4 h-4 text-cyan-400" /> Dining Tables Matrix
          </h2>

          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /> Vacant
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" /> Dining
            </span>
            <span className="flex items-center gap-1.5 text-fuchsia-400">
              <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_#e879f9] animate-ping" /> New Order
            </span>
          </div>
        </div>

        {/* Neon Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(t => {
            const activeSession = sessions.find(s => s.table_number === t.table_number && s.status === 'active');
            const isOccupied = !!activeSession;

            // Check if there are pending batches for this table
            const tableBatches = batches.filter(b => b.table_number === t.table_number && b.session_id === activeSession?.id);
            const hasPendingAction = tableBatches.some(b => b.status === 'pending_waiter');

            return (
              <motion.div
                key={t.id || t.table_number}
                layout
                whileHover={{ scale: 1.02 }}
                onClick={() => isOccupied && setSelectedTable({ ...t, activeSession, tableBatches })}
                className={`p-5 rounded-3xl backdrop-blur-2xl border transition-all duration-300 relative overflow-hidden cursor-pointer ${
                  hasPendingAction
                    ? 'bg-fuchsia-950/20 border-fuchsia-500/60 shadow-[0_0_30px_rgba(217,70,239,0.25)] ring-2 ring-fuchsia-500/40'
                    : isOccupied
                    ? 'bg-amber-950/20 border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/30'
                    : 'bg-emerald-950/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:border-emerald-500/60'
                }`}
              >
                {/* Glow bar indicator */}
                <div className={`absolute top-0 inset-x-0 h-1 ${
                  hasPendingAction ? 'bg-fuchsia-400 shadow-[0_0_12px_#e879f9]' : isOccupied ? 'bg-amber-400 shadow-[0_0_12px_#fbbf24]' : 'bg-emerald-400 shadow-[0_0_12px_#34d399]'
                }`} />

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white">Table #{t.table_number}</span>
                    <span className="text-[11px] text-neutral-400 font-mono">({t.capacity || 4}p)</span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    hasPendingAction
                      ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/50 animate-pulse'
                      : isOccupied
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                  }`}>
                    {hasPendingAction ? 'New Order!' : isOccupied ? 'Seated' : 'Available'}
                  </span>
                </div>

                {isOccupied ? (
                  <div className="space-y-2.5">
                    <div className="bg-black/50 border border-white/10 rounded-2xl p-3 text-xs space-y-1 font-mono">
                      <div className="flex justify-between text-neutral-400">
                        <span>Guest:</span>
                        <span className="font-bold text-white font-sans">{activeSession.customer_name || 'Guest'}</span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Mobile:</span>
                        <span>{activeSession.customer_phone || '-'}</span>
                      </div>
                      <div className="flex justify-between text-neutral-400 pt-1 border-t border-white/10">
                        <span>Live Bill:</span>
                        <span className="font-black text-amber-300 text-sm">₹{Number(activeSession.total_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300 pt-1">
                      <span>{tableBatches.length} Orders Sent</span>
                      <span className="underline">View Dishes ➔</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-emerald-400/70 font-mono flex flex-col items-center gap-1">
                    <CheckCircle2 className="w-6 h-6 opacity-60" />
                    <span>Table Ready</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Slide-out Order Details Glass Modal */}
      <AnimatePresence>
        {selectedTable && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-lg bg-[#0c0c14]/95 border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-cyan-400" /> Table #{selectedTable.table_number} Service Ledger
                  </h3>
                  <span className="text-xs text-neutral-400 font-mono">
                    Guest: {selectedTable.activeSession?.customer_name} ({selectedTable.activeSession?.customer_phone})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Running Orders Breakdown */}
              <div className="space-y-4">
                {selectedTable.tableBatches?.map((batch, bIdx) => {
                  const bItems = orderItems.filter(oi => oi.batch_id === batch.id);
                  const isPending = batch.status === 'pending_waiter';

                  return (
                    <div 
                      key={batch.id} 
                      className={`p-4 rounded-2xl border transition ${
                        isPending 
                          ? 'bg-fuchsia-950/20 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.2)]'
                          : 'bg-black/40 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-neutral-300">
                          Order Batch #{bIdx + 1}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isPending 
                            ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400 animate-pulse' 
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                        }`}>
                          {isPending ? 'Pending Waiter Approval' : 'Sent to Kitchen'}
                        </span>
                      </div>

                      <div className="space-y-1.5 divide-y divide-white/[0.05] text-xs">
                        {bItems.map(item => (
                          <div key={item.id} className="pt-1.5 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800 px-1.5 py-0.5 rounded">
                                {item.quantity}x
                              </span>
                              <span className="text-neutral-200 font-bold">{item.menu_items?.name_en || 'Dish'}</span>
                            </div>
                            <span className="font-mono text-neutral-400">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {isPending && (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleAcknowledgeBatch(batch.id)}
                          className="w-full mt-3 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-black font-black uppercase text-xs shadow-lg flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4 stroke-[3]" /> Dispatch to Kitchen KDS
                        </motion.button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Active Table Summary */}
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-neutral-400">
                  <span>Net Dishes Total:</span>
                  <span>₹{Number(selectedTable.activeSession?.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Govt GST (5% Inclusive):</span>
                  <span>₹{(Number(selectedTable.activeSession?.cgst_amount || 0) + Number(selectedTable.activeSession?.sgst_amount || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-cyan-500/30">
                  <span>Final Settle Amount:</span>
                  <span className="text-cyan-300">₹{Number(selectedTable.activeSession?.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}