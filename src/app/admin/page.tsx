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
  SlidersHorizontal,
  FolderPlus,
  CheckCircle,
  XCircle,
  Tag,
  FileSpreadsheet,
  Phone,
  ShoppingBag,
  UploadCloud,
  PackagePlus,
  Image as ImgIcon
} from 'lucide-react';

// 90FPS High Refresh-Rate Optimized Springs
const fps90Spring = {
  type: 'spring',
  stiffness: 450,
  damping: 34,
  mass: 0.5
};

const fps90ModalSpring = {
  type: 'spring',
  stiffness: 400,
  damping: 32,
  mass: 0.6
};

const tabVariant = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.14, ease: 'easeIn' } }
};

export default function LuxuryGoldAdminPanel() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'tables' | 'menu' | 'combos' | 'banners' | 'insights' | 'history'>('tables');

  const [shopName, setShopName] = useState('VUJWALA SIMHA DRY FRUITS & JUICE POINT');
  const [tagline, setTagline] = useState('ROYAL FINE-DINE OPERATIONS');
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [tempBrandName, setTempBrandName] = useState('');
  const [tempTagline, setTempTagline] = useState('');

  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Modals
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [isPinGameModalOpen, setIsPinGameModalOpen] = useState(false);
  const [isFlashModalOpen, setIsFlashModalOpen] = useState(false);

  // Tables
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');

  // Categories
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  // Menu Items
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState<number | null>(null);
  const [itemFoodType, setItemFoodType] = useState<'veg' | 'non_veg'>('veg');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const itemFileRef = useRef<HTMLInputElement>(null);

  // Combos
  const [showComboModal, setShowComboModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<any | null>(null);
  const [comboName, setComboName] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [comboOriginalPrice, setComboOriginalPrice] = useState('');
  const [comboDescription, setComboDescription] = useState('');
  const [comboFoodType, setComboFoodType] = useState<'veg' | 'non_veg'>('veg');
  const [comboImageUrl, setComboImageUrl] = useState('');
  const comboFileRef = useRef<HTMLInputElement>(null);

  // Banners
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerImageUrl, setNewBannerImageUrl] = useState('');
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  // Calendar
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [isFilterAllDates, setIsFilterAllDates] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calViewDate, setCalViewDate] = useState<Date>(new Date());
  const calRef = useRef<HTMLDivElement>(null);

  const [selectedCatId, setSelectedCatId] = useState<number | 'all'>('all');

  // Auth Guard
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rawCookies = document.cookie || '';
    const cookies = rawCookies.split(';').map(c => c.trim());
    const roleCookie = cookies.find(c => c.startsWith('staff_role='));
    const cookieRole = roleCookie ? roleCookie.split('=')[1]?.toLowerCase() : null;
    const localRole = localStorage.getItem('staff_role')?.toLowerCase();
    const token = localStorage.getItem('session_token');

    const isValidAdmin = (cookieRole === 'admin' || localRole === 'admin') && token && token.startsWith('admin_verified_');

    if (isValidAdmin) {
      if (!cookieRole) {
        document.cookie = 'staff_role=admin; path=/; max-age=86400; SameSite=Lax';
      }
      setIsAuthenticated(true);
      setAuthChecking(false);
    } else {
      localStorage.removeItem('staff_role');
      localStorage.removeItem('staff_name');
      localStorage.removeItem('session_token');
      document.cookie = 'staff_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
      document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
      setIsAuthenticated(false);
      setAuthChecking(false);
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
      const { data: cats } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      const { data: itms } = await supabase.from('menu_items').select('*').order('id', { ascending: true });
      const { data: oitms } = await supabase.from('order_items').select('*, menu_items(name_en, price, category_id, image_url)');
      const { data: bnrs } = await supabase.from('promo_banners').select('*');
      const { data: cmbs } = await supabase.from('combos').select('*').order('id', { ascending: true });

      if (tbls) setTables(tbls);
      if (sess) setSessions(sess);
      if (cats) setCategories(cats);
      if (itms) setMenuItems(itms);
      if (cmbs) setCombos(cmbs);
      if (oitms) setOrderItems(oitms);
      if (bnrs) setBanners(bnrs);
    } catch (err) {
      console.error('Admin Load Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    loadBrandSettings();
    loadAdminData();

    const channel = supabase
      .channel(`admin-sync-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_settings' }, () => loadBrandSettings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combos' }, () => loadAdminData())
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
      const updatedName = tempBrandName.trim().toUpperCase();
      const updatedTagline = tempTagline.trim() || 'ROYAL FINE-DINE OPERATIONS';

      const { error } = await supabase.from('restaurant_settings').upsert({
        id: 1,
        restaurant_name: updatedName,
        tagline: updatedTagline,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      setShopName(updatedName);
      setTagline(updatedTagline);
      setIsNameModalOpen(false);
      await loadBrandSettings();
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

  const handleLogout = () => {
    document.cookie = 'staff_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    window.location.replace('/');
  };

  const handleTogglePaymentStatus = async (sessionId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await supabase.from('table_sessions').update({ payment_status: newStatus }).eq('id', sessionId);
      await loadAdminData();
    } catch (err: any) {
      alert('Payment update failed: ' + err.message);
    }
  };

  // Tables CRUD
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
    if (!confirm(`Table #${tableNum} ni CLEAR cheyala? Active bill settle aipothundi.`)) return;
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

  // CATEGORY SAVE FIX: Multi-column Safe Persistence + Instant State Update
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = categoryName.trim();
    if (!cleanName) return alert('Category Name enter cheyandi.');

    setLoading(true);
    try {
      if (editingCategory) {
        const { data, error } = await supabase
          .from('categories')
          .update({ 
            name_en: cleanName,
            name: cleanName,
            name_te: cleanName 
          })
          .eq('id', editingCategory.id)
          .select();

        if (error) throw error;
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name_en: cleanName, name: cleanName } : c));
      } else {
        const nextSort = (categories.length > 0 ? Math.max(...categories.map(c => Number(c.sort_order || 0))) : 0) + 1;
        const { data, error } = await supabase
          .from('categories')
          .insert({ 
            name_en: cleanName, 
            name: cleanName,
            name_te: cleanName,
            sort_order: nextSort 
          })
          .select();

        if (error) throw error;
        if (data && data[0]) {
          setCategories(prev => [...prev, data[0]]);
        }
      }

      setCategoryName('');
      setEditingCategory(null);
      setShowCategoryModal(false);
      await loadAdminData();
      alert(`Category "${cleanName}" success ga save aindi!`);
    } catch (err: any) {
      console.error('Category error:', err);
      alert('Category save error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: number, catName: string) => {
    if (!confirm(`"${catName}" category ni DELETE cheyala?`)) return;
    try {
      setLoading(true);
      await supabase.from('categories').delete().eq('id', catId);
      setCategories(prev => prev.filter(c => c.id !== catId));
      if (selectedCatId === catId) setSelectedCatId('all');
      await loadAdminData();
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper for PC File Upload to Base64
  const readFileToBase64 = (file: File, callback: (base64: string) => void) => {
    if (file.size > 3 * 1024 * 1024) {
      alert('Image file size 3MB kante thakkuva undali.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Menu Items CRUD with PC Image Upload
  const openAddItemModal = (catId?: number) => {
    setEditingItem(null);
    setItemName('');
    setItemPrice('');
    setItemDescription('');
    setItemCategoryId(catId || (categories.length > 0 ? categories[0].id : null));
    setItemFoodType('veg');
    setItemImageUrl('');
    setShowItemModal(true);
  };

  const openEditItemModal = (item: any) => {
    setEditingItem(item);
    setItemName(item.name_en || item.name || '');
    setItemPrice(String(item.price || ''));
    setItemDescription(item.description_en || item.description || '');
    setItemCategoryId(item.category_id);
    setItemFoodType(item.food_type || 'veg');
    setItemImageUrl(item.image_url || '');
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(itemPrice);
    if (!itemName.trim()) return alert('Item Name ivvandi.');
    if (!priceNum || priceNum <= 0) return alert('Valid Price ivvandi.');
    if (!itemCategoryId) return alert('Category select cheyandi.');

    setLoading(true);
    try {
      const payload = {
        name_en: itemName.trim(),
        name: itemName.trim(),
        price: priceNum,
        description_en: itemDescription.trim(),
        description: itemDescription.trim(),
        category_id: itemCategoryId,
        food_type: itemFoodType,
        image_url: itemImageUrl.trim(),
        is_available: true
      };

      if (editingItem) {
        await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
      } else {
        await supabase.from('menu_items').insert(payload);
      }

      setShowItemModal(false);
      setEditingItem(null);
      await loadAdminData();
    } catch (err: any) {
      alert('Item save error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: number, name: string) => {
    if (!confirm(`"${name}" dish ni DELETE cheyala?`)) return;
    try {
      await supabase.from('menu_items').delete().eq('id', itemId);
      await loadAdminData();
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    }
  };

  // Combos CRUD with PC Image Upload
  const openAddComboModal = () => {
    setEditingCombo(null);
    setComboName('');
    setComboPrice('');
    setComboOriginalPrice('');
    setComboDescription('');
    setComboFoodType('veg');
    setComboImageUrl('');
    setShowComboModal(true);
  };

  const openEditComboModal = (combo: any) => {
    setEditingCombo(combo);
    setComboName(combo.name || combo.name_en || '');
    setComboPrice(String(combo.price || ''));
    setComboOriginalPrice(String(combo.original_price || ''));
    setComboDescription(combo.description || combo.description_en || '');
    setComboFoodType(combo.food_type || 'veg');
    setComboImageUrl(combo.image_url || '');
    setShowComboModal(true);
  };

  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(comboPrice);
    const origPriceNum = parseFloat(comboOriginalPrice) || priceNum;
    if (!comboName.trim()) return alert('Combo Name ivvandi.');
    if (!priceNum || priceNum <= 0) return alert('Valid Combo Price ivvandi.');

    setLoading(true);
    try {
      const payload = {
        name: comboName.trim(),
        name_en: comboName.trim(),
        price: priceNum,
        original_price: origPriceNum,
        description: comboDescription.trim(),
        description_en: comboDescription.trim(),
        food_type: comboFoodType,
        image_url: comboImageUrl.trim(),
        is_available: true
      };

      if (editingCombo) {
        await supabase.from('combos').update(payload).eq('id', editingCombo.id);
      } else {
        await supabase.from('combos').insert(payload);
      }

      setShowComboModal(false);
      setEditingCombo(null);
      await loadAdminData();
    } catch (err: any) {
      alert('Combo save error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCombo = async (comboId: number, name: string) => {
    if (!confirm(`"${name}" combo ni DELETE cheyala?`)) return;
    try {
      await supabase.from('combos').delete().eq('id', comboId);
      await loadAdminData();
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    }
  };

  // Promo Banners CRUD
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerTitle.trim() || !newBannerImageUrl.trim()) return alert('Title mariyu Image ivvandi.');
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

  const filteredSessions = sessions.filter(s => {
    if (isFilterAllDates) return true;
    return formatDateOnly(s.created_at) === selectedDate;
  });

  const filteredSessionIds = new Set(filteredSessions.map(s => s.id));

  const getSessionOrderedItems = (sessionId: string) => {
    const items = orderItems.filter(oi => oi.session_id === sessionId && oi.item_status !== 'cancelled');
    return items.map(oi => ({
      name: oi.menu_items?.name_en || 'Item #' + oi.menu_item_id,
      quantity: oi.quantity || 1,
      price: Number(oi.unit_price || oi.menu_items?.price || 0)
    }));
  };

  // Today's Most Ordered Items
  const todayOrderedDishesMap: Record<number, { name: string; quantity: number; revenue: number; price: number; food_type: string; image_url: string }> = {};
  menuItems.forEach(mi => {
    todayOrderedDishesMap[mi.id] = { 
      name: mi.name_en || 'Dish #' + mi.id, 
      quantity: 0, 
      revenue: 0, 
      price: Number(mi.price) || 0,
      food_type: mi.food_type || 'veg',
      image_url: mi.image_url || ''
    };
  });

  orderItems.forEach(oi => {
    if (filteredSessionIds.has(oi.session_id) && oi.item_status !== 'cancelled') {
      const mId = oi.menu_item_id;
      const qty = Number(oi.quantity) || 1;
      const price = Number(oi.unit_price || oi.menu_items?.price) || 0;
      if (!todayOrderedDishesMap[mId]) {
        todayOrderedDishesMap[mId] = { 
          name: oi.menu_items?.name_en || 'Dish #' + mId, 
          quantity: 0, 
          revenue: 0, 
          price, 
          food_type: oi.menu_items?.food_type || 'veg',
          image_url: oi.menu_items?.image_url || ''
        };
      }
      todayOrderedDishesMap[mId].quantity += qty;
      todayOrderedDishesMap[mId].revenue += qty * price;
    }
  });

  const rankedTodayDishes = Object.entries(todayOrderedDishesMap)
    .map(([id, stats]) => ({ id: Number(id), ...stats }))
    .sort((a, b) => b.quantity - a.quantity);

  const todayTopSellers = rankedTodayDishes.filter(d => d.quantity > 0);
  const todayZeroOrders = rankedTodayDishes.filter(d => d.quantity === 0);

  const activeSessions = sessions.filter(s => s.status === 'active');
  const filteredRevenue = filteredSessions.reduce((sum, s) => {
    const gross = Number(s.total_amount) || 0;
    const disc = Number(s.discount_amount || s.discount) || 0;
    return sum + Math.max(0, gross - disc);
  }, 0);

  const paidOrdersCount = filteredSessions.filter(s => s.payment_status === 'paid' || s.status === 'completed').length;
  const filteredMenuItems = selectedCatId === 'all' ? menuItems : menuItems.filter(m => m.category_id === selectedCatId);

  const copyToGoogleSheets = () => {
    const headers = ['Date', 'Time', 'Table #', 'Customer Name', 'Phone', 'Ordered Dishes', 'Subtotal', 'Discount', 'Total Net Paid', 'Payment Status'];
    const rows = filteredSessions.map(s => {
      const d = new Date(s.created_at);
      const itemsList = getSessionOrderedItems(s.id).map(i => `${i.quantity}x ${i.name}`).join(', ');
      const gross = Number(s.total_amount) || 0;
      const disc = Number(s.discount_amount || s.discount) || 0;
      const netPaid = Math.max(0, gross - disc);

      return [
        d.toLocaleDateString('en-IN'),
        d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        s.table_number,
        s.customer_name || 'Guest',
        s.customer_phone || '-',
        `"${itemsList || 'None'}"`,
        s.subtotal || gross,
        disc,
        netPaid,
        s.payment_status || s.status
      ];
    });

    const tsvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const renderCalendarDays = () => {
    const year = calViewDate.getFullYear();
    const month = calViewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(<div key={'empty-' + i} className="h-8 w-8" />);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr && !isFilterAllDates;
      const isToday = getTodayStr() === dateStr;
      days.push(
        <button
          key={d}
          onClick={() => { setSelectedDate(dateStr); setIsFilterAllDates(false); setShowCalendar(false); }}
          className={`h-8 w-8 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center relative ${
            isSelected
              ? 'bg-[#D4AF37] text-black shadow-md font-black'
              : isToday
              ? 'border-2 border-[#D4AF37] text-[#FCF6BA] bg-[#D4AF37]/20'
              : 'text-[#FCF6BA]/80 hover:bg-[#D4AF37]/15 hover:text-[#FCF6BA]'
          }`}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  if (authChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-[3px] border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
        <span className="text-[#D4AF37] font-mono text-xs tracking-widest uppercase font-bold">
          Verifying Master Admin Credentials...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black text-[#FCF6BA] font-sans pb-32 relative overflow-x-hidden antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black border-b-[3px] border-[#D4AF37] px-4 sm:px-6 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black border-[3px] border-[#D4AF37] flex items-center justify-center shadow-lg shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-widest text-black uppercase bg-[#D4AF37] px-2.5 py-0.5 rounded-full">
                  ROYAL CONSOLE
                </span>
                <h1 className="text-sm sm:text-base font-black tracking-wide text-[#FCF6BA] uppercase truncate max-w-[200px] sm:max-w-none">
                  {shopName}
                </h1>
              </div>
              <p className="text-[10px] font-mono text-[#D4AF37] mt-0.5 font-bold">{tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 relative">
            <button
              onClick={() => {
                setTempBrandName(shopName);
                setTempTagline(tagline);
                setIsNameModalOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[3px] border-[#D4AF37] bg-black hover:bg-[#D4AF37]/20 text-[#FCF6BA] text-xs font-mono font-bold"
            >
              <Store className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Edit Name</span>
            </button>

            <button
              onClick={handleResetFloor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[3px] border-[#D4AF37] bg-black hover:bg-[#D4AF37]/20 text-[#FCF6BA] text-xs font-mono font-bold"
              title="Reset all tables to vacant"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Reset Floor</span>
              <span>(0/{tables.length})</span>
            </button>

            {/* Calendar */}
            <div className="relative" ref={calRef}>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[3px] border-[#D4AF37] bg-black text-[#FCF6BA] text-xs font-mono font-black shadow-md"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{isFilterAllDates ? 'All History' : selectedDate}</span>
              </button>

              <AnimatePresence>
                {showCalendar && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 8 }}
                    transition={fps90ModalSpring}
                    className="absolute right-0 top-11 w-72 bg-black border-[3px] border-[#D4AF37] rounded-3xl p-4 shadow-2xl z-50 select-none"
                  >
                    <div className="flex items-center justify-between pb-3 border-b-2 border-[#D4AF37]/30 mb-3">
                      <button onClick={() => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1))}>
                        <ChevronLeft className="w-4 h-4 text-[#FCF6BA]" />
                      </button>
                      <span className="text-xs font-black text-[#FCF6BA] uppercase tracking-wider">
                        {calViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 1))}>
                        <ChevronRight className="w-4 h-4 text-[#FCF6BA]" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 place-items-center">
                      {renderCalendarDays()}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-[#D4AF37]/30 text-[11px] font-bold">
                      <button onClick={() => { setSelectedDate(getTodayStr()); setIsFilterAllDates(false); setShowCalendar(false); }} className="text-[#FCF6BA] hover:underline font-mono">
                        Today
                      </button>
                      <button onClick={() => { setIsFilterAllDates(true); setShowCalendar(false); }} className="bg-[#D4AF37] text-black font-black px-2.5 py-1 rounded-xl text-[10px] uppercase shadow-sm">
                        All History
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={copyToGoogleSheets}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[3px] text-xs font-mono font-bold transition ${
                copySuccess ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-black border-[#D4AF37] text-[#FCF6BA] hover:bg-[#D4AF37]/20'
              }`}
            >
              {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-[#D4AF37]" />}
              <span>{copySuccess ? 'Copied TSV' : 'Sheets'}</span>
            </button>

            <button 
              onClick={loadAdminData} 
              className="p-2 rounded-xl border-[3px] border-[#D4AF37] bg-black text-[#FCF6BA] hover:bg-[#D4AF37]/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FCF6BA]' : ''}`} />
            </button>

            <button 
              onClick={handleLogout} 
              className="p-2 rounded-xl bg-black border-[3px] border-rose-500 text-rose-300 hover:bg-rose-950/40 cursor-pointer" 
              title="Logout to Main Panel"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-black border-[3px] border-[#D4AF37] shadow-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1">
                Net Sales ({isFilterAllDates ? 'All History' : selectedDate})
              </span>
              <h3 className="text-3xl font-black font-mono text-[#FCF6BA] mt-1">
                ₹{filteredRevenue.toFixed(2)}
              </h3>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1 font-mono">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> {paidOrdersCount} Paid Orders Settled
              </span>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-black border-[3px] border-[#D4AF37] flex items-center justify-center shadow-lg">
              <DollarSign className="w-6 h-6 text-[#D4AF37]" />
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-black border-[3px] border-[#D4AF37] shadow-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold text-[#D4AF37] uppercase tracking-wider">Active Tables Now</span>
              <h3 className="text-3xl font-black font-mono text-[#FCF6BA] mt-1">
                {activeSessions.length} / {tables.length}
              </h3>
              <span className="text-[11px] text-[#FCF6BA] font-semibold flex items-center gap-1 mt-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" /> Live Seated Customers
              </span>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-black border-[3px] border-[#D4AF37] flex items-center justify-center shadow-lg">
              <LayoutGrid className="w-6 h-6 text-[#D4AF37]" />
            </div>
          </div>
        </div>

        {/* Action Tabs Bar */}
        <div className="p-2 rounded-3xl bg-black border-[3px] border-[#D4AF37] w-full shadow-2xl flex items-center gap-2 overflow-x-auto custom-gold-scrollbar pb-3">
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: 'tables', label: '1. Table Ops', icon: LayoutGrid },
              { id: 'menu', label: '2. Menu Edits', icon: UtensilsCrossed },
              { id: 'combos', label: '3. Add Combos', icon: PackagePlus },
              { id: 'banners', label: '4. Promo Edits', icon: ImageIcon },
              { id: 'insights', label: "5. Today's Demand", icon: Flame },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 whitespace-nowrap select-none transition ${
                    isActive ? 'bg-[#D4AF37] text-black font-black shadow-md' : 'text-[#FCF6BA]/80 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="h-6 w-[2px] bg-[#D4AF37]/40 shrink-0 mx-1" />

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-2xl border-[3px] text-xs font-black uppercase font-mono tracking-wider flex items-center gap-2 transition ${
                activeTab === 'history' 
                  ? 'bg-[#D4AF37] text-black border-transparent shadow-md' 
                  : 'bg-black border-[#D4AF37] text-[#FCF6BA] hover:bg-[#D4AF37]/20'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Order History</span>
            </button>

            <button
              onClick={() => setIsPinGameModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-black border-[3px] border-[#D4AF37] text-[#FCF6BA] font-black text-xs uppercase font-mono tracking-wider flex items-center gap-2 hover:bg-[#D4AF37]/20 transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>PIN Game</span>
            </button>

            <button
              onClick={() => setIsFlashModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-black border-[3px] border-[#D4AF37] text-[#FCF6BA] font-black text-xs uppercase font-mono tracking-wider flex items-center gap-2 hover:bg-[#D4AF37]/20 transition"
            >
              <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Flash</span>
            </button>

            <button
              onClick={() => setIsSecurityOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-black border-[3px] border-[#D4AF37] text-[#FCF6BA] font-black text-xs uppercase font-mono tracking-wider flex items-center gap-2 hover:bg-[#D4AF37]/20 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Security</span>
            </button>

            <button
              onClick={() => setIsWaiterModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-black border-[3px] border-[#D4AF37] text-[#FCF6BA] font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-2 hover:bg-[#D4AF37]/20 transition"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Waiter</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <AnimatePresence mode="wait">
          {/* TAB 1: Tables Operations */}
          {activeTab === 'tables' && (
            <motion.div
              key="tables-tab"
              variants={tabVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-[#FCF6BA] uppercase tracking-wider flex items-center gap-2 font-mono">
                  <LayoutGrid className="w-4 h-4 text-[#D4AF37]" /> Live Floor Ops ({tables.length} Tables)
                </h2>

                <button
                  onClick={() => setShowAddTableModal(true)}
                  className="px-4 py-2 rounded-2xl bg-[#D4AF37] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Add Table
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map(t => {
                  const activeSession = sessions.find(s => s.table_number === t.table_number && s.status === 'active');
                  const isOccupied = !!activeSession;
                  const isPaid = activeSession?.payment_status === 'paid';
                  const discount = Number(activeSession?.discount_amount || activeSession?.discount || 0);
                  const grossBill = Number(activeSession?.total_amount || 0);
                  const finalPayableBill = Math.max(0, grossBill - discount);

                  return (
                    <div
                      key={t.id || t.table_number}
                      className={`p-5 rounded-3xl border-[3px] relative overflow-hidden bg-black ${
                        isOccupied 
                          ? (isPaid 
                              ? 'border-emerald-500 shadow-md' 
                              : 'border-rose-500 shadow-md') 
                          : 'border-[#D4AF37]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-[#FCF6BA]">Table #{t.table_number}</span>
                          <span className="text-xs text-[#D4AF37] font-mono">({t.capacity || 4} Seats)</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isOccupied && (
                            <button
                              onClick={() => handleTogglePaymentStatus(activeSession.id, activeSession.payment_status)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border-2 flex items-center gap-1 ${
                                isPaid 
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' 
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500 animate-pulse'
                              }`}
                              title="Click to toggle payment status"
                            >
                              {isPaid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              <span>{isPaid ? 'PAID' : 'NOT PAID'}</span>
                            </button>
                          )}

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border-2 ${
                            isOccupied 
                              ? 'bg-black text-[#FCF6BA] border-[#D4AF37]' 
                              : 'bg-black text-[#D4AF37]/50 border-[#D4AF37]/40'
                          }`}>
                            {isOccupied ? 'Occupied' : 'Vacant'}
                          </span>

                          <button
                            onClick={() => handleDeleteTable(t.table_number, isOccupied)}
                            className="p-1 rounded-lg bg-black border-2 border-rose-500/50 text-rose-300 hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isOccupied ? (
                        <div className="space-y-3">
                          <div className="p-3.5 rounded-2xl bg-black border-[3px] border-[#D4AF37]/50 text-xs space-y-1.5 font-mono">
                            <div className="flex justify-between text-[#D4AF37]">
                              <span>Guest:</span>
                              <span className="font-bold text-[#FCF6BA]">{activeSession.customer_name || 'Guest'}</span>
                            </div>
                            <div className="flex justify-between text-[#D4AF37]">
                              <span>Seated At:</span>
                              <span className="text-[#F3E5AB]">{formatDateTime(activeSession.created_at)}</span>
                            </div>
                            
                            {discount > 0 && (
                              <>
                                <div className="flex justify-between text-[#D4AF37] pt-1 border-t border-[#D4AF37]/25">
                                  <span>Gross Total:</span>
                                  <span className="text-[#F3E5AB]">₹{grossBill.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-400 font-bold">
                                  <span>Mystery PIN Discount:</span>
                                  <span>- ₹{discount.toFixed(2)}</span>
                                </div>
                              </>
                            )}

                            <div className="flex justify-between text-[#D4AF37] pt-1.5 border-t border-[#D4AF37]/40">
                              <span className="font-bold text-[#F3E5AB]">Net Current Bill:</span>
                              <span className="text-[#FCF6BA] font-black text-sm">₹{finalPayableBill.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTogglePaymentStatus(activeSession.id, activeSession.payment_status)}
                              className={`flex-1 py-2.5 rounded-xl border-[3px] text-xs font-black uppercase tracking-wider shadow-sm transition ${
                                isPaid 
                                  ? 'bg-black hover:bg-emerald-950/40 border-emerald-500 text-emerald-200' 
                                  : 'bg-black hover:bg-rose-950/40 border-rose-500 text-rose-200'
                              }`}
                            >
                              Mark As {isPaid ? 'NOT PAID' : 'PAID'}
                            </button>

                            <button
                              onClick={() => handleClearTable(t.table_number)}
                              className="px-4 py-2.5 rounded-xl bg-black border-[3px] border-[#D4AF37] hover:bg-[#D4AF37]/20 text-[#FCF6BA] text-xs font-black uppercase tracking-wider shadow-sm"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-[#D4AF37]/60 font-mono">
                          Ready for next guest order
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* TAB 2: Menu Edits with Live Images on Cards */}
          {activeTab === 'menu' && (
            <motion.div
              key="menu-tab"
              variants={tabVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <div className="p-5 rounded-3xl bg-black border-[3px] border-[#D4AF37] space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="font-black text-[#FCF6BA] text-sm uppercase tracking-wider font-mono">
                      Menu Categories ({categories.length})
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryName('');
                      setShowCategoryModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md"
                  >
                    <FolderPlus className="w-3.5 h-3.5 stroke-[3]" /> Add Category
                  </button>
                </div>

                <div className="flex gap-2.5 overflow-x-auto custom-gold-scrollbar pb-3 pt-1">
                  <button
                    onClick={() => setSelectedCatId('all')}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap border-[3px] shrink-0 ${
                      selectedCatId === 'all'
                        ? 'bg-[#D4AF37] text-black border-transparent font-black shadow-md'
                        : 'bg-black text-[#FCF6BA] border-[#D4AF37] hover:border-[#FCF6BA]'
                    }`}
                  >
                    All Items ({menuItems.length})
                  </button>

                  {categories.map((cat) => {
                    const isSelected = selectedCatId === cat.id;
                    const count = menuItems.filter(m => m.category_id === cat.id).length;

                    return (
                      <div
                        key={cat.id}
                        className={`flex items-center rounded-2xl border-[3px] px-3.5 py-1.5 gap-2 bg-black shrink-0 ${
                          isSelected 
                            ? 'border-[#FCF6BA] text-[#FCF6BA]' 
                            : 'border-[#D4AF37] text-[#F3E5AB]/90 hover:border-[#FCF6BA]'
                        }`}
                      >
                        <button
                          onClick={() => setSelectedCatId(cat.id)}
                          className="text-xs font-bold whitespace-nowrap select-none"
                        >
                          {cat.name_en || cat.name} ({count})
                        </button>

                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryName(cat.name_en || cat.name);
                            setShowCategoryModal(true);
                          }}
                          className="p-1 hover:text-[#FCF6BA] text-[#D4AF37]"
                          title="Edit Category Name"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name_en || cat.name)}
                          className="p-1 hover:text-rose-400 text-rose-400"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-[#FCF6BA] text-sm uppercase tracking-wider font-mono flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-[#D4AF37]" />
                    Dishes in {selectedCatId === 'all' ? 'All Categories' : (categories.find(c => c.id === selectedCatId)?.name_en || categories.find(c => c.id === selectedCatId)?.name)} ({filteredMenuItems.length})
                  </h3>

                  <button
                    onClick={() => openAddItemModal(selectedCatId === 'all' ? undefined : selectedCatId)}
                    className="px-4 py-2 rounded-2xl bg-[#D4AF37] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> Add Menu Item
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMenuItems.map(item => (
                    <div 
                      key={item.id} 
                      className="p-4 rounded-2xl bg-black border-[3px] border-[#D4AF37] flex items-center justify-between shadow-md gap-3"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {item.image_url ? (
                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#D4AF37]/50 shrink-0 bg-neutral-900">
                            <img src={item.image_url} alt={item.name_en} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl border border-[#D4AF37]/30 shrink-0 bg-neutral-950 flex items-center justify-center text-neutral-600">
                            <ImgIcon className="w-6 h-6" />
                          </div>
                        )}

                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.food_type === 'non_veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <h4 className="font-bold text-[#FCF6BA] text-sm truncate">{item.name_en || item.name}</h4>
                          </div>
                          <span className="font-mono text-[#D4AF37] font-bold text-xs mt-1 block">₹{Number(item.price).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={async () => {
                            await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
                            loadAdminData();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border-2 ${
                            item.is_available ? 'bg-black text-[#FCF6BA] border-[#D4AF37]' : 'bg-black text-[#D4AF37]/50 border-[#D4AF37]/40'
                          }`}
                        >
                          {item.is_available ? 'In Stock' : 'Out'}
                        </button>

                        <button 
                          onClick={() => openEditItemModal(item)} 
                          className="p-1.5 rounded-lg bg-black border-2 border-[#D4AF37] text-[#FCF6BA] hover:bg-[#D4AF37]/20"
                          title="Edit Dish"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          onClick={() => handleDeleteItem(item.id, item.name_en || item.name)} 
                          className="p-1.5 rounded-lg bg-black border-2 border-rose-500 text-rose-300 hover:bg-rose-950/40"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: Add Combos CRUD with PC Image Support */}
          {activeTab === 'combos' && (
            <motion.div
              key="combos-tab"
              variants={tabVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-[#FCF6BA] text-sm uppercase tracking-wider font-mono flex items-center gap-2">
                    <PackagePlus className="w-4 h-4 text-[#D4AF37]" />
                    Royal Combo Offers ({combos.length})
                  </h3>
                  <p className="text-xs text-[#D4AF37]/80 font-mono mt-0.5">
                    Create meal deals with uploaded images and crossed original pricing.
                  </p>
                </div>

                <button
                  onClick={openAddComboModal}
                  className="px-4 py-2 rounded-2xl bg-[#D4AF37] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Add New Combo
                </button>
              </div>

              {combos.length === 0 ? (
                <div className="text-center py-16 text-[#D4AF37]/60 text-xs font-mono bg-black rounded-3xl border-[3px] border-[#D4AF37]">
                  No combos created yet. Click "+ Add New Combo" to deploy your first package!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {combos.map(combo => (
                    <div 
                      key={combo.id} 
                      className="p-5 rounded-3xl bg-black border-[3px] border-[#D4AF37] flex flex-col justify-between shadow-md space-y-3"
                    >
                      <div>
                        {combo.image_url && (
                          <div className="h-32 rounded-2xl overflow-hidden border border-[#D4AF37]/40 mb-3 bg-neutral-900">
                            <img src={combo.image_url} alt={combo.name} className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${combo.food_type === 'non_veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <h4 className="font-bold text-[#FCF6BA] text-sm">{combo.name || combo.name_en}</h4>
                          </div>
                          <span className="text-[9px] uppercase font-mono font-black bg-[#D4AF37]/20 border border-[#D4AF37] text-[#FCF6BA] px-2 py-0.5 rounded-full">
                            COMBO DEAL
                          </span>
                        </div>

                        {combo.description && (
                          <p className="text-xs text-neutral-400 font-mono line-clamp-2">
                            {combo.description || combo.description_en}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-mono text-[#D4AF37] font-black text-base">
                            ₹{Number(combo.price).toFixed(2)}
                          </span>
                          {combo.original_price && Number(combo.original_price) > Number(combo.price) && (
                            <span className="font-mono text-neutral-500 line-through text-xs">
                              ₹{Number(combo.original_price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D4AF37]/25">
                        <button
                          onClick={async () => {
                            await supabase.from('combos').update({ is_available: !combo.is_available }).eq('id', combo.id);
                            loadAdminData();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border-2 ${
                            combo.is_available ? 'bg-black text-[#FCF6BA] border-[#D4AF37]' : 'bg-black text-[#D4AF37]/50 border-[#D4AF37]/40'
                          }`}
                        >
                          {combo.is_available ? 'In Stock' : 'Out'}
                        </button>

                        <button 
                          onClick={() => openEditComboModal(combo)} 
                          className="p-1.5 rounded-lg bg-black border-2 border-[#D4AF37] text-[#FCF6BA] hover:bg-[#D4AF37]/20"
                          title="Edit Combo"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          onClick={() => handleDeleteCombo(combo.id, combo.name || combo.name_en)} 
                          className="p-1.5 rounded-lg bg-black border-2 border-rose-500 text-rose-300 hover:bg-rose-950/40"
                          title="Delete Combo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: Promo Edits */}
          {activeTab === 'banners' && (
            <motion.div
              key="banners-tab"
              variants={tabVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="p-5 rounded-3xl bg-black border-[3px] border-[#D4AF37] space-y-3 shadow-lg">
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
                      className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3 py-2 text-[#FCF6BA] outline-none focus:border-[#FCF6BA]"
                    />
                  </div>

                  <div>
                    <label className="text-[#F3E5AB] block mb-1">Upload from PC (Local File)</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      ref={bannerFileRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) readFileToBase64(file, (b64) => setNewBannerImageUrl(b64));
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => bannerFileRef.current?.click()}
                      className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#D4AF37] bg-black text-[#FCF6BA] hover:bg-[#D4AF37]/15 flex items-center justify-center gap-2 font-mono text-xs cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                      <span>{newBannerImageUrl ? 'Change Selected PC Image' : 'Choose Image From PC'}</span>
                    </button>
                  </div>

                  <div>
                    <label className="text-[#F3E5AB] block mb-1">Or Paste Image URL</label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/... or data:image"
                      value={newBannerImageUrl}
                      onChange={(e) => setNewBannerImageUrl(e.target.value)}
                      className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3 py-2 text-[#FCF6BA] outline-none focus:border-[#FCF6BA] text-[11px]"
                    />
                  </div>

                  {newBannerImageUrl && (
                    <div className="h-28 rounded-xl overflow-hidden border-2 border-[#D4AF37] relative">
                      <img src={newBannerImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#D4AF37] text-black font-black uppercase rounded-xl shadow-md cursor-pointer"
                  >
                    {editingBanner ? 'Update Banner' : 'Deploy Banner to Customers'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {banners.map(b => (
                  <div 
                    key={b.id} 
                    className="rounded-2xl bg-black border-[3px] border-[#D4AF37] overflow-hidden p-3 flex flex-col justify-between shadow-md"
                  >
                    <div className="h-28 rounded-xl overflow-hidden mb-2 bg-black border-2 border-[#D4AF37]">
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
                        className="flex-1 py-1.5 bg-black border-[3px] border-[#D4AF37] text-[#FCF6BA] text-xs rounded-lg font-semibold hover:bg-[#D4AF37]/20"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(b.id)}
                        className="p-1.5 bg-black border-[3px] border-rose-500 text-rose-300 rounded-lg transition hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 5: Today's Most Ordered Items */}
          {activeTab === 'insights' && (
            <motion.div
              key="insights-tab"
              variants={tabVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-3xl bg-black border-[3px] border-[#D4AF37] space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b-2 border-[#D4AF37]/30 pb-3">
                    <h4 className="font-black text-[#FCF6BA] text-sm uppercase tracking-wider flex items-center gap-2">
                      <Flame className="w-4 h-4 text-[#D4AF37]" />
                      Today's Most Ordered Items ({isFilterAllDates ? 'All-Time' : selectedDate})
                    </h4>
                    <span className="text-[10px] font-mono text-[#D4AF37] font-bold">
                      {todayTopSellers.length} Ranked
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto custom-gold-scrollbar pr-1">
                    {todayTopSellers.length === 0 ? (
                      <div className="text-center py-10 text-neutral-500 font-mono text-xs">
                        No dishes ordered yet today. Orders will rank here live!
                      </div>
                    ) : (
                      todayTopSellers.map((item, idx) => (
                        <div 
                          key={item.id} 
                          className="p-3.5 rounded-2xl bg-black border-2 border-[#D4AF37] flex justify-between items-center"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-[#D4AF37] text-black font-mono font-black text-xs flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${item.food_type === 'non_veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                <h5 className="font-bold text-[#FCF6BA] text-xs">{item.name}</h5>
                              </div>
                              <span className="text-[11px] font-mono text-[#D4AF37] font-bold">₹{item.price.toFixed(2)} each</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-[#FCF6BA] text-xs block">{item.quantity} Ordered</span>
                            <span className="text-[11px] font-mono text-emerald-400 font-bold">₹{item.revenue.toFixed(2)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-black border-[3px] border-[#D4AF37] space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b-2 border-[#D4AF37]/30 pb-3">
                    <h4 className="font-black text-[#F3E5AB] text-sm uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#D4AF37]" />
                      Zero Demand Today (Untouched Items)
                    </h4>
                    <span className="text-[10px] font-mono text-neutral-400 font-bold">
                      {todayZeroOrders.length} Dishes
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[460px] overflow-y-auto custom-gold-scrollbar pr-1">
                    {todayZeroOrders.map((item) => (
                      <div key={item.id} className="p-3 rounded-2xl bg-black border-2 border-[#D4AF37]/40 flex justify-between text-xs">
                        <span className="text-[#F3E5AB]/80">{item.name}</span>
                        <span className="font-mono text-[#D4AF37]">₹{item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 6: Order History */}
          {activeTab === 'history' && (
            <motion.div
              key="history-tab"
              variants={tabVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-4"
            >
              <div className="p-5 rounded-3xl bg-black border-[3px] border-[#D4AF37] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div>
                  <h3 className="font-black text-[#FCF6BA] text-base flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#D4AF37]" />
                    Customer Dining History ({isFilterAllDates ? 'All History' : selectedDate})
                  </h3>
                  <p className="text-xs text-[#D4AF37] font-mono mt-1">
                    Customer name, mobile number, ordered items, mystery discounts, and net settlements.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#D4AF37] block">Total Receipts Billed</span>
                  <span className="font-mono text-base font-black text-[#FCF6BA]">
                    {filteredSessions.length} Receipts • ₹{filteredRevenue.toFixed(2)} Net
                  </span>
                </div>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="text-center py-16 text-[#D4AF37]/60 text-xs font-mono bg-black rounded-3xl border-[3px] border-[#D4AF37]">
                  No customer receipts found for this date. Select another date from the Gold Calendar!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSessions.map(session => {
                    const items = getSessionOrderedItems(session.id);
                    const discount = Number(session.discount_amount || session.discount || 0);
                    const gross = Number(session.total_amount || 0);
                    const netPaid = Math.max(0, gross - discount);
                    const itemsSubtotal = items.reduce((sum, it) => sum + (it.quantity * it.price), 0);
                    const isPaid = session.payment_status === 'paid' || session.status === 'completed';

                    return (
                      <div 
                        key={session.id} 
                        className="p-5 rounded-3xl bg-black border-[3px] border-[#D4AF37] space-y-3.5 shadow-md"
                      >
                        <div className="flex justify-between border-b-2 border-[#D4AF37]/30 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#D4AF37] text-black font-black text-xs px-2.5 py-0.5 rounded-lg">
                              Table #{session.table_number}
                            </span>
                            <button
                              onClick={() => handleTogglePaymentStatus(session.id, session.payment_status)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono border-2 ${
                                isPaid ? 'bg-black text-emerald-300 border-emerald-500' : 'bg-black text-rose-300 border-rose-500'
                              }`}
                            >
                              {isPaid ? 'PAID' : 'NOT PAID'}
                            </button>
                          </div>
                          <span className="text-[11px] font-mono text-[#D4AF37] font-bold">
                            {formatDateTime(session.created_at)}
                          </span>
                        </div>

                        <div className="flex justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span className="font-bold text-[#FCF6BA]">{session.customer_name || 'Walk-in Guest'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[#D4AF37]">
                            <Phone className="w-3 h-3 text-[#D4AF37]" />
                            <span>{session.customer_phone || 'No Phone'}</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-black border-2 border-[#D4AF37]/50 space-y-1 text-xs font-mono">
                          <span className="text-[10px] uppercase font-bold text-[#D4AF37] flex items-center gap-1 mb-1">
                            <ShoppingBag className="w-3 h-3 text-[#D4AF37]" /> Ordered Items ({items.length})
                          </span>
                          {items.length === 0 ? (
                            <div className="text-[11px] text-neutral-500 italic">No items recorded.</div>
                          ) : (
                            items.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-[#F3E5AB]">
                                <span>{it.quantity}x {it.name}</span>
                                <span>₹{(it.quantity * it.price).toFixed(2)}</span>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="pt-2 border-t-2 border-dashed border-[#D4AF37]/30 space-y-1 text-xs font-mono">
                          {discount > 0 && (
                            <>
                              <div className="flex justify-between text-[#D4AF37]">
                                <span>Items Gross Total:</span>
                                <span>₹{itemsSubtotal > 0 ? itemsSubtotal.toFixed(2) : gross.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-emerald-400 font-bold">
                                <span>Mystery PIN Discount:</span>
                                <span>- ₹{discount.toFixed(2)}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between items-center text-[#F3E5AB] font-black text-sm pt-1">
                            <span>Net Total Settled:</span>
                            <span className="text-base text-[#FCF6BA]">₹{netPaid.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal 1: Add Table */}
      <AnimatePresence>
        {showAddTableModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-black border-[3px] border-[#D4AF37] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#D4AF37]/30 pb-3">
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
                    className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-[#FCF6BA] font-mono outline-none focus:border-[#FCF6BA]"
                  />
                </div>

                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1">Capacity</label>
                  <select
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                    className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-[#FCF6BA] outline-none"
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
                  className="w-full py-3 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md cursor-pointer"
                >
                  Deploy Table
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Category (Add & Edit) */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-black border-[3px] border-[#D4AF37] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#D4AF37]/30 pb-3">
                <h3 className="font-black text-[#FCF6BA] text-base flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-[#D4AF37]" /> {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h3>
                <button onClick={() => setShowCategoryModal(false)} className="text-[#D4AF37] hover:text-[#FCF6BA]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dry Fruit Juices, Thick Shakes"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-[#FCF6BA] font-bold outline-none focus:border-[#FCF6BA]"
                  />
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md"
                >
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Menu Item (With PC Image Upload & Scrollable Category Picker) */}
      <AnimatePresence>
        {showItemModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-black border-[3px] border-[#D4AF37] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-gold-scrollbar">
              <div className="flex items-center justify-between border-b-2 border-[#D4AF37]/30 pb-3">
                <h3 className="font-black text-[#FCF6BA] text-base flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-[#D4AF37]" /> {editingItem ? 'Edit Dish Details' : 'Add New Menu Item'}
                </h3>
                <button onClick={() => setShowItemModal(false)} className="text-[#D4AF37] hover:text-[#FCF6BA]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1">Dish Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Anjeer & Badam Thickshake"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-[#FCF6BA] outline-none focus:border-[#FCF6BA]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#F3E5AB] font-bold block mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      placeholder="e.g. 180"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-[#FCF6BA] font-mono outline-none focus:border-[#FCF6BA]"
                    />
                  </div>

                  <div>
                    <label className="text-[#F3E5AB] font-bold block mb-1">Food Type</label>
                    <select
                      value={itemFoodType}
                      onChange={(e) => setItemFoodType(e.target.value as any)}
                      className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-[#FCF6BA] outline-none"
                    >
                      <option value="veg">Veg</option>
                      <option value="non_veg">Non-Veg</option>
                    </select>
                  </div>
                </div>

                {/* PC Image Upload for Menu Item */}
                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1">Dish Image (From PC)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={itemFileRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) readFileToBase64(file, (b64) => setItemImageUrl(b64));
                    }}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => itemFileRef.current?.click()}
                      className="flex-1 py-2.5 rounded-xl border-2 border-dashed border-[#D4AF37] bg-black text-[#FCF6BA] hover:bg-[#D4AF37]/15 flex items-center justify-center gap-2 font-mono text-xs cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                      <span>{itemImageUrl ? 'Change PC Image' : 'Select Image From PC'}</span>
                    </button>
                    {itemImageUrl && (
                      <button
                        type="button"
                        onClick={() => setItemImageUrl('')}
                        className="px-2 rounded-xl border border-rose-500/50 text-rose-400 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {itemImageUrl && (
                    <div className="h-20 w-24 rounded-xl overflow-hidden border-2 border-[#D4AF37] mt-2 relative">
                      <img src={itemImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Scrollable Category Selection Bar */}
                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1">
                    Select Category * ({categories.length} available)
                  </label>
                  <div className="flex gap-2 overflow-x-auto custom-gold-scrollbar p-1.5 border-2 border-[#D4AF37]/50 rounded-xl">
                    {categories.map((c) => {
                      const isSelected = itemCategoryId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setItemCategoryId(c.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
                            isSelected
                              ? 'bg-[#D4AF37] text-black border-transparent font-black shadow-sm'
                              : 'bg-black text-[#FCF6BA] border-[#D4AF37]/40 hover:border-[#D4AF37]'
                          }`}
                        >
                          {c.name_en || c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Short ingredients or highlight..."
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2 text-[#FCF6BA] outline-none focus:border-[#FCF6BA]"
                  />
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md cursor-pointer mt-1"
                >
                  {editingItem ? 'Update Dish' : 'Publish Dish to Menu'}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 4: Add & Edit Combo (With PC Image Support) */}
      <AnimatePresence>
        {showComboModal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-black border-[3px] border-[#D4AF37] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-gold-scrollbar">
              <div className="flex items-center justify-between border-b-2 border-[#D4AF37]/30 pb-3">
                <h3 className="font-black text-[#FCF6BA] text-base flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-[#D4AF37]" /> {editingCombo ? 'Edit Royal Combo' : 'Create New Combo Deal'}
                </h3>
                <button onClick={() => setShowComboModal(false)} className="text-[#D4AF37] hover:text-[#FCF6BA]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCombo} className="space-y-3 text-xs">
                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1">Combo Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Dryfruit Feast + Shake"
                    value={comboName}
                    onChange={(e) => setComboName(e.target.value)}
                    className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-[#FCF6BA] outline-none focus:border-[#FCF6BA]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#F3E5AB] font-bold block mb-1">Offer Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      placeholder="e.g. 299"
                      value={comboPrice}
                      onChange={(e) => setComboPrice(e.target.value)}
                      className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-[#FCF6BA] font-mono outline-none focus:border-[#FCF6BA]"
                    />
                  </div>

                  <div>
                    <label className="text-[#F3E5AB] font-bold block mb-1">Original Price (₹)</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="e.g. 399 (Crossed)"
                      value={comboOriginalPrice}
                      onChange={(e) => setComboOriginalPrice(e.target.value)}
                      className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-[#FCF6BA] font-mono outline-none focus:border-[#FCF6BA]"
                    />
                  </div>
                </div>

                {/* PC Image Upload for Combo */}
                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1">Combo Image (From PC)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={comboFileRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) readFileToBase64(file, (b64) => setComboImageUrl(b64));
                    }}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => comboFileRef.current?.click()}
                      className="flex-1 py-2.5 rounded-xl border-2 border-dashed border-[#D4AF37] bg-black text-[#FCF6BA] hover:bg-[#D4AF37]/15 flex items-center justify-center gap-2 font-mono text-xs cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                      <span>{comboImageUrl ? 'Change Combo PC Image' : 'Select Combo Image From PC'}</span>
                    </button>
                    {comboImageUrl && (
                      <button
                        type="button"
                        onClick={() => setComboImageUrl('')}
                        className="px-2 rounded-xl border border-rose-500/50 text-rose-400 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {comboImageUrl && (
                    <div className="h-20 w-24 rounded-xl overflow-hidden border-2 border-[#D4AF37] mt-2 relative">
                      <img src={comboImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1">Food Type</label>
                  <select
                    value={comboFoodType}
                    onChange={(e) => setComboFoodType(e.target.value as any)}
                    className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-[#FCF6BA] outline-none"
                  >
                    <option value="veg">Veg Combo</option>
                    <option value="non_veg">Non-Veg Combo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#F3E5AB] font-bold block mb-1">Included Items Description</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 1x Badam Shake + 1x Anjeer Bowl + Dry Fruit Tart..."
                    value={comboDescription}
                    onChange={(e) => setComboDescription(e.target.value)}
                    className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2 text-[#FCF6BA] outline-none focus:border-[#FCF6BA]"
                  />
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md cursor-pointer mt-1"
                >
                  {editingCombo ? 'Update Combo' : 'Publish Combo Deal'}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 5: Brand Settings */}
      <AnimatePresence>
        {isNameModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-black border-[3px] border-[#D4AF37] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#D4AF37]/30 pb-3">
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
                    className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-[#FCF6BA] font-bold outline-none uppercase focus:border-[#FCF6BA]"
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
                    className="w-full bg-black border-[3px] border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-[#FCF6BA] outline-none focus:border-[#FCF6BA]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNameModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-black border-[3px] border-[#D4AF37]/50 text-[#F3E5AB] font-bold hover:bg-[#D4AF37]/20"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={loading}
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md"
                  >
                    Save & Publish
                  </button>
                </div>
              </form>
            </div>
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