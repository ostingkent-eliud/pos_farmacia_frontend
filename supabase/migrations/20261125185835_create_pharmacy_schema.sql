/*
# Farmacia POS - Esquema completo de base de datos

## Descripción
Sistema de punto de venta para farmacias con 6 áreas: Caja, Productos y Caducidades,
Compras y Surtido, Control Sanitario, Clientes y Consultorio, y Reportes.

## Tablas nuevas
1. `categories` - Categorías de productos (analgésicos, antibióticos, etc.)
2. `suppliers` - Proveedores de productos
3. `products` - Catálogo de productos con principio activo, precios, márgenes, stock
4. `lots` - Lotes de productos con fecha de vencimiento, cantidad, costo
5. `customers` - Clientes frecuentes con historial de compras
6. `sales` - Ventas/Transacciones de caja
7. `sale_items` - Items de cada venta
8. `prescriptions` - Recetas médicas registradas
9. `purchases` - Compras a proveedores
10. `purchase_items` - Items de cada compra
11. `cash_sessions` - Sesiones de caja (corte de caja)
12. `movements` - Bitácora de movimientos/auditoría

## Seguridad
- RLS habilitado en todas las tablas
- Acceso anónimo + autenticado (app sin login por ahora)
- Permisos CRUD completos para anon, authenticated
*/

-- ============================================================
-- CATEGORÍAS
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#0891b2',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO anon, authenticated;

DROP POLICY IF EXISTS "categories_select" ON categories;
CREATE POLICY "categories_select" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "categories_insert" ON categories;
CREATE POLICY "categories_insert" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "categories_update" ON categories;
CREATE POLICY "categories_update" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "categories_delete" ON categories;
CREATE POLICY "categories_delete" ON categories FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- PROVEEDORES
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  rfc text,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON suppliers TO anon, authenticated;

DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "suppliers_delete" ON suppliers;
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- PRODUCTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text UNIQUE,
  name text NOT NULL,
  active_ingredient text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  unit text DEFAULT 'pieza',
  cost_price numeric(12,2) DEFAULT 0,
  sale_price numeric(12,2) DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 16,
  min_stock integer DEFAULT 5,
  max_stock integer DEFAULT 100,
  requires_prescription boolean DEFAULT false,
  is_cold_chain boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO anon, authenticated;

DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "products_delete" ON products;
CREATE POLICY "products_delete" ON products FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- LOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lot_number text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  cost_price numeric(12,2) DEFAULT 0,
  expiry_date date NOT NULL,
  received_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',  -- active, expired, depleted, written_off
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON lots TO anon, authenticated;

DROP POLICY IF EXISTS "lots_select" ON lots;
CREATE POLICY "lots_select" ON lots FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "lots_insert" ON lots;
CREATE POLICY "lots_insert" ON lots FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "lots_update" ON lots;
CREATE POLICY "lots_update" ON lots FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "lots_delete" ON lots;
CREATE POLICY "lots_delete" ON lots FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  birthdate date,
  wallet_balance numeric(12,2) DEFAULT 0,
  loyalty_points integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO anon, authenticated;

DROP POLICY IF EXISTS "customers_select" ON customers;
CREATE POLICY "customers_select" ON customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "customers_insert" ON customers;
CREATE POLICY "customers_insert" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "customers_update" ON customers;
CREATE POLICY "customers_update" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "customers_delete" ON customers;
CREATE POLICY "customers_delete" ON customers FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- VENTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  cashier_name text DEFAULT 'Cajero',
  subtotal numeric(12,2) DEFAULT 0,
  tax_total numeric(12,2) DEFAULT 0,
  discount_total numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  payment_method text DEFAULT 'efectivo',  -- efectivo, tarjeta, transferencia
  amount_received numeric(12,2) DEFAULT 0,
  change_given numeric(12,2) DEFAULT 0,
  status text DEFAULT 'completed',  -- completed, cancelled, pending
  cash_session_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sales TO anon, authenticated;

