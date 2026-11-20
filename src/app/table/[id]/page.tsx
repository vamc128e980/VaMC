'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { subscribeCoalescedChannel } from '@/lib/realtime';
import { escapeIlikePattern } from '@/lib/validation';
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
  Gift,
  Check,
  Hash,
  CheckCircle2,
} from 'lucide-react';

const butterSpring = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
  mass: 0.45,
};

const triggerHaptic = (ms = 12) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {}
  }
};

interface MenuCategory {
  id: string | number;
  name?: string | null;
  name_en?: string | null;
  sort_order?: number | null;
}

interface MenuAddonItem {
  id: string | number;
  name: string;
  price: number;
  is_available?: boolean;
}

interface WeightVariant {
  size: string;
  price: number;
}

interface MenuDishItem {
  id: string | number;
  name?: string | null;
  name_en?: string | null;
  price: number;
  image_url?: string | null;
  food_type?: string | null;
  category_id?: string | number | null;
  is_available?: boolean;
  has_addons?: boolean;
  addon_ids?: Array<string | number> | null;
  is_retail_item?: boolean;
  weight_variants?: WeightVariant[] | null;
}

interface TableCartItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  itemType?: string;
  isCombo?: boolean;
  selectedAddons?: MenuAddonItem[];
  selectedWeightVariant?: WeightVariant | null;
  isComplimentary?: boolean;
}

interface RetailDfItem {
  id: string | number;
  name: string;
  selling_price: number;
  image_url?: string | null;
  weight_variants?: WeightVariant[] | null;
}

interface PromoBanner {
  id: string | number;
  title?: string | null;
  image_url: string;
  is_active?: boolean;
}

interface SessionOrderedItem {
  id?: string | number;
  quantity: number;
  unit_price: number;
  item_name?: string;
  cooking_notes?: string | null;
  menu_items?: {
    name_en?: string;
    name?: string;
    price?: number;
  } | null;
}

