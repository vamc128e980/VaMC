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
  IndianRupee, 
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
  Image as ImgIcon,
  Printer
} from 'lucide-react';

const fluidSpring = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.55
};

const tapElasticSpring = {
  type: 'spring',
  stiffness: 450,
  damping: 24,
  mass: 0.5
};

const tabVariant = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
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

  // Dedicated Table Name Edit Modal State
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [newTableName, setNewTableName] = useState('');

  const [editingTableObj, setEditingTableObj] = useState<any | null>(null);
  const [showEditTableNameModal, setShowEditTableNameModal] = useState(false);
  const [tempCustomTableName, setTempCustomTableName] = useState('');

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

  // TABLES CRUD
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
    if (!cleanName) return alert('Table Dedicated Name enter cheyandi.');

    try {
      setLoading(true);
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ table_name: cleanName })
        .eq('table_number', editingTableObj.table_number);

      if (error) throw error;

      setTables(prev => prev.map(t => t.table_number === editingTableObj.table_number ? { ...t, table_name: cleanName } : t));
      setShowEditTableNameModal(false);
      setEditingTableObj(null);
      await loadAdminData();
      alert(`Table #${editingTableObj.table_number} dedicated name updated to "${cleanName}"!`);
    } catch (err: any) {
      alert('Name update error: ' + err.message);
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

  // CATEGORY SAVE FIX
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = categoryName.trim();
    if (!cleanName) return alert('Category Name enter cheyandi.');

    setLoading(true);
    try {
      const categoryPayload = {
        name: cleanName,
        name_en: cleanName
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryPayload)
          .eq('id', editingCategory.id);

        if (error) throw error;
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...categoryPayload } : c));
      } else {
        const nextSort = (categories.length > 0 ? Math.max(...categories.map(c => Number(c.sort_order || 0))) : 0) + 1;
        const { data, error } = await supabase
          .from('categories')
          .insert({ 
            ...categoryPayload,
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

  const readFileToBase64 = (file: File, callback: (base64: string) => void) => {
    if (file.size > 3 * 1024 * 1024) {
      alert('Image file size 3MB kante thakkuva undali.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Menu Items CRUD
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

  // Combos CRUD
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
      name: oi.menu_items?.name_en || oi.menu_items?.name || 'Item #' + oi.menu_item_id,
      quantity: oi.quantity || 1,
      price: Number(oi.unit_price || oi.menu_items?.price || 0)
    }));
  };

  // 80mm ESC/POS Thermal Slip Printer Generator
  const printThermalSlip = (session: any) => {
    const items = getSessionOrderedItems(session.id);
    const discount = Number(session.discount_amount || session.discount || 0);
    const gross = Number(session.total_amount || 0);
    const netPaid = Math.max(0, gross - discount);
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
            .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-top: 4px; }
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
          <div class="item-row">
            <span>Subtotal:</span>
            <span>₹${gross.toFixed(2)}</span>
          </div>
          ${discount > 0 ? `
            <div class="item-row">
              <span>PIN Discount:</span>
              <span>- ₹${discount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="divider"></div>
          <div class="total-row">
            <span>NET TOTAL:</span>
            <span>₹${netPaid.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="footer">
            <div>GST Included (5%) • Thank you!</div>
            <div>Visit Us Again!</div>
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

  // Today's Most Ordered Items
  const todayOrderedDishesMap: Record<number, { name: string; quantity: number; revenue: number; price: number; food_type: string; image_url: string }> = {};
  menuItems.forEach(mi => {
    todayOrderedDishesMap[mi.id] = { 
      name: mi.name_en || mi.name || 'Dish #' + mi.id, 
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
          name: oi.menu_items?.name_en || oi.menu_items?.name || 'Dish #' + mId, 
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
    const headers = ['Date', 'Time', 'Table #', 'Table Name', 'Customer Name', 'Phone', 'Ordered Dishes', 'Subtotal', 'Discount', 'Total Net Paid', 'Payment Status'];
    const rows = filteredSessions.map(s => {
      const d = new Date(s.created_at);
      const itemsList = getSessionOrderedItems(s.id).map(i => `${i.quantity}x ${i.name}`).join(', ');
      const gross = Number(s.total_amount) || 0;
      const disc = Number(s.discount_amount || s.discount) || 0;
      const netPaid = Math.max(0, gross - disc);
      const matchingTable = tables.find(t => t.table_number === s.table_number);

      return [
        d.toLocaleDateString('en-IN'),
        d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        s.table_number,
        matchingTable?.table_name || `Table #${s.table_number}`,
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
      {/* Top Glass Ambient Header */}
      <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-6 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center shadow-lg shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-widest text-black uppercase bg-gradient-to-r from-[#FCF6BA] to-[#D4AF37] px-2.5 py-0.5 rounded-full shadow-sm">
                  ROYAL CONSOLE
                </span>
                <h1 className="text-sm sm:text-base font-black tracking-wide text-white uppercase truncate max-w-[200px] sm:max-w-none">
                  {shopName}
                </h1>
              </div>
              <p className="text-[10px] font-mono text-[#D4AF37] mt-0.5 font-bold">{tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                setTempBrandName(shopName);
                setTempTagline(tagline);
                setIsNameModalOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:border-[#D4AF37]/40 text-[#FCF6BA] text-xs font-mono font-bold transition"
            >
              <Store className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Edit Brand</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleResetFloor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:border-[#D4AF37]/40 text-[#FCF6BA] text-xs font-mono font-bold transition"
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
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#FCF6BA] text-xs font-mono font-black shadow-md backdrop-blur-md"
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
                    className="absolute right-0 top-11 w-72 bg-[#0c0c0e] border border-white/[0.12] rounded-3xl p-4 shadow-2xl z-50 select-none backdrop-blur-3xl"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
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

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10 text-[11px] font-bold">
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

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={copyToGoogleSheets}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition ${
                copySuccess ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-white/[0.03] border-white/[0.1] text-[#FCF6BA] hover:border-[#D4AF37]/40'
              }`}
            >
              {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-[#D4AF37]" />}
              <span>{copySuccess ? 'Copied TSV' : 'Sheets'}</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.92 }}
              onClick={loadAdminData} 
              className="p-2 rounded-xl border border-white/[0.1] bg-white/[0.03] text-[#FCF6BA] hover:border-[#D4AF37]/40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FCF6BA]' : ''}`} />
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.92 }}
              onClick={handleLogout} 
              className="p-2 rounded-xl bg-white/[0.03] border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 cursor-pointer" 
              title="Logout to Main Panel"
            >
              <LogOut className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Metric Glass Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl shadow-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1">
                Net Sales ({isFilterAllDates ? 'All History' : selectedDate})
              </span>
              <h3 className="text-3xl font-black font-mono text-white mt-1">
                ₹{filteredRevenue.toFixed(2)}
              </h3>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1 font-mono">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> {paidOrdersCount} Paid Orders Settled
              </span>
            </div>
            {/* Indian Rupee Icon */}
            <div className="w-13 h-13 rounded-2xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center shadow-lg">
              <IndianRupee className="w-6 h-6 text-[#D4AF37]" />
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl shadow-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold text-[#D4AF37] uppercase tracking-wider">Active Tables Now</span>
              <h3 className="text-3xl font-black font-mono text-white mt-1">
                {activeSessions.length} / {tables.length}
              </h3>
              <span className="text-[11px] text-[#FCF6BA] font-semibold flex items-center gap-1 mt-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" /> Live Seated Customers
              </span>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-white/[0.04] border border-white/[0.12] flex items-center justify-center shadow-lg">
              <LayoutGrid className="w-6 h-6 text-[#D4AF37]" />
            </div>
          </div>
        </div>

        {/* Action Tabs Bar - iOS Glass Style */}
        <div className="p-2 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl w-full shadow-2xl flex items-center gap-2 overflow-x-auto custom-gold-scrollbar pb-3">
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
                  className={`relative px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap select-none transition cursor-pointer ${
                    isActive ? 'text-black font-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="adminGlassPill"
                      className="absolute inset-0 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] rounded-2xl shadow-[0_2px_15px_rgba(212,175,55,0.4)]"
                      transition={fluidSpring}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="h-6 w-[1px] bg-white/10 shrink-0 mx-1" />

          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-2xl border text-xs font-black uppercase font-mono tracking-wider flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'history' 
                  ? 'bg-[#D4AF37] text-black border-transparent shadow-md' 
                  : 'bg-white/[0.03] border-white/[0.1] text-[#FCF6BA] hover:border-[#D4AF37]/40'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Order History</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsPinGameModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.1] text-[#FCF6BA] font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-2 hover:border-[#D4AF37]/40 transition cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>PIN Game</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsFlashModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.1] text-[#FCF6BA] font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-2 hover:border-[#D4AF37]/40 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Flash</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsSecurityOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.1] text-[#FCF6BA] font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-2 hover:border-[#D4AF37]/40 transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Security</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsWaiterModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.1] text-[#FCF6BA] font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-2 hover:border-[#D4AF37]/40 transition cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Waiter</span>
            </motion.button>
          </div>
        </div>

        {/* Dynamic Views */}
        <AnimatePresence mode="wait">
          {/* TAB 1: Tables Operations */}
          {activeTab === 'tables' && (
            <motion.div key="tables-tab" variants={tabVariant} initial="initial" animate="animate" exit="exit" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                    <LayoutGrid className="w-4 h-4 text-[#D4AF37]" /> Live Floor Ops ({tables.length} Tables)
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    Prathi table ki dedicated custom name ivvochu. QR code & link lo ee custom name tho sync avthundi.
                  </p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setShowAddTableModal(true)}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Add Table
                </motion.button>
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
                      className={`p-5 rounded-3xl border backdrop-blur-2xl relative overflow-hidden bg-white/[0.02] ${
                        isOccupied 
                          ? (isPaid 
                              ? 'border-emerald-500/50 shadow-[0_4px_25px_rgba(16,185,129,0.15)]' 
                              : 'border-rose-500/50 shadow-[0_4px_25px_rgba(244,63,94,0.15)]') 
                          : 'border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white">Table #{t.table_number}</span>
                            <span className="text-xs text-[#D4AF37] font-mono">({t.capacity || 4} Seats)</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] font-mono uppercase tracking-wide">
                              🏷️ {t.table_name || `Table-${t.table_number}`}
                            </span>
                            <button
                              onClick={() => {
                                setEditingTableObj(t);
                                setTempCustomTableName(t.table_name || `Table-${t.table_number}`);
                                setShowEditTableNameModal(true);
                              }}
                              className="p-1 hover:text-[#FCF6BA] text-neutral-400 transition"
                              title="Edit Dedicated Table Name"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isOccupied && (
                            <button
                              onClick={() => handleTogglePaymentStatus(activeSession.id, activeSession.payment_status)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                                isPaid 
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/50' 
                                  : 'bg-rose-500/10 text-rose-300 border-rose-500/50 animate-pulse'
                              }`}
                            >
                              {isPaid ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              <span>{isPaid ? 'PAID' : 'NOT PAID'}</span>
                            </button>
                          )}

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isOccupied 
                              ? 'bg-white/[0.04] text-white border-white/[0.12]' 
                              : 'bg-white/[0.02] text-neutral-500 border-white/[0.06]'
                          }`}>
                            {isOccupied ? 'Occupied' : 'Vacant'}
                          </span>

                          <button
                            onClick={() => handleDeleteTable(t.table_number, isOccupied)}
                            className="p-1 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isOccupied ? (
                        <div className="space-y-3">
                          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs space-y-1.5 font-mono">
                            <div className="flex justify-between text-neutral-400">
                              <span>Guest:</span>
                              <span className="font-bold text-white">{activeSession.customer_name || 'Guest'}</span>
                            </div>
                            <div className="flex justify-between text-neutral-400">
                              <span>Seated At:</span>
                              <span className="text-white">{formatDateTime(activeSession.created_at)}</span>
                            </div>
                            
                            {discount > 0 && (
                              <>
                                <div className="flex justify-between text-neutral-400 pt-1 border-t border-white/[0.06]">
                                  <span>Gross Total:</span>
                                  <span className="text-white">₹{grossBill.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-400 font-bold">
                                  <span>Mystery PIN Discount:</span>
                                  <span>- ₹{discount.toFixed(2)}</span>
                                </div>
                              </>
                            )}

                            <div className="flex justify-between text-white pt-1.5 border-t border-white/[0.08]">
                              <span className="font-bold text-neutral-300">Net Current Bill:</span>
                              <span className="text-[#D4AF37] font-black text-sm">₹{finalPayableBill.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleTogglePaymentStatus(activeSession.id, activeSession.payment_status)}
                              className={`flex-1 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition ${
                                isPaid 
                                  ? 'border-emerald-500/50 text-emerald-200 bg-emerald-950/20' 
                                  : 'border-rose-500/50 text-rose-200 bg-rose-950/20'
                              }`}
                            >
                              Mark As {isPaid ? 'NOT PAID' : 'PAID'}
                            </motion.button>

                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleClearTable(t.table_number)}
                              className="px-4 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:border-white/[0.2] text-[#FCF6BA] text-xs font-black uppercase tracking-wider"
                            >
                              Clear
                            </motion.button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-5 text-xs text-neutral-500 font-mono">
                          Ready for next guest order
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* TAB 2: Menu Edits */}
          {activeTab === 'menu' && (
            <motion.div key="menu-tab" variants={tabVariant} initial="initial" animate="animate" exit="exit" className="space-y-6">
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="font-black text-white text-sm uppercase tracking-wider font-mono">
                      Menu Categories ({categories.length})
                    </h3>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryName('');
                      setShowCategoryModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md"
                  >
                    <FolderPlus className="w-3.5 h-3.5 stroke-[3]" /> Add Category
                  </motion.button>
                </div>

                <div className="flex gap-2.5 overflow-x-auto custom-gold-scrollbar pb-3 pt-1">
                  <button
                    onClick={() => setSelectedCatId('all')}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap border shrink-0 transition ${
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
                        <button onClick={() => setSelectedCatId(cat.id)} className="text-xs whitespace-nowrap">
                          {cat.name_en || cat.name} ({count})
                        </button>

                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryName(cat.name_en || cat.name);
                            setShowCategoryModal(true);
                          }}
                          className="p-1 hover:text-[#FCF6BA] text-neutral-400"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name_en || cat.name)}
                          className="p-1 hover:text-rose-400 text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-[#D4AF37]" />
                    Dishes in {selectedCatId === 'all' ? 'All Categories' : (categories.find(c => c.id === selectedCatId)?.name_en || 'Category')} ({filteredMenuItems.length})
                  </h3>

                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => openAddItemModal(selectedCatId === 'all' ? undefined : selectedCatId)}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md"
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
                            <img src={item.image_url} alt={item.name_en} className="w-full h-full object-cover" />
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
                        <button
                          onClick={async () => {
                            await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
                            loadAdminData();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
                            item.is_available ? 'bg-white/[0.04] text-white border-white/[0.12]' : 'bg-white/[0.01] text-neutral-500 border-white/[0.06]'
                          }`}
                        >
                          {item.is_available ? 'In Stock' : 'Out'}
                        </button>

                        <button onClick={() => openEditItemModal(item)} className="p-1.5 rounded-lg border border-white/[0.1] text-neutral-300 hover:text-white">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button onClick={() => handleDeleteItem(item.id, item.name_en || item.name)} className="p-1.5 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-950/40">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: Combos */}
          {activeTab === 'combos' && (
            <motion.div key="combos-tab" variants={tabVariant} initial="initial" animate="animate" exit="exit" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-white text-sm uppercase tracking-wider font-mono flex items-center gap-2">
                    <PackagePlus className="w-4 h-4 text-[#D4AF37]" /> Royal Combo Offers ({combos.length})
                  </h3>
                </div>

                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={openAddComboModal}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Add New Combo
                </motion.button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {combos.map(combo => (
                  <div key={combo.id} className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between shadow-md space-y-3 backdrop-blur-2xl">
                    <div>
                      {combo.image_url && (
                        <div className="h-32 rounded-2xl overflow-hidden border border-white/10 mb-3 bg-neutral-900">
                          <img src={combo.image_url} alt={combo.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <h4 className="font-bold text-white text-sm">{combo.name || combo.name_en}</h4>
                      <span className="font-mono text-[#D4AF37] font-black text-base mt-1 block">₹{Number(combo.price).toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                      <button onClick={() => openEditComboModal(combo)} className="p-1.5 rounded-lg border border-white/[0.1] text-neutral-300">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteCombo(combo.id, combo.name || combo.name_en)} className="p-1.5 rounded-lg border border-rose-500/40 text-rose-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 4: Promo Banners */}
          {activeTab === 'banners' && (
            <motion.div key="banners-tab" variants={tabVariant} initial="initial" animate="animate" exit="exit" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#D4AF37]" /> {editingBanner ? 'Edit Promo Banner' : 'Create Promo Banner'}
                </h3>
                <form onSubmit={handleSaveBanner} className="space-y-3 text-xs">
                  <div>
                    <label className="text-neutral-400 block mb-1">Banner Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Chef Special"
                      value={newBannerTitle}
                      onChange={(e) => setNewBannerTitle(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]/50"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Upload from PC</label>
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
                      className="w-full py-2.5 rounded-xl border border-dashed border-white/20 bg-white/[0.02] text-white hover:border-[#D4AF37]/40 flex items-center justify-center gap-2 font-mono text-xs cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                      <span>{newBannerImageUrl ? 'Change PC Image' : 'Choose PC Image'}</span>
                    </button>
                  </div>

                  <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#D4AF37] text-black font-black uppercase rounded-xl shadow-md cursor-pointer">
                    {editingBanner ? 'Update Banner' : 'Deploy Banner'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {banners.map(b => (
                  <div key={b.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden p-3 flex flex-col justify-between backdrop-blur-2xl">
                    <div className="h-28 rounded-xl overflow-hidden mb-2 bg-neutral-950">
                      <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                    </div>
                    <h4 className="font-bold text-white text-xs mb-2">{b.title}</h4>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingBanner(b); setNewBannerTitle(b.title); setNewBannerImageUrl(b.image_url); }} className="flex-1 py-1.5 border border-white/10 text-white text-xs rounded-lg">Edit</button>
                      <button onClick={() => handleDeleteBanner(b.id)} className="p-1.5 border border-rose-500/40 text-rose-300 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 5: Insights */}
          {activeTab === 'insights' && (
            <motion.div key="insights-tab" variants={tabVariant} initial="initial" animate="animate" exit="exit" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl space-y-4">
                  <h4 className="font-black text-white text-sm uppercase flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#D4AF37]" /> Most Ordered Items Today
                  </h4>
                  <div className="space-y-2 max-h-[460px] overflow-y-auto custom-gold-scrollbar">
                    {todayTopSellers.map((item, idx) => (
                      <div key={item.id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-white text-xs">#{idx + 1} {item.name}</h5>
                          <span className="text-[11px] font-mono text-[#D4AF37]">₹{item.price.toFixed(2)}</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-white text-xs font-bold block">{item.quantity} Ordered</span>
                          <span className="text-emerald-400 text-xs font-bold">₹{item.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl space-y-4">
                  <h4 className="font-black text-neutral-300 text-sm uppercase flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#D4AF37]" /> Zero Demand Items Today
                  </h4>
                  <div className="space-y-2 max-h-[460px] overflow-y-auto custom-gold-scrollbar">
                    {todayZeroOrders.map((item) => (
                      <div key={item.id} className="p-3 rounded-2xl bg-white/[0.01] border border-white/[0.04] flex justify-between text-xs text-neutral-400 font-mono">
                        <span>{item.name}</span>
                        <span>₹{item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 6: Order History with 80mm Print */}
          {activeTab === 'history' && (
            <motion.div key="history-tab" variants={tabVariant} initial="initial" animate="animate" exit="exit" className="space-y-4">
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div>
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#D4AF37]" /> Customer Dining Ledger
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    Receipt print slips, settled bills, and guest details.
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-black text-[#D4AF37]">
                    {filteredSessions.length} Receipts • ₹{filteredRevenue.toFixed(2)} Net
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSessions.map(session => {
                  const items = getSessionOrderedItems(session.id);
                  const discount = Number(session.discount_amount || session.discount || 0);
                  const gross = Number(session.total_amount || 0);
                  const netPaid = Math.max(0, gross - discount);
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
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono border ${
                              isPaid ? 'border-emerald-500/50 text-emerald-300' : 'border-rose-500/50 text-rose-300'
                            }`}
                          >
                            {isPaid ? 'PAID' : 'NOT PAID'}
                          </button>
                        </div>

                        {/* 80mm Print Action */}
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
                        <span className="text-neutral-400">Net Settled:</span>
                        <span className="text-base font-black text-[#D4AF37]">₹{netPaid.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal 1: Add Table */}
      <AnimatePresence>
        {showAddTableModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0d0d0f] border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-base">Add New Dining Table</h3>
                <button onClick={() => setShowAddTableModal(false)} className="text-neutral-400"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleAddTable} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-neutral-300 block mb-1">Table Number *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 11"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 block mb-1">Dedicated Table Name</label>
                  <input
                    type="text"
                    placeholder="e.g. VIP-Royal-1"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs">
                  Deploy Table
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 1.1: Edit Table Name */}
      <AnimatePresence>
        {showEditTableNameModal && editingTableObj && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0d0d0f] border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-sm">Edit Table #{editingTableObj.table_number}</h3>
                <button onClick={() => setShowEditTableNameModal(false)} className="text-neutral-400"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleUpdateTableName} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-neutral-300 block mb-1">Dedicated Custom Name *</label>
                  <input
                    type="text"
                    required
                    value={tempCustomTableName}
                    onChange={(e) => setTempCustomTableName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs">
                  Update Name
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Category */}
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

                <button type="submit" disabled={loading} className="w-full py-3 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md">
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Menu Item */}
      <AnimatePresence>
        {showItemModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0d0d0f] border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-gold-scrollbar">
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
                  <div className="flex gap-2 overflow-x-auto custom-gold-scrollbar p-1.5 border border-white/10 rounded-xl">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setItemCategoryId(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
                          itemCategoryId === c.id ? 'bg-[#D4AF37] text-black border-transparent' : 'bg-white/[0.03] text-neutral-400 border-white/5'
                        }`}
                      >
                        {c.name_en || c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md mt-1">
                  {editingItem ? 'Update Dish' : 'Publish Dish'}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 4: Combo */}
      <AnimatePresence>
        {showComboModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0d0d0f] border border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-gold-scrollbar">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-base">{editingCombo ? 'Edit Combo' : 'New Combo'}</h3>
                <button onClick={() => setShowComboModal(false)} className="text-neutral-400"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveCombo} className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-300 block mb-1">Combo Name *</label>
                  <input
                    type="text"
                    required
                    value={comboName}
                    onChange={(e) => setComboName(e.target.value)}
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
                      value={comboPrice}
                      onChange={(e) => setComboPrice(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono outline-none focus:border-[#D4AF37]/50"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-300 block mb-1">Food Type</label>
                    <select
                      value={comboFoodType}
                      onChange={(e) => setComboFoodType(e.target.value as any)}
                      className="w-full bg-[#141416] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none"
                    >
                      <option value="veg">Veg</option>
                      <option value="non_veg">Non-Veg</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-neutral-300 block mb-1">Upload Combo Image from PC</label>
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

                <button type="submit" disabled={loading} className="w-full py-3 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md mt-1">
                  {editingCombo ? 'Update Combo' : 'Publish Combo'}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 5: Brand Settings */}
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

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md">
                  Save Brand
                </button>
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