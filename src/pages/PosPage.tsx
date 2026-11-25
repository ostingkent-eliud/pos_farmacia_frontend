import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  X,
  Check,
  AlertTriangle,
  Receipt,
  Printer,
} from 'lucide-react';
import { database, type ProductWithStock, type Customer } from '@/lib/database';
import {
  fetchProductsWithStock,
  fetchProductByBarcode,
  formatCurrency,
  generateFolio,
  expiryStatus,
} from '@/lib/helpers';
import { Modal, Toast } from '@/components/Modal';

interface CartItem {
  product: ProductWithStock;
  quantity: number;
  lotId: string | null;
}

export function PosPage() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastSale, setLastSale] = useState<{ folio: string; total: number; change: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);

  const load = useCallback(async () => {
    try {
      const [prods, custs] = await Promise.all([
        fetchProductsWithStock(),
        database.from('customers').select('*').order('name'),
      ]);
      setProducts(prods);
      setCustomers(custs.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Barcode scanner support (rapid key entry)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && barcodeBuffer.current.length >= 8) {
        handleBarcode(barcodeBuffer.current);
        barcodeBuffer.current = '';
        return;
      }
      if (e.key.length === 1) {
        const now = Date.now();
        if (now - lastKeyTime.current > 100) barcodeBuffer.current = '';
        lastKeyTime.current = now;
        barcodeBuffer.current += e.key;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [products]);

  const handleBarcode = async (code: string) => {
    const product = await fetchProductByBarcode(code);
    if (product) {
      addToCart(product);
      setToast({ message: `${product.name} agregado`, type: 'success' });
    } else {
      setToast({ message: 'Producto no encontrado', type: 'error' });
    }
  };

  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.active_ingredient ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (p.barcode ?? '').includes(search),
      )
    : products;

  // Group by category for display
  const categoriesInSearch = [...new Set(filtered.map((p) => p.category?.name ?? 'Sin categoría'))];

  const addToCart = (product: ProductWithStock) => {
    if (product.requires_prescription && !selectedCustomer) {
      setToast({ message: `${product.name} requiere receta. Selecciona un cliente primero.`, type: 'error' });
      return;
    }
    const stock = product.total_stock ?? 0;
    const existing = cart.find((c) => c.product.id === product.id);
    if (existing && existing.quantity >= stock) {
      setToast({ message: 'Sin stock suficiente', type: 'error' });
      return;
    }
    if (existing) {
      setCart(cart.map((c) => (c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      const fefoLot = product.lots?.filter((l) => l.quantity > 0).sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))[0];
      setCart([...cart, { product, quantity: 1, lotId: fefoLot?.id ?? null }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(
      cart
        .map((c) => {
          if (c.product.id !== productId) return c;
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > (c.product.total_stock ?? 0)) {
            setToast({ message: 'Sin stock suficiente', type: 'error' });
            return c;
          }
          return { ...c, quantity: newQty };
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.product.id !== productId));
  };

  const subtotal = cart.reduce((s, item) => s + item.product.sale_price * item.quantity, 0);
  const discountAmount = discount ? Math.min(parseFloat(discount) || 0, subtotal) : 0;
  const taxableItems = cart.filter((i) => i.product.tax_rate > 0);
  const taxTotal = taxableItems.reduce(
    (s, item) => s + (item.product.sale_price * item.quantity - discountAmount * (cart.length > 0 ? item.quantity / cart.reduce((q, i) => q + i.quantity, 0) : 0)) * (item.product.tax_rate / 100),
    0,
  );
  const total = subtotal - discountAmount + taxTotal;
  const received = parseFloat(amountReceived) || 0;
  const change = Math.max(0, received - total);

  const completeSale = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'efectivo' && received < total) {
      setToast({ message: 'Efectivo insuficiente', type: 'error' });
      return;
    }
    setProcessing(true);
    try {
      const folio = generateFolio('V');
      const { data: sale, error: saleError } = await database
        .from('sales')
        .insert({
          folio,
          customer_id: selectedCustomer?.id ?? null,
          cashier_name: 'Cajero',
          subtotal,
          tax_total: taxTotal,
          discount_total: discountAmount,
          total,
          payment_method: paymentMethod,
          amount_received: paymentMethod === 'efectivo' ? received : total,
          change_given: paymentMethod === 'efectivo' ? change : 0,
          status: 'completed',
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const saleItems = cart.map((item) => ({
        sale_id: sale.id,
        product_id: item.product.id,
        lot_id: item.lotId,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.sale_price,
        tax_rate: item.product.tax_rate,
        discount: 0,
        line_total: item.product.sale_price * item.quantity,
      }));

      const { error: itemsError } = await database.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      // Reduce lot quantities (FEFO)
      for (const item of cart) {
        if (!item.lotId) continue;
        const lot = item.product.lots?.find((l) => l.id === item.lotId);
        if (!lot) continue;
        const newQty = lot.quantity - item.quantity;
        await database
          .from('lots')
          .update({ quantity: newQty, status: newQty <= 0 ? 'depleted' : 'active' })
          .eq('id', item.lotId);
      }

      // Log movement
      await database.from('movements').insert({
        type: 'sale',
        entity_type: 'sale',
        entity_id: sale.id,
        description: `Venta ${folio}${selectedCustomer ? ` - ${selectedCustomer.name}` : ''}`,
        amount: total,
        user_name: 'Cajero',
      });

      // Update loyalty points
      if (selectedCustomer) {
        await database
          .from('customers')
          .update({ loyalty_points: (selectedCustomer.loyalty_points ?? 0) + Math.floor(total / 10) })
          .eq('id', selectedCustomer.id);
      }

      setLastSale({ folio, total, change: paymentMethod === 'efectivo' ? change : 0 });
      setCart([]);
      setSelectedCustomer(null);
      setDiscount('');
      setAmountReceived('');
      setCheckoutOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      setToast({ message: 'Error al procesar la venta', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4">
      {/* Product search area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="relative mb-3">
          <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, principio activo o escanear código de barras..."
            className="input pl-11 pr-12 text-base"
            autoFocus
          />
          <ScanLine size={20} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary-500" />
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {search ? (
            <div className="space-y-4">
              {categoriesInSearch.map((catName) => {
                const items = filtered.filter((p) => (p.category?.name ?? 'Sin categoría') === catName);
                return (
                  <div key={catName}>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      {catName} ({items.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                      {items.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onAdd={() => addToCart(product)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Search size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No se encontraron productos</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {categoriesInSearch.slice(0, 4).map((catName) => {
                const items = filtered
                  .filter((p) => (p.category?.name ?? 'Sin categoría') === catName)
                  .slice(0, 6);
                return (
                  <div key={catName}>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      {catName}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                      {items.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onAdd={() => addToCart(product)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="lg:w-96 xl:w-[420px] flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-primary-600" />
            <h2 className="font-semibold text-slate-900">Carrito</h2>
            <span className="badge bg-primary-100 text-primary-700">{cart.length}</span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-slate-500 hover:text-danger-600 font-medium"
            >
              Vaciar
            </button>
          )}
        </div>

        {/* Customer selector */}
        <div className="px-4 py-3 border-b border-slate-100">
          <select
            value={selectedCustomer?.id ?? ''}
            onChange={(e) => {
              const c = customers.find((c) => c.id === e.target.value);
              setSelectedCustomer(c ?? null);
            }}
            className="input text-sm"
          >
            <option value="">Cliente general (sin receta)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingCart size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">El carrito está vacío</p>
              <p className="text-xs mt-1">Busca o escanea productos para vender</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">
                        {formatCurrency(item.product.sale_price)} c/u
                      </span>
                      {item.product.requires_prescription && (
                        <span className="badge bg-danger-100 text-danger-700 text-[10px]">Rx</span>
                      )}
                      {item.product.tax_rate === 0 && (
                        <span className="badge bg-slate-100 text-slate-600 text-[10px]">0% IVA</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQty(item.product.id, -1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.product.id, 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(item.product.sale_price * item.quantity)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-xs text-slate-400 hover:text-danger-600"
                    >
                      <Trash2 size={14} className="inline" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals and checkout */}
        {cart.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3.5 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-danger-600">
                  <span>Descuento</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>IVA</span>
                  <span>{formatCurrency(taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                <span>Total</span>
                <span className="text-primary-700">{formatCurrency(total)}</span>
              </div>
            </div>
            <button onClick={() => setCheckoutOpen(true)} className="btn-primary w-full text-base py-3">
              <Check size={20} />
              Cobrar
            </button>
          </div>
        )}
      </div>

      {/* Checkout modal */}
      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="Cobrar venta"
        subtitle={`${cart.length} producto(s) · ${selectedCustomer ? selectedCustomer.name : 'Cliente general'}`}
        size="md"
      >
        <div className="space-y-5">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-500 mb-1">Total a pagar</p>
            <p className="text-3xl font-bold text-primary-700">{formatCurrency(total)}</p>
            {discountAmount > 0 && (
              <p className="text-xs text-slate-400 mt-1">Descuento aplicado: {formatCurrency(discountAmount)}</p>
            )}
          </div>

          <div>
            <label className="label">Descuento (opcional)</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="$0.00"
              className="input"
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="label">Método de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
                { id: 'transferencia', label: 'Transferencia', icon: Smartphone },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                      paymentMethod === m.id
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-xs font-medium">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {paymentMethod === 'efectivo' && (
            <div>
              <label className="label">Efectivo recibido</label>
              <input
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="$0.00"
                className="input text-lg"
                step="0.01"
                min="0"
                autoFocus
              />
              {received >= total && (
                <div className="mt-2 flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                  <span className="text-sm text-primary-700">Cambio a devolver</span>
                  <span className="text-lg font-bold text-primary-700">{formatCurrency(change)}</span>
                </div>
              )}
              {received > 0 && received < total && (
                <p className="text-xs text-danger-600 mt-2 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  El efectivo recibido es insuficiente
                </p>
              )}
            </div>
          )}

          <button
            onClick={completeSale}
            disabled={processing || (paymentMethod === 'efectivo' && received < total)}
            className="btn-primary w-full text-base py-3"
          >
            {processing ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Check size={20} />
                Confirmar venta
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* Ticket modal */}
      <Modal
        open={!!lastSale}
        onClose={() => setLastSale(null)}
        title="Venta completada"
        size="sm"
      >
        {lastSale && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto">
              <Check size={32} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Folio</p>
              <p className="text-2xl font-bold text-slate-900 font-mono">{lastSale.folio}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total</span>
                <span className="font-semibold">{formatCurrency(lastSale.total)}</span>
              </div>
              {lastSale.change > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Cambio</span>
                  <span className="font-semibold text-primary-700">{formatCurrency(lastSale.change)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setLastSale(null)} className="btn-secondary flex-1">
                <Receipt size={18} />
                Nueva venta
              </button>
              <button
                onClick={() => {
                  setToast({ message: 'Ticket enviado por QR', type: 'info' });
                  setLastSale(null);
                }}
                className="btn-primary flex-1"
              >
                <Printer size={18} />
                Imprimir ticket
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: ProductWithStock; onAdd: () => void }) {
  const stock = product.total_stock ?? 0;
  const lowStock = stock <= product.min_stock;
  const outOfStock = stock <= 0;

  return (
    <button
      onClick={onAdd}
      disabled={outOfStock}
      className={`text-left p-3 rounded-xl border transition-all ${
        outOfStock
          ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
          : 'border-slate-200 bg-white hover:border-primary-300 hover:shadow-md active:scale-[0.98]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 line-clamp-2">{product.name}</p>
          {product.active_ingredient && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{product.active_ingredient}</p>
          )}
        </div>
        {product.requires_prescription && (
          <span className="badge bg-danger-100 text-danger-700 shrink-0">Rx</span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="font-semibold text-primary-700">{formatCurrency(product.sale_price)}</span>
        <span
          className={`text-xs font-medium ${
            outOfStock ? 'text-danger-600' : lowStock ? 'text-warning-600' : 'text-slate-400'
          }`}
        >
          {outOfStock ? 'Sin stock' : `${stock} disp.`}
        </span>
      </div>
    </button>
  );
}
