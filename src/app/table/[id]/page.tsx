// @ts-nocheck
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Category, MenuItem, CartItem } from '@/types/restaurant';
import { 
  Plus, 
  Minus, 
  ShoppingBag, 
  X, 
  Receipt, 
  Sparkles, 
  Image as ImgIcon, 
  AlertTriangle,
  Search,
  Split,
  BellRing,
  Droplets,
  Flame,
  Crown,
  ChefHat,
  MessageSquare,
  CheckCircle2
} from 'lucide-react';

const smoothSpring = { type: 'spring', stiffness: 400, damping: 30, mass: 0.5 };
const tapSpring = { type: 'spring', stiffness: 450, damping: 25, mass: 0.5 };

const triggerHaptic = (ms = 12) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
};

export default function LuxuryCustomerTablePage() {
  const params = useParams();
  const rawTableParam = decodeURIComponent((params.id as string) || '');

  // Language & Table Identity
  const [activeLang, setActiveLang] = useState<'en' | 'te' | 'hi'>('en');
  const [realTableNumber, setRealTableNumber] = useState<number | null>(null);
  const [displayTableName, setDisplayTableName] = useState<string>('');
  const [tableResolved, setTableResolved] = useState<boolean>(false);
  const [tableNotFound, setTableNotFound] = useState<boolean>(false);

  // Core Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [topPickDishIds, setTopPickDishIds] = useState<number[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'combos' | null>(null);
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'non_veg'>('all');

  // Cart & Item-wise Cooking Notes
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartNotes, setCartNotes] = useState<Record<string, string>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Active Dining Session
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionTotal, setActiveSessionTotal] = useState<number>(0);
  const [sessionOrderedItems, setSessionOrderedItems] = useState<any[]>([]);
  const [isTotalBillModalOpen, setIsTotalBillModalOpen] = useState(false);
  const [splitCount, setSplitCount] = useState<number>(2);

  // Waiter Call Feature
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [waiterToast, setWaiterToast] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Language Trigger (Banner-Free)
  const triggerGoogleTranslate = (langCode: 'en' | 'te' | 'hi') => {
    setActiveLang(langCode);
    triggerHaptic(15);
    if (typeof window === 'undefined') return;

    const googleLang = langCode === 'en' ? '/en/en' : `/en/${langCode}`;
    document.cookie = `googtrans=${googleLang}; path=/;`;
    document.cookie = `googtrans=${googleLang}; domain=${window.location.hostname}; path=/;`;

    const selectElem = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (selectElem) {
      selectElem.value = langCode;
      selectElem.dispatchEvent(new Event('change'));
    } else {
      window.location.reload();
    }
  };

  // Resolve Table ID / Dedicated Name
  const resolveTableIdentity = async () => {
    if (!rawTableParam) return;
    try {
      const isNumeric = /^\d+$/.test(rawTableParam.trim());
      let matched = null;

      if (isNumeric) {
        const { data } = await supabase
          .from('restaurant_tables')
          .select('*')
          .or(`table_number.eq.${parseInt(rawTableParam)},table_name.ilike.${rawTableParam}`)
          .limit(1)
          .maybeSingle();
        matched = data;
      } else {
        const { data } = await supabase
          .from('restaurant_tables')
          .select('*')
          .ilike('table_name', rawTableParam.trim())
          .limit(1)
          .maybeSingle();
        matched = data;
      }

      if (matched) {
        const tNum = matched.table_number;
        setRealTableNumber(tNum);
        setDisplayTableName(matched.table_name || `Table #${tNum}`);
        setTableResolved(true);
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
    if (typeof document !== 'undefined') {
      const cookies = document.cookie || '';
      if (cookies.includes('googtrans=/en/te')) setActiveLang('te');
      else if (cookies.includes('googtrans=/en/hi')) setActiveLang('hi');
      else setActiveLang('en');
    }
  }, [rawTableParam]);

  const fetchSessionItems = async (sessionId: string) => {
    try {
      const { data } = await supabase
        .from('order_items')
        .select('*, menu_items(name_en, name, price)')
        .eq('session_id', sessionId)
        .neq('item_status', 'cancelled');
      if (data) setSessionOrderedItems(data);
    } catch (e) {}
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
      setCustomerName(session.customer_name || '');
      setCustomerPhone(session.customer_phone || '');
      fetchSessionItems(session.id);
      localStorage.setItem(`table_sess_${realTableNumber}`, session.id);
    } else {
      setActiveSessionId(null);
      setActiveSessionTotal(0);
      setCustomerName('');
      setCustomerPhone('');
      setSessionOrderedItems([]);
      localStorage.removeItem(`table_sess_${realTableNumber}`);
    }
  };

  const fetchMenuData = async () => {
    const [
      { data: cats },
      { data: items },
      { data: cmbs },
      { data: bnrs }
    ] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('menu_items').select('*').eq('is_available', true).order('id', { ascending: true }),
      supabase.from('combos').select('*').eq('is_available', true).order('id', { ascending: true }),
      supabase.from('promo_banners').select('*').eq('is_active', true).order('id', { ascending: false })
    ]);

    if (cats && cats.length > 0) {
      setCategories(cats);
      setSelectedCategory((prev) => {
        if (prev === 'combos') return 'combos';
        const exists = cats.some((c) => c.id === prev);
        return exists ? prev : cats[0].id;
      });
    }
    if (items) setMenuItems(items);
    if (cmbs) setCombos(cmbs);
    if (bnrs) {
      setBanners(bnrs);
      setCurrentBannerIndex(0);
    }

    // Top Picks Analytics (Current Month)
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: recentOrders } = await supabase
        .from('order_items')
        .select('menu_item_id, quantity')
        .gte('created_at', startOfMonth.toISOString())
        .neq('item_status', 'cancelled');

      if (recentOrders && recentOrders.length > 0) {
        const counts: Record<number, number> = {};
        recentOrders.forEach(o => {
          counts[o.menu_item_id] = (counts[o.menu_item_id] || 0) + (o.quantity || 1);
        });
        const sortedIds = Object.keys(counts)
          .map(Number)
          .sort((a, b) => counts[b] - counts[a])
          .slice(0, 3);
        setTopPickDishIds(sortedIds);
      }
    } catch (e) {}
  };

  // Realtime Sync Listener for All Tables
  useEffect(() => {
    if (!tableResolved || !realTableNumber) return;
    syncSessionData();
    fetchMenuData();

    const channel = supabase
      .channel(`table-${realTableNumber}-realtime-hub`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', filter: `table_number=eq.${realTableNumber}` }, () => syncSessionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        if (activeSessionId) fetchSessionItems(activeSessionId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchMenuData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchMenuData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combos' }, () => fetchMenuData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_banners' }, () => fetchMenuData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [realTableNumber, tableResolved, activeSessionId]);

  // Auto-Slide Interval for Promo Banners (4 Seconds)
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const addToCart = (item: any, isCombo = false) => {
    triggerHaptic(15);
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === item.id && ci.isCombo === isCombo);
      if (existing) {
        return prev.map((ci) => (ci.menuItem.id === item.id && ci.isCombo === isCombo) ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { menuItem: item, quantity: 1, isCombo }];
    });
  };

  const removeFromCart = (itemId: number, isCombo = false) => {
    triggerHaptic(12);
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === itemId && ci.isCombo === isCombo);
      if (existing && existing.quantity > 1) {
        return prev.map((ci) => (ci.menuItem.id === itemId && ci.isCombo === isCombo) ? { ...ci, quantity: ci.quantity - 1 } : ci);
      }
      return prev.filter((ci) => !(ci.menuItem.id === itemId && ci.isCombo === isCombo));
    });
  };

  // Zero-GST Totals
  const cartGrandTotal = cart.reduce((sum, ci) => sum + ci.menuItem.price * ci.quantity, 0);
  const cartItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  const orderedItemsComputedTotal = sessionOrderedItems.reduce(
    (sum, it) => sum + (it.quantity * Number(it.unit_price || it.menu_items?.price || 0)), 
    0
  );
  const liveSessionBaseTotal = activeSessionTotal > 0 ? activeSessionTotal : orderedItemsComputedTotal;
  const runningGrandTotal = liveSessionBaseTotal + cartGrandTotal;
  const splitAmountPerPerson = splitCount > 0 ? (runningGrandTotal / splitCount).toFixed(2) : runningGrandTotal.toFixed(2);

  // Waiter Call
  const handleCallWaiter = async (callType: 'water' | 'waiter' | 'bill') => {
    if (!realTableNumber) return;
    triggerHaptic(25);
    try {
      await supabase.from('waiter_calls').insert({
        table_number: realTableNumber,
        call_type: callType,
        status: 'pending'
      });
      setIsWaiterModalOpen(false);
      const textMap = { water: 'Drinking Water requested', waiter: 'Waiter called to table', bill: 'Bill requested' };
      setWaiterToast(`🔔 ${textMap[callType]} for ${displayTableName}! Staff notified.`);
      setTimeout(() => setWaiterToast(null), 4000);
    } catch (e) {
      alert('Unable to notify waiter. Please contact counter staff.');
    }
  };

  // Place Order / Add to Running Table Bill
  const handlePlaceOrder = async () => {
    triggerHaptic(30);
    if (!realTableNumber) return alert('Invalid table. Re-scan QR.');
    if (!activeSessionId && (customerName.trim().length < 2 || customerPhone.length !== 10)) {
      return alert('Please enter Guest Name and 10-digit Phone.');
    }

    setLoading(true);
    try {
      let sessionId = activeSessionId;
      const newTotal = liveSessionBaseTotal + cartGrandTotal;

      if (!sessionId) {
        const { data: newSession, error: sErr } = await supabase
          .from('table_sessions')
          .insert({
            table_number: realTableNumber,
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            subtotal: cartGrandTotal,
            cgst_amount: 0,
            sgst_amount: 0,
            gst_rate: 0,
            total_amount: cartGrandTotal,
            discount_amount: 0,
            final_payable: cartGrandTotal,
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
        await supabase.from('table_sessions').update({
          subtotal: newTotal,
          total_amount: newTotal,
          final_payable: newTotal
        }).eq('id', sessionId);

        setActiveSessionTotal(newTotal);
      }

      const { data: batch, error: bErr } = await supabase
        .from('order_batches')
        .insert({
          session_id: sessionId,
          table_number: realTableNumber,
          status: 'pending_waiter'
        })
        .select()
        .single();

      if (bErr) throw bErr;

      const orderPayload = cart.map((ci) => {
        const itemKey = (ci.isCombo ? 'c-' : 'i-') + ci.menuItem.id;
        return {
          batch_id: batch.id,
          session_id: sessionId,
          menu_item_id: ci.menuItem.id,
          station_id: 'kitchen_hot',
          quantity: ci.quantity,
          unit_price: ci.menuItem.price,
          item_status: 'ordered',
          cooking_notes: cartNotes[itemKey] || null
        };
      });

      await supabase.from('order_items').insert(orderPayload);

      setCart([]);
      setCartNotes({});
      setIsCartOpen(false);
      fetchSessionItems(sessionId);
    } catch (err: any) {
      alert('Order error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const topListDishes = useMemo(() => {
    return menuItems.filter(m => topPickDishIds.includes(m.id) || m.is_special).slice(0, 3);
  }, [menuItems, topPickDishIds]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const dishName = (item.name_en || item.name || '').toLowerCase();
      if (searchQuery.trim()) {
        return dishName.includes(searchQuery.toLowerCase());
      }
      if (selectedCategory === 'combos') return false;
      if (foodFilter === 'veg') return item.food_type === 'veg';
      if (foodFilter === 'non_veg') return item.food_type === 'non_veg';
      return item.category_id === selectedCategory;
    });
  }, [menuItems, searchQuery, selectedCategory, foodFilter]);

  if (tableNotFound) {
    return (
      <div className="min-h-screen bg-[#060608] text-[#FCF6BA] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-[#D4AF37] mb-3" />
        <h2 className="text-xl font-bold uppercase tracking-wider text-white">Table QR Invalid</h2>
        <p className="text-xs text-neutral-400 mt-1">Please scan physical table QR code again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-[#FCF6BA] pb-32 font-sans selection:bg-[#D4AF37] selection:text-black antialiased relative overflow-x-hidden">
      
      {/* Hidden Translate */}
      <div id="google_translate_element" style={{ display: 'none' }} />
      <Script
        id="google-translate-script"
        strategy="afterInteractive"
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
      />
      <Script id="google-translate-init" strategy="afterInteractive">
        {`
          function googleTranslateElementInit() {
            new google.translate.TranslateElement({
              pageLanguage: 'en',
              includedLanguages: 'en,te,hi',
              autoDisplay: false
            }, 'google_translate_element');
          }
        `}
      </Script>

      {/* Floating Waiter Toast */}
      <AnimatePresence>
        {waiterToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-16 inset-x-4 max-w-sm mx-auto z-50 p-3.5 rounded-[22px] bg-gradient-to-r from-[#18181b] to-[#0c0c0e] border border-[#D4AF37]/80 text-[#FCF6BA] text-xs font-mono font-bold shadow-2xl flex items-center gap-2.5 backdrop-blur-2xl"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{waiterToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#060608]/90 backdrop-blur-2xl px-4 pt-3.5 pb-3 border-b border-white/[0.08] shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div>
            <span className="text-[9px] tracking-[0.2em] font-mono uppercase text-[#D4AF37] block font-bold">
              ROYAL FINE-DINE
            </span>
            <h1 className="text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
              <span>{displayTableName || `Table #${realTableNumber || '...'}`}</span>
              {realTableNumber && (
                <span className="text-[10px] font-mono text-[#D4AF37] bg-[#D4AF37]/15 px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                  T-{realTableNumber}
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/[0.04] p-1 rounded-2xl border border-white/[0.1] backdrop-blur-md">
              {[
                { code: 'en', label: 'EN' },
                { code: 'te', label: 'తెలుగు' },
                { code: 'hi', label: 'हिंदी' },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => triggerGoogleTranslate(l.code as any)}
                  className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                    activeLang === l.code
                      ? 'bg-[#D4AF37] text-black font-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={tapSpring}
              onClick={() => {
                triggerHaptic(15);
                setIsTotalBillModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-[#D4AF37]/40 text-left shadow-lg cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-[#D4AF37]" />
              <div>
                <span className="text-[8px] block uppercase font-mono text-neutral-400">LEDGER</span>
                <span className="text-xs font-mono font-black text-[#FCF6BA]">
                  ₹{runningGrandTotal.toFixed(2)}
                </span>
              </div>
            </motion.button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-5">
        
        {/* HERO PROMO BANNER */}
        {banners.length > 0 && (
          <div className="relative w-full h-44 sm:h-52 overflow-hidden rounded-[26px] border border-[#D4AF37]/50 shadow-[0_8px_30px_rgba(0,0,0,0.7)] bg-neutral-950">
            <AnimatePresence mode="wait">
              {banners[currentBannerIndex] && (
                <motion.div
                  key={banners[currentBannerIndex].id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                  className="w-full h-full"
                >
                  <img
                    src={banners[currentBannerIndex].image_url}
                    alt={banners[currentBannerIndex].title || 'Promo Banner'}
                    className="w-full h-full object-cover object-center"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

            {banners.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentBannerIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentBannerIndex 
                        ? 'w-5 bg-[#D4AF37]' 
                        : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#D4AF37]/80 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search our handcrafted delights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] text-white placeholder-neutral-500 rounded-2xl pl-11 pr-4 py-2.5 text-xs outline-none border border-white/[0.08] focus:border-[#D4AF37]/50 transition font-sans"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* TOP LIST */}
        {!searchQuery && topListDishes.length > 0 && selectedCategory !== 'combos' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white tracking-wide">Top List</h3>
                <span className="text-[10px] text-neutral-400 font-mono">Our highest ordered delicacies</span>
              </div>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {topListDishes.map((dish) => {
                const inCart = cart.find(ci => ci.menuItem.id === dish.id && !ci.isCombo);
                return (
                  <div
                    key={'top-' + dish.id}
                    className="p-2.5 rounded-[24px] bg-gradient-to-b from-[#181612] via-[#100f0c] to-[#0a0a09] border border-[#D4AF37]/35 flex flex-col justify-between shadow-xl relative overflow-hidden"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full overflow-hidden border border-[#D4AF37]/50 shadow-md bg-neutral-900 mb-1.5 shrink-0">
                        {dish.image_url ? (
                          <img src={dish.image_url} alt={dish.name_en} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-600">
                            <ImgIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] font-bold text-amber-300 font-mono flex items-center gap-0.5">
                        ★ Top Pick
                      </span>
                      <h4 className="text-[11px] font-black text-white leading-tight truncate w-full mt-0.5">
                        {dish.name_en || dish.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/10">
                      <span className="font-mono text-xs font-black text-[#D4AF37]">
                        ₹{Number(dish.price).toFixed(0)}
                      </span>

                      {inCart ? (
                        <div className="flex items-center bg-white/[0.08] rounded-xl px-1 py-0.5">
                          <button onClick={() => removeFromCart(dish.id, false)} className="text-[#FCF6BA]"><Minus className="w-2.5 h-2.5" /></button>
                          <span className="font-mono font-bold text-[10px] text-white px-1">{inCart.quantity}</span>
                          <button onClick={() => addToCart(dish, false)} className="text-[#FCF6BA]"><Plus className="w-2.5 h-2.5" /></button>
                        </div>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => addToCart(dish, false)}
                          className="w-6 h-6 rounded-full bg-[#D4AF37] text-black flex items-center justify-center font-black shadow-md cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. STICKY CATEGORIES BAR */}
        <div className="sticky top-[58px] z-30 py-1.5 bg-[#060608]/95 backdrop-blur-xl">
          <div 
            ref={categoryScrollRef}
            className="p-1 rounded-[24px] bg-white/[0.03] border border-white/[0.08] flex gap-1.5 overflow-x-auto custom-gold-scrollbar select-none items-center scroll-smooth"
          >
            {combos.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  triggerHaptic(15);
                  setSelectedCategory('combos');
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }}
                className={`relative px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition cursor-pointer ${
                  selectedCategory === 'combos' ? 'text-black font-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {selectedCategory === 'combos' && (
                  <motion.div
                    layoutId="custPill"
                    className="absolute inset-0 bg-[#D4AF37] rounded-2xl shadow-md"
                    transition={smoothSpring}
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
                  onClick={(e) => {
                    triggerHaptic(15);
                    setSelectedCategory(cat.id);
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }}
                  className={`relative px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                    isSelected ? 'text-black font-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="custPill"
                      className="absolute inset-0 bg-[#D4AF37] rounded-2xl shadow-md"
                      transition={smoothSpring}
                    />
                  )}
                  <span className="relative z-10">{cat.name_en || cat.name}</span>
                </button>
              );
            })}
          </div>

          {selectedCategory !== 'combos' && (
            <div className="flex gap-1.5 text-[10px] font-mono mt-1.5">
              <button
                onClick={() => setFoodFilter('all')}
                className={`px-3 py-1 rounded-xl border transition ${foodFilter === 'all' ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FCF6BA]' : 'bg-white/[0.02] border-white/5 text-neutral-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setFoodFilter('veg')}
                className={`px-3 py-1 rounded-xl border transition flex items-center gap-1.5 ${foodFilter === 'veg' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' : 'bg-white/[0.02] border-white/5 text-neutral-400'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Veg Only
              </button>
              <button
                onClick={() => setFoodFilter('non_veg')}
                className={`px-3 py-1 rounded-xl border transition flex items-center gap-1.5 ${foodFilter === 'non_veg' ? 'bg-rose-950/40 border-rose-500 text-rose-300' : 'bg-white/[0.02] border-white/5 text-neutral-400'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Non-Veg
              </button>
            </div>
          )}
        </div>

        {/* 4. DISHES & COMBOS GRID */}
        {selectedCategory === 'combos' ? (
          <div className="space-y-4">
            {combos.map((combo) => {
              const inCart = cart.find((ci) => ci.menuItem.id === combo.id && ci.isCombo);
              const saveAmt = Number(combo.original_price || 0) > Number(combo.price) ? (Number(combo.original_price) - Number(combo.price)) : 0;

              return (
                <div key={'cmb-' + combo.id} className="bg-gradient-to-b from-[#131210] to-[#09090b] border border-[#D4AF37]/40 rounded-[28px] p-4 shadow-xl space-y-3">
                  {combo.image_url && (
                    <div className="h-40 w-full rounded-2xl overflow-hidden bg-neutral-950">
                      <img src={combo.image_url} alt={combo.name} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="text-base font-black text-white">{combo.name_en || combo.name}</h4>
                      {saveAmt > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                          Save ₹{saveAmt.toFixed(0)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 font-sans mt-1">
                      {combo.description || 'Includes handcrafted delights.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-base font-black text-[#D4AF37]">₹{Number(combo.price).toFixed(2)}</span>
                      {combo.original_price > combo.price && (
                        <span className="line-through text-neutral-500 text-xs font-mono">₹{Number(combo.original_price).toFixed(2)}</span>
                      )}
                    </div>

                    {inCart ? (
                      <div className="flex items-center bg-white/[0.08] border border-[#D4AF37]/60 rounded-xl p-0.5">
                        <button onClick={() => removeFromCart(combo.id, true)} className="p-1.5 text-[#FCF6BA]"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="font-mono font-bold text-xs text-white px-2">{inCart.quantity}</span>
                        <button onClick={() => addToCart(combo, true)} className="p-1.5 text-[#FCF6BA]"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => addToCart(combo, true)}
                        className="px-4 py-2 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase cursor-pointer"
                      >
                        + Add Combo
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
              const dishTitle = item.name_en || item.name;
              const isSpecial = item.is_special;

              return (
                <div key={item.id} className="bg-gradient-to-b from-[#111114] to-[#08080a] border border-white/[0.08] rounded-[24px] p-3 flex flex-col justify-between shadow-xl relative overflow-hidden">
                  <div>
                    <div className="h-28 w-full rounded-2xl overflow-hidden bg-neutral-950 mb-2 relative">
                      {item.image_url ? (
                        <img src={item.image_url} alt={dishTitle} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                          <ImgIcon className="w-6 h-6" />
                        </div>
                      )}
                      <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${item.food_type === 'non_veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      {isSpecial && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-[#D4AF37] text-black font-mono text-[8px] font-black uppercase flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" /> Special
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1">{dishTitle}</h4>
                    {item.description_en && (
                      <p className="text-[10px] text-neutral-400 font-sans line-clamp-1 mt-0.5">{item.description_en}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06]">
                    <span className="font-mono text-xs font-black text-[#D4AF37]">₹{Number(item.price).toFixed(2)}</span>

                    {inCart ? (
                      <div className="flex items-center bg-white/[0.08] border border-[#D4AF37]/60 rounded-xl p-0.5">
                        <button onClick={() => removeFromCart(item.id, false)} className="p-1 text-[#FCF6BA]"><Minus className="w-3 h-3" /></button>
                        <span className="font-mono font-bold text-[11px] text-white px-1.5">{inCart.quantity}</span>
                        <button onClick={() => addToCart(item, false)} className="p-1 text-[#FCF6BA]"><Plus className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => addToCart(item, false)}
                        className="w-7 h-7 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center font-black cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </motion.button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. BOTTOM SERVICES DOCK */}
      <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40">
        <div className="p-2 rounded-[28px] bg-[#0c0c0e]/95 border border-[#D4AF37]/50 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex items-center justify-between gap-2">
          
          <button
            onClick={() => {
              triggerHaptic(15);
              setIsWaiterModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono font-bold text-neutral-300 cursor-pointer"
          >
            <BellRing className="w-4 h-4 text-[#D4AF37]" />
            <span>Call Waiter</span>
          </button>

          {cartItemCount > 0 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                triggerHaptic(20);
                setIsCartOpen(true);
              }}
              className="flex-1 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black py-2.5 px-4 rounded-2xl flex items-center justify-between font-black text-xs font-mono shadow-lg cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="bg-black text-[#FCF6BA] px-2 py-0.5 rounded-lg text-[10px]">
                  {cartItemCount}
                </span>
                <span>View Cart</span>
              </div>
              <span>₹{cartGrandTotal.toFixed(2)} ➔</span>
            </motion.button>
          ) : (
            <button
              onClick={() => setIsTotalBillModalOpen(true)}
              className="flex-1 py-2 rounded-2xl text-xs font-mono text-neutral-400 hover:text-white text-right pr-2 cursor-pointer"
            >
              Running Bill: <strong className="text-[#D4AF37]">₹{runningGrandTotal.toFixed(2)}</strong>
            </button>
          )}
        </div>
      </div>

      {/* 6. CART DRAWER (With Cooking Notes) */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={smoothSpring}
              className="relative w-full max-w-md mx-auto bg-[#0d0d0f] border-t border-x border-[#D4AF37]/50 rounded-t-[36px] p-6 pb-8 space-y-4 z-10 max-h-[85vh] overflow-y-auto custom-gold-scrollbar shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base">Your Dining Cart</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3 divide-y divide-white/5">
                {cart.map((ci) => {
                  const itemKey = (ci.isCombo ? 'c-' : 'i-') + ci.menuItem.id;
                  return (
                    <div key={itemKey} className="pt-2 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white">{ci.menuItem.name_en || ci.menuItem.name}</div>
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

                      <div className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-xl px-2.5 py-1.5">
                        <MessageSquare className="w-3 h-3 text-[#D4AF37]" />
                        <input
                          type="text"
                          placeholder="Note: Less ice, no sugar, extra nuts..."
                          value={cartNotes[itemKey] || ''}
                          onChange={(e) => setCartNotes({ ...cartNotes, [itemKey]: e.target.value })}
                          className="w-full bg-transparent text-white outline-none text-[11px] placeholder-neutral-500 font-sans"
                        />
                      </div>
                    </div>
                  );
                })}
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
                    className="w-full bg-[#161619] border border-[#D4AF37]/40 rounded-xl px-3.5 py-2.5 text-white outline-none"
                  />
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="10-digit Phone Number *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#161619] border border-[#D4AF37]/40 rounded-xl px-3.5 py-2.5 text-white outline-none font-mono"
                  />
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1 text-xs font-mono">
                <div className="flex justify-between text-white font-black text-sm">
                  <span>Payable at Counter (Flat Zero GST):</span>
                  <span className="text-[#D4AF37]">₹{cartGrandTotal.toFixed(2)}</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={loading}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-lg cursor-pointer"
              >
                {loading ? 'Sending to Kitchen...' : (activeSessionId ? 'Add to Running Order' : 'Confirm & Dispatch to Kitchen')}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. TABLE LEDGER MODAL WITH COOKING NOTES */}
      <AnimatePresence>
        {isTotalBillModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="w-full max-w-sm bg-[#0d0d0f] border border-[#D4AF37]/60 rounded-3xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto custom-gold-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base font-mono">Table Ledger & Bill</h3>
                </div>
                <button onClick={() => setIsTotalBillModalOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto custom-gold-scrollbar p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs font-mono">
                {sessionOrderedItems.length === 0 ? (
                  <div className="text-center py-4 text-neutral-500">No active kitchen orders.</div>
                ) : (
                  sessionOrderedItems.map((item, idx) => (
                    <div key={idx} className="space-y-0.5 border-b border-white/5 pb-1.5 last:border-b-0">
                      <div className="flex justify-between items-center">
                        <span>{item.quantity}x {item.menu_items?.name_en || item.menu_items?.name}</span>
                        <span className="font-black text-white">₹{(item.quantity * Number(item.unit_price || item.menu_items?.price || 0)).toFixed(2)}</span>
                      </div>
                      {item.cooking_notes && (
                        <div className="text-[10px] text-amber-300 italic">
                          &gt;&gt; {item.cooking_notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[#D4AF37]/40 text-xs font-mono space-y-1">
                <div className="flex justify-between font-black text-white text-sm">
                  <span>Net Payable (Flat Zero GST):</span>
                  <span className="text-[#D4AF37] text-base">₹{runningGrandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Fair Share Split Bill */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-[#D4AF37]/40 space-y-2 font-mono shadow-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#D4AF37] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Split className="w-4 h-4 text-[#D4AF37]" /> Split Bill (Fair Share)
                  </span>
                  <div className="flex items-center gap-2 bg-black border border-white/15 rounded-xl px-2.5 py-1">
                    <button 
                      onClick={() => setSplitCount(Math.max(1, splitCount - 1))} 
                      className="text-[#D4AF37] font-black px-1 text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-white font-black text-xs">{splitCount} Ppl</span>
                    <button 
                      onClick={() => setSplitCount(splitCount + 1)} 
                      className="text-[#D4AF37] font-black px-1 text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/10 text-xs">
                  <span className="text-neutral-300">Each Person Share (ఒక్కొక్కరికి):</span>
                  <span className="text-sm font-black text-emerald-400">₹{splitAmountPerPerson}</span>
                </div>
              </div>

              <button
                onClick={() => setIsTotalBillModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-black border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-xs uppercase cursor-pointer"
              >
                Close Ledger
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. CALL WAITER MODAL */}
      <AnimatePresence>
        {isWaiterModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs bg-[#0f0e12] border border-[#D4AF37]/60 rounded-[28px] p-5 space-y-4 shadow-2xl font-mono text-xs text-center"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                <span className="font-black text-white uppercase flex items-center gap-1.5">
                  <BellRing className="w-4 h-4 text-[#D4AF37]" /> Call Waiter
                </span>
                <button onClick={() => setIsWaiterModalOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-4 h-4 text-neutral-400" /></button>
              </div>

              <p className="text-neutral-400 text-[11px]">
                What can our staff assist you with at <strong>{displayTableName}</strong>?
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => handleCallWaiter('water')}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-cyan-400 text-cyan-300 font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Droplets className="w-4 h-4" /> Need Drinking Water
                </button>
                <button
                  onClick={() => handleCallWaiter('waiter')}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-400 text-amber-300 font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ChefHat className="w-4 h-4" /> Call Staff / Order Help
                </button>
                <button
                  onClick={() => handleCallWaiter('bill')}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-emerald-400 text-emerald-300 font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" /> Request Bill to Table
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}