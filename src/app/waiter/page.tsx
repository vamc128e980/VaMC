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
  Sparkles, 
  AlertCircle,
  Eye, 
  Check, 
  X, 
  LogOut, 
  User, 
  Phone,
  Tag
} from 'lucide-react';

// 90FPS GPU-Accelerated Springs
const fps90Spring = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.55
};

const fps90ModalSpring = {
  type: 'spring',
  stiffness: 380,
  damping: 30,
  mass: 0.65
};

export default function WaiterPanel() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [staffName, setStaffName] = useState('Floor Steward');
  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingBatchId, setActionLoadingBatchId] = useState<string | null>(null);

  const [timeStr, setTimeStr] = useState('');

  // 1. Solid Auth Guard
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rawCookies = document.cookie || '';
    const cookies = rawCookies.split(';').map(c => c.trim());
    const roleCookie = cookies.find(c => c.startsWith('staff_role='));
    const cookieRole = roleCookie ? roleCookie.split('=')[1]?.toLowerCase() : null;
    const localRole = localStorage.getItem('staff_role')?.toLowerCase();
    const token = localStorage.getItem('session_token');
    const storedName = localStorage.getItem('staff_name');

    if (storedName) setStaffName(storedName);

    const activeRole = cookieRole || localRole;
    const hasValidToken = token && (token.startsWith('waiter_verified_') || token.startsWith('admin_verified_'));

    if ((activeRole === 'waiter' || activeRole === 'admin') && hasValidToken) {
      if (!cookieRole) {
        document.cookie = `staff_role=${activeRole}; path=/; max-age=86400; SameSite=Lax`;
      }
      setIsAuthenticated(true);
      setAuthChecking(false);
    } else {
      localStorage.removeItem('staff_role');
      localStorage.removeItem('staff_name');
      localStorage.removeItem('session_token');
      document.cookie = 'staff_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
      document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
      setIsAuthenticated(false);
      setAuthChecking(false);
      window.location.replace('/login');
    }
  }, []);

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
      console.error('Waiter data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadWaiterData();

      const channel = supabase
        .channel(`waiter-sync-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => loadWaiterData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => loadWaiterData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_batches' }, () => loadWaiterData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadWaiterData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  // ISSUE 2 FIXED: Logout redirects directly to Main Landing Page '/'
  const handleLogout = () => {
    document.cookie = 'staff_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    window.location.replace('/');
  };

  const handleAcknowledgeBatch = async (batchId: string) => {
    setActionLoadingBatchId(batchId);
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
      if (selectedTable) {
        setSelectedTable(prev => prev ? {
          ...prev,
          tableBatches: prev.tableBatches?.map(b => b.id === batchId ? { ...b, status: 'sent_to_kitchen' } : b)
        } : null);
      }
    } catch (err: any) {
      alert('Error updating batch: ' + err.message);
    } finally {
      setActionLoadingBatchId(null);
    }
  };

  if (authChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-[3px] border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
        <span className="text-[#D4AF37] font-mono text-xs tracking-widest uppercase font-bold">
          Verifying Waiter Session...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#FCF6BA] font-sans pb-28 relative overflow-x-hidden antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black border-b-[3px] border-[#D4AF37] px-4 sm:px-6 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black border-[3px] border-[#D4AF37] flex items-center justify-center shadow-lg shrink-0">
              <ChefHat className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-widest text-black uppercase bg-[#D4AF37] px-2.5 py-0.5 rounded-full shadow-sm">
                  FLOOR SERVICE
                </span>
                <h1 className="text-sm sm:text-base font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#FCF6BA] via-[#F3E5AB] to-[#D4AF37] uppercase">
                  WAITER COMMAND
                </h1>
              </div>
              <p className="text-[10px] font-mono text-[#D4AF37] mt-0.5 font-bold">
                Staff: <span className="text-[#FCF6BA]">{staffName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 bg-black border-2 border-[#D4AF37]/50 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-[#FCF6BA]">
              <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{timeStr || 'Live'}</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              transition={fps90Spring}
              onClick={loadWaiterData}
              className="p-2 rounded-xl border-[3px] border-[#D4AF37] bg-black text-[#FCF6BA] hover:bg-[#D4AF37]/20 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FCF6BA]' : ''}`} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              transition={fps90Spring}
              onClick={handleLogout}
              className="p-2 rounded-xl bg-black border-[3px] border-rose-500 text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
              title="Logout to Main Panel"
            >
              <LogOut className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Floor Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-[#FCF6BA] uppercase tracking-wider flex items-center gap-2 font-mono">
            <Utensils className="w-4 h-4 text-[#D4AF37]" /> Dining Tables Matrix
          </h2>

          <div className="flex items-center gap-3 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /> Vacant
            </span>
            <span className="flex items-center gap-1.5 text-[#F3E5AB]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]" /> Dining
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-ping" /> New Order
            </span>
          </div>
        </div>

        {/* Black & Gold Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(t => {
            const activeSession = sessions.find(s => s.table_number === t.table_number && s.status === 'active');
            const isOccupied = !!activeSession;

            const tableBatches = batches.filter(b => b.table_number === t.table_number && b.session_id === activeSession?.id);
            const hasPendingAction = tableBatches.some(b => b.status === 'pending_waiter');

            // ISSUE 1 FIXED: Exact Final Payable calculation with discount
            const grossTotal = Number(activeSession?.total_amount || 0);
            const discount = Number(activeSession?.discount_amount || 0);
            const payableTotal = Math.max(0, grossTotal - discount);

            return (
              <motion.div
                key={t.id || t.table_number}
                layout
                whileHover={{ y: -3 }}
                transition={fps90Spring}
                onClick={() => isOccupied && setSelectedTable({ ...t, activeSession, tableBatches })}
                className={`p-5 rounded-[28px] bg-black border-[3px] transition-all duration-300 relative overflow-hidden cursor-pointer ${
                  hasPendingAction
                    ? 'border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.35)] ring-2 ring-amber-400/40'
                    : isOccupied
                    ? 'border-[#D4AF37] shadow-[0_8px_30px_rgba(212,175,55,0.25)]'
                    : 'border-[#D4AF37]/40 hover:border-[#D4AF37]'
                }`}
              >
                <div className={`absolute top-0 inset-x-0 h-1.5 ${
                  hasPendingAction ? 'bg-amber-400 shadow-[0_0_12px_#fbbf24]' : isOccupied ? 'bg-[#D4AF37] shadow-[0_0_12px_#D4AF37]' : 'bg-emerald-500 shadow-[0_0_12px_#10b981]'
                }`} />

                <div className="flex items-center justify-between mb-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-white">Table #{t.table_number}</span>
                    <span className="text-[11px] text-[#D4AF37] font-mono">({t.capacity || 4} Seats)</span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border-2 ${
                    hasPendingAction
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400 animate-pulse'
                      : isOccupied
                      ? 'bg-black text-[#FCF6BA] border-[#D4AF37]'
                      : 'bg-black text-emerald-300 border-emerald-500'
                  }`}>
                    {hasPendingAction ? 'New Order!' : isOccupied ? 'Dining' : 'Available'}
                  </span>
                </div>

                {isOccupied ? (
                  <div className="space-y-2.5">
                    <div className="bg-black border-2 border-[#D4AF37]/40 rounded-2xl p-3 text-xs space-y-1 font-mono">
                      <div className="flex justify-between text-[#D4AF37]">
                        <span>Guest:</span>
                        <span className="font-bold text-[#FCF6BA] font-sans">{activeSession.customer_name || 'Guest'}</span>
                      </div>
                      <div className="flex justify-between text-[#D4AF37]">
                        <span>Mobile:</span>
                        <span className="text-white">{activeSession.customer_phone || '-'}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Discount Applied:</span>
                          <span>- ₹{discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[#D4AF37] pt-1 border-t border-[#D4AF37]/25">
                        <span>Net Payable:</span>
                        <span className="font-black text-[#FCF6BA] text-sm">₹{payableTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-[#FCF6BA] pt-1">
                      <span className="font-mono text-[#D4AF37]">{tableBatches.length} Batches Sent</span>
                      <span className="underline hover:text-white">View Dishes ➔</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-emerald-400 font-mono flex flex-col items-center gap-1.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <span>Table Vacant & Ready</span>
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
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={fps90ModalSpring}
              className="w-full max-w-lg bg-black border-[3px] border-[#D4AF37] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-gold-scrollbar"
            >
              <div className="flex items-center justify-between border-b-2 border-[#D4AF37]/30 pb-3">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#D4AF37]" /> Table #{selectedTable.table_number} Service Ledger
                  </h3>
                  <span className="text-xs text-[#D4AF37] font-mono">
                    Guest: {selectedTable.activeSession?.customer_name || 'Guest'} ({selectedTable.activeSession?.customer_phone || '-'})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="p-1 rounded-full text-[#D4AF37] hover:text-[#FCF6BA]"
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
                      className={`p-4 rounded-2xl border-2 transition ${
                        isPending 
                          ? 'bg-amber-950/30 border-amber-400 shadow-md' 
                          : 'bg-black border-[#D4AF37]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-white font-mono">
                          Order Batch #{bIdx + 1}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border-2 ${
                          isPending 
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400 animate-pulse' 
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                        }`}>
                          {isPending ? 'Pending Waiter Approval' : 'Sent to Kitchen'}
                        </span>
                      </div>

                      <div className="space-y-1.5 divide-y divide-white/10 text-xs">
                        {bItems.map(item => (
                          <div key={item.id} className="pt-1.5 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-black bg-[#D4AF37] px-1.5 py-0.5 rounded">
                                {item.quantity}x
                              </span>
                              <span className="text-white font-bold">{item.menu_items?.name_en || 'Dish'}</span>
                            </div>
                            <span className="font-mono text-[#FCF6BA]">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {isPending && (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          transition={fps90Spring}
                          disabled={actionLoadingBatchId === batch.id}
                          onClick={() => handleAcknowledgeBatch(batch.id)}
                          className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {actionLoadingBatchId === batch.id ? (
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" /> Dispatch to Kitchen KDS
                            </>
                          )}
                        </motion.button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Active Table Summary with ISSUE 1 Fixed */}
              {(() => {
                const sub = Number(selectedTable.activeSession?.subtotal || 0);
                const gross = Number(selectedTable.activeSession?.total_amount || 0);
                const disc = Number(selectedTable.activeSession?.discount_amount || 0);
                const finalPay = Math.max(0, gross - disc);

                return (
                  <div className="p-4 rounded-2xl bg-black border-2 border-[#D4AF37]/50 text-xs font-mono space-y-1.5">
                    <div className="flex justify-between text-[#D4AF37]">
                      <span>Dishes Gross Total:</span>
                      <span>₹{gross.toFixed(2)}</span>
                    </div>
                    {disc > 0 && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Mystery PIN Discount:</span>
                        <span>- ₹{disc.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#D4AF37]">
                      <span>GST (5% Inclusive):</span>
                      <span>₹{(Number(selectedTable.activeSession?.cgst_amount || 0) + Number(selectedTable.activeSession?.sgst_amount || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white font-black text-sm pt-2 border-t-2 border-[#D4AF37]/35">
                      <span>Final Net Settle:</span>
                      <span className="text-[#FCF6BA] font-mono text-base">₹{finalPay.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}