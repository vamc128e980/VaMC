// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  Plus, 
  Minus, 
  X, 
  Receipt, 
  ChevronRight, 
  ShoppingBag, 
  Search, 
  Tag,
  User,
  Phone,
  CheckCircle2,
  Clock
} from 'lucide-react';

const smoothSpring = {
  type: 'spring',
  stiffness: 380,
  damping: 30
};

export default function TableMenuPage() {
  const params = useParams();
  const rawParam = String(params?.Id || params?.id || params?.tableNum || '1');

  const [shopName, setShopName] = useState('VUJWALA SIMHA DRY FRUITS & NUTS');
  const [resolvedTableNumber, setResolvedTableNumber] = useState<number>(1);
  const [displayTableName, setDisplayTableName] = useState<string>('Table 1');
  
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Active Session State (Untill Admin marks PAID)
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [sessionOrderedItems, setSessionOrderedItems] = useState<any[]>([]);

  // Customer Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // iOS 5-second Fade In/Out Promo State
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  // Cart & Ordering States
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [splitPersons, setSplitPersons] = useState<number>(2);

  // Phone Number Validator (Block fake numbers like 1234567890, 0000000000, 9999999999)
  const isValidPhoneNumber = (phone: string) => {
    const clean = phone.trim().replace(/\D/g, '');
    if (clean.length !== 10) return false;
    
    // Check valid Indian mobile format (Starts with 6, 7, 8, or 9)
    if (!/^[6-9]\d{9}$/.test(clean)) return false;

    // Block common dummy numbers
    const dummyList = [
      '1234567890', '0123456789', '9876543210',
      '0000000000', '1111111111', '2222222222', '3333333333',
      '4444444444', '5555555555', '6666666666', '7777777777',
      '8888888888', '9999999999'
    ];
    if (dummyList.includes(clean)) return false;

    return true;
  };

  // Fetch Live Session for this Table
  const fetchActiveTableSession = async (tableNum: number) => {
    try {
      const { data: session } = await supabase
        .from('table_sessions')
        .select('*')
        .eq('table_number', tableNum)
        .eq('status', 'active')
        .neq('payment_status', 'paid')
        .maybeSingle();

      if (session) {
        setActiveSession(session);
        setCustomerName(session.customer_name || '');
        setCustomerPhone(session.customer_phone || '');

        // Fetch all items already placed in this session
        const { data: items } = await supabase
          .from('order_items')
          .select('*, menu_items(name_en, name, price)')
          .eq('session_id', session.id)
          .neq('item_status', 'cancelled');

        if (items) setSessionOrderedItems(items);
      } else {
        setActiveSession(null);
        setSessionOrderedItems([]);
      }
    } catch (err) {
      console.error('Session sync error:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initTableExperience() {
      try {
        let finalTableNumber = 1;
        let finalTableName = 'Table 1';

        const parsedNum = parseInt(rawParam, 10);
        const { data: allTables } = await supabase.from('restaurant_tables').select('*');

        if (allTables && allTables.length > 0) {
          let matched = null;
          if (!isNaN(parsedNum)) {
            matched = allTables.find(t => t.table_number === parsedNum);
          }
          if (!matched) {
            matched = allTables.find(t => 
              (t.table_name || '').trim().toLowerCase() === decodeURIComponent(rawParam).trim().toLowerCase()
            );
          }
          if (!matched) matched = allTables[0];

          finalTableNumber = matched.table_number;
          finalTableName = matched.table_name || `Table ${matched.table_number}`;
        }

        if (isMounted) {
          setResolvedTableNumber(finalTableNumber);
          setDisplayTableName(finalTableName);

          if (typeof window !== 'undefined') {
            const cleanSlug = encodeURIComponent(finalTableName.replace(/\s+/g, '-'));
            window.history.replaceState(null, '', `/table/${cleanSlug}`);
          }
        }

        // Fetch Live Active Session for this table
        await fetchActiveTableSession(finalTableNumber);

        const [settingsRes, catsRes, itemsRes, bnrsRes] = await Promise.all([
          supabase.from('restaurant_settings').select('restaurant_name').eq('id', 1).maybeSingle(),
          supabase.from('categories').select('id, name, name_en, sort_order').order('sort_order', { ascending: true }),
          supabase.from('menu_items').select('*').eq('is_available', true).order('id', { ascending: true }),
          supabase.from('promo_banners').select('*').eq('is_active', true).order('id', { ascending: false })
        ]);

        if (!isMounted) return;

        if (settingsRes.data?.restaurant_name) {
          setShopName(settingsRes.data.restaurant_name);
        }

        if (catsRes.data) setCategories(catsRes.data);
        if (itemsRes.data) setMenuItems(itemsRes.data);
        if (bnrsRes.data) setBanners(bnrsRes.data);

      } catch (err) {
        console.error('Table init error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initTableExperience();

    // Realtime Listener
    const channel = supabase
      .channel(`table_live_${rawParam}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => {
        fetchActiveTableSession(resolvedTableNumber);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchActiveTableSession(resolvedTableNumber);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, async () => {
        const { data } = await supabase.from('menu_items').select('*').eq('is_available', true).order('id', { ascending: true });
        if (data && isMounted) setMenuItems(data);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_banners' }, async () => {
        const { data } = await supabase.from('promo_banners').select('*').eq('is_active', true).order('id', { ascending: false });
        if (data && isMounted) setBanners(data);
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [rawParam, resolvedTableNumber]);

  // iOS 5-Second Promo Banner Smooth Crossfade
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        return prev.map((ci) => ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((ci) => ci.item.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci);
      }
      return prev.filter((ci) => ci.item.id !== itemId);
    });
  };

  const cartGrandTotal = cart.reduce((sum, ci) => sum + Number(ci.item.price || 0) * ci.quantity, 0);
  const cartItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  // Existing Session Financials
  const sessionTotalAmount = sessionOrderedItems.reduce((sum, oi) => {
    const pr = Number(oi.unit_price || oi.menu_items?.price || 0);
    return sum + (oi.quantity * pr);
  }, 0);

  // Combined Total (Placed + In Cart)
  const combinedTotalBill = sessionTotalAmount + cartGrandTotal;

  // Handle Order Placement to Kitchen & Counter
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    if (!activeSession) {
      if (!customerName.trim()) {
        setCheckoutError('Dayachesi mee peru enter cheyandi.');
        return;
      }
      if (!isValidPhoneNumber(customerPhone)) {
        setCheckoutError('Valid 10-digit mobile number enter cheyandi (Fake/Dummy numbers allow cheyabadavu).');
        return;
      }
    }

    setIsSubmittingOrder(true);
    try {
      let currentSessionId = activeSession?.id;

      // 1. Create session if not already open
      if (!currentSessionId) {
        const cleanPhone = customerPhone.trim().replace(/\D/g, '');
        const { data: newSession, error: sErr } = await supabase
          .from('table_sessions')
          .insert({
            table_number: resolvedTableNumber,
            customer_name: customerName.trim(),
            customer_phone: cleanPhone,
            status: 'active',
            payment_status: 'unpaid',
            total_amount: cartGrandTotal,
            subtotal: cartGrandTotal,
            cgst_amount: 0,
            sgst_amount: 0,
            final_payable: cartGrandTotal
          })
          .select()
          .single();

        if (sErr) throw sErr;
        currentSessionId = newSession.id;

        await supabase
          .from('restaurant_tables')
          .update({ status: 'occupied' })
          .eq('table_number', resolvedTableNumber);
      }

      // 2. Create Order Batch
      const { data: newBatch, error: bErr } = await supabase
        .from('order_batches')
        .insert({
          session_id: currentSessionId,
          table_number: resolvedTableNumber,
          status: 'pending_waiter'
        })
        .select()
        .single();

      if (bErr) throw bErr;

      // 3. Insert All Ordered Cart Items
      const orderPayloads = cart.map(ci => ({
        session_id: currentSessionId,
        batch_id: newBatch.id,
        menu_item_id: ci.item.id,
        quantity: ci.quantity,
        unit_price: Number(ci.item.price),
        item_status: 'pending'
      }));

      const { error: oiErr } = await supabase
        .from('order_items')
        .insert(orderPayloads);

      if (oiErr) throw oiErr;

      // 4. Update Running Total in Table Session
      const updatedTotal = sessionTotalAmount + cartGrandTotal;
      await supabase
        .from('table_sessions')
        .update({
          total_amount: updatedTotal,
          subtotal: updatedTotal,
          cgst_amount: 0,
          sgst_amount: 0,
          final_payable: updatedTotal
        })
        .eq('id', currentSessionId);

      // Clean Cart & Refresh State
      setCart([]);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
      await fetchActiveTableSession(resolvedTableNumber);
      alert('Mee order kitchen mariyu counter ki pampabadindhi! Meeru inka dishes add cheyavachhu.');
    } catch (err: any) {
      setCheckoutError(err.message || 'Order process failed.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCat = selectedCatId === 'all' || item.category_id === selectedCatId;
    const matchesSearch = (item.name_en || item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const comboDishes = menuItems.filter(item => 
    (item.name_en || item.name || '').toLowerCase().includes('combo') ||
    categories.find(c => c.id === item.category_id)?.name?.toLowerCase().includes('combo')
  );

  const scrollToCombos = () => {
    const el = document.getElementById('combos-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-[#FAF6EE] text-[#221714] flex flex-col items-center justify-center font-serif text-sm tracking-widest uppercase space-y-3">
        <div className="w-10 h-10 border-2 border-[#C2412D]/30 border-t-[#C2412D] rounded-full animate-spin" />
        <span className="font-bold">Loading Menu...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#221714] pb-36 font-serif select-none antialiased relative">
      <style jsx global>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Dinaro Top Header */}
      <header className="sticky top-0 z-40 bg-[#FAF6EE]/95 backdrop-blur-md border-b border-[#E6DEC8]/60 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-white border border-[#E6DEC8] flex items-center justify-center shadow-md p-1">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-full h-full object-contain" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#221714] tracking-tight uppercase">
                {shopName}
              </h1>
              <span className="text-[11px] font-mono text-[#C2412D] font-bold block">
                {displayTableName} {activeSession && `• Seated (${activeSession.customer_name})`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Header: Just "Bill" */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsBillModalOpen(true)}
              className="px-4 py-2 rounded-full bg-white border border-[#221714]/20 text-[#221714] hover:bg-[#221714] hover:text-white font-mono font-bold text-xs uppercase flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Receipt className="w-3.5 h-3.5 text-[#C2412D]" />
              <span>Bill</span>
            </motion.button>
          </div>
        </div>

        {/* Search Bar Input */}
        <div className="max-w-6xl mx-auto mt-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-4 text-[#8C827A]" />
            <input
              type="text"
              placeholder="Search dishes, burgers, shakes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E0D7C6]/60 rounded-full pl-11 pr-4 py-2.5 text-xs text-[#221714] placeholder-[#8C827A] outline-none focus:border-[#C2412D] transition shadow-inner font-sans"
            />
          </div>
        </div>

        {/* Seamless Borderless Pill Tabs */}
        <div className="max-w-6xl mx-auto mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 relative">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`relative px-5 py-2 rounded-full text-xs font-sans font-bold whitespace-nowrap transition cursor-pointer z-10 ${
              selectedCatId === 'all' ? 'text-white' : 'text-[#615750] hover:text-[#221714]'
            }`}
          >
            {selectedCatId === 'all' && (
              <motion.div
                layoutId="activeDinaroTab"
                className="absolute inset-0 bg-[#C2412D] rounded-full shadow-md z-[-1]"
                transition={smoothSpring}
              />
            )}
            <span>All ({menuItems.length})</span>
          </button>

          {categories.map((c) => {
            const isSelected = selectedCatId === c.id;
            const count = menuItems.filter(m => m.category_id === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCatId(c.id)}
                className={`relative px-5 py-2 rounded-full text-xs font-sans font-bold whitespace-nowrap transition cursor-pointer z-10 ${
                  isSelected ? 'text-white' : 'text-[#615750] hover:text-[#221714]'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeDinaroTab"
                    className="absolute inset-0 bg-[#C2412D] rounded-full shadow-md z-[-1]"
                    transition={smoothSpring}
                  />
                )}
                <span>{c.name_en || c.name} ({count})</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Menu Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-5 space-y-7">
        
        {/* iOS Fluid 5-Second Crossfade Promo Banner */}
        {banners.length > 0 && (
          <div className="w-full h-44 sm:h-56 rounded-3xl overflow-hidden relative shadow-lg border border-[#E2D8C7] bg-[#EFE9DC]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeBannerIdx}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                onClick={scrollToCombos}
                className="w-full h-full cursor-pointer relative"
              >
                <img
                  src={banners[activeBannerIdx]?.image_url}
                  alt={banners[activeBannerIdx]?.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-5">
                  <div className="text-white space-y-0.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#C2412D] text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                      Special Offer
                    </span>
                    <h3 className="text-lg sm:text-xl font-black drop-shadow-md">
                      {banners[activeBannerIdx]?.title}
                    </h3>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {banners.length > 1 && (
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-10">
                {banners.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === activeBannerIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Highlight Royal Combo Offers Section */}
        {comboDishes.length > 0 && selectedCatId === 'all' && (
          <div id="combos-section" className="space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#C2412D]" />
              <h2 className="text-2xl font-black text-[#221714]">Royal Combo Offers</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {comboDishes.map((combo) => (
                <div
                  key={combo.id}
                  className="rounded-3xl bg-white border-2 border-dashed border-[#C2412D]/40 p-4 flex flex-col justify-between shadow-md"
                >
                  <div className="space-y-2">
                    {combo.image_url && (
                      <div className="h-40 w-full rounded-2xl overflow-hidden bg-[#FAF6EE]">
                        <img src={combo.image_url} alt={combo.name_en || combo.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <h3 className="font-black text-lg text-[#221714]">{combo.name_en || combo.name}</h3>
                    <p className="text-xs text-[#6B6159] leading-relaxed">{combo.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[#F0EBE1] flex justify-between items-center mt-3">
                    <span className="font-mono font-black text-xl text-[#C2412D]">₹{Number(combo.price).toFixed(2)}</span>
                    <button
                      onClick={() => addToCart(combo)}
                      className="px-5 py-2 rounded-full bg-[#C2412D] text-white font-sans font-bold text-xs uppercase shadow-md hover:bg-[#a63422] transition cursor-pointer"
                    >
                      Add Combo +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Dinaro Menu Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-[#221714]">Our Menu</h2>
            <span className="text-xs font-mono text-[#8C827A]">{filteredMenuItems.length} Items</span>
          </div>

          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredMenuItems.map((item) => {
                const inCart = cart.find((ci) => ci.item.id === item.id);
                const isVeg = item.food_type !== 'non_veg';

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    key={item.id}
                    className="rounded-3xl bg-white border border-[#E6DEC8] p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <div>
                      {/* Item Image with Dashed Inner Border */}
                      <div className="h-52 w-full rounded-2xl overflow-hidden bg-[#FAF6EE] border-2 border-dashed border-[#E2D8C7] mb-3 relative">
                        <img
                          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'}
                          alt={item.name_en || item.name}
                          className="w-full h-full object-cover"
                        />

                        {/* Indian Standard FSSAI Food Icon */}
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm p-1 rounded-md shadow-sm">
                          {isVeg ? (
                            <div className="w-4 h-4 border-2 border-emerald-600 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-emerald-600" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 border-2 border-rose-600 flex items-center justify-center">
                              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-rose-600" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-black text-lg text-[#221714] truncate">{item.name_en || item.name}</h3>
                          <span className="font-mono font-black text-base text-[#C2412D] ml-2 shrink-0">₹{Number(item.price).toFixed(2)}</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-[#736961] font-sans line-clamp-2 leading-relaxed">{item.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-[#F2ECE1] flex justify-end">
                      {inCart ? (
                        <div className="flex items-center gap-3 bg-[#FAF6EE] border border-[#C2412D] rounded-full px-3 py-1">
                          <button onClick={() => removeFromCart(item.id)} className="p-0.5 text-[#221714] hover:text-[#C2412D] cursor-pointer">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-xs font-black text-[#C2412D] px-1">{inCart.quantity}</span>
                          <button onClick={() => addToCart(item)} className="p-0.5 text-[#221714] hover:text-emerald-600 cursor-pointer">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-full py-2.5 rounded-full bg-[#C2412D] hover:bg-[#a83523] text-white font-sans font-bold text-xs uppercase tracking-wider shadow-sm transition cursor-pointer"
                        >
                          Add to cart
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* Floating Bottom Cart Pill */}
      {cartItemCount > 0 && (
        <motion.div
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 inset-x-4 max-w-md mx-auto z-40"
        >
          <div className="bg-[#221714] text-white p-3.5 rounded-full shadow-2xl flex items-center justify-between border border-[#3D2C27]">
            <div className="flex items-center gap-3 pl-2">
              <span className="w-7 h-7 rounded-full bg-[#C2412D] text-white font-black text-xs flex items-center justify-center font-mono">
                {cartItemCount}
              </span>
              <div className="leading-tight">
                <span className="text-[10px] text-[#A69B94] font-sans uppercase block">New Items Total</span>
                <span className="text-white font-mono font-black text-sm">₹{cartGrandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="px-5 py-2.5 rounded-full bg-[#C2412D] text-white font-bold font-sans text-xs uppercase flex items-center gap-1.5 shadow-md cursor-pointer hover:bg-[#a63422] transition"
            >
              <span>View Basket</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Cart Drawer Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans">
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              className="w-full max-w-md bg-[#FAF6EE] border border-[#E2D8C7] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between border-b border-[#E2D8C7] pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#C2412D]" />
                  <h3 className="font-black text-[#221714] text-base">Your Basket</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-[#736961] hover:text-[#221714] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {cart.map((ci) => (
                  <div key={ci.item.id} className="flex justify-between items-center p-3 rounded-2xl bg-white border border-[#E2D8C7] text-xs">
                    <div>
                      <span className="font-bold text-[#221714] block">{ci.item.name_en || ci.item.name}</span>
                      <span className="text-[#C2412D] font-mono font-bold">₹{(Number(ci.item.price) * ci.quantity).toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-2 bg-[#FAF6EE] border border-[#E2D8C7] rounded-full px-2.5 py-1">
                      <button onClick={() => removeFromCart(ci.item.id)} className="p-0.5 hover:text-[#C2412D]">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-[#221714] px-1 font-mono">{ci.quantity}</span>
                      <button onClick={() => addToCart(ci.item)} className="p-0.5 hover:text-emerald-600">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#E2D8C7] space-y-3 font-mono">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#736961]">Basket Subtotal:</span>
                  <span className="text-xl font-black text-[#C2412D]">₹{cartGrandTotal.toFixed(2)}</span>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full py-3.5 rounded-full bg-[#C2412D] hover:bg-[#a63422] text-white font-black uppercase text-xs shadow-lg cursor-pointer transition font-sans"
                >
                  Pay at Counter / Place Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: Pay At Counter Customer Details Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-sm bg-[#FAF6EE] border border-[#E2D8C7] rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#E2D8C7] pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#C2412D]" />
                  <h3 className="font-black text-[#221714] text-base">Pay at Counter Details</h3>
                </div>
                <button onClick={() => setIsCheckoutOpen(false)} className="text-[#736961] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {checkoutError && (
                <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 text-xs">
                  {checkoutError}
                </div>
              )}

              <form onSubmit={handleConfirmOrder} className="space-y-3.5 text-xs">
                {activeSession ? (
                  <div className="p-3.5 rounded-2xl bg-white border border-[#E2D8C7] space-y-1">
                    <span className="text-[10px] font-mono text-[#736961] uppercase block">Running Table Guest</span>
                    <span className="font-bold text-[#221714] block text-sm">{activeSession.customer_name} ({activeSession.customer_phone})</span>
                    <span className="text-[11px] text-emerald-700 font-bold block pt-1">
                      Session Active • Extra items direct ga add aipothayi
                    </span>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-[#5C544E] block mb-1 font-bold">Customer Name *</label>
                      <div className="relative flex items-center">
                        <User className="w-4 h-4 absolute left-3.5 text-[#8C827A]" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Surya"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full bg-white border border-[#E0D7C6] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#221714] outline-none focus:border-[#C2412D]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[#5C544E] block mb-1 font-bold">Mobile Number (10 Digits) *</label>
                      <div className="relative flex items-center">
                        <Phone className="w-4 h-4 absolute left-3.5 text-[#8C827A]" />
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="e.g. 9876543210"
                          value={customerPhone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setCustomerPhone(val);
                          }}
                          className="w-full bg-white border border-[#E0D7C6] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#221714] outline-none focus:border-[#C2412D] font-mono"
                        />
                      </div>
                      <span className="text-[10px] text-[#8C827A] mt-1 block">
                        Fake numbers (1234567890, 0000000000) allow kaavu.
                      </span>
                    </div>
                  </>
                )}

                <div className="p-3 rounded-2xl bg-white border border-[#E2D8C7] font-mono space-y-1">
                  <div className="flex justify-between text-neutral-500">
                    <span>New Items:</span>
                    <span>₹{cartGrandTotal.toFixed(2)}</span>
                  </div>
                  {sessionTotalAmount > 0 && (
                    <div className="flex justify-between text-neutral-500">
                      <span>Previous Order:</span>
                      <span>₹{sessionTotalAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[#221714] pt-1 border-t border-[#F2ECE1]">
                    <span>Total Bill:</span>
                    <span className="text-[#C2412D]">₹{combinedTotalBill.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="w-full py-3.5 rounded-full bg-[#C2412D] hover:bg-[#a63422] text-white font-black uppercase text-xs shadow-lg cursor-pointer transition disabled:opacity-50"
                >
                  {isSubmittingOrder ? 'Submitting Order...' : 'Confirm & Send to Kitchen'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Pure "Bill" & Split Modal (Without GST) */}
      <AnimatePresence>
        {isBillModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 font-mono">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-md bg-[#FAF6EE] border border-[#E2D8C7] rounded-3xl p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#E2D8C7] pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#C2412D]" />
                  <div>
                    <h3 className="font-black text-[#221714] text-base font-serif">Table Bill</h3>
                    <span className="text-[10px] text-neutral-500">
                      {activeSession ? `Guest: ${activeSession.customer_name} (${activeSession.customer_phone})` : 'New Orders (Unplaced)'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsBillModalOpen(false)} className="text-[#736961] cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E2D8C7]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-[#221714]">Status:</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                  {activeSession ? (activeSession.payment_status === 'paid' ? 'PAID' : 'UNPAID (Pending at Counter)') : 'UNPAID'}
                </span>
              </div>

              {/* Ordered Dishes List */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-neutral-600 uppercase block">
                  Items Ordered for this Table:
                </span>
                
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 rounded-2xl bg-white border border-[#E2D8C7]">
                  {sessionOrderedItems.length === 0 && cart.length === 0 ? (
                    <div className="text-center py-4 text-neutral-400">Inka dishes order cheyaledhu.</div>
                  ) : (
                    <>
                      {/* Confirmed Orders */}
                      {sessionOrderedItems.map((oi) => (
                        <div key={oi.id} className="flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-[#221714]">{oi.quantity}x {oi.menu_items?.name_en || oi.menu_items?.name || 'Dish'}</span>
                            <span className="text-[10px] text-emerald-600 block">Sent to Kitchen</span>
                          </div>
                          <span className="font-bold text-[#C2412D]">₹{((Number(oi.unit_price) || Number(oi.menu_items?.price) || 0) * oi.quantity).toFixed(2)}</span>
                        </div>
                      ))}

                      {/* Items in Current Cart */}
                      {cart.map((ci) => (
                        <div key={ci.item.id} className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-[#E2D8C7]">
                          <div>
                            <span className="font-bold text-neutral-600">{ci.quantity}x {ci.item.name_en || ci.item.name}</span>
                            <span className="text-[10px] text-amber-600 block">(In Cart)</span>
                          </div>
                          <span className="font-bold text-neutral-700">₹{(Number(ci.item.price) * ci.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Financial Calculation (Direct Net Bill without GST) */}
              <div className="p-4 rounded-2xl bg-white border border-[#E2D8C7] space-y-2">
                <div className="flex justify-between text-[#221714] font-black text-sm">
                  <span>Net Total Payable:</span>
                  <span className="text-[#C2412D] text-base">₹{combinedTotalBill.toFixed(2)}</span>
                </div>
              </div>

              {/* Split Option Under Bill */}
              <div className="p-4 rounded-2xl bg-white border border-[#E2D8C7] space-y-3">
                <span className="text-[11px] text-[#736961] font-bold block uppercase">
                  Split Bill Between People:
                </span>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSplitPersons(prev => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-full bg-[#FAF6EE] border border-[#E2D8C7] flex items-center justify-center text-[#221714] cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm text-[#221714]">{splitPersons}</span>
                    <button
                      onClick={() => setSplitPersons(prev => prev + 1)}
                      className="w-8 h-8 rounded-full bg-[#FAF6EE] border border-[#E2D8C7] flex items-center justify-center text-[#221714] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#736961] block uppercase">Per Person:</span>
                    <span className="text-base font-black text-[#C2412D]">
                      ₹{(combinedTotalBill / splitPersons).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsBillModalOpen(false)}
                className="w-full py-3 rounded-full bg-[#C2412D] text-white font-black uppercase text-xs shadow-md cursor-pointer hover:bg-[#a63422] transition"
              >
                Close Bill
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}