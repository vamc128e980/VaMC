// @ts-nocheck
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Category, MenuItem, CartItem, MenuAddon } from '@/types/restaurant';
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
  BellRing,
  Droplets,
  Flame,
  Crown,
  ChefHat,
  MessageSquare,
  CheckCircle2,
  Gift,
  Layers,
  Scale,
  Hash,
  Check,
  Award
} from 'lucide-react';

const butterSpring = { type: 'spring', stiffness: 420, damping: 32, mass: 0.45 };
const tapSpring = { type: 'spring', stiffness: 500, damping: 25, mass: 0.4 };

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
  const [addons, setAddons] = useState<MenuAddon[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  
  // Banners State (Strictly Uploaded Images Only - No Title Overlays)
  const [banners, setBanners] = useState<any[]>([
    {
      id: 999,
      image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=1200&auto=format&fit=crop'
    }
  ]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [topPickDishIds, setTopPickDishIds] = useState<number[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'combos' | null>(null);
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'non_veg'>('all');

  // Add-ons Customization Bottom Sheet
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  const [selectedWeightVariant, setSelectedWeightVariant] = useState<any | null>(null);

  // Cart & Item-wise Cooking Notes
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartNotes, setCartNotes] = useState<Record<string, string>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Active Dining Session & Customer Loyalty
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerVisitCount, setCustomerVisitCount] = useState<number>(1);
  const [isRewardClaimedThisSession, setIsRewardClaimedThisSession] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);

  // Active Live Order Token / PIN
  const [activeOrderToken, setActiveOrderToken] = useState<string | null>(null);
  const [activeBatchStatus, setActiveBatchStatus] = useState<string | null>(null);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionTotal, setActiveSessionTotal] = useState<number>(0);
  const [sessionOrderedItems, setSessionOrderedItems] = useState<any[]>([]);
  const [isTotalBillModalOpen, setIsTotalBillModalOpen] = useState(false);

  // Waiter Call Feature
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [waiterToast, setWaiterToast] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Language Trigger
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

  // Dynamic Identity Resolver
  const resolveTableIdentity = async () => {
    if (!rawTableParam) return;
    try {
      const cleanParam = rawTableParam.trim();
      const isNumeric = /^\d+$/.test(cleanParam);
      let matched = null;

      if (isNumeric) {
        const { data } = await supabase
          .from('restaurant_tables')
          .select('*')
          .eq('table_number', parseInt(cleanParam))
          .maybeSingle();
        matched = data;
      } else {
        const { data } = await supabase
          .from('restaurant_tables')
          .select('*')
          .ilike('table_name', cleanParam)
          .maybeSingle();
        matched = data;
      }

      if (matched) {
        const tNum = matched.table_number;
        const assignedName = matched.table_name || `Table #${tNum}`;
        setRealTableNumber(tNum);
        setDisplayTableName(assignedName);
        setTableResolved(true);
        setTableNotFound(false);

        if (typeof window !== 'undefined' && matched.table_name && matched.table_name.trim() !== '') {
          const targetPath = `/table/${encodeURIComponent(matched.table_name.trim())}`;
          if (window.location.pathname !== targetPath) {
            window.history.replaceState(null, '', targetPath);
          }
        }
        return;
      } else {
        if (isNumeric) {
          const fallbackNum = parseInt(cleanParam);
          setRealTableNumber(fallbackNum);
          setDisplayTableName(`Table #${fallbackNum}`);
          setTableResolved(true);
          setTableNotFound(false);
        } else {
          setTableNotFound(true);
          setTableResolved(false);
        }
      }
    } catch (err) {
      if (/^\d+$/.test(rawTableParam.trim())) {
        const fallbackNum = parseInt(rawTableParam.trim());
        setRealTableNumber(fallbackNum);
        setDisplayTableName(`Table #${fallbackNum}`);
        setTableResolved(true);
        setTableNotFound(false);
      } else {
        setTableNotFound(true);
        setTableResolved(false);
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

  const fetchLatestOrderToken = async (sessionId: string) => {
    try {
      const { data } = await supabase
        .from('order_batches')
        .select('id, order_pin, status')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setActiveOrderToken(data.order_pin);
        setActiveBatchStatus(data.status);
      }
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
      fetchLatestOrderToken(session.id);
      localStorage.setItem(`table_sess_${realTableNumber}`, session.id);

      if (session.customer_phone) {
        checkLoyaltyProfile(session.customer_phone);
      }
    } else {
      setActiveSessionId(null);
      setActiveSessionTotal(0);
      setCustomerName('');
      setCustomerPhone('');
      setSessionOrderedItems([]);
      setActiveOrderToken(null);
      setActiveBatchStatus(null);
      localStorage.removeItem(`table_sess_${realTableNumber}`);
    }
  };

  const checkLoyaltyProfile = async (phone: string) => {
    if (!phone || phone.length !== 10) return;
    try {
      const { data } = await supabase
        .from('customer_loyalty')
        .select('*')
        .eq('phone', phone.trim())
        .maybeSingle();

      if (data) {
        setCustomerVisitCount(data.total_visits || 1);
      } else {
        setCustomerVisitCount(1);
      }
    } catch (e) {}
  };

  const fetchMenuData = async () => {
    const [
      { data: cats },
      { data: items },
      { data: adns },
      { data: cmbs },
      { data: bnrs }
    ] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('menu_items').select('*').eq('is_available', true).order('id', { ascending: true }),
      supabase.from('menu_addons').select('*').eq('is_available', true).order('id', { ascending: true }),
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
    if (adns) setAddons(adns);
    if (cmbs) setCombos(cmbs);
    if (bnrs && bnrs.length > 0) {
      setBanners(bnrs);
      setCurrentBannerIndex(0);
    }

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

  useEffect(() => {
    if (!tableResolved || !realTableNumber) return;
    syncSessionData();
    fetchMenuData();

    const channel = supabase
      .channel(`table-${realTableNumber}-realtime-hub`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', filter: `table_number=eq.${realTableNumber}` }, () => syncSessionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_banners' }, () => fetchMenuData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [realTableNumber, tableResolved]);

  // Auto-Slide Interval for Promo Banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length]);

  const handleItemAddClick = (item: MenuItem) => {
    triggerHaptic(15);
    const hasAddons = item.has_addons;
    const hasRetailVariants = item.is_retail_item && Array.isArray(item.weight_variants) && item.weight_variants.length > 0;

    if (hasAddons || hasRetailVariants) {
      setCustomizingItem(item);
      setSelectedAddonIds([]);
      if (hasRetailVariants) {
        setSelectedWeightVariant(item.weight_variants[0]);
      } else {
        setSelectedWeightVariant(null);
      }
    } else {
      addToCartDirect(item, false);
    }
  };

  const addToCartDirect = (item: any, isCombo = false, chosenAddons: MenuAddon[] = [], chosenVariant: any = null, isFree = false) => {
    triggerHaptic(15);
    const effectivePrice = isFree ? 0 : (chosenVariant ? chosenVariant.price : item.price);

    setCart((prev) => {
      const existing = prev.find((ci) => 
        ci.menuItem.id === item.id && 
        ci.isCombo === isCombo && 
        ci.isComplimentary === isFree &&
        ci.selectedWeightVariant?.size === chosenVariant?.size &&
        JSON.stringify(ci.selectedAddons?.map(a => Number(a.id)).sort()) === JSON.stringify(chosenAddons.map(a => Number(a.id)).sort())
      );

      if (existing) {
        return prev.map((ci) => ci === existing ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { 
        menuItem: { ...item, price: effectivePrice }, 
        quantity: 1, 
        isCombo,
        selectedAddons: chosenAddons,
        selectedWeightVariant: chosenVariant,
        isComplimentary: isFree
      }];
    });
  };

  const confirmCustomizationAndAdd = () => {
    if (!customizingItem) return;
    const chosenAddons = addons.filter(a => selectedAddonIds.includes(Number(a.id)));
    addToCartDirect(customizingItem, false, chosenAddons, selectedWeightVariant, false);
    setCustomizingItem(null);
    setSelectedAddonIds([]);
    setSelectedWeightVariant(null);
  };

  const removeFromCart = (cartItemIndex: number) => {
    triggerHaptic(12);
    setCart((prev) => {
      const target = prev[cartItemIndex];
      if (!target) return prev;
      if (target.quantity > 1) {
        return prev.map((ci, idx) => idx === cartItemIndex ? { ...ci, quantity: ci.quantity - 1 } : ci);
      }
      return prev.filter((_, idx) => idx !== cartItemIndex);
    });
  };

  const cartGrandTotal = useMemo(() => {
    return cart.reduce((sum, ci) => {
      if (ci.isComplimentary) return sum;
      const basePrice = Number(ci.menuItem.price || 0);
      const addOnsTotal = (ci.selectedAddons || []).reduce((aSum, a) => aSum + Number(a.price || 0), 0);
      return sum + ((basePrice + addOnsTotal) * ci.quantity);
    }, 0);
  }, [cart]);

  const cartItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const runningGrandTotal = activeSessionTotal + cartGrandTotal;

  const cartSuggestedItems = useMemo(() => {
    const suggestedIds = new Set<number>();
    cart.forEach(ci => {
      if (Array.isArray(ci.menuItem.suggested_item_ids)) {
        ci.menuItem.suggested_item_ids.forEach(id => suggestedIds.add(Number(id)));
      }
    });
    const currentCartDishIds = new Set(cart.map(ci => Number(ci.menuItem.id)));
    return menuItems.filter(m => suggestedIds.has(Number(m.id)) && !currentCartDishIds.has(Number(m.id)));
  }, [cart, menuItems]);

  const freeRewardDrinks = useMemo(() => {
    return menuItems.filter(m => Number(m.price) <= 70 && m.food_type !== 'non_veg').slice(0, 4);
  }, [menuItems]);

  const is10thVisitMilestone = customerVisitCount >= 10 && customerVisitCount % 10 === 0;

  const handleClaimFreeReward = (drink: MenuItem) => {
    triggerHaptic(25);
    addToCartDirect(drink, false, [], null, true);
    setIsRewardClaimedThisSession(true);
    setShowRewardModal(false);
    setWaiterToast(`🎁 ${drink.name_en || drink.name} added FREE for your 10th Visit!`);
    setTimeout(() => setWaiterToast(null), 4000);
  };

  const handleCallWaiter = async (callType: 'water' | 'waiter') => {
    if (!realTableNumber) return;
    triggerHaptic(25);
    try {
      await supabase.from('waiter_calls').insert({
        table_number: realTableNumber,
        call_type: callType,
        status: 'pending'
      });
      setIsWaiterModalOpen(false);
      setWaiterToast(`🔔 Steward notified for ${displayTableName}!`);
      setTimeout(() => setWaiterToast(null), 4000);
    } catch (e) {
      alert('Unable to notify waiter.');
    }
  };

  const handlePlaceOrder = async () => {
    triggerHaptic(30);
    if (!realTableNumber) return alert('Invalid table.');
    if (!activeSessionId && (customerName.trim().length < 2 || customerPhone.length !== 10)) {
      return alert('Please enter Guest Name & 10-digit Phone.');
    }

    setLoading(true);
    try {
      let sessionId = activeSessionId;
      const newTotal = activeSessionTotal + cartGrandTotal;

      if (!sessionId) {
        const { data: newSession, error: sErr } = await supabase
          .from('table_sessions')
          .insert({
            table_number: realTableNumber,
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            subtotal: cartGrandTotal,
            total_amount: cartGrandTotal,
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

      const randomToken = Math.floor(1000 + Math.random() * 9000).toString();
      const { data: batch, error: bErr } = await supabase
        .from('order_batches')
        .insert({
          session_id: sessionId,
          table_number: realTableNumber,
          status: 'pending_waiter',
          order_pin: randomToken
        })
        .select()
        .single();

      if (bErr) throw bErr;
      setActiveOrderToken(batch.order_pin || randomToken);
      setActiveBatchStatus('pending_waiter');

      const orderPayload = cart.map((ci, idx) => ({
        batch_id: batch.id,
        session_id: sessionId,
        menu_item_id: ci.menuItem.id,
        station_id: 'kitchen_hot',
        quantity: ci.quantity,
        unit_price: ci.isComplimentary ? 0 : ci.menuItem.price,
        item_status: 'ordered',
        cooking_notes: cartNotes[`${ci.menuItem.id}-${idx}`] || null,
        selected_addons: ci.selectedAddons || [],
        is_complimentary: Boolean(ci.isComplimentary),
        selected_weight_variant: ci.selectedWeightVariant?.size || null
      }));

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
    return menuItems.filter(item => {
      const dishName = (item.name_en || item.name || '').toLowerCase();
      if (searchQuery.trim()) return dishName.includes(searchQuery.toLowerCase());
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
        <h2 className="text-xl font-bold uppercase text-white">Table QR Invalid</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-[#FCF6BA] pb-36 font-sans antialiased relative overflow-x-hidden">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#060608]/90 backdrop-blur-2xl px-4 pt-3.5 pb-3 border-b border-white/[0.08] shadow-2xl">
        <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div>
            <span className="text-[9px] tracking-[0.2em] font-mono uppercase text-[#D4AF37] block font-bold">ROYAL FINE-DINE</span>
            <h1 className="text-base font-black text-amber-200 tracking-wide mt-0.5">{displayTableName}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTotalBillModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-[#D4AF37]/40 text-left shadow-lg cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-[#D4AF37]" />
              <div>
                <span className="text-[8px] block uppercase font-mono text-neutral-400">LEDGER</span>
                <span className="text-xs font-mono font-black text-[#FCF6BA]">₹{runningGrandTotal.toFixed(2)}</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto px-4 pt-4 space-y-4">

        {/* 10th Visit Reward Card */}
        {is10thVisitMilestone && !isRewardClaimedThisSession && (
          <div className="p-4 rounded-[26px] bg-gradient-to-r from-[#211a0c] via-[#17140b] to-[#0a0907] border border-[#D4AF37] shadow-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-[#D4AF37] animate-bounce shrink-0" />
              <div>
                <span className="text-xs font-black text-[#FCF6BA] block">🎉 10th Qualifying Visit Milestone!</span>
                <span className="text-[10px] text-neutral-300 block">Claim 1 Free Fresh Juice (Min ₹180 spend per visit reached).</span>
              </div>
            </div>
            <button
              onClick={() => setShowRewardModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#D4AF37] text-black font-black text-[10px] uppercase font-mono tracking-wider shrink-0 cursor-pointer"
            >
              Claim Drink
            </button>
          </div>
        )}

        {/* Token Badge */}
        {activeOrderToken && (
          <div className="p-3.5 rounded-[24px] bg-[#16140e] border border-[#D4AF37] shadow-xl flex items-center justify-between font-mono">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center font-black">
                <Hash className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block">Order Token</span>
                <span className="text-base font-black text-white">#{activeOrderToken}</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
              {activeBatchStatus === 'pending_waiter' ? 'Pending Steward' : 'In Kitchen 👨‍🍳'}
            </span>
          </div>
        )}

        {/* CLEAN BANNER CAROUSEL (STRICTLY UPLOADED IMAGES ONLY - NO TITLES) */}
        {banners.length > 0 && (
          <div className="relative w-full h-44 sm:h-56 md:h-64 overflow-hidden rounded-[28px] border border-[#D4AF37]/50 shadow-2xl bg-neutral-950">
            <AnimatePresence mode="wait">
              {banners[currentBannerIndex] && (
                <motion.div
                  key={banners[currentBannerIndex].id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full relative"
                >
                  <img
                    src={banners[currentBannerIndex].image_url}
                    alt="Promo Banner"
                    className="w-full h-full object-cover object-center"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pagination Dots */}
            {banners.length > 1 && (
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-20 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentBannerIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentBannerIndex ? 'w-6 bg-[#D4AF37]' : 'w-1.5 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#D4AF37]/80 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search our handcrafted delights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] text-white placeholder-neutral-500 rounded-2xl pl-11 pr-4 py-2.5 text-xs outline-none border border-white/[0.08]"
          />
        </div>

        {/* Categories Bar */}
        <div className="sticky top-[58px] z-30 py-2 bg-[#060608]/95 backdrop-blur-xl border-b border-white/[0.05]">
          <div 
            ref={categoryScrollRef}
            className="p-1.5 rounded-[26px] bg-white/[0.03] border border-white/[0.08] flex gap-2 overflow-x-auto select-none items-center scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
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
                    isSelected ? 'text-black font-black bg-[#D4AF37] shadow-md' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>{cat.name_en || cat.name} {cat.category_type === 'retail' ? '🛍️' : ''}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dishes Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredMenuItems.map((item) => {
            const inCart = cart.find(ci => ci.menuItem.id === item.id);
            const dishTitle = item.name_en || item.name;

            return (
              <div key={item.id} className="bg-gradient-to-b from-[#111114] to-[#08080a] border border-white/[0.08] rounded-[24px] p-3 flex flex-col justify-between shadow-xl relative">
                <div>
                  <div className="h-28 sm:h-32 w-full rounded-2xl overflow-hidden bg-neutral-950 mb-2 relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt={dishTitle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600"><ImgIcon className="w-6 h-6" /></div>
                    )}
                    <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${item.food_type === 'non_veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{dishTitle}</h4>
                </div>

                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06]">
                  <div>
                    <span className="font-mono text-xs font-black text-[#D4AF37]">₹{Number(item.price).toFixed(0)}</span>
                    {item.has_addons && <span className="text-[8px] font-mono text-amber-300 block">+ Addons</span>}
                  </div>

                  {inCart ? (
                    <div className="flex items-center bg-white/[0.08] border border-[#D4AF37]/60 rounded-xl p-0.5">
                      <button onClick={() => removeFromCart(cart.indexOf(inCart))} className="p-1 text-[#FCF6BA] cursor-pointer"><Minus className="w-3 h-3" /></button>
                      <span className="font-mono font-bold text-[11px] text-white px-1.5">{inCart.quantity}</span>
                      <button onClick={() => handleItemAddClick(item)} className="p-1 text-[#FCF6BA] cursor-pointer"><Plus className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleItemAddClick(item)}
                      className="w-7 h-7 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center font-black cursor-pointer shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Action Dock */}
      <div className="fixed bottom-4 inset-x-4 max-w-md md:max-w-xl mx-auto z-50 pointer-events-none">
        <div className="pointer-events-auto p-2 rounded-[28px] bg-[#0c0c0e]/95 border border-[#D4AF37]/50 shadow-[0_12px_40px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => handleCallWaiter('water')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono font-bold text-neutral-300 cursor-pointer"
          >
            <BellRing className="w-4 h-4 text-[#D4AF37]" />
            <span>Call Steward</span>
          </button>

          {cartItemCount > 0 ? (
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex-1 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black py-2.5 px-4 rounded-2xl flex items-center justify-between font-black text-xs font-mono shadow-lg cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="bg-black text-[#FCF6BA] px-2 py-0.5 rounded-lg text-[10px]">{cartItemCount}</span>
                <span>View Cart</span>
              </div>
              <span>₹{cartGrandTotal.toFixed(2)} ➔</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsTotalBillModalOpen(true)}
              className="flex-1 py-2 rounded-2xl text-xs font-mono text-neutral-400 hover:text-white text-right pr-3 cursor-pointer"
            >
              Running Bill: <strong className="text-[#D4AF37]">₹{runningGrandTotal.toFixed(2)}</strong>
            </button>
          )}
        </div>
      </div>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={butterSpring}
              className="relative w-full max-w-md mx-auto bg-[#0d0d0f] border-t border-x border-[#D4AF37]/50 rounded-t-[36px] p-6 pb-8 space-y-4 z-10 max-h-[88vh] overflow-y-auto custom-gold-scrollbar shadow-2xl font-mono text-xs"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base">Your Dining Cart</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3 divide-y divide-white/5">
                {cart.map((ci, idx) => {
                  const addOnsCost = (ci.selectedAddons || []).reduce((sum, a) => sum + Number(a.price || 0), 0);
                  const singleUnitPrice = ci.isComplimentary ? 0 : (Number(ci.menuItem.price || 0) + addOnsCost);
                  return (
                    <div key={idx} className="pt-2 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">{ci.menuItem.name_en || ci.menuItem.name}</span>
                        {ci.selectedAddons && ci.selectedAddons.length > 0 && (
                          <div className="text-[10px] text-amber-300 mt-0.5">
                            {ci.selectedAddons.map(a => `+ ${a.name}`).join(', ')}
                          </div>
                        )}
                        <span className="text-[#D4AF37]">{ci.isComplimentary ? 'FREE' : `₹${singleUnitPrice.toFixed(2)}`}</span>
                      </div>
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
                        <button onClick={() => removeFromCart(idx)} className="p-1 text-[#D4AF37] cursor-pointer"><Minus className="w-3 h-3" /></button>
                        <span className="px-2 font-bold text-white">{ci.quantity}</span>
                        <button onClick={() => addToCartDirect(ci.menuItem, ci.isCombo, ci.selectedAddons, ci.selectedWeightVariant, ci.isComplimentary)} className="p-1 text-[#D4AF37] cursor-pointer"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!activeSessionId && (
                <div className="space-y-2 pt-2 border-t border-white/10">
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
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '');
                      setCustomerPhone(clean);
                      if (clean.length === 10) checkLoyaltyProfile(clean);
                    }}
                    className="w-full bg-[#161619] border border-[#D4AF37]/40 rounded-xl px-3.5 py-2.5 text-white outline-none"
                  />
                </div>
              )}

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
                <div className="flex justify-between text-white font-black text-sm">
                  <span>Payable at Counter (Flat Zero GST):</span>
                  <span className="text-[#D4AF37] text-base">₹{cartGrandTotal.toFixed(2)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-[#181610] to-black border border-amber-400/40 flex items-start gap-2.5 text-[10px] text-amber-200">
                  <Award className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block text-[#FCF6BA] uppercase">10-Visit Royal Fresh Juice Gift:</span>
                    <span>Every 10 visits ki <strong>1 Free Fresh Juice</strong>! (Condition: Ochina prathi sari min. <strong>₹180+</strong> bill cheyali).</span>
                  </div>
                </div>
              </div>

              <button
                disabled={loading}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-lg cursor-pointer"
              >
                {loading ? 'Submitting Order...' : 'Submit Order & Get Token'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add-ons Bottom Sheet */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div onClick={() => setCustomizingItem(null)} className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={butterSpring}
              className="relative w-full max-w-md mx-auto bg-[#0d0d0f] border-t border-x border-[#D4AF37]/60 rounded-t-[36px] p-5 pb-8 space-y-4 z-10 max-h-[85vh] overflow-y-auto custom-gold-scrollbar shadow-2xl font-mono text-xs"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-base">{customizingItem.name_en || customizingItem.name}</h3>
                <button onClick={() => setCustomizingItem(null)} className="text-neutral-400 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-2">
                <span className="text-neutral-400 block mb-1">Upgrade with Add-ons (Optional):</span>
                {addons.filter(a => Array.isArray(customizingItem.addon_ids) ? customizingItem.addon_ids.map(Number).includes(Number(a.id)) : true).map(addon => {
                  const isChecked = selectedAddonIds.includes(Number(addon.id));
                  return (
                    <div
                      key={addon.id}
                      onClick={() => {
                        const aId = Number(addon.id);
                        if (isChecked) setSelectedAddonIds(selectedAddonIds.filter(id => id !== aId));
                        else setSelectedAddonIds([...selectedAddonIds, aId]);
                      }}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                        isChecked ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white shadow-md' : 'bg-white/[0.02] border-white/10 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center text-black font-black ${
                          isChecked ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-white/30'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="font-bold">{addon.name}</span>
                      </div>
                      <span className="text-[#D4AF37] font-black">+₹{Number(addon.price).toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={confirmCustomizationAndAdd}
                className="w-full py-3.5 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs cursor-pointer shadow-lg mt-2"
              >
                Add to Dining Cart
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Table Ledger Modal */}
      <AnimatePresence>
        {isTotalBillModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0d0d0f] border border-[#D4AF37]/60 rounded-3xl p-6 shadow-2xl space-y-4 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-base">Table Ledger & Bill</h3>
                <button onClick={() => setIsTotalBillModalOpen(false)} className="text-neutral-400 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              {activeOrderToken && (
                <div className="p-2.5 rounded-xl bg-[#161619] border border-[#D4AF37]/40 flex justify-between items-center">
                  <span className="text-neutral-400">Order Token:</span>
                  <span className="text-[#D4AF37] font-black text-sm">#{activeOrderToken}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-white text-sm pt-2 border-t border-white/10">
                <span>Net Payable:</span>
                <span className="text-[#D4AF37]">₹{runningGrandTotal.toFixed(2)}</span>
              </div>
              <button onClick={() => setIsTotalBillModalOpen(false)} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase cursor-pointer">
                Close Ledger
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Reward Claim Modal */}
      <AnimatePresence>
        {showRewardModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0f0e12] border border-[#D4AF37] rounded-[28px] p-5 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="font-black text-white uppercase">Claim 10th Visit Reward</span>
                <button onClick={() => setShowRewardModal(false)} className="text-neutral-400 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-neutral-300 text-[11px]">Pick any drink below completely FREE (₹0.00)!</p>
              <div className="space-y-2">
                {freeRewardDrinks.map(d => (
                  <div key={d.id} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex justify-between items-center">
                    <span className="font-bold text-white">{d.name_en || d.name}</span>
                    <button onClick={() => handleClaimFreeReward(d)} className="px-3 py-1.5 rounded-lg bg-emerald-400 text-black font-black uppercase text-[10px] cursor-pointer">
                      Pick Free
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
