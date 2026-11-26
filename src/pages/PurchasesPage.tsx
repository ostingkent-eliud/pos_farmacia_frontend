import { useCallback, useEffect, useState } from 'react';
import {
  Truck,
  Plus,
  TrendingDown,
  ClipboardList,
  Check,
} from 'lucide-react';
import { database, type ProductWithStock, type Supplier, type Purchase } from '@/lib/database';
import { fetchProductsWithStock, formatCurrency, formatDateTime } from '@/lib/helpers';
import { Modal, Toast } from '@/components/Modal';
import { DUMMY_PRODUCTS, DUMMY_PURCHASES, DUMMY_SUPPLIERS } from '@/data/dummyData';

type Tab = 'suggested' | 'history';

export function PurchasesPage() {
  const [tab, setTab] = useState<Tab>('suggested');
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<
    (Purchase & { purchase_items: { quantity: number; unit_cost: number }[] })[]
  >([]);
  const [usingDummy, setUsingDummy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOrder, setShowOrder] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = useCallback(async () => {
    try {
      const [prods, sups, purs] = await Promise.all([
        fetchProductsWithStock(),
        database.from('suppliers').select('*').order('name'),
        database
          .from('purchases')
          .select('*, purchase_items(quantity, unit_cost)')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (prods && prods.length > 0) {
        setProducts(prods);
        setSuppliers(sups.data?.length ? sups.data : DUMMY_SUPPLIERS);
        setPurchases(purs.data?.length ? purs.data : DUMMY_PURCHASES);
        setUsingDummy(false);
      } else {
        setProducts(DUMMY_PRODUCTS);
        setSuppliers(DUMMY_SUPPLIERS);
        setPurchases(DUMMY_PURCHASES);
        setUsingDummy(true);
      }
    } catch {
      setProducts(DUMMY_PRODUCTS);
      setSuppliers(DUMMY_SUPPLIERS);
      setPurchases(DUMMY_PURCHASES);
      setUsingDummy(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const suggestedOrders = products
    .filter((p) => (p.total_stock ?? 0) <= p.min_stock)
    .map((p) => ({
      product: p,
      currentStock: p.total_stock ?? 0,
      suggestedQty: Math.max((p.max_stock ?? p.min_stock * 3) - (p.total_stock ?? 0), p.min_stock),
      estimatedCost: Math.max((p.max_stock ?? p.min_stock * 3) - (p.total_stock ?? 0), p.min_stock) * p.cost_price,
    }))
    .sort((a, b) => a.currentStock - b.currentStock);

  const totalSuggested = suggestedOrders.reduce((s, o) => s + o.estimatedCost, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('suggested')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === 'suggested'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/20'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <TrendingDown size={18} />
          Qué pedir hoy
          {suggestedOrders.length > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ml-1 ${
                tab === 'suggested' ? 'bg-white/20 text-white' : 'bg-sky-100 text-blue-700'
              }`}
            >
              {suggestedOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === 'history'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-600/20'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ClipboardList size={18} />
          Historial de compras
        </button>
      </div>

      {tab === 'suggested' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4">
              <p className="text-xs text-slate-500 font-medium">Productos a reponer</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{suggestedOrders.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4">
              <p className="text-xs text-slate-500 font-medium">Inversión estimada</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(totalSuggested)}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-[#071a35] to-[#0b2d5c] p-4 text-white flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-cyan-200/80 font-medium">Generar orden</p>
                <p className="text-sm text-white/90 mt-1">Crea una compra rápida</p>
              </div>
              <button
                onClick={() => setShowOrder(true)}
                disabled={suggestedOrders.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-50"
              >
                <Plus size={18} />
                Crear
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingDown size={18} className="text-blue-600" />
                Productos que conviene pedir hoy
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Basado en stock actual vs. máximos/mínimos configurados
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {suggestedOrders.map(({ product, currentStock, suggestedQty, estimatedCost }) => (
                <div key={product.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-sky-50/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {product.active_ingredient} · {product.supplier?.name ?? 'Sin proveedor'}
                    </p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="text-xs text-slate-400">Actual</p>
                    <p className={`text-sm font-bold ${currentStock === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {currentStock}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Sugerido</p>
                    <p className="text-sm font-bold text-blue-700">{suggestedQty}</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-slate-400">Costo est.</p>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(estimatedCost)}</p>
                  </div>
                </div>
              ))}
              {suggestedOrders.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Check size={40} className="mx-auto mb-3 text-blue-600" />
                  <p className="text-sm">Todos los productos tienen stock suficiente</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">Folio</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3 hidden sm:table-cell">
                    Proveedor
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3 hidden md:table-cell">
                    Factura
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase px-4 py-3">Items</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase px-4 py-3">Total</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3 hidden lg:table-cell">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-blue-700 font-mono">{p.folio}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-slate-800">{p.supplier_name ?? 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-slate-500">{p.invoice_number ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-sky-50 border border-sky-200/70 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        {p.purchase_items?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(p.total)}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-slate-500">{formatDateTime(p.created_at)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {purchases.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Truck size={40} className="mx-auto mb-3 opacity-40 text-blue-600" />
              <p className="text-sm">No hay compras registradas</p>
            </div>
          )}
        </div>
      )}

      {showOrder && (
        <QuickOrderModal
          products={suggestedOrders.map((s) => s.product)}
          suppliers={suppliers}
          usingDummy={usingDummy}
          onClose={() => setShowOrder(false)}
          onSaved={(newPurchase) => {
            if (usingDummy && newPurchase) {
              setPurchases((prev) => [newPurchase, ...prev]);
              setProducts((prev) =>
                prev.map((p) => {
                  const ordered = suggestedOrders.find((s) => s.product.id === p.id);
                  if (!ordered) return p;
                  return { ...p, total_stock: (p.total_stock ?? 0) + ordered.suggestedQty };
                }),
              );
            } else {
              load();
            }
            setShowOrder(false);
            setToast({ message: 'Compra registrada y stock actualizado', type: 'success' });
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

function QuickOrderModal({
  products,
  suppliers,
  usingDummy,
  onClose,
  onSaved,
}: {
  products: ProductWithStock[];
  suppliers: Supplier[];
  usingDummy: boolean;
  onClose: () => void;
  onSaved: (created?: Purchase & { purchase_items: { quantity: number; unit_cost: number }[] }) => void;
}) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState(
    products.map((p) => ({
      product: p,
      quantity: Math.max((p.max_stock ?? p.min_stock * 3) - (p.total_stock ?? 0), p.min_stock),
      lotNumber: '',
      expiryDate: '',
    })),
  );
  const [saving, setSaving] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.product.cost_price * i.quantity, 0);
  const total = subtotal;

  const save = async () => {
    setSaving(true);
    try {
      const folio = `COMP-${Date.now().toString(36).toUpperCase()}`;
      const supplier = suppliers.find((s) => s.id === supplierId);

      if (!usingDummy) {
        const { data: purchase, error } = await database
          .from('purchases')
          .insert({
            folio,
            supplier_id: supplierId || null,
            supplier_name: supplier?.name ?? null,
            invoice_number: invoiceNumber || null,
            subtotal,
            tax_total: 0,
            total,
            status: 'received',
          })
          .select()
          .single();
        if (error) throw error;

        const purchaseItems = items
          .filter((i) => i.quantity > 0)
          .map((i) => ({
            purchase_id: purchase.id,
            product_id: i.product.id,
            product_name: i.product.name,
            lot_number: i.lotNumber || null,
            quantity: i.quantity,
            unit_cost: i.product.cost_price,
            expiry_date: i.expiryDate || null,
            line_total: i.product.cost_price * i.quantity,
          }));
        const { error: itemsError } = await database.from('purchase_items').insert(purchaseItems);
        if (itemsError) throw itemsError;

        for (const item of items.filter((i) => i.quantity > 0)) {
          if (item.expiryDate) {
            await database.from('lots').insert({
              product_id: item.product.id,
              lot_number: item.lotNumber || `LOT-${Date.now().toString(36)}`,
              quantity: item.quantity,
              cost_price: item.product.cost_price,
              expiry_date: item.expiryDate,
              received_date: new Date().toISOString().split('T')[0],
              status: 'active',
            });
          }
        }

        await database.from('movements').insert({
          type: 'purchase',
          entity_type: 'purchase',
          entity_id: purchase.id,
          description: `Compra ${folio} a ${supplier?.name ?? 'proveedor'}`,
          amount: total,
          user_name: 'Admin',
        });

        onSaved();
      } else {
        onSaved({
          id: `pur-${Date.now()}`,
          folio,
          supplier_id: supplierId || null,
          supplier_name: supplier?.name ?? 'Proveedor',
          invoice_number: invoiceNumber || 'FAC-DEMO-01',
          subtotal,
          tax_total: 0,
          total,
          status: 'received',
          created_at: new Date().toISOString(),
          purchase_items: items
            .filter((i) => i.quantity > 0)
            .map((i) => ({ quantity: i.quantity, unit_cost: i.product.cost_price })),
        } as Purchase & { purchase_items: { quantity: number; unit_cost: number }[] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Crear orden de compra" subtitle="Carga rápida de factura del proveedor" size="xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Proveedor</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input focus:border-blue-500">
              <option value="">Seleccionar proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Número de factura / XML</label>
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="input focus:border-blue-500"
              placeholder="FAC-2026-001"
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase">Productos a pedir</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {items.map((item, idx) => (
              <div key={item.product.id} className="p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.product.name}</p>
                    <p className="text-xs text-slate-500">
                      Costo: {formatCurrency(item.product.cost_price)} · Stock actual: {item.product.total_stock ?? 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx] = { ...item, quantity: parseInt(e.target.value) || 0 };
                        setItems(newItems);
                      }}
                      className="input w-20 text-center py-1.5"
                      min="0"
                    />
                    <span className="text-xs text-slate-400">u.</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 w-24 text-right">
                    {formatCurrency(item.product.cost_price * item.quantity)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-3">
                  <input
                    value={item.lotNumber}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[idx] = { ...item, lotNumber: e.target.value };
                      setItems(newItems);
                    }}
                    className="input text-xs py-1.5"
                    placeholder="Núm. lote"
                  />
                  <input
                    type="date"
                    value={item.expiryDate}
                    onChange={(e) => {
                      const newItems = [...items];
                      newItems[idx] = { ...item, expiryDate: e.target.value };
                      setItems(newItems);
                    }}
                    className="input text-xs py-1.5"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 bg-sky-50 border border-sky-200/80 rounded-xl">
          <span className="text-sm font-medium text-blue-900">Total de la compra</span>
          <span className="text-xl font-bold text-blue-700">{formatCurrency(total)}</span>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !supplierId}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {saving ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Check size={18} />
                Registrar compra
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}