import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const adminNav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/bookings', label: 'Bookings', icon: '📅' },
  { to: '/menu', label: 'Menu', icon: '🍽️' },
  { to: '/invoices', label: 'Invoices', icon: '💰' },
  { to: '/staff', label: 'Staff', icon: '👥' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/calendar', label: 'Calendar', icon: '🗓️' },
  { to: '/messages', label: 'Messages', icon: '💬' },
];

const clientNav = [
  { to: '/dashboard', label: 'My Events', icon: '📅' },
  { to: '/bookings/new', label: 'New Booking', icon: '➕' },
  { to: '/menu', label: 'Menu', icon: '🍽️' },
  { to: '/invoices', label: 'Invoices', icon: '💰' },
  { to: '/messages', label: 'Messages', icon: '💬' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const nav = user?.role === 'admin' ? adminNav : clientNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile header */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-600 p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <Link to="/dashboard" className="text-xl font-bold text-primary-600">Catering Pro</Link>
        <div className="w-10" />
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white border-r shadow-sm transition-transform duration-200 flex flex-col`}>
        <div className="p-5 border-b hidden lg:block">
          <Link to="/dashboard" className="text-2xl font-bold text-primary-600">Catering Pro</Link>
          <p className="text-xs text-gray-500 mt-1">Event Management System</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
