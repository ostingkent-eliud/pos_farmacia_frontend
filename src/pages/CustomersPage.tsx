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

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
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
      if (error) throw error;
      setCustomers(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const viewCustomer = async (customer: Customer) => {
    setViewing(customer);
    const { data } = await database
      .from('sales')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setCustomerSales(data ?? []);
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(search) || (c.email ?? '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
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
            className="input pl-11"
          />
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus size={18} />
          Nuevo cliente
        </button>
      </div>

      {/* Customer grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((customer) => (
          <div key={customer.id} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm shrink-0">
                {customer.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{customer.name}</p>
                {customer.phone && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone size={12} />
                    {customer.phone}
                  </p>
                )}
                {customer.email && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                    <Mail size={12} />
                    {customer.email}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-accent-50 rounded-lg p-2 text-center">
                <Award size={16} className="text-accent-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-accent-700">{customer.loyalty_points}</p>
                <p className="text-[10px] text-slate-500">puntos</p>
              </div>
              <div className="bg-primary-50 rounded-lg p-2 text-center">
                <Wallet size={16} className="text-primary-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-primary-700">{formatCurrency(customer.wallet_balance)}</p>
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
        <div className="text-center py-16 text-slate-400">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No se encontraron clientes</p>
        </div>
      )}

      {/* Customer detail modal */}
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
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <ShoppingBag size={18} className="text-slate-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-900">{customerSales.length}</p>
                <p className="text-xs text-slate-500">compras</p>
              </div>
              <div className="bg-accent-50 rounded-lg p-3 text-center">
                <Award size={18} className="text-accent-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-accent-700">{viewing.loyalty_points}</p>
                <p className="text-xs text-slate-500">puntos lealtad</p>
              </div>
              <div className="bg-primary-50 rounded-lg p-3 text-center">
                <Wallet size={18} className="text-primary-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-primary-700">{formatCurrency(viewing.wallet_balance)}</p>
                <p className="text-xs text-slate-500">monedero</p>
              </div>
            </div>

            {viewing.birthdate && (
              <div className="text-sm text-slate-600">
                <span className="text-slate-400">Fecha de nacimiento:</span> {formatDate(viewing.birthdate)}
              </div>
            )}

            {viewing.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-xs font-medium text-amber-700 mb-1">Notas del cliente</p>
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
                    <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <div>
                        <p className="text-sm font-mono font-medium text-slate-900">{sale.folio}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(sale.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">{formatCurrency(sale.total)}</p>
                        <p className="text-xs text-slate-400 capitalize">{sale.payment_method}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Consultorio bridge */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope size={18} className="text-primary-600" />
                <h4 className="text-sm font-semibold text-slate-900">Puente consultorio → caja</h4>
              </div>
              <div className="bg-primary-50 rounded-xl p-4">
                <p className="text-xs text-slate-600 mb-3">
                  Si el médico receta un producto, se puede enviar directo a caja para dispensar al paciente.
                </p>
                <button
                  onClick={() => setToast({ message: 'Receta del consultorio enviada a caja', type: 'info' })}
                  className="btn-primary text-sm py-2"
                >
                  <Pill size={16} />
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
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
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
  onClose,
  onSaved,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
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
      if (customer) {
        await database.from('customers').update(data).eq('id', customer.id);
      } else {
        await database.from('customers').insert(data);
      }
      onSaved();
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
          <button onClick={save} disabled={saving || !form.name} className="btn-primary">
            {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
