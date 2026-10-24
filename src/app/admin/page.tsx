// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
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
  Receipt, 
  UtensilsCrossed, 
  Check, 
  X, 
  Edit3, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  LogOut, 
  RotateCcw, 
  Store, 
  UserCheck, 
  SlidersHorizontal, 
  FolderPlus, 
  Tag, 
  FileSpreadsheet, 
  UploadCloud, 
  Image as ImgIcon, 
  Printer, 
  Calculator, 
  LayoutGrid, 
  Sparkles 
} from 'lucide-react';

const fluidSpring = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.55
};

const tabVariant = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12, ease: 'easeIn' } }
};

export default function LuxuryGoldAdminPanel() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Tabs: live orders, menu, sales history
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'history'>('orders');

  const [shopName, setShopName] = useState('VUJWALA SIMHA DRY FRUITS & NUTS');
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
  const [settlingSessionId, setSettlingSessionId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Modals
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [isETablesModalOpen, setIsETablesModalOpen] = useState(false);
  const [editingTableNames, setEditingTableNames] = useState<Record<number, string>>({});
  const [newTableNumberInput, setNewTableNumberInput] = useState('');
  const [newTableNameInput, setNewTableNameInput] = useState('');

  // Live Orders Selection
  const [selectedRunningTableNum, setSelectedRunningTableNum] = useState<number | null>(null);
  const [customerHandedAmounts, setCustomerHandedAmounts] = useState<Record<string, string>>({});

  // Categories & Items Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState<number | null>(null);
  const [itemFoodType, setItemFoodType] = useState<'veg' | 'non_veg'>('veg');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const itemFileRef = useRef<HTMLInputElement>(null);

  // Smart Combo Builder
  const [showSmartComboModal, setShowSmartComboModal] = useState(false);
  const [comboName, setComboName] = useState('');
  const [comboSelectedDishIds, setComboSelectedDishIds] = useState<number[]>([]);
  const [comboDiscountedPrice, setComboDiscountedPrice] = useState('');
  const [comboImageUrl, setComboImageUrl] = useState('');
  const comboFileRef = useRef<HTMLInputElement>(null);

  // Promo Banners State
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerImageUrl, setNewBannerImageUrl] = useState('');
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  // Real Calendar Modal & Date Picker
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [isFilterAllDates, setIsFilterAllDates] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calViewDate, setCalViewDate] = useState<Date>(new Date());
  const calRef = useRef<HTMLDivElement>(null);

  const [selectedCatId, setSelectedCatId] = useState<number | 'all'>('all');

  // Bulletproof Session Sync & Gateway
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rawCookies = document.cookie || '';
    const cookies = rawCookies.split(';').map(c => c.trim());
    const roleCookie = cookies.find(c => c.startsWith('staff_role='));
    const cookieRole = roleCookie ? roleCookie.split('=')[1]?.toLowerCase() : null;

    const tokenCookie = cookies.find(c => c.startsWith('session_token='));
    const cookieToken = tokenCookie ? tokenCookie.split('=')[1] : null;

    const localRole = localStorage.getItem('staff_role')?.toLowerCase();
    const localToken = localStorage.getItem('session_token');
    const adminSession = localStorage.getItem('admin_session');

    // Verification check: checks cookies or localStorage safely
    const hasAdminRole = cookieRole === 'admin' || localRole === 'admin';
    const hasAdminToken = (cookieToken && cookieToken.startsWith('admin_verified_')) || 
                          (localToken && localToken.startsWith('admin_verified_'));
    const hasAdminData = !!adminSession;

    if (hasAdminRole && (hasAdminToken || hasAdminData)) {
      // Re-assert cookies for security & middleware sync
      const isHttps = window.location.protocol === 'https:';
      const cookieConfig = `path=/; max-age=86400; SameSite=Lax${isHttps ? '; Secure' : ''}`;
      const validToken = cookieToken || localToken || `admin_verified_${Date.now()}`;
      
      document.cookie = `staff_role=admin; ${cookieConfig}`;
      document.cookie = `session_token=${validToken}; ${cookieConfig}`;
      
      setIsAuthenticated(true);
      setAuthChecking(false);
    } else {
      setIsAuthenticated(false);
      setAuthChecking(false);
      router.replace('/login');
    }
  }, [router]);

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

  // Parallel Data Load
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [tblsRes, sessRes, catsRes, itmsRes, oitmsRes, bnrsRes] = await Promise.all([
        supabase.from('restaurant_tables').select('*').order('table_number'),
        supabase.from('table_sessions').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('menu_items').select('*').order('id', { ascending: true }),
        supabase.from('order_items').select('*, menu_items(name_en, name, price, category_id, image_url)'),
        supabase.from('promo_banners').select('*').order('id', { ascending: false })
      ]);

      if (tblsRes.data) {
        setTables(tblsRes.data);
        const map: Record<number, string> = {};
        tblsRes.data.forEach(t => { map[t.table_number] = t.table_name || `Table ${t.table_number}`; });
        setEditingTableNames(map);
      }
      if (sessRes.data) setSessions(sessRes.data);
      if (catsRes.data) setCategories(catsRes.data);
      if (itmsRes.data) setMenuItems(itmsRes.data);
      if (oitmsRes.data) setOrderItems(oitmsRes.data);
      if (bnrsRes.data) setBanners(bnrsRes.data);
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
        total_amount: newGross,
        final_payable: newGross
      }).eq('id', sessionId);

      await loadAdminData();
    } catch (err) {
      console.error('Recalculate error:', err);
    }
  };

  const handleCancelOrderItem = async (orderItemId: number, sessionId: string, dishName: string) => {
    if (!confirm(`"${dishName}" item ni CANCEL cheyala? Total bill nunchi minus aipothundi.`)) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('order_items').update({ item_status: 'cancelled' }).eq('id', orderItemId);
      if (error) throw error;
      await recalculateSessionBill(sessionId);
    } catch (err: any) {
      alert('Cancel failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItemQuantity = async (orderItemId: number, currentQty: number, delta: number, sessionId: string) => {
    const nextQty = currentQty + delta;
    if (nextQty <= 0) return alert('Quantity 0 cheyalante "Cancel Item" press cheyandi.');
    try {
      setLoading(true);
      const { error } = await supabase.from('order_items').update({ quantity: nextQty }).eq('id', orderItemId);
      if (error) throw error;
      await recalculateSessionBill(sessionId);
    } catch (err: any) {
      alert('Qty update error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

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
        tagline: updatedTagline
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

  // Instant Reset Floor
  const handleResetFloor = async () => {
    if (!confirm('Active tables annitini VACANT (0 Occupied) ga reset cheyala?')) return;
    setLoading(true);
    try {
      await Promise.all([
        supabase.from('table_sessions').update({ status: 'completed', payment_status: 'paid' }).eq('status', 'active'),
        supabase.from('restaurant_tables').update({ status: 'available' })
      ]);
      setSelectedRunningTableNum(null);
      await loadAdminData();
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
    setIsAuthenticated(false);
    router.replace('/login');
  };

  // =========================================================================
  // BULLETPROOF: SETTLE & MARK AS PAID
  // Marks session as 'paid' & 'completed', frees up the table to 'available'
  // =========================================================================
  const handleSettleAndMarkPaid = async (sessionId: string, tableNumber: number) => {
    setSettlingSessionId(sessionId);
    try {
      // 1. Mark Table Session as PAID & COMPLETED
      const { error: sessErr } = await supabase
        .from('table_sessions')
        .update({
          payment_status: 'paid',
          status: 'completed'
        })
        .eq('id', sessionId);

      if (sessErr) throw sessErr;

      // 2. Mark the physical table as AVAILABLE (Vacant)
      const { error: tblErr } = await supabase
        .from('restaurant_tables')
        .update({ status: 'available' })
        .eq('table_number', tableNumber);

      if (tblErr) throw tblErr;

      // 3. Mark all pending order batches for this session as completed (fail-safe)
      try {
        await supabase
          .from('order_batches')
          .update({ status: 'completed' })
          .eq('session_id', sessionId);
      } catch (e) {
        // order_batches failsafe
      }

      // 4. Reset selected table selection so view shifts smoothly
      setSelectedRunningTableNum(null);

      // 5. Reload admin data immediately
      await loadAdminData();
      alert(`Table #${tableNumber} bill settled & marked as PAID successfully! Table ippudu vacant aipoindi.`);
    } catch (err: any) {
      console.error('Settle error:', err);
      alert('Payment settle cheyadam lo error: ' + (err.message || 'Check database permissions.'));
    } finally {
      setSettlingSessionId(null);
    }
  };

  // Toggle status for Tab 3 (Sales History)
  const handleTogglePaymentStatus = async (sessionId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      const { error } = await supabase.from('table_sessions').update({ payment_status: newStatus }).eq('id', sessionId);
      if (error) throw error;
      await loadAdminData();
    } catch (err: any) {
      alert('Payment update failed: ' + err.message);
    }
  };

  const handleClearTable = async (tableNum: number) => {
    if (!confirm(`Table #${tableNum} ni CLEAR cheyala? Active bill settle aipothundi.`)) return;
    setLoading(true);
    try {
      await Promise.all([
        supabase.from('table_sessions').update({ status: 'completed', payment_status: 'paid' }).eq('table_number', tableNum).eq('status', 'active'),
        supabase.from('restaurant_tables').update({ status: 'available' }).eq('table_number', tableNum)
      ]);
      setSelectedRunningTableNum(null);
      await loadAdminData();
    } catch (err: any) {
      alert('Clear error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDishAvailability = async (itemId: number, currentStatus: boolean) => {
    try {
      setMenuItems(prev => prev.map(m => m.id === itemId ? { ...m, is_available: !currentStatus } : m));
      const { error } = await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', itemId);
      if (error) throw error;
    } catch (err: any) {
      alert('Availability update error: ' + err.message);
      await loadAdminData();
    }
  };

  // CATEGORY CRUD
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = categoryName.trim();
    if (!cleanName) return alert('Category Name enter cheyandi.');

    setLoading(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ name: cleanName, name_en: cleanName })
          .eq('id', editingCategory.id);

        if (error) throw error;
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: cleanName, name_en: cleanName } : c));
      } else {
        const nextSort = (categories.length > 0 ? Math.max(...categories.map(c => Number(c.sort_order || 0))) : 0) + 1;
        const { data, error } = await supabase
          .from('categories')
          .insert({ name: cleanName, name_en: cleanName, sort_order: nextSort })
          .select();

        if (error) throw error;
        if (data && data[0]) setCategories(prev => [...prev, data[0]]);
      }

      setCategoryName('');
      setEditingCategory(null);
      setShowCategoryModal(false);
      await loadAdminData();
    } catch (err: any) {
      alert('Category save error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: number, catName: string) => {
    if (!confirm(`"${catName}" category ni DELETE cheyala?`)) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('categories').delete().eq('id', catId);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== catId));
      if (selectedCatId === catId) setSelectedCatId('all');
      await loadAdminData();
    } catch (err: any) {
      alert('Delete error: ' + (err.message || 'Category lo items unte delete cheyaleru.'));
    } finally {
      setLoading(false);
    }
  };

  const readFileToBase64 = (file: File, callback: (base64: string) => void) => {
    if (file.size > 4 * 1024 * 1024) {
      alert('Image file size 4MB kante thakkuva undali.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result as string);
    reader.readAsDataURL(file);
  };

  // MENU ITEMS CRUD
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
    setItemName(item.name || item.name_en || '');
    setItemPrice(String(item.price || ''));
    setItemDescription(item.description || item.description_en || '');
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
        name: itemName.trim(),
        name_en: itemName.trim(),
        price: priceNum,
        description: itemDescription.trim(),
        description_en: itemDescription.trim(),
        category_id: itemCategoryId,
        food_type: itemFoodType,
        image_url: itemImageUrl.trim(),
        is_available: true
      };

      if (editingItem) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
        if (error) throw error;
        setMenuItems(prev => prev.map(m => m.id === editingItem.id ? { ...m, ...payload } : m));
      } else {
        const { data, error } = await supabase.from('menu_items').insert(payload).select();
        if (error) throw error;
        if (data && data[0]) setMenuItems(prev => [...prev, data[0]]);
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
      setLoading(true);
      const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
      if (error) throw error;
      setMenuItems(prev => prev.filter(m => m.id !== itemId));
      await loadAdminData();
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // SMART COMBO BUILDER
  const comboCombinedOriginalPrice = comboSelectedDishIds.reduce((sum, id) => {
    const item = menuItems.find(m => m.id === id);
    return sum + Number(item?.price || 0);
  }, 0);

  const handleSaveSmartCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboName.trim()) return alert('Combo Name enter cheyandi.');
    if (comboSelectedDishIds.length < 2) return alert('Kamisam 2 dishes select cheyandi.');
    const finalPrice = parseFloat(comboDiscountedPrice);
    if (!finalPrice || finalPrice <= 0) return alert('Valid discounted combo price enter cheyandi.');

    setLoading(true);
    try {
      let comboCat = categories.find(c => (c.name_en || c.name || '').toLowerCase().includes('combo'));
      if (!comboCat) {
        const { data: newCat } = await supabase.from('categories').insert({ name: 'Combo Offers', name_en: 'Combo Offers', sort_order: 0 }).select();
        if (newCat && newCat[0]) comboCat = newCat[0];
      }

      const selectedDishesNames = comboSelectedDishIds
        .map(id => menuItems.find(m => m.id === id)?.name_en || menuItems.find(m => m.id === id)?.name)
        .filter(Boolean)
        .join(' + ');

      const desc = `Includes: ${selectedDishesNames}. Regular Price: ₹${comboCombinedOriginalPrice.toFixed(2)}`;

      const payload = {
        name: comboName.trim(),
        name_en: comboName.trim(),
        price: finalPrice,
        description: desc,
        description_en: desc,
        category_id: comboCat?.id || categories[0]?.id,
        food_type: 'veg',
        image_url: comboImageUrl.trim() || menuItems.find(m => m.id === comboSelectedDishIds[0])?.image_url || '',
        is_available: true
      };

      const { error } = await supabase.from('menu_items').insert(payload).select();
      if (error) throw error;

      setShowSmartComboModal(false);
      setComboName('');
      setComboSelectedDishIds([]);
      setComboDiscountedPrice('');
      setComboImageUrl('');
      await loadAdminData();
      alert('Smart Combo created & published to Menu!');
    } catch (err: any) {
      alert('Combo error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // E-TABLES DYNAMIC CRUD
  const handleAddNewTable = async () => {
    const num = parseInt(newTableNumberInput.trim());
    if (!num || num <= 0) return alert('Valid Table Number enter cheyandi (e.g. 6).');
    if (tables.some(t => t.table_number === num)) return alert(`Table #${num} already undi!`);

    const name = newTableNameInput.trim() || `Table ${num}`;
    setLoading(true);
    try {
      const { error } = await supabase.from('restaurant_tables').insert({
        table_number: num,
        table_name: name,
        status: 'available'
      });
      if (error) throw error;
      setNewTableNumberInput('');
      setNewTableNameInput('');
      await loadAdminData();
    } catch (err: any) {
      alert('Table add error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (tableNumber: number) => {
    if (!confirm(`Table #${tableNumber} ni DELETE cheyala?`)) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('restaurant_tables').delete().eq('table_number', tableNumber);
      if (error) throw error;
      await loadAdminData();
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTableNames = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      for (const t of tables) {
        const customName = editingTableNames[t.table_number]?.trim() || `Table ${t.table_number}`;
        await supabase
          .from('restaurant_tables')
          .update({ table_name: customName })
          .eq('table_number', t.table_number);
      }
      setIsETablesModalOpen(false);
      await loadAdminData();
      alert('E-Tables updated successfully!');
    } catch (err: any) {
      alert('Table update failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // PROMO BANNERS CRUD
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
      setShowPromoModal(false);
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
      setLoading(true);
      await supabase.from('promo_banners').delete().eq('id', bannerId);
      await loadAdminData();
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    } finally {
      setLoading(false);
    }
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
      name: oi.menu_items?.name_en || oi.menu_items?.name || 'Item #' + oi.menu_item_id,
      quantity: oi.quantity || 1,
      price: Number(oi.unit_price || oi.menu_items?.price || 0)
    }));
  };

  const getSessionItemsDetailed = (sessionId: string) => {
    return orderItems.filter(oi => oi.session_id === sessionId);
  };

  // 80mm ESC/POS Thermal Slip
  const printThermalSlip = (session: any) => {
    const items = getSessionOrderedItems(session.id);
    const gross = Number(session.total_amount || 0);
    const matchingTable = tables.find(t => t.table_number === session.table_number);
    const tableName = matchingTable?.table_name || `Table #${session.table_number}`;

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
              width: 72mm; margin: 0 auto; padding: 8mm 2mm;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px; color: #000; line-height: 1.25;
            }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .item-row { display: flex; justify-between; margin-bottom: 3px; }
            .item-name { width: 55%; word-break: break-word; }
            .item-qty { width: 15%; text-align: center; }
            .item-total { width: 30%; text-align: right; }
            .total-row { display: flex; justify-between; font-size: 13px; font-weight: bold; margin-top: 4px; }
            .footer { font-size: 9px; text-align: center; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="text-center bold" style="font-size: 13px;">${shopName}</div>
          <div class="text-center" style="font-size: 9px;">${tagline}</div>
          <div class="divider"></div>
          <div>Date: ${new Date(session.created_at).toLocaleDateString('en-IN')} ${new Date(session.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
          <div>Table: <span class="bold">${tableName}</span></div>
          <div>Guest: ${session.customer_name || 'Walk-in'} (${session.customer_phone || '-'})</div>
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
            <span>NET TOTAL:</span>
            <span>₹${gross.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="footer">
            <div>Thank you! • Visit Us Again!</div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
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

  // Date-wise Demand Aggregator
  const selectedDateOrderedMap: Record<number, { name: string; quantity: number; revenue: number; price: number }> = {};
  menuItems.forEach(mi => {
    selectedDateOrderedMap[mi.id] = { 
      name: mi.name_en || mi.name || 'Dish #' + mi.id, 
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
      if (!selectedDateOrderedMap[mId]) {
        selectedDateOrderedMap[mId] = {
          name: oi.menu_items?.name_en || oi.menu_items?.name || 'Dish #' + mId,
          quantity: 0,
          revenue: 0,
          price
        };
      }
      selectedDateOrderedMap[mId].quantity += qty;
      selectedDateOrderedMap[mId].revenue += qty * price;
    }
  });

  const rankedSalesForDate = Object.entries(selectedDateOrderedMap)
    .map(([id, stats]) => ({ id: Number(id), ...stats }))
    .filter(d => d.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity);

  const activeSessions = sessions.filter(s => s.status === 'active' && s.payment_status !== 'paid');
  const filteredRevenue = filteredSessions.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const filteredMenuItems = selectedCatId === 'all' ? menuItems : menuItems.filter(m => m.category_id === selectedCatId);

  // Sheets TSV Export
  const copyToGoogleSheets = () => {
    const headers = ['Date', 'Time', 'Table #', 'Table Name', 'Ordered Dishes & Qty', 'Total Bill (₹)', 'Customer Paid (₹)', 'Change Returned (₹)', 'Payment Status'];
    const rows = filteredSessions.map(s => {
      const d = new Date(s.created_at);
      const itemsList = getSessionOrderedItems(s.id).map(i => `${i.quantity}x ${i.name}`).join(', ');
      const gross = Number(s.total_amount) || 0;
      const handed = parseFloat(customerHandedAmounts[s.id] || gross) || gross;
      const change = handed > gross ? (handed - gross).toFixed(2) : '0.00';
      const matchingTable = tables.find(t => t.table_number === s.table_number);

      return [
        d.toLocaleDateString('en-IN'),
        d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        s.table_number,
        matchingTable?.table_name || `Table #${s.table_number}`,
        `"${itemsList || 'None'}"`,
        gross.toFixed(2),
        handed.toFixed(2),
        change,
        s.payment_status || s.status
      ];
    });

    const tsvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // Real Calendar Days Grid
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
          className={`h-8 w-8 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center relative cursor-pointer ${
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

  if (authChecking) {
    return (
      <div className="min-h-screen w-full bg-[#050505] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-2 border-white/10 border-t-[#D4AF37] rounded-full animate-spin" />
        <span className="text-[#D4AF37] font-mono text-xs tracking-widest uppercase font-bold">
          Verifying Console Credentials...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-[#050505] text-[#FCF6BA] font-sans pb-32 relative overflow-x-hidden antialiased">
      <style jsx global>{`
        .admin-gold-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .admin-gold-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 9999px;
        }
        .admin-gold-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #FCF6BA, #D4AF37);
          border-radius: 9999px;
          border: 1px solid rgba(0, 0, 0, 0.4);
        }
        .admin-gold-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #AA771C;
        }
        input[type='number']::-webkit-inner-spin-button,
        input[type='number']::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type='number'] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>

      {/* Top Glass Header */}
      <header className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-6 py-3.5 shadow-2xl">
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

          <div className="flex items-center gap-2 relative flex-wrap justify-end">
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

            {/* Instant Fast Floor Reset */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleResetFloor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:border-[#D4AF37]/40 text-[#FCF6BA] text-xs font-mono font-bold transition cursor-pointer"
              title="Reset all tables to vacant"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Reset Floor</span>
              <span>({activeSessions.length}/{tables.length})</span>
            </motion.button>

            {/* Real Interactive Calendar Picker */}
            <div className="relative" ref={calRef}>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#FCF6BA] text-xs font-mono font-black shadow-md backdrop-blur-md cursor-pointer hover:border-[#D4AF37]/40"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{isFilterAllDates ? 'All History' : selectedDate}</span>
              </motion.button>

              <AnimatePresence>
                {showCalendar && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 8 }}
                    transition={fluidSpring}
                    className="absolute right-0 top-11 w-72 bg-[#0c0c0e] border border-[#D4AF37]/40 rounded-3xl p-4 shadow-2xl z-50 select-none backdrop-blur-3xl"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                      <button onClick={() => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1))} className="cursor-pointer">
                        <ChevronLeft className="w-4 h-4 text-[#FCF6BA]" />
                      </button>
                      <span className="text-xs font-black text-[#FCF6BA] uppercase tracking-wider">
                        {calViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 1))} className="cursor-pointer">
                        <ChevronRight className="w-4 h-4 text-[#FCF6BA]" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 place-items-center mb-1 text-[10px] text-neutral-500 font-mono font-bold">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 place-items-center">
                      {renderCalendarDays()}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10 text-[11px] font-bold">
                      <button onClick={() => { setSelectedDate(getTodayStr()); setIsFilterAllDates(false); setShowCalendar(false); }} className="text-[#FCF6BA] hover:underline font-mono cursor-pointer">
                        Today
                      </button>
                      <button onClick={() => { setIsFilterAllDates(true); setShowCalendar(false); }} className="bg-[#D4AF37] text-black font-black px-2.5 py-1 rounded-xl text-[10px] uppercase shadow-sm cursor-pointer">
                        All History
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sheets TSV Export */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={copyToGoogleSheets}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                copySuccess ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-white/[0.03] border-white/[0.1] text-[#FCF6BA] hover:border-[#D4AF37]/40'
              }`}
            >
              {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-[#D4AF37]" />}
              <span>{copySuccess ? 'Copied TSV' : 'Sheets'}</span>
            </motion.button>

            {/* Instant Fast Refresh */}
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

      {/* Quick Action Navigation Bar */}
      <section className="border-b border-white/[0.06] bg-black/40 px-4 sm:px-6 py-2.5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto admin-gold-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase font-bold">
              Console Tools:
            </span>

            {/* E-Tables Button */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsETablesModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.1] text-[#FCF6BA] font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-1.5 hover:border-[#D4AF37]/50 transition cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>E-Tables ({tables.length})</span>
            </motion.button>

            {/* Order History */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-black uppercase font-mono tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'history' 
                  ? 'bg-[#D4AF37] text-black border-transparent shadow-md' 
                  : 'bg-white/[0.03] border-white/[0.1] text-[#FCF6BA] hover:border-[#D4AF37]/50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Order History</span>
            </motion.button>

            {/* Security */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsSecurityOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.1] text-[#FCF6BA] font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-1.5 hover:border-[#D4AF37]/50 transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Security</span>
            </motion.button>

            {/* Waiter */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsWaiterModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.1] text-[#FCF6BA] font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-1.5 hover:border-[#D4AF37]/50 transition cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Waiter</span>
            </motion.button>
          </div>

          <div className="text-[11px] font-mono text-neutral-400 shrink-0 hidden md:block">
            {activeSessions.length} active tables running • ₹{filteredRevenue.toFixed(2)} net
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Core Operational Tabs */}
        <div className="p-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl w-full shadow-xl flex items-center gap-1.5 overflow-x-auto admin-gold-scrollbar">
          {[
            { id: 'orders', label: `1. Live Orders (${activeSessions.length})`, icon: Calculator },
            { id: 'menu', label: `2. Menu & Combos (${menuItems.length})`, icon: UtensilsCrossed },
            { id: 'history', label: `3. Sales & History (${filteredSessions.length})`, icon: Receipt },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap select-none transition cursor-pointer ${
                  isActive ? 'text-black font-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="adminGlassPill"
                    className="absolute inset-0 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] rounded-xl shadow-[0_2px_15px_rgba(212,175,55,0.4)]"
                    transition={fluidSpring}
                  />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Views */}
        <AnimatePresence mode="wait">
          {/* TAB 1: Live Orders & Cash Handover */}
          {activeTab === 'orders' && (
            <motion.div key="orders-tab" variants={tabVariant} initial="initial" animate="animate" exit="exit" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                    <Calculator className="w-4 h-4 text-[#D4AF37]" /> Live Orders & Cash Handover ({activeSessions.length} Active Tables)
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    Floor dining orders, quantity edits, cancellation, print slip mariyu cash handover change calculator.
                  </p>
                </div>
              </div>

              {activeSessions.length === 0 ? (
                <div className="p-16 rounded-3xl bg-white/[0.02] border border-white/[0.08] text-center text-neutral-500 font-mono text-xs">
                  Prasthutham active dining orders em levu. (All tables vacant)
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl shadow-xl">
                  {/* Left Column: Active Tables */}
                  <div className="md:col-span-4 pr-0 md:pr-4 space-y-2 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0">
                    <span className="text-[10px] font-mono text-[#D4AF37] font-bold block uppercase mb-1">
                      Running Tables:
                    </span>
                    {activeSessions.map((sess) => {
                      const activeTblNum = selectedRunningTableNum ?? activeSessions[0]?.table_number;
                      const isSelected = activeTblNum === sess.table_number;
                      const finalAmt = Number(sess.total_amount || 0);
                      const matchingTbl = tables.find(t => t.table_number === sess.table_number);

                      return (
                        <div
                          key={sess.id}
                          onClick={() => setSelectedRunningTableNum(sess.table_number)}
                          className={`p-3.5 rounded-2xl border text-xs font-mono transition cursor-pointer flex justify-between items-center ${
                            isSelected
                              ? 'bg-[#D4AF37] text-black font-black border-transparent shadow-lg'
                              : 'bg-white/[0.02] border-white/10 text-white hover:border-[#D4AF37]/40'
                          }`}
                        >
                          <div>
                            <span className="font-bold block text-sm">
                              {matchingTbl?.table_name || `Table #${sess.table_number}`}
                            </span>
                            <span className="text-[10px] opacity-75">{sess.customer_name || 'Guest'}</span>
                          </div>
                          <span className="text-sm font-black">₹{finalAmt.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Selected Table Details */}
                  <div className="md:col-span-8 pl-0 md:pl-2 space-y-4">
                    {(() => {
                      const activeTblNum = selectedRunningTableNum ?? activeSessions[0]?.table_number;
                      const curSession = activeSessions.find(s => s.table_number === activeTblNum) || activeSessions[0];
                      if (!curSession) return null;

                      const items = getSessionItemsDetailed(curSession.id);
                      const grossTotal = Number(curSession.total_amount || 0);
                      const finalPayable = grossTotal;

                      const handedInput = customerHandedAmounts[curSession.id] || '';
                      const handedNum = parseFloat(handedInput) || 0;
                      const balanceToReturn = handedNum >= finalPayable ? (handedNum - finalPayable).toFixed(2) : '0.00';
                      const remainingDue = handedNum < finalPayable ? (finalPayable - handedNum).toFixed(2) : '0.00';
                      const matchingTbl = tables.find(t => t.table_number === curSession.table_number);

                      return (
                        <div className="space-y-4 font-mono">
                          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex justify-between items-center text-xs">
                            <div>
                              <span className="text-base font-bold text-white block">
                                {matchingTbl?.table_name || `Table #${curSession.table_number}`} (Table #{curSession.table_number})
                              </span>
                              <span className="text-[11px] text-neutral-400">Customer: {curSession.customer_name || 'Guest'} ({curSession.customer_phone || '-'})</span>
                            </div>
                            <span className="text-[11px] text-[#D4AF37] font-bold">
                              Seated: {new Date(curSession.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[11px] text-neutral-400 uppercase font-bold block">
                              Ordered Items (Edit Qty / Cancel):
                            </span>
                            <div className="space-y-1.5 max-h-52 overflow-y-auto admin-gold-scrollbar p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
                              {items.map((it) => {
                                const isCancelled = it.item_status === 'cancelled';
                                const dName = it.menu_items?.name_en || it.menu_items?.name || 'Dish #' + it.menu_item_id;
                                const dPrice = Number(it.unit_price || it.menu_items?.price || 0);

                                return (
                                  <div key={it.id} className={`flex justify-between items-center p-2 rounded-xl border ${isCancelled ? 'bg-rose-950/20 border-rose-500/30' : 'bg-black/50 border-white/5'}`}>
                                    <div>
                                      <span className={`font-bold block ${isCancelled ? 'line-through text-rose-300' : 'text-white'}`}>
                                        {it.quantity}x {dName}
                                      </span>
                                      <span className="text-[10px] text-neutral-400">₹{(it.quantity * dPrice).toFixed(2)}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {!isCancelled ? (
                                        <>
                                          <button
                                            onClick={() => handleUpdateItemQuantity(it.id, it.quantity, -1, curSession.id)}
                                            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white cursor-pointer"
                                          >
                                            <Minus className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleUpdateItemQuantity(it.id, it.quantity, 1, curSession.id)}
                                            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white cursor-pointer"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleCancelOrderItem(it.id, curSession.id, dName)}
                                            className="px-2 py-1 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 font-bold text-[10px] cursor-pointer"
                                          >
                                            Cancel Item
                                          </button>
                                        </>
                                      ) : (
                                        <span className="text-[10px] font-bold text-rose-400 uppercase bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-500/30">
                                          Item Cancelled
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5 text-xs">
                            <div className="flex justify-between text-neutral-400">
                              <span>Orders Subtotal:</span>
                              <span className="text-white font-bold">₹{grossTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-white font-black text-sm pt-1.5 border-t border-white/10">
                              <span>Total Bill (Payable):</span>
                              <span className="text-base text-[#D4AF37]">₹{finalPayable.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Cash Handover Change Calculator */}
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-black via-[#111114] to-black border border-[#D4AF37]/50 space-y-3">
                            <span className="text-xs font-bold text-[#FCF6BA] uppercase flex items-center gap-1.5">
                              <Calculator className="w-4 h-4 text-[#D4AF37]" /> Cash Handover & Change Calculator
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                              <div>
                                <label className="text-[11px] text-neutral-300 block mb-1">
                                  Handed Amount (కస్టమర్ ఇచ్చిన మొత్తం) *
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37] font-bold">₹</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g. 500"
                                    value={handedInput}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9.]/g, '');
                                      setCustomerHandedAmounts({
                                        ...customerHandedAmounts,
                                        [curSession.id]: val
                                      });
                                    }}
                                    className="w-full bg-[#161619] border border-[#D4AF37]/50 rounded-xl pl-8 pr-3 py-2 text-white font-black text-base outline-none focus:border-[#D4AF37]"
                                  />
                                </div>
                              </div>

                              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col justify-center text-right">
                                <span className="text-[10px] uppercase text-neutral-400">
                                  Change (ఇవ్వాల్సిన చిల్లర):
                                </span>
                                <span className={`text-xl font-black mt-0.5 ${handedNum >= finalPayable && handedNum > 0 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                                  ₹{balanceToReturn}
                                </span>
                                {handedNum > 0 && handedNum < finalPayable && (
                                  <span className="text-[10px] text-rose-400 font-bold">
                                    Still Short: ₹{remainingDue}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              disabled={settlingSessionId === curSession.id}
                              onClick={() => handleSettleAndMarkPaid(curSession.id, curSession.table_number)}
                              className="flex-1 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#c29f2d] text-black font-black uppercase text-xs shadow-md cursor-pointer transition disabled:opacity-50"
                            >
                              {settlingSessionId === curSession.id ? 'Settling Bill...' : 'SETTLE & MARK AS PAID'}
                            </button>
                            <button
                              onClick={() => printThermalSlip(curSession)}
                              className="px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                            >
                              <Printer className="w-4 h-4 text-[#D4AF37]" /> Print Slip
                            </button>
                            <button
                              onClick={() => handleClearTable(curSession.table_number)}
                              className="px-4 py-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 font-bold text-xs uppercase cursor-pointer"
                            >
                              Clear Table
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: Menu Edits + Smart Combos + Promos */}
          {activeTab === 'menu' && (
            <motion.div key="menu-tab" variants={tabVariant} initial="initial" animate="animate" exit="exit" className="space-y-6">
              
              {/* Category Bar */}
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="font-black text-white text-sm uppercase tracking-wider font-mono">
                      Menu Categories ({categories.length})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setShowSmartComboModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-[#D4AF37]/50 text-[#FCF6BA] font-bold text-xs font-mono uppercase flex items-center gap-1.5 shadow-md cursor-pointer hover:border-[#D4AF37]"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Combine Dishes (Combo)
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setShowPromoModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-[#FCF6BA] font-bold text-xs font-mono uppercase flex items-center gap-1.5 cursor-pointer hover:border-[#D4AF37]"
                    >
                      <ImgIcon className="w-3.5 h-3.5 text-[#D4AF37]" /> Promo Banners ({banners.length})
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryName('');
                        setShowCategoryModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5 stroke-[3]" /> Add Category
                    </motion.button>
                  </div>
                </div>

                <div className="flex gap-2.5 overflow-x-auto admin-gold-scrollbar pb-2 pt-1">
                  <button
                    onClick={() => setSelectedCatId('all')}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap border shrink-0 transition cursor-pointer ${
                      selectedCatId === 'all'
                        ? 'bg-[#D4AF37] text-black border-transparent font-black shadow-md'
                        : 'bg-white/[0.03] text-neutral-400 border-white/[0.08] hover:text-white'
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
                        className={`flex items-center rounded-2xl border px-3.5 py-1.5 gap-2 shrink-0 transition ${
                          isSelected 
                            ? 'border-[#D4AF37] bg-white/[0.06] text-white font-bold' 
                            : 'border-white/[0.08] bg-white/[0.02] text-neutral-400 hover:text-white'
                        }`}
                      >
                        <button onClick={() => setSelectedCatId(cat.id)} className="text-xs whitespace-nowrap cursor-pointer">
                          {cat.name_en || cat.name} ({count})
                        </button>

                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryName(cat.name_en || cat.name);
                            setShowCategoryModal(true);
                          }}
                          className="p-1 hover:text-[#FCF6BA] text-neutral-400 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name_en || cat.name)}
                          className="p-1 hover:text-rose-400 text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dishes Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-[#D4AF37]" />
                    Dishes in {selectedCatId === 'all' ? 'All Categories' : (categories.find(c => c.id === selectedCatId)?.name_en || 'Category')} ({filteredMenuItems.length})
                  </h3>

                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => openAddItemModal(selectedCatId === 'all' ? undefined : selectedCatId)}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> Add Menu Item
                  </motion.button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMenuItems.map(item => (
                    <div key={item.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between shadow-md gap-3 backdrop-blur-2xl">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {item.image_url ? (
                          <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-neutral-900">
                            <img src={item.image_url} alt={item.name_en || item.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl border border-white/5 shrink-0 bg-neutral-950 flex items-center justify-center text-neutral-600">
                            <ImgIcon className="w-6 h-6" />
                          </div>
                        )}

                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.food_type === 'non_veg' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <h4 className="font-bold text-white text-sm truncate">{item.name_en || item.name}</h4>
                          </div>
                          <span className="font-mono text-[#D4AF37] font-bold text-xs mt-1 block">₹{Number(item.price).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Instant Stock Badge */}
                        <button
                          onClick={() => handleToggleDishAvailability(item.id, item.is_available)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-black uppercase border transition cursor-pointer ${
                            item.is_available 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                          }`}
                        >
                          {item.is_available ? 'In Stock' : 'Out'}
                        </button>

                        <button onClick={() => openEditItemModal(item)} className="p-1.5 rounded-lg border border-white/[0.1] text-neutral-300 hover:text-white cursor-pointer">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button onClick={() => handleDeleteItem(item.id, item.name_en || item.name)} className="p-1.5 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: Sales Ledger + Date-wise Items Demand + Receipts */}
          {activeTab === 'history' && (
            <motion.div key="history-tab" variants={tabVariant} initial="initial" animate="animate" exit="exit" className="space-y-6">
              
              {/* Particular Date Demand / Quantity Sold Breakdown */}
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-white text-sm uppercase flex items-center gap-2 font-mono">
                    <Flame className="w-4 h-4 text-[#D4AF37]" /> Dishes Sold on {isFilterAllDates ? 'All Dates' : selectedDate} ({rankedSalesForDate.length} Unique Items)
                  </h4>
                  <span className="text-[11px] font-mono text-[#D4AF37] font-bold">
                    {filteredSessions.length} Receipts • ₹{filteredRevenue.toFixed(2)} Net
                  </span>
                </div>

                {rankedSalesForDate.length === 0 ? (
                  <p className="text-xs text-neutral-500 font-mono">Ee date lo sales record avaledu.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto admin-gold-scrollbar">
                    {rankedSalesForDate.map((dish, idx) => (
                      <div key={dish.id} className="p-3 rounded-2xl bg-black/40 border border-white/5 flex justify-between items-center text-xs font-mono">
                        <div>
                          <span className="font-bold text-white block truncate max-w-[150px]">#{idx + 1} {dish.name}</span>
                          <span className="text-[10px] text-neutral-400">₹{dish.price.toFixed(2)} each</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#D4AF37] font-black block">{dish.quantity} Sold</span>
                          <span className="text-[10px] text-emerald-400">₹{dish.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Receipts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSessions.map(session => {
                  const items = getSessionOrderedItems(session.id);
                  const gross = Number(session.total_amount || 0);
                  const isPaid = session.payment_status === 'paid' || session.status === 'completed';
                  const matchingTable = tables.find(t => t.table_number === session.table_number);

                  return (
                    <div key={session.id} className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl space-y-3.5 shadow-md">
                      <div className="flex justify-between border-b border-white/[0.06] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#D4AF37] text-black font-black text-xs px-2.5 py-0.5 rounded-lg">
                            {matchingTable?.table_name || `Table #${session.table_number}`}
                          </span>
                          <button
                            onClick={() => handleTogglePaymentStatus(session.id, session.payment_status)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono border cursor-pointer ${
                              isPaid ? 'border-emerald-500/50 text-emerald-300' : 'border-rose-500/50 text-rose-300'
                            }`}
                          >
                            {isPaid ? 'PAID' : 'NOT PAID'}
                          </button>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => printThermalSlip(session)}
                          className="px-2.5 py-1 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:border-[#D4AF37]/50 text-white font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3 text-[#D4AF37]" />
                          <span>80mm Slip</span>
                        </motion.button>
                      </div>

                      <div className="flex justify-between text-xs text-neutral-300">
                        <span>Guest: <strong className="text-white">{session.customer_name || 'Walk-in'}</strong></span>
                        <span className="font-mono text-neutral-400">{session.customer_phone || '-'}</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-1 text-xs font-mono">
                        {items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-neutral-300">
                            <span>{it.quantity}x {it.name}</span>
                            <span>₹{(it.quantity * it.price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex justify-between items-center text-xs font-mono">
                        <span className="text-neutral-400">Total Settled:</span>
                        <span className="text-base font-black text-[#D4AF37]">₹{gross.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* SMART COMBO BUILDER MODAL */}
      <AnimatePresence>
        {showSmartComboModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0d0d0f] border border-[#D4AF37]/50 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto admin-gold-scrollbar font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base">Smart Combo Creator</h3>
                </div>
                <button onClick={() => setShowSmartComboModal(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveSmartCombo} className="space-y-4">
                <div>
                  <label className="text-neutral-300 block mb-1">Combo Offer Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Maharaja Feast"
                    value={comboName}
                    onChange={(e) => setComboName(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 block mb-1.5">Select Dishes to Combine (Min 2):</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto admin-gold-scrollbar p-2 bg-black/50 border border-white/10 rounded-xl">
                    {menuItems.map(item => {
                      const isSelected = comboSelectedDishIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setComboSelectedDishIds(prev => 
                              isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                            );
                          }}
                          className={`p-2 rounded-lg border text-[11px] cursor-pointer flex justify-between items-center transition ${
                            isSelected ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white font-bold' : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <span className="truncate max-w-[130px]">{item.name_en || item.name}</span>
                          <span>₹{item.price}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Auto Cost Summary */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Combined Dishes Price:</span>
                    <span className="text-white font-bold">₹{comboCombinedOriginalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Selected Items Count:</span>
                    <span className="text-[#D4AF37] font-bold">{comboSelectedDishIds.length} Dishes</span>
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 block mb-1">Discounted Combo Offer Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder={`e.g. ${comboCombinedOriginalPrice > 0 ? (comboCombinedOriginalPrice * 0.85).toFixed(0) : '190'}`}
                    value={comboDiscountedPrice}
                    onChange={(e) => setComboDiscountedPrice(e.target.value)}
                    className="w-full bg-black/60 border border-[#D4AF37]/60 rounded-xl px-3.5 py-2.5 text-white font-black text-sm outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 block mb-1">Optional Combo Picture (from PC)</label>
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
                  <button
                    type="button"
                    onClick={() => comboFileRef.current?.click()}
                    className="w-full py-2.5 rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-white hover:border-[#D4AF37]/40 flex items-center justify-center gap-2 font-mono text-xs cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                    <span>{comboImageUrl ? 'Change Combo Image' : 'Choose PC Image'}</span>
                  </button>
                  {comboImageUrl && (
                    <div className="h-20 w-24 rounded-xl overflow-hidden border border-white/10 mt-2">
                      <img src={comboImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black uppercase text-xs shadow-md cursor-pointer hover:brightness-110"
                >
                  Publish Combo to Menu
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* E-TABLES DYNAMIC MANAGEMENT MODAL */}
      <AnimatePresence>
        {isETablesModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0d0d0f] border border-[#D4AF37]/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto admin-gold-scrollbar font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base">E-Tables Management</h3>
                </div>
                <button onClick={() => setIsETablesModalOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* Add New Table Input Bar */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[#D4AF37]/30 space-y-2">
                <span className="text-[10px] text-[#D4AF37] uppercase font-bold block">Add New Table (+)</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Tbl #"
                    value={newTableNumberInput}
                    onChange={(e) => setNewTableNumberInput(e.target.value)}
                    className="w-20 bg-black/60 border border-white/10 rounded-xl px-2.5 py-2 text-white font-bold outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Custom Table Name (e.g. Royal Simha)"
                    value={newTableNameInput}
                    onChange={(e) => setNewTableNameInput(e.target.value)}
                    className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  />
                  <button
                    onClick={handleAddNewTable}
                    className="px-4 py-2 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs cursor-pointer shadow-md"
                  >
                    Add +
                  </button>
                </div>
              </div>

              {/* Existing Tables List */}
              <form onSubmit={handleSaveTableNames} className="space-y-3">
                <div className="space-y-2 max-h-60 overflow-y-auto admin-gold-scrollbar pr-1">
                  {tables.map((t) => (
                    <div key={t.table_number} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="w-16 font-bold text-[#D4AF37] shrink-0">
                        #{t.table_number}:
                      </span>
                      <input
                        type="text"
                        value={editingTableNames[t.table_number] || ''}
                        onChange={(e) => {
                          setEditingTableNames({
                            ...editingTableNames,
                            [t.table_number]: e.target.value
                          });
                        }}
                        className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-white font-bold outline-none focus:border-[#D4AF37]"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteTable(t.table_number)}
                        className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 hover:bg-rose-900/50 cursor-pointer"
                        title="Delete Table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsETablesModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 font-bold uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black uppercase shadow-md cursor-pointer disabled:opacity-50"
                  >
                    Save All Table Names
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* PROMO BANNERS MODAL */}
      <AnimatePresence>
        {showPromoModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0d0d0f] border border-[#D4AF37]/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto admin-gold-scrollbar font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <ImgIcon className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-black text-white text-base">Promo Banners</h3>
                </div>
                <button onClick={() => setShowPromoModal(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveBanner} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Banner Title (e.g. Chef Royal Weekend)"
                  value={newBannerTitle}
                  onChange={(e) => setNewBannerTitle(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2 text-white outline-none focus:border-[#D4AF37]"
                />

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
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-white hover:border-[#D4AF37]/40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                  <span>{newBannerImageUrl ? 'Change Banner Photo' : 'Upload Banner Photo from PC'}</span>
                </button>

                {newBannerImageUrl && (
                  <div className="h-24 w-full rounded-xl overflow-hidden border border-white/10">
                    <img src={newBannerImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase cursor-pointer">
                  {editingBanner ? 'Update Banner' : 'Publish Banner'}
                </button>
              </form>

              <div className="grid grid-cols-2 gap-2 pt-2">
                {banners.map(b => (
                  <div key={b.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <div className="h-20 rounded-lg overflow-hidden bg-black/60">
                      <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="truncate max-w-[120px] font-bold">{b.title}</span>
                      <button onClick={() => handleDeleteBanner(b.id)} className="text-rose-400 p-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0d0d0f] border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-base">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
                <button onClick={() => setShowCategoryModal(false)} className="text-neutral-400"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-neutral-300 block mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dry Fruit Juices"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md cursor-pointer">
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Modal */}
      <AnimatePresence>
        {showItemModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0d0d0f] border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto admin-gold-scrollbar">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-base">{editingItem ? 'Edit Dish' : 'Add Menu Item'}</h3>
                <button onClick={() => setShowItemModal(false)} className="text-neutral-400"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-300 block mb-1">Dish Name *</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-neutral-300 block mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-[#D4AF37]/50"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-300 block mb-1">Food Type</label>
                    <select
                      value={itemFoodType}
                      onChange={(e) => setItemFoodType(e.target.value as any)}
                      className="w-full bg-[#141416] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none"
                    >
                      <option value="veg">Veg</option>
                      <option value="non_veg">Non-Veg</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 block mb-1">Upload Image from PC</label>
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
                  <button
                    type="button"
                    onClick={() => itemFileRef.current?.click()}
                    className="w-full py-2.5 rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-white hover:border-[#D4AF37]/40 flex items-center justify-center gap-2 font-mono text-xs cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                    <span>{itemImageUrl ? 'Change Selected PC Image' : 'Choose PC Image'}</span>
                  </button>
                  {itemImageUrl && (
                    <div className="h-20 w-24 rounded-xl overflow-hidden border border-white/10 mt-2">
                      <img src={itemImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-neutral-300 block mb-1">Category *</label>
                  <div className="flex gap-2 overflow-x-auto admin-gold-scrollbar p-1.5 border border-white/10 rounded-xl">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setItemCategoryId(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border cursor-pointer ${
                          itemCategoryId === c.id ? 'bg-[#D4AF37] text-black border-transparent' : 'bg-white/[0.03] text-neutral-400 border-white/5'
                        }`}
                      >
                        {c.name_en || c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md mt-1 cursor-pointer">
                  {editingItem ? 'Update Dish' : 'Publish Dish'}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Brand Modal */}
      <AnimatePresence>
        {isNameModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0d0d0f] border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-base">Edit Restaurant Name</h3>
                <button onClick={() => setIsNameModalOpen(false)} className="text-neutral-400"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveBrand} className="space-y-4 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-1">Restaurant Title *</label>
                  <input
                    type="text"
                    required
                    value={tempBrandName}
                    onChange={(e) => setTempBrandName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none uppercase focus:border-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Sub-Tagline</label>
                  <input
                    type="text"
                    value={tempTagline}
                    onChange={(e) => setTempTagline(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md cursor-pointer">
                  Save Brand
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AdminSecurityModal isOpen={isSecurityOpen} onClose={() => setIsSecurityOpen(false)} />
      <WaiterSecurityModal isOpen={isWaiterModalOpen} onClose={() => setIsWaiterModalOpen(false)} />
    </div>
  );
}