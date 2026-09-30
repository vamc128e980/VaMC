// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, 
  Trash2, 
  Plus, 
  RefreshCw, 
  DollarSign, 
  LayoutGrid, 
  Receipt, 
  Image as ImageIcon,
  UtensilsCrossed,
  BarChart3,
  FileSpreadsheet,
  Check,
  X,
  Edit3,
  Clock,
  Sparkles,
  TrendingUp,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flame,
  AlertTriangle,
  User,
  Phone,
  ShoppingBag
} from 'lucide-react';

export default function LuxuryGoldAdminPanel() {
  const [activeTab, setActiveTab] = useState<'tables' | 'menu' | 'banners' | 'insights' | 'customers'>('tables');
  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Table Management State
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');

  // Custom Gold Calendar State
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [isFilterAllDates, setIsFilterAllDates] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calViewDate, setCalViewDate] = useState<Date>(new Date());
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Menu Category Filter & Edit State
  const [selectedCatId, setSelectedCatId] = useState<number | 'all'>('all');
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Banner State
  const [newTitle, setNewTitle] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newTargetCat, setNewTargetCat] = useState('');
  const [newTargetItem, setNewTargetItem] = useState('');
  const [editingBanner, setEditingBanner] = useState<any | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const { data: tbls } = await supabase.from('restaurant_tables').select('*').order('table_number');
      const { data: sess } = await supabase.from('table_sessions').select('*').order('created_at', { ascending: false });
      const { data: cats } = await supabase.from('categories').select('*');
      const { data: itms } = await supabase.from('menu_items').select('*');
      const { data: oitms } = await supabase.from('order_items').select('*, menu_items(name_en, price, category_id)');
      const { data: bnrs } = await supabase.from('promo_banners').select('*');

      if (tbls) setTables(tbls);
      if (sess) setSessions(sess);
      if (cats) setCategories(cats);
      if (itms) setMenuItems(itms);
      if (oitms) setOrderItems(oitms);

      if (bnrs && bnrs.length > 0) {
        const sorted = [...bnrs].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
        setBanners(sorted);
      }
    } catch (err) {
      console.error('Admin Load Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();

    const channel = supabase
      .channel('admin-gold-realtime-master')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_banners' }, () => loadAdminData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateOnly = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  // Add Table
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const tNum = parseInt(newTableNumber);
    const tCap = parseInt(newTableCapacity) || 4;

    if (!tNum || tNum <= 0) {
      alert('Dayachesi valid Table Number enter cheyandi.');
      return;
    }

    if (tables.some(t => t.table_number === tNum)) {
      alert(`Table #${tNum} already undi! Kotha table number ivvandi.`);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('restaurant_tables')
        .insert({
          table_number: tNum,
          capacity: tCap,
          status: 'available'
        })
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setTables(prev => [...prev, data[0]].sort((a, b) => a.table_number - b.table_number));
      }

      setNewTableNumber('');
      setShowAddTableModal(false);
      alert(`Table #${tNum} deploy aindi!`);
      await loadAdminData();
    } catch (err: any) {
      alert('Add Table error: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  // Delete Table
  const handleDeleteTable = async (tableNum: number, isOccupied: boolean) => {
    if (isOccupied) {
      alert(`Table #${tableNum} lo customer dining lo unnaru! Mundhu "Clear Table" cheyandi.`);
      return;
    }

    if (!confirm(`Table #${tableNum} ni DELETE cheyalani anukuntunnara?`)) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('restaurant_tables')
        .delete()
        .eq('table_number', tableNum);

      if (error) throw error;

      setTables(prev => prev.filter(t => t.table_number !== tableNum));
      await loadAdminData();
    } catch (err: any) {
      alert('Delete Table error: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  // Clear Table
  const handleClearTable = async (tableNum: number) => {
    if (!confirm(`Table #${tableNum} ni CLEAR cheyala? Active bill complete avthundi.`)) return;

    try {
      setLoading(true);

      const { error: sessErr } = await supabase
        .from('table_sessions')
        .update({ 
          status: 'completed', 
          payment_status: 'paid'
        })
        .eq('table_number', tableNum)
        .eq('status', 'active');

      if (sessErr) throw sessErr;

      const { error: tblErr } = await supabase
        .from('restaurant_tables')
        .update({ status: 'available' })
        .eq('table_number', tableNum);

      if (tblErr) throw tblErr;

      setSessions(prev => prev.map(s => (s.table_number === tableNum && s.status === 'active') ? { ...s, status: 'completed' } : s));
      setTables(prev => prev.map(t => t.table_number === tableNum ? { ...t, status: 'available' } : t));

      await loadAdminData();
    } catch (err: any) {
      alert('Clear error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Menu Updates
  const handleUpdateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await supabase
        .from('menu_items')
        .update({
          name_en: editingItem.name_en,
          price: parseFloat(editingItem.price),
          food_type: editingItem.food_type,
          is_available: editingItem.is_available,
          category_id: editingItem.category_id
        })
        .eq('id', editingItem.id);

      setEditingItem(null);
      await loadAdminData();
    } catch (err: any) {
      alert('Update failed: ' + err.message);
    }
  };

  // Banner Handlers
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newImageUrl.trim()) {
      alert('Dayachesi Banner Title mariyu Image URL enter cheyandi.');
      return;
    }

    setLoading(true);
    try {
      const bannerPayload = {
        title: newTitle.trim(),
        image_url: newImageUrl.trim(),
        target_category_id: newTargetCat ? parseInt(newTargetCat) : null,
        target_item_id: newTargetItem ? parseInt(newTargetItem) : null,
        is_active: true,
        sort_order: banners.length + 1
      };

      if (editingBanner) {
        const { error } = await supabase
          .from('promo_banners')
          .update(bannerPayload)
          .eq('id', editingBanner.id);

        if (error) throw error;
        setEditingBanner(null);
      } else {
        const { error } = await supabase.from('promo_banners').insert(bannerPayload);
        if (error) throw error;
      }

      setNewTitle('');
      setNewImageUrl('');
      setNewTargetCat('');
      setNewTargetItem('');
      await loadAdminData();
    } catch (err: any) {
      alert('Banner error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async (bannerId: number) => {
    if (!confirm('Ee banner ni delete cheyala?')) return;
    try {
      await supabase.from('promo_banners').delete().eq('id', bannerId);
      setBanners(prev => prev.filter(b => b.id !== bannerId));
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    }
  };

  // Filter Sessions based on Selected Date
  const filteredSessions = sessions.filter(s => {
    if (isFilterAllDates) return true;
    return formatDateOnly(s.created_at) === selectedDate;
  });

  const filteredSessionIds = new Set(filteredSessions.map(s => s.id));

  // Helper: Get formatted ordered items list for a specific session
  const getSessionOrderedItems = (sessionId: string) => {
    const items = orderItems.filter(oi => oi.session_id === sessionId && oi.item_status !== 'cancelled');
    return items.map(oi => ({
      name: oi.menu_items?.name_en || 'Item #' + oi.menu_item_id,
      quantity: oi.quantity || 1,
      price: Number(oi.unit_price || oi.menu_items?.price || 0)
    }));
  };

  // Product Sales Calculation
  const productPerformanceMap: Record<number, { name: string; quantity: number; revenue: number; price: number }> = {};
  menuItems.forEach(mi => {
    productPerformanceMap[mi.id] = {
      name: mi.name_en || 'Dish #' + mi.id,
      quantity: 0,
      revenue: 0,
      price: Number(mi.price) || 0
    };
  });

  orderItems.forEach(oi => {
    if (filteredSessionIds.has(oi.session_id) && oi.item_status !== 'cancelled') {
      const mId = oi.menu_item_id;
      const qty = Number(oi.quantity) || 1;
      const price = Number(oi.unit_price || oi.menu_items?.price) || 0;

      if (!productPerformanceMap[mId]) {
        productPerformanceMap[mId] = {
          name: oi.menu_items?.name_en || 'Dish #' + mId,
          quantity: 0,
          revenue: 0,
          price: price
        };
      }
      productPerformanceMap[mId].quantity += qty;
      productPerformanceMap[mId].revenue += qty * price;
    }
  });

  const rankedDishes = Object.entries(productPerformanceMap)
    .map(([id, stats]) => ({ id: Number(id), ...stats }))
    .sort((a, b) => b.quantity - a.quantity);

  const topSellers = rankedDishes.filter(d => d.quantity > 0);
  const lowDemandDishes = rankedDishes.filter(d => d.quantity === 0);

  // Copy TSV to Sheets with Full Details
  const copyToGoogleSheets = () => {
    const headers = ['Date', 'Time', 'Table #', 'Customer Name', 'Phone', 'Ordered Dishes', 'Subtotal', 'CGST (2.5%)', 'SGST (2.5%)', 'Total Paid', 'Status'];
    const rows = filteredSessions.map(s => {
      const d = new Date(s.created_at);
      const itemsList = getSessionOrderedItems(s.id).map(i => `${i.quantity}x ${i.name}`).join(', ');
      return [
        d.toLocaleDateString('en-IN'),
        d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        s.table_number,
        s.customer_name || 'Guest',
        s.customer_phone || '-',
        `"${itemsList || 'None'}"`,
        s.subtotal,
        s.cgst_amount,
        s.sgst_amount,
        s.total_amount,
        s.status
      ];
    });

    const tsvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const filteredRevenue = filteredSessions.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  const paidOrdersCount = filteredSessions.filter(s => s.status === 'completed').length;

  const filteredMenuItems = selectedCatId === 'all' 
    ? menuItems 
    : menuItems.filter(m => m.category_id === selectedCatId);

  // Calendar
  const renderCalendarDays = () => {
    const year = calViewDate.getFullYear();
    const month = calViewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={'empty-' + i} className="h-8 w-8" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr && !isFilterAllDates;
      const isToday = getTodayStr() === dateStr;

      days.push(
        <button
          key={d}
          onClick={() => {
            setSelectedDate(dateStr);
            setIsFilterAllDates(false);
            setShowCalendar(false);
          }}
          className={`h-8 w-8 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center relative ${
            isSelected
              ? 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black shadow-[0_0_15px_rgba(212,175,55,0.6)] font-black scale-105'
              : isToday
              ? 'border border-[#D4AF37]/50 text-[#F3E5AB] hover:bg-white/10'
              : 'text-neutral-300 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          {d}
          {isToday && !isSelected && (
            <span className="w-1 h-1 rounded-full bg-[#D4AF37] absolute bottom-1" />
          )}
        </button>
      );
    }
    return days;
  };

  const nextMonth = () => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 1));
  const prevMonth = () => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1));

  return (
    <div className="min-h-screen bg-[#050507] text-neutral-100 font-sans pb-28 relative overflow-hidden selection:bg-[#D4AF37] selection:text-black">
      {/* Background Lighting */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_70%)] blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/2 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,transparent_70%)] blur-3xl pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#08080c]/70 backdrop-blur-3xl border-b border-white/[0.08] px-4 sm:px-6 py-3.5 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.05] border border-[#D4AF37]/30 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-[#F3E5AB] uppercase bg-gradient-to-r from-[#D4AF37]/25 to-transparent px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40 shadow-sm">
                  MAÎTRE D'
                </span>
                <h1 className="text-base font-extrabold tracking-wide text-white">
                  ADMIN CONSOLE
                </h1>
              </div>
              <p className="text-[11px] font-mono text-neutral-400 mt-0.5">FINE-DINE OPERATIONS</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 relative">
            {/* Custom Gold Calendar Trigger */}
            <div className="relative" ref={calRef}>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowCalendar(!showCalendar)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all duration-300 backdrop-blur-2xl shadow-lg ${
                  showCalendar || !isFilterAllDates
                    ? 'bg-gradient-to-r from-[#D4AF37]/20 via-[#AA771C]/15 to-transparent border-[#D4AF37]/60 text-[#F3E5AB] shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                    : 'bg-black/60 border-white/10 text-neutral-300 hover:border-white/20'
                }`}
              >
                <div className="p-1 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#F3E5AB]" />
                </div>
                <div className="text-left font-mono">
                  <span className="text-[9px] block text-neutral-400 font-sans uppercase font-bold leading-none">Filter Date</span>
                  <span className="text-xs font-black text-white leading-none">
                    {isFilterAllDates ? 'All History' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse ml-1" />
              </motion.button>

              {/* Popover Card */}
              <AnimatePresence>
                {showCalendar && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    className="absolute right-0 top-12 mt-2 w-72 bg-[#0a0a0f]/95 backdrop-blur-3xl border border-[#D4AF37]/40 rounded-3xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.2)] z-50 select-none"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
                      <button onClick={prevMonth} className="p-1.5 rounded-xl bg-white/[0.05] text-[#F3E5AB] border border-white/10">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <h4 className="text-xs font-black tracking-wider text-white uppercase font-sans">
                        {calViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </h4>
                      <button onClick={nextMonth} className="p-1.5 rounded-xl bg-white/[0.05] text-[#F3E5AB] border border-white/10">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-neutral-400 font-mono mb-2">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 place-items-center">
                      {renderCalendarDays()}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.08] text-[11px] font-bold">
                      <button onClick={() => { setSelectedDate(getTodayStr()); setIsFilterAllDates(false); setShowCalendar(false); }} className="text-[#F3E5AB] hover:underline">
                        Today
                      </button>
                      <button onClick={() => { setIsFilterAllDates(true); setShowCalendar(false); }} className="bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black px-2.5 py-1 rounded-xl text-[10px] uppercase shadow-sm">
                        All History
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setIsFilterAllDates(!isFilterAllDates)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border ${
                isFilterAllDates
                  ? 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black border-transparent shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-neutral-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{isFilterAllDates ? 'All History Active' : 'Filter Applied'}</span>
            </button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={copyToGoogleSheets}
              className={`px-3.5 py-2 rounded-2xl backdrop-blur-xl border text-xs font-bold transition flex items-center gap-1.5 shadow-lg ${
                copySuccess 
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' 
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-neutral-200'
              }`}
            >
              {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-[#D4AF37]" />}
              <span className="hidden sm:inline">{copySuccess ? 'Copied TSV!' : 'Copy to Sheets'}</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={loadAdminData}
              className="p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-neutral-200 transition"
              title="Refresh Real-time Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D4AF37]' : ''}`} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-between"
          >
            <div>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                Sales ({isFilterAllDates ? 'All History' : selectedDate})
              </span>
              <h3 className="text-2xl font-black font-mono text-[#F3E5AB] mt-1">₹{filteredRevenue.toFixed(2)}</h3>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> {paidOrdersCount} Paid Orders Settled
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <DollarSign className="w-6 h-6 text-[#D4AF37]" />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-between"
          >
            <div>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Occupied Tables Now</span>
              <h3 className="text-2xl font-black font-mono text-white mt-1">{activeSessions.length} / {tables.length}</h3>
              <span className="text-[11px] text-[#F3E5AB] font-semibold flex items-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" /> Live Dining Guests
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <LayoutGrid className="w-6 h-6 text-[#D4AF37]" />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-between"
          >
            <div>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Active Banners</span>
              <h3 className="text-2xl font-black font-mono text-white mt-1">{banners.filter(b => b.is_active).length} Slides</h3>
              <span className="text-[11px] text-[#F3E5AB] font-semibold flex items-center gap-1 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Live in Customer Carousel
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <ImageIcon className="w-6 h-6 text-[#D4AF37]" />
            </div>
          </motion.div>
        </div>

        {/* Navigation Tabs (Added Customer Orders Ledger Tab) */}
        <div className="flex gap-2 p-1.5 rounded-3xl bg-neutral-900/60 backdrop-blur-2xl border border-white/10 w-fit shadow-xl overflow-x-auto no-scrollbar">
          {[
            { id: 'tables', label: 'Tables Ops', icon: LayoutGrid },
            { id: 'customers', label: 'Customer Order History', icon: Receipt },
            { id: 'insights', label: 'Dish Demand Insights', icon: BarChart3 },
            { id: 'menu', label: 'Menu & Category Edits', icon: UtensilsCrossed },
            { id: 'banners', label: 'Banner Studio', icon: ImageIcon },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive ? 'text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="adminGlassPill"
                    className="absolute inset-0 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] rounded-2xl shadow-[0_2px_15px_rgba(212,175,55,0.4)]"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="w-4 h-4" /> {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: TABLES SESSIONS */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#D4AF37]" /> Live Dining Tables ({tables.length} Total)
              </h2>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddTableModal(true)}
                className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-[0_0_20px_rgba(212,175,55,0.35)]"
              >
                <Plus className="w-4 h-4 stroke-[3]" /> Add Table
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map(t => {
                const activeSession = sessions.find(s => s.table_number === t.table_number && s.status === 'active');
                const isOccupied = !!activeSession;

                return (
                  <motion.div
                    key={t.id || t.table_number}
                    layout
                    className={`p-5 rounded-3xl backdrop-blur-2xl border transition-all duration-300 relative overflow-hidden ${
                      isOccupied 
                        ? 'bg-white/[0.05] border-[#D4AF37]/50 shadow-[0_8px_30px_rgba(212,175,55,0.2)] ring-1 ring-[#D4AF37]/30' 
                        : 'bg-white/[0.02] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-white">Table #{t.table_number}</span>
                        <span className="text-xs text-neutral-400 font-mono">({t.capacity || 4} Seats)</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isOccupied 
                            ? 'bg-amber-500/20 text-[#F3E5AB] border-amber-500/40 animate-pulse' 
                            : 'bg-white/[0.03] text-neutral-500 border-white/[0.06]'
                        }`}>
                          {isOccupied ? 'Occupied' : 'Vacant'}
                        </span>

                        <button
                          onClick={() => handleDeleteTable(t.table_number, isOccupied)}
                          className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 transition"
                          title={`Delete Table #${t.table_number}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isOccupied ? (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs space-y-1.5 font-mono">
                          <div className="flex justify-between text-neutral-400">
                            <span>Guest:</span>
                            <span className="font-bold text-white font-sans">{activeSession.customer_name || 'Guest'}</span>
                          </div>
                          <div className="flex justify-between text-neutral-400">
                            <span>Phone:</span>
                            <span className="text-neutral-200">{activeSession.customer_phone || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-neutral-400">
                            <span>Seated At:</span>
                            <span className="text-neutral-300 font-sans text-[11px]">{formatDateTime(activeSession.created_at)}</span>
                          </div>
                          <div className="flex justify-between text-neutral-400 pt-1.5 border-t border-white/10">
                            <span className="font-bold text-white">Current Bill:</span>
                            <span className="text-[#F3E5AB] font-black text-sm">₹{Number(activeSession.total_amount || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleClearTable(t.table_number)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-900/60 to-rose-700/60 hover:from-rose-800 hover:to-rose-600 border border-rose-500/40 text-rose-200 text-xs font-black uppercase tracking-wider transition shadow-lg"
                        >
                          Clear Table & Reset Bill
                        </motion.button>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-neutral-500">
                        Ready for next guest order
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Add Table Modal */}
            <AnimatePresence>
              {showAddTableModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.94, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.94, opacity: 0 }}
                    className="w-full max-w-sm bg-[#0c0c12]/95 border border-[#D4AF37]/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(212,175,55,0.25)] space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <h3 className="font-black text-white text-base flex items-center gap-2">
                        <Plus className="w-4 h-4 text-[#D4AF37]" /> Add New Dining Table
                      </h3>
                      <button onClick={() => setShowAddTableModal(false)} className="text-neutral-400 hover:text-white">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleAddTable} className="space-y-3.5 text-xs">
                      <div>
                        <label className="text-neutral-300 font-bold block mb-1">Table Number *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="e.g. 11"
                          value={newTableNumber}
                          onChange={(e) => setNewTableNumber(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-300 font-bold block mb-1">Seating Capacity (Guests)</label>
                        <select
                          value={newTableCapacity}
                          onChange={(e) => setNewTableCapacity(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#D4AF37]"
                        >
                          <option value="2">2 Persons</option>
                          <option value="4">4 Persons (Standard)</option>
                          <option value="6">6 Persons (Family)</option>
                          <option value="8">8 Persons (Party)</option>
                        </select>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        type="submit"
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase tracking-wider text-xs shadow-lg transition"
                      >
                        {loading ? 'Deploying...' : 'Deploy Table to Floor'}
                      </motion.button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* TAB 2: DETAILED CUSTOMER ORDERS & PAYMENT LEDGER (NEW!) */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <User className="w-5 h-5 text-[#D4AF37]" />
                  Customer Dining & Payment History ({isFilterAllDates ? 'All History' : selectedDate})
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Customer name, mobile number, exact items ordered, billing breakdown, and timestamp.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total Customers Billed</span>
                <span className="font-mono text-base font-black text-[#F3E5AB]">
                  {filteredSessions.length} Receipts • ₹{filteredRevenue.toFixed(2)}
                </span>
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="text-center py-16 text-neutral-500 text-xs font-mono bg-white/[0.02] rounded-3xl border border-white/5">
                Ee date lo customer receipts emi levu. Header lo unna Gold Calendar lo vere date ni select cheyandi!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSessions.map(session => {
                  const items = getSessionOrderedItems(session.id);
                  const isPaid = session.status === 'completed';

                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] hover:border-[#D4AF37]/35 transition shadow-xl space-y-3.5"
                    >
                      {/* Top Bar: Table & Payment Timestamp */}
                      <div className="flex items-center justify-between border-b border-white/[0.07] pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black text-xs px-2.5 py-0.5 rounded-lg">
                            Table #{session.table_number}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            isPaid ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}>
                            {session.status}
                          </span>
                        </div>

                        <div className="text-right font-mono text-[11px] text-neutral-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>{formatDateTime(session.created_at)}</span>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[#D4AF37]" />
                          <span className="font-extrabold text-white text-sm">{session.customer_name || 'Walk-in Guest'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-neutral-400 font-mono">
                          <Phone className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{session.customer_phone || 'No Phone'}</span>
                        </div>
                      </div>

                      {/* Ordered Items Breakdown */}
                      <div className="p-3 rounded-2xl bg-black/50 border border-white/[0.06] space-y-2">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3 text-[#D4AF37]" /> Ordered Dishes ({items.length} items)
                        </span>

                        {items.length === 0 ? (
                          <div className="text-[11px] text-neutral-500 italic">No item items recorded for this session.</div>
                        ) : (
                          <div className="space-y-1.5 divide-y divide-white/[0.04]">
                            {items.map((it, iIdx) => (
                              <div key={iIdx} className="pt-1.5 flex items-center justify-between text-xs font-mono">
                                <div className="flex items-center gap-2 font-sans">
                                  <span className="text-[#F3E5AB] font-bold font-mono">{it.quantity}x</span>
                                  <span className="text-neutral-200">{it.name}</span>
                                </div>
                                <span className="text-neutral-400">₹{(it.quantity * it.price).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Financial Settlement Breakdown */}
                      <div className="pt-2 border-t border-white/[0.07] text-xs font-mono space-y-1">
                        <div className="flex justify-between text-neutral-400 text-[11px]">
                          <span>Net Dishes Subtotal:</span>
                          <span>₹{Number(session.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-neutral-500 text-[10px]">
                          <span>CGST (2.5%): ₹{Number(session.cgst_amount || 0).toFixed(2)} | SGST (2.5%): ₹{Number(session.sgst_amount || 0).toFixed(2)}</span>
                          <span className="text-emerald-400">Inclusive</span>
                        </div>
                        <div className="flex justify-between items-center text-white font-black text-sm pt-1 border-t border-dashed border-white/10">
                          <span>Total Amount Paid:</span>
                          <span className="text-base text-[#F3E5AB]">₹{Number(session.total_amount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DISH DEMAND INSIGHTS */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
                  Product Sales & Menu Demand Analysis
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Timeline: <span className="text-[#F3E5AB] font-bold">{isFilterAllDates ? 'All-Time Order Records' : selectedDate}</span>
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="bg-black/50 border border-white/10 px-3 py-2 rounded-2xl">
                  <span className="text-neutral-500 block text-[10px]">Active Dishes</span>
                  <span className="font-black text-white text-sm">{rankedDishes.length} Items</span>
                </div>
                <div className="bg-black/50 border border-white/10 px-3 py-2 rounded-2xl">
                  <span className="text-neutral-500 block text-[10px]">Total Sold Qty</span>
                  <span className="font-black text-[#F3E5AB] text-sm">
                    {topSellers.reduce((sum, d) => sum + d.quantity, 0)} Units
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Best Sellers */}
              <div className="p-5 rounded-3xl backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400 fill-current" /> High Demand Dishes (Ordered)
                  </h4>
                  <span className="text-[11px] font-mono font-bold text-emerald-400">{topSellers.length} Ranked</span>
                </div>

                {topSellers.length === 0 ? (
                  <div className="text-center py-10 text-neutral-500 text-xs font-mono">
                    Ee date lo orders emi record avvaledu. Header lo date marchandi!
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto no-scrollbar">
                    {topSellers.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07] hover:border-[#D4AF37]/40 transition flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-black text-xs ${
                            idx === 0 
                              ? 'bg-gradient-to-r from-[#FCF6BA] to-[#D4AF37] text-black shadow-[0_0_12px_rgba(212,175,55,0.5)]'
                              : idx === 1
                              ? 'bg-neutral-300 text-black font-bold'
                              : idx === 2
                              ? 'bg-amber-800 text-white font-bold'
                              : 'bg-white/5 text-neutral-400 border border-white/10'
                          }`}>
                            #{idx + 1}
                          </span>

                          <div>
                            <h5 className="font-bold text-white text-xs leading-snug">{item.name}</h5>
                            <span className="text-[11px] font-mono text-neutral-400">
                              ₹{item.price.toFixed(2)} each
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-[#F3E5AB] text-xs block">
                            {item.quantity} sold
                          </span>
                          <span className="text-[11px] font-mono text-neutral-400">
                            ₹{item.revenue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Zero Sales Dishes */}
              <div className="p-5 rounded-3xl backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" /> Zero Sales Dishes (To Review)
                  </h4>
                  <span className="text-[11px] font-mono font-bold text-rose-400">{lowDemandDishes.length} Items</span>
                </div>

                <p className="text-[11px] text-neutral-400">
                  Ee dishes ee timeline lo okka sari kooda order avvaledu. Next menu redesign lo review cheyocchu.
                </p>

                {lowDemandDishes.length === 0 ? (
                  <div className="text-center py-10 text-emerald-400 text-xs font-mono">
                    Awesome! Anni dishes order ayyayi. Zero-sale dishes emi levu!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[460px] overflow-y-auto no-scrollbar">
                    {lowDemandDishes.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-rose-950/10 border border-rose-900/30 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500/60" />
                          <span className="font-bold text-neutral-300">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-neutral-500">₹{item.price.toFixed(2)}</span>
                          <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                            0 Orders
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MENU EDITS */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCatId('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCatId === 'all' 
                    ? 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black shadow-md' 
                    : 'bg-white/[0.03] text-neutral-400 border border-white/[0.06]'
                }`}
              >
                All Categories ({menuItems.length})
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCatId(c.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedCatId === c.id 
                      ? 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black shadow-md' 
                      : 'bg-white/[0.03] text-neutral-400 border border-white/[0.06]'
                  }`}
                >
                  {c.name_en || c.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMenuItems.map(item => (
                <div key={item.id} className="p-4 rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white text-sm">{item.name_en}</h4>
                    <span className="font-mono text-[#F3E5AB] font-bold text-xs">₹{item.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
                        loadAdminData();
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                        item.is_available 
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {item.is_available ? 'In Stock' : 'Out'}
                    </button>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-200 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Edit Dish Modal */}
            <AnimatePresence>
              {editingItem && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-sm bg-[#0c0c10] border border-[#D4AF37]/30 rounded-3xl p-5 space-y-3 shadow-2xl"
                  >
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <h3 className="font-bold text-white text-sm">Edit Dish: {editingItem.name_en}</h3>
                      <button onClick={() => setEditingItem(null)}><X className="w-4 h-4 text-neutral-400" /></button>
                    </div>
                    <form onSubmit={handleUpdateMenuItem} className="space-y-3 text-xs">
                      <div>
                        <label className="text-neutral-400 block mb-1">Dish Name</label>
                        <input
                          type="text"
                          value={editingItem.name_en}
                          onChange={(e) => setEditingItem({ ...editingItem, name_en: e.target.value })}
                          className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-400 block mb-1">Price (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingItem.price}
                          onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                          className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <motion.button 
                        whileTap={{ scale: 0.98 }}
                        type="submit" 
                        className="w-full py-2.5 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase rounded-xl transition"
                      >
                        Save Changes
                      </motion.button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* TAB 5: BANNERS */}
        {activeTab === 'banners' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-3xl backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#D4AF37]" /> {editingBanner ? 'Edit Promo Banner' : 'Create New Banner'}
              </h3>
              <form onSubmit={handleSaveBanner} className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Banner Title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                />
                <input
                  type="url"
                  required
                  placeholder="Image URL"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                />
                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  className="w-full py-2.5 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase rounded-xl transition"
                >
                  {editingBanner ? 'Update Banner' : 'Deploy Banner'}
                </motion.button>
              </form>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {banners.map(b => (
                <div key={b.id} className="rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden p-3 flex flex-col justify-between">
                  <div className="h-28 rounded-xl overflow-hidden mb-2">
                    <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-bold text-white text-xs mb-2">{b.title}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingBanner(b); setNewTitle(b.title); setNewImageUrl(b.image_url); }}
                      className="flex-1 py-1.5 bg-white/[0.08] text-white text-xs rounded-lg font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(b.id)}
                      className="p-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}