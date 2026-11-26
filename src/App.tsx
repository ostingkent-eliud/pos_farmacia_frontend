import { useState } from 'react';
import {
  ShoppingCart,
  Package,
  Truck,
  ClipboardList,
  Users,
  BarChart3,
  Menu,
  X,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Login } from './pages/Login';
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
  { id: 'pos', label: 'Caja', icon: ShoppingCart, description: 'Punto de venta' },
  { id: 'products', label: 'Productos', icon: Package, description: 'Inventario y caducidades' },
  { id: 'purchases', label: 'Compras', icon: Truck, description: 'Surtido y proveedores' },
  { id: 'sanitary', label: 'Control Sanitario', icon: ClipboardList, description: 'Recetas y antibióticos' },
  { id: 'customers', label: 'Clientes', icon: Users, description: 'Clientes y consultorio' },
  { id: 'reports', label: 'Mi Negocio', icon: BarChart3, description: 'Reportes y KPIs' },
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageId>('pos');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentPage('pos');
  };

  const handleLogout = () => {
    setSidebarOpen(false);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const currentNav = NAV_ITEMS.find((n) => n.id === currentPage)!;

  return (
    <div className="aprobasoft-pos flex h-screen overflow-hidden bg-slate-50/90 text-slate-900">
      {/* Sidebar - Desktop (colapsable) */}
      <aside
        className={`relative hidden lg:flex flex-col bg-[#071a35] text-white shrink-0 border-r border-slate-800/80 transition-all duration-200 ease-in-out ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_45%)]" />

        {/* Botón flotante para contraer/expandir en escritorio */}
        <button
          type="button"
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
          aria-label={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
          className="z-20 absolute -right-3.5 top-6 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-[#0b2d5c] text-cyan-200 shadow-md transition hover:scale-105 hover:bg-blue-600 hover:text-white"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>

        <SidebarContent
          currentPage={currentPage}
          collapsed={sidebarCollapsed}
          onNavigate={setCurrentPage}
          onLogout={handleLogout}
        />
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-[#071a35]/60 backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-[#071a35] text-white animate-slide-in">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 z-20 p-1.5 rounded-lg text-blue-200/70 hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent
              currentPage={currentPage}
              collapsed={false}
              onNavigate={(p) => {
                setCurrentPage(p);
                setSidebarOpen(false);
              }}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200/90 px-4 lg:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-sky-50 hover:text-blue-700"
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                {currentNav.label}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                {currentNav.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">Christian López</p>
              <p className="text-xs text-slate-400">
                {new Date().toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center font-semibold text-sm shadow-sm shadow-blue-600/20">
              CL
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-sky-50 transition-colors"
            >
              <LogOut size={18} />
            </button>
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
  collapsed,
  onNavigate,
  onLogout,
}: {
  currentPage: PageId;
  collapsed: boolean;
  onNavigate: (page: PageId) => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div
        className={`relative z-10 py-5 flex items-center border-b border-white/10 transition-all ${
          collapsed ? 'justify-center px-2' : 'gap-3 px-5'
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <img src="/Logo_SinFondo.png" alt="AprobaSoft" className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <p className="font-bold text-white text-sm tracking-tight">
              Farma<span className="text-cyan-300">POS</span>
            </p>
            <p className="text-xs text-blue-100/60">Sistema de Farmacia</p>
          </div>
        )}
      </div>

      <nav className="relative z-10 flex-1 px-2.5 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl text-sm font-medium transition-all ${
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
              } ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-950/40'
                  : 'text-blue-100/75 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              <Icon
                size={20}
                className={`shrink-0 ${active ? 'text-white' : 'text-cyan-300/75'}`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div
        className={`relative z-10 py-3.5 border-t border-white/10 flex items-center ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}
      >
        {!collapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <p className="text-xs font-medium text-blue-100/80">FarmaPOS v1.0</p>
            <p className="text-[11px] text-blue-100/50 mt-0.5">AprobaSoft Suite</p>
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          title="Salir"
          className={`inline-flex items-center rounded-lg text-xs font-medium text-blue-100/75 hover:bg-white/10 hover:text-white transition-colors ${
            collapsed ? 'p-2' : 'gap-1.5 px-2.5 py-1.5'
          }`}
        >
          <LogOut size={15} className="shrink-0" />
          {!collapsed && <span>Salir</span>}
        </button>
      </div>
    </>
  );
}

export default App;