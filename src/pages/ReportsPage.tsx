import { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  ShoppingBag,
  Award,
  Clock,
  Activity,
  FileText,
} from 'lucide-react';
import { supabase, type Sale, type ProductWithStock, type Movement } from '@/lib/supabase';
import { fetchProductsWithStock, formatCurrency, formatDateTime, daysUntil, expiryStatus } from '@/lib/helpers';

export function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [weekSales, setWeekSales] = useState<Sale[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number; revenue: number }[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  const load = useCallback(async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [todayRes, weekRes, itemsRes, prods, movs] = await Promise.all([
        supabase.from('sales').select('*').gte('created_at', todayStart).eq('status', 'completed').order('created_at', { ascending: false }),
        supabase.from('sales').select('*').gte('created_at', weekAgo).eq('status', 'completed').order('created_at', { ascending: false }),
        supabase.from('sale_items').select('product_name, quantity, line_total').gte('created_at', weekAgo),
        fetchProductsWithStock(),
        supabase.from('movements').select('*').order('created_at', { ascending: false }).limit(30),
      ]);

      setTodaySales(todayRes.data ?? []);
      setWeekSales(weekRes.data ?? []);
      setProducts(prods);
      setMovements(movs.data ?? []);

      // Aggregate top products
      const productMap: Record<string, { qty: number; revenue: number }> = {};
      (itemsRes.data ?? []).forEach((item) => {
        if (!productMap[item.product_name]) productMap[item.product_name] = { qty: 0, revenue: 0 };
        productMap[item.product_name].qty += item.quantity;
        productMap[item.product_name].revenue += item.line_total;
      });
      setTopProducts(
        Object.entries(productMap)
          .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 8),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const todayTotal = todaySales.reduce((s, sale) => s + sale.total, 0);
  const todayTax = todaySales.reduce((s, sale) => s + sale.tax_total, 0);
  const todayItems = todaySales.length;

  // Estimated profit: (sale_price - cost_price) * qty from sale_items
  // We approximate using week data margin
  const weekTotal = weekSales.reduce((s, sale) => s + sale.total, 0);
  const avgTicket = todaySales.length > 0 ? todayTotal / todaySales.length : 0;

  const lowStock = products.filter((p) => (p.total_stock ?? 0) <= p.min_stock);
  const expiredLots = products.flatMap((p) =>
    (p.lots ?? []).filter((l) => l.quantity > 0 && expiryStatus(l.expiry_date) === 'expired'),
  );
  const inventoryValue = products.reduce(
    (s, p) => s + (p.total_stock ?? 0) * p.cost_price,
    0,
  );

  // Build hourly distribution for today
  const hourly: Record<number, number> = {};
  todaySales.forEach((s) => {
    const h = new Date(s.created_at).getHours();
    hourly[h] = (hourly[h] ?? 0) + s.total;
  });
  const maxHourly = Math.max(...Object.values(hourly), 1);

  return (
    <div className="p-4 space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Ventas de hoy"
          value={formatCurrency(todayTotal)}
          icon={DollarSign}
          color="primary"
          subtitle={`${todayItems} transacciones`}
        />
        <KpiCard
          label="Ticket promedio"
          value={formatCurrency(avgTicket)}
          icon={TrendingUp}
          color="accent"
          subtitle="Por venta hoy"
        />
        <KpiCard
          label="Valor inventario"
          value={formatCurrency(inventoryValue)}
          icon={Package}
          color="warning"
          subtitle={`${products.length} productos`}
        />
        <KpiCard
          label="Alertas activas"
          value={String(lowStock.length + expiredLots.length)}
          icon={AlertTriangle}
          color="danger"
          subtitle={`${lowStock.length} stock bajo, ${expiredLots.length} vencidos`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales chart - today by hour */}
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Activity size={18} className="text-primary-600" />
              Ventas por hora (hoy)
            </h3>
            <span className="text-sm text-slate-500">{formatCurrency(todayTotal)}</span>
          </div>
          {Object.keys(hourly).length > 0 ? (
            <div className="flex items-end gap-1 h-48">
              {Array.from({ length: 24 }, (_, h) => {
                const value = hourly[h] ?? 0;
                const heightPct = (value / maxHourly) * 100;
                return (
                  <div key={h} className="flex-1 flex flex-col items-center justify-end group relative">
                    <div
                      className={`w-full rounded-t transition-all ${
                        value > 0 ? 'bg-primary-500 hover:bg-primary-600' : 'bg-slate-100'
                      }`}
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                    {value > 0 && (
                      <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {formatCurrency(value)}
                      </div>
                    )}
                    {h % 4 === 0 && <span className="text-[10px] text-slate-400 mt-1">{h}h</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              Sin ventas hoy todavía
            </div>
          )}
        </div>

        {/* Week summary */}
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <ShoppingBag size={18} className="text-accent-600" />
            Resumen semanal
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Total vendido</span>
              <span className="font-semibold text-slate-900">{formatCurrency(weekTotal)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Transacciones</span>
              <span className="font-semibold text-slate-900">{weekSales.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">Ticket prom. semanal</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(weekSales.length > 0 ? weekTotal / weekSales.length : 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-600">IVA recaudado hoy</span>
              <span className="font-semibold text-slate-900">{formatCurrency(todayTax)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-600">Productos activos</span>
              <span className="font-semibold text-slate-900">{products.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Award size={18} className="text-warning-600" />
            Productos que más se mueven (7 días)
          </h3>
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${(p.revenue / (topProducts[0]?.revenue || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">{p.qty} u.</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-700 shrink-0">{formatCurrency(p.revenue)}</span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">Sin ventas en la última semana</p>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger-600" />
            Alertas importantes
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {expiredLots.map((lot) => {
              const product = products.find((p) => p.id === lot.product_id);
              return (
                <div key={lot.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-danger-50 border border-danger-100">
                  <AlertTriangle size={16} className="text-danger-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{product?.name}</p>
                    <p className="text-xs text-danger-600">Lote {lot.lot_number} vencido</p>
                  </div>
                </div>
              );
            })}
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-warning-50 border border-warning-100">
                <Package size={16} className="text-warning-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-warning-600">Stock {p.total_stock} (mín. {p.min_stock})</p>
                </div>
              </div>
            ))}
            {lowStock.length === 0 && expiredLots.length === 0 && (
              <div className="text-center py-8">
                <Award size={32} className="mx-auto mb-2 text-primary-500" />
                <p className="text-sm text-slate-400">Sin alertas. Todo en orden.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Movement log / audit */}
      <div className="card p-4">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <FileText size={18} className="text-slate-600" />
          Bitácora de movimientos
        </h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {movements.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 text-sm">
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  m.type === 'sale'
                    ? 'bg-primary-500'
                    : m.type === 'purchase'
                      ? 'bg-accent-500'
                      : m.type === 'write_off'
                        ? 'bg-danger-500'
                        : 'bg-slate-300'
                }`}
              />
              <span className="flex-1 text-slate-700">{m.description}</span>
              {m.amount && <span className="text-slate-500 font-medium">{formatCurrency(m.amount)}</span>}
              <span className="text-xs text-slate-400 shrink-0">{formatDateTime(m.created_at)}</span>
            </div>
          ))}
          {movements.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sin movimientos</p>}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  color: 'primary' | 'accent' | 'warning' | 'danger';
  subtitle?: string;
}) {
  const colors = {
    primary: 'bg-primary-50 text-primary-700',
    accent: 'bg-accent-50 text-accent-700',
    warning: 'bg-warning-50 text-warning-700',
    danger: 'bg-danger-50 text-danger-700',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-600 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
