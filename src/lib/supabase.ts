import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

// ===== Types =====
export interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  rfc: string | null;
  address: string | null;
}

export interface Product {
  id: string;
  barcode: string | null;
  name: string;
  active_ingredient: string | null;
  category_id: string | null;
  supplier_id: string | null;
  unit: string;
  cost_price: number;
  sale_price: number;
  tax_rate: number;
  min_stock: number;
  max_stock: number;
  requires_prescription: boolean;
  is_cold_chain: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lot {
  id: string;
  product_id: string;
  lot_number: string;
  quantity: number;
  cost_price: number;
  expiry_date: string;
  received_date: string;
  status: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  birthdate: string | null;
  wallet_balance: number;
  loyalty_points: number;
  notes: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  folio: string;
  customer_id: string | null;
  cashier_name: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  total: number;
  payment_method: string;
  amount_received: number;
  change_given: number;
  status: string;
  cash_session_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  lot_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
  line_total: number;
}

export interface Prescription {
  id: string;
  prescription_number: string;
  patient_name: string;
  patient_age: number | null;
  doctor_name: string | null;
  doctor_license: string | null;
  customer_id: string | null;
  sale_id: string | null;
  product_names: string[];
  is_antibiotic: boolean;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  folio: string;
  supplier_id: string | null;
  supplier_name: string | null;
  invoice_number: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string | null;
  product_name: string;
  lot_number: string | null;
  quantity: number;
  unit_cost: number;
  expiry_date: string | null;
  line_total: number;
}

export interface CashSession {
  id: string;
  cashier_name: string;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

export interface Movement {
  id: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  quantity: number | null;
  amount: number | null;
  user_name: string;
  created_at: string;
}

// Product with computed fields
export interface ProductWithStock extends Product {
  category?: Category | null;
  supplier?: Supplier | null;
  total_stock?: number;
  lots?: Lot[];
}
