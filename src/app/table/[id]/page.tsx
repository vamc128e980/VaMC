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
  ShoppingBag, 
  X, 
  Receipt, 
  KeyRound, 
  Gift, 
  Flame,
  ArrowRight
} from 'lucide-react';

export default function TableMenuPage() {
  const params = useParams();
  const tableId = params.id as string;

  const [lang, setLang] = useState<Language>('en');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [upsellItems, setUpsellItems] = useState<MenuItem[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);

  const [formattedDate, setFormattedDate] = useState<string>('');
  const [formattedTime, setFormattedTime] = useState<string>('');
  const [[currentBannerIndex, direction], setBannerState] = useState([0, 0]);

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
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

  // Mystery PIN Game Modal States
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinFeedback, setPinFeedback] = useState<{ msg: string; success: boolean } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = UI_TEXT[lang];

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

  // 1. Synchronize Table Session & Discount Ledger
  const syncSessionData = async () => {
    const { data: tbl } = await supabase
      .from('restaurant_tables')
      .select('status')
      .eq('table_number', parseInt(tableId))
      .maybeSingle();

    if (tbl && tbl.status === 'available') {
      resetSessionLocally();
      return;
    }

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
      setCustomerName(session.customer_name || 'Guest');
      setCustomerPhone(session.customer_phone || '');
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
    setCart([]);
    setOrderPlaced(false);
  };

  const fetchMenuData = async () => {
    const { data: cats } = await supabase.from('categories').select('*').order('sort_order');
    if (cats && cats.length > 0) {
      setCategories(cats);
      setSelectedCategory((prev) => prev || cats[0].id);
    }
    const { data: items } = await supabase.from('menu_items').select('*');
    if (items) {
      setMenuItems(items.filter((i) => !i.is_upsell));
      setUpsellItems(items.filter((i) => i.is_upsell && i.is_available));
    }
    const { data: promo } = await supabase.from('promo_banners').select('*').eq('is_active', true);
    if (promo) setBanners(promo);
  };

  useEffect(() => {
    syncSessionData();
    fetchMenuData();

    const channel = supabase
      .channel(`table-${tableId}-session-realtime`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', filter: `table_number=eq.${parseInt(tableId)}` }, () => syncSessionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter: `table_number=eq.${parseInt(tableId)}` }, () => syncSessionData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === item.id);
      if (existing) {
        return prev.map((ci) => ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((ci) => ci.menuItem.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci);
      }
      return prev.filter((ci) => ci.menuItem.id !== itemId);
    });
  };

  const cartGrandTotal = cart.reduce((sum, ci) => sum + ci.menuItem.price * ci.quantity, 0);
  const cartItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const finalPayable = Math.max(0, (activeSessionTotal + cartGrandTotal) - discountAmount);

  // 2. Seamless Order Placement Engine
  const handlePlaceOrder = async () => {
    if (!activeSessionId && (customerName.trim().length < 2 || customerPhone.length !== 10)) {
      alert('Dayachesi peru mariyu 10-ankela mobile number enter cheyandi.');
      return;
    }

    setLoading(true);
    try {
      let sessionId = activeSessionId;
      let newTotal = activeSessionTotal + cartGrandTotal;

      if (!sessionId) {
        // First Time Order
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

        await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('table_number', parseInt(tableId));
      } else {
        // Re-order: Seamlessly Add to Existing Running Bill
        const subtotal = Math.round((newTotal / 1.05) * 100) / 100;
        const totalTax = Math.round((newTotal - subtotal) * 100) / 100;
        const cgst = Math.round((totalTax / 2) * 100) / 100;
        const sgst = Math.round((totalTax - cgst) * 100) / 100;

        await supabase.from('table_sessions').update({
          subtotal,
          cgst_amount: cgst,
          sgst_amount: sgst,
          total_amount: newTotal,
          final_payable: Math.max(0, newTotal - discountAmount)
        }).eq('id', sessionId);

        setActiveSessionTotal(newTotal);
      }

      // Order Batch
      const { data: batch, error: bErr } = await supabase
        .from('order_batches')
        .insert({ session_id: sessionId, table_number: parseInt(tableId), status: 'pending_waiter' })
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
    } catch (err: any) {
      alert('Order error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Mystery PIN Check (3 Chances Pool Validation)
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

      // Check if matches an UNCRACKED vault slot
      const { data: matchedSlot } = await supabase
        .from('daily_pin_vault')
        .select('*')
        .eq('secret_pin', enteredPin.trim())
        .eq('is_cracked', false)
        .maybeSingle();

      if (matchedSlot) {
        // WINNER!
        const winDiscount = Number(matchedSlot.discount_amount) || 25;
        const updatedFinal = Math.max(0, activeSessionTotal - winDiscount);

        // Mark Slot as Cracked
        await supabase.from('daily_pin_vault').update({
          is_cracked: true,
          cracked_session_id: activeSessionId,
          cracked_table_number: parseInt(tableId),
          cracked_by_name: customerName,
          cracked_at: new Date().toISOString()
        }).eq('slot_number', matchedSlot.slot_number);

        // Update Session
        await supabase.from('table_sessions').update({
          pin_attempts: nextAttemptCount,
          pin_game_won: true,
          discount_amount: winDiscount,
          final_payable: updatedFinal
        }).eq('id', activeSessionId);

        setDiscountAmount(winDiscount);
        setPinGameWon(true);
        setPinAttempts(nextAttemptCount);
        setPinFeedback({ msg: `🎉 BINGO! PIN Cracked! You won ₹${winDiscount} Discount!`, success: true });
        setTimeout(() => setIsPinModalOpen(false), 2500);
      } else {
        // WRONG PIN
        await supabase.from('table_sessions').update({
          pin_attempts: nextAttemptCount
        }).eq('id', activeSessionId);

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
    if (item.category_id !== selectedCategory) return false;
    if (foodFilter === 'all') return true;
    if (foodFilter === 'veg') return item.food_type === 'veg';
    if (foodFilter === 'non_veg') return item.food_type === 'non_veg';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#050507] text-neutral-100 pb-36 font-sans selection:bg-[#D4AF37] selection:text-black">
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_70%)] blur-3xl pointer-events-none -z-10" />

      {/* Header with Live Bill Badge */}
      <header className="sticky top-0 z-40 bg-[#08080c]/80 backdrop-blur-3xl border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-[#F3E5AB] uppercase bg-[#D4AF37]/20 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40">
                FINE DINE
              </span>
              <h1 className="text-base font-extrabold text-neutral-100">
                Table <span className="text-[#F3E5AB] font-black">#{tableId}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400 mt-1">
              <span>{formattedDate}</span> • <span>{formattedTime}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSessionTotal > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40">
                <Receipt className="w-3.5 h-3.5 text-[#D4AF37]" />
                <div className="text-right">
                  <span className="text-[9px] block uppercase font-mono text-neutral-400">Total Bill</span>
                  <span className="text-xs font-mono font-black text-[#F3E5AB]">
                    ₹{(activeSessionTotal - discountAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Mystery PIN Game Banner (Active Seated Order & Not Won & Attempts < 3) */}
        {activeSessionId && !pinGameWon && pinAttempts < 3 && (
          <motion.div
            whileHover={{ scale: 1.01 }}
            onClick={() => setIsPinModalOpen(true)}
            className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#D4AF37]/20 to-black border border-[#D4AF37]/60 shadow-[0_0_25px_rgba(212,175,55,0.2)] cursor-pointer flex items-center justify-between relative overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                <Gift className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-xs font-black text-[#F3E5AB] block">
                  Crack Today's PIN & Win Cash Discount!
                </span>
                <span className="text-[11px] font-mono text-neutral-300">
                  {3 - pinAttempts} attempt(s) remaining for your table
                </span>
              </div>
            </div>
            <span className="text-xs font-black text-[#D4AF37] underline">Play ➔</span>
          </motion.div>
        )}

        {/* Won Banner (Permanent until Session Clear) */}
        {pinGameWon && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs font-mono text-emerald-300">
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ₹{discountAmount} Discount Applied to Bill!
            </span>
            <span className="text-[10px] uppercase font-black bg-emerald-500/20 px-2 py-0.5 rounded-md">
              Unlocked
            </span>
          </div>
        )}

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat.id ? 'bg-[#D4AF37] text-black font-black' : 'text-neutral-400 bg-white/[0.04]'
              }`}
            >
              {getLocalizedName(cat, lang)}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {filteredMenuItems.map((item) => {
            const inCart = cart.find((ci) => ci.menuItem.id === item.id);
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="font-bold text-white text-sm">{getLocalizedName(item, lang)}</h4>
                  <span className="font-mono text-xs font-bold text-[#F3E5AB]">₹{item.price.toFixed(2)}</span>
                </div>

                <div>
                  {inCart ? (
                    <div className="flex items-center bg-black/60 border border-[#D4AF37]/50 rounded-xl px-2 py-1">
                      <button onClick={() => removeFromCart(item.id)} className="p-1 text-[#F3E5AB]">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono font-bold text-xs text-white px-2">{inCart.quantity}</span>
                      <button onClick={() => addToCart(item)} className="p-1 text-[#F3E5AB]">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black text-xs font-black uppercase"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Cart Trigger */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-5 inset-x-4 max-w-lg mx-auto z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#08080c]/95 backdrop-blur-3xl text-white p-4 rounded-3xl border border-[#D4AF37]/50 shadow-2xl flex items-center justify-between font-bold"
          >
            <div className="flex items-center gap-3">
              <span className="bg-[#D4AF37] text-black px-2.5 py-1 rounded-xl text-xs font-black">
                {cartItemCount}
              </span>
              <span className="text-sm font-semibold">View Order Basket</span>
            </div>
            <span className="text-[#F3E5AB] font-mono font-black text-base">₹{cartGrandTotal.toFixed(2)} ➔</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <div className="relative w-full max-w-lg mx-auto bg-[#0a0a0f] border-t border-white/10 rounded-t-[32px] p-5 pb-8 space-y-4 z-10 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-base">Your Order Basket</h3>
                <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items */}
              <div className="space-y-2 divide-y divide-white/5">
                {cart.map((ci) => (
                  <div key={ci.menuItem.id} className="pt-2 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white">{getLocalizedName(ci.menuItem, lang)}</div>
                      <span className="font-mono text-neutral-400">₹{ci.menuItem.price} each</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#F3E5AB]">₹{(ci.menuItem.price * ci.quantity).toFixed(2)}</span>
                      <div className="flex items-center bg-black/60 border border-white/10 rounded-lg p-0.5">
                        <button onClick={() => removeFromCart(ci.menuItem.id)} className="p-1 text-neutral-400">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold">{ci.quantity}</span>
                        <button onClick={() => addToCart(ci.menuItem)} className="p-1 text-neutral-400">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* First Order Form Only (Bypassed completely on re-orders) */}
              {!activeSessionId && (
                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <span className="font-bold text-neutral-300 block">Guest Details (First Time Only)</span>
                  <input
                    type="text"
                    required
                    placeholder="Your Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                  />
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="10-digit Mobile Number *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#D4AF37] font-mono"
                  />
                </div>
              )}

              {/* Bill Breakdown */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5 text-xs font-mono">
                {activeSessionTotal > 0 && (
                  <div className="flex justify-between text-neutral-400">
                    <span>Previous Items:</span>
                    <span>₹{activeSessionTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-400">
                  <span>Current Cart Total:</span>
                  <span>₹{cartGrandTotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Mystery PIN Discount:</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-dashed border-white/10">
                  <span>Pay at Counter Total:</span>
                  <span className="text-[#F3E5AB]">₹{finalPayable.toFixed(2)}</span>
                </div>
              </div>

              <button
                disabled={loading}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase text-xs shadow-lg"
              >
                {loading ? 'Submitting...' : 'Confirm Order & Send to Kitchen'}
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Mystery PIN Guess Modal (3 Chances) */}
      <AnimatePresence>
        {isPinModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-sm bg-[#0c0c14] border border-[#D4AF37]/50 rounded-3xl p-6 shadow-2xl relative space-y-4"
            >
              <button onClick={() => setIsPinModalOpen(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] mx-auto">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="font-black text-white text-base">Crack the Mystery PIN</h3>
                <p className="text-xs text-neutral-400 font-mono">
                  Guess today's 4-digit code to win cash discount!
                </p>
                <div className="text-[11px] font-mono text-[#F3E5AB] font-bold pt-1">
                  Chances Remaining: {3 - pinAttempts} / 3
                </div>
              </div>

              {pinFeedback && (
                <div className={`p-3 rounded-xl text-xs font-mono border ${
                  pinFeedback.success 
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' 
                    : 'bg-rose-950/60 border-rose-500 text-rose-300'
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
                    placeholder="Enter 4-Digit PIN"
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-center text-white font-mono font-black text-xl tracking-[0.3em] outline-none focus:border-[#D4AF37]"
                  />

                  <button
                    type="submit"
                    disabled={pinLoading || enteredPin.length !== 4}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase text-xs shadow-lg disabled:opacity-50"
                  >
                    {pinLoading ? 'Verifying...' : 'Unlock Discount'}
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsPinModalOpen(false)}
                  className="w-full py-3 rounded-2xl bg-white/[0.08] text-white font-bold text-xs"
                >
                  Close & Continue Dining
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}