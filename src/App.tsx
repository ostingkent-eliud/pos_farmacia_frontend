import { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Package,
  Truck,
  ClipboardList,
  Users,
  BarChart3,
  Pill,
  Menu,
  X,
} from 'lucide-react';
import { PosPage } from './pages/PosPage';
import { ProductsPage } from './pages/ProductsPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { SanitaryPage } from './pages/SanitaryPage';
import { CustomersPage } from './pages/CustomersPage';
import { ReportsPage } from './pages/ReportsPage';

type PageId = 'pos' | 'products' | 'purchases' | 'sanitary' | 'customers' | 'reports';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof ShoppingCart;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'pos', label: 'Vender (Caja)', icon: ShoppingCart, description: 'Punto de venta' },
  { id: 'products', label: 'Productos', icon: Package, description: 'Inventario y caducidades' },
  { id: 'purchases', label: 'Compras', icon: Truck, description: 'Surtido y proveedores' },
  { id: 'sanitary', label: 'Control Sanitario', icon: ClipboardList, description: 'Recetas y antibióticos' },
  { id: 'customers', label: 'Clientes', icon: Users, description: 'Clientes y consultorio' },
  { id: 'reports', label: 'Mi Negocio', icon: BarChart3, description: 'Reportes y KPIs' },
];

function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('pos');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentNav = NAV_ITEMS.find((n) => n.id === currentPage)!;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-white shrink-0">
        <SidebarContent currentPage={currentPage} onNavigate={setCurrentPage} />
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-slate-900 text-white animate-slide-in">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
            >
              <X size={20} />
            </button>
            <SidebarContent
              currentPage={currentPage}
              onNavigate={(p) => {
                setCurrentPage(p);
                setSidebarOpen(false);
              }}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{currentNav.label}</h1>
              <p className="text-xs text-slate-500 hidden sm:block">{currentNav.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700">Farmacia Demo</p>
              <p className="text-xs text-slate-400">
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
              FD
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {currentPage === 'pos' && <PosPage />}
          {currentPage === 'products' && <ProductsPage />}
          {currentPage === 'purchases' && <PurchasesPage />}
          {currentPage === 'sanitary' && <SanitaryPage />}
          {currentPage === 'customers' && <CustomersPage />}
          {currentPage === 'reports' && <ReportsPage />}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  currentPage,
  onNavigate,
}: {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <>
      <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
          <Pill size={22} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">FarmaPOS</p>
          <p className="text-xs text-slate-400">Sistema de Farmacia</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} className={active ? 'text-white' : 'text-slate-400'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-slate-800">
        <p className="text-xs text-slate-500">FarmaPOS v1.0</p>
        <p className="text-xs text-slate-500 mt-0.5">AprobaSoft Suite</p>
      </div>
    </>
  );
}

export default App;
