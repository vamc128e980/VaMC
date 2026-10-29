export type Language = 'en' | 'te' | 'hi';
export type FoodType = 'veg' | 'non_veg' | 'neutral';

export interface Category {
  id: number;
  name_en: string;
  name_te: string | null;
  name_hi: string | null;
  station_id: string;
  has_veg_toggle: boolean;
  sort_order: number;
  category_type?: 'dine_in' | 'retail';
}

export interface MenuAddon {
  id: number;
  name: string;
  price: number;
  category?: 'ice_cream' | 'nuts' | 'dips' | 'toppings' | 'general';
  is_available: boolean;
  created_at?: string;
}

export interface WeightVariant {
  size: string; // e.g. "100g", "250g", "500g", "1kg"
  price: number;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name_en: string;
  name_te: string | null;
  name_hi: string | null;
  description_en: string | null;
  description_te: string | null;
  description_hi: string | null;
  price: number;
  food_type: FoodType;
  is_available: boolean;
  image_url: string | null;
  is_upsell: boolean;
  is_special?: boolean;
  // Phase 1 Additions:
  has_addons?: boolean;
  addon_ids?: number[];
  suggested_item_ids?: number[];
  is_retail_item?: boolean;
  weight_variants?: WeightVariant[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  isCombo?: boolean;
  // Item customization & retail properties
  selectedAddons?: MenuAddon[];
  selectedWeightVariant?: WeightVariant;
  isComplimentary?: boolean; // For 10th visit free reward item
}

export interface CustomerLoyalty {
  phone: string;
  customer_name: string | null;
  total_visits: number;
  rewards_claimed: number;
  last_visited_at: string;
  created_at: string;
}

export interface PromoBanner {
  id: number;
  title: string | null;
  image_url: string;
  is_active: boolean;
  sort_order: number;
  target_item_id?: number | null;
  target_category_id?: number | null;
}

export interface RetailProduct {
  id: number;
  name_en: string;
  name_te: string | null;
  name_hi: string | null;
  description: string | null;
  price_info: string | null;
  image_url: string | null;
  is_active: boolean;
}

export interface MenuCombo {
  id: number;
  name_en: string;
  name_te: string | null;
  description_en: string | null;
  original_price: number;
  combo_price: number;
  image_url: string | null;
  is_available: boolean;
  items_included: string[];
}

export interface TableSession {
  id: string;
  table_number: number;
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  gst_rate: number;
  total_amount: number;
  payment_status: 'unpaid' | 'paid';
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  closed_at?: string | null;
}