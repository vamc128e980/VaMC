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
  Hash
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
  const [banners, setBanners] = useState<any[]>([]);
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

  // Check 10th Visit Loyalty Status
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
    if (bnrs) {
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

  // Realtime Sync Listener
  useEffect(() => {
    if (!tableResolved || !realTableNumber) return;
    syncSessionData();
    fetchMenuData();

    const channel = supabase
      .channel(`table-${realTableNumber}-realtime-hub`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'restaurant_tables', 
        filter: `table_number=eq.${realTableNumber}` 
      }, (payload) => {
        if (payload.new && payload.new.table_name) {
          const newName = payload.new.table_name.trim();
          setDisplayTableName(newName);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `/table/${encodeURIComponent(newName)}`);
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', filter: `table_number=eq.${realTableNumber}` }, () => syncSessionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_batches' }, () => {
        if (activeSessionId) fetchLatestOrderToken(activeSessionId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        if (activeSessionId) fetchSessionItems(activeSessionId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchMenuData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchMenuData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_addons' }, () => fetchMenuData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combos' }, () => fetchMenuData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_banners' }, () => fetchMenuData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [realTableNumber, tableResolved, activeSessionId]);

  // Auto-Slide Interval for Promo Banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Open Customization or Instant Add
  const handleItemAddClick = (item: MenuItem) => {
    triggerHaptic(15);
    const hasAddons = item.has_addons && Array.isArray(item.addon_ids) && item.addon_ids.length > 0;
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
        JSON.stringify(ci.selectedAddons?.map(a => a.id).sort()) === JSON.stringify(chosenAddons.map(a => a.id).sort())
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
    const chosenAddons = addons.filter(a => selectedAddonIds.includes(a.id));
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

  // Zero-GST Totals Computation with Addons
  const cartGrandTotal = useMemo(() => {
    return cart.reduce((sum, ci) => {
      if (ci.isComplimentary) return sum;
      const basePrice = Number(ci.menuItem.price || 0);
      const addOnsTotal = (ci.selectedAddons || []).reduce((aSum, a) => aSum + Number(a.price || 0), 0);
      return sum + ((basePrice + addOnsTotal) * ci.quantity);
    }, 0);
  }, [cart]);

  const cartItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  const orderedItemsComputedTotal = sessionOrderedItems.reduce((sum, it) => {
    if (it.is_complimentary) return sum;
    const pr = Number(it.unit_price || it.menu_items?.price || 0);
    const aTotal = Array.isArray(it.selected_addons) ? it.selected_addons.reduce((aSum: number, a: any) => aSum + Number(a.price || 0), 0) : 0;
    return sum + (it.quantity * (pr + aTotal));
  }, 0);

  const liveSessionBaseTotal = activeSessionTotal > 0 ? activeSessionTotal : orderedItemsComputedTotal;
  const runningGrandTotal = liveSessionBaseTotal + cartGrandTotal;

  // Cross-sell Suggested Items
  const cartSuggestedItems = useMemo(() => {
    const suggestedIds = new Set<number>();
    cart.forEach(ci => {
      if (Array.isArray(ci.menuItem.suggested_item_ids)) {
        ci.menuItem.suggested_item_ids.forEach(id => suggestedIds.add(id));
      }
    });
    const currentCartDishIds = new Set(cart.map(ci => ci.menuItem.id));
    return menuItems.filter(m => suggestedIds.has(m.id) && !currentCartDishIds.has(m.id));
  }, [cart, menuItems]);

  // Complimentary Drinks (Under ₹60) for 10th Visit Reward
  const freeRewardDrinks = useMemo(() => {
    return menuItems.filter(m => Number(m.price) <= 60 && m.food_type !== 'non_veg').slice(0, 4);
  }, [menuItems]);

  const is10thVisitMilestone = customerVisitCount === 10 || (customerVisitCount > 0 && customerVisitCount % 10 === 0);

  const handleClaimFreeReward = (drink: MenuItem) => {
    triggerHaptic(25);
    addToCartDirect(drink, false, [], null, true);
    setIsRewardClaimedThisSession(true);
    setShowRewardModal(false);
    setWaiterToast(`🎁 ${drink.name_en || drink.name} added FREE as your 10th Visit Gift!`);
    setTimeout(() => setWaiterToast(null), 4000);
  };

  // Waiter Call Functionality
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
      const textMap = { water: 'Drinking Water requested', waiter: 'Steward called to table' };
      setWaiterToast(`🔔 ${textMap[callType]} for ${displayTableName}! Staff notified.`);
      setTimeout(() => setWaiterToast(null), 4000);
    } catch (e) {
      alert('Unable to notify waiter. Please contact counter staff.');
    }
  };

  // Place Order / Add to Running Table Bill (Generates #Token)
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

      // Generate Random 4-Digit Token (e.g. 1234)
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

      const orderPayload = cart.map((ci, idx) => {
        const itemKey = `${ci.isCombo ? 'c-' : 'i-'}${ci.menuItem.id}-${idx}`;
        return {
          batch_id: batch.id,
          session_id: sessionId,
          menu_item_id: ci.menuItem.id,
          station_id: 'kitchen_hot',
          quantity: ci.quantity,
          unit_price: ci.isComplimentary ? 0 : ci.menuItem.price,
          item_status: 'ordered',
          cooking_notes: cartNotes[itemKey] || null,
          selected_addons: ci.selectedAddons || [],
          is_complimentary: Boolean(ci.isComplimentary),
          selected_weight_variant: ci.selectedWeightVariant?.size || null
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
    <div className="min-h-screen bg-[#060608] text-[#FCF6BA] pb-32 font-sans selection:bg-[#D4AF37] selection:text-black antialiased relative overflow-x-hidden transform-gpu will-change-transform">
      
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
            transition={butterSpring}
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
            <h1 className="text-base font-black text-amber-200 tracking-wide mt-0.5">
              {displayTableName || (realTableNumber ? `Table #${realTableNumber}` : 'Loading...')}
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
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        
        {/* 10th Visit Reward Celebration Card */}
        {is10thVisitMilestone && !isRewardClaimedThisSession && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={butterSpring}
            className="p-4 rounded-[26px] bg-gradient-to-r from-[#211a0c] via-[#17140b] to-[#0a0907] border border-[#D4AF37] shadow-[0_4px_25px_rgba(212,175,55,0.25)] flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-[#D4AF37] animate-bounce" />
              </div>
              <div>
                <span className="text-xs font-black text-[#FCF6BA] block">
                  🎉 10th Royal Visit Milestone!
                </span>
                <span className="text-[10px] text-neutral-300 font-sans block">
                  Enjoy a complimentary drink under ₹60 on us!
                </span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowRewardModal(true)}
              className="px-3 py-2 rounded-xl bg-[#D4AF37] text-black font-black text-[10px] uppercase font-mono tracking-wider shrink-0 shadow-md cursor-pointer"
            >
              Claim Drink
            </motion.button>
          </motion.div>
        )}

        {/* ORDER TOKEN BADGE (Direct visual token for steward) */}
        {activeOrderToken && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={butterSpring}
            className={`p-3.5 rounded-[24px] border shadow-xl flex items-center justify-between gap-3 font-mono ${
              activeBatchStatus === 'pending_waiter'
                ? 'bg-gradient-to-r from-[#1c180e] to-[#0f0e0c] border-[#D4AF37]'
                : 'bg-[#0f1712] border-emerald-500/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                activeBatchStatus === 'pending_waiter' ? 'bg-[#D4AF37] text-black' : 'bg-emerald-400 text-black'
              }`}>
                <Hash className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block font-sans">
                  {activeBatchStatus === 'pending_waiter' ? 'Order Token (Share with Steward)' : 'Status'}
                </span>
                <span className="text-base font-black text-white">
                  #{activeOrderToken}
                </span>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
              activeBatchStatus === 'pending_waiter'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {activeBatchStatus === 'pending_waiter' ? 'Pending Steward' : 'In Kitchen 👨‍🍳'}
            </span>
          </motion.div>
        )}

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
                          <button onClick={() => removeFromCart(cart.indexOf(inCart))} className="text-[#FCF6BA]"><Minus className="w-2.5 h-2.5" /></button>
                          <span className="font-mono font-bold text-[10px] text-white px-1">{inCart.quantity}</span>
                          <button onClick={() => addToCartDirect(dish, false)} className="text-[#FCF6BA]"><Plus className="w-2.5 h-2.5" /></button>
                        </div>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => handleItemAddClick(dish)}
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
                    transition={butterSpring}
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
                      transition={butterSpring}
                    />
                  )}
                  <span className="relative z-10">
                    {cat.name_en || cat.name} {cat.category_type === 'retail' ? '🛍️' : ''}
                  </span>
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
                        <button onClick={() => removeFromCart(cart.indexOf(inCart))} className="p-1.5 text-[#FCF6BA]"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="font-mono font-bold text-xs text-white px-2">{inCart.quantity}</span>
                        <button onClick={() => addToCartDirect(combo, true)} className="p-1.5 text-[#FCF6BA]"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => addToCartDirect(combo, true)}
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
              const inCart = cart.find(ci => ci.menuItem.id === item.id && !ci.isCombo);
              const dishTitle = item.name_en || item.name;
              const isSpecial = item.is_special;
              const hasAddons = item.has_addons && item.addon_ids?.length > 0;
              const isRetail = item.is_retail_item;

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
                      {isRetail && (
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-200 font-mono text-[8px] font-bold">
                          🛍️ Gourmet
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1">{dishTitle}</h4>
                    {item.description_en && (
                      <p className="text-[10px] text-neutral-400 font-sans line-clamp-1 mt-0.5">{item.description_en}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06]">
                    <div>
                      <span className="font-mono text-xs font-black text-[#D4AF37]">₹{Number(item.price).toFixed(0)}</span>
                      {hasAddons && (
                        <span className="text-[8px] font-mono text-amber-300 block">+ Addons</span>
                      )}
                    </div>

                    {inCart ? (
                      <div className="flex items-center bg-white/[0.08] border border-[#D4AF37]/60 rounded-xl p-0.5">
                        <button onClick={() => removeFromCart(cart.indexOf(inCart))} className="p-1 text-[#FCF6BA]"><Minus className="w-3 h-3" /></button>
                        <span className="font-mono font-bold text-[11px] text-white px-1.5">{inCart.quantity}</span>
                        <button onClick={() => handleItemAddClick(item)} className="p-1 text-[#FCF6BA]"><Plus className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => handleItemAddClick(item)}
                        className="w-7 h-7 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center font-black cursor-pointer shadow-md"
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
            <span>Call Steward</span>
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

      {/* 6. ADD-ONS CUSTOMIZATION BOTTOM SHEET */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomizingItem(null)} 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={butterSpring}
              className="relative w-full max-w-md mx-auto bg-[#0d0d0f] border-t border-x border-[#D4AF37]/60 rounded-t-[36px] p-5 pb-8 space-y-4 z-10 max-h-[85vh] overflow-y-auto custom-gold-scrollbar shadow-2xl"
            >
              <div className="flex justify-between items-start border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#D4AF37] block font-bold">
                    Customize Handcrafted Delight
                  </span>
                  <h3 className="font-black text-white text-base">
                    {customizingItem.name_en || customizingItem.name}
                  </h3>
                </div>
                <button onClick={() => setCustomizingItem(null)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {customizingItem.is_retail_item && Array.isArray(customizingItem.weight_variants) && (
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-neutral-300 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" /> Select Pack Weight:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {customizingItem.weight_variants.map((v) => {
                      const isSel = selectedWeightVariant?.size === v.size;
                      return (
                        <button
                          key={v.size}
                          type="button"
                          onClick={() => {
                            triggerHaptic(10);
                            setSelectedWeightVariant(v);
                          }}
                          className={`p-2 rounded-xl text-center border font-mono transition cursor-pointer ${
                            isSel 
                              ? 'bg-[#D4AF37] text-black font-black border-transparent shadow-md' 
                              : 'bg-white/[0.03] border-white/10 text-neutral-400'
                          }`}
                        >
                          <span className="block text-xs">{v.size}</span>
                          <span className="text-[11px] block mt-0.5">₹{Number(v.price).toFixed(0)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {customizingItem.has_addons && Array.isArray(customizingItem.addon_ids) && (
                <div className="space-y-2.5">
                  <span className="text-xs font-mono font-bold text-neutral-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Upgrade with Add-ons (Optional):
                  </span>

                  <div className="space-y-2">
                    {addons.filter(a => customizingItem.addon_ids.includes(a.id)).map((addon) => {
                      const isChecked = selectedAddonIds.includes(addon.id);
                      return (
                        <div
                          key={addon.id}
                          onClick={() => {
                            triggerHaptic(12);
                            if (isChecked) setSelectedAddonIds(selectedAddonIds.filter(id => id !== addon.id));
                            else setSelectedAddonIds([...selectedAddonIds, addon.id]);
                          }}
                          className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                            isChecked 
                              ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-md' 
                              : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center text-black text-xs ${
                              isChecked ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-white/30'
                            }`}>
                              {isChecked && '✓'}
                            </div>
                            <span className="text-xs font-bold text-white">{addon.name}</span>
                          </div>
                          <span className="font-mono text-xs font-black text-[#D4AF37]">+₹{Number(addon.price).toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={confirmCustomizationAndAdd}
                className="w-full py-3.5 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-lg cursor-pointer flex justify-between px-5 font-mono"
              >
                <span>Add to Dining Cart</span>
                <span>
                  ₹{(
                    (selectedWeightVariant ? selectedWeightVariant.price : customizingItem.price) +
                    addons.filter(a => selectedAddonIds.includes(a.id)).reduce((s, a) => s + Number(a.price), 0)
                  ).toFixed(2)}
                </span>
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. CART DRAWER (With Cross-Sell Suggestions) */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)} 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={butterSpring}
              className="relative w-full max-w-md mx-auto bg-[#0d0d0f] border-t border-x border-[#D4AF37]/50 rounded-t-[36px] p-6 pb-8 space-y-4 z-10 max-h-[88vh] overflow-y-auto custom-gold-scrollbar shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base">Your Dining Cart</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* Cart Items List */}
              <div className="space-y-3 divide-y divide-white/5">
                {cart.map((ci, idx) => {
                  const itemKey = `${ci.isCombo ? 'c-' : 'i-'}${ci.menuItem.id}-${idx}`;
                  const addOnsCost = (ci.selectedAddons || []).reduce((sum, a) => sum + Number(a.price || 0), 0);
                  const singleUnitPrice = ci.isComplimentary ? 0 : (Number(ci.menuItem.price || 0) + addOnsCost);
                  const lineTotal = singleUnitPrice * ci.quantity;

                  return (
                    <div key={itemKey} className="pt-2 space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">
                              {ci.menuItem.name_en || ci.menuItem.name} {ci.selectedWeightVariant ? `(${ci.selectedWeightVariant.size})` : ''}
                            </span>
                            {ci.isComplimentary && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                                10th VISIT FREE
                              </span>
                            )}
                          </div>
                          
                          {ci.selectedAddons && ci.selectedAddons.length > 0 && (
                            <div className="text-[10px] text-amber-300 font-mono mt-0.5">
                              {ci.selectedAddons.map(a => `+ ${a.name} (₹${a.price})`).join(', ')}
                            </div>
                          )}
                          <span className="font-mono text-[#D4AF37] block mt-0.5">
                            {ci.isComplimentary ? 'FREE' : `₹${singleUnitPrice.toFixed(2)} each`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">
                            {ci.isComplimentary ? '₹0.00' : `₹${lineTotal.toFixed(2)}`}
                          </span>
                          <div className="flex items-center bg-white/[0.05] border border-white/[0.1] rounded-xl p-0.5">
                            <button onClick={() => removeFromCart(idx)} className="p-1 text-[#D4AF37]"><Minus className="w-3 h-3" /></button>
                            <span className="px-2 font-mono font-bold text-white">{ci.quantity}</span>
                            <button onClick={() => addToCartDirect(ci.menuItem, ci.isCombo, ci.selectedAddons, ci.selectedWeightVariant, ci.isComplimentary)} className="p-1 text-[#D4AF37]"><Plus className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-xl px-2.5 py-1.5">
                        <MessageSquare className="w-3 h-3 text-[#D4AF37]" />
                        <input
                          type="text"
                          placeholder="Note: Less ice, no sugar, extra spicy..."
                          value={cartNotes[itemKey] || ''}
                          onChange={(e) => setCartNotes({ ...cartNotes, [itemKey]: e.target.value })}
                          className="w-full bg-transparent text-white outline-none text-[11px] placeholder-neutral-500 font-sans"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CROSS-SELL PAIRINGS CAROUSEL */}
              {cartSuggestedItems.length > 0 && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/20 via-black to-black border border-amber-500/30 space-y-2">
                  <span className="text-[11px] font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" /> Pairs Best With Your Order 🔥
                  </span>

                  <div className="flex gap-2 overflow-x-auto custom-gold-scrollbar pb-1">
                    {cartSuggestedItems.map(sItem => (
                      <div key={sItem.id} className="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 shrink-0 min-w-[170px]">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-neutral-900 shrink-0">
                          {sItem.image_url ? (
                            <img src={sItem.image_url} alt={sItem.name_en} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-600"><ImgIcon className="w-3.5 h-3.5" /></div>
                          )}
                        </div>
                        <div className="truncate flex-1">
                          <span className="text-[10px] font-bold text-white block truncate">{sItem.name_en || sItem.name}</span>
                          <span className="text-[10px] font-mono text-[#D4AF37]">₹{Number(sItem.price).toFixed(0)}</span>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => addToCartDirect(sItem, false)}
                          className="px-2 py-1 rounded-lg bg-[#D4AF37] text-black font-black text-[9px] uppercase cursor-pointer"
                        >
                          + Add
                        </motion.button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Guest Identification */}
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
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '');
                      setCustomerPhone(clean);
                      if (clean.length === 10) checkLoyaltyProfile(clean);
                    }}
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
                className="w-full py-3.5 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-lg cursor-pointer font-mono"
              >
                {loading ? 'Generating Order Token...' : (activeSessionId ? 'Add to Running Order' : 'Submit Order & Get Token')}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. 10th VISIT REWARD CLAIM MODAL */}
      <AnimatePresence>
        {showRewardModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={butterSpring}
              className="w-full max-w-sm bg-[#0f0e12] border border-[#D4AF37] rounded-[28px] p-5 space-y-3.5 shadow-2xl font-mono text-xs"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="font-black text-white uppercase flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-[#D4AF37]" /> Claim 10th Visit Gift
                </span>
                <button onClick={() => setShowRewardModal(false)}><X className="w-4 h-4 text-neutral-400" /></button>
              </div>

              <p className="text-neutral-300 text-[11px] font-sans">
                As a royal guest, pick any fresh drink below completely <strong>FREE (₹0.00)</strong>!
              </p>

              <div className="space-y-2">
                {freeRewardDrinks.map(d => (
                  <div key={d.id} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">{d.name_en || d.name}</span>
                      <span className="text-[10px] text-neutral-400 line-through">₹{Number(d.price).toFixed(0)}</span>
                    </div>
                    <button
                      onClick={() => handleClaimFreeReward(d)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-400 text-black font-black uppercase text-[10px]"
                    >
                      Pick Free
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. TABLE LEDGER MODAL (Clean Single Bill - Split Removed) */}
      <AnimatePresence>
        {isTotalBillModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={butterSpring}
              className="w-full max-w-sm bg-[#0d0d0f] border border-[#D4AF37]/60 rounded-3xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto custom-gold-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base font-mono">Table Ledger & Bill</h3>
                </div>
                <button onClick={() => setIsTotalBillModalOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {activeOrderToken && (
                <div className="p-2.5 rounded-xl bg-[#161619] border border-[#D4AF37]/40 flex justify-between items-center font-mono text-xs">
                  <span className="text-neutral-400">Order Token:</span>
                  <span className="text-[#D4AF37] font-black text-sm">#{activeOrderToken}</span>
                </div>
              )}

              <div className="space-y-2 max-h-56 overflow-y-auto custom-gold-scrollbar p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs font-mono">
                {sessionOrderedItems.length === 0 ? (
                  <div className="text-center py-4 text-neutral-500">No active kitchen orders.</div>
                ) : (
                  sessionOrderedItems.map((item, idx) => (
                    <div key={idx} className="space-y-0.5 border-b border-white/5 pb-1.5 last:border-b-0">
                      <div className="flex justify-between items-center">
                        <span>{item.quantity}x {item.menu_items?.name_en || item.menu_items?.name}</span>
                        <span className="font-black text-white">
                          {item.is_complimentary ? 'FREE' : `₹${(item.quantity * Number(item.unit_price || item.menu_items?.price || 0)).toFixed(2)}`}
                        </span>
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

              <button
                onClick={() => setIsTotalBillModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase cursor-pointer"
              >
                Close Ledger
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. CALL WAITER MODAL */}
      <AnimatePresence>
        {isWaiterModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={butterSpring}
              className="w-full max-w-xs bg-[#0f0e12] border border-[#D4AF37]/60 rounded-[28px] p-5 space-y-4 shadow-2xl font-mono text-xs text-center"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                <span className="font-black text-white uppercase flex items-center gap-1.5">
                  <BellRing className="w-4 h-4 text-[#D4AF37]" /> Call Staff
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
                  <ChefHat className="w-4 h-4" /> Call Steward / Order Help
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}