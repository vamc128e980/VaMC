// @ts-nocheck
'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Check, 
  X, 
  LogOut, 
  MessageSquare,
  Plus,
  Minus,
  Droplets,
  Search,
  Hash,
  Trash2,
  ShieldCheck
} from 'lucide-react';

const fluidSpring = {
  type: 'spring',
  stiffness: 440,
  damping: 32,
  mass: 0.55
};

const triggerHaptic = (ms = 15) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
};

const playChimeTone = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(587.33, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.6);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.error('Audio play error:', e);
  }
};

export default function WaiterPanel() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [staffName, setStaffName] = useState('Floor Steward');

  // Core Data States
  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  // Selected Table & Action Modals
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingBatchId, setActionLoadingBatchId] = useState<string | null>(null);

  // Walk-in Direct Table Punching Modal
  const [showPunchOrderModal, setShowPunchOrderModal] = useState(false);
  const [punchTable, setPunchTable] = useState<any | null>(null);
  const [punchCart, setPunchCart] = useState<Record<number, number>>({});
  const [punchSearch, setPunchSearch] = useState('');
  const [punchNotes, setPunchNotes] = useState('');
  const [punchCustomerName, setPunchCustomerName] = useState('Walk-in Guest');
  const [punchCustomerPhone, setPunchCustomerPhone] = useState('9999999999');

  const [timeStr, setTimeStr] = useState('');

  // 1. Auth Guard
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
        localStorage.clear();
        document.cookie = 'staff_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
        document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
        setIsAuthenticated(false);
        setAuthChecking(false);
        window.location.replace('/login');
      }
    }
  }, []);

  // Live Digital Clock
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
      const [
        { data: tbls },
        { data: sess },
        { data: bths },
        { data: items },
        { data: calls },
        { data: mItems }
      ] = await Promise.all([
        supabase.from('restaurant_tables').select('*').order('table_number'),
        supabase.from('table_sessions').select('*').eq('status', 'active'),
        supabase.from('order_batches').select('*').order('created_at', { ascending: false }),
        supabase.from('order_items').select('*, menu_items(name_en, name, price)'),
        supabase.from('waiter_calls').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('menu_items').select('*').eq('is_available', true).order('name_en')
      ]);

      if (tbls) setTables(tbls);
      if (sess) setSessions(sess);
      if (bths) setBatches(bths);
      if (items) setOrderItems(items);
      if (calls) setWaiterCalls(calls);
      if (mItems) setMenuItems(mItems);
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_batches' }, () => {
          triggerHaptic(25);
          playChimeTone();
          loadWaiterData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadWaiterData())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waiter_calls' }, () => {
          triggerHaptic(50);
          playChimeTone();
          loadWaiterData();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'waiter_calls' }, () => loadWaiterData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    document.cookie = 'staff_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    window.location.replace('/');
  };

  // Recalculate Table Session Bill when waiter modifies dishes
  const recalculateSessionBill = async (sessionId: string) => {
    try {
      const { data: liveItems } = await supabase
        .from('order_items')
        .select('*, menu_items(price)')
        .eq('session_id', sessionId)
        .neq('item_status', 'cancelled');

      const newGross = (liveItems || []).reduce((sum, it) => {
        if (it.is_complimentary) return sum;
        const basePr = Number(it.unit_price || it.menu_items?.price || 0);
        let addOnsSum = 0;
        if (Array.isArray(it.selected_addons)) {
          addOnsSum = it.selected_addons.reduce((aSum: number, a: any) => aSum + Number(a.price || 0), 0);
        }
        return sum + (it.quantity * (basePr + addOnsSum));
      }, 0);

      await supabase.from('table_sessions').update({
        subtotal: newGross,
        total_amount: newGross,
        final_payable: newGross
      }).eq('id', sessionId);

      await loadWaiterData();
    } catch (err) {
      console.error('Session recalculate error:', err);
    }
  };

  // Waiter edits quantity before kitchen verification
  const handleModifyQuantity = async (orderItemId: number, currentQty: number, delta: number, sessionId: string) => {
    const nextQty = currentQty + delta;
    if (nextQty <= 0) return alert('Dish remove cheyalante "Remove" (Trash) button press cheyandi.');
    try {
      setLoading(true);
      await supabase.from('order_items').update({ quantity: nextQty }).eq('id', orderItemId);
      await recalculateSessionBill(sessionId);
    } catch (err: any) {
      alert('Qty error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Waiter cancels dish before kitchen verification
  const handleCancelDish = async (orderItemId: number, dishName: string, sessionId: string) => {
    if (!confirm(`"${dishName}" dish ni remove cheyala?`)) return;
    try {
      setLoading(true);
      await supabase.from('order_items').update({ item_status: 'cancelled' }).eq('id', orderItemId);
      await recalculateSessionBill(sessionId);
    } catch (err: any) {
      alert('Cancel failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // DIRECT VISUAL TOKEN VERIFICATION & DISPATCH TO KITCHEN
  const handleVerifyTokenAndSend = async (batch: any) => {
    setActionLoadingBatchId(batch.id);
    triggerHaptic(20);

    try {
      await supabase
        .from('order_batches')
        .update({ 
          status: 'sent_to_kitchen',
          pin_verified: true,
          verified_at: new Date().toISOString()
        })
        .eq('id', batch.id);

      await supabase
        .from('order_items')
        .update({ item_status: 'preparing' })
        .eq('batch_id', batch.id)
        .neq('item_status', 'cancelled');

      alert(`Token #${batch.order_pin || 'ORDER'} Verified for Table #${batch.table_number}! Sent to Kitchen.`);
      await loadWaiterData();

      if (selectedTable) {
        setSelectedTable(prev => prev ? {
          ...prev,
          tableBatches: prev.tableBatches?.map(b => b.id === batch.id ? { ...b, status: 'sent_to_kitchen' } : b)
        } : null);
      }
    } catch (err: any) {
      alert('Verification error: ' + err.message);
    } finally {
      setActionLoadingBatchId(null);
    }
  };

  // Mark Dish as Served
  const handleMarkItemServed = async (itemId: number) => {
    triggerHaptic(15);
    try {
      await supabase.from('order_items').update({ item_status: 'served' }).eq('id', itemId);
      setOrderItems(prev => prev.map(oi => oi.id === itemId ? { ...oi, item_status: 'served' } : oi));
      await loadWaiterData();
    } catch (err: any) {
      alert('Error marking served: ' + err.message);
    }
  };

  // Dismiss Waiter Call
  const handleDismissWaiterCall = async (callId: number) => {
    triggerHaptic(20);
    try {
      await supabase.from('waiter_calls').update({ status: 'attended' }).eq('id', callId);
      setWaiterCalls(prev => prev.filter(c => c.id !== callId));
    } catch (e) {
      console.error(e);
    }
  };

  // Direct Walk-In Punch Order to Table
  const handlePunchOrderSubmit = async () => {
    if (!punchTable) return;
    const itemIds = Object.keys(punchCart).filter(id => punchCart[Number(id)] > 0);
    if (itemIds.length === 0) return alert('At least 1 dish select cheyandi.');

    setLoading(true);
    triggerHaptic(35);
    try {
      const activeSession = sessions.find(s => s.table_number === punchTable.table_number && s.status === 'active');
      let sessionId = activeSession?.id;

      const punchTotal = itemIds.reduce((sum, id) => {
        const dish = menuItems.find(m => m.id === Number(id));
        return sum + (Number(dish?.price || 0) * punchCart[Number(id)]);
      }, 0);

      if (!sessionId) {
        const { data: newSession, error: sErr } = await supabase
          .from('table_sessions')
          .insert({
            table_number: punchTable.table_number,
            customer_name: punchCustomerName.trim() || 'Walk-in Guest',
            customer_phone: punchCustomerPhone.trim() || '9999999999',
            subtotal: punchTotal,
            cgst_amount: 0,
            sgst_amount: 0,
            total_amount: punchTotal,
            discount_amount: 0,
            final_payable: punchTotal,
            status: 'active',
            payment_status: 'unpaid'
          })
          .select()
          .single();

        if (sErr) throw sErr;
        sessionId = newSession.id;
        await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('table_number', punchTable.table_number);
      } else {
        const newTotal = Number(activeSession.total_amount || 0) + punchTotal;
        await supabase.from('table_sessions').update({
          subtotal: newTotal,
          total_amount: newTotal,
          final_payable: newTotal
        }).eq('id', sessionId);
      }

      // Punch by waiter is direct
      const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
      const { data: batch, error: bErr } = await supabase
        .from('order_batches')
        .insert({
          session_id: sessionId,
          table_number: punchTable.table_number,
          status: 'sent_to_kitchen',
          order_pin: randomPin,
          pin_verified: true,
          verified_at: new Date().toISOString()
        })
        .select()
        .single();

      if (bErr) throw bErr;

      const payload = itemIds.map(id => {
        const dish = menuItems.find(m => m.id === Number(id));
        return {
          batch_id: batch.id,
          session_id: sessionId,
          menu_item_id: Number(id),
          station_id: 'kitchen_hot',
          quantity: punchCart[Number(id)],
          unit_price: Number(dish?.price || 0),
          item_status: 'preparing',
          cooking_notes: punchNotes.trim() || null
        };
      });

      await supabase.from('order_items').insert(payload);

      setPunchCart({});
      setPunchNotes('');
      setShowPunchOrderModal(false);
      await loadWaiterData();
      alert(`Order punched to Table #${punchTable.table_number}! Dispatched to Kitchen.`);
    } catch (err: any) {
      alert('Punch error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(m => {
      const name = (m.name_en || m.name || '').toLowerCase();
      return name.includes(punchSearch.toLowerCase());
    });
  }, [menuItems, punchSearch]);

  if (authChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-2 border-white/10 border-t-[#D4AF37] rounded-full animate-spin" />
        <span className="text-[#D4AF37] font-mono text-xs tracking-widest uppercase font-bold">
          Verifying Waiter Session...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-[#FCF6BA] font-sans pb-28 relative overflow-x-hidden antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-2xl border-b border-[#D4AF37]/30 px-4 sm:px-6 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center shadow-lg shrink-0">
              <ChefHat className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-widest text-black uppercase bg-[#D4AF37] px-2.5 py-0.5 rounded-full shadow-sm">
                  FLOOR SERVICE
                </span>
                <h1 className="text-sm sm:text-base font-black tracking-wide text-white uppercase">
                  WAITER COMMAND
                </h1>
              </div>
              <p className="text-[10px] font-mono text-[#D4AF37] mt-0.5 font-bold">
                Staff: <span className="text-[#FCF6BA]">{staffName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-[#FCF6BA]">
              <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{timeStr || 'Live'}</span>
            </div>

            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={fluidSpring}
              onClick={loadWaiterData}
              className="p-2 rounded-xl border border-white/10 bg-white/[0.04] text-[#FCF6BA] hover:border-[#D4AF37]/40 transition cursor-pointer"
              title="Refresh Floor"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FCF6BA]' : ''}`} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={fluidSpring}
              onClick={handleLogout}
              className="p-2 rounded-xl bg-rose-950/20 border border-rose-500/40 text-rose-300 hover:bg-rose-950/50 transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* FLOATING "CALL WAITER" NOTIFICATIONS */}
      {waiterCalls.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-2">
          {waiterCalls.map((call) => {
            const matchingTable = tables.find(t => t.table_number === call.table_number);
            const tLabel = matchingTable?.table_name || `Table #${call.table_number}`;
            const isWater = call.call_type === 'water';
            const callStyle = isWater 
              ? 'border-cyan-500/60 bg-cyan-950/40 text-cyan-200' 
              : 'border-amber-500/60 bg-amber-950/40 text-amber-200';
            const callText = isWater 
              ? 'Needs Drinking Water 💧' 
              : 'Needs Waiter Assistance 🧑‍🍳';

            return (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-3.5 rounded-2xl border ${callStyle} shadow-xl flex items-center justify-between gap-3 font-mono text-xs backdrop-blur-xl animate-pulse`}
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 shrink-0 text-[#D4AF37]" />
                  <div>
                    <strong className="text-white text-sm block">{tLabel}</strong>
                    <span>{callText}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDismissWaiterCall(call.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-black font-black uppercase text-[10px] shadow-md hover:bg-[#FCF6BA] cursor-pointer"
                >
                  Mark Done ✓
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Main Floor Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
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
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-ping" /> New Token
            </span>
          </div>
        </div>

        {/* Dining Tables Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(t => {
            const activeSession = sessions.find(s => s.table_number === t.table_number && s.status === 'active');
            const isOccupied = !!activeSession;

            const tableBatches = batches.filter(b => b.table_number === t.table_number && b.session_id === activeSession?.id);
            const pendingBatch = tableBatches.find(b => b.status === 'pending_waiter');
            const grossTotal = Number(activeSession?.total_amount || 0);

            return (
              <motion.div
                key={t.id || t.table_number}
                layout
                whileHover={{ y: -3 }}
                transition={fluidSpring}
                className={`p-5 rounded-[28px] bg-gradient-to-b from-[#111114]/90 to-[#08080a]/90 border-[2px] transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                  pendingBatch
                    ? 'border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.25)] ring-2 ring-amber-400/40'
                    : isOccupied
                    ? 'border-[#D4AF37]/50 shadow-[0_8px_30px_rgba(212,175,55,0.15)]'
                    : 'border-white/[0.08] hover:border-[#D4AF37]/40'
                }`}
              >
                <div className={`absolute top-0 inset-x-0 h-1.5 ${
                  pendingBatch ? 'bg-amber-400 shadow-[0_0_12px_#fbbf24]' : isOccupied ? 'bg-[#D4AF37]' : 'bg-emerald-500'
                }`} />

                <div>
                  <div className="flex items-center justify-between mb-3 pt-1">
                    <div className="flex flex-col">
                      <span className="text-base font-black text-white">{t.table_name || `Table #${t.table_number}`}</span>
                      <span className="text-[10px] text-[#D4AF37] font-mono">({t.capacity || 4} Seats • #{t.table_number})</span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      pendingBatch
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400 animate-pulse'
                        : isOccupied
                        ? 'bg-[#D4AF37]/15 text-[#FCF6BA] border-[#D4AF37]/40'
                        : 'bg-emerald-950/30 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {pendingBatch ? 'Token Match!' : isOccupied ? 'Dining' : 'Available'}
                    </span>
                  </div>

                  {isOccupied ? (
                    <div className="space-y-2.5">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-3 text-xs space-y-1 font-mono">
                        <div className="flex justify-between text-neutral-400">
                          <span>Guest:</span>
                          <span className="font-bold text-white font-sans">{activeSession.customer_name || 'Guest'}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>Mobile:</span>
                          <span className="text-white">{activeSession.customer_phone || '-'}</span>
                        </div>
                        <div className="flex justify-between text-[#D4AF37] pt-1 border-t border-white/10">
                          <span>Flat Total (Zero GST):</span>
                          <span className="font-black text-[#FCF6BA] text-sm">₹{grossTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {pendingBatch && (
                        <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/40 text-[11px] font-mono text-amber-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Hash className="w-3.5 h-3.5" /> Token: #{pendingBatch.order_pin || 'NEW'}
                          </span>
                          <span className="bg-amber-400 text-black px-1.5 py-0.5 rounded text-[9px] font-black">
                            CONFIRM
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-emerald-400 font-mono flex flex-col items-center gap-1.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span>Table Vacant & Ready</span>
                    </div>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex gap-2 pt-3 border-t border-white/10 mt-3">
                  {isOccupied && (
                    <button
                      onClick={() => setSelectedTable({ ...t, activeSession, tableBatches })}
                      className="flex-1 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono font-bold text-white text-center cursor-pointer"
                    >
                      {pendingBatch ? 'Match & Verify' : 'View Ledger'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setPunchTable(t);
                      setPunchCart({});
                      setPunchCustomerName(activeSession?.customer_name || 'Walk-in Guest');
                      setPunchCustomerPhone(activeSession?.customer_phone || '9999999999');
                      setShowPunchOrderModal(true);
                    }}
                    className="flex-1 py-2 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/40 text-xs font-mono font-bold text-[#FCF6BA] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Punch Dish
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* MODAL 1: Table Service Ledger, Visual Token Matching & Dish Modifiers */}
      <AnimatePresence>
        {selectedTable && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={fluidSpring}
              className="w-full max-w-lg bg-[#0d0d0f] border border-[#D4AF37]/50 rounded-[32px] p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto custom-gold-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#D4AF37]" /> {selectedTable.table_name || `Table #${selectedTable.table_number}`}
                  </h3>
                  <span className="text-xs text-neutral-400 font-mono">
                    Guest: {selectedTable.activeSession?.customer_name || 'Guest'} ({selectedTable.activeSession?.customer_phone || '-'})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Running Batches List */}
              <div className="space-y-4">
                {selectedTable.tableBatches?.map((batch, bIdx) => {
                  const bItems = orderItems.filter(oi => oi.batch_id === batch.id && oi.item_status !== 'cancelled');
                  const isPending = batch.status === 'pending_waiter';

                  return (
                    <div 
                      key={batch.id} 
                      className={`p-4 rounded-2xl border transition ${
                        isPending 
                          ? 'bg-amber-950/20 border-amber-400 shadow-md' 
                          : 'bg-white/[0.02] border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white font-mono">
                            Batch #{bIdx + 1}
                          </span>
                          {batch.order_pin && (
                            <span className="px-2 py-0.5 rounded-md bg-black border border-amber-400/50 text-amber-300 font-mono text-[11px] font-black">
                              Token #{batch.order_pin}
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          isPending 
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400 animate-pulse' 
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                        }`}>
                          {isPending ? 'Awaiting Steward Check' : 'In Kitchen'}
                        </span>
                      </div>

                      {/* Dishes in this batch */}
                      <div className="space-y-2 divide-y divide-white/5 text-xs">
                        {bItems.map(item => {
                          const dPrice = Number(item.unit_price || item.menu_items?.price || 0);
                          const addOnsCost = Array.isArray(item.selected_addons)
                            ? item.selected_addons.reduce((sum: number, a: any) => sum + Number(a.price || 0), 0)
                            : 0;
                          const lineTotal = item.is_complimentary ? 0 : (dPrice + addOnsCost) * item.quantity;
                          const dName = item.menu_items?.name_en || item.menu_items?.name || 'Dish #' + item.menu_item_id;

                          return (
                            <div key={item.id} className="pt-2 flex flex-col gap-1.5">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white">
                                      {dName} {item.selected_weight_variant ? `(${item.selected_weight_variant})` : ''}
                                    </span>
                                    {item.is_complimentary && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                                        FREE
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-[11px] text-[#FCF6BA]">
                                    {item.is_complimentary ? 'FREE' : `₹${lineTotal.toFixed(2)}`}
                                  </span>
                                </div>

                                {/* Steward modifier buttons for pending items */}
                                {isPending ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleModifyQuantity(item.id, item.quantity, -1, selectedTable.activeSession?.id)}
                                      className="p-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-mono font-bold text-white px-1">{item.quantity}</span>
                                    <button
                                      onClick={() => handleModifyQuantity(item.id, item.quantity, 1, selectedTable.activeSession?.id)}
                                      className="p-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleCancelDish(item.id, dName, selectedTable.activeSession?.id)}
                                      className="p-1 rounded-lg bg-rose-950/40 text-rose-300 hover:bg-rose-950/70 ml-1"
                                      title="Remove Dish"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-black bg-[#D4AF37] px-1.5 py-0.5 rounded text-[10px]">
                                      {item.quantity}x
                                    </span>
                                    {item.item_status !== 'served' ? (
                                      <button
                                        onClick={() => handleMarkItemServed(item.id)}
                                        className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-emerald-950/50 hover:text-emerald-300 text-[10px] font-mono border border-white/10 cursor-pointer"
                                      >
                                        Mark Served ✓
                                      </button>
                                    ) : (
                                      <span className="text-emerald-400 text-[10px] font-mono font-bold">Served</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Selected Add-ons Badges */}
                              {Array.isArray(item.selected_addons) && item.selected_addons.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.selected_addons.map((a: any, aIdx: number) => (
                                    <span key={aIdx} className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[9px] font-mono">
                                      + {a.name}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {item.cooking_notes && (
                                <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-950/30 px-2 py-0.5 rounded-lg border border-amber-500/30 font-sans">
                                  <MessageSquare className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>Note: {item.cooking_notes}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* ONE-TAP VERIFY & DISPATCH */}
                      {isPending && (
                        <div className="mt-3 pt-3 border-t border-amber-400/30 flex items-center justify-between gap-3">
                          <span className="text-[11px] font-mono text-neutral-300">
                            Guest Token: <strong className="text-amber-300 font-black">#{batch.order_pin || 'NEW'}</strong>
                          </span>

                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            disabled={actionLoadingBatchId === batch.id}
                            onClick={() => handleVerifyTokenAndSend(batch)}
                            className="px-4 py-2.5 rounded-xl bg-amber-400 text-black font-black uppercase text-xs shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {actionLoadingBatchId === batch.id ? (
                              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Verify & Send to Kitchen</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total Summary */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs font-mono space-y-1">
                <div className="flex justify-between text-neutral-400">
                  <span>Gross Flat Amount (Zero GST):</span>
                  <span className="text-white">₹{Number(selectedTable.activeSession?.total_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-white/10">
                  <span>Final Net Settle:</span>
                  <span className="text-[#D4AF37] font-mono text-base">₹{Number(selectedTable.activeSession?.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Direct Walk-In Order Punching */}
      <AnimatePresence>
        {showPunchOrderModal && punchTable && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={fluidSpring}
              className="w-full max-w-lg bg-[#0d0d0f] border border-[#D4AF37]/50 rounded-[32px] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-gold-scrollbar font-mono text-xs"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-black text-white uppercase">
                    Punch Order ➔ {punchTable.table_name || `Table #${punchTable.table_number}`}
                  </h3>
                  <span className="text-[11px] text-[#D4AF37]">Direct Offline Order to Kitchen</span>
                </div>
                <button onClick={() => setShowPunchOrderModal(false)} className="cursor-pointer"><X className="w-5 h-5 text-neutral-400" /></button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dish name..."
                  value={punchSearch}
                  onChange={(e) => setPunchSearch(e.target.value)}
                  className="w-full bg-[#161619] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white outline-none"
                />
              </div>

              <div className="max-h-52 overflow-y-auto custom-gold-scrollbar space-y-1.5 p-2 bg-black/40 border border-white/5 rounded-2xl">
                {filteredMenuItems.map(dish => {
                  const qty = punchCart[dish.id] || 0;
                  return (
                    <div key={dish.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">{dish.name_en || dish.name}</span>
                        <span className="text-[#D4AF37] font-bold">₹{Number(dish.price).toFixed(2)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {qty > 0 && (
                          <button
                            onClick={() => setPunchCart({ ...punchCart, [dish.id]: qty - 1 })}
                            className="p-1 rounded-lg bg-white/[0.05] text-white cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {qty > 0 && <span className="font-black text-white px-1">{qty}</span>}
                        <button
                          onClick={() => setPunchCart({ ...punchCart, [dish.id]: qty + 1 })}
                          className="p-1 rounded-lg bg-[#D4AF37] text-black font-black cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Cooking Instructions / Notes (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Less ice, no sugar, parcel..."
                  value={punchNotes}
                  onChange={(e) => setPunchNotes(e.target.value)}
                  className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={loading}
                onClick={handlePunchOrderSubmit}
                className="w-full py-3.5 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-lg cursor-pointer"
              >
                {loading ? 'Punching to Kitchen...' : 'Confirm & Dispatch to Kitchen'}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}