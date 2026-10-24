// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  Utensils, 
  RefreshCw, 
  ChefHat, 
  Receipt, 
  Check, 
  X, 
  LogOut
} from 'lucide-react';

export default function WaiterTerminalPage() {
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentStaff, setCurrentStaff] = useState<any>(null);

  // Terminal Live Floor Data
  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  // 1. Strict Session Verification -> Session lekapothe direct ga /login ki redirect avthundi
  useEffect(() => {
    function verifySession() {
      if (typeof window === 'undefined') return;

      const rawCookies = document.cookie || '';
      const cookies = rawCookies.split(';').map(c => c.trim());
      const roleCookie = cookies.find(c => c.startsWith('staff_role='));
      const cookieRole = roleCookie ? roleCookie.split('=')[1]?.toLowerCase() : null;

      const tokenCookie = cookies.find(c => c.startsWith('session_token='));
      const cookieToken = tokenCookie ? tokenCookie.split('=')[1] : null;

      const localRole = localStorage.getItem('staff_role')?.toLowerCase();
      const localToken = localStorage.getItem('session_token');
      const localWaiter = localStorage.getItem('waiter_session');
      const localAdmin = localStorage.getItem('admin_session');

      const isWaiterToken = (cookieToken && cookieToken.startsWith('waiter_verified_')) || 
                            (localToken && localToken.startsWith('waiter_verified_'));
      const isAdminToken = (cookieToken && cookieToken.startsWith('admin_verified_')) || 
                           (localToken && localToken.startsWith('admin_verified_'));

      if ((cookieRole === 'waiter' || localRole === 'waiter') && isWaiterToken && localWaiter) {
        try { 
          setCurrentStaff(JSON.parse(localWaiter)); 
        } catch {}
        setIsAuthenticated(true);
        setAuthChecking(false);
      } else if ((cookieRole === 'admin' || localRole === 'admin') && isAdminToken && localAdmin) {
        try { 
          setCurrentStaff(JSON.parse(localAdmin)); 
        } catch {}
        setIsAuthenticated(true);
        setAuthChecking(false);
      } else {
        setIsAuthenticated(false);
        setAuthChecking(false);
        // Direct ga centralized /login page ki redirect
        router.replace('/login');
      }
    }

    verifySession();
  }, [router]);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load Terminal Data
  const loadWaiterData = async () => {
    setLoading(true);
    try {
      const [tblsRes, sessRes, bthsRes, itemsRes] = await Promise.all([
        supabase.from('restaurant_tables').select('*').order('table_number'),
        supabase.from('table_sessions').select('*').eq('status', 'active'),
        supabase.from('order_batches').select('*').order('created_at', { ascending: false }),
        supabase.from('order_items').select('*, menu_items(name_en, name, price)')
      ]);

      if (tblsRes.data) setTables(tblsRes.data);
      if (sessRes.data) setSessions(sessRes.data);
      if (bthsRes.data) setBatches(bthsRes.data);
      if (itemsRes.data) setOrderItems(itemsRes.data);
    } catch (err) {
      console.error('Waiter data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    loadWaiterData();

    const channel = supabase
      .channel('waiter-live-matrix')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => loadWaiterData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => loadWaiterData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_batches' }, () => loadWaiterData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadWaiterData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    document.cookie = 'staff_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    setIsAuthenticated(false);
    setCurrentStaff(null);
    router.replace('/login');
  };

  const handleAcknowledgeBatch = async (batchId: string) => {
    try {
      await Promise.all([
        supabase.from('order_batches').update({ status: 'sent_to_kitchen' }).eq('id', batchId),
        supabase.from('order_items').update({ item_status: 'preparing' }).eq('batch_id', batchId)
      ]);
      await loadWaiterData();
    } catch (err: any) {
      alert('Error updating batch: ' + err.message);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#030305] flex items-center justify-center text-cyan-400 font-mono text-xs tracking-widest uppercase">
        Verifying Floor Credentials...
      </div>
    );
  }

  // Session lekapothe useEffect lo router.replace('/login') call avthundi
  if (!isAuthenticated) {
    return null;
  }

  // LOGGED IN: Full Terminal View
  return (
    <div className="min-h-screen bg-[#030305] text-slate-100 font-sans pb-28 relative overflow-hidden select-none">
      {/* Cyber Neon Ambient Lighting */}
      <div className="fixed -top-40 left-10 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-1/2 -right-40 w-[500px] h-[500px] bg-fuchsia-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-1/3 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#07070a]/85 backdrop-blur-3xl border-b border-white/[0.08] px-6 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
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
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Logged in as: <strong className="text-cyan-300">{currentStaff?.name || currentStaff?.identifier || 'Staff'}</strong>
              </p>
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
              className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-200 transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="p-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
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

          <div className="flex items-center gap-3 text-[11px] font-bold font-mono">
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
                <div className={`absolute top-0 inset-x-0 h-1 ${
                  hasPendingAction ? 'bg-fuchsia-400 shadow-[0_0_12px_#e879f9]' : isOccupied ? 'bg-amber-400 shadow-[0_0_12px_#fbbf24]' : 'bg-emerald-400 shadow-[0_0_12px_#34d399]'
                }`} />

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white">{t.table_name || `Table #${t.table_number}`}</span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border font-mono ${
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

                    <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300 pt-1 font-mono">
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

      {/* Slide-out Order Details Modal */}
      <AnimatePresence>
        {selectedTable && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-lg bg-[#0c0c14]/95 border border-cyan-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar font-mono text-xs"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-cyan-400" /> {selectedTable.table_name || `Table #${selectedTable.table_number}`} Ledger
                  </h3>
                  <span className="text-[11px] text-neutral-400">
                    Guest: {selectedTable.activeSession?.customer_name || 'Walk-in'} ({selectedTable.activeSession?.customer_phone || '-'})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Running Orders Breakdown */}
              <div className="space-y-3">
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

                      <div className="space-y-1.5 divide-y divide-white/[0.05]">
                        {bItems.map(item => (
                          <div key={item.id} className="pt-1.5 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800 px-1.5 py-0.5 rounded text-[11px]">
                                {item.quantity}x
                              </span>
                              <span className="text-neutral-200 font-bold">{item.menu_items?.name_en || item.menu_items?.name || 'Dish'}</span>
                            </div>
                            <span className="text-neutral-400">₹{((Number(item.unit_price) || Number(item.menu_items?.price) || 0) * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {isPending && (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleAcknowledgeBatch(batch.id)}
                          className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-black font-black uppercase text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3]" /> Dispatch to Kitchen KDS
                        </motion.button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Active Table Summary */}
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 space-y-1.5">
                <div className="flex justify-between text-neutral-400">
                  <span>Net Dishes Total:</span>
                  <span>₹{Number(selectedTable.activeSession?.total_amount || 0).toFixed(2)}</span>
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