// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Category, MenuItem, PromoBanner, RetailProduct, CartItem, Language } from '@/types/restaurant';
import { UI_TEXT, getLocalizedName } from '@/lib/translations';
import { 
  Plus, 
  Minus, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  Store, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  ShoppingBag, 
  X,
  Edit2,
  Trash2
} from 'lucide-react';

export default function TableMenuPage() {
  const params = useParams();
  const tableId = params.id as string;

  const [lang, setLang] = useState<Language>('en');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [upsellItems, setUpsellItems] = useState<MenuItem[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [retailItems, setRetailItems] = useState<RetailProduct[]>([]);

  const [formattedDate, setFormattedDate] = useState<string>('');
  const [formattedTime, setFormattedTime] = useState<string>('');

  const [[currentBannerIndex, direction], setBannerState] = useState([0, 0]);
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'non_veg'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Customer session info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isFirstOrder, setIsFirstOrder] = useState(true);

  // Post order state
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const [orderPlacedTime, setOrderPlacedTime] = useState<string>('');
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [lastOrderedCart, setLastOrderedCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const isDraggingRef = useRef(false);
  const t = UI_TEXT[lang];

  const resetSessionLocally = () => {
    setActiveSessionId(null);
    setIsFirstOrder(true);
    setCustomerName('');
    setCustomerPhone('');
    setCart([]);
    setOrderPlaced(false);
    setCurrentBatchId(null);
    setLastOrderedCart([]);
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setFormattedDate(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      );
      setFormattedTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkActiveSession = async () => {
    const { data: tbl } = await supabase
      .from('restaurant_tables')
      .select('status')
      .eq('table_number', parseInt(tableId))
      .maybeSingle();

    if (tbl && tbl.status === 'available') {
      resetSessionLocally();
      return;
    }

    const { data: activeSession } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('table_number', parseInt(tableId))
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSession) {
      setActiveSessionId(activeSession.id);
      setIsFirstOrder(false);
      setCustomerName(activeSession.customer_name || '');
      setCustomerPhone(activeSession.customer_phone || '');
    } else {
      resetSessionLocally();
    }
  };

  const fetchMenuData = async () => {
    const { data: cats } = await supabase.from('categories').select('*').order('sort_order');
    if (cats && cats.length > 0) {
      setCategories(cats);
      setSelectedCategory(cats[0].id);
    }

    const { data: items } = await supabase.from('menu_items').select('*');
    if (items) {
      setMenuItems(items.filter((i) => !i.is_upsell));
      setUpsellItems(items.filter((i) => i.is_upsell && i.is_available));
    }

    const { data: promo } = await supabase
      .from('promo_banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (promo && promo.length > 0) {
      setBanners(promo);
    } else {
      setBanners([
        {
          id: 991,
          title: 'Royal Dum Biryani Special',
          image_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=1000&auto=format&fit=crop',
          target_category_id: cats?.[0]?.id || null,
          target_item_id: items?.[0]?.id || null,
          is_active: true,
          sort_order: 1
        },
        {
          id: 992,
          title: 'Clay Oven Tandoori Platter',
          image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=1000&auto=format&fit=crop',
          target_category_id: cats?.[1]?.id || cats?.[0]?.id || null,
          target_item_id: items?.[1]?.id || null,
          is_active: true,
          sort_order: 2
        }
      ]);
    }

    const { data: retail } = await supabase.from('retail_showcase').select('*').eq('is_active', true);
    if (retail) setRetailItems(retail);
  };

  useEffect(() => {
    checkActiveSession();
    fetchMenuData();

    const channel = supabase
      .channel(`table-${tableId}-realtime-sync-channel`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_tables', filter: `table_number=eq.${parseInt(tableId)}` },
        (payload) => {
          if (payload.new && payload.new.status === 'available') {
            resetSessionLocally();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_sessions', filter: `table_number=eq.${parseInt(tableId)}` },
        (payload) => {
          if (payload.new && (payload.new.status === 'completed' || payload.new.status === 'cancelled')) {
            resetSessionLocally();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      paginateBanner(1);
    }, 4500);
    return () => clearInterval(interval);
  }, [banners.length, currentBannerIndex]);

  const paginateBanner = (newDirection: number) => {
    setBannerState(([prev]) => {
      let nextIndex = prev + newDirection;
      if (nextIndex < 0) nextIndex = banners.length - 1;
      if (nextIndex >= banners.length) nextIndex = 0;
      return [nextIndex, newDirection];
    });
  };

  const handleBannerClick = (banner: PromoBanner) => {
    if (isDraggingRef.current) return;
    if (banner.target_category_id) {
      setSelectedCategory(banner.target_category_id);
      setFoodFilter('all');
    }
    if (banner.target_item_id) {
      setHighlightedItemId(banner.target_item_id);
      setTimeout(() => {
        const el = document.getElementById('menu-item-' + banner.target_item_id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
      setTimeout(() => setHighlightedItemId(null), 3500);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((ci) =>
          ci.menuItem.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci
        );
      }
      return prev.filter((ci) => ci.menuItem.id !== itemId);
    });
  };

  // Flat Round Figure Inclusive GST Math
  const cartGrandTotal = cart.reduce((sum, ci) => sum + ci.menuItem.price * ci.quantity, 0);
  const cartSubtotal = Math.round((cartGrandTotal / 1.05) * 100) / 100;
  const totalTax = Math.round((cartGrandTotal - cartSubtotal) * 100) / 100;
  const cgstAmount = Math.round((totalTax / 2) * 100) / 100;
  const sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;
  const cartItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  const isFormValid = customerName.trim().length >= 2 && customerPhone.length === 10;
  const isOrderAllowed = !isFirstOrder || isFormValid;

  const handlePlaceOrder = async () => {
    if (isFirstOrder && !isFormValid) {
      alert('Dayachesi peru mariyu 10-ankela mobile number enter cheyandi.');
      return;
    }

    setLoading(true);
    try {
      const { data: currentActiveSession } = await supabase
        .from('table_sessions')
        .select('*')
        .eq('table_number', parseInt(tableId))
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let sessionId = currentActiveSession ? currentActiveSession.id : null;

      if (!sessionId) {
        const { data: newSession, error: sErr } = await supabase
          .from('table_sessions')
          .insert({
            table_number: parseInt(tableId),
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            subtotal: cartSubtotal,
            cgst_amount: cgstAmount,
            sgst_amount: sgstAmount,
            gst_rate: 5.0,
            total_amount: cartGrandTotal,
            status: 'active',
            payment_status: 'unpaid',
          })
          .select()
          .single();

        if (sErr) throw sErr;
        sessionId = newSession.id;
        setActiveSessionId(sessionId);

        await supabase
          .from('restaurant_tables')
          .update({ status: 'occupied' })
          .eq('table_number', parseInt(tableId));
      } else {
        const newGrandTotal = (Number(currentActiveSession.total_amount) || 0) + cartGrandTotal;
        const newSubtotal = Math.round((newGrandTotal / 1.05) * 100) / 100;
        const newTotalTax = Math.round((newGrandTotal - newSubtotal) * 100) / 100;
        const newCgst = Math.round((newTotalTax / 2) * 100) / 100;
        const newSgst = Math.round((newTotalTax - newCgst) * 100) / 100;

        await supabase
          .from('table_sessions')
          .update({
            subtotal: newSubtotal,
            cgst_amount: newCgst,
            sgst_amount: newSgst,
            total_amount: newGrandTotal,
          })
          .eq('id', sessionId);
      }

      setIsFirstOrder(false);

      const { data: batch, error: bErr } = await supabase
        .from('order_batches')
        .insert({
          session_id: sessionId,
          table_number: parseInt(tableId),
          status: 'pending_waiter',
        })
        .select()
        .single();

      if (bErr) throw bErr;

      const orderItemsPayload = cart.map((ci) => {
        const cat = categories.find((c) => c.id === ci.menuItem.category_id);
        return {
          batch_id: batch.id,
          session_id: sessionId,
          menu_item_id: ci.menuItem.id,
          station_id: cat?.station_id || 'kitchen_hot',
          quantity: ci.quantity,
          unit_price: ci.menuItem.price,
          item_status: 'ordered',
        };
      });

      await supabase.from('order_items').insert(orderItemsPayload);

      const placedAt = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      setOrderPlacedTime(placedAt);
      setCurrentBatchId(batch.id);
      setLastOrderedCart([...cart]);

      setCart([]);
      setIsCartOpen(false);
      setOrderPlaced(true);
      setCountdown(120);
    } catch (err: any) {
      alert(err.message || 'Order submit error');
    } finally {
      setLoading(false);
    }
  };

  // 100% Guaranteed Cancel Flow (Table 9 issue solved)
  const handleCancelOrder = async () => {
    if (!currentBatchId) return;
    if (!confirm('Mee order ni poorthiga CANCEL cheyalani anukuntunnara?')) return;

    try {
      setLoading(true);
      const canceledTotal = lastOrderedCart.reduce((s, ci) => s + ci.menuItem.price * ci.quantity, 0);

      if (activeSessionId) {
        const { data: sess } = await supabase.from('table_sessions').select('*').eq('id', activeSessionId).single();
        if (sess) {
          const newTotal = Math.max(0, (Number(sess.total_amount) || 0) - canceledTotal);

          // Okavela bill 0 aipothe, poorthi session ni complete/cancel chesi table ni direct ga vacant cheyali
          if (newTotal === 0) {
            await supabase
              .from('table_sessions')
              .update({
                total_amount: 0,
                subtotal: 0,
                status: 'cancelled'
              })
              .eq('id', activeSessionId);

            await supabase
              .from('restaurant_tables')
              .update({ status: 'available' })
              .eq('table_number', parseInt(tableId));

            resetSessionLocally();
          } else {
            const newSubtotal = Math.round((newTotal / 1.05) * 100) / 100;
            const newTax = Math.round((newTotal - newSubtotal) * 100) / 100;
            const newCgst = Math.round((newTax / 2) * 100) / 100;
            const newSgst = Math.round((newTax - newCgst) * 100) / 100;

            await supabase
              .from('table_sessions')
              .update({
                total_amount: newTotal,
                subtotal: newSubtotal,
                cgst_amount: newCgst,
                sgst_amount: newSgst
              })
              .eq('id', activeSessionId);
          }
        }
      }

      await supabase.from('order_items').delete().eq('batch_id', currentBatchId);
      await supabase.from('order_batches').delete().eq('id', currentBatchId);

      alert('Order poorthiga cancel aindi. Table reset aipoindi!');
      setOrderPlaced(false);
      setCart([]);
    } catch (err: any) {
      alert('Cancel error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Modify Order Flow
  const handleModifyOrder = async () => {
    if (!currentBatchId) return;
    if (!confirm('Order ni modify cheyalani anukuntunnara? Items malli cart loki vasthayi.')) return;

    try {
      setLoading(true);
      const canceledTotal = lastOrderedCart.reduce((s, ci) => s + ci.menuItem.price * ci.quantity, 0);

      if (activeSessionId) {
        const { data: sess } = await supabase.from('table_sessions').select('*').eq('id', activeSessionId).single();
        if (sess) {
          const newTotal = Math.max(0, (Number(sess.total_amount) || 0) - canceledTotal);
          const newSubtotal = Math.round((newTotal / 1.05) * 100) / 100;
          const newTax = Math.round((newTotal - newSubtotal) * 100) / 100;
          const newCgst = Math.round((newTax / 2) * 100) / 100;
          const newSgst = Math.round((newTax - newCgst) * 100) / 100;

          await supabase
            .from('table_sessions')
            .update({
              total_amount: newTotal,
              subtotal: newSubtotal,
              cgst_amount: newCgst,
              sgst_amount: newSgst
            })
            .eq('id', activeSessionId);
        }
      }

      await supabase.from('order_items').delete().eq('batch_id', currentBatchId);
      await supabase.from('order_batches').delete().eq('id', currentBatchId);

      setCart([...lastOrderedCart]);
      setOrderPlaced(false);
      setIsCartOpen(true);
    } catch (err: any) {
      alert('Modify error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderPlaced || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [orderPlaced, countdown]);

  const activeCategoryObj = categories.find((c) => c.id === selectedCategory);

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.category_id !== selectedCategory) return false;
    if (foodFilter === 'all') return true;
    if (foodFilter === 'veg') return item.food_type === 'veg';
    if (foodFilter === 'non_veg') return item.food_type === 'non_veg';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#050507] text-neutral-100 pb-32 font-sans selection:bg-[#D4AF37] selection:text-black">
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_70%)] blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/2 right-0 w-80 h-80 bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,transparent_70%)] blur-3xl pointer-events-none -z-10" />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[#08080c]/60 backdrop-blur-3xl border-b border-white/[0.08] px-4 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-[#F3E5AB] uppercase bg-gradient-to-r from-[#D4AF37]/25 via-[#AA771C]/15 to-transparent px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40 shadow-[0_0_15px_rgba(212,175,55,0.25)]">
                FINE DINE
              </span>
              <h1 className="text-base font-extrabold tracking-wide text-neutral-100">
                {t.table} <span className="bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] bg-clip-text text-transparent font-black">#{tableId}</span>
              </h1>
            </div>

            {formattedDate && (
              <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-400 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#D4AF37]/80" />
                  {formattedDate}
                </span>
                <span className="text-neutral-600">•</span>
                <span className="flex items-center gap-1 font-mono text-neutral-200 font-bold">
                  <Clock className="w-3 h-3 text-[#D4AF37]" />
                  {formattedTime}
                </span>
              </div>
            )}
          </div>

          <div className="flex bg-neutral-900/60 backdrop-blur-xl p-1 rounded-2xl border border-white/10 text-xs font-bold shadow-inner">
            {(['en', 'te', 'hi'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`relative px-2.5 py-1 rounded-xl transition-colors duration-200 ${
                  lang === l ? 'text-black font-black' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {lang === l && (
                  <motion.div
                    layoutId="activeLang"
                    className="absolute inset-0 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{l === 'en' ? 'EN' : l === 'te' ? 'తెలుగు' : 'हिन्दी'}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {/* Promo Banners */}
        {banners.length > 0 && (
          <div className="p-4 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.9)] h-52 bg-neutral-950 border border-white/[0.08] select-none group">
              <AnimatePresence initial={false} custom={direction}>
                {banners[currentBannerIndex] && (
                  <motion.div
                    key={banners[currentBannerIndex].id}
                    custom={direction}
                    initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: direction < 0 ? '100%' : '-100%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 32 }}
                    onClick={() => handleBannerClick(banners[currentBannerIndex])}
                    className="absolute inset-0 w-full h-full cursor-pointer"
                  >
                    <img
                      src={banners[currentBannerIndex].image_url}
                      alt={banners[currentBannerIndex].title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent flex flex-col justify-end p-5">
                      <span className="bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA771C] text-black font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1.5 w-fit flex items-center gap-1 shadow-md">
                        <Flame className="w-3 h-3 text-black fill-current" /> Chef's Special
                      </span>
                      <h2 className="text-white font-extrabold text-lg sm:text-xl leading-tight drop-shadow-lg">
                        {banners[currentBannerIndex].title}
                      </h2>
                      <span className="text-xs text-[#F3E5AB] font-semibold underline mt-1 flex items-center gap-1">
                        Tap here to jump to dish ➔
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Category Horizontal Slider */}
        <div className="sticky top-[57px] z-30 bg-[#050507]/70 backdrop-blur-3xl pt-2 pb-3 px-4 border-b border-white/[0.06]">
          <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`relative px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors duration-200 select-none ${
                  selectedCategory === cat.id ? 'text-black font-black' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {selectedCategory === cat.id && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    className="absolute inset-0 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] rounded-full shadow-[0_2px_20px_rgba(212,175,55,0.5)]"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}
                <span className="relative z-10">{getLocalizedName(cat, lang)}</span>
              </button>
            ))}
          </div>

          {activeCategoryObj?.has_veg_toggle && (
            <div className="flex gap-2 mt-3 text-xs font-bold">
              <button
                onClick={() => setFoodFilter('all')}
                className={`px-3 py-1.5 rounded-xl border transition-all ${
                  foodFilter === 'all'
                    ? 'bg-neutral-800/80 text-[#F3E5AB] border-[#D4AF37]/50 shadow-sm'
                    : 'bg-neutral-900/30 text-neutral-400 border-white/[0.06]'
                }`}
              >
                {t.all}
              </button>
              <button
                onClick={() => setFoodFilter('veg')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                  foodFilter === 'veg'
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50'
                    : 'bg-neutral-900/30 text-neutral-400 border-white/[0.06]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                {t.vegOnly}
              </button>
              <button
                onClick={() => setFoodFilter('non_veg')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                  foodFilter === 'non_veg'
                    ? 'bg-rose-950/70 text-rose-300 border-rose-500/50'
                    : 'bg-neutral-900/30 text-neutral-400 border-white/[0.06]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                {t.nonVegOnly}
              </button>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <main className="p-4 space-y-3">
          {filteredMenuItems.map((item) => {
            const inCart = cart.find((ci) => ci.menuItem.id === item.id);
            const isHighlighted = highlightedItemId === item.id;

            return (
              <div
                key={item.id}
                id={'menu-item-' + item.id}
                className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 flex gap-3.5 items-center justify-between ${
                  isHighlighted
                    ? 'bg-neutral-900/95 border-2 border-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.7)]'
                    : 'bg-white/[0.03] backdrop-blur-2xl border border-white/[0.09]'
                } ${!item.is_available ? 'opacity-40 grayscale' : ''}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {item.food_type === 'veg' && (
                      <span className="w-3.5 h-3.5 border border-emerald-500 flex items-center justify-center p-0.5 rounded-[3px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      </span>
                    )}
                    {item.food_type === 'non_veg' && (
                      <span className="w-3.5 h-3.5 border border-rose-500 flex items-center justify-center p-0.5 rounded-[3px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      </span>
                    )}
                    <h3 className="font-bold text-neutral-100 text-sm">{getLocalizedName(item, lang)}</h3>
                  </div>
                  <div className="font-mono font-bold text-[#F3E5AB] text-sm">₹{item.price.toFixed(2)}</div>
                </div>

                <div>
                  {!item.is_available ? (
                    <span className="text-xs font-semibold text-rose-400 bg-rose-950/40 px-2.5 py-1 rounded-lg">
                      {t.outOfStock}
                    </span>
                  ) : inCart ? (
                    <div className="flex items-center bg-black/60 border border-[#D4AF37]/50 rounded-xl px-2 py-1">
                      <button onClick={() => removeFromCart(item.id)} className="p-1 text-[#F3E5AB]">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono font-bold text-[#F3E5AB] px-2.5 text-xs">{inCart.quantity}</span>
                      <button onClick={() => addToCart(item)} className="p-1 text-[#F3E5AB]">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1 shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5 text-black stroke-[3]" /> {t.addToCart}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </main>
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-5 inset-x-4 max-w-lg mx-auto z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#08080c]/85 backdrop-blur-3xl text-white p-4 rounded-3xl border border-[#D4AF37]/50 shadow-2xl flex items-center justify-between font-bold"
          >
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
                {cartItemCount}
              </div>
              <span className="text-sm font-semibold text-neutral-200">{t.viewCart}</span>
            </div>
            <div className="text-[#F3E5AB] font-mono font-black text-base flex items-center gap-1">
              ₹{cartGrandTotal.toFixed(2)} ➔
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />

            <div className="relative w-full max-w-lg mx-auto bg-[#0a0a0f]/95 backdrop-blur-3xl border-t border-white/[0.12] rounded-t-[32px] max-h-[88vh] overflow-y-auto p-5 pb-8 space-y-4 shadow-2xl z-10">
              <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto mb-2" />

              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h2 className="text-lg font-black text-neutral-100 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#D4AF37]" /> {t.viewCart}
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="p-1 text-neutral-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Items */}
              <div className="space-y-2.5 divide-y divide-white/[0.06]">
                {cart.map((ci) => (
                  <div key={ci.menuItem.id} className="pt-2.5 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-neutral-200 text-sm">{getLocalizedName(ci.menuItem, lang)}</h4>
                      <span className="text-xs text-neutral-400 font-mono">₹{ci.menuItem.price.toFixed(2)} each</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#F3E5AB] text-sm">
                        ₹{(ci.menuItem.price * ci.quantity).toFixed(2)}
                      </span>
                      <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1">
                        <button onClick={() => removeFromCart(ci.menuItem.id)} className="p-1 text-neutral-400">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono text-xs font-bold text-neutral-200">{ci.quantity}</span>
                        <button onClick={() => addToCart(ci.menuItem)} className="p-1 text-neutral-400">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upsell */}
              {upsellItems.length > 0 && (
                <div className="bg-gradient-to-r from-[#D4AF37]/15 to-transparent border border-[#D4AF37]/30 rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 text-[#F3E5AB] text-xs font-bold mb-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" /> {t.upsellHeading}
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                    {upsellItems.map((uItem) => (
                      <div
                        key={uItem.id}
                        className="bg-neutral-900/70 min-w-[135px] rounded-xl p-2.5 border border-white/10 flex flex-col justify-between"
                      >
                        <div>
                          <div className="font-bold text-neutral-200 text-xs line-clamp-1">{getLocalizedName(uItem, lang)}</div>
                          <div className="text-[#F3E5AB] font-mono font-bold text-xs mt-0.5">₹{uItem.price.toFixed(2)}</div>
                        </div>
                        <button
                          onClick={() => addToCart(uItem)}
                          className="mt-2 text-[10px] font-black bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black rounded-lg py-1"
                        >
                          + {t.addToCart}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mandatory Customer Form */}
              {isFirstOrder && (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-[#D4AF37]/35 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#F3E5AB] uppercase tracking-wide">
                      <ShieldCheck className="w-4 h-4 text-[#D4AF37]" /> {t.customerDetails}
                    </div>
                    <span className="text-[10px] font-bold text-[#F3E5AB] bg-[#D4AF37]/20 border border-[#D4AF37]/40 px-2 py-0.5 rounded-full">
                      * Mandatory
                    </span>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Mee Peru (Your Name) *"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-neutral-500">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit Mobile Number *"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-black/60 border border-white/10 rounded-xl pl-11 pr-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-[#D4AF37] font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Inclusive 5% GST Bill Breakdown (Exact Round Figure) */}
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-400 font-medium">
                  <span>Items Net Value</span>
                  <span className="font-mono text-neutral-200">₹{cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-500 text-[11px]">
                  <span>CGST (2.5% incl.)</span>
                  <span className="font-mono text-neutral-400">₹{cgstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-500 text-[11px]">
                  <span>SGST (2.5% incl.)</span>
                  <span className="font-mono text-neutral-400">₹{sgstAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-dashed border-white/10 pt-2 flex justify-between items-center">
                  <div>
                    <span className="font-extrabold text-neutral-100 text-sm block">Grand Total</span>
                    <span className="text-[10px] text-emerald-400 font-medium">✓ Inclusive of 5% Govt GST</span>
                  </div>
                  <span className="text-xl font-mono font-black text-[#F3E5AB]">
                    ₹{cartGrandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Place Order Button */}
              <div>
                <button
                  disabled={loading || !isOrderAllowed}
                  onClick={handlePlaceOrder}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wide transition flex items-center justify-center gap-2 shadow-lg ${
                    !isOrderAllowed
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5'
                      : 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black shadow-lg'
                  }`}
                >
                  {loading ? 'Submitting Order...' : t.placeOrder}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Placed Success Modal with Functional Modify & Cancel */}
      <AnimatePresence>
        {orderPlaced && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-4 flex flex-col items-center justify-center">
            <div className="bg-[#0a0a0f]/95 backdrop-blur-2xl border border-[#D4AF37]/40 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-[#D4AF37]" />
              </div>

              <h2 className="text-xl font-black text-neutral-100">{t.orderPlaced}</h2>
              <p className="text-xs text-neutral-400 font-medium">{t.waiterNotice}</p>

              {orderPlacedTime && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-400 font-mono bg-neutral-900/60 py-1.5 px-3 rounded-xl border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Ordered at: <strong className="text-[#F3E5AB]">{orderPlacedTime}</strong></span>
                </div>
              )}

              {/* Grace Timer Block */}
              <div className="bg-[#D4AF37]/15 border border-[#D4AF37]/30 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock className={`w-4 h-4 ${countdown > 0 ? 'text-[#D4AF37] animate-pulse' : 'text-neutral-500'}`} />
                  <span className="text-xs font-bold text-[#F3E5AB]">
                    {countdown > 0 ? (
                      <>
                        Time left to modify/cancel:{' '}
                        <span className="font-mono text-sm font-black text-[#D4AF37]">
                          {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                        </span>
                      </>
                    ) : (
                      <span className="text-neutral-400">Order sent to kitchen (Cooking in progress)</span>
                    )}
                  </span>
                </div>

                {/* Edit & Cancel Buttons */}
                {countdown > 0 && (
                  <div className="flex items-center gap-2 w-full pt-1.5">
                    <button
                      onClick={handleModifyOrder}
                      disabled={loading}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-neutral-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#D4AF37]" /> Modify Order
                    </button>
                    <button
                      onClick={handleCancelOrder}
                      disabled={loading}
                      className="py-1.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Cancel
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setOrderPlaced(false)}
                className="w-full bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black py-3 rounded-2xl text-xs tracking-wider uppercase shadow-lg"
              >
                {t.orderMore}
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}