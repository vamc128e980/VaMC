export type PaymentMode = 'cash' | 'upi' | 'card';
export type SessionStatus = 'active' | 'completed' | 'cancelled' | 'closed';
export type BatchStatus = 'pending' | 'sent_to_kitchen' | 'preparing' | 'served' | 'cancelled';

export interface WeightVariant {
  size: string;
  price: number;
  label?: string;
}

export interface MenuAddon {
  id: string | number;
  name: string;
  price: number;
  is_available?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category_id?: string | null;
  category?: string | null;
  image_url?: string | null;
  is_available?: boolean;
  is_veg?: boolean;
  weight_variants?: WeightVariant[] | null;
  addons?: MenuAddon[] | null;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  itemType?: 'menu' | 'combo' | 'addon' | string;
  isComplimentary?: boolean;
  cookingNotes?: string;
  selectedWeightVariant?: WeightVariant | null;
  selectedAddons?: MenuAddon[];
}

export interface TableSession {
  id: string;
  table_number: number;
  status: SessionStatus | string;
  payment_status?: string | null;
  payment_mode?: PaymentMode | string | null;
  order_pin?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  total_amount?: number | null;
  created_at?: string;
  settled_at?: string | null;
  closed_at?: string | null;
}

export interface OrderBatch {
  id: string;
  session_id: string;
  table_number: number;
  status: BatchStatus | string;
  source?: string | null;
  created_at?: string;
}

export interface OrderItem {
  id: string;
  session_id: string;
  batch_id?: string | null;
  menu_item_id?: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  is_complimentary?: boolean;
  cooking_notes?: string | null;
  created_at?: string;
}

export interface WaiterCall {
  id: string;
  table_id?: string | null;
  table_number: number | null;
  call_type?: string | null;
  status?: string | null;
  created_at?: string;
}

export interface CustomerLoyalty {
  id?: string | number;
  phone: string;
  successful_visits: number;
  last_visit_date: string | null;
  rewards_claimed: number;
}
