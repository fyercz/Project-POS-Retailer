import React from 'react';
import { ShoppingBag, Receipt, Package, Users, BarChart3, Lock } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { ViewType } from '../types';
import { isViewAllowed } from '../utils/permissions';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'pos', label: 'Kasir', icon: ShoppingBag },
  { id: 'transactions', label: 'Riwayat', icon: Receipt },
  { id: 'inventory', label: 'Stok', icon: Package },
  { id: 'customers', label: 'Member', icon: Users },
  { id: 'reports', label: 'Laporan', icon: BarChart3 },
];

export const MobileBottomNav: React.FC = () => {
  const { activeView, setActiveView, cart, activeEmployee } = usePOS();

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Navigasi Bawah Mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 safe-area-bottom shadow-lg"
    >
      <div className="grid grid-cols-5 h-14 items-stretch">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const isAllowed = isViewAllowed(activeEmployee?.role, item.id);

          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => setActiveView(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 transition-all select-none cursor-pointer ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
              }`}
            >
              {/* Active Indicator Top Bar */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-500 rounded-b-full shadow-xs" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />

                {/* Cart Badge */}
                {item.id === 'pos' && totalCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 min-w-[16px] h-4 rounded-full bg-emerald-500 text-slate-950 font-mono font-black text-[9px] flex items-center justify-center shadow-xs">
                    {totalCartCount > 99 ? '99+' : totalCartCount}
                  </span>
                )}

                {/* Lock Badge if permission restricted */}
                {!isAllowed && (
                  <span className="absolute -bottom-1 -right-1.5 p-0.5 rounded-full bg-amber-500 text-slate-950 shadow-xs">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>

              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full px-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
