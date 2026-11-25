import { useCallback, useEffect, useState } from 'react';
import {
  Truck,
  Plus,
  TrendingDown,
  ClipboardList,
  FileText,
  Calendar,
  Package,
  Check,
} from 'lucide-react';
import { supabase, type ProductWithStock, type Supplier, type Purchase } from '@/lib/supabase';
import { fetchProductsWithStock, formatCurrency, formatDateTime, formatDate } from '@/lib/helpers';
import { Modal, Toast } from '@/components/Modal';

type Tab = 'suggested' | 'history';

export function PurchasesPage() {
  const [tab, setTab] = useState<Tab>('suggested');
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<(Purchase & { items: { quantity: number; unit_cost: number }[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrder, setShowOrder] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = useCallback(async () => {
    try {
      const [prods, sups, purs] = await Promise.all([
        fetchProductsWithStock(),
        supabase.from('suppliers').select('*').order('name'),
        supabase
          .from('purchases')
          .select('*, purchase_items(quantity, unit_cost)')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      setProducts(prods);
      setSuppliers(sups.data ?? []);
      setPurchases(purs.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Suggested orders: products at or below min_stock
  const suggestedOrders = products
    .filter((p) => (p.total_stock ?? 0) <= p.min_stock)
    .map((p) => ({
      product: p,
      currentStock: p.total_stock ?? 0,
      suggestedQty: Math.max(p.max_stock - (p.total_stock ?? 0), p.min_stock),
      estimatedCost: (p.max_stock - (p.total_stock ?? 0)) * p.cost_price,
    }))
    .sort((a, b) => a.currentStock - b.currentStock);

  const totalSuggested = suggestedOrders.reduce((s, o) => s + o.estimatedCost, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('suggested')}
          className={`btn ${tab === 'suggested' ? 'bg-primary-600 text-white' : 'btn-secondary'}`}
        >
          <TrendingDown size={18} />
          Qué pedir hoy
          {suggestedOrders.length > 0 && (
            <span className="badge bg-white/20 text-white ml-1">{suggestedOrders.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`btn ${tab === 'history' ? 'bg-primary-600 text-white' : 'btn-secondary'}`}
        >
          <ClipboardList size={18} />
          Historial de compras
        </button>
      </div>

      {tab === 'suggested' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="text-xs text-slate-500 font-medium">Productos a reponer</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{suggestedOrders.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500 font-medium">Inversión estimada</p>
              <p className="text-2xl font-bold text-primary-700 mt-1">{formatCurrency(totalSuggested)}</p>
            </div>
            <div className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Generar orden</p>
                <p className="text-sm text-slate-400 mt-1">Crea una compra rápida</p>
              </div>
              <button
                onClick={() => setShowOrder(true)}
                disabled={suggestedOrders.length === 0}
                className="btn-primary"
              >
                <Plus size={18} />
                Crear
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingDown size={18} className="text-warning-600" />
                Productos que conviene pedir hoy
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Basado en stock actual vs. máximos/mínimos configurados
              </p>
            </div>
            <div className="divide-y divide-slate-50">
              {suggestedOrders.map(({ product, currentStock, suggestedQty, estimatedCost }) => (
                <div key={product.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {product.active_ingredient} · {product.supplier?.name ?? 'Sin proveedor'}
                    </p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="text-xs text-slate-400">Actual</p>
                    <p className={`text-sm font-semibold ${currentStock === 0 ? 'text-danger-600' : 'text-warning-600'}`}>
                      {currentStock}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Sugerido</p>
                    <p className="text-sm font-semibold text-primary-700">{suggestedQty}</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-slate-400">Costo est.</p>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(estimatedCost)}</p>
                  </div>
                </div>
              ))}
              {suggestedOrders.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Check size={40} className="mx-auto mb-3 text-primary-500" />
                  <p className="text-sm">Todos los productos tienen stock suficiente</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
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
              <tbody className="divide-y divide-slate-50">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900 font-mono">{p.folio}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-slate-700">{p.supplier_name ?? 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-slate-500">{p.invoice_number ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="badge bg-slate-100 text-slate-600">
                        {p.purchase_items?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(p.total)}</p>
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
              <Truck size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay compras registradas</p>
            </div>
          )}
        </div>
      )}

      {showOrder && (
        <QuickOrderModal
          products={suggestedOrders.map((s) => s.product)}
          suppliers={suppliers}
          onClose={() => setShowOrder(false)}
          onSaved={() => {
            setShowOrder(false);
            load();
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
  onClose,
  onSaved,
}: {
  products: ProductWithStock[];
  suppliers: Supplier[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState(
    products.map((p) => ({
      product: p,
      quantity: Math.max(p.max_stock - (p.total_stock ?? 0), p.min_stock),
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
      const folio = `COMP${Date.now().toString(36).toUpperCase()}`;
      const supplier = suppliers.find((s) => s.id === supplierId);
      const { data: purchase, error } = await supabase
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

      // Insert purchase items
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
      const { error: itemsError } = await supabase.from('purchase_items').insert(purchaseItems);
      if (itemsError) throw itemsError;

      // Create lots for each item
      for (const item of items.filter((i) => i.quantity > 0)) {
        if (item.expiryDate) {
          await supabase.from('lots').insert({
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

      // Log movement
      await supabase.from('movements').insert({
        type: 'purchase',
        entity_type: 'purchase',
        entity_id: purchase.id,
        description: `Compra ${folio} a ${supplier?.name ?? 'proveedor'}`,
        amount: total,
        user_name: 'Admin',
      });

      onSaved();
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
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input">
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
              className="input"
              placeholder="FAC-2025-001"
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase">Productos a pedir</p>
          </div>
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
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
                  <div>
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
                  </div>
                  <div>
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
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-primary-50 rounded-xl">
          <span className="text-sm text-slate-700">Total de la compra</span>
          <span className="text-xl font-bold text-primary-700">{formatCurrency(total)}</span>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={save} disabled={saving || !supplierId} className="btn-primary">
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
