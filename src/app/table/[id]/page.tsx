// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
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
  Gift, 
  Sparkles, 
  Image as ImgIcon, 
  AlertTriangle,
  Users,
  Search,
  Split
} from 'lucide-react';

const smoothSpring = { type: 'spring', stiffness: 380, damping: 28, mass: 0.6 };
const tapSpring = { type: 'spring', stiffness: 450, damping: 24, mass: 0.5 };

const triggerHaptic = (ms = 12) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
};

export default function LuxuryCustomerTablePage() {
  const params = useParams();
  const rawTableParam = decodeURIComponent((params.id as string) || '');

  // Active Language State
  const [activeLang, setActiveLang] = useState<'en' | 'te' | 'hi'>('en');

  // Table Identity States
  const [realTableNumber, setRealTableNumber] = useState<number | null>(null);
  const [displayTableName, setDisplayTableName] = useState<string>('');
  const [tableResolved, setTableResolved] = useState<boolean>(false);
  const [tableNotFound, setTableNotFound] = useState<boolean>(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'combos' | null>(null);
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'non_veg'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Session & Billing States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionTotal, setActiveSessionTotal] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [pinGameWon, setPinGameWon] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);

  // Fair Share Splitter
  const [splitCount, setSplitCount] = useState<number>(2);

  // Ledger Modal
  const [sessionOrderedItems, setSessionOrderedItems] = useState<any[]>([]);
  const [isTotalBillModalOpen, setIsTotalBillModalOpen] = useState(false);

  // Mystery PIN Box in Ledger
  const [enteredPin, setEnteredPin] = useState('');
  const [pinFeedback, setPinFeedback] = useState<{ msg: string; success: boolean } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  // Seamless Google Translate Trigger (Hides white banner)
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

  // Resolve Dedicated Table Name / Number
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
        const customName = matched.table_name || `Table-${tNum}`;
        setRealTableNumber(tNum);
        setDisplayTableName(customName);
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
  };

  useEffect(() => {
    if (!tableResolved || !realTableNumber) return;
    syncSessionData();
    fetchMenuData();

    const channel = supabase
      .channel(`table-${realTableNumber}-realtime`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions', filter: `table_number=eq.${realTableNumber}` }, () => syncSessionData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        if (activeSessionId) fetchSessionItems(activeSessionId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [realTableNumber, tableResolved, activeSessionId]);

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
    if (!realTableNumber) return alert('Invalid table. Re-scan QR.');
    if (!activeSessionId && (customerName.trim().length < 2 || customerPhone.length !== 10)) {
      return alert('Please enter Name and 10-digit Phone.');
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

  // Crack PIN Game (Exact 3 Chances Per Active Order)
  const handleCrackPin = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic(20);
    if (enteredPin.length !== 4) return setPinFeedback({ msg: '4-digit PIN enter cheyandi.', success: false });
    if (pinAttempts >= 3) return setPinFeedback({ msg: 'Order limit exceeded. 3 chances finished.', success: false });

    setPinLoading(true);
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

      if (activeSessionId) {
        await supabase.from('table_sessions').update({ pin_attempts: nextAttempts }).eq('id', activeSessionId);
      }

      if (rpcRes?.success) {
        triggerHaptic(50);
        const wonDiscount = Number(rpcRes.discount);
        setDiscountAmount(wonDiscount);
        setPinGameWon(true);
        if (activeSessionId) {
          await supabase.from('table_sessions').update({ 
            pin_game_won: true, 
            discount_amount: wonDiscount,
            final_payable: Math.max(0, liveSessionBaseTotal - wonDiscount)
          }).eq('id', activeSessionId);
        }
        setPinFeedback({ msg: `🎉 CONGRATS! Won ₹${wonDiscount} Cash Discount on your Bill!`, success: true });
      } else {
        const rem = 3 - nextAttempts;
        setPinFeedback({ 
          msg: rem > 0 ? `❌ Wrong PIN. ${rem} attempt(s) remaining for this order!` : `❌ 3 chances finished! Better luck next dining order.`, 
          success: false 
        });
      }
      setEnteredPin('');
    } catch (err: any) {
      setPinFeedback({ msg: err.message, success: false });
    } finally {
      setPinLoading(false);
    }
  };

  const filteredMenuItems = menuItems.filter((item) => {
    const dishName = (item.name_en || item.name || '').toLowerCase();
    if (searchQuery.trim()) {
      return dishName.includes(searchQuery.toLowerCase());
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
    <div className="min-h-screen bg-[#050505] text-[#FCF6BA] pb-32 font-sans selection:bg-[#D4AF37] selection:text-black antialiased relative">
      
      {/* CSS Rule to hide Google Translate White Banner permanently */}
      <style jsx global>{`
        .goog-te-banner-frame.skiptranslate, 
        .goog-te-banner-frame,
        iframe.goog-te-banner-frame {
          display: none !important;
          visibility: hidden !important;
          height: 0px !important;
        }
        body {
          top: 0px !important;
          position: static !important;
        }
        #goog-gt-tt, .goog-te-balloon-frame {
          display: none !important;
        }
        .goog-text-highlight {
          background: none !important;
          box-shadow: none !important;
        }
      `}</style>

      {/* Hidden Google Translate Target */}
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

      {/* 1. TOP HEADER WITH DEDICATED LANGUAGE BUTTONS */}
      <header className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-2xl px-4 pt-3.5 pb-3 border-b border-white/[0.08] shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div>
            <span className="text-[9px] tracking-[0.2em] font-mono uppercase text-[#D4AF37] block font-bold">
              ROYAL SEATING
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
            {/* Automatic Google Translate Buttons (Banner-Free) */}
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

            {/* Table Ledger Button */}
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
                  ₹{Math.max(0, liveSessionBaseTotal - discountAmount).toFixed(2)}
                </span>
              </div>
            </motion.button>
          </div>
        </div>
      </header>

      {/* 2. MAIN BODY */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Search Bar */}
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

        {/* 3. CATEGORY SELECTOR */}
        <div className="space-y-2">
          <div className="p-1 rounded-[22px] bg-white/[0.03] border border-white/[0.08] flex gap-1.5 overflow-x-auto custom-gold-scrollbar select-none items-center scroll-smooth">
            {combos.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setSelectedCategory('combos');
                }}
                className={`relative px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition ${
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
                  onClick={() => {
                    triggerHaptic(15);
                    setSelectedCategory(cat.id);
                  }}
                  className={`relative px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition ${
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

          {/* Quick Veg/Non-Veg Filter */}
          {selectedCategory !== 'combos' && (
            <div className="flex gap-1.5 text-[10px] font-mono">
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

        {/* 4. DISHES GRID */}
        {selectedCategory === 'combos' ? (
          <div className="space-y-3.5">
            {combos.map((combo) => {
              const inCart = cart.find((ci) => ci.menuItem.id === combo.id && ci.isCombo);
              return (
                <div key={'cmb-' + combo.id} className="bg-white/[0.03] border border-white/[0.08] rounded-[24px] p-3 shadow-xl space-y-2.5">
                  {combo.image_url && (
                    <div className="h-36 w-full rounded-2xl overflow-hidden bg-neutral-950">
                      <img src={combo.image_url} alt={combo.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h4 className="text-sm font-black text-white">{combo.name_en || combo.name}</h4>
                      <span className="font-mono text-sm font-black text-[#D4AF37] block mt-0.5">₹{Number(combo.price).toFixed(2)}</span>
                    </div>

                    {inCart ? (
                      <div className="flex items-center bg-white/[0.06] border border-[#D4AF37]/60 rounded-xl p-0.5">
                        <button onClick={() => removeFromCart(combo.id, true)} className="p-1.5 text-[#FCF6BA]"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="font-mono font-bold text-xs text-white px-2">{inCart.quantity}</span>
                        <button onClick={() => addToCart(combo, true)} className="p-1.5 text-[#FCF6BA]"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => addToCart(combo, true)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase"
                      >
                        + Add
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

              return (
                <div key={item.id} className="bg-white/[0.03] border border-white/[0.08] rounded-[22px] p-2.5 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="h-28 w-full rounded-xl overflow-hidden bg-neutral-950 mb-2 relative">
                      {item.image_url ? (
                        <img src={item.image_url} alt={dishTitle} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                          <ImgIcon className="w-6 h-6" />
                        </div>
                      )}
                      <span className={`absolute top-2 left-2 w-2 h-2 rounded-full ${item.food_type === 'non_veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1">{dishTitle}</h4>
                    {item.description_en && (
                      <p className="text-[10px] text-neutral-400 font-sans line-clamp-1 mt-0.5">{item.description_en}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06]">
                    <span className="font-mono text-xs font-black text-[#D4AF37]">₹{Number(item.price).toFixed(2)}</span>

                    {inCart ? (
                      <div className="flex items-center bg-white/[0.06] border border-[#D4AF37]/60 rounded-xl p-0.5">
                        <button onClick={() => removeFromCart(item.id, false)} className="p-1 text-[#FCF6BA]"><Minus className="w-3 h-3" /></button>
                        <span className="font-mono font-bold text-[11px] text-white px-1.5">{inCart.quantity}</span>
                        <button onClick={() => addToCart(item, false)} className="p-1 text-[#FCF6BA]"><Plus className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => addToCart(item, false)}
                        className="w-7 h-7 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center font-black"
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

      {/* 5. FLOATING BASKET TRIGGER */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-6 inset-x-4 max-w-md mx-auto z-40">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              triggerHaptic(20);
              setIsCartOpen(true);
            }}
            className="w-full bg-[#121214] border border-[#D4AF37] text-white p-3.5 rounded-3xl shadow-2xl flex items-center justify-between cursor-pointer"
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

      {/* 6. CART DRAWER */}
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
                <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-2 divide-y divide-white/5">
                {cart.map((ci) => (
                  <div key={(ci.isCombo ? 'c-' : 'i-') + ci.menuItem.id} className="pt-2 flex justify-between items-center text-xs">
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
                  <span>Payable at Counter:</span>
                  <span className="text-[#D4AF37]">₹{finalPayable.toFixed(2)}</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={loading}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-lg cursor-pointer"
              >
                {loading ? 'Sending to Kitchen...' : 'Confirm & Dispatch to Kitchen'}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. TABLE LEDGER MODAL - PIN GAME & FAIR SHARE SPLIT BILL */}
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
                <button onClick={() => setIsTotalBillModalOpen(false)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {/* Items in active bill */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-gold-scrollbar p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs font-mono divide-y divide-white/5">
                {sessionOrderedItems.length === 0 ? (
                  <div className="text-center py-4 text-neutral-500">No active kitchen orders.</div>
                ) : (
                  sessionOrderedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center pt-1.5 first:pt-0">
                      <span>{item.quantity}x {item.menu_items?.name_en || item.menu_items?.name}</span>
                      <span className="font-black text-white">₹{(item.quantity * Number(item.unit_price || item.menu_items?.price || 0)).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Total & Discount Breakdown */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-[#D4AF37]/40 text-xs font-mono space-y-1">
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Mystery PIN Cash Discount:</span>
                    <span>- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-white pt-1">
                  <span>Net Payable Bill:</span>
                  <span className="text-[#D4AF37] text-sm">₹{finalPayable.toFixed(2)}</span>
                </div>
              </div>

              {/* PIN GAME SECTION (Strict 3 chances) */}
              {!pinGameWon && pinAttempts < 3 ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1c1808] to-[#0c0a03] border border-[#D4AF37] space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-[#D4AF37] animate-pulse" />
                      <span className="text-xs font-black text-white uppercase">Mystery PIN Challenge</span>
                    </div>
                    <span className="text-[10px] bg-[#D4AF37] text-black font-black px-2 py-0.5 rounded-full">
                      {3 - pinAttempts} / 3 Tries Left
                    </span>
                  </div>

                  <p className="text-[10px] text-[#FCF6BA]/80 leading-relaxed">
                    Crack today's 4-digit code to slash instant cash discount on this bill. (Max 3 chances for this order).
                  </p>

                  {pinFeedback && (
                    <div className={`p-2.5 rounded-xl text-[11px] font-mono border ${pinFeedback.success ? 'border-emerald-500 bg-emerald-950/30 text-emerald-200' : 'border-rose-500 bg-rose-950/30 text-rose-200'}`}>
                      {pinFeedback.msg}
                    </div>
                  )}

                  <form onSubmit={handleCrackPin} className="space-y-2">
                    <input
                      type="text"
                      required
                      maxLength={4}
                      placeholder="0000"
                      value={enteredPin}
                      onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-black border border-[#D4AF37]/50 rounded-xl px-3 py-2 text-center text-white font-black text-xl tracking-[0.3em] outline-none"
                    />
                    <button
                      type="submit"
                      disabled={pinLoading || enteredPin.length !== 4}
                      className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs cursor-pointer disabled:opacity-50"
                    >
                      {pinLoading ? 'Verifying...' : 'Claim Bill Discount'}
                    </button>
                  </form>
                </div>
              ) : pinGameWon ? (
                <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/50 text-emerald-300 text-xs font-mono text-center font-bold">
                  🎉 Mystery PIN unlocked! Discount applied to this bill.
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-neutral-500 text-[11px] font-mono text-center">
                  ⚠️ All 3 PIN chances used for this order session.
                </div>
              )}

              {/* Fair Share Split Bill Section */}
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
    </div>
  );
}