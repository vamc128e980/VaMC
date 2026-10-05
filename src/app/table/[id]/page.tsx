// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Category, MenuItem, PromoBanner, CartItem, Language } from '@/types/restaurant';
import { 
  Plus, 
  Minus, 
  CheckCircle2, 
  Clock, 
  ShoppingBag, 
  X, 
  Receipt, 
  KeyRound, 
  Gift, 
  Sparkles, 
  Phone, 
  User, 
  Tag, 
  PackagePlus, 
  Image as ImgIcon, 
  AlertTriangle,
  Users,
  Search,
  ChevronRight,
  Flame,
  ChevronLeft
} from 'lucide-react';

// iOS-26 Spec Liquid Elastic Springs
const liquidPillSpring = {
  type: 'spring',
  stiffness: 430,
  damping: 32,
  mass: 0.55
};

const tapElasticSpring = {
  type: 'spring',
  stiffness: 450,
  damping: 24,
  mass: 0.5
};

const drawerModalSpring = {
  type: 'spring',
  stiffness: 340,
  damping: 28,
  mass: 0.75
};

// Natural Mobile Haptic Tick
const triggerHaptic = (ms = 12) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch (e) {}
  }
};

export default function TableMenuPage() {
  const params = useParams();
  const router = useRouter();
  const rawTableParam = decodeURIComponent((params.id as string) || '');

  // Resolved Table Identity States
  const [realTableNumber, setRealTableNumber] = useState<number | null>(null);
  const [displayTableName, setDisplayTableName] = useState<string>('');
  const [tableResolved, setTableResolved] = useState<boolean>(false);
  const [tableNotFound, setTableNotFound] = useState<boolean>(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'combos' | null>(null);
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'non_veg'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Active Session & Cumulative Billing States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionTotal, setActiveSessionTotal] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [pinGameWon, setPinGameWon] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);

  // Bill Splitter State
  const [splitCount, setSplitCount] = useState<number>(2);

  // Past Ordered Items for Total Bill Modal
  const [sessionOrderedItems, setSessionOrderedItems] = useState<any[]>([]);
  const [isTotalBillModalOpen, setIsTotalBillModalOpen] = useState(false);

  // Mystery PIN Game Modal States
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinFeedback, setPinFeedback] = useState<{ msg: string; success: boolean } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  // 1. EXACT TABLE NAME RESOLUTION & URL AUTO-REWRITE
  const resolveTableIdentity = async () => {
    if (!rawTableParam) return;
    try {
      const isNumeric = /^\d+$/.test(rawTableParam.trim());
      let matchedRecord = null;

      if (isNumeric) {
        const { data } = await supabase
          .from('restaurant_tables')
          .select('*')
          .or(`table_number.eq.${parseInt(rawTableParam)},table_name.ilike.${rawTableParam}`)
          .limit(1)
          .maybeSingle();
        matchedRecord = data;
      } else {
        const { data } = await supabase
          .from('restaurant_tables')
          .select('*')
          .ilike('table_name', rawTableParam.trim())
          .limit(1)
          .maybeSingle();
        matchedRecord = data;
      }

      if (matchedRecord) {
        const tNum = matchedRecord.table_number;
        const customName = matchedRecord.table_name || `Table-${tNum}`;

        setRealTableNumber(tNum);
        setDisplayTableName(customName);
        setTableResolved(true);

        if (isNumeric && customName && typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/table/${encodeURIComponent(customName)}`);
        }
      } else {
        if (isNumeric) {
          const fallbackNum = parseInt(rawTableParam);
          setRealTableNumber(fallbackNum);
          setDisplayTableName(`Table #${fallbackNum}`);
          setTableResolved(true);
        } else {
          setTableNotFound(true);
        }
      }
    } catch (err) {
      console.error('Resolve error:', err);
      if (/^\d+$/.test(rawTableParam)) {
        const fallbackNum = parseInt(rawTableParam);
        setRealTableNumber(fallbackNum);
        setDisplayTableName(`Table #${fallbackNum}`);
        setTableResolved(true);
      } else {
        setTableNotFound(true);
      }
    }
  };

  useEffect(() => {
    resolveTableIdentity();
  }, [rawTableParam]);

  const fetchSessionItems = async (sessionId: string) => {
    try {
      const { data } = await supabase
        .from('order_items')
        .select('*, menu_items(name_en, price)')
        .eq('session_id', sessionId)
        .neq('item_status', 'cancelled');
      if (data) setSessionOrderedItems(data);
    } catch (err) {
      console.error('Session items error:', err);
    }
  };

  const syncSessionData = async () => {
    if (!realTableNumber) return;

    const { data: session } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('table_number', realTableNumber)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (session) {
      setActiveSessionId(session.id);
      setActiveSessionTotal(Number(session.total_amount) || 0);
      setDiscountAmount(Number(session.discount_amount) || 0);
      setPinGameWon(session.pin_game_won || false);
      setPinAttempts(session.pin_attempts || 0);
      setCustomerName(session.customer_name || '');
      setCustomerPhone(session.customer_phone || '');
      fetchSessionItems(session.id);
    } else {
      setActiveSessionId(null);
      setActiveSessionTotal(0);
      setDiscountAmount(0);
      setPinGameWon(false);
      setPinAttempts(0);
      setCustomerName('');
      setCustomerPhone('');
      setSessionOrderedItems([]);
    }
  };

  const fetchMenuData = async () => {
    const { data: cats } = await supabase.from('categories').select('*').order('sort_order');
    if (cats && cats.length > 0) {
      setCategories(cats);
      setSelectedCategory((prev) => prev || cats[0].id);
    }
    const { data: items } = await supabase.from('menu_items').select('*').eq('is_available', true);
    if (items) setMenuItems(items);
    const { data: cmbs } = await supabase.from('combos').select('*').eq('is_available', true);
    if (cmbs) setCombos(cmbs);
    const { data: bns } = await supabase.from('promo_banners').select('*').eq('is_active', true);
    if (bns) setBanners(bns);
  };

  useEffect(() => {
    if (!tableResolved || !realTableNumber) return;

    syncSessionData();
    fetchMenuData();

    const channel = supabase
      .channel(`glass-style-sync-${realTableNumber}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', filter: `table_number=eq.${realTableNumber}` }, () => syncSessionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        if (activeSessionId) fetchSessionItems(activeSessionId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_banners' }, () => fetchMenuData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realTableNumber, tableResolved, activeSessionId]);

  // Promo Banners Auto Rotator
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [banners.length]);

  const addToCart = (item: any, isCombo = false) => {
    triggerHaptic(18);
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === item.id && ci.isCombo === isCombo);
      if (existing) {
        return prev.map((ci) => (ci.menuItem.id === item.id && ci.isCombo === isCombo) ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { menuItem: item, quantity: 1, isCombo }];
    });
  };

  const removeFromCart = (itemId: number, isCombo = false) => {
    triggerHaptic(14);
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === itemId && ci.isCombo === isCombo);
      if (existing && existing.quantity > 1) {
        return prev.map((ci) => (ci.menuItem.id === itemId && ci.isCombo === isCombo) ? { ...ci, quantity: ci.quantity - 1 } : ci);
      }
      return prev.filter((ci) => !(ci.menuItem.id === itemId && ci.isCombo === isCombo));
    });
  };

  const cartGrandTotal = cart.reduce((sum, ci) => sum + ci.menuItem.price * ci.quantity, 0);
  const cartItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  const orderedItemsComputedTotal = sessionOrderedItems.reduce(
    (sum, it) => sum + (it.quantity * Number(it.unit_price || it.menu_items?.price || 0)), 
    0
  );
  const liveSessionBaseTotal = activeSessionTotal > 0 ? activeSessionTotal : orderedItemsComputedTotal;
  const runningGrandTotal = liveSessionBaseTotal + cartGrandTotal;
  const finalPayable = Math.max(0, runningGrandTotal - discountAmount);
  const splitAmountPerPerson = splitCount > 0 ? (finalPayable / splitCount).toFixed(2) : finalPayable.toFixed(2);

  const handlePlaceOrder = async () => {
    triggerHaptic(30);
    if (!realTableNumber) return alert('Invalid table. Please re-scan QR.');
    if (!activeSessionId && (customerName.trim().length < 2 || customerPhone.length !== 10)) {
      return alert('Enter your Name and 10-digit mobile number.');
    }

    setLoading(true);
    try {
      let sessionId = activeSessionId;
      let newTotal = liveSessionBaseTotal + cartGrandTotal;

      if (!sessionId) {
        const subtotal = Math.round((cartGrandTotal / 1.05) * 100) / 100;
        const totalTax = Math.round((cartGrandTotal - subtotal) * 100) / 100;
        const cgst = Math.round((totalTax / 2) * 100) / 100;
        const sgst = Math.round((totalTax - cgst) * 100) / 100;

        const { data: newSession, error: sErr } = await supabase
          .from('table_sessions')
          .insert({
            table_number: realTableNumber,
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            subtotal,
            cgst_amount: cgst,
            sgst_amount: sgst,
            gst_rate: 5.0,
            total_amount: cartGrandTotal,
            discount_amount: discountAmount || 0,
            pin_game_won: pinGameWon,
            pin_attempts: pinAttempts,
            final_payable: Math.max(0, cartGrandTotal - discountAmount),
            status: 'active',
            payment_status: 'unpaid'
          })
          .select()
          .single();

        if (sErr) throw sErr;
        sessionId = newSession.id;
        setActiveSessionId(sessionId);
        setActiveSessionTotal(cartGrandTotal);
        await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('table_number', realTableNumber);
      } else {
        const subtotal = Math.round((newTotal / 1.05) * 100) / 100;
        const totalTax = Math.round((newTotal - subtotal) * 100) / 100;
        const cgst = Math.round((totalTax / 2) * 100) / 100;
        const sgst = Math.round((totalTax - cgst) * 100) / 100;

        await supabase.from('table_sessions').update({
          subtotal,
          cgst_amount: cgst,
          sgst_amount: sgst,
          total_amount: newTotal,
          discount_amount: discountAmount || 0,
          pin_game_won: pinGameWon,
          pin_attempts: pinAttempts,
          final_payable: Math.max(0, newTotal - discountAmount)
        }).eq('id', sessionId);

        setActiveSessionTotal(newTotal);
      }

      const { data: batch, error: bErr } = await supabase
        .from('order_batches')
        .insert({
          session_id: sessionId,
          table_number: realTableNumber,
          discount: discountAmount || 0,
          status: 'pending_waiter'
        })
        .select()
        .single();

      if (bErr) throw bErr;

      const orderPayload = cart.map((ci) => ({
        batch_id: batch.id,
        session_id: sessionId,
        menu_item_id: ci.menuItem.id,
        station_id: 'kitchen_hot',
        quantity: ci.quantity,
        unit_price: ci.menuItem.price,
        item_status: 'ordered',
      }));

      await supabase.from('order_items').insert(orderPayload);

      setCart([]);
      setIsCartOpen(false);
      fetchSessionItems(sessionId);
    } catch (err: any) {
      alert('Order error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. SECURE SERVER-SIDE PIN VALIDATION VIA SUPABASE RPC
  const handleCrackPin = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(20);
    if (enteredPin.length !== 4) return setPinFeedback({ msg: 'Please enter a 4-digit PIN.', success: false });
    if (pinAttempts >= 3) return setPinFeedback({ msg: 'All 3 attempts used! Pay regular bill.', success: false });

    setPinLoading(true);
    setPinFeedback(null);
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_and_crack_pin', {
        p_pin: enteredPin.trim(),
        p_table_number: realTableNumber || 0,
        p_session_id: activeSessionId || null,
        p_customer_name: customerName || 'Guest'
      });

      if (rpcErr) throw rpcErr;
      const nextAttempts = pinAttempts + 1;
      setPinAttempts(nextAttempts);

      if (rpcRes?.success) {
        triggerHaptic(50);
        setDiscountAmount(Number(rpcRes.discount));
        setPinGameWon(true);
        setPinFeedback({ msg: `🎉 BINGO! You won ₹${rpcRes.discount} Cash Discount!`, success: true });
        setTimeout(() => setIsPinModalOpen(false), 2200);
      } else {
        triggerHaptic(30);
        const rem = 3 - nextAttempts;
        setPinFeedback({ msg: rem > 0 ? `❌ Wrong PIN. ${rem} try left!` : `❌ Wrong PIN. All tries used!`, success: false });
      }
      setEnteredPin('');
    } catch (err: any) {
      setPinFeedback({ msg: 'Failed: ' + err.message, success: false });
    } finally {
      setPinLoading(false);
    }
  };

  const filteredMenuItems = menuItems.filter((item) => {
    if (searchQuery.trim()) {
      return item.name_en?.toLowerCase().includes(searchQuery.toLowerCase()) || 
             item.name?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    if (selectedCategory === 'combos') return false;
    if (foodFilter === 'veg') return item.food_type === 'veg';
    if (foodFilter === 'non_veg') return item.food_type === 'non_veg';
    return item.category_id === selectedCategory;
  });

  if (tableNotFound) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#FCF6BA] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-[#D4AF37] mb-3" />
        <h2 className="text-xl font-bold uppercase tracking-wider text-white">Table QR Invalid</h2>
        <p className="text-xs text-neutral-400 mt-1">Please scan the physical table QR code again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#FCF6BA] pb-32 font-sans selection:bg-[#D4AF37] selection:text-black antialiased relative overflow-x-hidden">
      
      {/* Ambient iOS Background Glass Lights */}
      <div className="fixed -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-[radial-gradient(circle,rgba(212,175,55,0.08)_0%,transparent_70%)] blur-3xl pointer-events-none -z-10" />

      {/* 1. TOP FROSTED GLASS HEADER */}
      <header className="sticky top-0 z-40 bg-[#050505]/75 backdrop-blur-2xl px-5 pt-4 pb-3 border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <span className="text-[9px] tracking-[0.25em] font-mono uppercase text-[#D4AF37]/90 block font-bold">
              ROYAL SEATING
            </span>
            <h1 className="text-base font-black text-white flex items-center gap-2 mt-0.5">
              <span>{displayTableName || `Table #${realTableNumber || '...'}`}</span>
              {realTableNumber && (
                <span className="text-[10px] font-mono text-[#D4AF37] font-semibold bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/25 backdrop-blur-md">
                  T-{realTableNumber}
                </span>
              )}
            </h1>
          </div>

          {/* iOS Specular Glass Ledger Button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            transition={tapElasticSpring}
            onClick={() => {
              triggerHaptic(15);
              setIsTotalBillModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.12] hover:border-[#D4AF37]/40 shadow-[0_8px_25px_rgba(0,0,0,0.4)] backdrop-blur-xl text-left transition"
          >
            <Receipt className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <span className="text-[8px] block uppercase font-mono text-neutral-400 font-semibold">Ledger</span>
              <span className="text-xs font-mono font-black text-[#FCF6BA]">
                ₹{Math.max(0, liveSessionBaseTotal - discountAmount).toFixed(2)}
              </span>
            </div>
          </motion.button>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-md mx-auto px-5 pt-4 space-y-4">

        {/* Liquid Glass Pill Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#D4AF37]/80 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search our handcrafted delights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] text-white placeholder-neutral-500 rounded-2xl pl-11 pr-4 py-3 text-xs outline-none border border-white/[0.08] focus:border-[#D4AF37]/50 backdrop-blur-xl transition shadow-inner font-sans"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 2.1 PROMO BANNERS CAROUSEL (Clean Auto & Swipe Glass Strip) */}
        {banners.length > 0 && (
          <div className="relative rounded-[28px] overflow-hidden bg-white/[0.02] border border-white/[0.08] p-1.5 backdrop-blur-2xl shadow-xl">
            <div className="relative h-36 w-full rounded-[22px] overflow-hidden bg-neutral-950">
              <AnimatePresence mode="wait">
                <motion.div
                  key={banners[currentBannerIndex]?.id || currentBannerIndex}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="absolute inset-0"
                >
                  <img
                    src={banners[currentBannerIndex]?.image_url}
                    alt={banners[currentBannerIndex]?.title || 'Promo'}
                    className="w-full h-full object-cover"
                  />
                  {/* Subtle dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex items-end p-3.5">
                    <span className="text-xs font-bold text-[#FCF6BA] drop-shadow-md line-clamp-1">
                      {banners[currentBannerIndex]?.title}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Micro Navigation Dots */}
            {banners.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2 pb-1">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      triggerHaptic(10);
                      setCurrentBannerIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      currentBannerIndex === idx
                        ? 'w-5 bg-[#D4AF37]'
                        : 'w-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2.2 Mystery PIN Interactive Capsule */}
        {!pinGameWon && pinAttempts < 3 && (
          <motion.div
            whileTap={{ scale: 0.96 }}
            transition={tapElasticSpring}
            onClick={() => {
              triggerHaptic(15);
              setIsPinModalOpen(true);
            }}
            className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.1] hover:border-[#D4AF37]/40 backdrop-blur-xl flex items-center justify-between shadow-lg cursor-pointer transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shadow-inner">
                <Gift className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <span className="text-[9px] font-black tracking-widest text-[#D4AF37] uppercase font-mono">
                  SECRET DAILY VAULT
                </span>
                <h4 className="text-xs font-bold text-white">Crack 4-Digit Mystery PIN For Discount</h4>
              </div>
            </div>
            <span className="text-xs text-[#D4AF37] font-black px-2">➔</span>
          </motion.div>
        )}

        {/* 3. iOS-26 GLASS PILL NAVIGATION TABS (Liquid Sliding Pill) */}
        <div className="space-y-2">
          <div className="p-1 rounded-[22px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl flex gap-1.5 overflow-x-auto custom-gold-scrollbar select-none items-center scroll-smooth">
            {combos.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setSelectedCategory('combos');
                }}
                className={`relative px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedCategory === 'combos' ? 'text-black font-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {selectedCategory === 'combos' && (
                  <motion.div
                    layoutId="iosLiquidPill"
                    className="absolute inset-0 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] rounded-2xl shadow-[0_2px_15px_rgba(212,175,55,0.4)]"
                    transition={liquidPillSpring}
                  />
                )}
                <Sparkles className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Combos ({combos.length})</span>
              </button>
            )}

            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id && selectedCategory !== 'combos';
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => {
                    triggerHaptic(15);
                    setSelectedCategory(cat.id);
                  }}
                  className={`relative px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isSelected ? 'text-black font-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="iosLiquidPill"
                      className="absolute inset-0 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] rounded-2xl shadow-[0_2px_15px_rgba(212,175,55,0.4)]"
                      transition={liquidPillSpring}
                    />
                  )}
                  <span className="relative z-10">{cat.name_en || cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Sub Veg / Non-Veg Liquid Capsule Selector */}
          {selectedCategory !== 'combos' && (
            <div className="flex gap-1.5 text-[10px] font-mono">
              {[
                { id: 'all', label: 'All' },
                { id: 'veg', label: 'Veg Only', dot: 'bg-emerald-400' },
                { id: 'non_veg', label: 'Non-Veg', dot: 'bg-rose-400' }
              ].map(f => {
                const isActive = foodFilter === f.id;
                return (
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    key={f.id}
                    onClick={() => {
                      triggerHaptic(10);
                      setFoodFilter(f.id as any);
                    }}
                    className={`px-3 py-1 rounded-xl border backdrop-blur-md transition flex items-center gap-1.5 cursor-pointer ${
                      isActive 
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37]/60 text-[#FCF6BA] font-bold' 
                        : 'bg-white/[0.02] border-white/[0.06] text-neutral-400'
                    }`}
                  >
                    {f.dot && <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />}
                    <span>{f.label}</span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. DISHES BENTO GRID WITH LIQUID BUTTON PRESS PHYSICS */}
        {selectedCategory === 'combos' ? (
          <div className="space-y-3.5">
            {combos.map((combo) => {
              const inCart = cart.find((ci) => ci.menuItem.id === combo.id && ci.isCombo);
              return (
                <div key={'cmb-' + combo.id} className="bg-white/[0.03] border border-white/[0.08] rounded-[26px] overflow-hidden p-3 shadow-xl backdrop-blur-2xl space-y-2.5">
                  {combo.image_url && (
                    <div className="h-40 w-full rounded-2xl overflow-hidden relative bg-neutral-950">
                      <img src={combo.image_url} alt={combo.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-0.5">
                    <div>
                      <h4 className="text-sm font-black text-white">{combo.name || combo.name_en}</h4>
                      <span className="font-mono text-sm font-black text-[#D4AF37] block mt-0.5">₹{Number(combo.price).toFixed(2)}</span>
                    </div>

                    {inCart ? (
                      <div className="flex items-center bg-white/[0.06] border border-[#D4AF37]/60 rounded-2xl p-1 backdrop-blur-xl">
                        <button onClick={() => removeFromCart(combo.id, true)} className="p-1.5 text-[#FCF6BA]"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="font-mono font-bold text-xs text-white px-2.5">{inCart.quantity}</span>
                        <button onClick={() => addToCart(combo, true)} className="p-1.5 text-[#FCF6BA]"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        transition={tapElasticSpring}
                        onClick={() => addToCart(combo, true)}
                        className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black flex items-center justify-center font-black shadow-lg cursor-pointer"
                      >
                        <Plus className="w-5 h-5 stroke-[2.8]" />
                      </motion.button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredMenuItems.map((item) => {
              const inCart = cart.find((ci) => ci.menuItem.id === item.id && !ci.isCombo);
              return (
                <div 
                  key={item.id} 
                  className="bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.16] rounded-[24px] p-2.5 flex flex-col justify-between shadow-xl backdrop-blur-2xl relative transition"
                >
                  <div>
                    {/* Dish Image */}
                    <div className="h-32 w-full rounded-2xl overflow-hidden bg-neutral-950 mb-2 relative">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name_en} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                          <ImgIcon className="w-6 h-6" />
                        </div>
                      )}
                      <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${item.food_type === 'non_veg' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'}`} />
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1">{item.name_en || item.name}</h4>
                    {item.description_en && (
                      <p className="text-[10px] text-neutral-400 font-sans line-clamp-1 mt-0.5">{item.description_en}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06]">
                    <span className="font-mono text-xs font-black text-[#D4AF37]">₹{Number(item.price).toFixed(2)}</span>

                    {inCart ? (
                      <div className="flex items-center bg-white/[0.06] border border-[#D4AF37]/60 rounded-xl p-0.5 backdrop-blur-md">
                        <button onClick={() => removeFromCart(item.id, false)} className="p-1 text-[#FCF6BA]"><Minus className="w-3 h-3" /></button>
                        <span className="font-mono font-bold text-[11px] text-white px-1.5">{inCart.quantity}</span>
                        <button onClick={() => addToCart(item, false)} className="p-1 text-[#FCF6BA]"><Plus className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.86 }}
                        transition={tapElasticSpring}
                        onClick={() => addToCart(item, false)}
                        className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black flex items-center justify-center font-black shadow-md cursor-pointer"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </motion.button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. FLOATING LIQUID GLASS ORDER DOCK */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-6 inset-x-5 max-w-md mx-auto z-40">
          <motion.button
            whileTap={{ scale: 0.94 }}
            transition={tapElasticSpring}
            onClick={() => {
              triggerHaptic(20);
              setIsCartOpen(true);
            }}
            className="w-full bg-[#121214]/85 border border-[#D4AF37]/50 text-white p-3.5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="bg-[#D4AF37] text-black px-2.5 py-1 rounded-xl text-xs font-black font-mono">
                {cartItemCount}
              </span>
              <span className="text-xs font-bold tracking-wide">View Dining Basket</span>
            </div>
            <span className="text-[#FCF6BA] font-mono font-black text-sm">₹{cartGrandTotal.toFixed(2)} ➔</span>
          </motion.button>
        </div>
      )}

      {/* 6. CART DRAWER WITH FROSTED BACKDROP */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/85 backdrop-blur-md" />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={drawerModalSpring}
              className="relative w-full max-w-md mx-auto bg-[#0a0a0c] border-t border-x border-white/[0.12] rounded-t-[36px] p-6 pb-8 space-y-4 z-10 max-h-[85vh] overflow-y-auto custom-gold-scrollbar shadow-2xl backdrop-blur-3xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base">Your Dining Cart</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-2 divide-y divide-white/5">
                {cart.map((ci) => (
                  <div key={(ci.isCombo ? 'c-' : 'i-') + ci.menuItem.id} className="pt-2 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white">{ci.menuItem.name || ci.menuItem.name_en}</div>
                      <span className="font-mono text-[#D4AF37]">₹{ci.menuItem.price} each</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">₹{(ci.menuItem.price * ci.quantity).toFixed(2)}</span>
                      <div className="flex items-center bg-white/[0.05] border border-white/[0.1] rounded-xl p-0.5">
                        <button onClick={() => removeFromCart(ci.menuItem.id, ci.isCombo)} className="p-1 text-[#D4AF37]"><Minus className="w-3 h-3" /></button>
                        <span className="px-2 font-mono font-bold text-white">{ci.quantity}</span>
                        <button onClick={() => addToCart(ci.menuItem, ci.isCombo)} className="p-1 text-[#D4AF37]"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!activeSessionId && (
                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <span className="font-bold text-[#FCF6BA] block">Guest Identification</span>
                  <input
                    type="text"
                    required
                    placeholder="Guest Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-white outline-none"
                  />
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="10-digit Phone *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-white outline-none font-mono"
                  />
                </div>
              )}

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1 text-xs font-mono">
                <div className="flex justify-between text-white font-black text-sm">
                  <span>Payable at Counter:</span>
                  <span className="text-[#D4AF37]">₹{finalPayable.toFixed(2)}</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={tapElasticSpring}
                disabled={loading}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase text-xs shadow-lg cursor-pointer"
              >
                {loading ? 'Sending to Kitchen...' : 'Confirm & Dispatch to Kitchen'}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. DETAILED TOTAL BILL MODAL & FAIR SHARE SPLITTER */}
      <AnimatePresence>
        {isTotalBillModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={drawerModalSpring}
              className="w-full max-w-sm bg-[#0a0a0c] border border-white/[0.12] rounded-3xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto custom-gold-scrollbar backdrop-blur-3xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base font-mono">Table Ledger</h3>
                </div>
                <button onClick={() => setIsTotalBillModalOpen(false)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/[0.08] text-xs font-mono space-y-1">
                <div className="flex justify-between text-white font-bold">
                  <span>{customerName || 'Walk-in Guest'}</span>
                  <span className="text-[#D4AF37]">{displayTableName || `Table #${realTableNumber}`}</span>
                </div>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-gold-scrollbar p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono divide-y divide-white/5">
                {sessionOrderedItems.length === 0 ? (
                  <div className="text-center py-4 text-neutral-500">No active kitchen orders placed yet.</div>
                ) : (
                  sessionOrderedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center pt-1.5 first:pt-0">
                      <span>{item.quantity}x {item.menu_items?.name_en || 'Dish'}</span>
                      <span className="font-black text-white">₹{(item.quantity * Number(item.unit_price || item.menu_items?.price || 0)).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-[#D4AF37]/30 text-xs font-mono flex justify-between font-black text-white">
                <span>Net Total:</span>
                <span className="text-[#D4AF37]">₹{finalPayable.toFixed(2)}</span>
              </div>

              {/* FAIR SHARE BILL SPLITTER WIDGET */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#D4AF37] font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Fair Share Splitter
                  </span>
                  <div className="flex items-center gap-1.5 bg-black/60 border border-white/[0.1] rounded-lg px-2 py-0.5">
                    <button onClick={() => setSplitCount(Math.max(1, splitCount - 1))} className="text-[#D4AF37] font-bold px-1">-</button>
                    <span className="text-white font-bold text-xs">{splitCount} Person{splitCount > 1 ? 's' : ''}</span>
                    <button onClick={() => setSplitCount(splitCount + 1)} className="text-[#D4AF37] font-bold px-1">+</button>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-white/[0.06] text-xs">
                  <span className="text-neutral-400">Each Person Shares:</span>
                  <span className="text-sm font-black text-emerald-400">₹{splitAmountPerPerson}</span>
                </div>
              </div>

              <button
                onClick={() => setIsTotalBillModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-[#D4AF37] font-bold text-xs uppercase"
              >
                Close View
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. MYSTERY PIN RPC VERIFY MODAL */}
      <AnimatePresence>
        {isPinModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={drawerModalSpring}
              className="w-full max-w-sm bg-[#0a0a0c] border border-white/[0.12] rounded-3xl p-6 shadow-2xl relative space-y-4 backdrop-blur-3xl"
            >
              <button onClick={() => setIsPinModalOpen(false)} className="absolute top-4 right-4 text-neutral-400"><X className="w-5 h-5" /></button>
              <div className="text-center space-y-1">
                <KeyRound className="w-8 h-8 text-[#D4AF37] mx-auto animate-pulse" />
                <h3 className="font-black text-white text-base uppercase">Verify Secret PIN</h3>
                <span className="text-[11px] font-mono text-[#D4AF37] font-bold">Chances: {3 - pinAttempts} / 3</span>
              </div>

              {pinFeedback && (
                <div className={`p-3 rounded-xl text-xs font-mono border ${pinFeedback.success ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200' : 'border-rose-500 bg-rose-950/20 text-rose-200'}`}>
                  {pinFeedback.msg}
                </div>
              )}

              {pinAttempts < 3 && !pinGameWon ? (
                <form onSubmit={handleCrackPin} className="space-y-3">
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="0000"
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white/[0.04] border border-white/[0.12] rounded-xl px-4 py-3 text-center text-white font-mono font-black text-2xl tracking-[0.35em] outline-none"
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    transition={tapElasticSpring}
                    type="submit"
                    disabled={pinLoading || enteredPin.length !== 4}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase text-xs cursor-pointer disabled:opacity-50"
                  >
                    {pinLoading ? 'Checking Vault...' : 'Claim Secret Discount'}
                  </motion.button>
                </form>
              ) : (
                <button onClick={() => setIsPinModalOpen(false)} className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-[#D4AF37] font-bold text-xs uppercase">
                  Close
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}