export default function LuxuryCustomerTablePage() {
  const params = useParams();
  const rawTableParam = decodeURIComponent((params?.id as string) || '');

  const [realTableNumber, setRealTableNumber] = useState<number | null>(null);
  const [displayTableName, setDisplayTableName] = useState<string>('');
  const [tableResolved, setTableResolved] = useState<boolean>(false);
  const [tableNotFound, setTableNotFound] = useState<boolean>(false);

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuDishItem[]>([]);
  const [addons, setAddons] = useState<MenuAddonItem[]>([]);

  // Retail Dry Fruits for Cart Impulse Slider
  const [dfItems, setDfItems] = useState<RetailDfItem[]>([]);

  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | number | null>(null);

  // Customization Bottom Sheet States (Only for Item Add-ons & Retail Pack Sizes)
  const [customizingItem, setCustomizingItem] = useState<MenuDishItem | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  const [selectedWeightVariant, setSelectedWeightVariant] = useState<WeightVariant | null>(
    null,
  );

  const [cart, setCart] = useState<TableCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Customer & Loyalty States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [customerVisitCount, setCustomerVisitCount] = useState<number>(0);
  const [isRewardClaimedThisSession, setIsRewardClaimedThisSession] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);

  const [activeOrderToken, setActiveOrderToken] = useState<string | null>(null);
  const [activeBatchStatus, setActiveBatchStatus] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const [activeSessionTotal, setActiveSessionTotal] = useState<number>(0);
  const [sessionOrderedItems, setSessionOrderedItems] = useState<SessionOrderedItem[]>([]);
  const [isTotalBillModalOpen, setIsTotalBillModalOpen] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3800);
  }, []);

  // Resolve table strictly by Admin-configured table_name
  const resolveTableIdentity = useCallback(async () => {
    const cleanParam = rawTableParam.trim();
    if (!cleanParam) {
      setTableNotFound(true);
      return;
    }

    try {
      const escapedName = escapeIlikePattern(cleanParam);
      const { data: matched, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .ilike('table_name', escapedName)
        .maybeSingle();

      if (error || !matched || !matched.table_name) {
        setRealTableNumber(null);
        setTableResolved(false);
        setTableNotFound(true);
        return;
      }

      setRealTableNumber(Number(matched.table_number));
      setDisplayTableName(String(matched.table_name));
      setTableResolved(true);
      setTableNotFound(false);
    } catch {
      setTableNotFound(true);
    }
  }, [rawTableParam]);

  useEffect(() => {
    void resolveTableIdentity();
  }, [resolveTableIdentity]);

  const isValidPhone = useCallback((phone: string) => {
    const regex = /^[6-9]\d{9}$/;
    if (!regex.test(phone)) return false;
    if (/^(\d)\1{9}$/.test(phone)) return false;
    return true;
  }, []);

  const checkLoyaltyProfile = useCallback(
    async (phone: string) => {
      if (!isValidPhone(phone)) {
        setCustomerVisitCount(0);
        return;
      }
      try {
        const res = await fetch(`/api/rewards?phone=${encodeURIComponent(phone)}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          setCustomerVisitCount(0);
          return;
        }
        const data = await res.json();
        setCustomerVisitCount(Number(data?.successful_visits ?? 0));
      } catch {
        setCustomerVisitCount(0);
      }
    },
    [isValidPhone],
  );

  const loadSessionFromServer = useCallback(
    async (sessionId: string) => {
      try {
        const res = await fetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data?.session) {
          setActiveSessionId(data.session.id);
          activeSessionIdRef.current = data.session.id;
          setActiveSessionTotal(Number(data.session.total_amount ?? 0));
          if (data.session.customer_name) setCustomerName(String(data.session.customer_name));
          if (data.session.customer_phone) {
            const p = String(data.session.customer_phone);
            setCustomerPhone(p);
            void checkLoyaltyProfile(p);
          }
          if (data.session.order_pin) {
            setActiveOrderToken(String(data.session.order_pin));
          }
        }

        if (Array.isArray(data?.batches) && data.batches.length > 0) {
          const latestBatch = data.batches[data.batches.length - 1];
          if (latestBatch?.status) setActiveBatchStatus(String(latestBatch.status));
        }

        if (Array.isArray(data?.items)) {
          setSessionOrderedItems(data.items as SessionOrderedItem[]);
        }
      } catch {}
    },
    [checkLoyaltyProfile],
  );

  const syncSessionData = useCallback(async () => {
    if (!realTableNumber) return;
    try {
      const res = await fetch(`/api/session?table=${realTableNumber}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data?.session?.id) {
        await loadSessionFromServer(String(data.session.id));
      } else {
        setActiveSessionId(null);
        activeSessionIdRef.current = null;
        setActiveSessionTotal(0);
        setSessionOrderedItems([]);
        setActiveOrderToken(null);
        setActiveBatchStatus(null);
      }
    } catch {}
  }, [realTableNumber, loadSessionFromServer]);

  const fetchBannersOnly = useCallback(async () => {
    const { data: bnrs } = await supabase
      .from('promo_banners')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: false });
    if (bnrs) {
      setBanners(bnrs as PromoBanner[]);
      setCurrentBannerIndex(0);
    }
  }, []);

  const fetchMenuData = useCallback(async () => {
    const [
      { data: cats },
      { data: items },
      { data: adns },
      { data: bnrs },
      { data: dfs },
    ] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('menu_items').select('*').eq('is_available', true).order('id', { ascending: true }),
      supabase.from('menu_addons').select('*').eq('is_available', true).order('id', { ascending: true }),
      supabase.from('promo_banners').select('*').eq('is_active', true).order('id', { ascending: false }),
      supabase.from('df_menu_items').select('id, name, selling_price, stock_quantity').order('name', { ascending: true }),
    ]);

    if (cats && cats.length > 0) {
      setCategories(cats as MenuCategory[]);
      setSelectedCategory((prev) => prev ?? cats[0].id);
    }
    if (items) setMenuItems(items as MenuDishItem[]);
    if (adns) setAddons(adns as MenuAddonItem[]);
    if (dfs) setDfItems(dfs as RetailDfItem[]);

    if (bnrs) {
      setBanners(bnrs as PromoBanner[]);
      setCurrentBannerIndex(0);
    }
  }, []);

  useEffect(() => {
    if (!tableResolved || !realTableNumber) return;
    void syncSessionData();
    void fetchMenuData();

    return subscribeCoalescedChannel(`table-${realTableNumber}-rt`, [
      {
        table: 'table_sessions',
        filter: `table_number=eq.${realTableNumber}`,
        onEvent: () => {
          void syncSessionData();
        },
      },
      {
        table: 'order_batches',
        filter: `table_number=eq.${realTableNumber}`,
        onEvent: () => {
          if (activeSessionIdRef.current) {
            void loadSessionFromServer(activeSessionIdRef.current);
          } else {
            void syncSessionData();
          }
        },
      },
      {
        table: 'promo_banners',
        onEvent: () => {
          void fetchBannersOnly();
        },
      },
    ]);
  }, [
    realTableNumber,
    tableResolved,
    syncSessionData,
    fetchMenuData,
    loadSessionFromServer,
    fetchBannersOnly,
  ]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length]);

  const addToCartDirect = (
    item: MenuDishItem | RetailDfItem,
    isCombo = false,
    chosenAddons: MenuAddonItem[] = [],
    chosenVariant: WeightVariant | null = null,
    isFree = false,
    itemType = 'main',
  ) => {
    triggerHaptic(15);
    const rawPrice =
      itemType === 'main'
        ? Number((item as MenuDishItem).price ?? 0)
        : Number((item as RetailDfItem).selling_price ?? 0);
    const effectivePrice = isFree ? 0 : chosenVariant ? Number(chosenVariant.price) : rawPrice;
    const displayName = (item as MenuDishItem).name_en || item.name || 'Item';

    setCart((prev) => {
      const existing = prev.find(
        (ci) =>
          String(ci.menuItemId) === String(item.id) &&
          (ci.itemType ?? 'main') === itemType &&
          Boolean(ci.isComplimentary) === isFree &&
          (ci.selectedWeightVariant?.size ?? '') === (chosenVariant?.size ?? '') &&
          JSON.stringify((ci.selectedAddons ?? []).map((a) => Number(a.id)).sort()) ===
            JSON.stringify(chosenAddons.map((a) => Number(a.id)).sort()),
      );

      if (existing) {
        return prev.map((ci) => (ci === existing ? { ...ci, quantity: ci.quantity + 1 } : ci));
      }

      return [
        ...prev,
        {
          menuItemId: String(item.id),
          name: displayName,
          unitPrice: effectivePrice,
          quantity: 1,
          itemType,
          isCombo,
          selectedAddons: chosenAddons,
          selectedWeightVariant: chosenVariant,
          isComplimentary: isFree,
        },
      ];
    });
  };

  const handleItemAddClick = (item: MenuDishItem) => {
    triggerHaptic(15);
    const itemAddons = item.has_addons
      ? addons.filter((a) =>
          Array.isArray(item.addon_ids)
            ? item.addon_ids.map(Number).includes(Number(a.id))
            : true,
        )
      : [];
    const hasRetailVariants =
      item.is_retail_item &&
      Array.isArray(item.weight_variants) &&
      item.weight_variants.length > 0;

    if (itemAddons.length > 0 || hasRetailVariants) {
      setCustomizingItem(item);
      setSelectedAddonIds([]);
      setSelectedWeightVariant(
        hasRetailVariants && item.weight_variants ? item.weight_variants[0] : null,
      );
    } else {
      addToCartDirect(item, false);
    }
  };

  const confirmCustomizationAndAdd = () => {
    if (!customizingItem) return;
    const chosenAddons = addons.filter((a) => selectedAddonIds.includes(Number(a.id)));
    addToCartDirect(customizingItem, false, chosenAddons, selectedWeightVariant, false, 'main');
    setCustomizingItem(null);
    setSelectedAddonIds([]);
    setSelectedWeightVariant(null);
  };

  const removeFromCart = (index: number) => {
    triggerHaptic(12);
    setCart((prev) => {
      const target = prev[index];
      if (!target) return prev;
      if (target.quantity > 1) {
        return prev.map((ci, i) => (i === index ? { ...ci, quantity: ci.quantity - 1 } : ci));
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const cartGrandTotal = useMemo(() => {
    return cart.reduce((sum, ci) => {
      if (ci.isComplimentary) return sum;
      const basePrice = Number(ci.unitPrice ?? 0);
      const addOnsTotal = (ci.selectedAddons ?? []).reduce(
        (aSum, a) => aSum + Number(a.price ?? 0),
        0,
      );
      return sum + (basePrice + addOnsTotal) * ci.quantity;
    }, 0);
  }, [cart]);

  const cartItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const runningGrandTotal = activeSessionTotal + cartGrandTotal;

  const is10thVisitMilestone = (customerVisitCount + 1) % 10 === 0 && customerVisitCount + 1 > 0;

  const freeRewardDrinks = useMemo(() => {
    return menuItems
      .filter(
        (m) =>
          Number(m.price) <= 70 &&
          (m.name_en || m.name || '').toLowerCase().includes('juice'),
      )
      .slice(0, 5);
  }, [menuItems]);

  const handleClaimFreeReward = async (drink: MenuDishItem) => {
    triggerHaptic(25);
    try {
      if (isValidPhone(customerPhone)) {
        const res = await fetch('/api/rewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: customerPhone.trim(),
            session_id: activeSessionIdRef.current,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          showToast(data?.error || 'Reward already claimed for this milestone.');
          return;
        }
      }

      const drinkLabel = drink.name_en || drink.name || 'Free Juice';
      addToCartDirect(drink, false, [], null, true, 'main');
      setIsRewardClaimedThisSession(true);
      setShowRewardModal(false);
      showToast(`🎁 ${drinkLabel} added FREE!`);
    } catch {
      showToast('Unable to claim reward right now.');
    }
  };

  const handleCallWaiter = async (callType: 'water' | 'waiter') => {
    if (!realTableNumber) return;
    triggerHaptic(25);
    try {
      const { error } = await supabase.from('waiter_calls').insert({
        table_number: realTableNumber,
        call_type: callType,
        status: 'pending',
      });
      if (error) throw error;
      showToast(`🔔 Steward notified for ${displayTableName}!`);
    } catch {
      showToast('Unable to notify steward right now.');
    }
  };

  const handlePlaceOrder = async () => {
    if (loading || cart.length === 0) return;
    triggerHaptic(30);
    if (!realTableNumber) return showToast('Invalid table QR.');

    const currentSessionId = activeSessionIdRef.current;

    if (!currentSessionId) {
      if (customerName.trim().length < 2) {
        return showToast('Please enter Guest Name (at least 2 letters).');
      }
      if (!isValidPhone(customerPhone)) {
        setPhoneError('Please enter a valid 10-digit mobile number.');
        return;
      }
    }

    setLoading(true);
    try {
      const mainItems = cart.filter((ci) => (ci.itemType ?? 'main') === 'main');
      const dfCartItems = cart.filter((ci) => ci.itemType === 'df');

      let resolvedSessionId = currentSessionId;
      let resolvedPin = activeOrderToken;

      if (mainItems.length > 0) {
        const orderRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_number: realTableNumber,
            session_id: currentSessionId,
            source: 'qr',
            customer_name: customerName.trim() || null,
            customer_phone: customerPhone.trim() || null,
            items: mainItems.map((ci) => {
              const addonNames = (ci.selectedAddons ?? []).map((a) => a.name).join(', ');
              const variantText = ci.selectedWeightVariant?.size
                ? `[${ci.selectedWeightVariant.size}]`
                : '';
              const freeTag = ci.isComplimentary ? '[10th Visit Free Reward]' : '';
              const noteParts = [variantText, addonNames ? `+ ${addonNames}` : '', freeTag]
                .filter(Boolean)
                .join(' ');

              return {
                menu_item_id: ci.menuItemId,
                quantity: ci.quantity,
                cooking_notes: noteParts || null,
              };
            }),
          }),
        });

        const orderData = await orderRes.json();
        if (!orderRes.ok || !orderData?.success) {
          throw new Error(orderData?.error || 'Order placement failed.');
        }

        resolvedSessionId = orderData.order?.session_id ?? resolvedSessionId;
        resolvedPin = orderData.order?.order_pin ?? resolvedPin;
      }

      if (dfCartItems.length > 0) {
        let sessionForDf = resolvedSessionId;
        if (!sessionForDf) {
          const { data: createdDfSession, error: dfSessErr } = await supabase
            .from('table_sessions')
            .insert({
              table_number: realTableNumber,
              customer_name: customerName.trim(),
              customer_phone: customerPhone.trim(),
              total_amount: cartGrandTotal,
              status: 'active',
              payment_status: 'unpaid',
            })
            .select()
            .single();
          if (dfSessErr) throw dfSessErr;
          sessionForDf = createdDfSession.id;
          resolvedSessionId = sessionForDf;
        }

        const dfPayload = dfCartItems.map((ci) => ({
          session_id: sessionForDf,
          menu_item_id: null,
          item_name: ci.name,
          quantity: ci.quantity,
          unit_price: ci.isComplimentary ? 0 : ci.unitPrice,
          is_complimentary: Boolean(ci.isComplimentary),
          cooking_notes: `VaMC Counter Item: [DF] ${ci.name}`,
        }));

        const { error: dfInsertErr } = await supabase.from('order_items').insert(dfPayload);
        if (dfInsertErr) throw dfInsertErr;

        await Promise.all(
          dfCartItems.map((item) =>
            supabase.rpc('adjust_inventory_stock', {
              p_table: 'df_menu_items',
              p_item_id: String(item.menuItemId),
              p_delta: -item.quantity,
            }),
          ),
        );
      }

      await supabase
        .from('restaurant_tables')
        .update({ status: 'occupied' })
        .eq('table_number', realTableNumber);

      if (resolvedPin) setActiveOrderToken(String(resolvedPin));
      setActiveBatchStatus('sent_to_kitchen');
      setCart([]);
      setIsCartOpen(false);

      if (resolvedSessionId) {
        await loadSessionFromServer(String(resolvedSessionId));
      } else {
        await syncSessionData();
      }

      showToast(`Order placed! Token #${resolvedPin ?? 'Active'}`);
    } catch (err) {
      showToast('Order error: ' + (err instanceof Error ? err.message : 'Unable to submit order'));
    } finally {
      setLoading(false);
    }
  };

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (item.is_retail_item) return false;
      const dishName = (item.name_en || item.name || '').toLowerCase();
      if (searchQuery.trim()) return dishName.includes(searchQuery.toLowerCase());
      return item.category_id === selectedCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  if (tableNotFound) {
    return (
      <div className="min-h-screen bg-[#060608] text-[#FCF6BA] flex flex-col items-center justify-center p-6 text-center font-mono">
        <AlertTriangle className="w-12 h-12 text-[#D4AF37] mb-3" />
        <h2 className="text-xl font-bold uppercase text-white">Table QR Invalid</h2>
        <p className="text-xs text-neutral-400 mt-1.5 max-w-xs">
          Please scan the official QR code placed on your table.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060608] text-[#FCF6BA] pb-36 font-sans antialiased relative overflow-x-clip">
      {/* Non-blocking Toast Banner */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={butterSpring}
            className="fixed top-20 inset-x-4 max-w-md mx-auto z-[70] px-4 py-3 rounded-2xl bg-[#111115]/95 border border-[#D4AF37] text-[#FCF6BA] font-mono text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-xl will-change-transform"
          >
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#060608]/90 backdrop-blur-2xl px-4 pt-3.5 pb-3 border-b border-white/[0.08] shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div>
            <span className="text-[9px] tracking-[0.2em] font-mono uppercase text-[#D4AF37] block font-bold">
              ROYAL FINE-DINE
            </span>
            <h1 className="text-base font-black text-amber-200 tracking-wide mt-0.5">
              {displayTableName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              transition={butterSpring}
              onClick={() => setIsTotalBillModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-[#D4AF37]/40 text-left shadow-lg cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-[#D4AF37]" />
              <div>
                <span className="text-[8px] block uppercase font-mono text-neutral-400">
                  LEDGER
                </span>
                <span className="text-xs font-mono font-black text-[#FCF6BA]">
                  ₹{runningGrandTotal.toFixed(2)}
                </span>
              </div>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Token Badge */}
        <AnimatePresence>
          {activeOrderToken && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={butterSpring}
              className="p-3.5 rounded-[24px] bg-[#16140e] border border-[#D4AF37] shadow-xl flex items-center justify-between font-mono will-change-transform"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center font-black">
                  <Hash className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase block">
                    Order Token
                  </span>
                  <span className="text-base font-black text-white">#{activeOrderToken}</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40">
                {activeBatchStatus === 'pending_waiter' ? 'Pending Steward' : 'In Kitchen 👨‍🍳'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#D4AF37]/80 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search our handcrafted delights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] text-white placeholder-neutral-500 rounded-2xl pl-11 pr-4 py-2.5 text-base sm:text-xs outline-none border border-white/[0.08] focus:border-[#D4AF37]/60 transition-colors"
          />
        </div>

        {/* PROMO SLIDER BANNERS */}
        {banners.length > 0 && (
          <div className="relative w-full aspect-[16/7] overflow-hidden rounded-[24px] border border-[#D4AF37]/35 shadow-xl bg-neutral-950">
            <AnimatePresence mode="wait">
              {banners[currentBannerIndex] && (
                <motion.img
                  key={banners[currentBannerIndex].id}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  src={banners[currentBannerIndex].image_url}
                  alt={banners[currentBannerIndex].title || 'Promo Banner'}
                  className="w-full h-full object-cover object-center will-change-transform"
                />
              )}
            </AnimatePresence>
            {banners.length > 1 && (
              <div className="absolute bottom-2.5 right-3 flex gap-1 z-10">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentBannerIndex(idx)}
                    aria-label={`Slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentBannerIndex ? 'w-5 bg-[#D4AF37]' : 'w-1.5 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

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
                <motion.button
                  type="button"
                  key={cat.id}
                  whileTap={{ scale: 0.95 }}
                  transition={butterSpring}
                  onClick={(e) => {
                    triggerHaptic(15);
                    setSelectedCategory(cat.id);
                    e.currentTarget.scrollIntoView({
                      behavior: 'smooth',
                      inline: 'center',
                      block: 'nearest',
                    });
                  }}
                  className={`relative px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isSelected
                      ? 'text-black font-black bg-[#D4AF37] shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>{cat.name_en || cat.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Dishes Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {filteredMenuItems.map((item) => {
            const inCart = cart.find(
              (ci) =>
                String(ci.menuItemId) === String(item.id) &&
                (ci.itemType ?? 'main') === 'main',
            );
            const dishTitle = item.name_en || item.name || 'Dish';

            return (
              <motion.div
                key={item.id}
                layout="position"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={butterSpring}
                className="bg-gradient-to-b from-[#111114] to-[#08080a] border border-white/[0.08] rounded-[20px] p-2.5 flex flex-col justify-between shadow-xl relative will-change-transform"
              >
                <div>
                  <div className="h-24 w-full rounded-xl overflow-hidden bg-neutral-950 mb-2 relative">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={dishTitle}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <ImgIcon className="w-5 h-5" />
                      </div>
                    )}
                    {item.food_type === 'non_veg' ? (
                      <span
                        title="Non-Vegetarian"
                        className="absolute top-1.5 left-1.5 w-3.5 h-3.5 rounded-[3px] bg-black/80 backdrop-blur-sm border-[1.5px] border-red-500 flex items-center justify-center shadow-md"
                      >
                        <svg viewBox="0 0 12 12" className="w-2 h-2 fill-red-500">
                          <polygon points="6,1.5 11,10.5 1,10.5" />
                        </svg>
                      </span>
                    ) : (
                      <span
                        title="Vegetarian"
                        className="absolute top-1.5 left-1.5 w-3.5 h-3.5 rounded-[3px] bg-black/80 backdrop-blur-sm border-[1.5px] border-emerald-500 flex items-center justify-center shadow-md"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </span>
                    )}
                  </div>
                  <h4 className="text-[11px] font-bold text-white line-clamp-1">
                    {dishTitle}
                  </h4>
                </div>

                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.06]">
                  <div>
                    <span className="font-mono text-[11px] font-black text-[#D4AF37]">
                      ₹{Number(item.price).toFixed(0)}
                    </span>
                  </div>
                  {inCart ? (
                    <div className="flex items-center bg-white/[0.08] border border-[#D4AF37]/60 rounded-lg p-0.5">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        onClick={() => removeFromCart(cart.indexOf(inCart))}
                        className="p-0.5 text-[#FCF6BA] cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </motion.button>
                      <span className="font-mono font-bold text-[10px] text-white px-1">
                        {inCart.quantity}
                      </span>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleItemAddClick(item)}
                        className="p-0.5 text-[#FCF6BA] cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      transition={butterSpring}
                      onClick={() => handleItemAddClick(item)}
                      className="w-6 h-6 rounded-lg bg-[#D4AF37] text-black flex items-center justify-center font-black cursor-pointer shadow-md"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Action Dock */}
      <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40">
        <div className="p-2 rounded-[28px] bg-[#0c0c0e]/95 border border-[#D4AF37]/50 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex items-center justify-between gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            transition={butterSpring}
            onClick={() => void handleCallWaiter('water')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono font-bold text-neutral-300 cursor-pointer transition-colors"
          >
            <BellRing className="w-4 h-4 text-[#D4AF37]" />
            <span>Call Steward</span>
          </motion.button>

          {cartItemCount > 0 ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              transition={butterSpring}
              onClick={() => setIsCartOpen(true)}
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
              type="button"
              onClick={() => setIsTotalBillModalOpen(true)}
              className="flex-1 py-2 rounded-2xl text-xs font-mono text-neutral-400 hover:text-white text-right pr-2 cursor-pointer transition-colors"
            >
              Running Bill: <strong className="text-[#D4AF37]">₹{runningGrandTotal.toFixed(2)}</strong>
            </button>
          )}
        </div>
      </div>

      {/* CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={butterSpring}
              className="relative w-full max-w-md mx-auto bg-[#101012] border-t border-x border-[#D4AF37]/50 rounded-t-[36px] p-6 pb-8 space-y-4 z-10 max-h-[92vh] overflow-y-auto custom-gold-scrollbar shadow-2xl font-mono text-xs will-change-transform"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base">Your Dining Cart</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-4 text-neutral-500 text-xs">
                  Your cart is empty.
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-white/5 pb-2">
                  {cart.map((ci, idx) => {
                    const addOnsCost = (ci.selectedAddons ?? []).reduce(
                      (sum, a) => sum + Number(a.price ?? 0),
                      0,
                    );
                    const singleUnitPrice = ci.isComplimentary
                      ? 0
                      : Number(ci.unitPrice ?? 0) + addOnsCost;
                    return (
                      <div key={idx} className="pt-2 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-white block">
                            {ci.name}
                            {ci.selectedWeightVariant
                              ? ` (${ci.selectedWeightVariant.size})`
                              : ''}
                          </span>
                          {ci.selectedAddons && ci.selectedAddons.length > 0 && (
                            <div className="text-[10px] text-[#D4AF37] mt-0.5">
                              {ci.selectedAddons.map((a) => `+ ${a.name}`).join(', ')}
                            </div>
                          )}
                          <span className="text-[#D4AF37]">
                            {ci.isComplimentary ? 'FREE' : `₹${singleUnitPrice.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
                          <button
                            type="button"
                            onClick={() => removeFromCart(idx)}
                            className="p-1 text-[#D4AF37] cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-bold text-white">{ci.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setCart((prev) =>
                                prev.map((entry, i) =>
                                  i === idx
                                    ? { ...entry, quantity: entry.quantity + 1 }
                                    : entry,
                                ),
                              )
                            }
                            className="p-1 text-[#D4AF37] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!activeSessionId && (
                <div className="space-y-3 pt-4 border-t border-white/5 mt-4">
                  <span className="font-bold text-white block">Guest Identification</span>
                  <input
                    type="text"
                    placeholder="Guest Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-transparent border border-white/20 rounded-xl px-4 py-3 text-white text-base sm:text-xs outline-none focus:border-[#D4AF37] transition-colors"
                  />
                  <div>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit Phone Number *"
                      value={customerPhone}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '');
                        setCustomerPhone(clean);
                        setPhoneError('');
                        if (clean.length === 10) {
                          if (isValidPhone(clean)) void checkLoyaltyProfile(clean);
                          else {
                            setPhoneError('Please enter a valid Indian mobile number.');
                            setCustomerVisitCount(0);
                          }
                        } else {
                          setCustomerVisitCount(0);
                        }
                      }}
                      className={`w-full bg-transparent border rounded-xl px-4 py-3 text-white text-base sm:text-xs outline-none transition-colors ${
                        phoneError
                          ? 'border-rose-500 focus:border-rose-500'
                          : 'border-white/20 focus:border-[#D4AF37]'
                      }`}
                    />
                    {phoneError && (
                      <span className="text-rose-400 text-[10px] mt-1 block">{phoneError}</span>
                    )}
                  </div>

                  {customerPhone.length === 10 &&
                    isValidPhone(customerPhone) &&
                    !is10thVisitMilestone && (
                      <div className="p-3.5 bg-gradient-to-r from-[#D4AF37]/15 via-white/[0.04] to-[#D4AF37]/15 rounded-xl border border-[#D4AF37]/60 mt-2 shadow-[0_0_18px_rgba(212,175,55,0.16)]">
                        <div className="flex justify-between items-center text-[11px] mb-1.5">
                          <span className="text-neutral-200 font-bold">
                            Visit {customerVisitCount + 1}
                          </span>
                          <span className="font-black uppercase tracking-wide text-[#D4AF37] bg-black/50 px-2 py-0.5 rounded-md border border-[#D4AF37]/50">
                            🎁 10th Visit = FREE Fresh Juice!
                          </span>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(((customerVisitCount % 10) + 1) / 10) * 100}%`,
                            }}
                            transition={butterSpring}
                            className="h-full bg-gradient-to-r from-[#D4AF37] to-[#f4d03f]"
                          />
                        </div>
                        <span className="text-[10px] text-neutral-300 mt-1.5 block text-center">
                          Just {10 - ((customerVisitCount % 10) + 1)} more visits to unlock your{' '}
                          <strong className="font-black text-[#FCF6BA]">FREE Fresh Juice</strong>!
                        </span>
                      </div>
                    )}

                  {is10thVisitMilestone && !isRewardClaimedThisSession && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37]/20 to-[#FCF6BA]/10 border-2 border-[#D4AF37] flex justify-between items-center mt-2 shadow-[0_0_24px_rgba(212,175,55,0.3)]">
                      <div>
                        <span className="text-[#D4AF37] font-black text-xs uppercase tracking-wide block">
                          🎉 10th Visit = FREE Fresh Juice Unlocked!
                        </span>
                        <span className="text-[10px] text-white font-bold">
                          Claim your complimentary fresh juice below.
                        </span>
                      </div>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setShowRewardModal(true)}
                        className="px-3.5 py-2 bg-[#D4AF37] text-black font-black rounded-lg text-[10px] uppercase shadow-md cursor-pointer hover:bg-[#c59b27] shrink-0"
                      >
                        Claim Free Juice
                      </motion.button>
                    </div>
                  )}
                </div>
              )}

              {dfItems.length > 0 && (
                <div className="pt-4 mt-2">
                  <h4 className="text-[12px] font-black text-white mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    Premium Dry Fruits & Spices
                  </h4>
                  <div className="flex gap-3 overflow-x-auto custom-gold-scrollbar pb-3 snap-x">
                    {dfItems.map((df) => {
                      const hasVariants =
                        df.weight_variants && df.weight_variants.length > 0;
                      return (
                        <div
                          key={df.id}
                          className="min-w-[130px] sm:min-w-[140px] bg-white/[0.03] border border-white/[0.05] rounded-[24px] p-3 flex flex-col relative snap-start shadow-lg"
                        >
                          <div className="h-20 w-full mb-3 flex items-center justify-center">
                            {df.image_url ? (
                              <img
                                src={df.image_url}
                                alt={df.name}
                                loading="lazy"
                                className="h-full object-contain drop-shadow-md"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-[#D4AF37]/50" />
                              </div>
                            )}
                          </div>
                          <span className="font-bold text-white text-[12px] leading-tight line-clamp-1">
                            {df.name}
                          </span>
                          <span className="text-[9px] text-neutral-400 mt-1 mb-3">
                            Premium Quality
                          </span>

                          {hasVariants && df.weight_variants && (
                            <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-3">
                              {df.weight_variants.map((v, vIdx) => (
                                <button
                                  key={vIdx}
                                  type="button"
                                  onClick={() =>
                                    addToCartDirect(df, false, [], v, false, 'df')
                                  }
                                  className="px-2 py-1 rounded-lg bg-transparent border border-white/25 hover:border-[#D4AF37] text-[9px] text-neutral-300 font-bold whitespace-nowrap transition-colors cursor-pointer"
                                >
                                  {v.size} (₹{v.price})
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="mt-auto flex justify-between items-end pt-1">
                            <span className="text-white font-black text-sm">
                              ₹{Number(df.selling_price).toFixed(0)}
                            </span>
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.9 }}
                              onClick={() =>
                                addToCartDirect(df, false, [], null, false, 'df')
                              }
                              className="w-8 h-8 bg-[#D4AF37] rounded-xl flex items-center justify-center text-black hover:bg-[#c59b27] shadow-md cursor-pointer"
                            >
                              <Plus className="w-4 h-4 stroke-[3]" />
                            </motion.button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-white/[0.05] border border-transparent space-y-3 mt-4">
                <div className="flex justify-between items-center text-white font-bold text-sm">
                  <span>Payable at Counter:</span>
                  <span className="text-[#D4AF37] text-base font-black">
                    ₹{cartGrandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={loading || phoneError.length > 0 || cart.length === 0}
                onClick={() => void handlePlaceOrder()}
                className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-lg cursor-pointer mt-2 hover:bg-[#c59b27] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting Order...' : 'Submit Order & Get Token'}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Free Reward Selection Modal */}
      <AnimatePresence>
        {showRewardModal && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={butterSpring}
              className="w-full max-w-sm bg-[#101012] border border-[#D4AF37]/50 rounded-[28px] p-6 font-mono shadow-2xl will-change-transform"
            >
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                <h3 className="text-[#D4AF37] font-black uppercase flex items-center gap-2">
                  <Gift className="w-4 h-4" /> Choose Free Fresh Juice
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRewardModal(false)}
                  className="text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-gold-scrollbar pr-1">
                {freeRewardDrinks.length === 0 ? (
                  <div className="text-center py-6 text-neutral-500 text-xs">
                    No eligible drinks found under ₹70.
                  </div>
                ) : (
                  freeRewardDrinks.map((drink) => (
                    <div
                      key={drink.id}
                      onClick={() => void handleClaimFreeReward(drink)}
                      className="p-3 rounded-xl bg-transparent hover:bg-white/5 border border-white/10 hover:border-[#D4AF37] flex justify-between items-center cursor-pointer transition-colors"
                    >
                      <span className="text-white font-bold text-xs">
                        {drink.name_en || drink.name || 'Free Juice'}
                      </span>
                      <span className="text-[#D4AF37] font-black text-[10px] uppercase">
                        Free
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ITEM ADD-ONS & RETAIL PACK SIZE SHEET */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomizingItem(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={butterSpring}
              className="relative w-full max-w-md mx-auto bg-[#101012] border-t border-x border-[#D4AF37]/50 rounded-t-[36px] p-5 pb-8 space-y-4 z-10 max-h-[85vh] overflow-y-auto custom-gold-scrollbar shadow-2xl font-mono text-xs will-change-transform"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-base">
                  {customizingItem.name_en || customizingItem.name || 'Customize Item'}
                </h3>
                <button
                  type="button"
                  onClick={() => setCustomizingItem(null)}
                  className="text-neutral-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {customizingItem.is_retail_item &&
                Array.isArray(customizingItem.weight_variants) &&
                customizingItem.weight_variants.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-neutral-400 block mb-1">Choose Pack Size:</span>
                    <div className="grid grid-cols-3 gap-2">
                      {customizingItem.weight_variants.map((v, idx) => {
                        const isSel = selectedWeightVariant?.size === v.size;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedWeightVariant(v)}
                            className={`p-3 rounded-2xl border text-center cursor-pointer transition-colors ${
                              isSel
                                ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white'
                                : 'bg-transparent border-white/10 text-neutral-300'
                            }`}
                          >
                            <span className="font-bold block">{v.size}</span>
                            <span className="text-[#D4AF37] font-black">
                              ₹{Number(v.price).toFixed(0)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              {customizingItem.has_addons &&
                addons.filter((a) =>
                  Array.isArray(customizingItem.addon_ids)
                    ? customizingItem.addon_ids.map(Number).includes(Number(a.id))
                    : true,
                ).length > 0 && (
                  <div className="space-y-2">
                    <span className="text-neutral-400 block mb-1">
                      Upgrade with Add-ons:
                    </span>
                    {addons
                      .filter((a) =>
                        Array.isArray(customizingItem.addon_ids)
                          ? customizingItem.addon_ids.map(Number).includes(Number(a.id))
                          : true,
                      )
                      .map((addon) => {
                        const isChecked = selectedAddonIds.includes(Number(addon.id));
                        return (
                          <div
                            key={addon.id}
                            onClick={() => {
                              const aId = Number(addon.id);
                              if (isChecked)
                                setSelectedAddonIds(
                                  selectedAddonIds.filter((id) => id !== aId),
                                );
                              else setSelectedAddonIds([...selectedAddonIds, aId]);
                            }}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-transparent border-[#D4AF37] text-white shadow-md'
                                : 'bg-transparent border-white/10 text-neutral-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center text-black font-black ${
                                  isChecked
                                    ? 'bg-[#D4AF37] border-[#D4AF37]'
                                    : 'border-white/30'
                                }`}
                              >
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <span className="font-bold">{addon.name}</span>
                            </div>
                            <span className="text-[#D4AF37] font-black">
                              +₹{Number(addon.price).toFixed(0)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={confirmCustomizationAndAdd}
                className="w-full py-4 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs cursor-pointer shadow-lg mt-2 hover:bg-[#c59b27] transition-colors"
              >
                Add to Dining Cart
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Table Ledger Modal */}
      <AnimatePresence>
        {isTotalBillModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={butterSpring}
              className="w-full max-w-sm bg-[#101012] border border-[#D4AF37]/50 rounded-[28px] p-6 shadow-2xl space-y-4 font-mono text-xs will-change-transform"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-base uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#D4AF37]" /> Table Ledger & Bill
                </h3>
                <button
                  type="button"
                  onClick={() => setIsTotalBillModalOpen(false)}
                  className="text-neutral-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activeOrderToken && (
                <div className="p-3 rounded-xl bg-transparent border border-[#D4AF37]/40 flex justify-between items-center">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                    Order Token:
                  </span>
                  <span className="text-[#D4AF37] font-black text-base">
                    #{activeOrderToken}
                  </span>
                </div>
              )}

              <div className="space-y-2.5 max-h-48 overflow-y-auto custom-gold-scrollbar pr-1 my-4">
                {sessionOrderedItems.length === 0 ? (
                  <div className="text-center text-neutral-500 py-4">
                    No items ordered yet.
                  </div>
                ) : (
                  sessionOrderedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center border-b border-white/5 pb-2"
                    >
                      <div className="truncate pr-2">
                        <span className="text-white font-bold block">
                          {item.menu_items?.name_en ||
                            item.menu_items?.name ||
                            item.item_name ||
                            item.cooking_notes?.replace(
                              /VaMC Counter Item: \[[A-Z]+\] /g,
                              '',
                            ) ||
                            'Item'}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Qty: {item.quantity}
                        </span>
                      </div>
                      <span className="text-[#D4AF37] font-black">
                        ₹{(Number(item.unit_price) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-between items-center font-black text-white text-sm pt-3 border-t border-[#D4AF37]/50 mt-4">
                <span className="uppercase tracking-wider">Net Payable:</span>
                <span className="text-[#D4AF37] text-lg">
                  ₹{runningGrandTotal.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsTotalBillModalOpen(false)}
                className="w-full py-3.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase cursor-pointer hover:bg-[#c59b27] transition-colors shadow-lg mt-4"
              >
                Close Ledger
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
