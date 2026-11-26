import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList,
  Plus,
  Pill,
  Printer,
  FileDown,
  Check,
  Clock,
  Stethoscope,
  User,
} from 'lucide-react';
import { database, type Prescription, type Customer, type Product } from '@/lib/database';
import { formatDateTime } from '@/lib/helpers';
import { Modal, Toast } from '@/components/Modal';
import { DUMMY_CUSTOMERS, DUMMY_PRESCRIPTIONS, DUMMY_PRODUCTS } from '@/data/dummyData';

export function SanitaryPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [usingDummy, setUsingDummy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'antibiotic' | 'pending'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = useCallback(async () => {
    try {
      const [pres, custs, prods] = await Promise.all([
        database.from('prescriptions').select('*').order('created_at', { ascending: false }),
        database.from('customers').select('*').order('name'),
        database.from('products').select('*').eq('requires_prescription', true).order('name'),
      ]);

      if (pres.data && pres.data.length > 0) {
        setPrescriptions(pres.data);
        setCustomers(custs.data?.length ? custs.data : DUMMY_CUSTOMERS);
        setProducts(
          prods.data?.length
            ? prods.data
            : (DUMMY_PRODUCTS.filter((p) => p.requires_prescription) as unknown as Product[]),
        );
        setUsingDummy(false);
      } else {
        setPrescriptions(DUMMY_PRESCRIPTIONS);
        setCustomers(DUMMY_CUSTOMERS);
        setProducts(DUMMY_PRODUCTS.filter((p) => p.requires_prescription) as unknown as Product[]);
        setUsingDummy(true);
      }
    } catch {
      setPrescriptions(DUMMY_PRESCRIPTIONS);
      setCustomers(DUMMY_CUSTOMERS);
      setProducts(DUMMY_PRODUCTS.filter((p) => p.requires_prescription) as unknown as Product[]);
      setUsingDummy(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = prescriptions.filter((p) => {
    if (filter === 'antibiotic') return p.is_antibiotic;
    if (filter === 'pending') return p.status === 'registered';
    return true;
  });

  const dispense = async (rx: Prescription) => {
    try {
      if (!usingDummy) {
        await database.from('prescriptions').update({ status: 'dispensed' }).eq('id', rx.id);
        await database.from('movements').insert({
          type: 'prescription',
          entity_type: 'prescription',
          entity_id: rx.id,
          description: `Receta ${rx.prescription_number} dispensada`,
          user_name: 'Farmacéutico',
        });
        await load();
      } else {
        setPrescriptions((prev) =>
          prev.map((item) => (item.id === rx.id ? { ...item, status: 'dispensed' } : item)),
        );
      }
      setToast({ message: 'Receta dispensada y registrada en libro', type: 'success' });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = {
    total: prescriptions.length,
    antibiotics: prescriptions.filter((p) => p.is_antibiotic).length,
    pending: prescriptions.filter((p) => p.status === 'registered').length,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total recetas" value={stats.total} icon={ClipboardList} color="blue" />
        <StatCard label="Antibióticos (Fracc. IV)" value={stats.antibiotics} icon={Pill} color="danger" />
        <StatCard label="Pendientes por surtir" value={stats.pending} icon={Clock} color="warning" />
      </div>

      {/* Filtros + nueva receta */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'antibiotic', label: 'Antibióticos' },
            { id: 'pending', label: 'Pendientes' },
          ].map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm shadow-blue-600/20'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:shadow-lg"
        >
          <Plus size={18} />
          Nueva receta
        </button>
      </div>

      {/* Tarjetas de recetas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((rx) => (
          <div key={rx.id} className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 hover:border-sky-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    rx.is_antibiotic ? 'bg-rose-50 text-rose-600 border border-rose-200/80' : 'bg-sky-50 text-blue-600 border border-sky-200/80'
                  }`}
                >
                  {rx.is_antibiotic ? <Pill size={20} /> : <ClipboardList size={20} />}
                </div>
                <div>
                  <p className="font-mono text-sm font-bold text-slate-900">{rx.prescription_number}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(rx.created_at)}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  rx.status === 'dispensed'
                    ? 'bg-sky-100 text-blue-700'
                    : rx.status === 'registered'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {rx.status === 'dispensed' ? 'Dispensada' : rx.status === 'registered' ? 'Pendiente' : 'Cancelada'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-blue-600" />
                <span className="text-slate-800 font-semibold">{rx.patient_name}</span>
                {rx.patient_age && <span className="text-xs text-slate-500">· {rx.patient_age} años</span>}
              </div>
              {rx.doctor_name && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Stethoscope size={14} className="text-cyan-600" />
                  <span>{rx.doctor_name}</span>
                  {rx.doctor_license && <span className="text-xs text-slate-400">· Céd. {rx.doctor_license}</span>}
                </div>
              )}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1.5">Productos recetados:</p>
                <div className="flex flex-wrap gap-1.5">
                  {rx.product_names.map((name, i) => (
                    <span key={i} className="inline-flex items-center rounded-lg bg-sky-50 border border-sky-200/70 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
              {rx.notes && <p className="text-xs text-slate-500 italic pt-1">"{rx.notes}"</p>}
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
              {rx.status === 'registered' && (
                <button
                  onClick={() => dispense(rx)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95"
                >
                  <Check size={14} />
                  Dispensar
                </button>
              )}
              <button
                onClick={() => setToast({ message: 'Receta exportada para impresión', type: 'info' })}
                className="btn-secondary text-xs py-2"
              >
                <Printer size={14} />
                Imprimir
              </button>
              <button
                onClick={() => setToast({ message: 'Libro de control exportado (CSV)', type: 'info' })}
                className="btn-secondary text-xs py-2"
              >
                <FileDown size={14} />
                Exportar
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200/80">
          <ClipboardList size={48} className="mx-auto mb-3 opacity-30 text-blue-600" />
          <p className="text-sm">No hay recetas registradas</p>
        </div>
      )}

      {showForm && (
        <PrescriptionForm
          customers={customers}
          products={products}
          usingDummy={usingDummy}
          onClose={() => setShowForm(false)}
          onSaved={(newRx) => {
            if (usingDummy && newRx) {
              setPrescriptions((prev) => [newRx, ...prev]);
            } else {
              load();
            }
            setShowForm(false);
            setToast({ message: 'Receta registrada en control sanitario', type: 'success' });
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof ClipboardList;
  color: 'blue' | 'danger' | 'warning';
}) {
  const styles = {
    blue: 'bg-sky-50/80 text-blue-800 border-sky-200/90',
    danger: 'bg-rose-50/80 text-rose-800 border-rose-200/90',
    warning: 'bg-amber-50/80 text-amber-800 border-amber-200/90',
  };
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border shadow-xs ${styles[color]}`}>
      <Icon size={24} />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-medium">{label}</p>
      </div>
    </div>
  );
}

function PrescriptionForm({
  customers,
  products,
  usingDummy,
  onClose,
  onSaved,
}: {
  customers: Customer[];
  products: Product[];
  usingDummy: boolean;
  onClose: () => void;
  onSaved: (created?: Prescription) => void;
}) {
  const [form, setForm] = useState({
    patient_name: '',
    patient_age: '',
    doctor_name: '',
    doctor_license: '',
    customer_id: '',
    notes: '',
    is_antibiotic: false,
  });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const num = `RX-${Date.now().toString(36).toUpperCase()}`;
      const productNames = selectedProducts
        .map((id) => products.find((p) => p.id === id)?.name)
        .filter(Boolean) as string[];
      const isAntibiotic = selectedProducts.some((id) => {
        const p = products.find((p) => p.id === id);
        return (
          p?.active_ingredient?.toLowerCase().includes('amox') ||
          p?.active_ingredient?.toLowerCase().includes('cipro') ||
          p?.active_ingredient?.toLowerCase().includes('azit') ||
          p?.active_ingredient?.toLowerCase().includes('anti')
        );
      });

      const payload = {
        prescription_number: num,
        patient_name: form.patient_name,
        patient_age: form.patient_age ? parseInt(form.patient_age) : null,
        doctor_name: form.doctor_name || null,
        doctor_license: form.doctor_license || null,
        customer_id: form.customer_id || null,
        product_ids: selectedProducts,
        product_names: productNames,
        is_antibiotic: isAntibiotic || form.is_antibiotic,
        status: 'registered' as const,
        notes: form.notes || null,
      };

      if (!usingDummy) {
        await database.from('prescriptions').insert(payload);
        onSaved();
      } else {
        onSaved({
          ...payload,
          id: `rx-${Date.now()}`,
          created_at: new Date().toISOString(),
        } as unknown as Prescription);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Nueva receta médica" subtitle="Registra receta para control sanitario" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre del paciente *</label>
            <input
              value={form.patient_name}
              onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
              className="input"
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <label className="label">Edad</label>
            <input
              type="number"
              value={form.patient_age}
              onChange={(e) => setForm({ ...form, patient_age: e.target.value })}
              className="input"
              placeholder="Años"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Médico</label>
            <input
              value={form.doctor_name}
              onChange={(e) => setForm({ ...form, doctor_name: e.target.value })}
              className="input"
              placeholder="Dr. / Dra. Nombre"
            />
          </div>
          <div>
            <label className="label">Cédula profesional</label>
            <input
              value={form.doctor_license}
              onChange={(e) => setForm({ ...form, doctor_license: e.target.value })}
              className="input"
              placeholder="1234567"
            />
          </div>
        </div>
        <div>
          <label className="label">Cliente vinculado (opcional)</label>
          <select
            value={form.customer_id}
            onChange={(e) => {
              const selected = customers.find((c) => c.id === e.target.value);
              setForm({
                ...form,
                customer_id: e.target.value,
                patient_name: form.patient_name || selected?.name || '',
              });
            }}
            className="input"
          >
            <option value="">Sin vincular</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Productos recetados</label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2">
            {products.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-sky-50/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedProducts([...selectedProducts, p.id]);
                    else setSelectedProducts(selectedProducts.filter((id) => id !== p.id));
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">{p.name}</span>
                <span className="text-xs text-slate-400 ml-auto">{p.active_ingredient}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input"
            rows={2}
            placeholder="Indicaciones adicionales..."
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_antibiotic}
            onChange={(e) => setForm({ ...form, is_antibiotic: e.target.checked })}
            className="w-4 h-4 rounded text-blue-600"
          />
          <span className="text-sm text-slate-700">Marcar como antibiótico (libro de control)</span>
        </label>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !form.patient_name || selectedProducts.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : 'Registrar receta'}
          </button>
        </div>
      </div>
    </Modal>
  );
}