DROP POLICY IF EXISTS "sales_select" ON sales;
CREATE POLICY "sales_select" ON sales FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sales_insert" ON sales;
CREATE POLICY "sales_insert" ON sales FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sales_update" ON sales;
CREATE POLICY "sales_update" ON sales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sales_delete" ON sales;
CREATE POLICY "sales_delete" ON sales FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- ITEMS DE VENTA
-- ============================================================
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  lot_id uuid REFERENCES lots(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 16,
  discount numeric(12,2) DEFAULT 0,
  line_total numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sale_items TO anon, authenticated;

DROP POLICY IF EXISTS "sale_items_select" ON sale_items;
CREATE POLICY "sale_items_select" ON sale_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sale_items_insert" ON sale_items;
CREATE POLICY "sale_items_insert" ON sale_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "sale_items_update" ON sale_items;
CREATE POLICY "sale_items_update" ON sale_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sale_items_delete" ON sale_items;
CREATE POLICY "sale_items_delete" ON sale_items FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- RECETAS MÉDICAS
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_number text NOT NULL,
  patient_name text NOT NULL,
  patient_age integer,
  doctor_name text,
  doctor_license text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  product_ids uuid[] DEFAULT '{}',
  product_names text[] DEFAULT '{}',
  is_antibiotic boolean DEFAULT false,
  status text DEFAULT 'registered',  -- registered, dispensed, cancelled
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON prescriptions TO anon, authenticated;

DROP POLICY IF EXISTS "prescriptions_select" ON prescriptions;
CREATE POLICY "prescriptions_select" ON prescriptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "prescriptions_insert" ON prescriptions;
CREATE POLICY "prescriptions_insert" ON prescriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "prescriptions_update" ON prescriptions;
CREATE POLICY "prescriptions_update" ON prescriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "prescriptions_delete" ON prescriptions;
CREATE POLICY "prescriptions_delete" ON prescriptions FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- COMPRAS A PROVEEDORES
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name text,
  invoice_number text,
  subtotal numeric(12,2) DEFAULT 0,
  tax_total numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  status text DEFAULT 'received',  -- received, pending, cancelled
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON purchases TO anon, authenticated;

DROP POLICY IF EXISTS "purchases_select" ON purchases;
CREATE POLICY "purchases_select" ON purchases FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "purchases_insert" ON purchases;
CREATE POLICY "purchases_insert" ON purchases FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "purchases_update" ON purchases;
CREATE POLICY "purchases_update" ON purchases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "purchases_delete" ON purchases;
CREATE POLICY "purchases_delete" ON purchases FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- ITEMS DE COMPRA
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  lot_number text,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  expiry_date date,
  line_total numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON purchase_items TO anon, authenticated;

DROP POLICY IF EXISTS "purchase_items_select" ON purchase_items;
CREATE POLICY "purchase_items_select" ON purchase_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "purchase_items_insert" ON purchase_items;
CREATE POLICY "purchase_items_insert" ON purchase_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "purchase_items_update" ON purchase_items;
CREATE POLICY "purchase_items_update" ON purchase_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "purchase_items_delete" ON purchase_items;
CREATE POLICY "purchase_items_delete" ON purchase_items FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- SESIONES DE CAJA
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_name text DEFAULT 'Cajero',
  opening_amount numeric(12,2) DEFAULT 0,
  closing_amount numeric(12,2),
  expected_amount numeric(12,2),
  difference numeric(12,2),
  status text DEFAULT 'open',  -- open, closed
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  notes text
);

ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON cash_sessions TO anon, authenticated;

DROP POLICY IF EXISTS "cash_sessions_select" ON cash_sessions;
CREATE POLICY "cash_sessions_select" ON cash_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "cash_sessions_insert" ON cash_sessions;
CREATE POLICY "cash_sessions_insert" ON cash_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "cash_sessions_update" ON cash_sessions;
CREATE POLICY "cash_sessions_update" ON cash_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "cash_sessions_delete" ON cash_sessions;
CREATE POLICY "cash_sessions_delete" ON cash_sessions FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- BITÁCORA DE MOVIMIENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,  -- sale, purchase, adjustment, write_off, cash_open, cash_close, prescription
  entity_type text,
  entity_id uuid,
  description text,
  quantity integer,
  amount numeric(12,2),
  user_name text DEFAULT 'Sistema',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON movements TO anon, authenticated;

DROP POLICY IF EXISTS "movements_select" ON movements;
CREATE POLICY "movements_select" ON movements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "movements_insert" ON movements;
CREATE POLICY "movements_insert" ON movements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "movements_update" ON movements;
CREATE POLICY "movements_update" ON movements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "movements_delete" ON movements;
CREATE POLICY "movements_delete" ON movements FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_lots_product ON lots(product_id);
CREATE INDEX IF NOT EXISTS idx_lots_expiry ON lots(expiry_date);
CREATE INDEX IF NOT EXISTS idx_lots_status ON lots(status);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created ON prescriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_created ON movements(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);