// @ts-nocheck
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import AdminSecurityModal from '@/components/AdminSecurityModal';
import WaiterSecurityModal from '@/components/WaiterSecurityModal';
import { useRouter } from 'next/navigation';

import { 
  ShieldCheck, 
  Trash2, 
  Plus, 
  Minus,
  RefreshCw, 
  LayoutGrid, 
  Receipt, 
  UtensilsCrossed, 
  Check, 
  X, 
  Edit3, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  RotateCcw, 
  Store, 
  UserCheck, 
  ImageIcon, 
  SlidersHorizontal,
  FileSpreadsheet,
  UploadCloud,
  PackagePlus,
  Printer,
  Calculator,
  Crown,
  Smartphone,
  Banknote,
  CheckCircle,
  EyeOff,
  ChefHat,
  MessageSquare,
  Bell
} from 'lucide-react';

const fluidSpring = {
  type: 'spring',
  stiffness: 440,
  damping: 34,
  mass: 0.5
};

export default function LuxuryGoldAdminPanel() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  
  // Floating Top Tabs: 'none' | 'history' | 'security' | 'waiter' | 'tables'
  const [activeFloatingTab, setActiveFloatingTab] = useState<'none' | 'history' | 'security' | 'waiter' | 'tables'>('none');
  
  // Main Workspace: 'live_orders' | 'menu_hub'
  const [activeWorkspace, setActiveWorkspace] = useState<'live_orders' | 'menu_hub'>('live_orders');
  const [menuHubTab, setMenuHubTab] = useState<'items' | 'combos' | 'promos'>('items');

  // Brand Info
  const [shopName, setShopName] = useState('VUJWALA SIMHA DRY FRUITS & NUTS');
  const [tagline, setTagline] = useState('ROYAL FINE-DINE OPERATIONS');
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [tempBrandName, setTempBrandName] = useState('');
  const [tempTagline, setTempTagline] = useState('');

  // Core Data States
  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<any[]>([]);
  const [loyaltyData, setLoyaltyData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Security Modals
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);

  // Live Orders Payment & Change State
  const [selectedRunningTableNum, setSelectedRunningTableNum] = useState<number | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<Record<string, 'cash' | 'upi'>>({});
  const [customerHandedAmounts, setCustomerHandedAmounts] = useState<Record<string, string>>({});

  // Tables CRUD
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [newTableName, setNewTableName] = useState('');
  const [editingTableObj, setEditingTableObj] = useState<any | null>(null);
  const [showEditTableNameModal, setShowEditTableNameModal] = useState(false);
  const [tempCustomTableName, setTempCustomTableName] = useState('');

  // Categories CRUD
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | 'all'>('all');

  // Menu Items CRUD
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState<number | null>(null);
  const [itemFoodType, setItemFoodType] = useState<'veg' | 'non_veg'>('veg');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const itemFileRef = useRef<HTMLInputElement>(null);

  // Smart Dynamic Combos CRUD
  const [showComboModal, setShowComboModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<any | null>(null);
  const [comboName, setComboName] = useState('');
  const [selectedComboItemIds, setSelectedComboItemIds] = useState<number[]>([]);
  const [comboOfferPrice, setComboOfferPrice] = useState('');
  const [comboDescription, setComboDescription] = useState('');
  const [comboFoodType, setComboFoodType] = useState<'veg' | 'non_veg'>('veg');
  const [comboImageUrl, setComboImageUrl] = useState('');
  const comboFileRef = useRef<HTMLInputElement>(null);

  // Promo Banners State
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerImageUrl, setNewBannerImageUrl] = useState('');
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  // Calendar State
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calViewDate, setCalViewDate] = useState<Date>(new Date());
  const calRef = useRef<HTMLDivElement>(null);

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
      localStorage.clear();
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
      const [
        { data: tbls },
        { data: sess },
        { data: cats },
        { data: itms },
        { data: oitms },
        { data: bnrs },
        { data: cmbs },
        { data: calls }
      ] = await Promise.all([
        supabase.from('restaurant_tables').select('*').order('table_number'),
        supabase.from('table_sessions').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('menu_items').select('*').order('id', { ascending: true }),
        supabase.from('order_items').select('*, menu_items(name_en, name, price, category_id, image_url)'),
        supabase.from('promo_banners').select('*'),
        supabase.from('combos').select('*').order('id', { ascending: true }),
        supabase.from('waiter_calls').select('*').eq('status', 'pending').order('created_at', { ascending: false })
      ]);

      try {
        const { data: loyalties } = await supabase.from('customer_loyalty').select('*');
        if (loyalties) {
          const map: Record<string, any> = {};
          loyalties.forEach((l: any) => { map[l.phone] = l; });
          setLoyaltyData(map);
        }
      } catch (e) {}

      if (tbls) setTables(tbls);
      if (sess) setSessions(sess);
      if (cats) setCategories(cats);
      if (itms) setMenuItems(itms);
      if (cmbs) setCombos(cmbs);
      if (oitms) setOrderItems(oitms);
      if (bnrs) setBanners(bnrs);
      if (calls) setWaiterCalls(calls);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_sessions' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combos' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promo_banners' }, () => loadAdminData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls' }, () => loadAdminData())
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

  // Photo Compressor
  const compressAndUploadImage = (file: File, callback: (base64: string) => void) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo 5MB kante thakkuva undali.');
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 900;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72);
        callback(compressedBase64);
      };
    };
  };

  // Zero-GST Bill Recalculation
  const recalculateSessionBill = async (sessionId: string) => {
    try {
      const { data: liveItems } = await supabase
        .from('order_items')
        .select('*, menu_items(price)')
        .eq('session_id', sessionId)
        .neq('item_status', 'cancelled');

      const newGross = (liveItems || []).reduce((sum, it) => {
        const pr = Number(it.unit_price || it.menu_items?.price || 0);
        return sum + (it.quantity * pr);
      }, 0);

      await supabase.from('table_sessions').update({
        subtotal: newGross,
        cgst_amount: 0,
        sgst_amount: 0,
        total_amount: newGross,
        discount_amount: 0,
        final_payable: newGross
      }).eq('id', sessionId);

      await loadAdminData();
    } catch (err) {
      console.error('Recalculate error:', err);
    }
  };

  const handleCancelOrderItem = async (orderItemId: number, sessionId: string, dishName: string) => {
    if (!confirm(`"${dishName}" dish ni CANCEL cheyala?`)) return;
    try {
      setLoading(true);
      await supabase.from('order_items').update({ item_status: 'cancelled' }).eq('id', orderItemId);
      await recalculateSessionBill(sessionId);
    } catch (err: any) {
      alert('Cancel failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItemQuantity = async (orderItemId: number, currentQty: number, delta: number, sessionId: string) => {
    const nextQty = currentQty + delta;
    if (nextQty <= 0) return alert('Quantity 0 cheyalante "Cancel Dish" press cheyandi.');
    try {
      setLoading(true);
      await supabase.from('order_items').update({ quantity: nextQty }).eq('id', orderItemId);
      await recalculateSessionBill(sessionId);
    } catch (err: any) {
      alert('Qty error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Settle Bill
  const handleSettleOrder = async (sessionId: string, tableNum: number, mode: 'cash' | 'upi') => {
    try {
      setLoading(true);
      const activeSess = sessions.find(s => s.id === sessionId);
      if (activeSess && activeSess.customer_phone && activeSess.customer_phone.length === 10) {
        try {
          await supabase.rpc('record_customer_visit', {
            p_phone: activeSess.customer_phone,
            p_name: activeSess.customer_name || 'Guest',
            p_bill_amount: Number(activeSess.total_amount || 0)
          });
        } catch (e) {}
      }

      await supabase.from('table_sessions').update({ 
        status: 'completed', 
        payment_status: 'paid',
        payment_mode: mode 
      }).eq('id', sessionId);

      await supabase.from('restaurant_tables').update({ status: 'available' }).eq('table_number', tableNum);
      await loadAdminData();
      alert(`Table #${tableNum} Bill settled via ${mode.toUpperCase()}!`);
    } catch (err: any) {
      alert('Settle error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFloor = async () => {
    if (!confirm('Floor loni running tables annitini VACANT ga reset cheyala?')) return;
    setLoading(true);
    try {
      await supabase.from('table_sessions').update({ status: 'completed', payment_status: 'paid' }).eq('status', 'active');
      await supabase.from('restaurant_tables').update({ status: 'available' });
      await loadAdminData();
      alert('Floor reset aindi! All tables vacant.');
    } catch (err: any) {
      alert('Reset error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'staff_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    document.cookie = 'session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;';
    if (typeof window !== 'undefined') localStorage.clear();
    window.location.replace('/');
  };

  // Tables CRUD
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const tNum = parseInt(newTableNumber);
    const tCap = parseInt(newTableCapacity) || 4;
    const tName = newTableName.trim() || `Table-${tNum}`;

    if (!tNum || tNum <= 0) return alert('Valid Table Number ivvandi.');
    if (tables.some(t => t.table_number === tNum)) return alert(`Table #${tNum} already undi!`);

    try {
      setLoading(true);
      await supabase.from('restaurant_tables').insert({ 
        table_number: tNum, 
        capacity: tCap, 
        status: 'available',
        table_name: tName
      });
      setNewTableNumber('');
      setNewTableName('');
      setShowAddTableModal(false);
      await loadAdminData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTableName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTableObj) return;
    const cleanName = tempCustomTableName.trim();
    if (!cleanName) return alert('Table Dedicated Name ivvandi.');

    try {
      setLoading(true);
      await supabase.from('restaurant_tables')
        .update({ table_name: cleanName })
        .eq('table_number', editingTableObj.table_number);

      setShowEditTableNameModal(false);
      setEditingTableObj(null);
      await loadAdminData();
    } catch (err: any) {
      alert('Name update error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (tableNum: number, isOccupied: boolean) => {
    if (isOccupied) return alert(`Table #${tableNum} active ga undi, delete cheyaleru.`);
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

  // Category CRUD
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = categoryName.trim();
    if (!cleanName) return alert('Category Name enter cheyandi.');

    setLoading(true);
    try {
      if (editingCategory) {
        await supabase.from('categories').update({ name: cleanName, name_en: cleanName }).eq('id', editingCategory.id);
      } else {
        const nextSort = (categories.length > 0 ? Math.max(...categories.map(c => Number(c.sort_order || 0))) : 0) + 1;
        await supabase.from('categories').insert({ name: cleanName, name_en: cleanName, sort_order: nextSort });
      }
      setCategoryName('');
      setEditingCategory(null);
      setShowCategoryModal(false);
      await loadAdminData();
    } catch (err: any) {
      alert('Category error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: number, catName: string) => {
    if (!confirm(`"${catName}" category ni DELETE cheyala?`)) return;
    try {
      setLoading(true);
      await supabase.from('categories').delete().eq('id', catId);
      if (selectedCatId === catId) setSelectedCatId('all');
      await loadAdminData();
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Instant Stock Toggle
  const handleToggleStock = async (itemId: number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setMenuItems(prev => prev.map(m => m.id === itemId ? { ...m, is_available: nextStatus } : m));
    try {
      await supabase.from('menu_items').update({ is_available: nextStatus }).eq('id', itemId);
    } catch (err) {
      console.error('Stock toggle err:', err);
      loadAdminData();
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(itemPrice);
    if (!itemName.trim()) return alert('Dish Name ivvandi.');
    if (!priceNum || priceNum <= 0) return alert('Valid Price ivvandi.');
    if (!itemCategoryId) return alert('Category select cheyandi.');

    setLoading(true);
    try {
      const payload = {
        name: itemName.trim(),
        name_en: itemName.trim(),
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
      alert('Dish save error: ' + err.message);
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

  // Combos
  const comboSumActualPrice = useMemo(() => {
    return selectedComboItemIds.reduce((sum, id) => {
      const dish = menuItems.find(m => m.id === id);
      return sum + (dish ? Number(dish.price || 0) : 0);
    }, 0);
  }, [selectedComboItemIds, menuItems]);

  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    const offerPriceNum = parseFloat(comboOfferPrice);
    if (!comboName.trim()) return alert('Combo Title ivvandi.');
    if (selectedComboItemIds.length === 0) return alert('Dishes select cheyandi.');
    if (!offerPriceNum || offerPriceNum <= 0) return alert('Valid Combo Price ivvandi.');

    setLoading(true);
    try {
      const selectedDishObjects = menuItems.filter(m => selectedComboItemIds.includes(m.id));
      const comboSummaryDesc = selectedDishObjects.map(d => d.name_en || d.name).join(', ');

      const payload = {
        name: comboName.trim(),
        name_en: comboName.trim(),
        price: offerPriceNum,
        original_price: comboSumActualPrice,
        description: comboDescription.trim() || `Includes: ${comboSummaryDesc}`,
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
      setSelectedComboItemIds([]);
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

  // Banners
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerTitle.trim() || !newBannerImageUrl.trim()) return alert('Banner Title & Image ivvandi.');
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
      alert('Banner save error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async (bannerId: number) => {
    if (!confirm('Banner ni DELETE cheyala?')) return;
    try {
      await supabase.from('promo_banners').delete().eq('id', bannerId);
      await loadAdminData();
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    }
  };

  // Filter
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const sessionDate = new Date(s.created_at).toISOString().split('T')[0];
      return sessionDate === selectedDate;
    });
  }, [sessions, selectedDate]);

  const { totalCashRevenue, totalUpiRevenue, totalOverallRevenue } = useMemo(() => {
    let cash = 0;
    let upi = 0;
    filteredSessions.forEach(s => {
      if (s.payment_status === 'paid' || s.status === 'completed') {
        const amt = Number(s.total_amount || 0);
        if (s.payment_mode === 'cash') cash += amt;
        else upi += amt;
      }
    });
    return {
      totalCashRevenue: cash,
      totalUpiRevenue: upi,
      totalOverallRevenue: cash + upi
    };
  }, [filteredSessions]);

  const activeSessions = useMemo(() => sessions.filter(s => s.status === 'active'), [sessions]);

  const getSessionOrderedItems = (sessionId: string) => {
    return orderItems
      .filter(oi => oi.session_id === sessionId && oi.item_status !== 'cancelled')
      .map(oi => ({
        id: oi.id,
        name: oi.menu_items?.name_en || oi.menu_items?.name || 'Dish #' + oi.menu_item_id,
        quantity: oi.quantity || 1,
        price: Number(oi.unit_price || oi.menu_items?.price || 0),
        cooking_notes: oi.cooking_notes || null
      }));
  };

  const getSessionItemsDetailed = (sessionId: string) => {
    return orderItems.filter(oi => oi.session_id === sessionId);
  };

  // 1. PHYSICAL 80mm KOT (Kitchen Order Ticket) SLIP WITH COOKING INSTRUCTIONS
  const printKitchenOrderTicket = (session: any) => {
    const items = getSessionOrderedItems(session.id);
    const matchingTable = tables.find(t => t.table_number === session.table_number);
    const tableName = matchingTable?.table_name || `Table #${session.table_number}`;

    const printWindow = window.open('', '_blank', 'width=320,height=500');
    if (!printWindow) return alert('Popups allow cheyandi to print KOT.');

    const kotHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>KOT - ${tableName}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              width: 72mm;
              margin: 0 auto;
              padding: 6mm 2mm;
              font-family: 'Courier New', Courier, monospace;
              font-size: 13px;
              color: #000;
              line-height: 1.3;
            }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 2px dashed #000; margin: 6px 0; }
            .kot-title { font-size: 16px; font-weight: 900; letter-spacing: 1px; }
            .table-badge { font-size: 18px; font-weight: 900; margin: 4px 0; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 13px; font-weight: bold; }
            .item-name { width: 75%; word-break: break-word; }
            .item-qty { width: 25%; text-align: right; font-size: 15px; }
            .note-box { font-size: 11px; font-style: italic; background: #eee; padding: 2px 4px; margin-bottom: 6px; }
          </style>
        </head>
        <body>
          <div class="text-center kot-title">*** KITCHEN ORDER TICKET ***</div>
          <div class="text-center table-badge">${tableName}</div>
          <div class="text-center" style="font-size: 10px;">Time: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} | Guest: ${session.customer_name || 'Walk-in'}</div>
          <div class="divider"></div>
          <div class="item-row">
            <span class="item-name">ITEM (PREPARATION)</span>
            <span class="item-qty">QTY</span>
          </div>
          <div class="divider"></div>
          ${items.map(it => `
            <div>
              <div class="item-row">
                <span class="item-name">• ${it.name}</span>
                <span class="item-qty">[ ${it.quantity} ]</span>
              </div>
              ${it.cooking_notes ? `<div class="note-box">>> NOTE: ${it.cooking_notes}</div>` : ''}
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="text-center" style="font-size: 10px; margin-top: 8px;">PREPARE & DISPATCH DIRECTLY TO FLOOR</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(kotHtml);
    printWindow.document.close();
  };

  // 2. 80mm ESC/POS Customer Thermal Receipt (Zero GST Flat)
  const printThermalSlip = (session: any) => {
    const items = getSessionOrderedItems(session.id);
    const gross = Number(session.total_amount || 0);
    const matchingTable = tables.find(t => t.table_number === session.table_number);
    const tableName = matchingTable?.table_name || `Table #${session.table_number}`;
    const pMode = (session.payment_mode || 'Cash/UPI').toUpperCase();

    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) return alert('Popups allow cheyandi to print receipt.');

    const slipHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${tableName}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              width: 72mm;
              margin: 0 auto;
              padding: 8mm 2mm;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              color: #000;
              line-height: 1.25;
            }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .item-name { width: 55%; word-break: break-word; }
            .item-qty { width: 15%; text-align: center; }
            .item-total { width: 30%; text-align: right; }
            .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 5px; }
            .footer { font-size: 9px; text-align: center; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="text-center bold" style="font-size: 14px;">${shopName}</div>
          <div class="text-center" style="font-size: 9px;">${tagline}</div>
          <div class="divider"></div>
          <div>Date: ${new Date(session.created_at).toLocaleDateString('en-IN')} ${new Date(session.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          <div>Table: <span class="bold">${tableName}</span></div>
          <div>Guest: ${session.customer_name || 'Walk-in'} (${session.customer_phone || '-'})</div>
          <div>Payment: <span class="bold">${pMode}</span></div>
          <div class="divider"></div>
          <div class="item-row bold">
            <span class="item-name">ITEM</span>
            <span class="item-qty">QTY</span>
            <span class="item-total">AMT</span>
          </div>
          <div class="divider"></div>
          ${items.map(it => `
            <div class="item-row">
              <span class="item-name">${it.name}</span>
              <span class="item-qty">${it.quantity}</span>
              <span class="item-total">₹${(it.quantity * it.price).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="total-row">
            <span>NET PAYABLE (Zero GST):</span>
            <span>₹${gross.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="footer">
            <div>Thank you! Visit Us Again!</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(slipHtml);
    printWindow.document.close();
  };

  const copyToGoogleSheets = () => {
    const headers = ['Date', 'Time', 'Table #', 'Table Name', 'Customer Name', 'Phone', 'Ordered Dishes', 'Bill Total', 'Payment Mode', 'Status'];
    const rows = filteredSessions.map(s => {
      const d = new Date(s.created_at);
      const itemsList = getSessionOrderedItems(s.id).map(i => `${i.quantity}x ${i.name}`).join(', ');
      const gross = Number(s.total_amount) || 0;
      const matchingTable = tables.find(t => t.table_number === s.table_number);

      return [
        d.toLocaleDateString('en-IN'),
        d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        s.table_number,
        matchingTable?.table_name || `Table #${s.table_number}`,
        s.customer_name || 'Guest',
        s.customer_phone || '-',
        `"${itemsList || 'None'}"`,
        gross,
        (s.payment_mode || 'Cash').toUpperCase(),
        s.payment_status || s.status
      ];
    });

    const tsvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // Calendar
  const renderCalendarDays = () => {
    const year = calViewDate.getFullYear();
    const month = calViewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    
    return (
      <>
        <div className="grid grid-cols-7 gap-1 place-items-center mb-2 pb-1 border-b border-white/5 text-[10px] font-mono font-bold text-neutral-400">
          {weekDays.map(w => <span key={w}>{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1 place-items-center">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={'empty-' + i} className="h-8 w-8" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isToday = getTodayStr() === dateStr;
            return (
              <button
                key={d}
                onClick={() => { setSelectedDate(dateStr); setShowCalendar(false); }}
                className={`h-8 w-8 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center cursor-pointer ${
                  isSelected
                    ? 'bg-[#D4AF37] text-black shadow-md font-black scale-105'
                    : isToday
                    ? 'border border-[#D4AF37] text-[#FCF6BA] bg-[#D4AF37]/20 font-bold'
                    : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  const formattedSelectedDateHeader = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, [selectedDate]);

  if (authChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#050505] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-2 border-white/10 border-t-[#D4AF37] rounded-full animate-spin" />
        <span className="text-[#D4AF37] font-mono text-xs tracking-widest uppercase font-bold">
          Verifying Master Admin Credentials...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#050505] text-[#FCF6BA] font-sans pb-32 relative overflow-x-hidden antialiased">
      {/* Top Glass Header */}
      <header className="sticky top-0 z-40 bg-[#070709]/90 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-6 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center shadow-lg shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
            </div>

            <div>
              <h1 className="text-sm sm:text-base font-black tracking-wide text-white uppercase truncate max-w-[200px] sm:max-w-none">
                {shopName}
              </h1>
              <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                setTempBrandName(shopName);
                setTempTagline(tagline);
                setIsNameModalOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:border-[#D4AF37]/40 text-[#FCF6BA] text-xs font-mono font-bold transition cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Edit Brand</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleResetFloor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:border-[#D4AF37]/40 text-[#FCF6BA] text-xs font-mono font-bold transition cursor-pointer"
              title="Reset all tables to vacant"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Reset Floor</span>
              <span>({activeSessions.length})</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.92 }}
              onClick={loadAdminData} 
              className="p-2 rounded-xl border border-white/[0.1] bg-white/[0.03] text-[#FCF6BA] hover:border-[#D4AF37]/40 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FCF6BA]' : ''}`} />
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.92 }}
              onClick={handleLogout} 
              className="p-2 rounded-xl bg-white/[0.03] border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 cursor-pointer" 
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* FLOATING ACTION DOCK */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 relative z-50">
        <div className="p-3 rounded-[28px] bg-gradient-to-b from-[#111114]/90 to-[#0a0a0d]/90 border border-white/[0.1] backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 overflow-x-auto custom-gold-scrollbar pb-1 lg:pb-0 w-full lg:w-auto">
            {[
              { id: 'history', label: '1. Order History', icon: Receipt },
              { id: 'security', label: '2. Admin Security', icon: SlidersHorizontal },
              { id: 'waiter', label: '3. Waiters & Staff', icon: UserCheck },
              { id: 'tables', label: '4. Tables CRUD', icon: LayoutGrid },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeFloatingTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'security') return setIsSecurityOpen(true);
                    if (tab.id === 'waiter') return setIsWaiterModalOpen(true);
                    setActiveFloatingTab(isActive ? 'none' : (tab.id as any));
                  }}
                  className={`px-4 py-2.5 rounded-[20px] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition cursor-pointer border shrink-0 ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black border-transparent font-black shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                      : 'bg-white/[0.02] border-white/[0.08] text-neutral-300 hover:text-white hover:border-[#D4AF37]/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative flex items-center gap-2 shrink-0 ml-auto" ref={calRef}>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setShowCalendar(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[20px] border border-[#D4AF37]/40 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#FCF6BA] text-xs font-mono font-black shadow-md cursor-pointer whitespace-nowrap transition"
            >
              <CalendarIcon className="w-4 h-4 text-[#D4AF37]" />
              <span>{formattedSelectedDateHeader}</span>
            </motion.button>

            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 10 }}
                  transition={fluidSpring}
                  className="absolute right-0 top-14 w-80 bg-[#0e0e12]/95 border border-[#D4AF37]/40 rounded-[28px] p-4 shadow-[0_12px_45px_rgba(0,0,0,0.85)] z-50 select-none backdrop-blur-3xl"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 font-mono">
                    <button 
                      type="button"
                      onClick={() => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1))}
                      className="p-1 rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-[#FCF6BA] uppercase tracking-wider">
                      {calViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      type="button"
                      onClick={() => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 1))}
                      className="p-1 rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    {renderCalendarDays()}
                  </div>

                  <div className="pt-3 mt-3 border-t border-white/10 flex justify-between items-center text-[11px] font-mono">
                    <span className="text-neutral-400">Jump to:</span>
                    <button 
                      type="button"
                      onClick={() => { 
                        setSelectedDate(getTodayStr()); 
                        setCalViewDate(new Date()); 
                        setShowCalendar(false); 
                      }} 
                      className="px-3 py-1 rounded-xl bg-[#D4AF37] text-black font-black uppercase tracking-wider text-[10px] hover:bg-[#c59b27]"
                    >
                      Today
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {activeFloatingTab !== 'none' && (
              <button
                onClick={() => setActiveFloatingTab('none')}
                className="px-3 py-2 rounded-[18px] border border-white/10 bg-white/[0.04] text-neutral-400 hover:text-white text-xs font-mono flex items-center gap-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" /> Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Views Container */}
      <AnimatePresence>
        {activeFloatingTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 pt-4"
          >
            <div className="p-6 rounded-[32px] bg-gradient-to-b from-[#0e0e12]/95 to-[#07070a]/95 border border-[#D4AF37]/35 space-y-4 shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-black text-white uppercase font-mono flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#D4AF37]" /> Single Day Sales Ledger: {formattedSelectedDateHeader}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    Selected day settled orders, Cash vs UPI totals, and flat receipts.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-amber-400/30">
                    <span className="text-neutral-400 block text-[10px]">CASH SALES</span>
                    <span className="text-amber-300 font-bold text-sm">₹{totalCashRevenue.toFixed(2)}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-emerald-400/30">
                    <span className="text-neutral-400 block text-[10px]">UPI SALES</span>
                    <span className="text-emerald-400 font-bold text-sm">₹{totalUpiRevenue.toFixed(2)}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/50">
                    <span className="text-neutral-400 block text-[10px]">TOTAL SALES</span>
                    <span className="text-[#FCF6BA] font-black text-sm">₹{totalOverallRevenue.toFixed(2)}</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={copyToGoogleSheets}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-xs font-mono font-bold hover:border-[#D4AF37]/40"
                  >
                    {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-[#D4AF37]" />}
                    <span>{copySuccess ? 'Copied' : 'Export'}</span>
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto custom-gold-scrollbar pr-1">
                {filteredSessions.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-neutral-500 font-mono text-xs">
                    No completed orders found for {formattedSelectedDateHeader}.
                  </div>
                ) : (
                  filteredSessions.map((sess) => {
                    const items = getSessionOrderedItems(sess.id);
                    const matchingTable = tables.find(t => t.table_number === sess.table_number);
                    const isCash = sess.payment_mode === 'cash';

                    return (
                      <div key={sess.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2 text-xs font-mono">
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                          <span className="font-bold text-white">{matchingTable?.table_name || `Table #${sess.table_number}`}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                              isCash ? 'border-amber-500/40 text-amber-300 bg-amber-950/20' : 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20'
                            }`}>
                              {sess.payment_mode || 'Cash'}
                            </span>
                            <button onClick={() => printThermalSlip(sess)} className="p-1 hover:text-[#D4AF37]">
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] text-neutral-400">
                          Guest: <strong className="text-white">{sess.customer_name || 'Guest'}</strong> ({sess.customer_phone || '-'})
                        </div>

                        <div className="space-y-1 text-[11px]">
                          {items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-neutral-300">
                              <span>{it.quantity}x {it.name}</span>
                              <span>₹{(it.quantity * it.price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-white">
                          <span>Total Paid:</span>
                          <span className="text-[#D4AF37]">₹{Number(sess.total_amount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 4: Tables CRUD */}
        {activeFloatingTab === 'tables' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 pt-4"
          >
            <div className="p-6 rounded-[32px] bg-gradient-to-b from-[#0e0e12]/95 to-[#07070a]/95 border border-[#D4AF37]/35 space-y-4 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-black text-white uppercase font-mono flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-[#D4AF37]" /> Manage Floor Tables
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    Add new dining tables, rename labels, or delete tables.
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setShowAddTableModal(true)}
                  className="px-4 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-black text-xs uppercase flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Add Table
                </motion.button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {tables.map(t => {
                  const isOccupied = activeSessions.some(s => s.table_number === t.table_number);
                  const hasWaiterAlert = waiterCalls.some(c => c.table_number === t.table_number);

                  return (
                    <div key={t.id || t.table_number} className={`p-4 rounded-[24px] bg-white/[0.02] border space-y-2 text-xs font-mono flex flex-col justify-between ${
                      hasWaiterAlert ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-white/10'
                    }`}>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-base font-black text-white">#{t.table_number}</span>
                          <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        </div>
                        <span className="text-[11px] text-[#D4AF37] block mt-1 truncate">{t.table_name || `Table-${t.table_number}`}</span>
                        <span className="text-[10px] text-neutral-500">{t.capacity || 4} Seats</span>
                      </div>

                      <div className="flex gap-1.5 pt-2 border-t border-white/10">
                        <button
                          onClick={() => {
                            setEditingTableObj(t);
                            setTempCustomTableName(t.table_name || `Table-${t.table_number}`);
                            setShowEditTableNameModal(true);
                          }}
                          className="flex-1 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 text-[10px]"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDeleteTable(t.table_number, isOccupied)}
                          className="p-1.5 rounded-xl bg-rose-950/30 text-rose-300 hover:bg-rose-950/50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <button
            onClick={() => setActiveWorkspace('live_orders')}
            className={`px-6 py-3 rounded-[24px] text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              activeWorkspace === 'live_orders'
                ? 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black shadow-[0_0_24px_rgba(212,175,55,0.4)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Live Dining Orders Desk ({activeSessions.length})</span>
          </button>

          <button
            onClick={() => setActiveWorkspace('menu_hub')}
            className={`px-6 py-3 rounded-[24px] text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              activeWorkspace === 'menu_hub'
                ? 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black shadow-[0_0_24px_rgba(212,175,55,0.4)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Menu, Combos & Promos Hub</span>
          </button>
        </div>

        {/* VIEW A: LIVE RUNNING ORDERS DESK */}
        {activeWorkspace === 'live_orders' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Occupied Tables List */}
            <div className="md:col-span-4 space-y-2.5 max-h-[75vh] overflow-y-auto custom-gold-scrollbar pr-1">
              <span className="text-xs font-mono text-[#D4AF37] font-bold block uppercase mb-1">
                Occupied Tables ({activeSessions.length}):
              </span>

              {activeSessions.length === 0 ? (
                <div className="p-8 text-center rounded-[28px] bg-white/[0.02] border border-white/[0.06] text-neutral-500 font-mono text-xs">
                  All dining tables are vacant.
                </div>
              ) : (
                activeSessions.map((sess) => {
                  const isSelected = (selectedRunningTableNum || activeSessions[0]?.table_number) === sess.table_number;
                  const matchingTbl = tables.find(t => t.table_number === sess.table_number);
                  const finalAmt = Number(sess.total_amount || 0);
                  const hasCallAlert = waiterCalls.some(c => c.table_number === sess.table_number);

                  return (
                    <div
                      key={sess.id}
                      onClick={() => setSelectedRunningTableNum(sess.table_number)}
                      className={`p-4 rounded-[24px] border text-xs font-mono transition cursor-pointer flex justify-between items-center ${
                        hasCallAlert
                          ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-950/20'
                          : isSelected
                          ? 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black border-transparent shadow-[0_4px_25px_rgba(212,175,55,0.35)]'
                          : 'bg-gradient-to-b from-white/[0.03] to-white/[0.01] border-white/10 text-white hover:border-[#D4AF37]/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold block">{matchingTbl?.table_name || `Table #${sess.table_number}`}</span>
                          {hasCallAlert && <Bell className="w-3.5 h-3.5 text-amber-400 animate-bounce" />}
                        </div>
                        <span className="text-[11px] opacity-80">{sess.customer_name || 'Guest'}</span>
                      </div>
                      <span className="text-base font-black">₹{finalAmt.toFixed(2)}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Table Live Desk */}
            <div className="md:col-span-8">
              {(() => {
                const curSession = activeSessions.find(s => s.table_number === selectedRunningTableNum) || activeSessions[0];
                if (!curSession) {
                  return (
                    <div className="p-12 rounded-[32px] bg-white/[0.02] border border-white/[0.08] text-center text-neutral-500 font-mono text-xs">
                      Select an occupied table from the left to view dishes, change qty, or settle bill.
                    </div>
                  );
                }

                const items = getSessionItemsDetailed(curSession.id);
                const grossTotal = Number(curSession.total_amount || 0);
                const matchingTbl = tables.find(t => t.table_number === curSession.table_number);

                // 10th Milestone Visit Reward
                const cLoyalty = curSession.customer_phone ? loyaltyData[curSession.customer_phone] : null;
                const visitCount = cLoyalty?.successful_visits || 1;
                const isMilestone = visitCount === 10 || (visitCount > 0 && visitCount % 10 === 0);

                // Payment Mode Switch
                const curMode = paymentMethods[curSession.id] || 'cash';
                const handedInput = customerHandedAmounts[curSession.id] || '';
                const handedNum = parseFloat(handedInput) || 0;
                const balanceToReturn = handedNum >= grossTotal ? (handedNum - grossTotal).toFixed(2) : '0.00';
                const remainingDue = handedNum < grossTotal ? (grossTotal - handedNum).toFixed(2) : '0.00';

                return (
                  <div className="p-6 rounded-[32px] bg-gradient-to-b from-[#111115]/95 via-[#0b0b0e]/95 to-[#08080a]/95 border border-[#D4AF37]/35 backdrop-blur-3xl space-y-4 font-mono shadow-2xl">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3">
                      <div>
                        <span className="text-lg font-black text-white block">
                          {matchingTbl?.table_name || `Table #${curSession.table_number}`}
                        </span>
                        <span className="text-xs text-neutral-400">
                          Guest: <strong className="text-white">{curSession.customer_name || 'Guest'}</strong> ({curSession.customer_phone || '-'})
                        </span>
                      </div>
                      <span className="text-xs text-[#D4AF37] font-bold">
                        Seated: {new Date(curSession.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {isMilestone && (
                      <div className="p-4 rounded-[22px] bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black text-xs flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-2">
                          <Crown className="w-5 h-5" />
                          <span>10TH MILESTONE VISIT! OFFER FREE WELCOME JUICE TO GUEST</span>
                        </div>
                        <span className="bg-black text-[#FCF6BA] px-2.5 py-1 rounded-xl text-[10px]">REWARD</span>
                      </div>
                    )}

                    {/* Ordered Items List with Cooking Notes */}
                    <div className="space-y-2">
                      <span className="text-xs text-neutral-400 font-bold uppercase block">
                        Ordered Dishes ({items.filter(i => i.item_status !== 'cancelled').length}):
                      </span>

                      <div className="space-y-2 max-h-56 overflow-y-auto custom-gold-scrollbar p-3 rounded-[24px] bg-black/40 border border-white/5">
                        {items.map((it) => {
                          const isCancelled = it.item_status === 'cancelled';
                          const dName = it.menu_items?.name_en || it.menu_items?.name || 'Dish #' + it.menu_item_id;
                          const dPrice = Number(it.unit_price || it.menu_items?.price || 0);

                          return (
                            <div key={it.id} className={`p-2.5 rounded-2xl border space-y-1 ${isCancelled ? 'bg-rose-950/20 border-rose-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className={`font-bold block ${isCancelled ? 'line-through text-rose-300' : 'text-white'}`}>
                                    {it.quantity}x {dName}
                                  </span>
                                  <span className="text-[11px] text-neutral-400">₹{(it.quantity * dPrice).toFixed(2)}</span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {!isCancelled ? (
                                    <>
                                      <button
                                        onClick={() => handleUpdateItemQuantity(it.id, it.quantity, -1, curSession.id)}
                                        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleUpdateItemQuantity(it.id, it.quantity, 1, curSession.id)}
                                        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleCancelOrderItem(it.id, curSession.id, dName)}
                                        className="px-2.5 py-1 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 font-bold text-[10px]"
                                      >
                                        Cancel Dish
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] font-bold text-rose-400 uppercase bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-500/30">
                                      Cancelled
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Customer Cooking Notes Highlight */}
                              {it.cooking_notes && (
                                <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-950/30 px-2 py-0.5 rounded-lg border border-amber-500/30 font-sans">
                                  <MessageSquare className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>Note: {it.cooking_notes}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Total Bill & Payment Mode Switch */}
                    <div className="p-4 rounded-[24px] bg-white/[0.03] border border-white/10 space-y-3">
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-neutral-400">Total Flat Amount (Zero GST):</span>
                        <span className="text-xl font-black text-[#D4AF37]">₹{grossTotal.toFixed(2)}</span>
                      </div>

                      {/* Cash vs UPI Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setPaymentMethods({ ...paymentMethods, [curSession.id]: 'cash' })}
                          className={`py-3 rounded-[18px] text-xs font-black uppercase flex items-center justify-center gap-2 border transition ${
                            curMode === 'cash'
                              ? 'bg-amber-400 text-black border-transparent shadow-md'
                              : 'bg-white/[0.02] border-white/10 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Banknote className="w-4 h-4" />
                          <span>Cash Payment</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethods({ ...paymentMethods, [curSession.id]: 'upi' })}
                          className={`py-3 rounded-[18px] text-xs font-black uppercase flex items-center justify-center gap-2 border transition ${
                            curMode === 'upi'
                              ? 'bg-emerald-400 text-black border-transparent shadow-md'
                              : 'bg-white/[0.02] border-white/10 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>UPI / QR Scan</span>
                        </button>
                      </div>

                      {/* Cash Handover Calculator */}
                      {curMode === 'cash' && (
                        <div className="p-4 rounded-[20px] bg-black/60 border border-amber-400/40 space-y-2.5 mt-2">
                          <span className="text-[11px] font-bold text-amber-300 uppercase block">
                            Cash Handover Calculator (చిల్లర లెక్క):
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                            <div>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Customer Handed ₹"
                                value={handedInput}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9.]/g, '');
                                  setCustomerHandedAmounts({ ...customerHandedAmounts, [curSession.id]: val });
                                }}
                                className="w-full bg-[#161619] border border-amber-400/50 rounded-xl px-3 py-2 text-white font-black text-base outline-none focus:border-amber-400"
                              />

                              <div className="flex gap-1.5 mt-2">
                                {[100, 200, 500, 1000].map(amt => (
                                  <button
                                    key={amt}
                                    type="button"
                                    onClick={() => setCustomerHandedAmounts({ ...customerHandedAmounts, [curSession.id]: String(amt) })}
                                    className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-amber-200 text-[10px] font-bold border border-white/5"
                                  >
                                    ₹{amt}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setCustomerHandedAmounts({ ...customerHandedAmounts, [curSession.id]: String(grossTotal) })}
                                  className="px-2 py-1 rounded-lg bg-white/[0.05] text-neutral-300 text-[10px]"
                                >
                                  Exact
                                </button>
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-right">
                              <span className="text-[10px] uppercase text-neutral-400 block">Change to Return:</span>
                              <span className={`text-xl font-black ${handedNum >= grossTotal && handedNum > 0 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                                ₹{balanceToReturn}
                              </span>
                              {handedNum > 0 && handedNum < grossTotal && (
                                <span className="text-[10px] text-rose-400 block mt-0.5">Still Short: ₹{remainingDue}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Settle Action Buttons with KOT and Receipt Print */}
                    <div className="flex gap-2 pt-1 flex-wrap sm:flex-nowrap">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSettleOrder(curSession.id, curSession.table_number, curMode)}
                        className={`flex-1 py-3.5 rounded-[20px] font-black uppercase text-xs shadow-lg cursor-pointer flex items-center justify-center gap-2 ${
                          curMode === 'cash' ? 'bg-amber-400 text-black' : 'bg-emerald-400 text-black'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Settle Bill via {curMode.toUpperCase()}</span>
                      </motion.button>

                      {/* PHYSICAL KOT KITCHEN TICKET PRINT WITH NOTES */}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => printKitchenOrderTicket(curSession)}
                        className="px-4 py-3.5 rounded-[20px] border border-amber-400/40 bg-amber-400/10 text-amber-200 font-bold text-xs uppercase flex items-center gap-1.5 hover:bg-amber-400/20"
                        title="Print Kitchen Order Ticket (Dishes & Notes Only)"
                      >
                        <ChefHat className="w-4 h-4 text-amber-400" />
                        <span>KOT Print</span>
                      </motion.button>

                      {/* Customer Slip */}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => printThermalSlip(curSession)}
                        className="px-4 py-3.5 rounded-[20px] border border-white/10 bg-white/[0.05] text-white font-bold text-xs uppercase flex items-center gap-1.5"
                      >
                        <Printer className="w-4 h-4 text-[#D4AF37]" />
                        <span>Receipt</span>
                      </motion.button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* VIEW B: MENU, COMBOS & PROMOS OPERATIONS HUB */}
        {activeWorkspace === 'menu_hub' && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              {[
                { id: 'items', label: '1. Dishes & Categories', icon: UtensilsCrossed },
                { id: 'combos', label: '2. Smart Dynamic Combos', icon: PackagePlus },
                { id: 'promos', label: '3. Promo Slider Banners', icon: ImageIcon }
              ].map(sub => {
                const Icon = sub.icon;
                const isCur = menuHubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setMenuHubTab(sub.id as any)}
                    className={`px-5 py-2.5 rounded-[20px] text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition ${
                      isCur
                        ? 'bg-[#D4AF37] text-black font-black shadow-md'
                        : 'bg-white/[0.02] border border-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>

            {/* B.1: Dishes & Categories with Instant Stock Toggle */}
            {menuHubTab === 'items' && (
              <div className="space-y-5">
                <div className="p-5 rounded-[28px] bg-gradient-to-b from-[#111115]/90 to-[#09090c]/90 border border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-white uppercase">Categories ({categories.length})</span>
                    <button
                      onClick={() => { setEditingCategory(null); setCategoryName(''); setShowCategoryModal(true); }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-black font-bold text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" /> Add Category
                    </button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto custom-gold-scrollbar pb-2">
                    <button
                      onClick={() => setSelectedCatId('all')}
                      className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold whitespace-nowrap border ${
                        selectedCatId === 'all' ? 'bg-[#D4AF37] text-black border-transparent' : 'bg-white/[0.03] text-neutral-400 border-white/10'
                      }`}
                    >
                      All Dishes ({menuItems.length})
                    </button>
                    {categories.map(c => (
                      <div key={c.id} className="flex items-center rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-1.5 gap-1.5 shrink-0 text-xs font-mono">
                        <button onClick={() => setSelectedCatId(c.id)} className={selectedCatId === c.id ? 'text-[#D4AF37] font-bold' : 'text-neutral-300'}>
                          {c.name_en || c.name}
                        </button>
                        <button 
                          onClick={() => {
                            setEditingCategory(c);
                            setCategoryName(c.name_en || c.name);
                            setShowCategoryModal(true);
                          }} 
                          className="text-neutral-400 hover:text-white ml-1 p-0.5"
                          title="Edit Category Name"
                        >
                          <Edit3 className="w-3 h-3 text-[#D4AF37]" />
                        </button>
                        <button onClick={() => handleDeleteCategory(c.id, c.name_en || c.name)} className="text-rose-400 hover:text-rose-300 p-0.5">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dishes Grid */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-neutral-400 uppercase">
                      Menu Dishes ({selectedCatId === 'all' ? menuItems.length : menuItems.filter(m => m.category_id === selectedCatId).length})
                    </span>
                    <button
                      onClick={() => { setEditingItem(null); setItemName(''); setItemPrice(''); setItemImageUrl(''); setShowItemModal(true); }}
                      className="px-4 py-2 rounded-2xl bg-[#D4AF37] text-black font-black text-xs uppercase flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" /> Add Dish
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(selectedCatId === 'all' ? menuItems : menuItems.filter(m => m.category_id === selectedCatId)).map(item => (
                      <div key={item.id} className="p-4 rounded-[24px] bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3 font-mono text-xs">
                        <div className="flex items-center gap-2.5 truncate">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name_en} className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center shrink-0 text-neutral-600">
                              <UtensilsCrossed className="w-4 h-4" />
                            </div>
                          )}
                          <div className="truncate">
                            <span className="font-bold text-white block truncate">{item.name_en || item.name}</span>
                            <span className="text-[#D4AF37] font-bold text-xs">₹{Number(item.price).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* OUT-OF-STOCK AUTO-HIDE TOGGLE */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleStock(item.id, item.is_available)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase border transition cursor-pointer ${
                              item.is_available 
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25' 
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
                            }`}
                            title={item.is_available ? 'Available on Menu' : 'Auto-Hidden on QR Menu'}
                          >
                            {item.is_available ? 'In Stock' : 'Out'}
                          </button>
                          <button 
                            onClick={() => {
                              setEditingItem(item);
                              setItemName(item.name_en || item.name || '');
                              setItemPrice(String(item.price || ''));
                              setItemDescription(item.description_en || item.description || '');
                              setItemCategoryId(item.category_id);
                              setItemFoodType(item.food_type || 'veg');
                              setItemImageUrl(item.image_url || '');
                              setShowItemModal(true);
                            }} 
                            className="p-1 text-neutral-300 hover:text-white"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteItem(item.id, item.name_en || item.name)} className="p-1 text-rose-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Smart Dynamic Combos */}
            {menuHubTab === 'combos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase font-mono">Dynamic Combo Deals ({combos.length})</h4>
                    <p className="text-xs text-neutral-400 font-mono">Select multiple dishes to auto-sum and publish offer prices.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCombo(null);
                      setComboName('');
                      setSelectedComboItemIds([]);
                      setComboOfferPrice('');
                      setComboImageUrl('');
                      setShowComboModal(true);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-black text-xs uppercase flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> Create New Combo
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {combos.map(combo => (
                    <div key={combo.id} className="p-5 rounded-[28px] bg-white/[0.02] border border-white/10 space-y-2.5 font-mono text-xs">
                      {combo.image_url && (
                        <div className="h-32 rounded-2xl overflow-hidden mb-2 bg-neutral-900 border border-white/10">
                          <img src={combo.image_url} alt={combo.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-white text-sm block">{combo.name || combo.name_en}</span>
                        <button onClick={() => handleDeleteCombo(combo.id, combo.name || combo.name_en)} className="text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-neutral-400">{combo.description || 'Includes selected dishes.'}</p>

                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        <span className="text-[#D4AF37] font-black text-base">₹{Number(combo.price).toFixed(2)}</span>
                        {combo.original_price > combo.price && (
                          <span className="line-through text-neutral-500 text-xs">₹{Number(combo.original_price).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promo Slider Banners */}
            {menuHubTab === 'promos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase font-mono">Menu Promotion Banners ({banners.length})</h4>
                    <p className="text-xs text-neutral-400 font-mono">Customer QR menu page top carousel slides.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 rounded-[28px] bg-white/[0.02] border border-white/10 space-y-3 font-mono text-xs">
                    <span className="font-bold text-white block uppercase">Deploy New Slide</span>
                    <form onSubmit={handleSaveBanner} className="space-y-3">
                      <input
                        type="text"
                        required
                        placeholder="Banner Title"
                        value={newBannerTitle}
                        onChange={(e) => setNewBannerTitle(e.target.value)}
                        className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                      />

                      <input 
                        type="file" 
                        accept="image/*"
                        ref={bannerFileRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) compressAndUploadImage(file, (b64) => setNewBannerImageUrl(b64));
                        }}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => bannerFileRef.current?.click()}
                        className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-neutral-300 hover:border-[#D4AF37] flex items-center justify-center gap-2 text-xs"
                      >
                        <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                        <span>{newBannerImageUrl ? 'Change Selected PC Photo' : 'Choose PC Photo (Up to 3MB)'}</span>
                      </button>

                      {newBannerImageUrl && (
                        <div className="h-24 rounded-xl overflow-hidden border border-white/10">
                          <img src={newBannerImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs">
                        Publish Slide
                      </button>
                    </form>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {banners.map(b => (
                      <div key={b.id} className="p-4 rounded-[24px] bg-white/[0.02] border border-white/10 space-y-2 font-mono text-xs">
                        <div className="h-32 rounded-2xl overflow-hidden bg-neutral-900 border border-white/5">
                          <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white truncate">{b.title}</span>
                          <button onClick={() => handleDeleteBanner(b.id)} className="text-rose-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALS */}
      {/* Add Table Modal */}
      <AnimatePresence>
        {showAddTableModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0d0d0f] border border-white/15 rounded-[28px] p-6 space-y-4 font-mono text-xs shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-black text-white uppercase">Add Dining Table</span>
                <button onClick={() => setShowAddTableModal(false)}><X className="w-4 h-4 text-neutral-400" /></button>
              </div>

              <form onSubmit={handleAddTable} className="space-y-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Table Number *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 12"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Dedicated Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Royal VIP-1"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase mt-2">
                  Deploy Table
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Table Modal */}
      <AnimatePresence>
        {showEditTableNameModal && editingTableObj && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0d0d0f] border border-white/15 rounded-[28px] p-6 space-y-4 font-mono text-xs shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-black text-white uppercase">Rename Table #{editingTableObj.table_number}</span>
                <button onClick={() => setShowEditTableNameModal(false)}><X className="w-4 h-4 text-neutral-400" /></button>
              </div>

              <form onSubmit={handleUpdateTableName} className="space-y-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Custom Table Name *</label>
                  <input
                    type="text"
                    required
                    value={tempCustomTableName}
                    onChange={(e) => setTempCustomTableName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white outline-none font-bold"
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase mt-2">
                  Update Name
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0d0d0f] border border-white/15 rounded-[28px] p-6 space-y-4 font-mono text-xs shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-black text-white uppercase">{editingCategory ? 'Edit Category' : 'New Category'}</span>
                <button onClick={() => setShowCategoryModal(false)}><X className="w-4 h-4 text-neutral-400" /></button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Category Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Milkshakes"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white outline-none font-bold"
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase mt-2">
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Menu Item Modal */}
      <AnimatePresence>
        {showItemModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0d0d0f] border border-white/15 rounded-[28px] p-6 space-y-4 font-mono text-xs shadow-2xl max-h-[90vh] overflow-y-auto custom-gold-scrollbar">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-black text-white uppercase">{editingItem ? 'Edit Dish' : 'Add Dish'}</span>
                <button onClick={() => setShowItemModal(false)}><X className="w-4 h-4 text-neutral-400" /></button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Dish Name *</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-neutral-400 block mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Food Type</label>
                    <select
                      value={itemFoodType}
                      onChange={(e) => setItemFoodType(e.target.value as any)}
                      className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="veg">Veg</option>
                      <option value="non_veg">Non-Veg</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Dish Image (Up to 3MB)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={itemFileRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) compressAndUploadImage(file, (b64) => setItemImageUrl(b64));
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => itemFileRef.current?.click()}
                    className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-neutral-300 hover:border-[#D4AF37] flex items-center justify-center gap-2 text-xs"
                  >
                    <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                    <span>{itemImageUrl ? 'Change Photo' : 'Choose PC Photo'}</span>
                  </button>
                  {itemImageUrl && (
                    <div className="h-20 w-24 rounded-xl overflow-hidden border border-white/10 mt-2">
                      <img src={itemImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Category *</label>
                  <div className="flex gap-2 overflow-x-auto custom-gold-scrollbar p-1 border border-white/10 rounded-xl">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setItemCategoryId(c.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap border ${
                          itemCategoryId === c.id ? 'bg-[#D4AF37] text-black border-transparent' : 'bg-white/[0.03] text-neutral-400 border-white/5'
                        }`}
                      >
                        {c.name_en || c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase mt-2">
                  {editingItem ? 'Update Dish' : 'Publish Dish'}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Combo Modal */}
      <AnimatePresence>
        {showComboModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0d0d0f] border border-white/15 rounded-[28px] p-6 space-y-4 font-mono text-xs shadow-2xl max-h-[92vh] overflow-y-auto custom-gold-scrollbar">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-black text-white uppercase">{editingCombo ? 'Edit Combo' : 'Smart Combo Creator'}</span>
                <button onClick={() => setShowComboModal(false)}><X className="w-4 h-4 text-neutral-400" /></button>
              </div>

              <form onSubmit={handleSaveCombo} className="space-y-3.5">
                <div>
                  <label className="text-neutral-400 block mb-1">Combo Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Dry Fruit Feast"
                    value={comboName}
                    onChange={(e) => setComboName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-neutral-400 block">Select Dishes to Include *</label>
                    <span className="text-[#D4AF37] font-bold">Sum: ₹{comboSumActualPrice.toFixed(2)}</span>
                  </div>

                  <div className="max-h-40 overflow-y-auto custom-gold-scrollbar border border-white/10 rounded-xl p-2 space-y-1 bg-white/[0.02]">
                    {menuItems.map(m => {
                      const isChecked = selectedComboItemIds.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            if (isChecked) setSelectedComboItemIds(selectedComboItemIds.filter(id => id !== m.id));
                            else setSelectedComboItemIds([...selectedComboItemIds, m.id]);
                          }}
                          className={`p-2 rounded-lg flex justify-between items-center cursor-pointer transition ${
                            isChecked ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-white' : 'hover:bg-white/[0.04] text-neutral-400'
                          }`}
                        >
                          <span className="truncate">{m.name_en || m.name}</span>
                          <span className="font-bold text-[#D4AF37]">₹{Number(m.price).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-neutral-400 block mb-1">Actual Combined Total</label>
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-neutral-300 font-bold">
                      ₹{comboSumActualPrice.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <label className="text-emerald-400 block mb-1 font-bold">Offer / Combo Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 299"
                      value={comboOfferPrice}
                      onChange={(e) => setComboOfferPrice(e.target.value)}
                      className="w-full bg-white/[0.04] border border-emerald-500/50 rounded-xl px-3 py-2 text-white font-bold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Combo Photo (Up to 3MB)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={comboFileRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) compressAndUploadImage(file, (b64) => setComboImageUrl(b64));
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => comboFileRef.current?.click()}
                    className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-neutral-300 hover:border-[#D4AF37] flex items-center justify-center gap-2 text-xs"
                  >
                    <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                    <span>{comboImageUrl ? 'Change Photo' : 'Choose PC Photo'}</span>
                  </button>
                  {comboImageUrl && (
                    <div className="h-20 w-24 rounded-xl overflow-hidden border border-white/10 mt-2">
                      <img src={comboImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase mt-2">
                  Publish Combo
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Brand Modal */}
      <AnimatePresence>
        {isNameModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0d0d0f] border border-white/15 rounded-[28px] p-6 space-y-4 font-mono text-xs shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-black text-white uppercase">Edit Restaurant Title</span>
                <button onClick={() => setIsNameModalOpen(false)}><X className="w-4 h-4 text-neutral-400" /></button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                await supabase.from('restaurant_settings').upsert({ id: 1, restaurant_name: tempBrandName.trim().toUpperCase(), tagline: tempTagline.trim() });
                setShopName(tempBrandName.trim().toUpperCase());
                setTagline(tempTagline.trim());
                setIsNameModalOpen(false);
              }} className="space-y-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    required
                    value={tempBrandName}
                    onChange={(e) => setTempBrandName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white outline-none uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Tagline</label>
                  <input
                    type="text"
                    value={tempTagline}
                    onChange={(e) => setTempTagline(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase mt-2">
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Security & Waiter Modals */}
      <AdminSecurityModal isOpen={isSecurityOpen} onClose={() => setIsSecurityOpen(false)} />
      <WaiterSecurityModal isOpen={isWaiterModalOpen} onClose={() => setIsWaiterModalOpen(false)} />
    </div>
  );
}