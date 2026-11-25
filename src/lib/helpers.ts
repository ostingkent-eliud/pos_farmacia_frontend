import { database, type Product, type Lot, type ProductWithStock, type Category, type Supplier } from './database';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value);
}

export function formatDate(value: string): string {
  return new Date(value + (value.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function expiryStatus(dateStr: string): 'expired' | 'critical' | 'warning' | 'ok' {
  const days = daysUntil(dateStr);
  if (days < 0) return 'expired';
  if (days <= 30) return 'critical';
  if (days <= 90) return 'warning';
  return 'ok';
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await database.from('categories').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await database.from('suppliers').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchProductsWithStock(): Promise<ProductWithStock[]> {
  const { data: products, error } = await database
    .from('products')
    .select('*, category:categories(*), supplier:suppliers(*)')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  if (!products) return [];

  const { data: lots } = await database
    .from('lots')
    .select('*')
    .in('product_id', products.map((p) => p.id))
    .eq('status', 'active');

  const lotsByProduct = (lots ?? []).reduce<Record<string, Lot[]>>((acc, lot) => {
    (acc[lot.product_id] ??= []).push(lot);
    return acc;
  }, {});

  return products.map((p) => ({
    ...p,
    lots: lotsByProduct[p.id] ?? [],
    total_stock: (lotsByProduct[p.id] ?? []).reduce((sum, l) => sum + l.quantity, 0),
  }));
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await database.from('products').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchProductByBarcode(barcode: string): Promise<ProductWithStock | null> {
  const { data, error } = await database
    .from('products')
    .select('*, category:categories(*), supplier:suppliers(*)')
    .eq('barcode', barcode)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: lots } = await database
    .from('lots')
    .select('*')
    .eq('product_id', data.id)
    .eq('status', 'active')
    .order('expiry_date', { ascending: true });

  return { ...data, lots: lots ?? [], total_stock: (lots ?? []).reduce((s, l) => s + l.quantity, 0) };
}

export function generateFolio(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${ts}${rand}`;
}
