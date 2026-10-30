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
  Bell,
  Sparkles,
  Layers,
  Scale,
  Search,
  Settings,
  CheckCircle2
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
  const [menuHubTab, setMenuHubTab] = useState<'items' | 'combos' | 'addons' | 'promos'>('items');

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
  const [addons, setAddons] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<any[]>([]);
  const [loyaltyData, setLoyaltyData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // VaMC Manual Counter POS Modal States & Dedicated Counter Menu
  const [showVaMCModal, setShowVaMCModal] = useState(false);
  const [vamcCounterItems, setVamcCounterItems] = useState<any[]>([]);
  const [showVaMCCrudModal, setShowVaMCCrudModal] = useState(false);
  const [editingVamcItem, setEditingVamcItem] = useState<any | null>(null);
  const [vamcItemName, setVamcItemName] = useState('');
  const [vamcItemPrice, setVamcItemPrice] = useState('');
  
  const [vamcCart, setVamcCart] = useState<any[]>([]);
  const [vamcSearch, setVamcSearch] = useState('');
  const [vamcCustomerName, setVamcCustomerName] = useState('');
  const [vamcCustomerPhone, setVamcCustomerPhone] = useState('');
  const [vamcPaymentMode, setVamcPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [vamcCustomerHanded, setVamcCustomerHanded] = useState('');

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
  const [categoryType, setCategoryType] = useState<'dine_in' | 'retail'>('dine_in');
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | 'all'>('all');

  // Add-ons Master CRUD (Complete State)
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState<any | null>(null);
  const [addonName, setAddonName] = useState('');
  const [addonPrice, setAddonPrice] = useState('');
  const [addonCategory, setAddonCategory] = useState<'ice_cream' | 'nuts' | 'dips' | 'toppings' | 'general'>('ice_cream');

  // Menu Items CRUD
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState<number | null>(null);
  const [itemFoodType, setItemFoodType] = useState<'veg' | 'non_veg'>('veg');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemHasAddons, setItemHasAddons] = useState(false);
  const [itemAddonIds, setItemAddonIds] = useState<number[]>([]);
  const [itemSuggestedIds, setItemSuggestedIds] = useState<number[]>([]);
  const [itemIsRetail, setItemIsRetail] = useState(false);
  const [itemWeightVariants, setItemWeightVariants] = useState<{ size: string; price: number }[]>([
    { size: '250g', price: 0 },
    { size: '500g', price: 0 },
    { size: '1kg', price: 0 }
  ]);
  const itemFileRef = useRef<HTMLInputElement>(null);

  // Combos CRUD
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

  const loadVaMCCounterItems = async () => {
    try {
      const { data } = await supabase.from('vamc_menu_items').select('*').order('name');
      if (data) setVamcCounterItems(data);
    } catch (e) {
      setVamcCounterItems([]);
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
        { data: adns },
        { data: oitms },
        { data: bnrs },
        { data: cmbs },
        { data: calls }
      ] = await Promise.all([
        supabase.from('restaurant_tables').select('*').order('table_number'),
        supabase.from('table_sessions').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('menu_items').select('*').order('id', { ascending: true }),
        supabase.from('menu_addons').select('*').order('id', { ascending: true }),
        supabase.from('order_items').select('*, menu_items(name_en, name, price, category_id, image_url)'),
        supabase.from('promo_banners').select('*'),
        supabase.from('combos').select('*').order('id', { ascending: true }),
        supabase.from('waiter_calls').select('*').eq('status', 'pending').order('created_at', { ascending: false })
      ]);

      await loadVaMCCounterItems();

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
      if (adns) setAddons(adns);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vamc_menu_items' }, () => loadVaMCCounterItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_addons' }, () => loadAdminData())
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
        if (it.is_complimentary) return sum;
        const basePr = Number(it.unit_price || it.menu_items?.price || 0);
        let addOnsSum = 0;
        if (Array.isArray(it.selected_addons)) {
          addOnsSum = it.selected_addons.reduce((aSum: number, a: any) => aSum + Number(a.price || 0), 0);
        }
        return sum + (it.quantity * (basePr + addOnsSum));
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

  // Settle Bill & Log Loyalty Visit
  const handleSettleOrder = async (sessionId: string, tableNum: number, mode: 'cash' | 'upi') => {
    try {
      setLoading(true);
      const activeSess = sessions.find(s => s.id === sessionId);
      const finalAmt = Number(activeSess?.total_amount || 0);

      if (activeSess && activeSess.customer_phone && activeSess.customer_phone.length === 10) {
        try {
          const { data: existingLoyal } = await supabase
            .from('customer_loyalty')
            .select('*')
            .eq('phone', activeSess.customer_phone)
            .maybeSingle();

          const isQualifyingVisit = finalAmt >= 180;
          const prevVisits = existingLoyal?.total_visits || 0;
          const newVisitCount = isQualifyingVisit ? prevVisits + 1 : prevVisits;

          if (existingLoyal) {
            await supabase.from('customer_loyalty').update({
              total_visits: newVisitCount,
              customer_name: activeSess.customer_name || existingLoyal.customer_name,
              last_visited_at: new Date().toISOString()
            }).eq('phone', activeSess.customer_phone);
          } else {
            await supabase.from('customer_loyalty').insert({
              phone: activeSess.customer_phone,
              customer_name: activeSess.customer_name || 'Guest',
              total_visits: isQualifyingVisit ? 1 : 0,
              rewards_claimed: 0
            });
          }
        } catch (e) {
          console.error('Loyalty log err:', e);
        }
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
        await supabase.from('categories').update({ 
          name: cleanName, 
          name_en: cleanName,
          category_type: categoryType
        }).eq('id', editingCategory.id);
      } else {
        const nextSort = (categories.length > 0 ? Math.max(...categories.map(c => Number(c.sort_order || 0))) : 0) + 1;
        await supabase.from('categories').insert({ 
          name: cleanName, 
          name_en: cleanName, 
          sort_order: nextSort,
          category_type: categoryType
        });
      }
      setCategoryName('');
      setCategoryType('dine_in');
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

  // Add-ons Master CRUD
  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = addonName.trim();
    const prNum = parseFloat(addonPrice);
    if (!cleanName || isNaN(prNum) || prNum < 0) return alert('Add-on Name & valid Price enter cheyandi.');

    setLoading(true);
    try {
      const payload = {
        name: cleanName,
        price: prNum,
        category: addonCategory,
        is_available: true
      };

      if (editingAddon) {
        const { error } = await supabase.from('menu_addons').update(payload).eq('id', editingAddon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('menu_addons').insert(payload);
        if (error) throw error;
      }

      setShowAddonModal(false);
      setEditingAddon(null);
      setAddonName('');
      setAddonPrice('');
      setAddonCategory('ice_cream');
      await loadAdminData();
    } catch (err: any) {
      alert('Add-on save error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAddon = async (addonId: number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setAddons(prev => prev.map(a => a.id === addonId ? { ...a, is_available: nextStatus } : a));
    try {
      await supabase.from('menu_addons').update({ is_available: nextStatus }).eq('id', addonId);
    } catch (err) {
      console.error('Addon toggle err:', err);
      loadAdminData();
    }
  };

  const handleDeleteAddon = async (addonId: number, name: string) => {
    if (!confirm(`"${name}" add-on ni DELETE cheyala?`)) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('menu_addons').delete().eq('id', addonId);
      if (error) throw error;
      await loadAdminData();
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Instant Stock Toggle for Dishes
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
        is_available: true,
        has_addons: itemHasAddons,
        addon_ids: itemAddonIds,
        suggested_item_ids: itemSuggestedIds,
        is_retail_item: itemIsRetail,
        weight_variants: itemIsRetail ? itemWeightVariants.filter(v => v.price > 0) : []
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

  // Combos CRUD
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
        cooking_notes: oi.cooking_notes || null,
        selected_addons: oi.selected_addons || [],
        is_complimentary: oi.is_complimentary || false,
        selected_weight_variant: oi.selected_weight_variant || null
      }));
  };

  const getSessionItemsDetailed = (sessionId: string) => {
    return orderItems.filter(oi => oi.session_id === sessionId);
  };

  // 1. PHYSICAL 80mm KOT WITH ADD-ONS & COMPLIMENTARY TAGS
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
            .item-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 13px; font-weight: bold; }
            .item-name { width: 75%; word-break: break-word; }
            .item-qty { width: 25%; text-align: right; font-size: 15px; }
            .addon-line { font-size: 11px; margin-left: 8px; color: #222; }
            .free-tag { background: #000; color: #fff; padding: 1px 4px; font-size: 10px; border-radius: 3px; }
            .note-box { font-size: 11px; font-style: italic; background: #eee; padding: 2px 4px; margin-top: 2px; margin-bottom: 5px; }
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
            <div style="margin-bottom: 6px;">
              <div class="item-row">
                <span class="item-name">
                  • ${it.name} ${it.selected_weight_variant ? `(${it.selected_weight_variant})` : ''}
                  ${it.is_complimentary ? '<span class="free-tag">10th VISIT FREE</span>' : ''}
                </span>
                <span class="item-qty">[ ${it.quantity} ]</span>
              </div>
              ${Array.isArray(it.selected_addons) && it.selected_addons.length > 0 ? it.selected_addons.map((a: any) => `
                <div class="addon-line">+ Extra: ${a.name}</div>
              `).join('') : ''}
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

  // 2. 80mm ESC/POS Customer Receipt With Add-ons Breakdown
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
            .item-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .item-name { width: 55%; word-break: break-word; }
            .item-qty { width: 15%; text-align: center; }
            .item-total { width: 30%; text-align: right; }
            .addon-line { font-size: 9px; margin-left: 6px; color: #333; }
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
          ${items.map(it => {
            const addOnsCost = Array.isArray(it.selected_addons) 
              ? it.selected_addons.reduce((sum: number, a: any) => sum + Number(a.price || 0), 0)
              : 0;
            const singleItemPrice = it.is_complimentary ? 0 : (it.price + addOnsCost);
            const lineTotal = singleItemPrice * it.quantity;

            return `
              <div style="margin-bottom: 3px;">
                <div class="item-row">
                  <span class="item-name">${it.name} ${it.selected_weight_variant ? `(${it.selected_weight_variant})` : ''}</span>
                  <span class="item-qty">${it.quantity}</span>
                  <span class="item-total">${it.is_complimentary ? 'FREE' : `₹${lineTotal.toFixed(2)}`}</span>
                </div>
                ${Array.isArray(it.selected_addons) && it.selected_addons.length > 0 ? it.selected_addons.map((a: any) => `
                  <div class="addon-line">+ ${a.name} (+₹${(Number(a.price) * it.quantity).toFixed(2)})</div>
                `).join('') : ''}
              </div>
            `;
          }).join('')}
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
    const headers = ['Date', 'Time', 'Table #', 'Table Name', 'Customer Name', 'Phone', 'Ordered Dishes & Addons', 'Bill Total', 'Payment Mode', 'Status'];
    const rows = filteredSessions.map(s => {
      const d = new Date(s.created_at);
      const itemsList = getSessionOrderedItems(s.id).map(i => {
        const extraNames = Array.isArray(i.selected_addons) && i.selected_addons.length > 0
          ? ` (+ ${i.selected_addons.map(a => a.name).join(', ')})`
          : '';
        return `${i.quantity}x ${i.name}${extraNames}`;
      }).join('; ');

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

  // Calendar Days
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
            {/* VaMC Manual POS Counter Button */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setShowVaMCModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#FCF6BA] text-xs font-mono font-bold transition cursor-pointer shadow-md"
              title="Vujwala Simha Master Counter (VaMC)"
            >
              <Calculator className="w-4 h-4 text-[#D4AF37]" />
              <span>VaMC</span>
            </motion.button>

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
                          {items.map((it, idx) => {
                            const addOnsCost = Array.isArray(it.selected_addons)
                              ? it.selected_addons.reduce((sum: number, a: any) => sum + Number(a.price || 0), 0)
                              : 0;
                            const itemNetPrice = it.is_complimentary ? 0 : (it.price + addOnsCost) * it.quantity;

                            return (
                              <div key={idx} className="space-y-0.5 border-b border-white/5 pb-1 last:border-b-0">
                                <div className="flex justify-between text-neutral-300 font-bold">
                                  <span>{it.quantity}x {it.name} {it.selected_weight_variant ? `(${it.selected_weight_variant})` : ''}</span>
                                  <span>{it.is_complimentary ? 'FREE' : `₹${itemNetPrice.toFixed(2)}`}</span>
                                </div>
                                {Array.isArray(it.selected_addons) && it.selected_addons.length > 0 && (
                                  <div className="pl-3 space-y-0.5">
                                    {it.selected_addons.map((a: any, aIdx: number) => (
                                      <div key={aIdx} className="flex justify-between text-[10px] text-amber-300">
                                        <span>+ {a.name}</span>
                                        <span>+₹{(Number(a.price) * it.quantity).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
            <span>Menu, Add-ons, Combos & Promos</span>
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
                const visitCount = cLoyalty?.total_visits || 1;
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
                          <span>10TH MILESTONE VISIT! GUEST UNLOCKED COMPLIMENTARY REFRESHMENT</span>
                        </div>
                        <span className="bg-black text-[#FCF6BA] px-2.5 py-1 rounded-xl text-[10px]">LOYALTY</span>
                      </div>
                    )}

                    {/* Ordered Items List with Add-ons Breakdown */}
                    <div className="space-y-2">
                      <span className="text-xs text-neutral-400 font-bold uppercase block">
                        Ordered Dishes ({items.filter(i => i.item_status !== 'cancelled').length}):
                      </span>

                      <div className="space-y-2 max-h-56 overflow-y-auto custom-gold-scrollbar p-3 rounded-[24px] bg-black/40 border border-white/5">
                        {items.map((it) => {
                          const isCancelled = it.item_status === 'cancelled';
                          const dName = it.menu_items?.name_en || it.menu_items?.name || 'Dish #' + it.menu_item_id;
                          const dPrice = Number(it.unit_price || it.menu_items?.price || 0);
                          const addOnsCost = Array.isArray(it.selected_addons)
                            ? it.selected_addons.reduce((sum: number, a: any) => sum + Number(a.price || 0), 0)
                            : 0;
                          const totalLineCost = it.is_complimentary ? 0 : (dPrice + addOnsCost) * it.quantity;

                          return (
                            <div key={it.id} className={`p-3 rounded-2xl border space-y-1.5 ${isCancelled ? 'bg-rose-950/20 border-rose-500/30' : 'bg-white/[0.02] border-white/10'}`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-bold block ${isCancelled ? 'line-through text-rose-300' : 'text-white'}`}>
                                      {it.quantity}x {dName} {it.selected_weight_variant ? `(${it.selected_weight_variant})` : ''}
                                    </span>
                                    {it.is_complimentary && (
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                                        FREE 10th VISIT
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-[#FCF6BA]">
                                    {it.is_complimentary ? '₹0.00' : `₹${totalLineCost.toFixed(2)}`}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {!isCancelled ? (
                                    <>
                                      <button
                                        onClick={() => handleUpdateItemQuantity(it.id, it.quantity, -1, curSession.id)}
                                        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white cursor-pointer"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleUpdateItemQuantity(it.id, it.quantity, 1, curSession.id)}
                                        className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleCancelOrderItem(it.id, curSession.id, dName)}
                                        className="px-2.5 py-1 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 font-bold text-[10px] cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] font-bold text-rose-400 uppercase bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-500/30">
                                      Cancelled
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Selected Add-ons Breakdown with Extra Price */}
                              {Array.isArray(it.selected_addons) && it.selected_addons.length > 0 && (
                                <div className="pl-3.5 space-y-1 border-l-2 border-[#D4AF37]/60 my-1 pt-0.5">
                                  {it.selected_addons.map((a: any, aIdx: number) => (
                                    <div key={aIdx} className="flex justify-between items-center text-[11px] font-mono text-[#D4AF37]">
                                      <span className="font-bold">+ {a.name}</span>
                                      <span className="font-black">+₹{(Number(a.price) * it.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Customer Cooking Notes */}
                              {it.cooking_notes && (
                                <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-500/30 font-sans">
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
                          className={`py-3 rounded-[18px] text-xs font-black uppercase flex items-center justify-center gap-2 border transition cursor-pointer ${
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
                          className={`py-3 rounded-[18px] text-xs font-black uppercase flex items-center justify-center gap-2 border transition cursor-pointer ${
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
                                    className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-amber-200 text-[10px] font-bold border border-white/5 cursor-pointer"
                                  >
                                    ₹{amt}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setCustomerHandedAmounts({ ...customerHandedAmounts, [curSession.id]: String(grossTotal) })}
                                  className="px-2 py-1 rounded-lg bg-white/[0.05] text-neutral-300 text-[10px] cursor-pointer"
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

                    {/* Settle Action Buttons */}
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

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => printKitchenOrderTicket(curSession)}
                        className="px-4 py-3.5 rounded-[20px] border border-amber-400/40 bg-amber-400/10 text-amber-200 font-bold text-xs uppercase flex items-center gap-1.5 hover:bg-amber-400/20 cursor-pointer"
                        title="Print Kitchen Order Ticket (Dishes & Add-ons)"
                      >
                        <ChefHat className="w-4 h-4 text-amber-400" />
                        <span>KOT Print</span>
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => printThermalSlip(curSession)}
                        className="px-4 py-3.5 rounded-[20px] border border-white/10 bg-white/[0.05] text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
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

        {/* VIEW B: MENU, ADD-ONS, COMBOS & PROMOS OPERATIONS HUB */}
        {activeWorkspace === 'menu_hub' && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto custom-gold-scrollbar">
              {[
                { id: 'items', label: '1. Dishes & Retail', icon: UtensilsCrossed },
                { id: 'addons', label: '2. Add-ons Master (Full CRUD)', icon: Sparkles },
                { id: 'combos', label: '3. Smart Combos', icon: PackagePlus },
                { id: 'promos', label: '4. Slider Banners', icon: ImageIcon }
              ].map(sub => {
                const Icon = sub.icon;
                const isCur = menuHubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setMenuHubTab(sub.id as any)}
                    className={`px-5 py-2.5 rounded-[20px] text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
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

            {/* B.1: Dishes & Categories with Add-on Linking */}
            {menuHubTab === 'items' && (
              <div className="space-y-5">
                <div className="p-5 rounded-[28px] bg-gradient-to-b from-[#111115]/90 to-[#09090c]/90 border border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-white uppercase">Categories ({categories.length})</span>
                    <button
                      onClick={() => { setEditingCategory(null); setCategoryName(''); setCategoryType('dine_in'); setShowCategoryModal(true); }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] text-black font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" /> Add Category
                    </button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto custom-gold-scrollbar pb-2">
                    <button
                      onClick={() => setSelectedCatId('all')}
                      className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold whitespace-nowrap border cursor-pointer ${
                        selectedCatId === 'all' ? 'bg-[#D4AF37] text-black border-transparent' : 'bg-white/[0.03] text-neutral-400 border-white/10'
                      }`}
                    >
                      All Items ({menuItems.length})
                    </button>
                    {categories.map(c => (
                      <div key={c.id} className="flex items-center rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-1.5 gap-1.5 shrink-0 text-xs font-mono">
                        <button onClick={() => setSelectedCatId(c.id)} className={`cursor-pointer ${selectedCatId === c.id ? 'text-[#D4AF37] font-bold' : 'text-neutral-300'}`}>
                          {c.name_en || c.name} {c.category_type === 'retail' ? '🛍️' : ''}
                        </button>
                        <button 
                          onClick={() => {
                            setEditingCategory(c);
                            setCategoryName(c.name_en || c.name);
                            setCategoryType(c.category_type || 'dine_in');
                            setShowCategoryModal(true);
                          }} 
                          className="text-neutral-400 hover:text-white ml-1 p-0.5 cursor-pointer"
                          title="Edit Category Name"
                        >
                          <Edit3 className="w-3 h-3 text-[#D4AF37]" />
                        </button>
                        <button onClick={() => handleDeleteCategory(c.id, c.name_en || c.name)} className="text-rose-400 hover:text-rose-300 p-0.5 cursor-pointer">
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
                      Menu Dishes & Products ({selectedCatId === 'all' ? menuItems.length : menuItems.filter(m => m.category_id === selectedCatId).length})
                    </span>
                    <button
                      onClick={() => { 
                        setEditingItem(null); 
                        setItemName(''); 
                        setItemPrice(''); 
                        setItemImageUrl(''); 
                        setItemHasAddons(false);
                        setItemAddonIds([]);
                        setItemSuggestedIds([]);
                        setItemIsRetail(false);
                        setShowItemModal(true); 
                      }}
                      className="px-4 py-2 rounded-2xl bg-[#D4AF37] text-black font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" /> Add Item / Retail
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(selectedCatId === 'all' ? menuItems : menuItems.filter(m => m.category_id === selectedCatId)).map(item => (
                      <div key={item.id} className="p-4 rounded-[24px] bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3 font-mono text-xs">
                        <div className="flex items-center gap-2.5 truncate">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name_en} className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center shrink-0 text-neutral-600">
                              <UtensilsCrossed className="w-5 h-5" />
                            </div>
                          )}
                          <div className="truncate">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-white truncate">{item.name_en || item.name}</span>
                              {item.is_retail_item && <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 rounded">RETAIL</span>}
                            </div>
                            <span className="text-[#D4AF37] font-bold text-xs">₹{Number(item.price).toFixed(2)}</span>
                            {item.has_addons && (
                              <span className="text-[9px] text-neutral-400 block">+ {item.addon_ids?.length || 0} Add-ons</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleStock(item.id, item.is_available)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase border transition cursor-pointer ${
                              item.is_available 
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25' 
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
                            }`}
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
                              setItemHasAddons(Boolean(item.has_addons));
                              setItemAddonIds(item.addon_ids || []);
                              setItemSuggestedIds(item.suggested_item_ids || []);
                              setItemIsRetail(Boolean(item.is_retail_item));
                              setItemWeightVariants(item.weight_variants?.length > 0 ? item.weight_variants : [
                                { size: '250g', price: 0 },
                                { size: '500g', price: 0 },
                                { size: '1kg', price: 0 }
                              ]);
                              setShowItemModal(true);
                            }} 
                            className="p-1 text-neutral-300 hover:text-white cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteItem(item.id, item.name_en || item.name)} className="p-1 text-rose-400 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* B.2: Add-ons Master Tab (FULL CRUD VIEW) */}
            {menuHubTab === 'addons' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase font-mono">Add-ons Master CRUD ({addons.length})</h4>
                    <p className="text-xs text-neutral-400 font-mono">Add, Edit Name & Price, Toggle Floor Stock, or Delete Add-ons.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingAddon(null);
                      setAddonName('');
                      setAddonPrice('');
                      setAddonCategory('ice_cream');
                      setShowAddonModal(true);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> Add New Addon
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 font-mono text-xs">
                  {addons.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-neutral-500 font-mono text-xs">
                      No add-ons created yet. Click "+ Add New Addon" to create.
                    </div>
                  ) : (
                    addons.map(a => (
                      <div key={a.id} className="p-4 rounded-[22px] bg-white/[0.02] border border-white/10 flex justify-between items-center shadow-lg hover:border-[#D4AF37]/50 transition">
                        <div>
                          <span className="font-bold text-white text-sm block">{a.name}</span>
                          <span className="text-[#D4AF37] font-black text-sm mt-0.5 block">+₹{Number(a.price).toFixed(2)}</span>
                          <span className="text-[10px] text-neutral-500 uppercase block mt-0.5">[{a.category || 'general'}]</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleAddon(a.id, a.is_available)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase border cursor-pointer ${
                              a.is_available ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                            }`}
                          >
                            {a.is_available ? 'Active' : 'Off'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingAddon(a);
                              setAddonName(a.name || '');
                              setAddonPrice(String(a.price || ''));
                              setAddonCategory(a.category || 'general');
                              setShowAddonModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#D4AF37] cursor-pointer"
                            title="Edit Name & Price"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddon(a.id, a.name)}
                            className="p-1.5 rounded-lg bg-rose-950/30 text-rose-300 hover:bg-rose-950/50 cursor-pointer"
                            title="Delete Addon"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* B.3: Smart Dynamic Combos */}
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
                    className="px-4 py-2.5 rounded-2xl bg-[#D4AF37] text-black font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer"
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
                        <button onClick={() => handleDeleteCombo(combo.id, combo.name || combo.name_en)} className="text-rose-400 cursor-pointer">
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

            {/* B.4: Promo Slider Banners */}
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
                        className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-neutral-300 hover:border-[#D4AF37] flex items-center justify-center gap-2 text-xs cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                        <span>{newBannerImageUrl ? 'Change Selected PC Photo' : 'Choose PC Photo (Up to 3MB)'}</span>
                      </button>

                      {newBannerImageUrl && (
                        <div className="h-24 rounded-xl overflow-hidden border border-white/10">
                          <img src={newBannerImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs cursor-pointer">
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
                          <button onClick={() => handleDeleteBanner(b.id)} className="text-rose-400 cursor-pointer">
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

      {/* ======================================================== */}
      {/* VaMC COUNTER POS MODAL (WITH SEPARATE COUNTER MENU & CRUD) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showVaMCModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-[#0d0d0f] border border-[#D4AF37]/60 rounded-[32px] p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header with CRUD Manage Button */}
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white uppercase tracking-wider">VaMC Counter POS & Ledger</h2>
                    <span className="text-[10px] text-neutral-400">Independent Counter Menu Selector & Cash/UPI Change Calculator</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Manage Counter Menu (CRUD) Button */}
                  <button
                    onClick={() => setShowVaMCCrudModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 text-black font-black text-xs uppercase cursor-pointer shadow-md"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Manage Counter Menu (CRUD)</span>
                  </button>

                  <button onClick={() => setShowVaMCModal(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4 overflow-hidden flex-1">
                
                {/* Left: Interactive Visual Selection Blocks (Tap to Select/Deselect) */}
                <div className="md:col-span-7 flex flex-col space-y-3 overflow-hidden">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search counter items..."
                      value={vamcSearch}
                      onChange={(e) => setVamcSearch(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto custom-gold-scrollbar pr-1 flex-1">
                    {vamcCounterItems.filter(m => (m.name || '').toLowerCase().includes(vamcSearch.toLowerCase())).map(item => {
                      const isSelected = vamcCart.some(ci => ci.id === item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setVamcCart(prev => {
                              const exist = prev.find(ci => ci.id === item.id);
                              if (exist) {
                                // Deselect / Remove if already selected
                                return prev.filter(ci => ci.id !== item.id);
                              }
                              return [...prev, { ...item, quantity: 1 }];
                            });
                          }}
                          className={`p-3 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                            isSelected 
                              ? 'bg-[#D4AF37]/20 border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-lg' 
                              : 'bg-white/[0.02] border-white/10 hover:border-[#D4AF37]/50'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-white block line-clamp-1">{item.name}</span>
                              {isSelected && <CheckCircle className="w-4 h-4 text-[#D4AF37] shrink-0" />}
                            </div>
                            <span className="text-[11px] font-black text-[#D4AF37] block mt-1">₹{Number(item.price).toFixed(2)}</span>
                          </div>
                          <span className={`text-[9px] font-bold mt-2 uppercase text-right ${isSelected ? 'text-[#FCF6BA]' : 'text-neutral-500'}`}>
                            {isSelected ? '✓ Selected' : 'Tap to Select'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Cart & Billing Ledger */}
                <div className="md:col-span-5 bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-[#FCF6BA] uppercase border-b border-white/10 pb-2 mb-3">Selected Bill Cart</h3>
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-gold-scrollbar pr-1">
                      {vamcCart.length === 0 ? (
                        <div className="text-center py-6 text-neutral-500 text-xs">No items selected. Tap blocks on left.</div>
                      ) : (
                        vamcCart.map((ci, idx) => (
                          <div key={ci.id} className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                            <div className="truncate pr-2">
                              <span className="text-white font-bold block truncate">{ci.name}</span>
                              <span className="text-[10px] text-[#D4AF37]">₹{Number(ci.price).toFixed(2)} x {ci.quantity}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => {
                                setVamcCart(prev => prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity - 1 } : item).filter(item => item.quantity > 0));
                              }} className="p-1 rounded bg-white/5 text-white cursor-pointer"><Minus className="w-3 h-3" /></button>
                              <span className="px-1 text-white font-bold">{ci.quantity}</span>
                              <button onClick={() => {
                                setVamcCart(prev => prev.map((item, i) => i === idx ? { ...item, quantity: item.quantity + 1 } : item));
                              }} className="p-1 rounded bg-white/5 text-white cursor-pointer"><Plus className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                    <input
                      type="text"
                      placeholder="Customer Name (Optional)"
                      value={vamcCustomerName}
                      onChange={(e) => setVamcCustomerName(e.target.value)}
                      className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    />
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="Phone Number (Optional)"
                      value={vamcCustomerPhone}
                      onChange={(e) => setVamcCustomerPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none font-mono"
                    />

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setVamcPaymentMode('cash')}
                        className={`py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 border cursor-pointer ${
                          vamcPaymentMode === 'cash' ? 'bg-amber-400 text-black border-transparent' : 'bg-white/5 border-white/10 text-neutral-400'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" /> Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setVamcPaymentMode('upi')}
                        className={`py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 border cursor-pointer ${
                          vamcPaymentMode === 'upi' ? 'bg-emerald-400 text-black border-transparent' : 'bg-white/5 border-white/10 text-neutral-400'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" /> PhonePe / Paid
                      </button>
                    </div>

                    {vamcPaymentMode === 'cash' && (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-amber-400/30 space-y-1">
                        <input
                          type="number"
                          placeholder="Customer Handed Cash ₹"
                          value={vamcCustomerHanded}
                          onChange={(e) => setVamcCustomerHanded(e.target.value)}
                          className="w-full bg-[#161619] border border-amber-400/40 rounded-lg px-2.5 py-1.5 text-white font-bold outline-none"
                        />
                        <div className="flex justify-between text-[11px] pt-1">
                          <span className="text-neutral-400">Change to return:</span>
                          <span className="text-emerald-400 font-bold">
                            ₹{((parseFloat(vamcCustomerHanded) || 0) >= (vamcCart.reduce((s, i) => s + (i.price * i.quantity), 0)) ? ((parseFloat(vamcCustomerHanded) || 0) - (vamcCart.reduce((s, i) => s + (i.price * i.quantity), 0))).toFixed(2) : '0.00')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-sm font-black text-white">
                      <span>Total Bill:</span>
                      <span className="text-[#D4AF37] text-base">₹{vamcCart.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)}</span>
                    </div>
                    <button
                      disabled={loading || vamcCart.length === 0}
                      onClick={async () => {
                        const total = vamcCart.reduce((s, i) => s + (i.price * i.quantity), 0);
                        setLoading(true);
                        try {
                          const { data: sess, error: sErr } = await supabase.from('table_sessions').insert({
                            table_number: 0,
                            customer_name: vamcCustomerName.trim() || 'VaMC Counter',
                            customer_phone: vamcCustomerPhone.trim() || '0000000000',
                            subtotal: total,
                            total_amount: total,
                            final_payable: total,
                            status: 'completed',
                            payment_status: 'paid',
                            payment_mode: vamcPaymentMode
                          }).select().single();

                          if (sErr) throw sErr;

                          const itemsPayload = vamcCart.map(ci => ({
                            session_id: sess.id,
                            menu_item_id: null,
                            quantity: ci.quantity,
                            unit_price: ci.price,
                            item_status: 'served',
                            cooking_notes: `VaMC Counter Item: ${ci.name}`
                          }));

                          await supabase.from('order_items').insert(itemsPayload);
                          alert(`VaMC Sale Complete! Total: ₹${total.toFixed(2)} (${vamcPaymentMode.toUpperCase()})`);
                          setVamcCart([]);
                          setVamcCustomerName('');
                          setVamcCustomerPhone('');
                          setVamcCustomerHanded('');
                          setShowVaMCModal(false);
                          loadAdminData();
                        } catch (err: any) {
                          alert('Error: ' + err.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="w-full py-3 rounded-2xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-lg cursor-pointer"
                    >
                      {loading ? 'Processing...' : 'Complete Sale & Log Ledger'}
                    </button>
                  </div>

                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* VAMC COUNTER MENU CRUD MODAL (ADD, EDIT, DELETE ITEMS) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showVaMCCrudModal && (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-mono">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#0d0d0f] border border-[#D4AF37]/60 rounded-[32px] p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="text-sm font-black text-white uppercase">Manage VaMC Counter Menu Items (CRUD)</h3>
                <button onClick={() => setShowVaMCCrudModal(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* Add / Edit Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                const cleanName = vamcItemName.trim();
                const pr = parseFloat(vamcItemPrice);
                if (!cleanName || isNaN(pr) || pr <= 0) return alert('Valid Name & Price ivvandi.');

                setLoading(true);
                try {
                  if (editingVamcItem) {
                    await supabase.from('vamc_menu_items').update({ name: cleanName, price: pr }).eq('id', editingVamcItem.id);
                  } else {
                    await supabase.from('vamc_menu_items').insert({ name: cleanName, price: pr });
                  }
                  setVamcItemName('');
                  setVamcItemPrice('');
                  setEditingVamcItem(null);
                  loadVaMCCounterItems();
                } catch (err: any) {
                  alert('Error: ' + err.message);
                } finally {
                  setLoading(false);
                }
              }} className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 border-b border-white/10">
                <input
                  type="text"
                  required
                  placeholder="Item Name (e.g. Water Bottle)"
                  value={vamcItemName}
                  onChange={(e) => setVamcItemName(e.target.value)}
                  className="bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-xs"
                />
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  placeholder="Price ₹"
                  value={vamcItemPrice}
                  onChange={(e) => setVamcItemPrice(e.target.value)}
                  className="bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none text-xs font-bold"
                />
                <button type="submit" disabled={loading} className="py-2 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs cursor-pointer">
                  {editingVamcItem ? 'Update Item' : '+ Add Item'}
                </button>
              </form>

              {/* Counter Items List */}
              <div className="space-y-2 overflow-y-auto custom-gold-scrollbar pr-1 flex-1 mt-3">
                {vamcCounterItems.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 text-xs">No items added to VaMC counter menu yet. Add above.</div>
                ) : (
                  vamcCounterItems.map(item => (
                    <div key={item.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-white block">{item.name}</span>
                        <span className="text-[#D4AF37] font-black">₹{Number(item.price).toFixed(2)}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => { setEditingVamcItem(item); setVamcItemName(item.name); setVamcItemPrice(String(item.price)); }} className="p-1.5 rounded-lg bg-white/5 text-[#D4AF37] cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={async () => {
                          if (!confirm(`"${item.name}" delete cheyala?`)) return;
                          await supabase.from('vamc_menu_items').delete().eq('id', item.id);
                          loadVaMCCounterItems();
                        }} className="p-1.5 rounded-lg bg-rose-950/40 text-rose-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      {/* Add-on Master CRUD Modal (Create & Edit) */}
      <AnimatePresence>
        {showAddonModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0d0d0f] border border-[#D4AF37]/50 rounded-[28px] p-6 space-y-4 font-mono text-xs shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-black text-white uppercase">
                  {editingAddon ? 'Edit Add-on' : 'Create New Add-on'}
                </span>
                <button onClick={() => setShowAddonModal(false)} className="text-neutral-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAddon} className="space-y-3.5">
                <div>
                  <label className="text-neutral-400 block mb-1">Add-on Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vanilla Ice Cream Scoop"
                    value={addonName}
                    onChange={(e) => setAddonName(e.target.value)}
                    className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-neutral-400 block mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g. 30"
                      value={addonPrice}
                      onChange={(e) => setAddonPrice(e.target.value)}
                      className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37] font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Group Tag</label>
                    <select
                      value={addonCategory}
                      onChange={(e) => setAddonCategory(e.target.value as any)}
                      className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                    >
                      <option value="ice_cream">Ice Cream</option>
                      <option value="nuts">Dry Fruits</option>
                      <option value="dips">Dips & Sauces</option>
                      <option value="toppings">Toppings</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full py-3 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md mt-2 cursor-pointer hover:brightness-110"
                >
                  {loading ? 'Saving...' : (editingAddon ? 'Update Add-on' : 'Save Add-on')}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Menu Item Modal (Add-ons, Pairings & Retail Pack sizes) */}
      <AnimatePresence>
        {showItemModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0d0d0f] border border-white/15 rounded-[28px] p-6 space-y-4 font-mono text-xs shadow-2xl max-h-[92vh] overflow-y-auto custom-gold-scrollbar">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-black text-white uppercase">{editingItem ? 'Edit Dish / Product' : 'Add Dish / Product'}</span>
                <button onClick={() => setShowItemModal(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-3.5">
                <div>
                  <label className="text-neutral-400 block mb-1">Item / Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pomegranate Juice or Afghani Anjeer"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white outline-none font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-neutral-400 block mb-1">Base Price (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Food / Item Type</label>
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
                  <label className="text-neutral-400 block mb-1">Category *</label>
                  <div className="flex gap-2 overflow-x-auto custom-gold-scrollbar p-1 border border-white/10 rounded-xl">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setItemCategoryId(c.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap border cursor-pointer ${
                          itemCategoryId === c.id ? 'bg-[#D4AF37] text-black border-transparent' : 'bg-white/[0.03] text-neutral-400 border-white/5'
                        }`}
                      >
                        {c.name_en || c.name} {c.category_type === 'retail' ? '🛍️' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1. Add-ons Linking Checkbox & Multi-Select */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={itemHasAddons}
                        onChange={(e) => setItemHasAddons(e.target.checked)}
                        className="w-4 h-4 accent-[#D4AF37]"
                      />
                      <span className="font-bold text-white">Enable Add-ons (e.g. Ice Cream, Dry Fruits)</span>
                    </label>
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </div>

                  {itemHasAddons && (
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <span className="text-[10px] text-neutral-400 block">Select Add-ons applicable for this item:</span>
                      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto custom-gold-scrollbar p-1">
                        {addons.map(a => {
                          const isSel = itemAddonIds.includes(Number(a.id));
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                const aId = Number(a.id);
                                if (isSel) setItemAddonIds(itemAddonIds.filter(id => id !== aId));
                                else setItemAddonIds([...itemAddonIds, aId]);
                              }}
                              className={`p-2 rounded-xl text-[10px] text-left border flex justify-between items-center cursor-pointer ${
                                isSel ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white' : 'bg-white/[0.02] border-white/5 text-neutral-400'
                              }`}
                            >
                              <span className="truncate">{a.name}</span>
                              <span className="font-bold text-[#D4AF37]">₹{Number(a.price).toFixed(0)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Cross-Sell Pairings Selection */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Suggested Pairings (e.g. Mojito, Dips, Juices)
                    </span>
                    <span className="text-[10px] text-neutral-500">Cross-sell</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto custom-gold-scrollbar p-1">
                    {menuItems.filter(m => m.id !== editingItem?.id).map(m => {
                      const isSel = itemSuggestedIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (isSel) setItemSuggestedIds(itemSuggestedIds.filter(id => id !== m.id));
                            else setItemSuggestedIds([...itemSuggestedIds, m.id]);
                          }}
                          className={`p-2 rounded-xl text-[10px] text-left border flex justify-between items-center cursor-pointer ${
                            isSel ? 'bg-amber-400/20 border-amber-400 text-white' : 'bg-white/[0.02] border-white/5 text-neutral-400'
                          }`}
                        >
                          <span className="truncate">{m.name_en || m.name}</span>
                          <span className="font-bold text-amber-300">₹{Number(m.price).toFixed(0)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Retail Gourmet Pack Sizes */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemIsRetail}
                      onChange={(e) => setItemIsRetail(e.target.checked)}
                      className="w-4 h-4 accent-[#D4AF37]"
                    />
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-emerald-400" />
                      Retail Item (Pack Sizes: 250g, 500g, 1kg)
                    </span>
                  </label>

                  {itemIsRetail && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                      {itemWeightVariants.map((v, vIdx) => (
                        <div key={v.size}>
                          <label className="text-[10px] text-neutral-400 block mb-0.5">{v.size} Price (₹)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Price"
                            value={v.price || ''}
                            onChange={(e) => {
                              const next = [...itemWeightVariants];
                              next[vIdx].price = parseFloat(e.target.value) || 0;
                              setItemWeightVariants(next);
                            }}
                            className="w-full bg-[#161619] border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-bold"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="text-neutral-400 block mb-1">Photo (Up to 3MB)</label>
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
                    className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-neutral-300 hover:border-[#D4AF37] flex items-center justify-center gap-2 text-xs cursor-pointer"
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

                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs mt-2 cursor-pointer">
                  {editingItem ? 'Update Dish / Product' : 'Publish Dish / Product'}
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
                <button onClick={() => setShowComboModal(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
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
                    className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-neutral-300 hover:border-[#D4AF37] flex items-center justify-center gap-2 text-xs cursor-pointer"
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

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase mt-2 cursor-pointer">
                  Publish Combo
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal with Retail Type */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0d0d0f] border border-white/15 rounded-[28px] p-6 space-y-4 font-mono text-xs shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-black text-white uppercase">{editingCategory ? 'Edit Category' : 'New Category'}</span>
                <button onClick={() => setShowCategoryModal(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Category Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dry Fruits or Juices"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Category Type</label>
                  <select
                    value={categoryType}
                    onChange={(e) => setCategoryType(e.target.value as any)}
                    className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="dine_in">Dine-in Food / Juice</option>
                    <option value="retail">Take-Home Retail / Gourmet</option>
                  </select>
                </div>

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase mt-2 cursor-pointer">
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Table Modal */}
      <AnimatePresence>
        {showAddTableModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0d0d0f] border border-white/15 rounded-[28px] p-6 space-y-4 font-mono text-xs shadow-2xl">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <span className="text-sm font-black text-white uppercase">Add Dining Table</span>
                <button onClick={() => setShowAddTableModal(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
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

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase mt-2 cursor-pointer">
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
                <button onClick={() => setShowEditTableNameModal(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
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

                <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase mt-2 cursor-pointer">
                  Update Name
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
                <button onClick={() => setIsNameModalOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
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
                <button type="submit" className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase mt-2 cursor-pointer">
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
