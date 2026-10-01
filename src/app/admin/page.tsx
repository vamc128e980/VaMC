// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AdminSecurityModal from '@/components/AdminSecurityModal';
import WaiterSecurityModal from '@/components/WaiterSecurityModal';
import PinGameConfigModal from '@/components/PinGameConfigModal';
import PinFlashModal from '@/components/PinFlashModal';
import { useRouter } from 'next/navigation';

import { 
  ShieldCheck, 
  Trash2, 
  Plus, 
  RefreshCw, 
  DollarSign, 
  LayoutGrid, 
  Receipt, 
  UtensilsCrossed, 
  BarChart3, 
  Check, 
  X, 
  Edit3, 
  Clock, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  AlertTriangle, 
  User, 
  KeyRound, 
  LogOut, 
  RotateCcw, 
  Store, 
  UserCheck, 
  ImageIcon, 
  Zap, 
  SlidersHorizontal 
} from 'lucide-react';

const iosSpring = {
  type: 'spring',
  stiffness: 440,
  damping: 32,
  mass: 0.8
};

const iosModalSpring = {
  type: 'spring',
  stiffness: 380,
  damping: 28,
  mass: 0.9
};

export default function LuxuryGoldAdminPanel() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'customers' | 'insights' | 'menu' | 'banners'>('tables');

  // Dynamic Brand State
  const [shopName, setShopName] = useState('VAMC LUXURY DINING');
  const [tagline, setTagline] = useState('ROYAL FINE-DINE OPERATIONS');
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [tempBrandName, setTempBrandName] = useState('');
  const [tempTagline, setTempTagline] = useState('');

  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals Trigger States
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [isPinGameModalOpen, setIsPinGameModalOpen] = useState(false);
  const [isFlashModalOpen, setIsFlashModalOpen] = useState(false);

  // Table Management State
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');

  // Banner State
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerImageUrl, setNewBannerImageUrl] = useState('');
  const [editingBanner, setEditingBanner] = useState<any | null>(null);

  // Calendar State
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calViewDate, setCalViewDate] = useState<Date>(new Date());
  const calRef = useRef<HTMLDivElement>(null);

  // Solid Persistent Auth Guard
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rawCookies = document.cookie || '';
    const hasAdminCookie = rawCookies.split(';').some(c => c.trim().startsWith('staff_role=admin'));
    const localRole = localStorage.getItem('staff_role');

    if (hasAdminCookie || localRole === 'admin') {
      if (!hasAdminCookie) {
        document.cookie = 'staff_role=admin; path=/; max-age=86400; SameSite=Lax';
      }
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      window.location.replace('/login');
    }
  }, []);

  const loadBrandSettings = async () => {
    try {
      const { data } = await supabase.from('restaurant_settings').select('*').eq('id', 1).single();
      if (data) {
        if (data.restaurant_name) setShopName(data.restaurant_name);
        if (data.tagline) setTagline(data.tagline);
      }
    } catch (err) {
      console.error('Settings load err:', err);
    }
  };

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
      if (bnrs) setBanners(bnrs);
    } catch (err) {
      console.error('Admin Load Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Safe Realtime Listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    loadBrandSettings();
    loadAdminData();

    const channel = supabase
      .channel(`admin-sync-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_settings' }, () => loadBrandSettings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_banners' }, () => loadAdminData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempBrandName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('restaurant_settings').upsert({
        id: 1,
        restaurant_name: tempBrandName.trim().toUpperCase(),
        tagline: tempTagline.trim() || 'ROYAL FINE-DINE OPERATIONS',
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      setShopName(tempBrandName.trim().toUpperCase());
      setTagline(tempTagline.trim() || 'ROYAL FINE-DINE OPERATIONS');
      setIsNameModalOpen(false);
    } catch (err: any) {
      alert('Brand update failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFloor = async () => {
    if (!confirm('Active tables annitini VACANT (0 Occupied) ga reset cheyala?')) return;
    setLoading(true);
    try {
      await supabase.from('table_sessions').update({ status: 'completed', payment_status: 'paid' }).eq('status', 'active');
      await supabase.from('restaurant_tables').update({ status: 'available' });
      await loadAdminData();
      alert('Floor reset aindi! Tables anni Vacant aipoyayi.');
    } catch (err: any) {
      alert('Reset error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Complete Clean Logout (Clears everything & Redirects to Home /)
  const handleLogout = () => {
    document.cookie = 'staff_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    if (typeof window !== 'undefined') {
      localStorage.removeItem('staff_role');
      localStorage.removeItem('staff_name');
    }
    window.location.replace('/');
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerTitle.trim() || !newBannerImageUrl.trim()) return alert('Details ivvandi.');
    setLoading(true);
    try {
      const payload = { title: newBannerTitle.trim(), image_url: newBannerImageUrl.trim(), is_active: true };
      if (editingBanner) {
        await supabase.from('promo_banners').update(payload).eq('id', editingBanner.id);
        setEditingBanner(null);
      } else {
        await supabase.from('promo_banners').insert(payload);
      }
      setNewBannerTitle('');
      setNewBannerImageUrl('');
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
      await loadAdminData();
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    }
  };

  const [selectedCatId, setSelectedCatId] = useState<number | 'all'>('all');
  const [editingItem, setEditingItem] = useState<any | null>(null);

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

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const tNum = parseInt(newTableNumber);
    const tCap = parseInt(newTableCapacity) || 4;
    if (!tNum || tNum <= 0) return alert('Valid Table Number ivvandi.');
    if (tables.some(t => t.table_number === tNum)) return alert(`Table #${tNum} already undi!`);

    try {
      setLoading(true);
      await supabase.from('restaurant_tables').insert({ table_number: tNum, capacity: tCap, status: 'available' });
      setNewTableNumber('');
      setShowAddTableModal(false);
      await loadAdminData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (tableNum: number, isOccupied: boolean) => {
    if (isOccupied) return alert(`Table #${tableNum} active ga undi.`);
    if (!confirm(`Table #${tableNum} ni DELETE cheyala?`)) return;
    try {
      setLoading(true);
      await supabase.from('restaurant_tables').delete().eq('table_number', tableNum);
      await loadAdminData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearTable = async (tableNum: number) => {
    if (!confirm(`Table #${tableNum} ni CLEAR cheyala?`)) return;
    try {
      setLoading(true);
      await supabase.from('table_sessions').update({ status: 'completed', payment_status: 'paid' }).eq('table_number', tableNum).eq('status', 'active');
      await supabase.from('restaurant_tables').update({ status: 'available' }).eq('table_number', tableNum);
      await loadAdminData();
    } catch (err: any) {
      alert('Clear error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(s => formatDateOnly(s.created_at) === selectedDate);
  const filteredSessionIds = new Set(filteredSessions.map(s => s.id));

  const getSessionOrderedItems = (sessionId: string) => {
    const items = orderItems.filter(oi => oi.session_id === sessionId && oi.item_status !== 'cancelled');
    return items.map(oi => ({
      name: oi.menu_items?.name_en || 'Item #' + oi.menu_item_id,
      quantity: oi.quantity || 1,
      price: Number(oi.unit_price || oi.menu_items?.price || 0)
    }));
  };

  const productPerformanceMap: Record<number, { name: string; quantity: number; revenue: number; price: number }> = {};
  menuItems.forEach(mi => {
    productPerformanceMap[mi.id] = { name: mi.name_en || 'Dish #' + mi.id, quantity: 0, revenue: 0, price: Number(mi.price) || 0 };
  });

  orderItems.forEach(oi => {
    if (filteredSessionIds.has(oi.session_id) && oi.item_status !== 'cancelled') {
      const mId = oi.menu_item_id;
      const qty = Number(oi.quantity) || 1;
      const price = Number(oi.unit_price || oi.menu_items?.price) || 0;
      if (!productPerformanceMap[mId]) {
        productPerformanceMap[mId] = { name: oi.menu_items?.name_en || 'Dish #' + mId, quantity: 0, revenue: 0, price };
      }
      productPerformanceMap[mId].quantity += qty;
      productPerformanceMap[mId].revenue += qty * price;
    }
  });

  const rankedDishes = Object.entries(productPerformanceMap).map(([id, stats]) => ({ id: Number(id), ...stats })).sort((a, b) => b.quantity - a.quantity);
  const topSellers = rankedDishes.filter(d => d.quantity > 0);
  const lowDemandDishes = rankedDishes.filter(d => d.quantity === 0);

  const activeSessions = sessions.filter(s => s.status === 'active');
  const filteredRevenue = filteredSessions.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  const paidOrdersCount = filteredSessions.filter(s => s.status === 'completed').length;
  const filteredMenuItems = selectedCatId === 'all' ? menuItems : menuItems.filter(m => m.category_id === selectedCatId);

  const renderCalendarDays = () => {
    const year = calViewDate.getFullYear();
    const month = calViewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(<div key={'empty-' + i} className="h-8 w-8" />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const isToday = getTodayStr() === dateStr;
      days.push(
        <button
          key={d}
          onClick={() => { setSelectedDate(dateStr); setShowCalendar(false); }}
          className={`h-8 w-8 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center relative ${
            isSelected
              ? 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black shadow-lg font-black scale-105'
              : isToday
              ? 'border border-[#D4AF37] text-[#F3E5AB] bg-[#D4AF37]/10'
              : 'text-[#F3E5AB]/80 hover:bg-[#D4AF37]/15 hover:text-[#F3E5AB]'
          }`}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
        <span className="text-[#D4AF37] font-mono text-xs tracking-widest uppercase">
          Verifying Access...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black text-[#F3E5AB] font-sans pb-32 relative overflow-x-hidden selection:bg-[#D4AF37] selection:text-black antialiased">
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_70%)] blur-[150px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-10 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(212,175,55,0.08)_0%,transparent_70%)] blur-[140px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-2xl border-b border-[#D4AF37]/30 px-4 sm:px-6 py-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.95)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={iosSpring}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] p-0.5 shadow-[0_0_20px_rgba(212,175,55,0.35)] shrink-0"
            >
              <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#F3E5AB]" />
              </div>
            </motion.div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-widest text-black uppercase bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] px-2.5 py-0.5 rounded-full shadow-sm">
                  ROYAL CONSOLE
                </span>
                <h1 className="text-sm sm:text-base font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#FCF6BA] via-[#F3E5AB] to-[#D4AF37] uppercase truncate max-w-[200px] sm:max-w-none">
                  {shopName}
                </h1>
              </div>
              <p className="text-[10px] font-mono text-[#D4AF37]/80 mt-0.5">{tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 relative">
            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={iosSpring}
              onClick={() => {
                setTempBrandName(shopName);
                setTempTagline(tagline);
                setIsNameModalOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D4AF37]/40 bg-black hover:bg-[#D4AF37]/15 text-[#F3E5AB] text-xs font-mono font-bold transition shadow-sm"
            >
              <Store className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Edit Name</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={iosSpring}
              onClick={handleResetFloor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D4AF37]/40 bg-black hover:bg-[#D4AF37]/15 text-[#F3E5AB] text-xs font-mono font-bold transition shadow-sm"
              title="Reset all tables to vacant"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Reset Floor</span>
              <span>(0/{tables.length})</span>
            </motion.button>

            {/* Calendar */}
            <div className="relative" ref={calRef}>
              <motion.button
                whileTap={{ scale: 0.94 }}
                transition={iosSpring}
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D4AF37]/50 bg-black text-[#F3E5AB] text-xs font-mono font-black shadow-md hover:border-[#D4AF37]"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{selectedDate}</span>
              </motion.button>

              <AnimatePresence>
                {showCalendar && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 8 }}
                    transition={iosModalSpring}
                    className="absolute right-0 top-11 w-72 bg-black/95 backdrop-blur-3xl border border-[#D4AF37]/60 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,1)] z-50 select-none"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/25 mb-3">
                      <button onClick={() => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1))}>
                        <ChevronLeft className="w-4 h-4 text-[#F3E5AB]" />
                      </button>
                      <span className="text-xs font-black text-[#F3E5AB] uppercase tracking-wider">
                        {calViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 1))}>
                        <ChevronRight className="w-4 h-4 text-[#F3E5AB]" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 place-items-center">
                      {renderCalendarDays()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button 
              whileTap={{ scale: 0.92 }}
              transition={iosSpring}
              onClick={loadAdminData} 
              className="p-2 rounded-xl border border-[#D4AF37]/40 bg-black text-[#F3E5AB] hover:bg-[#D4AF37]/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FCF6BA]' : ''}`} />
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.92 }}
              transition={iosSpring}
              onClick={handleLogout} 
              className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 transition" 
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div 
            whileHover={{ y: -2 }}
            transition={iosSpring}
            className="p-5 rounded-3xl bg-black backdrop-blur-2xl border border-[#D4AF37]/35 shadow-[0_8px_30px_rgba(0,0,0,0.9)] flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-mono font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1">
                Day Sales ({selectedDate})
              </span>
              <h3 className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#FCF6BA] via-[#F3E5AB] to-[#D4AF37] mt-1 drop-shadow-sm">
                ₹{filteredRevenue.toFixed(2)}
              </h3>
              <span className="text-[11px] text-[#F3E5AB] font-semibold flex items-center gap-1 mt-1 font-mono">
                <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" /> {paidOrdersCount} Paid Orders Settled
              </span>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] p-0.5 shadow-[0_0_25px_rgba(212,175,55,0.3)]">
              <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#F3E5AB]" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -2 }}
            transition={iosSpring}
            className="p-5 rounded-3xl bg-black backdrop-blur-2xl border border-[#D4AF37]/35 shadow-[0_8px_30px_rgba(0,0,0,0.9)] flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-mono font-bold text-[#D4AF37] uppercase tracking-wider">Active Tables</span>
              <h3 className="text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#FCF6BA] via-[#F3E5AB] to-[#D4AF37] mt-1 drop-shadow-sm">
                {activeSessions.length} / {tables.length}
              </h3>
              <span className="text-[11px] text-[#F3E5AB] font-semibold flex items-center gap-1 mt-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" /> Live Seated Customers
              </span>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] p-0.5 shadow-[0_0_25px_rgba(212,175,55,0.3)]">
              <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center">
                <LayoutGrid className="w-6 h-6 text-[#F3E5AB]" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Action Tabs & Dedicated Buttons */}
        <div className="p-1.5 rounded-3xl bg-black/95 backdrop-blur-3xl border border-[#D4AF37]/35 w-full shadow-[0_10px_40px_rgba(0,0,0,0.9)] flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: 'tables', label: 'Tables Ops', icon: LayoutGrid },
              { id: 'customers', label: 'Order History', icon: Receipt },
              { id: 'insights', label: 'Dish Demand', icon: BarChart3 },
              { id: 'menu', label: 'Menu Edits', icon: UtensilsCrossed },
              { id: 'banners', label: 'Promo Banners Studio', icon: ImageIcon },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.95 }}
                  transition={iosSpring}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap select-none ${
                    isActive ? 'text-black' : 'text-[#F3E5AB]/70 hover:text-[#F3E5AB]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeAdminPill"
                      className="absolute inset-0 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.45)]"
                      transition={iosSpring}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-[#D4AF37]/30 shrink-0 mx-1" />

          {/* Quick Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={iosSpring}
              onClick={() => setIsPinGameModalOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-black border border-[#D4AF37]/50 text-[#F3E5AB] font-black text-xs uppercase font-mono tracking-wider flex items-center gap-2 hover:bg-[#D4AF37]/15 transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>PIN Game</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={iosSpring}
              onClick={() => setIsFlashModalOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-black border border-[#D4AF37]/50 text-[#F3E5AB] font-black text-xs uppercase font-mono tracking-wider flex items-center gap-2 hover:bg-[#D4AF37]/15 transition"
            >
              <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Flash</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={iosSpring}
              onClick={() => setIsSecurityOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-black border border-[#D4AF37]/40 text-[#F3E5AB] font-black text-xs uppercase font-mono tracking-wider flex items-center gap-2 hover:bg-[#D4AF37]/15 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Security</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              transition={iosSpring}
              onClick={() => setIsWaiterModalOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-black border border-[#D4AF37]/40 text-[#F3E5AB] font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-2 hover:bg-[#D4AF37]/15 transition"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Waiter</span>
            </motion.button>
          </div>
        </div>

        {/* TAB 1: Tables Operations */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#F3E5AB] uppercase tracking-wider flex items-center gap-2 font-mono">
                <Receipt className="w-4 h-4 text-[#D4AF37]" /> Live Tables ({tables.length} Total)
              </h2>

              <motion.button
                whileTap={{ scale: 0.94 }}
                transition={iosSpring}
                onClick={() => setShowAddTableModal(true)}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(212,175,55,0.35)]"
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
                    whileHover={{ y: -3 }}
                    transition={iosSpring}
                    className={`p-5 rounded-3xl backdrop-blur-2xl border transition-all duration-300 relative overflow-hidden bg-black ${
                      isOccupied 
                        ? 'border-[#D4AF37] shadow-[0_8px_30px_rgba(212,175,55,0.2)]' 
                        : 'border-[#D4AF37]/20 hover:border-[#D4AF37]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#FCF6BA]">Table #{t.table_number}</span>
                        <span className="text-xs text-[#D4AF37]/80 font-mono">({t.capacity || 4} Seats)</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isOccupied 
                            ? 'bg-[#D4AF37]/20 text-[#FCF6BA] border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.3)] animate-pulse' 
                            : 'bg-black text-[#D4AF37]/50 border-[#D4AF37]/20'
                        }`}>
                          {isOccupied ? 'Occupied' : 'Vacant'}
                        </span>

                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          transition={iosSpring}
                          onClick={() => handleDeleteTable(t.table_number, isOccupied)}
                          className="p-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>

                    {isOccupied ? (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-2xl bg-black border border-[#D4AF37]/35 text-xs space-y-1.5 font-mono">
                          <div className="flex justify-between text-[#D4AF37]/80">
                            <span>Guest:</span>
                            <span className="font-bold text-[#FCF6BA]">{activeSession.customer_name || 'Guest'}</span>
                          </div>
                          <div className="flex justify-between text-[#D4AF37]/80">
                            <span>Seated At:</span>
                            <span className="text-[#F3E5AB]">{formatDateTime(activeSession.created_at)}</span>
                          </div>
                          <div className="flex justify-between text-[#D4AF37]/80 pt-1.5 border-t border-[#D4AF37]/25">
                            <span className="font-bold text-[#F3E5AB]">Current Bill:</span>
                            <span className="text-[#FCF6BA] font-black text-sm">₹{Number(activeSession.total_amount || 0).toFixed(2)}</span>
                          </div>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          transition={iosSpring}
                          onClick={() => handleClearTable(t.table_number)}
                          className="w-full py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-black uppercase tracking-wider shadow-md"
                        >
                          Clear Table & Settle Bill
                        </motion.button>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-[#D4AF37]/40 font-mono">
                        Ready for next guest order
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Customer History */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-black border border-[#D4AF37]/40 flex justify-between items-center shadow-lg">
              <h3 className="font-black text-[#FCF6BA] text-base flex items-center gap-2">
                <User className="w-5 h-5 text-[#D4AF37]" />
                Customer Dining History ({selectedDate})
              </h3>
              <span className="font-mono text-base font-black text-[#FCF6BA]">
                {filteredSessions.length} Receipts • ₹{filteredRevenue.toFixed(2)}
              </span>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="text-center py-16 text-[#D4AF37]/50 text-xs font-mono">
                No customer receipts for this date.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSessions.map(session => {
                  const items = getSessionOrderedItems(session.id);
                  return (
                    <motion.div 
                      key={session.id} 
                      whileHover={{ y: -2 }}
                      transition={iosSpring}
                      className="p-5 rounded-3xl bg-black border border-[#D4AF37]/30 space-y-3 shadow-md"
                    >
                      <div className="flex justify-between border-b border-[#D4AF37]/20 pb-2">
                        <span className="bg-gradient-to-r from-[#FCF6BA] to-[#D4AF37] text-black font-black text-xs px-2.5 py-0.5 rounded-lg">
                          Table #{session.table_number}
                        </span>
                        <span className="text-[11px] font-mono text-[#D4AF37]/70">
                          {formatDateTime(session.created_at)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-[#FCF6BA]">{session.customer_name || 'Walk-in Guest'}</span>
                        <span className="text-[#D4AF37]/80 font-mono">{session.customer_phone || 'No Phone'}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-black border border-[#D4AF37]/20 space-y-1 text-xs font-mono">
                        {items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[#F3E5AB]">
                            <span>{it.quantity}x {it.name}</span>
                            <span>₹{(it.quantity * it.price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-[#F3E5AB] font-black text-sm pt-1 border-t border-dashed border-[#D4AF37]/25 font-mono">
                        <span>Total Paid:</span>
                        <span className="text-base text-[#FCF6BA]">₹{Number(session.total_amount || 0).toFixed(2)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Demand Insights */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded-3xl bg-black border border-[#D4AF37]/35 space-y-4 shadow-lg">
                <h4 className="font-black text-[#FCF6BA] text-xs uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#D4AF37]" /> Best Sellers
                </h4>
                <div className="space-y-2 max-h-[500px] overflow-y-auto no-scrollbar">
                  {topSellers.map((item) => (
                    <div key={item.id} className="p-3.5 rounded-2xl bg-black border border-[#D4AF37]/25 flex justify-between items-center">
                      <div>
                        <h5 className="font-bold text-[#FCF6BA] text-xs">{item.name}</h5>
                        <span className="text-[11px] font-mono text-[#D4AF37]/80">₹{item.price.toFixed(2)} each</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-[#FCF6BA] text-xs block">{item.quantity} sold</span>
                        <span className="text-[11px] font-mono text-[#D4AF37]/80">₹{item.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-black border border-[#D4AF37]/35 space-y-4 shadow-lg">
                <h4 className="font-black text-[#F3E5AB] text-xs uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#D4AF37]" /> Low Demand Dishes
                </h4>
                <div className="space-y-2 max-h-[460px] overflow-y-auto no-scrollbar">
                  {lowDemandDishes.map((item) => (
                    <div key={item.id} className="p-3 rounded-2xl bg-black border border-[#D4AF37]/20 flex justify-between text-xs">
                      <span className="text-[#F3E5AB]/80">{item.name}</span>
                      <span className="font-mono text-[#D4AF37]/60">₹{item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Menu Items */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMenuItems.map(item => (
                <div key={item.id} className="p-4 rounded-2xl bg-black border border-[#D4AF37]/30 flex justify-between items-center shadow-md">
                  <div>
                    <h4 className="font-bold text-[#FCF6BA] text-sm">{item.name_en}</h4>
                    <span className="font-mono text-[#D4AF37] font-bold text-xs">₹{item.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
                        loadAdminData();
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                        item.is_available ? 'bg-[#D4AF37]/20 text-[#FCF6BA] border-[#D4AF37]' : 'bg-black text-[#D4AF37]/50 border-[#D4AF37]/20'
                      }`}
                    >
                      {item.is_available ? 'In Stock' : 'Out'}
                    </button>
                    <button onClick={() => setEditingItem(item)} className="p-1.5 rounded-lg bg-black border border-[#D4AF37]/30">
                      <Edit3 className="w-3.5 h-3.5 text-[#FCF6BA]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Promo Studio */}
        {activeTab === 'banners' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-3xl bg-black border border-[#D4AF37]/35 space-y-3 shadow-lg">
              <h3 className="font-bold text-[#FCF6BA] text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#D4AF37]" /> {editingBanner ? 'Edit Promo Banner' : 'Create Promo Banner'}
              </h3>
              <form onSubmit={handleSaveBanner} className="space-y-3 text-xs">
                <div>
                  <label className="text-[#F3E5AB] block mb-1">Banner Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Chef Weekend Special"
                    value={newBannerTitle}
                    onChange={(e) => setNewBannerTitle(e.target.value)}
                    className="w-full bg-black border border-[#D4AF37]/40 rounded-xl px-3 py-2 text-[#FCF6BA] outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-[#F3E5AB] block mb-1">Image URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={newBannerImageUrl}
                    onChange={(e) => setNewBannerImageUrl(e.target.value)}
                    className="w-full bg-black border border-[#D4AF37]/40 rounded-xl px-3 py-2 text-[#FCF6BA] outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase rounded-xl transition shadow-[0_0_20px_rgba(212,175,55,0.35)]"
                >
                  {editingBanner ? 'Update Banner' : 'Deploy Banner to Customers'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {banners.map(b => (
                <div key={b.id} className="rounded-2xl bg-black border border-[#D4AF37]/30 overflow-hidden p-3 flex flex-col justify-between shadow-md">
                  <div className="h-28 rounded-xl overflow-hidden mb-2 bg-black border border-[#D4AF37]/20">
                    <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-bold text-[#FCF6BA] text-xs mb-2">{b.title}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingBanner(b);
                        setNewBannerTitle(b.title);
                        setNewBannerImageUrl(b.image_url);
                      }}
                      className="flex-1 py-1.5 bg-black border border-[#D4AF37]/30 text-[#FCF6BA] text-xs rounded-lg font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(b.id)}
                      className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition"
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

      {/* Modals */}
      <AnimatePresence>
        {showAddTableModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={iosModalSpring}
              className="w-full max-w-sm bg-black border border-[#D4AF37]/60 rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,1)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#D4AF37]/30 pb-3">
                <h3 className="font-black text-[#FCF6BA] text-base flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#D4AF37]" /> Add New Dining Table
                </h3>
                <button onClick={() => setShowAddTableModal(false)} className="text-[#D4AF37] hover:text-[#FCF6BA]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddTable} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1">Table Number *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 11"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    className="w-full bg-black border border-[#D4AF37]/40 rounded-xl px-3.5 py-2.5 text-[#FCF6BA] font-mono outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1">Capacity</label>
                  <select
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                    className="w-full bg-black border border-[#D4AF37]/40 rounded-xl px-3.5 py-2.5 text-[#FCF6BA] outline-none"
                  >
                    <option value="2">2 Persons</option>
                    <option value="4">4 Persons (Standard)</option>
                    <option value="6">6 Persons (Family)</option>
                    <option value="8">8 Persons (Party)</option>
                  </select>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase text-xs shadow-[0_0_25px_rgba(212,175,55,0.35)]"
                >
                  Deploy Table
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNameModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={iosModalSpring}
              className="w-full max-w-md bg-black border border-[#D4AF37]/60 rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,1)] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#D4AF37]/30 pb-3">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#D4AF37]" />
                  <h3 className="font-black text-[#FCF6BA] text-base">Edit Restaurant Name</h3>
                </div>
                <button onClick={() => setIsNameModalOpen(false)} className="text-[#D4AF37] hover:text-[#FCF6BA]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBrand} className="space-y-4 text-xs">
                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1 uppercase font-mono text-[10px]">
                    Restaurant Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={tempBrandName}
                    onChange={(e) => setTempBrandName(e.target.value)}
                    className="w-full bg-black border border-[#D4AF37]/40 rounded-xl px-3.5 py-2.5 text-[#FCF6BA] font-bold outline-none uppercase focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1 uppercase font-mono text-[10px]">
                    Sub-Tagline / Operations
                  </label>
                  <input
                    type="text"
                    value={tempTagline}
                    onChange={(e) => setTempTagline(e.target.value)}
                    className="w-full bg-black border border-[#D4AF37]/40 rounded-xl px-3.5 py-2.5 text-[#FCF6BA] outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNameModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-black border border-[#D4AF37]/30 text-[#F3E5AB] font-bold hover:bg-[#D4AF37]/20"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={loading}
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase text-xs shadow-[0_0_20px_rgba(212,175,55,0.35)]"
                  >
                    Save & Publish
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AdminSecurityModal isOpen={isSecurityOpen} onClose={() => setIsSecurityOpen(false)} />
      <WaiterSecurityModal isOpen={isWaiterModalOpen} onClose={() => setIsWaiterModalOpen(false)} />
      <PinGameConfigModal isOpen={isPinGameModalOpen} onClose={() => setIsPinGameModalOpen(false)} />
      <PinFlashModal isOpen={isFlashModalOpen} onClose={() => setIsFlashModalOpen(false)} />
    </div>
  );
}