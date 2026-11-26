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
  Check,
  AlertTriangle,
  Receipt,
  Printer,
  Sparkles,
} from 'lucide-react';
import { database, type ProductWithStock, type Customer } from '@/lib/database';
import {
  fetchProductsWithStock,
  fetchProductByBarcode,
  formatCurrency,
  generateFolio,
} from '@/lib/helpers';
import { Modal, Toast } from '@/components/Modal';
import { DUMMY_CUSTOMERS, DUMMY_PRODUCTS } from '@/data/dummyData';

interface CartItem {
  product: ProductWithStock;
  quantity: number;
  lotId: string | null;
}

export function PosPage() {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [usingDummyData, setUsingDummyData] = useState(false);
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

      const hasRealProducts = Array.isArray(prods) && prods.length > 0;
      const hasRealCustomers = Array.isArray(custs?.data) && custs.data.length > 0;

      if (hasRealProducts || hasRealCustomers) {
        setProducts(hasRealProducts ? prods : DUMMY_PRODUCTS);
        setCustomers(hasRealCustomers ? custs.data! : DUMMY_CUSTOMERS);
        setUsingDummyData(!hasRealProducts);
      } else {
        setProducts(DUMMY_PRODUCTS);
        setCustomers(DUMMY_CUSTOMERS);
        setUsingDummyData(true);
      }
    } catch {
      setProducts(DUMMY_PRODUCTS);
      setCustomers(DUMMY_CUSTOMERS);
      setUsingDummyData(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addToCart = useCallback(
    (product: ProductWithStock) => {
      if (product.requires_prescription && !selectedCustomer) {
        setToast({
          message: `${product.name} requiere receta. Selecciona un cliente primero.`,
          type: 'error',
        });
        return;
      }
      const stock = product.total_stock ?? 0;
      const existing = cart.find((c) => c.product.id === product.id);
      if (existing && existing.quantity >= stock) {
        setToast({ message: 'Sin stock suficiente', type: 'error' });
        return;
      }
      if (existing) {
        setCart(
          cart.map((c) =>
            c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c,
          ),
        );
      } else {
        const fefoLot = product.lots
          ?.filter((l) => l.quantity > 0)
          .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))[0];
        setCart([...cart, { product, quantity: 1, lotId: fefoLot?.id ?? null }]);
      }
    },
    [cart, selectedCustomer],
  );

  const handleBarcode = useCallback(
    async (code: string) => {
      const localMatch = products.find((p) => p.barcode === code);
      if (localMatch) {
        addToCart(localMatch);
        setToast({ message: `${localMatch.name} agregado`, type: 'success' });
        return;
      }
      try {
        const product = await fetchProductByBarcode(code);
        if (product) {
          addToCart(product);
          setToast({ message: `${product.name} agregado`, type: 'success' });
          return;
        }
      } catch {
        // Ignorar error de red en modo demo
      }
      setToast({ message: 'Producto no encontrado', type: 'error' });
    },
    [products, addToCart],
  );

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
  }, [handleBarcode]);

  const filtered = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.active_ingredient ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (p.barcode ?? '').includes(search),
      )
    : products;

  const categoriesInSearch = [...new Set(filtered.map((p) => p.category?.name ?? 'Sin categoría'))];

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
  const totalQty = cart.reduce((q, i) => q + i.quantity, 0);
  const taxableItems = cart.filter((i) => i.product.tax_rate > 0);
  const taxTotal = taxableItems.reduce((s, item) => {
    const itemSubtotal = item.product.sale_price * item.quantity;
    const itemDiscount =
      totalQty > 0 ? discountAmount * (item.quantity / totalQty) : 0;
    return s + Math.max(0, itemSubtotal - itemDiscount) * (item.product.tax_rate / 100);
  }, 0);
  const total = Math.max(0, subtotal - discountAmount + taxTotal);
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

      if (!usingDummyData) {
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

        await database.from('movements').insert({
          type: 'sale',
          entity_type: 'sale',
          entity_id: sale.id,
          description: `Venta ${folio}${selectedCustomer ? ` - ${selectedCustomer.name}` : ''}`,
          amount: total,
          user_name: 'Cajero',
        });

        if (selectedCustomer) {
          await database
            .from('customers')
            .update({
              loyalty_points: (selectedCustomer.loyalty_points ?? 0) + Math.floor(total / 10),
            })
            .eq('id', selectedCustomer.id);
        }

        await load();
      } else {
        // Descontar stock en memoria para el flujo de prueba con dummyData
        setProducts((prev) =>
          prev.map((prod) => {
            const cartItem = cart.find((c) => c.product.id === prod.id);
            if (!cartItem) return prod;
            const nextStock = Math.max(0, (prod.total_stock ?? 0) - cartItem.quantity);
            return {
              ...prod,
              total_stock: nextStock,
            };
          }),
        );
      }

      setLastSale({ folio, total, change: paymentMethod === 'efectivo' ? change : 0 });
      setCart([]);
      setSelectedCustomer(null);
      setDiscount('');
      setAmountReceived('');
      setCheckoutOpen(false);
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
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 p-4">
      {/* Área de búsqueda y catálogo */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="relative mb-3">
          <Search
            size={20}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, principio activo o escanear código de barras..."
            className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            autoFocus
          />
          <ScanLine
            size={20}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-600"
          />
        </div>

        {usingDummyData && (
          <div className="mb-3 flex items-center justify-between rounded-xl border border-sky-200/80 bg-sky-50/80 px-3.5 py-2 text-xs text-sky-900">
            <span className="flex items-center gap-2">
              <Sparkles size={14} className="text-blue-600 shrink-0" />
              Mostrando catálogo de prueba (<span className="font-semibold">dummyData.ts</span>) para simular ventas y recetas.
            </span>
            <span className="hidden sm:inline font-medium text-blue-700">
              {products.length} productos
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1">
          {search ? (
            <div className="space-y-4">
              {categoriesInSearch.map((catName) => {
                const items = filtered.filter(
                  (p) => (p.category?.name ?? 'Sin categoría') === catName,
                );
                return (
                  <div key={catName}>
                    <h3 className="text-xs font-semibold text-blue-900/70 uppercase tracking-wider mb-2">
                      {catName} ({items.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
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
                <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200/80">
                  <Search size={40} className="mx-auto mb-3 opacity-40 text-blue-600" />
                  <p className="text-sm font-medium text-slate-600">No se encontraron productos</p>
                  <p className="text-xs mt-1">Intenta con otro nombre, sal activa o código</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {categoriesInSearch.slice(0, 5).map((catName) => {
                const items = filtered
                  .filter((p) => (p.category?.name ?? 'Sin categoría') === catName)
                  .slice(0, 6);
                return (
                  <div key={catName}>
                    <h3 className="text-xs font-semibold text-blue-900/70 uppercase tracking-wider mb-2">
                      {catName}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
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

      {/* Panel del carrito */}
      <div className="lg:w-96 xl:w-[420px] flex flex-col bg-white rounded-xl border border-slate-200/90 shadow-sm shrink-0">
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">Carrito</h2>
            <span className="inline-flex items-center justify-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {cart.length}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium transition-colors"
            >
              Vaciar
            </button>
          )}
        </div>

        {/* Selector de cliente */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/40">
          <select
            value={selectedCustomer?.id ?? ''}
            onChange={(e) => {
              const c = customers.find((c) => c.id === e.target.value);
              setSelectedCustomer(c ?? null);
            }}
            className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="">Cliente general (sin receta)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Artículos del carrito */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingCart size={36} className="mx-auto mb-3 opacity-35 text-blue-600" />
              <p className="text-sm font-medium text-slate-500">El carrito está vacío</p>
              <p className="text-xs mt-1">Busca o escanea productos para vender</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50/30 hover:border-sky-200 hover:bg-sky-50/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {item.product.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-xs text-slate-500">
                        {formatCurrency(item.product.sale_price)} c/u
                      </span>
                      {item.product.requires_prescription && (
                        <span className="inline-flex items-center rounded-md bg-rose-50 border border-rose-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                          Rx
                        </span>
                      )}
                      {item.product.tax_rate === 0 && (
                        <span className="inline-flex items-center rounded-md bg-sky-50 border border-sky-200/70 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                          0% IVA
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQty(item.product.id, -1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.product.id, 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="text-right min-w-[68px]">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(item.product.sale_price * item.quantity)}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-xs text-slate-400 hover:text-rose-600 transition-colors mt-0.5"
                    >
                      <Trash2 size={14} className="inline" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totales y botón de cobro */}
        {cart.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3.5 space-y-3 bg-slate-50/40 rounded-b-xl">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Descuento</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>IVA (16%)</span>
                  <span>{formatCurrency(taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200/80">
                <span>Total</span>
                <span className="text-blue-700">{formatCurrency(total)}</span>
              </div>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:shadow-xl hover:shadow-blue-600/25 active:scale-[0.99]"
            >
              <Check size={20} />
              Cobrar
            </button>
          </div>
        )}
      </div>

      {/* Modal de cobro */}
      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="Cobrar venta"
        subtitle={`${cart.length} producto(s) · ${selectedCustomer ? selectedCustomer.name : 'Cliente general'}`}
        size="md"
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-[#071a35] to-[#0b2d5c] p-4 text-center text-white">
            <p className="text-xs uppercase tracking-wider text-cyan-200/80 mb-1">Total a pagar</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(total)}</p>
            {discountAmount > 0 && (
              <p className="text-xs text-cyan-200/75 mt-1">
                Descuento aplicado: {formatCurrency(discountAmount)}
              </p>
            )}
          </div>

          <div>
            <label className="label">Descuento (opcional)</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="$0.00"
              className="input focus:border-blue-500 focus:ring-blue-500/15"
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
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                      active
                        ? 'border-blue-600 bg-sky-50 text-blue-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-xs font-semibold">{m.label}</span>
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
                className="input text-lg focus:border-blue-500 focus:ring-blue-500/15"
                step="0.01"
                min="0"
                autoFocus
              />
              {received >= total && (
                <div className="mt-2.5 flex items-center justify-between p-3 bg-sky-50 border border-sky-200/80 rounded-xl">
                  <span className="text-sm font-medium text-blue-900">Cambio a devolver</span>
                  <span className="text-lg font-bold text-blue-700">{formatCurrency(change)}</span>
                </div>
              )}
              {received > 0 && received < total && (
                <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  El efectivo recibido es insuficiente
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={completeSale}
            disabled={processing || (paymentMethod === 'efectivo' && received < total)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:shadow-xl disabled:opacity-60"
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

      {/* Modal de ticket */}
      <Modal
        open={!!lastSale}
        onClose={() => setLastSale(null)}
        title="Venta completada"
        size="sm"
      >
        {lastSale && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mx-auto">
              <Check size={32} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Folio</p>
              <p className="text-2xl font-bold text-slate-900 font-mono">{lastSale.folio}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total</span>
                <span className="font-semibold text-slate-900">{formatCurrency(lastSale.total)}</span>
              </div>
              {lastSale.change > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Cambio</span>
                  <span className="font-semibold text-blue-700">{formatCurrency(lastSale.change)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLastSale(null)}
                className="btn-secondary flex-1"
              >
                <Receipt size={18} />
                Nueva venta
              </button>
              <button
                type="button"
                onClick={() => {
                  setToast({ message: 'Ticket enviado por QR', type: 'info' });
                  setLastSale(null);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
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
  const lowStock = stock > 0 && stock <= product.min_stock;
  const outOfStock = stock <= 0;

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={outOfStock}
      className={`text-left p-3.5 rounded-xl border transition-all ${
        outOfStock
          ? 'border-slate-100 bg-slate-50/80 opacity-60 cursor-not-allowed'
          : 'border-slate-200/90 bg-white hover:border-blue-400 hover:shadow-md hover:shadow-sky-900/5 active:scale-[0.98]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 line-clamp-2">{product.name}</p>
          {product.active_ingredient && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{product.active_ingredient}</p>
          )}
        </div>
        {product.requires_prescription && (
          <span className="inline-flex items-center rounded-md bg-rose-50 border border-rose-200/80 px-2 py-0.5 text-[11px] font-semibold text-rose-700 shrink-0">
            Rx
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
        <span className="font-bold text-blue-700">{formatCurrency(product.sale_price)}</span>
        <span
          className={`text-xs font-medium ${
            outOfStock
              ? 'text-rose-600'
              : lowStock
                ? 'text-amber-600'
                : 'text-slate-500'
          }`}
        >
          {outOfStock ? 'Sin stock' : `${stock} disp.`}
        </span>
      </div>
    </button>
  );
}