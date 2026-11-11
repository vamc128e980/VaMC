// @ts-nocheck
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
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
  Gift,
  Check,
  Hash,
  Crown
} from 'lucide-react';

const butterSpring = { type: 'spring', stiffness: 420, damping: 32, mass: 0.45 };

const triggerHaptic = (ms = 12) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
};

export default function LuxuryCustomerTablePage() {
  const params = useParams();
  const rawTableParam = decodeURIComponent((params.id as string) || '');

  const [realTableNumber, setRealTableNumber] = useState<number | null>(null);
  const [displayTableName, setDisplayTableName] = useState<string>('');
  const [tableResolved, setTableResolved] = useState<boolean>(false);
  const [tableNotFound, setTableNotFound] = useState<boolean>(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [addons, setAddons] = useState<MenuAddon[]>([]);
  
  const [banners, setBanners] = useState<any[]>([
    {
      id: 999,
      image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=1200&auto=format&fit=crop'
    }
  ]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'combos' | null>(null);

  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  const [selectedWeightVariant, setSelectedWeightVariant] = useState<any | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
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
  const [activeSessionTotal, setActiveSessionTotal] = useState<number>(0);
  const [sessionOrderedItems, setSessionOrderedItems] = useState<any[]>([]);
  const [isTotalBillModalOpen, setIsTotalBillModalOpen] = useState(false);

  const [waiterToast, setWaiterToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const resolveTableIdentity = async () => {
    if (!rawTableParam) return;
    try {
      const cleanParam = rawTableParam.trim();
      const isNumeric = /^\d+$/.test(cleanParam);
      let matched = null;

      if (isNumeric) {
        const { data } = await supabase.from('restaurant_tables').select('*').eq('table_number', parseInt(cleanParam)).maybeSingle();
        matched = data;
      } else {
        const { data } = await supabase.from('restaurant_tables').select('*').ilike('table_name', cleanParam).maybeSingle();
        matched = data;
      }

      if (matched) {
        setRealTableNumber(matched.table_number);
        setDisplayTableName(matched.table_name || `Table #${matched.table_number}`);
        setTableResolved(true);
        setTableNotFound(false);
      } else if (isNumeric) {
        setRealTableNumber(parseInt(cleanParam));
        setDisplayTableName(`Table #${cleanParam}`);
        setTableResolved(true);
      } else {
        setTableNotFound(true);
      }
    } catch (err) {
      setTableNotFound(true);
    }
  };

  useEffect(() => {
    resolveTableIdentity();
  }, [rawTableParam]);

  const fetchSessionItems = async (sessionId: string) => {
    try {
      const { data } = await supabase.from('order_items').select('*, menu_items(name_en, name, price)').eq('session_id', sessionId).neq('item_status', 'cancelled');
      if (data) setSessionOrderedItems(data);
    } catch (e) {}
  };

  const fetchLatestOrderToken = async (sessionId: string) => {
    try {
      const { data } = await supabase.from('order_batches').select('id, order_pin, status').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) {
        setActiveOrderToken(data.order_pin);
        setActiveBatchStatus(data.status);
      }
    } catch (e) {}
  };

  const syncSessionData = async () => {
    if (!realTableNumber) return;
    const { data: session } = await supabase.from('table_sessions').select('*').eq('table_number', realTableNumber).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (session) {
      setActiveSessionId(session.id);
      setActiveSessionTotal(Number(session.total_amount) || 0);
      setCustomerName(session.customer_name || '');
      setCustomerPhone(session.customer_phone || '');
      fetchSessionItems(session.id);
      fetchLatestOrderToken(session.id);
      if (session.customer_phone) checkLoyaltyProfile(session.customer_phone);
    } else {
      setActiveSessionId(null);
      setActiveSessionTotal(0);
      setSessionOrderedItems([]);
      setActiveOrderToken(null);
    }
  };

  // Fake Number Protection & Loyalty Check
  const isValidPhone = (phone: string) => {
    const regex = /^[6-9]\d{9}$/;
    if (!regex.test(phone)) return false;
    if (/^(\d)\1{9}$/.test(phone)) return false; // Blocks 3333333333, 1111111111 etc.
    return true;
  };

  const checkLoyaltyProfile = async (phone: string) => {
    if (!isValidPhone(phone)) {
      setCustomerVisitCount(0);
      return;
    }
    try {
      const { data } = await supabase.from('customer_loyalty').select('*').eq('phone', phone).maybeSingle();
      if (data) setCustomerVisitCount(data.total_visits || 0);
      else setCustomerVisitCount(0);
    } catch (e) {}
  };

  const fetchMenuData = async () => {
    const [
      { data: cats },
      { data: items },
      { data: adns },
      { data: bnrs }
    ] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('menu_items').select('*').eq('is_available', true).order('id', { ascending: true }),
      supabase.from('menu_addons').select('*').eq('is_available', true).order('id', { ascending: true }),
      supabase.from('promo_banners').select('*').eq('is_active', true).order('id', { ascending: false })
    ]);

    if (cats && cats.length > 0) {
      setCategories(cats);
      setSelectedCategory(cats[0].id);
    }
    if (items) setMenuItems(items);
    if (adns) setAddons(adns);
    if (bnrs && bnrs.length > 0) {
      setBanners(bnrs);
      setCurrentBannerIndex(0);
    }
  };

  useEffect(() => {
    if (!tableResolved || !realTableNumber) return;
    syncSessionData();
    fetchMenuData();

    const channel = supabase
      .channel(`table-${realTableNumber}-rt`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', filter: `table_number=eq.${realTableNumber}` }, () => syncSessionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_banners' }, () => fetchMenuData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [realTableNumber, tableResolved]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % banners.length);
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
      setSelectedWeightVariant(hasRetailVariants ? item.weight_variants[0] : null);
    } else {
      addToCartDirect(item, false);
    }
  };

  const addToCartDirect = (item: any, isCombo = false, chosenAddons: MenuAddon[] = [], chosenVariant: any = null, isFree = false) => {
    triggerHaptic(15);
    const effectivePrice = isFree ? 0 : (chosenVariant ? chosenVariant.price : item.price);

    setCart(prev => {
      const existing = prev.find(ci => 
        ci.menuItem.id === item.id && 
        ci.isCombo === isCombo && 
        ci.isComplimentary === isFree &&
        ci.selectedWeightVariant?.size === chosenVariant?.size &&
        JSON.stringify(ci.selectedAddons?.map(a => Number(a.id)).sort()) === JSON.stringify(chosenAddons.map(a => Number(a.id)).sort())
      );

      if (existing) {
        return prev.map(ci => ci === existing ? { ...ci, quantity: ci.quantity + 1 } : ci);
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

  const removeFromCart = (index: number) => {
    triggerHaptic(12);
    setCart(prev => {
      const target = prev[index];
      if (!target) return prev;
      if (target.quantity > 1) {
        return prev.map((ci, i) => i === index ? { ...ci, quantity: ci.quantity - 1 } : ci);
      }
      return prev.filter((_, i) => i !== index);
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

  // 10th Visit Reward Logic (Juices < ₹70)
  const is10thVisitMilestone = (customerVisitCount + 1) % 10 === 0 && (customerVisitCount + 1) > 0;
  
  const freeRewardDrinks = useMemo(() => {
    return menuItems.filter(m => Number(m.price) <= 70 && (m.name_en || m.name).toLowerCase().includes('juice')).slice(0, 5);
  }, [menuItems]);

  const handleClaimFreeReward = (drink: MenuItem) => {
    triggerHaptic(25);
    addToCartDirect(drink, false, [], null, true);
    setIsRewardClaimedThisSession(true);
    setShowRewardModal(false);
    setWaiterToast(`🎁 ${drink.name_en || drink.name} added FREE!`);
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
      setWaiterToast(`🔔 Steward notified for ${displayTableName}!`);
      setTimeout(() => setWaiterToast(null), 4000);
    } catch (e) {
      alert('Unable to notify waiter.');
    }
  };

  const handlePlaceOrder = async () => {
    triggerHaptic(30);
    if (!realTableNumber) return alert('Invalid table.');
    
    if (!activeSessionId) {
      if (customerName.trim().length < 2) return alert('Please enter Guest Name.');
      if (!isValidPhone(customerPhone)) {
        setPhoneError('Please enter a valid 10-digit mobile number.');
        return;
      }
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

      // Smart Tagging for Ice Creams & Dry Fruits
      const orderPayload = cart.map((ci, idx) => {
        let nameTag = '';
        if (ci.menuItem.is_retail_item) nameTag = '[DF] ';
        else if ((ci.menuItem.name_en || '').toLowerCase().includes('ice cream')) nameTag = '[ICE] ';

        return {
          batch_id: batch.id,
          session_id: sessionId,
          menu_item_id: ci.menuItem.id,
          station_id: 'kitchen_hot',
          quantity: ci.quantity,
          unit_price: ci.isComplimentary ? 0 : ci.menuItem.price,
          item_status: 'ordered',
          cooking_notes: nameTag ? `Tag: ${nameTag.trim()}` : null,
          selected_addons: ci.selectedAddons || [],
          is_complimentary: Boolean(ci.isComplimentary),
          selected_weight_variant: ci.selectedWeightVariant?.size || null
        };
      });

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

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (item.is_retail_item) return false; // Hide retail items from main menu (shows in cart)
      const dishName = (item.name_en || item.name || '').toLowerCase();
      if (searchQuery.trim()) return dishName.includes(searchQuery.toLowerCase());
      return item.category_id === selectedCategory;
    });
  }, [menuItems, searchQuery, selectedCategory]);

  const retailDryFruits = useMemo(() => {
    return menuItems.filter(item => item.is_retail_item);
  }, [menuItems]);

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
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div>
            <span className="text-[9px] tracking-[0.2em] font-mono uppercase text-[#D4AF37] block font-bold">ROYAL FINE-DINE</span>
            <h1 className="text-base font-black text-amber-200 tracking-wide mt-0.5">{displayTableName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsTotalBillModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-[#D4AF37]/40 text-left shadow-lg cursor-pointer">
              <Receipt className="w-3.5 h-3.5 text-[#D4AF37]" />
              <div>
                <span className="text-[8px] block uppercase font-mono text-neutral-400">LEDGER</span>
                <span className="text-xs font-mono font-black text-[#FCF6BA]">₹{runningGrandTotal.toFixed(2)}</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* Banners */}
        {banners.length > 0 && (
          <div className="relative w-full h-48 sm:h-56 overflow-hidden rounded-[24px] border border-[#D4AF37]/50 shadow-2xl bg-neutral-950">
            <AnimatePresence mode="wait">
              {banners[currentBannerIndex] && (
                <motion.div
                  key={banners[currentBannerIndex].id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="w-full h-full"
                >
                  <img src={banners[currentBannerIndex].image_url} alt="Promo Banner" className="w-full h-full object-cover object-center" />
                </motion.div>
              )}
            </AnimatePresence>
            {banners.length > 1 && (
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-20 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                {banners.map((_, idx) => (
                  <button key={idx} type="button" onClick={() => setCurrentBannerIndex(idx)} className={`h-1.5 rounded-full transition-all cursor-pointer ${idx === currentBannerIndex ? 'w-5 bg-[#D4AF37]' : 'w-1.5 bg-white/40'}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#D4AF37]/80 absolute left-4 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search our handcrafted delights..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/[0.03] text-white placeholder-neutral-500 rounded-2xl pl-11 pr-4 py-2.5 text-xs outline-none border border-white/[0.08]" />
        </div>

        {/* Categories Bar */}
        <div className="sticky top-[58px] z-30 py-2 bg-[#060608]/95 backdrop-blur-xl border-b border-white/[0.05]">
          <div ref={categoryScrollRef} className="p-1.5 rounded-[26px] bg-white/[0.03] border border-white/[0.08] flex gap-2 overflow-x-auto select-none items-center scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={(e) => { triggerHaptic(15); setSelectedCategory(cat.id); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
                  className={`relative px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${isSelected ? 'text-black font-black bg-[#D4AF37] shadow-md' : 'text-neutral-400 hover:text-white'}`}
                >
                  <span>{cat.name_en || cat.name} {cat.category_type === 'retail' ? '🛍️' : ''}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dishes Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {filteredMenuItems.map((item) => {
            const inCart = cart.find(ci => ci.menuItem.id === item.id);
            const dishTitle = item.name_en || item.name;

            return (
              <div key={item.id} className="bg-gradient-to-b from-[#111114] to-[#08080a] border border-white/[0.08] rounded-[20px] p-2.5 flex flex-col justify-between shadow-xl relative">
                <div>
                  <div className="h-24 w-full rounded-xl overflow-hidden bg-neutral-950 mb-2 relative">
                    {item.image_url ? (
                      <img src={item.image_url} alt={dishTitle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600"><ImgIcon className="w-5 h-5" /></div>
                    )}
                    <span className={`absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full ${item.food_type === 'non_veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  </div>
                  <h4 className="text-[11px] font-bold text-white line-clamp-1">{dishTitle}</h4>
                </div>

                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.06]">
                  <div>
                    <span className="font-mono text-[11px] font-black text-[#D4AF37]">₹{Number(item.price).toFixed(0)}</span>
                  </div>
                  {inCart ? (
                    <div className="flex items-center bg-white/[0.08] border border-[#D4AF37]/60 rounded-lg p-0.5">
                      <button onClick={() => removeFromCart(cart.indexOf(inCart))} className="p-0.5 text-[#FCF6BA] cursor-pointer"><Minus className="w-2.5 h-2.5" /></button>
                      <span className="font-mono font-bold text-[10px] text-white px-1">{inCart.quantity}</span>
                      <button onClick={() => handleItemAddClick(item)} className="p-0.5 text-[#FCF6BA] cursor-pointer"><Plus className="w-2.5 h-2.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => handleItemAddClick(item)} className="w-6 h-6 rounded-lg bg-[#D4AF37] text-black flex items-center justify-center font-black cursor-pointer shadow-md">
                      <Plus className="w-3 h-3 stroke-[3]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating Bottom Action Dock */}
      <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-40">
        <div className="p-2 rounded-[28px] bg-[#0c0c0e]/95 border border-[#D4AF37]/50 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex items-center justify-between gap-2">
          <button onClick={() => handleCallWaiter('water')} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono font-bold text-neutral-300 cursor-pointer">
            <BellRing className="w-4 h-4 text-[#D4AF37]" />
            <span>Call Steward</span>
          </button>

          {cartItemCount > 0 ? (
            <button onClick={() => setIsCartOpen(true)} className="flex-1 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black py-2.5 px-4 rounded-2xl flex items-center justify-between font-black text-xs font-mono shadow-lg cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="bg-black text-[#FCF6BA] px-2 py-0.5 rounded-lg text-[10px]">{cartItemCount}</span>
                <span>View Cart</span>
              </div>
              <span>₹{cartGrandTotal.toFixed(2)} ➔</span>
            </button>
          ) : (
            <button onClick={() => setIsTotalBillModalOpen(true)} className="flex-1 py-2 rounded-2xl text-xs font-mono text-neutral-400 hover:text-white text-right pr-2 cursor-pointer">
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
              className="relative w-full max-w-md mx-auto bg-[#0d0d0f] border-t border-x border-[#D4AF37]/50 rounded-t-[36px] p-6 pb-8 space-y-4 z-10 max-h-[95vh] overflow-y-auto custom-gold-scrollbar shadow-2xl font-mono text-xs"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base">Your Dining Cart</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* RETAIL DRY FRUITS SLIDER (BIGBASKET STYLE) */}
              {retailDryFruits.length > 0 && (
                <div className="py-3 border-b border-white/10">
                  <h4 className="text-xs font-black text-[#FCF6BA] mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4"/> Buy Premium Dry Fruits (Limited Stock!)</h4>
                  <div className="flex gap-3 overflow-x-auto custom-gold-scrollbar pb-2">
                    {retailDryFruits.map(df => (
                      <div key={df.id} className="min-w-[140px] bg-[#161619] border border-white/10 rounded-2xl p-2.5 flex flex-col gap-2 shadow-lg">
                        <span className="font-bold text-white text-[11px] truncate">{df.name}</span>
                        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                           {df.weight_variants?.map((v: any, vIdx: number) => (
                              <button 
                                key={vIdx}
                                onClick={() => addToCartDirect(df, false, [], v, false)}
                                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37] text-[9px] text-neutral-300 font-bold whitespace-nowrap transition"
                              >
                                {v.size} (₹{v.price})
                              </button>
                           ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 divide-y divide-white/5">
                {cart.map((ci, idx) => {
                  const addOnsCost = (ci.selectedAddons || []).reduce((sum, a) => sum + Number(a.price || 0), 0);
                  const singleUnitPrice = ci.isComplimentary ? 0 : (Number(ci.menuItem.price || 0) + addOnsCost);
                  return (
                    <div key={idx} className="pt-2 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">{ci.menuItem.name_en || ci.menuItem.name} {ci.selectedWeightVariant ? `(${ci.selectedWeightVariant.size})` : ''}</span>
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
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <span className="font-bold text-[#FCF6BA] block">Guest Identification</span>
                  <input
                    type="text"
                    placeholder="Guest Name (Optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-[#161619] border border-[#D4AF37]/40 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#D4AF37] transition"
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
                        if (clean.length === 10 && isValidPhone(clean)) checkLoyaltyProfile(clean);
                        else setCustomerVisitCount(0);
                      }}
                      className={`w-full bg-[#161619] border rounded-xl px-3.5 py-2.5 text-white outline-none transition ${phoneError ? 'border-rose-500 focus:border-rose-500' : 'border-[#D4AF37]/40 focus:border-[#D4AF37]'}`}
                    />
                    {phoneError && <span className="text-rose-400 text-[10px] mt-1 block">{phoneError}</span>}
                  </div>

                  {/* Gamified Loyalty Progress Bar */}
                  {customerPhone.length === 10 && isValidPhone(customerPhone) && !is10thVisitMilestone && (
                     <div className="p-3 bg-black/40 rounded-xl border border-white/10 mt-2">
                        <div className="flex justify-between text-[10px] text-neutral-400 mb-1.5 font-bold">
                           <span>Visit {customerVisitCount + 1}</span>
                           <span>10th Visit = Free Juice!</span>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }} 
                             animate={{ width: `${((customerVisitCount % 10) / 10) * 100}%` }} 
                             className="h-full bg-gradient-to-r from-amber-500 to-[#D4AF37]" 
                           />
                        </div>
                        <span className="text-[9px] text-[#D4AF37] mt-1.5 block text-center">Just {10 - (customerVisitCount % 10)} more visits to unlock!</span>
                     </div>
                  )}

                  {/* 10th Visit Reward Claim Button */}
                  {is10thVisitMilestone && !isRewardClaimedThisSession && (
                     <div className="p-3 rounded-xl bg-gradient-to-r from-amber-900/40 to-[#12110c] border border-amber-400/50 flex justify-between items-center mt-2 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                        <div>
                           <span className="text-amber-400 font-black text-[11px] block">🎉 10th Visit Unlocked!</span>
                           <span className="text-[9px] text-neutral-400">Claim your free fresh juice below.</span>
                        </div>
                        <button onClick={() => setShowRewardModal(true)} className="px-3 py-1.5 bg-amber-400 text-black font-black rounded-lg text-[10px] uppercase shadow-md cursor-pointer">Claim Now</button>
                     </div>
                  )}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3 mt-4">
                <div className="flex justify-between text-white font-black text-sm">
                  <span>Payable at Counter:</span>
                  <span className="text-[#D4AF37] text-base">₹{cartGrandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                disabled={loading}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-lg cursor-pointer mt-4 hover:bg-[#c59b27] transition"
              >
                {loading ? 'Submitting Order...' : 'Submit Order & Get Token'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Free Reward Selection Modal */}
      <AnimatePresence>
        {showRewardModal && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-[#0d0d0f] border border-amber-400/50 rounded-[28px] p-6 font-mono shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                <h3 className="text-amber-400 font-black uppercase flex items-center gap-2"><Gift className="w-4 h-4"/> Choose Your Free Drink</h3>
                <button onClick={() => setShowRewardModal(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5"/></button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-gold-scrollbar pr-1">
                 {freeRewardDrinks.length === 0 ? (
                    <div className="text-center py-6 text-neutral-500 text-xs">No eligible drinks found under ₹70.</div>
                 ) : (
                    freeRewardDrinks.map(drink => (
                       <div key={drink.id} onClick={() => handleClaimFreeReward(drink)} className="p-3 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400 flex justify-between items-center cursor-pointer transition">
                          <span className="text-white font-bold text-xs">{drink.name}</span>
                          <span className="text-amber-400 font-black text-[10px] uppercase">Free</span>
                       </div>
                    ))
                 )}
              </div>
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
                className="w-full py-3.5 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs cursor-pointer shadow-lg mt-2 hover:bg-[#c59b27] transition"
              >
                Add to Dining Cart
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Table Ledger Modal (Fixed) */}
      <AnimatePresence>
        {isTotalBillModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0d0d0f] border border-[#D4AF37]/60 rounded-3xl p-6 shadow-[0_0_40px_rgba(212,175,55,0.15)] space-y-4 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-base uppercase tracking-wider flex items-center gap-2"><Receipt className="w-4 h-4 text-[#D4AF37]"/> Table Ledger & Bill</h3>
                <button onClick={() => setIsTotalBillModalOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer transition"><X className="w-5 h-5" /></button>
              </div>
              
              {activeOrderToken && (
                <div className="p-3 rounded-xl bg-[#161619] border border-[#D4AF37]/40 flex justify-between items-center shadow-inner">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">Order Token:</span>
                  <span className="text-[#D4AF37] font-black text-base">#{activeOrderToken}</span>
                </div>
              )}

              {/* Fixed: Show Ordered Items List in Ledger */}
              <div className="space-y-2.5 max-h-48 overflow-y-auto custom-gold-scrollbar pr-1 my-4">
                {sessionOrderedItems.length === 0 ? (
                   <div className="text-center text-neutral-500 py-4">No items ordered yet.</div>
                ) : (
                   sessionOrderedItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="truncate pr-2">
                           <span className="text-white font-bold block">{item.menu_items?.name_en || item.menu_items?.name || (item.cooking_notes?.replace('VaMC Counter Item: ', '') || 'Counter Item')}</span>
                           <span className="text-[10px] text-neutral-400">Qty: {item.quantity}</span>
                        </div>
                        <span className="text-[#D4AF37] font-black">₹{(Number(item.unit_price) * item.quantity).toFixed(2)}</span>
                      </div>
                   ))
                )}
              </div>

              <div className="flex justify-between items-center font-black text-white text-sm pt-3 border-t border-[#D4AF37]/50 mt-4">
                <span className="uppercase tracking-wider">Net Payable:</span>
                <span className="text-[#D4AF37] text-lg">₹{runningGrandTotal.toFixed(2)}</span>
              </div>
              <button onClick={() => setIsTotalBillModalOpen(false)} className="w-full py-3 rounded-xl bg-[#D4AF37] text-black font-black uppercase cursor-pointer hover:bg-[#c59b27] transition shadow-lg mt-4">
                Close Ledger
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {waiterToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#161619] border border-[#D4AF37] text-[#FCF6BA] px-4 py-2.5 rounded-xl shadow-2xl font-mono text-xs font-bold whitespace-nowrap flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {waiterToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
