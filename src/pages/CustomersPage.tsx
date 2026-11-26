import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Award,
  Wallet,
  ShoppingBag,
  Eye,
  Stethoscope,
  Pill,
} from 'lucide-react';
import { database, type Customer, type Sale } from '@/lib/database';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/helpers';
import { Modal, Toast } from '@/components/Modal';
import { DUMMY_CUSTOMERS, DUMMY_SALES } from '@/data/dummyData';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [usingDummy, setUsingDummy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, error } = await database.from('customers').select('*').order('name');
      if (!error && data && data.length > 0) {
        setCustomers(data);
        setUsingDummy(false);
      } else {
        setCustomers(DUMMY_CUSTOMERS);
        setUsingDummy(true);
      }
    } catch {
      setCustomers(DUMMY_CUSTOMERS);
      setUsingDummy(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const viewCustomer = async (customer: Customer) => {
    setViewing(customer);
    if (usingDummy) {
      setCustomerSales(DUMMY_SALES.filter((s) => s.customer_id === customer.id));
      return;
    }
    try {
      const { data } = await database
        .from('sales')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setCustomerSales(data ?? []);
    } catch {
      setCustomerSales(DUMMY_SALES.filter((s) => s.customer_id === customer.id));
    }
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(search) ||
      (c.email ?? '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente por nombre, teléfono o email..."
            className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:shadow-lg"
        >
          <Plus size={18} />
          Nuevo cliente
        </button>
      </div>

      {/* Grid de clientes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((customer) => (
          <div key={customer.id} className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 hover:border-sky-300 hover:shadow-md transition-all">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center font-semibold text-sm shrink-0 shadow-xs">
                {customer.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{customer.name}</p>
                {customer.phone && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone size={12} className="text-blue-600" />
                    {customer.phone}
                  </p>
                )}
                {customer.email && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                    <Mail size={12} className="text-cyan-600" />
                    {customer.email}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-cyan-50/70 border border-cyan-200/60 rounded-xl p-2 text-center">
                <Award size={16} className="text-cyan-700 mx-auto mb-1" />
                <p className="text-sm font-bold text-cyan-900">{customer.loyalty_points}</p>
                <p className="text-[10px] text-slate-500">puntos</p>
              </div>
              <div className="bg-sky-50/80 border border-sky-200/70 rounded-xl p-2 text-center">
                <Wallet size={16} className="text-blue-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-blue-800">{formatCurrency(customer.wallet_balance)}</p>
                <p className="text-[10px] text-slate-500">monedero</p>
              </div>
            </div>

            {customer.notes && (
              <p className="text-xs text-slate-500 italic mb-3 line-clamp-2">"{customer.notes}"</p>
            )}

            <div className="flex gap-2">
              <button onClick={() => viewCustomer(customer)} className="btn-secondary text-xs py-2 flex-1">
                <Eye size={14} />
                Ver historial
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200/80">
          <Users size={48} className="mx-auto mb-3 opacity-30 text-blue-600" />
          <p className="text-sm">No se encontraron clientes</p>
        </div>
      )}

      {/* Modal detalle cliente */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        subtitle="Historial de compras y expediente"
        size="lg"
      >
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-center">
                <ShoppingBag size={18} className="text-slate-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-900">{customerSales.length}</p>
                <p className="text-xs text-slate-500">compras</p>
              </div>
              <div className="bg-cyan-50/80 border border-cyan-200/70 rounded-xl p-3 text-center">
                <Award size={18} className="text-cyan-700 mx-auto mb-1" />
                <p className="text-lg font-bold text-cyan-900">{viewing.loyalty_points}</p>
                <p className="text-xs text-slate-500">puntos lealtad</p>
              </div>
              <div className="bg-sky-50/80 border border-sky-200/70 rounded-xl p-3 text-center">
                <Wallet size={18} className="text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-800">{formatCurrency(viewing.wallet_balance)}</p>
                <p className="text-xs text-slate-500">monedero</p>
              </div>
            </div>

            {viewing.birthdate && (
              <div className="text-sm text-slate-600">
                <span className="text-slate-400">Fecha de nacimiento:</span> {formatDate(viewing.birthdate)}
              </div>
            )}

            {viewing.notes && (
              <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">Notas del cliente</p>
                <p className="text-sm text-slate-700">{viewing.notes}</p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Compras recientes</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {customerSales.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Sin compras registradas</p>
                ) : (
                  customerSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="text-sm font-mono font-semibold text-blue-700">{sale.folio}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(sale.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(sale.total)}</p>
                        <p className="text-xs text-slate-400 capitalize">{sale.payment_method}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Puente consultorio */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope size={18} className="text-blue-600" />
                <h4 className="text-sm font-semibold text-slate-900">Puente consultorio → caja</h4>
              </div>
              <div className="rounded-xl bg-gradient-to-r from-[#071a35] to-[#0b2d5c] p-4 text-white">
                <p className="text-xs text-blue-100/80 mb-3">
                  Si el médico receta un producto, se puede enviar directo a caja para dispensar al paciente.
                </p>
                <button
                  onClick={() => setToast({ message: 'Receta del consultorio enviada a caja', type: 'info' })}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
                >
                  <Pill size={15} />
                  Enviar receta a caja
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {showForm && (
        <CustomerForm
          customer={editing}
          usingDummy={usingDummy}
          onClose={() => setShowForm(false)}
          onSaved={(savedCust) => {
            if (usingDummy && savedCust) {
              setCustomers((prev) =>
                editing
                  ? prev.map((c) => (c.id === savedCust.id ? savedCust : c))
                  : [savedCust, ...prev],
              );
            } else {
              load();
            }
            setShowForm(false);
            setToast({ message: editing ? 'Cliente actualizado' : 'Cliente creado', type: 'success' });
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

function CustomerForm({
  customer,
  usingDummy,
  onClose,
  onSaved,
}: {
  customer: Customer | null;
  usingDummy: boolean;
  onClose: () => void;
  onSaved: (saved?: Customer) => void;
}) {
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
    address: customer?.address ?? '',
    birthdate: customer?.birthdate ?? '',
    notes: customer?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const data = {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        birthdate: form.birthdate || null,
        notes: form.notes || null,
      };
      if (!usingDummy) {
        if (customer) {
          await database.from('customers').update(data).eq('id', customer.id);
        } else {
          await database.from('customers').insert(data);
        }
        onSaved();
      } else {
        onSaved({
          id: customer?.id ?? `cust-${Date.now()}`,
          ...data,
          wallet_balance: customer?.wallet_balance ?? 0,
          loyalty_points: customer?.loyalty_points ?? 0,
          created_at: customer?.created_at ?? new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={customer ? 'Editar cliente' : 'Nuevo cliente'} size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Nombre completo *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Teléfono</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="55-1234-5678" />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="cliente@email.com" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha de nacimiento</label>
            <input type="date" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Dirección</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Notas</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" rows={2} placeholder="Cliente crónico, alergias, etc." />
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={save}
            disabled={saving || !form.name}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}