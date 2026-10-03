// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Category, MenuItem, PromoBanner, CartItem, Language } from '@/types/restaurant';
import { UI_TEXT, getLocalizedName } from '@/lib/translations';
import { 
  Plus, 
  Minus, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ShoppingBag, 
  X, 
  Receipt, 
  KeyRound, 
  Gift, 
  Flame,
  ArrowRight,
  Eye, 
  Sparkles,
  Utensils,
  Phone,
  User,
  Zap,
  Tag,
  ChevronLeft,
  ChevronRight,
  PackagePlus,
  Image as ImgIcon
} from 'lucide-react';

// Optimized 60FPS Native Springs
const fps60Spring = {
  type: 'spring',
  stiffness: 320,
  damping: 26,
  mass: 0.8
};

const fps60ModalSpring = {
  type: 'spring',
  stiffness: 300,
  damping: 24,
  mass: 0.85
};

export default function TableMenuPage() {
  const params = useParams();
  const tableId = params.id as string;

  const [lang, setLang] = useState<Language>('en');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);

  const [formattedDate, setFormattedDate] = useState<string>('');
  const [formattedTime, setFormattedTime] = useState<string>('');

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

  // Session Past Ordered Items for Total Bill Modal
  const [sessionOrderedItems, setSessionOrderedItems] = useState<any[]>([]);
  const [isTotalBillModalOpen, setIsTotalBillModalOpen] = useState(false);

  // Mystery PIN Game Modal States
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinFeedback, setPinFeedback] = useState<{ msg: string; success: boolean } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setFormattedDate(now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }));
      setFormattedTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessionItems = async (sessionId: string) => {
    try {
      const { data } = await supabase
        .from('order_items')
        .select('*, menu_items(name_en, price)')
        .eq('session_id', sessionId)
        .neq('item_status', 'cancelled');
      if (data) {
        setSessionOrderedItems(data);
      }
    } catch (err) {
      console.error('Session items error:', err);
    }
  };

  const syncSessionData = async () => {
    const { data: session } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('table_number', parseInt(tableId))
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
      resetSessionLocally();
    }
  };

  const resetSessionLocally = () => {
    setActiveSessionId(null);
    setActiveSessionTotal(0);
    setDiscountAmount(0);
    setPinGameWon(false);
    setPinAttempts(0);
    setCustomerName('');
    setCustomerPhone('');
    setSessionOrderedItems([]);
  };

  const fetchMenuData = async () => {
    const { data: cats } = await supabase.from('categories').select('*').order('sort_order');
    if (cats && cats.length > 0) {
      setCategories(cats);
      setSelectedCategory((prev) => prev || cats[0].id);
    }
    const { data: items } = await supabase.from('menu_items').select('*').eq('is_available', true);
    if (items) {
      setMenuItems(items);
    }
    const { data: cmbs } = await supabase.from('combos').select('*').eq('is_available', true);
    if (cmbs) {
      setCombos(cmbs);
    }
    const { data: promo } = await supabase.from('promo_banners').select('*').eq('is_active', true);
    if (promo) setBanners(promo);
  };

  useEffect(() => {
    syncSessionData();
    fetchMenuData();

    const channel = supabase
      .channel(`table-${tableId}-session-sync-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', filter: `table_number=eq.${parseInt(tableId)}` }, () => syncSessionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter: `table_number=eq.${parseInt(tableId)}` }, () => syncSessionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchMenuData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combos' }, () => fetchMenuData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        if (activeSessionId) fetchSessionItems(activeSessionId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId, activeSessionId]);

  const addToCart = (item: any, isCombo = false) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === item.id && ci.isCombo === isCombo);
      if (existing) {
        return prev.map((ci) => (ci.menuItem.id === item.id && ci.isCombo === isCombo) ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { menuItem: item, quantity: 1, isCombo }];
    });
  };

  const removeFromCart = (itemId: number, isCombo = false) => {
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

  const handlePlaceOrder = async () => {
    if (!activeSessionId && (customerName.trim().length < 2 || customerPhone.length !== 10)) {
      alert('Dayachesi peru mariyu 10-ankela mobile number enter cheyandi.');
      return;
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
            table_number: parseInt(tableId),
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

        await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('table_number', parseInt(tableId));
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
          table_number: parseInt(tableId), 
          discount: discountAmount || 0,
          status: 'pending_waiter' 
        })
        .select()
        .single();

      if (bErr) throw bErr;

      const orderItemsPayload = cart.map((ci) => ({
        batch_id: batch.id,
        session_id: sessionId,
        menu_item_id: ci.menuItem.id,
        station_id: 'kitchen_hot',
        quantity: ci.quantity,
        unit_price: ci.menuItem.price,
        item_status: 'ordered',
      }));

      await supabase.from('order_items').insert(orderItemsPayload);

      setCart([]);
      setIsCartOpen(false);
      setOrderPlaced(true);
      fetchSessionItems(sessionId);
    } catch (err: any) {
      alert('Order error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCrackPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.length !== 4) {
      setPinFeedback({ msg: 'Please enter a 4-digit PIN.', success: false });
      return;
    }

    if (pinAttempts >= 3) {
      setPinFeedback({ msg: 'All 3 attempts used! Pay regular bill at counter.', success: false });
      return;
    }

    setPinLoading(true);
    setPinFeedback(null);

    try {
      const nextAttemptCount = pinAttempts + 1;

      const { data: matchedSlot } = await supabase
        .from('daily_pin_vault')
        .select('*')
        .eq('secret_pin', enteredPin.trim())
        .eq('is_cracked', false)
        .maybeSingle();

      if (matchedSlot) {
        const winDiscount = Number(matchedSlot.discount_amount) || 25;
        const currentTotal = liveSessionBaseTotal + cartGrandTotal;
        const updatedFinal = Math.max(0, currentTotal - winDiscount);

        await supabase.from('daily_pin_vault').update({
          is_cracked: true,
          cracked_session_id: activeSessionId || null,
          cracked_table_number: parseInt(tableId),
          cracked_by_name: customerName || 'Guest',
          cracked_at: new Date().toISOString()
        }).eq('slot_number', matchedSlot.slot_number);

        if (activeSessionId) {
          await supabase.from('table_sessions').update({
            pin_attempts: nextAttemptCount,
            pin_game_won: true,
            discount_amount: winDiscount,
            final_payable: updatedFinal
          }).eq('id', activeSessionId);
        }

        setDiscountAmount(winDiscount);
        setPinGameWon(true);
        setPinAttempts(nextAttemptCount);
        setPinFeedback({ msg: `🎉 BINGO! Mystery PIN Cracked! You won ₹${winDiscount} Cash Discount!`, success: true });
        setTimeout(() => setIsPinModalOpen(false), 2200);
      } else {
        if (activeSessionId) {
          await supabase.from('table_sessions').update({
            pin_attempts: nextAttemptCount
          }).eq('id', activeSessionId);
        }

        setPinAttempts(nextAttemptCount);
        const remaining = 3 - nextAttemptCount;
        setPinFeedback({
          msg: remaining > 0 
            ? `❌ Incorrect PIN. ${remaining} chance(s) left!`
            : `❌ Wrong PIN. All 3 chances used!`,
          success: false
        });
      }
      setEnteredPin('');
    } catch (err: any) {
      setPinFeedback({ msg: 'Verification failed: ' + err.message, success: false });
    } finally {
      setPinLoading(false);
    }
  };

  const filteredMenuItems = menuItems.filter((item) => {
    if (selectedCategory === 'combos') return false;
    if (item.category_id !== selectedCategory) return false;
    if (foodFilter === 'all') return true;
    if (foodFilter === 'veg') return item.food_type === 'veg';
    if (foodFilter === 'non_veg') return item.food_type === 'non_veg';
    return true;
  });

  const renderShakingCuriosityBanner = () => {
    if (pinGameWon) {
      return (
        <div className="p-3.5 rounded-2xl bg-black border-[3px] border-emerald-500 flex items-center justify-between text-xs font-mono text-emerald-300 shadow-md">
          <span className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ₹{discountAmount} Instant Cash Discount Applied!
          </span>
          <span className="text-[10px] uppercase font-black bg-emerald-500/25 px-2.5 py-0.5 rounded-md border border-emerald-400">
            UNLOCKED
          </span>
        </div>
      );
    }

    if (pinAttempts >= 3) {
      return null;
    }

    return (
      <motion.div
        animate={{
          x: [0, -2, 2, -1, 1, 0],
          rotate: [0, -0.6, 0.6, -0.4, 0.4, 0]
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'easeInOut'
        }}
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsPinModalOpen(true)}
        className="relative overflow-hidden p-4 rounded-3xl cursor-pointer border-[3px] border-[#D4AF37] bg-black shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all"
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black border-[3px] border-[#D4AF37] flex items-center justify-center text-[#FCF6BA] shadow-[0_0_15px_rgba(212,175,55,0.4)]">
              <Gift className="w-6 h-6 animate-bounce text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase font-mono tracking-widest bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black px-2 py-0.5 rounded-full">
                  INSTANT DISCOUNT
                </span>
                <span className="text-[10px] text-[#FCF6BA] font-mono font-bold">
                  {3 - pinAttempts} Left
                </span>
              </div>
              <h4 className="text-sm font-black text-white tracking-wide mt-1">
                Crack 4-Digit Mystery PIN!
              </h4>
              <p className="text-[11px] text-[#F3E5AB]/80 font-mono">
                Tap to unlock secret instant cashback on your bill!
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black text-xs uppercase tracking-wider shadow-md">
              PLAY ➔
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-[#FCF6BA] pb-36 font-sans selection:bg-[#D4AF37] selection:text-black antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b-[3px] border-[#D4AF37] px-4 py-3 shadow-[0_10px_35px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-black uppercase bg-[#D4AF37] px-2.5 py-0.5 rounded-full">
                FINE DINE
              </span>
              <h1 className="text-base font-extrabold text-white">
                Table <span className="text-[#FCF6BA] font-black">#{tableId}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#D4AF37] mt-1 font-bold">
              <span>{formattedDate}</span> • <span>{formattedTime}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              transition={fps60Spring}
              onClick={() => setIsTotalBillModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black border-[3px] border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)] cursor-pointer text-left"
              title="Click to view ordered items and total bill breakdown"
            >
              <Receipt className="w-3.5 h-3.5 text-[#D4AF37]" />
              <div>
                <span className="text-[8px] block uppercase font-mono text-[#D4AF37] font-bold">Total Bill</span>
                <span className="text-xs font-mono font-black text-[#FCF6BA]">
                  ₹{Math.max(0, liveSessionBaseTotal - discountAmount).toFixed(2)}
                </span>
              </div>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        
        {/* BORDERLESS SMOOTH-SHIFT CATEGORY SELECTION CAROUSEL */}
        <div className="p-3.5 rounded-3xl bg-black border-[3px] border-[#D4AF37] shadow-xl space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#D4AF37]" /> Menu Categories ({categories.length + (combos.length > 0 ? 1 : 0)})
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('table-category-scroll');
                  if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
                }}
                className="p-1 rounded-lg text-[#D4AF37] hover:text-[#FCF6BA] hover:bg-[#D4AF37]/15 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('table-category-scroll');
                  if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
                }}
                className="p-1 rounded-lg text-[#D4AF37] hover:text-[#FCF6BA] hover:bg-[#D4AF37]/15 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Borderless Smooth Active Pill Sliding Container */}
          <div 
            id="table-category-scroll"
            className="flex gap-1.5 overflow-x-auto custom-gold-scrollbar pb-2 pt-1 scroll-smooth select-none items-center"
          >
            {/* Combos Special Chip - Borderless */}
            {combos.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={fps60Spring}
                onClick={() => setSelectedCategory('combos')}
                className={`relative px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                  selectedCategory === 'combos' ? 'text-black' : 'text-[#FCF6BA]/75 hover:text-[#FCF6BA]'
                }`}
              >
                {selectedCategory === 'combos' && (
                  <motion.div
                    layoutId="activeCategoryPill"
                    className="absolute inset-0 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] rounded-2xl shadow-[0_2px_15px_rgba(212,175,55,0.4)]"
                    transition={fps60Spring}
                  />
                )}
                <Sparkles className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Royal Combos ({combos.length})</span>
              </motion.button>
            )}

            {/* Category Chips - Borderless with Glide Animation */}
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={fps60Spring}
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`relative px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                    isSelected ? 'text-black font-black' : 'text-[#FCF6BA]/75 hover:text-[#FCF6BA]'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeCategoryPill"
                      className="absolute inset-0 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] rounded-2xl shadow-[0_2px_15px_rgba(212,175,55,0.4)]"
                      transition={fps60Spring}
                    />
                  )}
                  <span className="relative z-10">{cat.name_en || cat.name}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* COMBOS SPECIAL VIEW */}
        {selectedCategory === 'combos' && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={fps60Spring}
            className="space-y-3"
          >
            <h3 className="font-black text-sm uppercase font-mono tracking-wider text-[#FCF6BA] flex items-center gap-1.5">
              <PackagePlus className="w-4 h-4 text-[#D4AF37]" /> Special Combo Deals
            </h3>
            {combos.map((combo) => {
              const inCart = cart.find((ci) => ci.menuItem.id === combo.id && ci.isCombo);
              return (
                <motion.div
                  key={'combo-' + combo.id}
                  whileHover={{ y: -2 }}
                  transition={fps60Spring}
                  className="p-4 rounded-3xl bg-black border-[3px] border-[#D4AF37] shadow-[0_8px_25px_rgba(0,0,0,0.8)] space-y-3"
                >
                  {combo.image_url && (
                    <div className="h-36 rounded-2xl overflow-hidden border border-[#D4AF37]/40 relative bg-neutral-900">
                      <img src={combo.image_url} alt={combo.name} className="w-full h-full object-cover" />
                      <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#D4AF37] text-black">
                        COMBO DEAL
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${combo.food_type === 'non_veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <h4 className="font-bold text-white text-sm">{combo.name || combo.name_en}</h4>
                      </div>
                      {combo.description && (
                        <p className="text-[11px] text-neutral-400 font-mono mt-0.5 line-clamp-2">
                          {combo.description || combo.description_en}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-sm font-black text-[#D4AF37]">
                          ₹{Number(combo.price).toFixed(2)}
                        </span>
                        {combo.original_price && Number(combo.original_price) > Number(combo.price) && (
                          <span className="font-mono text-xs text-neutral-500 line-through">
                            ₹{Number(combo.original_price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {inCart ? (
                        <div className="flex items-center bg-black border-[3px] border-[#D4AF37] rounded-xl px-2 py-1 shadow-inner">
                          <button onClick={() => removeFromCart(combo.id, true)} className="p-1 text-[#FCF6BA]">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono font-bold text-xs text-white px-2">{inCart.quantity}</span>
                          <button onClick={() => addToCart(combo, true)} className="p-1 text-[#FCF6BA]">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.93 }}
                          transition={fps60Spring}
                          onClick={() => addToCart(combo, true)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black text-xs font-black uppercase shadow-md cursor-pointer"
                        >
                          + Add Combo
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Regular Menu Items Cards */}
        {selectedCategory !== 'combos' && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={fps60Spring}
            className="space-y-3"
          >
            {filteredMenuItems.map((item) => {
              const inCart = cart.find((ci) => ci.menuItem.id === item.id && !ci.isCombo);
              return (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -2 }}
                  transition={fps60Spring}
                  className="p-4 rounded-3xl bg-black border-[3px] border-[#D4AF37] flex items-center justify-between gap-3 shadow-[0_8px_25px_rgba(0,0,0,0.8)]"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {item.image_url ? (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#D4AF37]/50 shrink-0 bg-neutral-900">
                        <img src={item.image_url} alt={item.name_en} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl border border-[#D4AF37]/30 shrink-0 bg-neutral-950 flex items-center justify-center text-neutral-600">
                        <ImgIcon className="w-6 h-6" />
                      </div>
                    )}

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.food_type === 'non_veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <h4 className="font-bold text-white text-sm truncate">{item.name_en || item.name}</h4>
                      </div>
                      {item.description_en && (
                        <p className="text-[11px] text-neutral-400 font-mono truncate max-w-[180px]">
                          {item.description_en || item.description}
                        </p>
                      )}
                      <span className="font-mono text-xs font-bold text-[#D4AF37] mt-1 block">
                        ₹{Number(item.price).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {inCart ? (
                      <div className="flex items-center bg-black border-[3px] border-[#D4AF37] rounded-xl px-2 py-1 shadow-inner">
                        <button onClick={() => removeFromCart(item.id, false)} className="p-1 text-[#FCF6BA]">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold text-xs text-white px-2">{inCart.quantity}</span>
                        <button onClick={() => addToCart(item, false)} className="p-1 text-[#FCF6BA]">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        transition={fps60Spring}
                        onClick={() => addToCart(item, false)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black text-xs font-black uppercase shadow-md cursor-pointer"
                      >
                        + Add
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Floating Cart Trigger Button */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-5 inset-x-4 max-w-lg mx-auto z-40">
          <motion.button
            whileTap={{ scale: 0.96 }}
            transition={fps60Spring}
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-black text-white p-4 rounded-3xl border-[3px] border-[#D4AF37] shadow-[0_15px_45px_rgba(0,0,0,1)] flex items-center justify-between font-bold"
          >
            <div className="flex items-center gap-3">
              <span className="bg-[#D4AF37] text-black px-2.5 py-1 rounded-xl text-xs font-black shadow-md">
                {cartItemCount}
              </span>
              <span className="text-sm font-semibold">View Order Basket</span>
            </div>
            <span className="text-[#FCF6BA] font-mono font-black text-base">₹{cartGrandTotal.toFixed(2)} ➔</span>
          </motion.button>
        </div>
      )}

      {/* Cart Drawer / Basket */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/85 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={fps60ModalSpring}
              className="relative w-full max-w-lg mx-auto bg-black border-t-[3px] border-x-[3px] border-[#D4AF37] rounded-t-[36px] p-6 pb-8 space-y-4 z-10 max-h-[85vh] overflow-y-auto custom-gold-scrollbar shadow-[0_-15px_50px_rgba(0,0,0,1)]"
            >
              <div className="flex items-center justify-between border-b-2 border-[#D4AF37]/30 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base">Your Order Basket</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-[#D4AF37] hover:text-[#FCF6BA]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2 divide-y divide-white/10">
                {cart.map((ci) => (
                  <div key={(ci.isCombo ? 'combo-' : 'item-') + ci.menuItem.id} className="pt-2 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {ci.isCombo && (
                          <span className="text-[9px] bg-[#D4AF37] text-black px-1.5 py-0.2 rounded font-black">
                            COMBO
                          </span>
                        )}
                        <span>{ci.menuItem.name || ci.menuItem.name_en}</span>
                      </div>
                      <span className="font-mono text-[#D4AF37]/80">₹{ci.menuItem.price} each</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#FCF6BA]">₹{(ci.menuItem.price * ci.quantity).toFixed(2)}</span>
                      <div className="flex items-center bg-black border-[3px] border-[#D4AF37] rounded-xl p-0.5">
                        <button onClick={() => removeFromCart(ci.menuItem.id, ci.isCombo)} className="p-1 text-[#D4AF37]">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold text-white">{ci.quantity}</span>
                        <button onClick={() => addToCart(ci.menuItem, ci.isCombo)} className="p-1 text-[#D4AF37]">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {renderShakingCuriosityBanner()}

              {!activeSessionId && (
                <div className="space-y-2 pt-2 border-t-2 border-[#D4AF37]/20 text-xs">
                  <span className="font-bold text-[#FCF6BA] block">Guest Details (First Time Only)</span>
                  <input
                    type="text"
                    required
                    placeholder="Your Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-black border-[3px] border-[#D4AF37]/60 rounded-xl px-3.5 py-2.5 text-[#FCF6BA] outline-none focus:border-[#FCF6BA]"
                  />
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="10-digit Mobile Number *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black border-[3px] border-[#D4AF37]/60 rounded-xl px-3.5 py-2.5 text-[#FCF6BA] outline-none focus:border-[#FCF6BA] font-mono"
                  />
                </div>
              )}

              {/* Bill Breakdown */}
              <div className="p-4 rounded-2xl bg-black border-[3px] border-[#D4AF37]/50 space-y-1.5 text-xs font-mono">
                {liveSessionBaseTotal > 0 && (
                  <div className="flex justify-between text-[#D4AF37]">
                    <span>Previous Items Total:</span>
                    <span>₹{liveSessionBaseTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#D4AF37]">
                  <span>Current Cart Total:</span>
                  <span>₹{cartGrandTotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Mystery PIN Discount:</span>
                    <span>- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-black text-sm pt-2 border-t-2 border-dashed border-[#D4AF37]/35">
                  <span>Pay at Counter Total:</span>
                  <span className="text-[#FCF6BA]">₹{finalPayable.toFixed(2)}</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                transition={fps60Spring}
                disabled={loading}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase text-xs shadow-[0_0_25px_rgba(212,175,55,0.4)] cursor-pointer"
              >
                {loading ? 'Submitting to Kitchen...' : 'Confirm Order & Send to Kitchen'}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL: Detailed Total Bill */}
      <AnimatePresence>
        {isTotalBillModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={fps60ModalSpring}
              className="w-full max-w-sm bg-black border-[3px] border-[#D4AF37] rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,1)] relative space-y-4 max-h-[90vh] overflow-y-auto custom-gold-scrollbar"
            >
              <div className="flex items-center justify-between border-b-2 border-[#D4AF37]/30 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-[#FCF6BA] text-base uppercase font-mono tracking-wider">Table Bill Ledger</h3>
                </div>
                <button onClick={() => setIsTotalBillModalOpen(false)} className="text-[#D4AF37] hover:text-[#FCF6BA]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-black p-3 rounded-2xl border-[3px] border-[#D4AF37]/40 space-y-1 text-xs font-mono">
                <div className="flex justify-between items-center text-white">
                  <span className="font-bold flex items-center gap-1.5 text-sm text-[#FCF6BA]">
                    <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {customerName.trim() ? customerName : 'Guest Diner'}
                  </span>
                  <span className="text-[10px] bg-black text-[#FCF6BA] border-2 border-[#D4AF37] px-2 py-0.5 rounded-md font-bold">
                    Table #{tableId}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-[#D4AF37] font-bold pt-1 border-t border-[#D4AF37]/25">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {customerPhone.trim() ? customerPhone : 'No Mobile Added'}
                  </span>
                  <span>{formattedTime}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] font-mono block">
                  Ordered Dishes
                </span>

                <div className="space-y-2 max-h-44 overflow-y-auto custom-gold-scrollbar p-3 rounded-2xl bg-black border-2 border-[#D4AF37]/30 text-xs font-mono divide-y divide-white/5">
                  {sessionOrderedItems.length === 0 ? (
                    <div className="text-center py-6 text-neutral-500 flex flex-col items-center justify-center space-y-1">
                      <Utensils className="w-5 h-5 text-neutral-600 mb-1" />
                      <span>No confirmed kitchen orders yet.</span>
                      <span className="text-[10px] text-neutral-600">Dishes will display here once sent to kitchen.</span>
                    </div>
                  ) : (
                    sessionOrderedItems.map((item, idx) => {
                      const dishPrice = Number(item.unit_price || item.menu_items?.price || 0);
                      const totalItemPrice = item.quantity * dishPrice;

                      return (
                        <div key={idx} className="flex justify-between items-center pt-2 first:pt-0">
                          <div>
                            <span className="font-bold text-white block">
                              {item.menu_items?.name_en || 'Dish #' + item.menu_item_id}
                            </span>
                            <span className="text-[10px] text-[#D4AF37]">
                              {item.quantity} x ₹{dishPrice.toFixed(2)}
                            </span>
                          </div>
                          <span className="font-black text-[#FCF6BA]">
                            ₹{totalItemPrice.toFixed(2)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {renderShakingCuriosityBanner()}

              <div className="space-y-1.5 text-xs font-mono p-3 rounded-2xl bg-black border-2 border-[#D4AF37]/35">
                <div className="flex justify-between text-[#D4AF37]">
                  <span>Gross Orders Total:</span>
                  <span className="font-bold text-white">₹{liveSessionBaseTotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Mystery PIN Discount:</span>
                    <span>- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-white font-black text-sm pt-2 border-t-2 border-dashed border-[#D4AF37]/35">
                  <span>Current Bill Payable:</span>
                  <span className="text-base text-[#FCF6BA]">
                    ₹{Math.max(0, liveSessionBaseTotal - discountAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsTotalBillModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-black border-[3px] border-[#D4AF37] hover:bg-[#D4AF37]/20 text-[#FCF6BA] font-bold text-xs uppercase cursor-pointer"
              >
                Close Bill View
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mystery PIN Guess Modal */}
      <AnimatePresence>
        {isPinModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={fps60Spring}
              className="w-full max-w-sm bg-black border-[3px] border-[#D4AF37] rounded-3xl p-6 shadow-[0_0_50px_rgba(212,175,55,0.4)] relative space-y-4"
            >
              <button 
                onClick={() => setIsPinModalOpen(false)} 
                className="absolute top-4 right-4 text-[#D4AF37] hover:text-[#FCF6BA] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1">
                <div className="w-14 h-14 rounded-2xl bg-black border-[3px] border-[#D4AF37] flex items-center justify-center text-[#FCF6BA] mx-auto shadow-[0_0_20px_rgba(212,175,55,0.5)]">
                  <KeyRound className="w-7 h-7 text-[#D4AF37] animate-pulse" />
                </div>
                <h3 className="font-black text-white text-base tracking-wide uppercase pt-1">
                  Crack Today's Mystery PIN
                </h3>
                <p className="text-xs text-[#F3E5AB]/80 font-mono">
                  Guess today's 4-digit code to slash instant cash discount from your bill!
                </p>
                <div className="text-[11px] font-mono text-[#D4AF37] font-bold pt-1">
                  Chances Remaining: {3 - pinAttempts} / 3
                </div>
              </div>

              {pinFeedback && (
                <div className={`p-3 rounded-xl text-xs font-mono border-2 ${
                  pinFeedback.success 
                    ? 'bg-black border-emerald-400 text-emerald-200' 
                    : 'bg-black border-rose-500 text-rose-200'
                }`}>
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
                    className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-4 py-3 text-center text-[#FCF6BA] font-mono font-black text-2xl tracking-[0.35em] outline-none focus:border-[#FCF6BA] shadow-inner"
                  />

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    disabled={pinLoading || enteredPin.length !== 4}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase text-xs shadow-[0_0_25px_rgba(212,175,55,0.6)] disabled:opacity-50 cursor-pointer"
                  >
                    {pinLoading ? 'Verifying PIN...' : 'Slash My Bill Discount'}
                  </motion.button>
                </form>
              ) : (
                <button
                  onClick={() => setIsPinModalOpen(false)}
                  className="w-full py-3 rounded-2xl bg-black border-[3px] border-[#D4AF37] hover:bg-[#D4AF37]/20 text-[#FCF6BA] font-bold text-xs uppercase cursor-pointer"
                >
                  Close & Proceed to Order
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}