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
  ScanBarcode,
  Database,
  Laptop,
  BookOpen,
  Network,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  usePOSCatalog,
  usePOSCart,
  usePOSTransactions,
  usePOSAuthShift,
  usePOSUI,
} from '../context/POSContext';
import { HeldOrdersModal } from './HeldOrdersModal';
import { ShortcutsModal } from './ShortcutsModal';
import { SettingsModal } from './SettingsModal';
import { DesktopAppModal } from './DesktopAppModal';
import { UserManualModal } from './UserManualModal';
import { LANServerModal } from './LANServerModal';
import { OfflineSyncBadge } from './OfflineSyncBadge';
import { AuthorityModal } from './AuthorityModal';
import { isViewAllowed } from '../utils/permissions';
import { isDesktopApp } from '../utils/desktopHelper';

export const Header: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { products, resetToRetailDefaults } = usePOSCatalog();
  const { heldOrders, cart, recallHeldOrder } = usePOSCart();
  const { transactions, customers, suppliers } = usePOSTransactions();
  const {
    activeEmployee,
    employees,
    lockScreen,
    setIsEmployeeManagementOpen,
    setIsShiftModalOpen,
    quickSwitchEmployee,
  } = usePOSAuthShift();
  const {
    activeView,
    setActiveView,
    settings,
    updateSettings,
    openGeminiCopilot,
    setIsBarcodeScannerOpen,
    setIsBackupRestoreOpen,
    applyMasterLANData,
    isLANModalOpen,
    setIsLANModalOpen,
    setActiveCustomersTab,
  } = usePOSUI();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDesktop(isDesktopApp());
  }, []);

  // Authority verification prompt for restricted actions
  const [authorityModalConfig, setAuthorityModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    requiredRole: 'supervisor' | 'owner';
    onSuccess: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    requiredRole: 'supervisor',
    onSuccess: () => {},
  });

  const handleOpenSettings = () => {
    if (activeEmployee?.role !== 'owner') {
      setAuthorityModalConfig({
        isOpen: true,
        title: 'Pengaturan Toko & Struk',
        description:
          'Konfigurasi sistem toko, printer struk, dan persentase pajak dibatasi untuk Pemilik Toko (Owner). Masukkan PIN Owner untuk otorisasi.',
        requiredRole: 'owner',
        onSuccess: () => setIsSettingsOpen(true),
      });
    } else {
      setIsSettingsOpen(true);
    }
  };

  const handleOpenEmployeeManagement = () => {
    if (activeEmployee?.role !== 'owner' && activeEmployee?.role !== 'supervisor') {
      setAuthorityModalConfig({
        isOpen: true,
        title: 'Kelola Master Karyawan & PIN',
        description:
          'Manajemen akun staf, jabatan, dan hak akses dibatasi untuk Supervisor atau Owner. Masukkan PIN otoritas untuk melanjutkan.',
        requiredRole: 'supervisor',
        onSuccess: () => setIsEmployeeManagementOpen(true),
      });
    } else {
      setIsEmployeeManagementOpen(true);
    }
  };

  const handleOpenBackupRestore = () => {
    if (activeEmployee?.role !== 'owner' && activeEmployee?.role !== 'supervisor') {
      setAuthorityModalConfig({
        isOpen: true,
        title: 'Pusat Cadangan & Titik Pemulihan',
        description:
          'Akses pencadangan dan pemulihan data (Restore Point) dibatasi untuk Supervisor atau Pemilik Toko (Owner). Masukkan PIN otoritas untuk melanjutkan.',
        requiredRole: 'supervisor',
        onSuccess: () => setIsBackupRestoreOpen(true),
      });
    } else {
      setIsBackupRestoreOpen(true);
    }
  };

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

  // Keyboard shortcut listener: Alt + L to lock screen, Alt + T theme, F9 or Alt + B for Backup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        lockScreen();
      }
      if (e.key === 'F9' || (e.altKey && (e.key === 'b' || e.key === 'B'))) {
        e.preventDefault();
        handleOpenBackupRestore();
      }
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setIsDesktopModalOpen((prev) => !prev);
      }
      if (e.key === 'F1' || (e.altKey && (e.key === 'h' || e.key === 'H'))) {
        e.preventDefault();
        setIsManualModalOpen((prev) => !prev);
      }
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setIsLANModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lockScreen, activeEmployee]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'pos', label: 'Kasir', icon: Monitor, shortcut: 'F1' },
    { id: 'transactions', label: 'Riwayat Nota', icon: Receipt, shortcut: '' },
    { id: 'inventory', label: 'Katalog & Stok', icon: Package, shortcut: '' },
    { id: 'customers', label: 'Member & Poin', icon: Users, shortcut: '' },
    { id: 'reports', label: 'Laporan & Omzet', icon: BarChart3, shortcut: '' },
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
        className="h-16 px-3 md:px-4 border-b flex items-center justify-between transition-colors duration-200 select-none
          bg-white text-slate-800 border-slate-200 
          dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800"
      >
        {/* Left Branding & Branch */}
        <div className="flex items-center space-x-2 md:space-x-3 min-w-0 shrink">
          <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center font-black text-slate-950 shadow-md shadow-emerald-500/20 text-base">
              U
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm md:text-base tracking-tight text-slate-900 dark:text-white truncate">
                  {settings.storeName || 'Ulilmart Ritel'}
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border dark:border-emerald-800/50 items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Ritel Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate max-w-[130px] md:max-w-[180px]">
                {settings.branchName}
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden lg:block" />

          {/* Navigation View Segmented Tabs (visible on lg and up) */}
          <nav className="hidden lg:flex items-center p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 gap-1 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const isAllowed = isViewAllowed(activeEmployee?.role, item.id);
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => setActiveView(item.id)}
                  title={
                    !isAllowed
                      ? `Menu dibatasi untuk jabatan ${activeEmployee?.roleTitle || 'ini'} (Klik untuk otorisasi PIN)`
                      : item.label
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                      : !isAllowed
                      ? 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50 font-medium'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700/60 font-medium'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {!isAllowed && (
                    <Lock className="w-3 h-3 text-amber-500/80 shrink-0" />
                  )}
                  {item.id === 'pos' && cart.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] flex items-center justify-center font-black leading-none">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Navigation Dropdown on medium / tablet screens */}
          <div className="hidden md:block lg:hidden shrink-0">
            <select
              id="mobile-nav-select"
              value={activeView}
              onChange={(e) => {
                if (e.target.value === 'marketing') {
                  setActiveView('customers');
                  setActiveCustomersTab('marketing');
                } else {
                  setActiveView(e.target.value as any);
                }
              }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 cursor-pointer shadow-xs focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="pos">
                🛒 Kasir {!isViewAllowed(activeEmployee?.role, 'pos') ? '🔒 (Perlu SPV/Owner)' : ''}
              </option>
              <option value="transactions">
                🧾 Riwayat Nota {!isViewAllowed(activeEmployee?.role, 'transactions') ? '🔒 (Perlu SPV/Owner)' : ''}
              </option>
              <option value="inventory">
                📦 Katalog & Stok {!isViewAllowed(activeEmployee?.role, 'inventory') ? '🔒 (Perlu Gudang/SPV)' : ''}
              </option>
              <option value="customers">
                ✨ Member & Poin {!isViewAllowed(activeEmployee?.role, 'customers') ? '🔒 (Perlu SPV/Owner)' : ''}
              </option>
              <option value="marketing">
                📢 Promo AI Marketing {!isViewAllowed(activeEmployee?.role, 'customers') ? '🔒 (Perlu SPV/Owner)' : ''}
              </option>
              <option value="reports">
                📊 Laporan & Omzet {!isViewAllowed(activeEmployee?.role, 'reports') ? '🔒 (Perlu SPV/Owner)' : ''}
              </option>
            </select>
          </div>
        </div>

        {/* Right Tools, Shortcuts, Theme Switcher & User Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 ml-auto">
          {/* GEMINI AI COPILOT HERO BUTTON - Desktop/Tablet */}
          <button
            id="btn-open-gemini-copilot"
            onClick={() => openGeminiCopilot('upsell')}
            className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
            title="Buka Asisten AI Gemini Ritel Copilot"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" />
            <span className="tracking-tight hidden xs:inline">Gemini AI</span>
          </button>

          {/* Cloud & Offline Background Sync Badge */}
          <div className="hidden sm:block shrink-0">
            <OfflineSyncBadge />
          </div>

          {/* Barcode Camera Scanner - Useful on both Mobile & Desktop */}
          <button
            id="btn-header-open-scanner"
            onClick={() => setIsBarcodeScannerOpen(true)}
            className="p-1.5 sm:px-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            title="Scan Barcode Kamera (F3)"
          >
            <ScanBarcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">Scan</span>
          </button>

          {/* Held Orders Quick Access - Only show if has orders or on desktop */}
          <button
            id="btn-open-held-orders"
            onClick={() => setIsHeldModalOpen(true)}
            className={`relative p-1.5 sm:px-2 rounded-xl border text-xs font-semibold items-center gap-1 transition-colors cursor-pointer shrink-0 ${
              heldOrders.length === 0 ? 'hidden sm:flex' : 'flex'
            } ${
              heldOrders.length > 0
                ? 'border-amber-400/80 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:border-amber-700/70 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Lihat Pesanan Tertunda / Parkir (F4)"
          >
            <PauseCircle className="w-4 h-4 text-amber-500" />
            <span className="hidden md:inline">Parkir</span>
            {heldOrders.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center animate-pulse">
                {heldOrders.length}
              </span>
            )}
          </button>

          {/* Buku Panduan Langsung Akses */}
          <button
            id="btn-open-user-manual"
            onClick={() => setIsManualModalOpen(true)}
            className="hidden sm:flex px-2.5 py-1.5 rounded-xl text-xs font-semibold items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 transition-all cursor-pointer shrink-0 shadow-2xs"
            title="Buku Panduan Pengguna & Bantuan (F1 / Alt+H)"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="hidden lg:inline">Panduan</span>
          </button>

          {/* Grouped Pusat Alat & Sistem Dropdown */}
          <div className="relative hidden md:block shrink-0" ref={toolsMenuRef}>
            <button
              id="btn-tools-menu"
              onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
              title="Pusat Alat, LAN, Backup, Pengaturan &amp; Hotkeys"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xl:inline">Pusat Alat</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isToolsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isToolsMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <SettingsIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Pusat Alat &amp; Sistem</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Konfigurasi jaringan &amp; utilitas</p>
                    </div>
                  </div>
                </div>

                <div className="p-1.5 space-y-0.5">
                  {/* LAN Multi-Client Server */}
                  <button
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      setIsLANModalOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Network className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">Server LAN Multi-Kasir</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Jaringan kasir terintegrasi (Alt+N)</div>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  </button>

                  {/* Backup & Restore */}
                  <button
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      handleOpenBackupRestore();
                    }}
                    className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Database className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">Backup &amp; Restore Data</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Cadangan titik pemulihan (F9)</div>
                      </div>
                    </div>
                  </button>

                  {/* Desktop App Hub */}
                  <button
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      setIsDesktopModalOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Laptop className="w-4 h-4 text-blue-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">Mode Desktop &amp; Kiosk</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Layar penuh POS (Alt+D / F11)</div>
                      </div>
                    </div>
                    {isDesktop && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-bold">Aktif</span>
                    )}
                  </button>

                  {/* Marketing Promo AI */}
                  <button
                    id="btn-tools-marketing-promo"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      setActiveView('customers');
                      setActiveCustomersTab('marketing');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">Marketing &amp; Promo AI</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Draft pesan promo &amp; diskon pelanggan</div>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                      Gemini
                    </span>
                  </button>

                  {/* Settings Modal */}
                  <button
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      handleOpenSettings();
                    }}
                    className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <SettingsIcon className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">Pengaturan Toko &amp; Struk</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Printer, pajak, logo struk</div>
                      </div>
                    </div>
                  </button>

                  {/* Keyboard Shortcuts */}
                  <button
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      setIsShortcutsOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Keyboard className="w-4 h-4 text-slate-500 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">Pintasan Keyboard (Hotkeys)</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Daftar tombol cepat F1 - F10</div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Theme Switcher inside tools dropdown */}
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tema Tampilan</span>
                  <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => isDark && toggleTheme()}
                      className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                        !isDark ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      <Sun className="w-3 h-3 text-amber-500" />
                      <span>Terang</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => !isDark && toggleTheme()}
                      className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                        isDark ? 'bg-slate-800 text-emerald-400 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      <Moon className="w-3 h-3 text-emerald-400" />
                      <span>Gelap</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* DIRECT LOGIN / GANTI AKUN BUTTON - Desktop/Tablet */}
          <button
            id="btn-header-quick-lock"
            onClick={lockScreen}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
            title="Ganti Akun Kasir atau Login Otoritas Supervisor / Owner (Alt+L)"
          >
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="inline">Ganti Akun</span>
          </button>

          {/* Active Employee Profile & Quick Menu Dropdown */}
          <div className="relative shrink-0" ref={userMenuRef}>
            <button
              id="btn-employee-menu"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2 py-1 transition cursor-pointer shrink-0"
              title="Menu Karyawan & Ganti Otoritas"
            >
              <div
                className={`w-7 h-7 rounded-lg ${
                  activeEmployee?.avatarColor || 'bg-emerald-600'
                } text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0`}
              >
                {activeEmployee?.avatar || 'KR'}
              </div>
              <div className="text-left text-xs hidden sm:block">
                <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[85px] md:max-w-[110px]">
                  {activeEmployee?.name || 'Kasir'}
                </p>
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] font-bold px-1 rounded ${badge.bg}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden text-xs">
                {/* Active user header */}
                <div className="p-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl ${
                        activeEmployee?.avatarColor || 'bg-emerald-600'
                      } text-white font-bold text-sm flex items-center justify-center shadow-sm shrink-0`}
                    >
                      {activeEmployee?.avatar || 'KR'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {activeEmployee?.name}
                        </p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {activeEmployee?.roleTitle || activeEmployee?.role} • {activeEmployee?.assignedShift}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary login & lock actions */}
                <div className="p-1.5 space-y-1">
                  <button
                    id="menu-item-lock-screen"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      lockScreen();
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left text-amber-900 dark:text-amber-200 bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 transition border border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex items-center gap-2 font-bold">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>Ganti Kasir / Kunci Layar</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-[10px] text-amber-900 dark:text-amber-200 font-mono">
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
                      handleOpenEmployeeManagement();
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
                  >
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>Kelola Master Karyawan & PIN</span>
                  </button>

                  <button
                    id="menu-item-settings"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleOpenSettings();
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-500" />
                    <span>Pengaturan Toko & Struk</span>
                  </button>

                  <button
                    id="menu-item-backup-restore"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleOpenBackupRestore();
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-left text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition font-medium"
                  >
                    <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Cadangan & Titik Pemulihan (Backup)</span>
                  </button>

                  <button
                    id="menu-item-user-manual"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsManualModalOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Buku Panduan & Dokumentasi</span>
                    </div>
                    <kbd className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-[10px] font-mono">
                      F1 / Alt+H
                    </kbd>
                  </button>

                  <button
                    id="menu-item-gemini-ai"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      openGeminiCopilot('upsell');
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-left text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition font-medium"
                  >
                    <Sparkles className="w-4 h-4 text-teal-500 animate-pulse" />
                    <span>Gemini AI Retail Copilot</span>
                  </button>

                  <button
                    id="menu-item-toggle-theme"
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full px-3 py-2 rounded-xl flex items-center justify-between text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
                  >
                    <div className="flex items-center gap-2">
                      {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                      <span>Tema: {isDark ? 'Mode Gelap (Aktif)' : 'Mode Terang (Aktif)'}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      Ganti
                    </span>
                  </button>

                  {/* LAN & Desktop in menu for mobile/tablet */}
                  <div className="md:hidden border-t border-slate-200 dark:border-slate-800 pt-1 mt-1 space-y-1">
                    <button
                      id="menu-item-lan-server"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsLANModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-left text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition font-medium"
                    >
                      <Network className="w-4 h-4 text-indigo-500" />
                      <span>Jaringan Multi-Client LAN</span>
                    </button>

                    <button
                      id="menu-item-desktop-hub"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsDesktopModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-left text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition font-medium"
                    >
                      <Laptop className="w-4 h-4 text-blue-500" />
                      <span>Mode Layar Penuh Kiosk / Desktop</span>
                    </button>
                  </div>
                </div>

                {/* Fast Switch List to Other Roles (Supervisor, Owner, Cashiers) */}
                <div className="p-2 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 px-1 flex items-center justify-between">
                    <span>Ganti Akun Cepat:</span>
                    <span className="text-[9px] font-normal text-slate-400 font-mono">PIN / Otoritas</span>
                  </span>
                  <div className="space-y-1">
                    {employees
                      .filter((e) => e.isActive && e.id !== activeEmployee?.id)
                      .map((emp) => {
                        const isAuthority = emp.role === 'supervisor' || emp.role === 'owner';
                        return (
                          <button
                            key={emp.id}
                            onClick={() => {
                              quickSwitchEmployee(emp);
                              setIsUserMenuOpen(false);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-left text-xs transition border cursor-pointer ${
                              isAuthority
                                ? 'bg-purple-50/60 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/50 border-purple-200 dark:border-purple-800/70'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className={`w-2.5 h-2.5 rounded-full ${emp.avatarColor} shrink-0`} />
                              <span className="font-semibold truncate">{emp.name}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 font-bold shrink-0">
                                {emp.role === 'owner' ? 'Owner' : emp.role === 'supervisor' ? 'SPV' : 'Kasir'}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono shrink-0">
                              PIN: {emp.pin}
                            </span>
                          </button>
                        );
                      })}
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
                    className="w-full px-3 py-1.5 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Kunci / Keluar Akun</span>
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
      {isDesktopModalOpen && <DesktopAppModal isOpen={isDesktopModalOpen} onClose={() => setIsDesktopModalOpen(false)} />}
      {isManualModalOpen && <UserManualModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} />}
      <LANServerModal
        isOpen={isLANModalOpen}
        onClose={() => setIsLANModalOpen(false)}
        products={products}
        transactions={transactions}
        customers={customers}
        suppliers={suppliers}
        onApplyMasterData={(data) => {
          applyMasterLANData(data);
        }}
        onRecallSharedHeldOrder={(order) => {
          recallHeldOrder(order);
        }}
      />
      <AuthorityModal
        isOpen={authorityModalConfig.isOpen}
        onClose={() => setAuthorityModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={authorityModalConfig.title}
        description={authorityModalConfig.description}
        requiredRole={authorityModalConfig.requiredRole}
        onSuccess={() => {
          authorityModalConfig.onSuccess();
        }}
      />
    </>
  );
};
