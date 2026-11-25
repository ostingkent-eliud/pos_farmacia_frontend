// Types
export interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  rfc: string | null;
  address: string | null;
  created_at?: string;
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
  created_at?: string;
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
  product_ids: string[];
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
  created_at?: string;
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

export interface ProductWithStock extends Product {
  category?: Category | null;
  supplier?: Supplier | null;
  total_stock?: number;
  lots?: Lot[];
}

interface DatabaseTables {
  categories: Category;
  suppliers: Supplier;
  products: Product;
  lots: Lot;
  customers: Customer;
  sales: Sale;
  sale_items: SaleItem;
  prescriptions: Prescription;
  purchases: Purchase;
  purchase_items: PurchaseItem;
  cash_sessions: CashSession;
  movements: Movement;
}

type TableName = keyof DatabaseTables;
type TableRow<K extends TableName> = DatabaseTables[K];
type QueryRow<K extends TableName> = K extends 'products'
  ? ProductWithStock
  : K extends 'purchases'
    ? Purchase & { purchase_items: Pick<PurchaseItem, 'quantity' | 'unit_cost'>[] }
    : TableRow<K>;
type QueryResult<T> = { data: T; error: null } | { data: null; error: Error };
type Filter = { column: string; operator: 'eq' | 'gte' | 'in'; value: unknown };

