import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Clock,
  User,
  PauseCircle,
  Keyboard,
  Receipt,
  Package,
  BarChart3,
  Users,
  Settings as SettingsIcon,
  CircleDot,
  DollarSign,
  Sparkles,
  RotateCcw,
  Lock,
  LogOut,
  ChevronDown,
  Shield,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { usePOS } from '../context/POSContext';
import { HeldOrdersModal } from './HeldOrdersModal';
import { ShortcutsModal } from './ShortcutsModal';
import { SettingsModal } from './SettingsModal';

export const Header: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const {
    activeView,
    setActiveView,
    heldOrders,
    settings,
    updateSettings,
    cart,
    openGeminiCopilot,
    resetToRetailDefaults,
    activeEmployee,
    employees,
    lockScreen,
    setIsEmployeeManagementOpen,
    setIsShiftModalOpen,
    quickSwitchEmployee,
  } = usePOS();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut listener: Alt + L to lock screen, Alt + T theme
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        lockScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lockScreen]);

  // Click outside to close user menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'pos', label: 'Kasir POS', icon: Monitor, shortcut: 'F1' },
    { id: 'transactions', label: 'Riwayat Transaksi', icon: Receipt, shortcut: '' },
    { id: 'inventory', label: 'Stok & FEFO', icon: Package, shortcut: '' },
    { id: 'customers', label: 'Member & CRM', icon: Users, shortcut: '' },
    { id: 'reports', label: 'Laporan Penjualan', icon: BarChart3, shortcut: '' },
  ] as const;

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner':
        return { label: 'Owner', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' };
      case 'supervisor':
        return { label: 'Supervisor', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' };
      case 'inventory':
        return { label: 'Gudang', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
      case 'cashier':
      default:
        return { label: 'Kasir', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
    }
  };

  const badge = getRoleBadge(activeEmployee?.role);

  return (
    <>
      <header
        id="pos-main-header"
        className="h-16 px-4 border-b flex items-center justify-between transition-colors duration-200 select-none
          bg-white text-slate-800 border-slate-200 
          dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800"
      >
        {/* Left Branding & Branch */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center font-black text-slate-950 shadow-md shadow-emerald-500/20 text-base">
              N
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                  {settings.storeName || 'NexaMart Ritel'}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border dark:border-emerald-800/50 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Ritel Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal truncate max-w-[200px]">
                {settings.branchName}
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden md:block" />

          {/* Navigation View Pills */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => setActiveView(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-emerald-400 dark:bg-slate-800 dark:text-emerald-400 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.id === 'pos' && cart.length > 0 && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] flex items-center justify-center font-bold">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Tools, Shortcuts, Theme Switcher & User Profile */}
        <div className="flex items-center space-x-2.5">
          {/* GEMINI AI COPILOT HERO BUTTON */}
          <button
            id="btn-open-gemini-copilot"
            onClick={() => openGeminiCopilot('upsell')}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            title="Buka Asisten AI Gemini Ritel Copilot"
          >
            <Sparkles className="w-4 h-4 fill-current animate-pulse" />
            <span className="tracking-tight">Gemini AI</span>
            <span className="hidden sm:inline text-[10px] font-extrabold bg-slate-950/20 px-1.5 py-0.2 rounded-md">
              Copilot
            </span>
          </button>

          {/* Mobile view switch dropdown */}
          <div className="lg:hidden">
            <select
              value={activeView}
              onChange={(e) => setActiveView(e.target.value as any)}
              className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-800"
            >
              <option value="pos">Kasir POS</option>
              <option value="transactions">Riwayat Transaksi</option>
              <option value="inventory">Stok & FEFO</option>
              <option value="customers">Member CRM</option>
              <option value="reports">Laporan Penjualan</option>
            </select>
          </div>

          {/* Held Orders Quick Access */}
          <button
            id="btn-open-held-orders"
            onClick={() => setIsHeldModalOpen(true)}
            className={`relative px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              heldOrders.length > 0
                ? 'border-amber-400/80 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:border-amber-700/70 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Lihat Pesanan Tertunda / Parkir (F4)"
          >
            <PauseCircle className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Parkir</span>
            {heldOrders.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center animate-pulse">
                {heldOrders.length}
              </span>
            )}
          </button>

          {/* Currency Toggle (IDR / USD) */}
          <button
            id="btn-toggle-currency"
            onClick={() => updateSettings({ currency: settings.currency === 'IDR' ? 'USD' : 'IDR' })}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
            title="Ubah Mata Uang (IDR / USD)"
          >
            <span className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-black flex items-center justify-center text-slate-800 dark:text-slate-200">
              {settings.currency === 'IDR' ? 'Rp' : '$'}
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400">{settings.currency}</span>
          </button>

          {/* Shortcuts Cheat Sheet */}
          <button
            id="btn-open-shortcuts"
            onClick={() => setIsShortcutsOpen(true)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tombol Pintas Keyboard"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Settings Modal Trigger */}
          <button
            id="btn-open-settings"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Pengaturan Toko Ritel & Struk"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* THEME TOGGLE: Styled matching Professional Polish pattern */}
          <div className="flex items-center pl-1 border-l border-slate-200 dark:border-slate-800">
            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-full border border-slate-300 dark:border-slate-800">
              <button
                type="button"
                id="theme-light-btn"
                onClick={() => isDark && toggleTheme()}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  !isDark
                    ? 'bg-white text-amber-500 shadow-md ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Light Mode (Alt+T)"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="theme-dark-btn"
                onClick={() => !isDark && toggleTheme()}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 text-emerald-400 shadow-lg'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Dark Mode (Alt+T)"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Live Digital Clock */}
          <div className="hidden xl:flex items-center pl-2 border-l border-slate-200 dark:border-slate-800 text-right">
            <div className="text-xs">
              <div className="font-mono font-medium text-slate-900 dark:text-slate-300 flex items-center justify-end gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                {currentTime}
              </div>
              <div className="text-[11px] text-slate-500">
                {currentDate}
              </div>
            </div>
          </div>

          {/* Active Employee Profile & Quick Menu Dropdown */}
          <div className="relative pl-1 md:pl-2" ref={userMenuRef}>
            <button
              id="btn-employee-menu"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1 transition cursor-pointer"
              title="Menu Karyawan & Ganti Kasir"
            >
              <div
                className={`w-7 h-7 rounded-lg ${
                  activeEmployee?.avatarColor || 'bg-emerald-600'
                } text-white font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0`}
              >
                {activeEmployee?.avatar || 'KR'}
              </div>
              <div className="text-left text-xs hidden sm:block">
                <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[110px]">
                  {activeEmployee?.name || 'Kasir'}
                </p>
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] font-bold px-1 rounded ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeEmployee?.employeeCode || 'EMP-01'}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden text-xs">
                {/* Active user header */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl ${
                        activeEmployee?.avatarColor || 'bg-emerald-600'
                      } text-white font-bold text-sm flex items-center justify-center shadow-sm`}
                    >
                      {activeEmployee?.avatar || 'KR'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {activeEmployee?.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {activeEmployee?.roleTitle || activeEmployee?.role} • {activeEmployee?.assignedShift}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="p-1.5 space-y-0.5">
                  <button
                    id="menu-item-lock-screen"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      lockScreen();
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <Lock className="w-4 h-4 text-amber-500" />
                      <span>Ganti Kasir / Kunci Layar</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-mono">
                      Alt+L
                    </kbd>
                  </button>

                  <button
                    id="menu-item-shift-report"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsShiftModalOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
                  >
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span>Rekap & Tutup Shift Kasir</span>
                  </button>

                  <button
                    id="menu-item-manage-employees"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsEmployeeManagementOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
                  >
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>Kelola Master Karyawan</span>
                  </button>
                </div>

                {/* Fast Switch List */}
                <div className="p-2 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 px-1">
                    Ganti Karyawan Cepat:
                  </span>
                  <div className="space-y-1">
                    {employees
                      .filter((e) => e.isActive && e.id !== activeEmployee?.id)
                      .slice(0, 3)
                      .map((emp) => (
                        <button
                          key={emp.id}
                          onClick={() => {
                            quickSwitchEmployee(emp);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-2 py-1 rounded-lg flex items-center justify-between text-left text-[11px] text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`w-2 h-2 rounded-full ${emp.avatarColor}`} />
                            <span className="truncate">{emp.name}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono">{emp.employeeCode}</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Logout action */}
                <div className="p-1.5 border-t border-slate-200 dark:border-slate-800">
                  <button
                    id="menu-item-logout"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      lockScreen();
                    }}
                    className="w-full px-3 py-1.5 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Kunci / Logout Akun</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      {isHeldModalOpen && <HeldOrdersModal isOpen={isHeldModalOpen} onClose={() => setIsHeldModalOpen(false)} />}
      {isShortcutsOpen && <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />}
      {isSettingsOpen && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
    </>
  );
};
