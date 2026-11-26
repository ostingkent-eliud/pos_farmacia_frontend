import { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Package,
  Clock,
  XCircle,
  TrendingDown,
  Snowflake,
  Edit2,
  Trash2,
} from 'lucide-react';
import { database, type ProductWithStock, type Lot, type Category, type Supplier } from '@/lib/database';
import { fetchProductsWithStock, formatCurrency, formatDate, daysUntil, expiryStatus } from '@/lib/helpers';
import { Modal, ConfirmDialog, Toast } from '@/components/Modal';
import { DUMMY_CATEGORIES, DUMMY_PRODUCTS, DUMMY_SUPPLIERS } from '@/data/dummyData';

type Tab = 'all' | 'expiring' | 'expired' | 'lowstock';

export function ProductsPage() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [usingDummy, setUsingDummy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [writeOffLot, setWriteOffLot] = useState<{ lot: Lot; productName: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = useCallback(async () => {
    try {
      const [prods, cats, sups] = await Promise.all([
        fetchProductsWithStock(),
        database.from('categories').select('*').order('name'),
        database.from('suppliers').select('*').order('name'),
      ]);

      if (prods && prods.length > 0) {
        setProducts(prods);
        setCategories(cats.data?.length ? cats.data : DUMMY_CATEGORIES);
        setSuppliers(sups.data?.length ? sups.data : DUMMY_SUPPLIERS);
        setUsingDummy(false);
      } else {
        setProducts(DUMMY_PRODUCTS);
        setCategories(DUMMY_CATEGORIES);
        setSuppliers(DUMMY_SUPPLIERS);
        setUsingDummy(true);
      }
    } catch {
      setProducts(DUMMY_PRODUCTS);
      setCategories(DUMMY_CATEGORIES);
      setSuppliers(DUMMY_SUPPLIERS);
      setUsingDummy(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allLots: { lot: Lot; product: ProductWithStock }[] = [];
  products.forEach((p) => {
    (p.lots ?? []).forEach((lot) => {
      if (lot.quantity > 0) allLots.push({ lot, product: p });
    });
  });

  const expiringSoon = allLots.filter(({ lot }) => {
    const s = expiryStatus(lot.expiry_date);
    return s === 'critical' || s === 'warning';
  });
  const expired = allLots.filter(({ lot }) => expiryStatus(lot.expiry_date) === 'expired');
  const lowStock = products.filter((p) => (p.total_stock ?? 0) <= p.min_stock && (p.total_stock ?? 0) > 0);

  const filtered = products.filter((p) => {
    if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.active_ingredient ?? '').toLowerCase().includes(q) ||
      (p.barcode ?? '').includes(q)
    );
  });

  const handleWriteOff = async () => {
    if (!writeOffLot) return;
    try {
      if (!usingDummy) {
        await database
          .from('lots')
          .update({ status: 'written_off', quantity: 0 })
          .eq('id', writeOffLot.lot.id);
        await database.from('movements').insert({
          type: 'write_off',
          entity_type: 'lot',
          entity_id: writeOffLot.lot.id,
          description: `Merma: ${writeOffLot.productName} - Lote ${writeOffLot.lot.lot_number}`,
          quantity: writeOffLot.lot.quantity,
          amount: writeOffLot.lot.quantity * writeOffLot.lot.cost_price,
          user_name: 'Admin',
        });
        await load();
      } else {
        setProducts((prev) =>
          prev.map((p) => {
            const nextLots = (p.lots ?? []).map((l) =>
              l.id === writeOffLot.lot.id ? { ...l, quantity: 0, status: 'written_off' as const } : l,
            );
            const nextStock = nextLots.reduce((acc, l) => acc + l.quantity, 0);
            return { ...p, lots: nextLots, total_stock: nextStock };
          }),
        );
      }
      setWriteOffLot(null);
      setToast({ message: 'Lote dado de baja por merma', type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Error al dar de baja', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AlertCard
          icon={Clock}
          label="Por vencer"
          value={expiringSoon.length}
          color="warning"
          onClick={() => setTab('expiring')}
          active={tab === 'expiring'}
        />
        <AlertCard
          icon={XCircle}
          label="Vencidos"
          value={expired.length}
          color="danger"
          onClick={() => setTab('expired')}
          active={tab === 'expired'}
        />
        <AlertCard
          icon={TrendingDown}
          label="Stock bajo"
          value={lowStock.length}
          color="cyan"
          onClick={() => setTab('lowstock')}
          active={tab === 'lowstock'}
        />
        <AlertCard
          icon={Package}
          label="Total productos"
          value={products.length}
          color="blue"
          onClick={() => setTab('all')}
          active={tab === 'all'}
        />
      </div>

      {/* Lotes por vencer / vencidos */}
      {(tab === 'expiring' || tab === 'expired') && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            {tab === 'expiring' ? (
              <>
                <Clock size={18} className="text-amber-600" />
                Lotes por vencer (próximos 90 días)
              </>
            ) : (
              <>
                <XCircle size={18} className="text-rose-600" />
                Lotes vencidos
              </>
            )}
          </h3>
          <div className="space-y-2">
            {(tab === 'expiring' ? expiringSoon : expired).map(({ lot, product }) => (
              <LotRow
                key={lot.id}
                lot={lot}
                productName={product.name}
                onWriteOff={() => setWriteOffLot({ lot, productName: product.name })}
              />
            ))}
            {(tab === 'expiring' ? expiringSoon : expired).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">
                {tab === 'expiring' ? 'No hay lotes por vencer pronto' : 'No hay lotes vencidos'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stock bajo */}
      {tab === 'lowstock' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingDown size={18} className="text-cyan-600" />
            Productos con stock bajo el mínimo
          </h3>
          <div className="space-y-2">
            {lowStock.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-xl bg-sky-50/70 border border-sky-200/80"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">Mínimo: {p.min_stock} unidades</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-700">{p.total_stock}</p>
                  <p className="text-xs text-slate-500">en stock</p>
                </div>
              </div>
            ))}
            {lowStock.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">Todos los productos tienen stock suficiente</p>
            )}
          </div>
        </div>
      )}

      {/* Listado general */}
      {tab === 'all' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto por nombre, sustancia o código..."
                className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:w-56"
            >
              <option value="all">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowForm(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:shadow-lg"
            >
              <Plus size={18} />
              Nuevo producto
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">
                      Producto
                    </th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">
                      Categoría
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">
                      Precio
                    </th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">
                      Stock
                    </th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">
                      Caducidad
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {filtered.map((product) => {
                    const stock = product.total_stock ?? 0;
                    const nearestExpiry = (product.lots ?? [])
                      .filter((l) => l.quantity > 0)
                      .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))[0];
                    const expStatus = nearestExpiry ? expiryStatus(nearestExpiry.expiry_date) : 'ok';
                    return (
                      <tr key={product.id} className="hover:bg-sky-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                              <p className="text-xs text-slate-500">
                                {product.active_ingredient || 'Sin principio activo'}
                              </p>
                            </div>
                            {product.requires_prescription && (
                              <span className="inline-flex items-center rounded-md bg-rose-50 border border-rose-200/80 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                Rx
                              </span>
                            )}
                            {product.is_cold_chain && (
                              <span title="Red de frío" className="inline-flex items-center rounded-md bg-sky-50 p-1 text-cyan-600">
                                <Snowflake size={14} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="inline-flex items-center rounded-full bg-sky-50 border border-sky-200/70 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {product.category?.name ?? 'Sin categoría'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-bold text-blue-700">
                            {formatCurrency(product.sale_price)}
                          </p>
                          <p className="text-xs text-slate-400">costo {formatCurrency(product.cost_price)}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-sm font-bold ${
                              stock <= 0
                                ? 'text-rose-600'
                                : stock <= product.min_stock
                                  ? 'text-amber-600'
                                  : 'text-slate-800'
                            }`}
                          >
                            {stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-center">
                          {nearestExpiry ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                expStatus === 'expired'
                                  ? 'bg-rose-100 text-rose-700'
                                  : expStatus === 'critical'
                                    ? 'bg-amber-100 text-amber-800'
                                    : expStatus === 'warning'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-sky-50 text-blue-700'
                              }`}
                            >
                              {formatDate(nearestExpiry.expiry_date)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Sin lotes</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setShowForm(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-sky-50 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Package size={40} className="mx-auto mb-3 opacity-40 text-blue-600" />
                <p className="text-sm">No se encontraron productos</p>
              </div>
            )}
          </div>
        </>
      )}

      {showForm && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          suppliers={suppliers}
          usingDummy={usingDummy}
          onClose={() => setShowForm(false)}
          onSaved={(savedItem) => {
            if (usingDummy && savedItem) {
              setProducts((prev) =>
                editingProduct
                  ? prev.map((p) => (p.id === savedItem.id ? savedItem : p))
                  : [savedItem, ...prev],
              );
            } else {
              load();
            }
            setShowForm(false);
            setToast({
              message: editingProduct ? 'Producto actualizado' : 'Producto creado',
              type: 'success',
            });
          }}
        />
      )}

      <ConfirmDialog
        open={!!writeOffLot}
        onClose={() => setWriteOffLot(null)}
        onConfirm={handleWriteOff}
        title="Dar de baja por merma"
        message={
          writeOffLot
            ? `¿Confirmas dar de baja el lote ${writeOffLot.lot.lot_number} de ${writeOffLot.productName}? Se registrará como merma.`
            : ''
        }
        confirmLabel="Dar de baja"
        danger
      />

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

function AlertCard({
  icon: Icon,
  label,
  value,
  color,
  onClick,
  active,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  color: 'warning' | 'danger' | 'cyan' | 'blue';
  onClick: () => void;
  active: boolean;
}) {
  const styles = {
    warning: 'bg-amber-50/80 text-amber-800 border-amber-200/90',
    danger: 'bg-rose-50/80 text-rose-800 border-rose-200/90',
    cyan: 'bg-cyan-50/80 text-cyan-900 border-cyan-200/90',
    blue: 'bg-sky-50/80 text-blue-900 border-sky-200/90',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left shadow-xs ${
        styles[color]
      } ${active ? 'ring-2 ring-blue-500/40 border-blue-500' : 'hover:shadow-md'}`}
    >
      <Icon size={24} />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-medium">{label}</p>
      </div>
    </button>
  );
}

function LotRow({
  lot,
  productName,
  onWriteOff,
}: {
  lot: Lot;
  productName: string;
  onWriteOff: () => void;
}) {
  const status = expiryStatus(lot.expiry_date);
  const days = daysUntil(lot.expiry_date);
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border ${
        status === 'expired'
          ? 'bg-rose-50/70 border-rose-200/80'
          : 'bg-amber-50/70 border-amber-200/80'
      }`}
    >
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">{productName}</p>
        <p className="text-xs text-slate-600">
          Lote {lot.lot_number} · {lot.quantity} unidades · Vence {formatDate(lot.expiry_date)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            status === 'expired'
              ? 'bg-rose-100 text-rose-700'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {status === 'expired' ? 'Vencido' : days === 0 ? 'Hoy' : `${days} días`}
        </span>
        <button onClick={onWriteOff} className="btn-secondary text-xs py-1.5 px-3">
          <Trash2 size={14} />
          Merma
        </button>
      </div>
    </div>
  );
}

function ProductForm({
  product,
  categories,
  suppliers,
  usingDummy,
  onClose,
  onSaved,
}: {
  product: ProductWithStock | null;
  categories: Category[];
  suppliers: Supplier[];
  usingDummy: boolean;
  onClose: () => void;
  onSaved: (saved?: ProductWithStock) => void;
}) {
  const [form, setForm] = useState({
    barcode: product?.barcode ?? '',
    name: product?.name ?? '',
    active_ingredient: product?.active_ingredient ?? '',
    category_id: product?.category_id ?? '',
    supplier_id: product?.supplier_id ?? '',
    unit: product?.unit ?? 'pieza',
    cost_price: product?.cost_price?.toString() ?? '',
    sale_price: product?.sale_price?.toString() ?? '',
    tax_rate: product?.tax_rate?.toString() ?? '0',
    min_stock: product?.min_stock?.toString() ?? '5',
    max_stock: product?.max_stock?.toString() ?? '100',
    requires_prescription: product?.requires_prescription ?? false,
    is_cold_chain: product?.is_cold_chain ?? false,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const data = {
        barcode: form.barcode || null,
        name: form.name,
        active_ingredient: form.active_ingredient || null,
        category_id: form.category_id || null,
        supplier_id: form.supplier_id || null,
        unit: form.unit,
        cost_price: parseFloat(form.cost_price) || 0,
        sale_price: parseFloat(form.sale_price) || 0,
        tax_rate: parseFloat(form.tax_rate) || 0,
        min_stock: parseInt(form.min_stock) || 0,
        max_stock: parseInt(form.max_stock) || 0,
        requires_prescription: form.requires_prescription,
        is_cold_chain: form.is_cold_chain,
        updated_at: new Date().toISOString(),
      };
      if (!usingDummy) {
        if (product) {
          await database.from('products').update(data).eq('id', product.id);
        } else {
          await database.from('products').insert(data);
        }
        onSaved();
      } else {
        const cat = categories.find((c) => c.id === form.category_id);
        const sup = suppliers.find((s) => s.id === form.supplier_id);
        onSaved({
          ...(product ?? {}),
          ...data,
          id: product?.id ?? `prod-${Date.now()}`,
          category: cat,
          supplier: sup,
          total_stock: product?.total_stock ?? 10,
          lots: product?.lots ?? [],
        } as ProductWithStock);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={product ? 'Editar producto' : 'Nuevo producto'}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre del producto *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input focus:border-blue-500 focus:ring-blue-500/15"
              placeholder="Paracetamol 500mg..."
            />
          </div>
          <div>
            <label className="label">Código de barras</label>
            <input
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              className="input focus:border-blue-500 focus:ring-blue-500/15"
              placeholder="7501234567890"
            />
          </div>
        </div>
        <div>
          <label className="label">Principio activo</label>
          <input
            value={form.active_ingredient}
            onChange={(e) => setForm({ ...form, active_ingredient: e.target.value })}
            className="input focus:border-blue-500 focus:ring-blue-500/15"
            placeholder="Paracetamol"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Categoría</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="input focus:border-blue-500 focus:ring-blue-500/15"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Proveedor</label>
            <select
              value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
              className="input focus:border-blue-500 focus:ring-blue-500/15"
            >
              <option value="">Sin proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="label">Costo</label>
            <input
              type="number"
              step="0.01"
              value={form.cost_price}
              onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
              className="input focus:border-blue-500 focus:ring-blue-500/15"
            />
          </div>
          <div>
            <label className="label">P. venta</label>
            <input
              type="number"
              step="0.01"
              value={form.sale_price}
              onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
              className="input focus:border-blue-500 focus:ring-blue-500/15"
            />
          </div>
          <div>
            <label className="label">IVA %</label>
            <select
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
              className="input focus:border-blue-500 focus:ring-blue-500/15"
            >
              <option value="0">0%</option>
              <option value="16">16%</option>
            </select>
          </div>
          <div>
            <label className="label">Unidad</label>
            <input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="input focus:border-blue-500 focus:ring-blue-500/15"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Stock mínimo</label>
            <input
              type="number"
              value={form.min_stock}
              onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
              className="input focus:border-blue-500 focus:ring-blue-500/15"
            />
          </div>
          <div>
            <label className="label">Stock máximo</label>
            <input
              type="number"
              value={form.max_stock}
              onChange={(e) => setForm({ ...form, max_stock: e.target.value })}
              className="input focus:border-blue-500 focus:ring-blue-500/15"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requires_prescription}
              onChange={(e) => setForm({ ...form, requires_prescription: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Requiere receta</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_cold_chain}
              onChange={(e) => setForm({ ...form, is_cold_chain: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Cadena de frío</span>
          </label>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !form.name}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}