const STORAGE_PREFIX = 'farmapos_data_v1_';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTable<K extends TableName>(table: K): TableRow<K>[] {
  if (typeof window === 'undefined') throw new Error('El almacenamiento local no está disponible.');

  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${table}`);
  if (raw === null) return [];

  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isRecord)) {
    throw new Error(`Los datos locales de "${table}" no tienen un formato válido.`);
  }
  return parsed as TableRow<K>[];
}

function writeTable<K extends TableName>(table: K, rows: TableRow<K>[]): void {
  if (typeof window === 'undefined') throw new Error('El almacenamiento local no está disponible.');
  window.localStorage.setItem(`${STORAGE_PREFIX}${table}`, JSON.stringify(rows));
}

function defaultValues(table: TableName): Record<string, unknown> {
  const now = new Date().toISOString();
  const defaults: Record<string, unknown> = {
    id: crypto.randomUUID(),
    created_at: now,
  };

  switch (table) {
    case 'categories':
      defaults.color = '#0891b2';
      break;
    case 'products':
      defaults.is_active = true;
      defaults.updated_at = now;
      break;
    case 'lots':
      defaults.received_date = now.slice(0, 10);
      defaults.status = 'active';
      break;
    case 'customers':
      defaults.wallet_balance = 0;
      defaults.loyalty_points = 0;
      break;
    case 'sales':
      Object.assign(defaults, {
        cashier_name: 'Cajero',
        subtotal: 0,
        tax_total: 0,
        discount_total: 0,
        total: 0,
        payment_method: 'efectivo',
        amount_received: 0,
        change_given: 0,
        status: 'completed',
      });
      break;
    case 'sale_items':
      Object.assign(defaults, { quantity: 1, unit_price: 0, tax_rate: 16, discount: 0, line_total: 0 });
      break;
    case 'prescriptions':
      Object.assign(defaults, { product_ids: [], product_names: [], is_antibiotic: false, status: 'registered' });
      break;
    case 'purchases':
      Object.assign(defaults, { subtotal: 0, tax_total: 0, total: 0, status: 'received' });
      break;
    case 'purchase_items':
      Object.assign(defaults, { quantity: 1, unit_cost: 0, line_total: 0 });
      break;
    case 'cash_sessions':
      Object.assign(defaults, { cashier_name: 'Cajero', opening_amount: 0, status: 'open', opened_at: now });
      break;
    case 'movements':
      defaults.quantity = null;
      defaults.amount = null;
      break;
    case 'suppliers':
      break;
  }
  return defaults;
}

function hydrateRow<K extends TableName>(table: K, row: TableRow<K>): QueryRow<K> {
  if (table === 'products') {
    const product = row as Product;
    return {
      ...product,
      category: readTable('categories').find((category) => category.id === product.category_id) ?? null,
      supplier: readTable('suppliers').find((supplier) => supplier.id === product.supplier_id) ?? null,
    } as QueryRow<K>;
  }

  if (table === 'purchases') {
    const purchase = row as Purchase;
    const purchaseItems = readTable('purchase_items')
      .filter((item) => item.purchase_id === purchase.id)
      .map(({ quantity, unit_cost }) => ({ quantity, unit_cost }));
    return { ...purchase, purchase_items: purchaseItems } as QueryRow<K>;
  }

  return row as QueryRow<K>;
}

class LocalQuery<K extends TableName> implements PromiseLike<QueryResult<QueryRow<K>[]>> {
  private operation: 'select' | 'insert' | 'update' = 'select';
  private filters: Filter[] = [];
  private sort: { column: string; ascending: boolean } | null = null;
  private maxRows: number | null = null;
  private values: Partial<TableRow<K>> | readonly Partial<TableRow<K>>[] | null = null;
  private updates: Partial<TableRow<K>> | null = null;

  constructor(private readonly table: K) {}

  select(_columns = '*'): this {
    return this;
  }

  insert(values: Partial<TableRow<K>> | readonly Partial<TableRow<K>>[]): this {
    this.operation = 'insert';
    this.values = values;
    return this;
  }

  update(values: Partial<TableRow<K>>): this {
    this.operation = 'update';
    this.updates = values;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  gte(column: string, value: string | number): this {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  in(column: string, values: readonly unknown[]): this {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.sort = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(count: number): this {
    this.maxRows = count;
    return this;
  }

  single(): Promise<QueryResult<QueryRow<K>>> {
    return this.execute().then(({ data, error }) => {
      if (error) return { data: null, error };
      if (!data || data.length !== 1) {
        return { data: null, error: new Error('Se esperaba exactamente un registro.') };
      }
      return { data: data[0], error: null };
    });
  }

  maybeSingle(): Promise<QueryResult<QueryRow<K> | null>> {
    return this.execute().then(({ data, error }) => {
      if (error) return { data: null, error };
      if (!data || data.length > 1) {
        return { data: null, error: new Error('Se esperaba cero o un registro.') };
      }
      return { data: data[0] ?? null, error: null };
    });
  }

  then<TResult1 = QueryResult<QueryRow<K>[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<QueryRow<K>[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult<QueryRow<K>[]>> {
    try {
      let rows = readTable(this.table);

      if (this.operation === 'insert') {
        const values = Array.isArray(this.values) ? this.values : [this.values];
        const inserted = values.map((value) => ({
          ...defaultValues(this.table),
          ...value,
        }) as TableRow<K>);
        rows = [...rows, ...inserted];
        writeTable(this.table, rows);
        return { data: inserted.map((row) => hydrateRow(this.table, row)), error: null };
      }

      const matches = (row: TableRow<K>) =>
        this.filters.every(({ column, operator, value }) => {
          const current: unknown = Reflect.get(row, column);
          if (operator === 'eq') return current === value;
          if (operator === 'in') return Array.isArray(value) && value.includes(current);
          if (current === null || current === undefined) return false;
          return String(current) >= String(value);
        });

      if (this.operation === 'update') {
        const updates = this.updates ?? {};
        let changed = false;
        rows = rows.map((row) => {
          if (!matches(row)) return row;
          changed = true;
          return { ...row, ...updates };
        });
        if (changed) writeTable(this.table, rows);
        rows = rows.filter(matches);
      } else {
        rows = rows.filter(matches);
      }

      if (this.sort) {
        const { column, ascending } = this.sort;
        rows = [...rows].sort((a, b) => {
          const left: unknown = Reflect.get(a, column);
          const right: unknown = Reflect.get(b, column);
          const comparison = String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true });
          return ascending ? comparison : -comparison;
        });
      }

      if (this.maxRows !== null) rows = rows.slice(0, this.maxRows);
      return { data: rows.map((row) => hydrateRow(this.table, row)), error: null };
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      return { data: null, error };
    }
  }
}

export const database = {
  from<K extends TableName>(table: K): LocalQuery<K> {
    return new LocalQuery(table);
  },
};
