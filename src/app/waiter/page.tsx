'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Check, 
  X, 
  LogOut, 
  MessageSquare,
  Plus,
  Minus,
  Search,
  Hash,
  Trash2,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

const fluidSpring = {
  type: 'spring' as const,
  stiffness: 440,
  damping: 32,
  mass: 0.55
};

const triggerHaptic = (ms = 15) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch {}
  }
};

interface PunchCartEntry {
  key: string;
  menuItem: any;
  quantity: number;
  selectedAddons: any[];
  selectedWeightVariant: any | null;
}

export default function WaiterPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [staffName, setStaffName] = useState('Floor Steward');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(prev => (prev === msg ? null : prev)), 3200);
  };

  // Shared AudioContext
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playChimeTone = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(587.33, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.55);
      osc2.stop(ctx.currentTime + 0.55);
    } catch (e) {
      console.error('Audio play error:', e);
    }
  }, []);

  // Core Data States
  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);

  // Selected Table & Action Modals
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingBatchId, setActionLoadingBatchId] = useState<string | null>(null);

  // Walk-in Direct Table Punching Modal (Grid + Categories + Add-ons)
  const [showPunchOrderModal, setShowPunchOrderModal] = useState(false);
  const [punchTable, setPunchTable] = useState<any | null>(null);
  const [punchCart, setPunchCart] = useState<PunchCartEntry[]>([]);
  const [punchCategory, setPunchCategory] = useState<number | 'all'>('all');
  const [punchSearch, setPunchSearch] = useState('');
  const [punchNotes, setPunchNotes] = useState('');
  const [punchCustomerName, setPunchCustomerName] = useState('Walk-in Guest');
  const [punchCustomerPhone, setPunchCustomerPhone] = useState('9999999999');

  // Add-on / Variant Customization Drawer inside Punch Modal
  const [customizingPunchItem, setCustomizingPunchItem] = useState<any | null>(null);
  const [selectedPunchAddonIds, setSelectedPunchAddonIds] = useState<number[]>([]);
  const [selectedPunchVariant, setSelectedPunchVariant] = useState<any | null>(null);

  const [timeStr, setTimeStr] = useState('');

  // 1. ROBUST AUTH GUARD SYNCED WITH /api/auth/login/verify + staff_role COOKIE
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let active = true;

    const verifySession = async () => {
      try {
        const res = await fetch('/api/auth/login/verify', {
          method: 'GET',
          credentials: 'same-origin',
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (res.ok) {
          const data = await res.json();
          if (!active) return;
          if (data?.authenticated && (data?.role === 'waiter' || data?.role === 'admin')) {
            setStaffName(data.name || localStorage.getItem('staff_name') || 'Floor Steward');
            setIsAuthenticated(true);
            setAuthChecking(false);
            return;
          }
        }
      } catch {
        // Fallback cookie check below
      }

      const roleCookie = document.cookie
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith('staff_role='))
        ?.split('=')[1]
        ?.toLowerCase();

      if (!active) return;
      if (roleCookie === 'waiter' || roleCookie === 'admin') {
        setStaffName(localStorage.getItem('staff_name') || 'Floor Steward');
        setIsAuthenticated(true);
        setAuthChecking(false);
      } else {
        localStorage.clear();
        document.cookie = 'staff_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
        document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
        setIsAuthenticated(false);
        setAuthChecking(false);
        window.location.replace('/login?role=waiter');
      }
    };

    verifySession();
    return () => {
      active = false;
    };
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

  const loadFloorState = useCallback(async () => {
    try {
      const [
        { data: tbls, error: tErr },
        { data: sess, error: sErr },
        { data: calls, error: cErr }
      ] = await Promise.all([
        supabase.from('restaurant_tables').select('*').order('table_number'),
        supabase.from('table_sessions').select('*').eq('status', 'active'),
        supabase.from('waiter_calls').select('*').eq('status', 'pending').order('created_at', { ascending: false })
      ]);

      if (tErr) throw tErr;
      if (sErr) throw sErr;
      if (cErr) throw cErr;

      if (tbls) setTables(tbls);
      if (calls) setWaiterCalls(calls);

      const activeSess = sess || [];
      setSessions(activeSess);

      const activeSessionIds = activeSess.map((s: any) => s.id);
      if (activeSessionIds.length > 0) {
        const [
          { data: bths, error: bErr },
          { data: items, error: iErr }
        ] = await Promise.all([
          supabase.from('order_batches').select('*').in('session_id', activeSessionIds).order('created_at', { ascending: true }),
          supabase.from('order_items').select('*, menu_items(name_en, name, price)').in('session_id', activeSessionIds)
        ]);
        if (bErr) throw bErr;
        if (iErr) throw iErr;
        setBatches(bths || []);
        setOrderItems(items || []);
      } else {
        setBatches([]);
        setOrderItems([]);
      }
    } catch (err) {
      console.error('Waiter floor sync error:', err);
    }
  }, []);

  const loadMenuAndAddons = useCallback(async () => {
    try {
      const [
        { data: cats },
        { data: mItems },
        { data: adns }
      ] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('menu_items').select('*').eq('is_available', true).order('id', { ascending: true }),
        supabase.from('menu_addons').select('*').eq('is_available', true).order('id', { ascending: true })
      ]);

      if (cats && cats.length > 0) {
        setCategories(cats);
        setPunchCategory(prev => (prev === 'all' ? cats[0].id : prev));
      }
      if (mItems) setMenuItems(mItems);
      if (adns) setAddons(adns);
    } catch (err) {
      console.error('Menu fetch error:', err);
    }
  }, []);

  const loadWaiterData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadFloorState(), loadMenuAndAddons()]);
    } finally {
      setLoading(false);
    }
  }, [loadFloorState, loadMenuAndAddons]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadWaiterData();

    const channel = supabase
      .channel('waiter-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => loadFloorState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => loadFloorState())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_batches' }, () => {
        triggerHaptic(25);
        playChimeTone();
        loadFloorState();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_batches' }, () => loadFloorState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadFloorState())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'waiter_calls' }, () => {
        triggerHaptic(50);
        playChimeTone();
        loadFloorState();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'waiter_calls' }, () => loadFloorState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => loadMenuAndAddons())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_addons' }, () => loadMenuAndAddons())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => loadMenuAndAddons())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, loadWaiterData, loadFloorState, loadMenuAndAddons, playChimeTone]);

  // SECURE LOGOUT FUNCTION SYNCED WITH /api/auth/login/verify
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/login/verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch (e) {
      console.error('Logout error', e);
    }
    document.cookie = 'staff_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    window.location.replace('/login?role=waiter');
  };

  const recalculateSessionBill = async (sessionId: string) => {
    try {
      const { data: liveItems, error: fErr } = await supabase
        .from('order_items')
        .select('*, menu_items(price)')
        .eq('session_id', sessionId)
        .neq('item_status', 'cancelled');
      if (fErr) throw fErr;

      const newGross = (liveItems || []).reduce((sum, it) => {
        if (it.is_complimentary) return sum;
        const basePr = Number(it.unit_price || it.menu_items?.price || 0);
        let addOnsSum = 0;
        if (Array.isArray(it.selected_addons)) {
          addOnsSum = it.selected_addons.reduce((aSum: number, a: any) => aSum + Number(a.price || 0), 0);
        }
        return sum + (it.quantity * (basePr + addOnsSum));
      }, 0);

      const { error: uErr } = await supabase.from('table_sessions').update({
        subtotal: newGross,
        total_amount: newGross,
        final_payable: newGross
      }).eq('id', sessionId);
      if (uErr) throw uErr;

      await loadFloorState();
    } catch (err) {
      console.error('Session recalculate error:', err);
    }
  };

  const handleModifyQuantity = async (orderItemId: number, currentQty: number, delta: number, sessionId: string) => {
    if (loading) return;
    const nextQty = currentQty + delta;
    if (nextQty <= 0) return showToast('Use the Trash icon to remove a dish completely.');
    try {
      setLoading(true);
      const { error } = await supabase.from('order_items').update({ quantity: nextQty }).eq('id', orderItemId);
      if (error) throw error;
      await recalculateSessionBill(sessionId);
    } catch (err: any) {
      alert('Qty error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDish = async (orderItemId: number, dishName: string, sessionId: string) => {
    if (loading) return;
    if (!confirm(`"${dishName}" dish ni remove cheyala?`)) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('order_items').update({ item_status: 'cancelled' }).eq('id', orderItemId);
      if (error) throw error;
      await recalculateSessionBill(sessionId);
      showToast(`Removed ${dishName}`);
    } catch (err: any) {
      alert('Cancel failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTokenAndSend = async (batch: any) => {
    if (actionLoadingBatchId) return;
    setActionLoadingBatchId(batch.id);
    triggerHaptic(20);

    try {
      const { error: bErr } = await supabase
        .from('order_batches')
        .update({ 
          status: 'sent_to_kitchen',
          pin_verified: true,
          verified_at: new Date().toISOString()
        })
        .eq('id', batch.id);
      if (bErr) throw bErr;

      const { error: iErr } = await supabase
        .from('order_items')
        .update({ item_status: 'preparing' })
        .eq('batch_id', batch.id)
        .neq('item_status', 'cancelled');
      if (iErr) throw iErr;

      showToast(`Token #${batch.order_pin || 'ORDER'} verified for Table #${batch.table_number}!`);
      await loadFloorState();
    } catch (err: any) {
      alert('Verification error: ' + err.message);
    } finally {
      setActionLoadingBatchId(null);
    }
  };

  const handleMarkItemServed = async (itemId: number) => {
    triggerHaptic(15);
    try {
      const { error } = await supabase.from('order_items').update({ item_status: 'served' }).eq('id', itemId);
      if (error) throw error;
      setOrderItems(prev => prev.map(oi => oi.id === itemId ? { ...oi, item_status: 'served' } : oi));
    } catch (err: any) {
      alert('Error marking served: ' + err.message);
    }
  };

  const handleDismissWaiterCall = async (callId: number) => {
    triggerHaptic(20);
    try {
      const { error } = await supabase.from('waiter_calls').update({ status: 'attended' }).eq('id', callId);
      if (error) throw error;
      setWaiterCalls(prev => prev.filter(c => c.id !== callId));
    } catch (e) {
      console.error(e);
    }
  };

  // =========================================================
  // PUNCH CART HELPERS (WITH ADD-ONS & WEIGHT VARIANTS)
  // =========================================================
  const addPunchCartItem = (dish: any, chosenAddons: any[] = [], chosenVariant: any = null) => {
    triggerHaptic(15);
    const sortedAddonIds = chosenAddons.map(a => Number(a.id)).sort().join(',');
    const variantKey = chosenVariant?.size || 'std';
    const key = `${dish.id}-${variantKey}-${sortedAddonIds}`;

    setPunchCart(prev => {
      const existing = prev.find(e => e.key === key);
      if (existing) {
        return prev.map(e => e.key === key ? { ...e, quantity: e.quantity + 1 } : e);
      }
      return [...prev, {
        key,
        menuItem: dish,
        quantity: 1,
        selectedAddons: chosenAddons,
        selectedWeightVariant: chosenVariant
      }];
    });
  };

  const updatePunchCartQty = (key: string, delta: number) => {
    triggerHaptic(10);
    setPunchCart(prev =>
      prev
        .map(e => e.key === key ? { ...e, quantity: e.quantity + delta } : e)
        .filter(e => e.quantity > 0)
    );
  };

  const handlePunchTileClick = (dish: any) => {
    const applicableAddons = dish.has_addons
      ? addons.filter(a => Array.isArray(dish.addon_ids) ? dish.addon_ids.map(Number).includes(Number(a.id)) : true)
      : [];
    const hasVariants = dish.is_retail_item && Array.isArray(dish.weight_variants) && dish.weight_variants.length > 0;

    if (applicableAddons.length > 0 || hasVariants) {
      setCustomizingPunchItem(dish);
      setSelectedPunchAddonIds([]);
      setSelectedPunchVariant(hasVariants ? dish.weight_variants[0] : null);
    } else {
      addPunchCartItem(dish, [], null);
    }
  };

  const confirmPunchCustomization = () => {
    if (!customizingPunchItem) return;
    const chosenAddons = addons.filter(a => selectedPunchAddonIds.includes(Number(a.id)));
    addPunchCartItem(customizingPunchItem, chosenAddons, selectedPunchVariant);
    setCustomizingPunchItem(null);
    setSelectedPunchAddonIds([]);
    setSelectedPunchVariant(null);
  };

  const punchCartTotal = useMemo(() => {
    return punchCart.reduce((sum, entry) => {
      const basePr = Number(entry.selectedWeightVariant ? entry.selectedWeightVariant.price : entry.menuItem.price || 0);
      const addonsPr = entry.selectedAddons.reduce((aSum, a) => aSum + Number(a.price || 0), 0);
      return sum + ((basePr + addonsPr) * entry.quantity);
    }, 0);
  }, [punchCart]);

  const handlePunchOrderSubmit = async () => {
    if (!punchTable || loading) return;
    if (punchCart.length === 0) return showToast('At least 1 dish select cheyandi.');

    setLoading(true);
    triggerHaptic(35);
    try {
      const { data: liveSession } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('table_number', punchTable.table_number)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let sessionId = liveSession?.id;

      if (!sessionId) {
        const { data: newSession, error: sErr } = await supabase
          .from('table_sessions')
          .insert({
            table_number: punchTable.table_number,
            customer_name: punchCustomerName.trim() || 'Walk-in Guest',
            customer_phone: punchCustomerPhone.trim() || '9999999999',
            subtotal: punchCartTotal,
            cgst_amount: 0,
            sgst_amount: 0,
            total_amount: punchCartTotal,
            discount_amount: 0,
            final_payable: punchCartTotal,
            status: 'active',
            payment_status: 'unpaid'
          })
          .select()
          .single();

        if (sErr) throw sErr;
        sessionId = newSession.id;
        await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('table_number', punchTable.table_number);
      }

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

      const payload = punchCart.map(entry => {
        const basePr = Number(entry.selectedWeightVariant ? entry.selectedWeightVariant.price : entry.menuItem.price || 0);
        return {
          batch_id: batch.id,
          session_id: sessionId,
          menu_item_id: entry.menuItem.id,
          station_id: 'kitchen_hot',
          quantity: entry.quantity,
          unit_price: basePr,
          item_status: 'preparing',
          cooking_notes: punchNotes.trim() || null,
          selected_addons: entry.selectedAddons,
          selected_weight_variant: entry.selectedWeightVariant?.size || null
        };
      });

      const { error: oiErr } = await supabase.from('order_items').insert(payload);
      if (oiErr) throw oiErr;

      await recalculateSessionBill(sessionId);

      setPunchCart([]);
      setPunchNotes('');
      setShowPunchOrderModal(false);
      showToast(`Order punched to Table #${punchTable.table_number}!`);
    } catch (err: any) {
      alert('Punch error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pre-index orderItems by batch_id
  const itemsByBatch = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const oi of orderItems) {
      if (oi.item_status === 'cancelled') continue;
      if (!map[oi.batch_id]) map[oi.batch_id] = [];
      map[oi.batch_id].push(oi);
    }
    return map;
  }, [orderItems]);

  const selectedTableLive = useMemo(() => {
    if (selectedTableNumber === null) return null;
    const tbl = tables.find(t => t.table_number === selectedTableNumber);
    if (!tbl) return null;
    const activeSession = sessions.find(s => s.table_number === selectedTableNumber && s.status === 'active');
    if (!activeSession) return null;
    const tableBatches = batches.filter(b => b.table_number === selectedTableNumber && b.session_id === activeSession.id);
    return { ...tbl, activeSession, tableBatches };
  }, [selectedTableNumber, tables, sessions, batches]);

  const filteredPunchMenuItems = useMemo(() => {
    return menuItems.filter(m => {
      const name = (m.name_en || m.name || '').toLowerCase();
      if (punchSearch.trim()) {
        return name.includes(punchSearch.toLowerCase());
      }
      if (punchCategory === 'all') return true;
      return m.category_id === punchCategory;
    });
  }, [menuItems, punchSearch, punchCategory]);

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
      {/* Non-blocking Toast Banner */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-[80] px-4 py-3 rounded-2xl bg-[#111115] border border-[#D4AF37] text-[#FCF6BA] font-mono text-xs font-bold shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
                      onClick={() => setSelectedTableNumber(t.table_number)}
                      className="flex-1 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono font-bold text-white text-center cursor-pointer"
                    >
                      {pendingBatch ? 'Match & Verify' : 'View Ledger'}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setPunchTable(t);
                      setPunchCart([]);
                      setPunchSearch('');
                      setPunchNotes('');
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
        {selectedTableLive && (
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
                    <Receipt className="w-5 h-5 text-[#D4AF37]" /> {selectedTableLive.table_name || `Table #${selectedTableLive.table_number}`}
                  </h3>
                  <span className="text-xs text-neutral-400 font-mono">
                    Guest: {selectedTableLive.activeSession?.customer_name || 'Guest'} ({selectedTableLive.activeSession?.customer_phone || '-'})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTableNumber(null)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Running Batches List */}
              <div className="space-y-4">
                {selectedTableLive.tableBatches?.map((batch: any, bIdx: number) => {
                  const bItems = itemsByBatch[batch.id] || [];
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
                        {bItems.map((item: any) => {
                          const dPrice = Number(item.unit_price || item.menu_items?.price || 0);
                          const addOnsCost = Array.isArray(item.selected_addons)
                            ? item.selected_addons.reduce((sum: number, a: any) => sum + Number(a.price || 0), 0)
                            : 0;
                          const lineTotal = item.is_complimentary ? 0 : (dPrice + addOnsCost) * item.quantity;
                          const dName = item.menu_items?.name_en || item.menu_items?.name || (item.cooking_notes?.replace(/VaMC Counter Item: \[[A-Z]+\] /g, '') || 'Dish #' + item.menu_item_id);

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

                                {isPending ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      disabled={loading}
                                      onClick={() => handleModifyQuantity(item.id, item.quantity, -1, selectedTableLive.activeSession?.id)}
                                      className="p-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white cursor-pointer disabled:opacity-50"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-mono font-bold text-white px-1">{item.quantity}</span>
                                    <button
                                      disabled={loading}
                                      onClick={() => handleModifyQuantity(item.id, item.quantity, 1, selectedTableLive.activeSession?.id)}
                                      className="p-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white cursor-pointer disabled:opacity-50"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                      disabled={loading}
                                      onClick={() => handleCancelDish(item.id, dName, selectedTableLive.activeSession?.id)}
                                      className="p-1 rounded-lg bg-rose-950/40 text-rose-300 hover:bg-rose-950/70 ml-1 cursor-pointer disabled:opacity-50"
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

                              {Array.isArray(item.selected_addons) && item.selected_addons.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.selected_addons.map((a: any, aIdx: number) => (
                                    <span key={aIdx} className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[9px] font-mono">
                                      + {a.name}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {item.cooking_notes && !item.cooking_notes.startsWith('VaMC Counter Item:') && (
                                <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-950/30 px-2 py-0.5 rounded-lg border border-amber-500/30 font-sans">
                                  <MessageSquare className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>Note: {item.cooking_notes}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

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
                  <span className="text-white">₹{Number(selectedTableLive.activeSession?.total_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-white/10">
                  <span>Final Net Settle:</span>
                  <span className="text-[#D4AF37] font-mono text-base">₹{Number(selectedTableLive.activeSession?.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Direct Walk-In Order Punching (Categories + Grid View + Add-ons) */}
      <AnimatePresence>
        {showPunchOrderModal && punchTable && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={fluidSpring}
              className="w-full max-w-2xl bg-[#0d0d0f] border border-[#D4AF37]/50 rounded-[32px] p-5 sm:p-6 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto custom-gold-scrollbar font-mono text-xs relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-black text-white uppercase">
                    Punch Order ➔ {punchTable.table_name || `Table #${punchTable.table_number}`}
                  </h3>
                  <span className="text-[11px] text-[#D4AF37]">Tap dish to add or pick Add-ons</span>
                </div>
                <button onClick={() => setShowPunchOrderModal(false)} className="cursor-pointer p-1 hover:text-white text-neutral-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#D4AF37]/80 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dish name..."
                  value={punchSearch}
                  onChange={(e) => setPunchSearch(e.target.value)}
                  className="w-full bg-[#161619] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white outline-none focus:border-[#D4AF37] transition"
                />
              </div>

              {/* Categories Scrollable Pills */}
              <div className="flex gap-2 overflow-x-auto custom-gold-scrollbar pb-1 select-none">
                <button
                  type="button"
                  onClick={() => { setPunchCategory('all'); setPunchSearch(''); }}
                  className={`px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap border transition cursor-pointer shrink-0 ${
                    punchCategory === 'all' && !punchSearch
                      ? 'bg-[#D4AF37] text-black border-transparent font-black'
                      : 'bg-white/[0.03] border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  All ({menuItems.length})
                </button>
                {categories.map((cat) => {
                  const isSel = punchCategory === cat.id && !punchSearch;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => { setPunchCategory(cat.id); setPunchSearch(''); }}
                      className={`px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap border transition cursor-pointer shrink-0 ${
                        isSel
                          ? 'bg-[#D4AF37] text-black border-transparent font-black shadow-md'
                          : 'bg-white/[0.03] border-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {cat.name_en || cat.name}
                    </button>
                  );
                })}
              </div>

              {/* Grid View of Menu Items */}
              <div className="max-h-60 overflow-y-auto custom-gold-scrollbar p-2 bg-black/40 border border-white/5 rounded-2xl">
                {filteredPunchMenuItems.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">No items found in this category.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {filteredPunchMenuItems.map(dish => {
                      const matchingEntries = punchCart.filter(e => e.menuItem.id === dish.id);
                      const totalDishQty = matchingEntries.reduce((s, e) => s + e.quantity, 0);
                      const hasAddons = dish.has_addons && (Array.isArray(dish.addon_ids) ? dish.addon_ids.length > 0 : addons.length > 0);
                      const hasVariants = dish.is_retail_item && Array.isArray(dish.weight_variants) && dish.weight_variants.length > 0;
                      const isCustomizable = hasAddons || hasVariants;

                      return (
                        <div
                          key={dish.id}
                          onClick={() => handlePunchTileClick(dish)}
                          className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between select-none ${
                            totalDishQty > 0
                              ? 'bg-[#D4AF37]/15 border-[#D4AF37] shadow-md'
                              : 'bg-white/[0.02] border-white/10 hover:border-[#D4AF37]/40'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-white text-xs line-clamp-2 leading-snug">
                                {dish.name_en || dish.name}
                              </span>
                              {totalDishQty > 0 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-[#D4AF37] text-black font-black text-[10px] shrink-0">
                                  {totalDishQty}x
                                </span>
                              )}
                            </div>
                            {isCustomizable && (
                              <span className="inline-flex items-center gap-1 text-[9px] text-amber-300 mt-1">
                                <Sparkles className="w-2.5 h-2.5" /> + Add-ons
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                            <span className="text-[#D4AF37] font-black text-xs">₹{Number(dish.price).toFixed(0)}</span>

                            {totalDishQty > 0 ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const lastEntry = matchingEntries[matchingEntries.length - 1];
                                    if (lastEntry) updatePunchCartQty(lastEntry.key, -1);
                                  }}
                                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-black text-white px-1">{totalDishQty}</span>
                                <button
                                  type="button"
                                  onClick={() => handlePunchTileClick(dish)}
                                  className="p-1 rounded-lg bg-[#D4AF37] text-black font-black cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="w-6 h-6 rounded-lg bg-[#D4AF37] text-black flex items-center justify-center font-black shadow-sm">
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Items & Add-ons Summary Cart */}
              {punchCart.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[#D4AF37]/30 space-y-2">
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                    <span className="text-[11px] font-black text-[#FCF6BA] uppercase flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#D4AF37]" /> Selected Dishes ({punchCart.reduce((s, e) => s + e.quantity, 0)})
                    </span>
                    <span className="text-sm font-black text-[#D4AF37]">₹{punchCartTotal.toFixed(2)}</span>
                  </div>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto custom-gold-scrollbar pr-1">
                    {punchCart.map(entry => {
                      const basePr = Number(entry.selectedWeightVariant ? entry.selectedWeightVariant.price : entry.menuItem.price || 0);
                      const addonsPr = entry.selectedAddons.reduce((s, a) => s + Number(a.price || 0), 0);
                      const lineAmt = (basePr + addonsPr) * entry.quantity;

                      return (
                        <div key={entry.key} className="flex items-center justify-between gap-2 text-[11px] border-b border-white/5 pb-1.5 last:border-b-0">
                          <div className="truncate">
                            <span className="text-white font-bold">
                              {entry.menuItem.name_en || entry.menuItem.name}
                              {entry.selectedWeightVariant ? ` (${entry.selectedWeightVariant.size})` : ''}
                            </span>
                            {entry.selectedAddons.length > 0 && (
                              <span className="block text-[10px] text-amber-300">
                                + {entry.selectedAddons.map(a => a.name).join(', ')}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[#D4AF37] font-bold">₹{lineAmt.toFixed(0)}</span>
                            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
                              <button
                                type="button"
                                onClick={() => updatePunchCartQty(entry.key, -1)}
                                className="p-1 text-white hover:text-rose-300 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-1 font-black text-white">{entry.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updatePunchCartQty(entry.key, 1)}
                                className="p-1 text-[#D4AF37] cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="text-neutral-400 block mb-1">Cooking Instructions / Notes (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Less ice, no sugar, parcel..."
                  value={punchNotes}
                  onChange={(e) => setPunchNotes(e.target.value)}
                  className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={loading || punchCart.length === 0}
                onClick={handlePunchOrderSubmit}
                className="w-full py-3.5 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-lg cursor-pointer disabled:opacity-50"
              >
                {loading
                  ? 'Punching to Kitchen...'
                  : `Confirm & Dispatch to Kitchen ${punchCart.length > 0 ? `(₹${punchCartTotal.toFixed(0)})` : ''}`}
              </motion.button>

              {/* ADD-ONS / VARIANT PICKER OVERLAY INSIDE PUNCH MODAL */}
              <AnimatePresence>
                {customizingPunchItem && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
                  >
                    <div className="w-full max-w-sm bg-[#121216] border border-[#D4AF37] rounded-[28px] p-5 space-y-4 shadow-2xl">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                        <div>
                          <h4 className="font-black text-white text-sm">{customizingPunchItem.name_en || customizingPunchItem.name}</h4>
                          <span className="text-[10px] text-[#D4AF37]">Base: ₹{Number(customizingPunchItem.price).toFixed(0)}</span>
                        </div>
                        <button onClick={() => setCustomizingPunchItem(null)} className="text-neutral-400 hover:text-white cursor-pointer">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Pack Sizes if Retail */}
                      {customizingPunchItem.is_retail_item && Array.isArray(customizingPunchItem.weight_variants) && customizingPunchItem.weight_variants.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-neutral-400 text-[11px] block">Select Pack Size:</span>
                          <div className="grid grid-cols-3 gap-2">
                            {customizingPunchItem.weight_variants.map((v: any, idx: number) => {
                              const isSel = selectedPunchVariant?.size === v.size;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setSelectedPunchVariant(v)}
                                  className={`p-2.5 rounded-xl border text-center cursor-pointer transition ${
                                    isSel ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white' : 'bg-white/[0.02] border-white/10 text-neutral-300'
                                  }`}
                                >
                                  <span className="font-bold block">{v.size}</span>
                                  <span className="text-[#D4AF37] font-black">₹{Number(v.price).toFixed(0)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Add-ons List */}
                      {customizingPunchItem.has_addons && (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto custom-gold-scrollbar pr-1">
                          <span className="text-neutral-400 text-[11px] block">Select Add-ons (Optional):</span>
                          {addons
                            .filter(a => Array.isArray(customizingPunchItem.addon_ids) ? customizingPunchItem.addon_ids.map(Number).includes(Number(a.id)) : true)
                            .map(addon => {
                              const isChecked = selectedPunchAddonIds.includes(Number(addon.id));
                              return (
                                <div
                                  key={addon.id}
                                  onClick={() => {
                                    const aId = Number(addon.id);
                                    if (isChecked) setSelectedPunchAddonIds(selectedPunchAddonIds.filter(id => id !== aId));
                                    else setSelectedPunchAddonIds([...selectedPunchAddonIds, aId]);
                                  }}
                                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                    isChecked ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white' : 'bg-white/[0.02] border-white/10 text-neutral-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center text-black font-black ${
                                      isChecked ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-white/30'
                                    }`}>
                                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <span className="font-bold">{addon.name}</span>
                                  </div>
                                  <span className="text-[#D4AF37] font-black">+₹{Number(addon.price).toFixed(0)}</span>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={confirmPunchCustomization}
                        className="w-full py-3 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-lg cursor-pointer hover:bg-[#c59b27]"
                      >
                        Add Item to Order
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
