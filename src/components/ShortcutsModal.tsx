import React from 'react';
import { X, Keyboard, SunMoon, Search, PauseCircle, Tag, CreditCard, Monitor, BookOpen, Laptop, Database, Network } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1 / Alt + H', action: 'Buku Panduan & Manual Fitur Aplikasi', icon: BookOpen, highlight: true },
    { key: 'Alt + N', action: 'Server Database Multi-Client LAN', icon: Network, highlight: true },
    { key: 'Ctrl + F / F2', action: 'Fokus Pencarian Produk (Filter Nama / SKU / Barcode)', icon: Search, highlight: true },
    { key: 'F3', action: 'Buka Scanner Barcode Kamera (Auto Add ke Cart)', icon: Search },
    { key: 'F4', action: 'Parkir / Simpan Pesanan Sementara (Hold Order)', icon: PauseCircle },
    { key: 'F9 / Alt + B', action: 'Pusat Cadangan & Pemulihan (Backup & Restore)', icon: Database, highlight: true },
    { key: 'Alt + D / F11', action: 'Aplikasi Desktop & Layar Penuh Kiosk', icon: Laptop },
    { key: 'Alt + L', action: 'Kunci Layar Kasir / Login PIN Otorisasi', icon: Monitor },
    { key: 'Alt + T', action: 'Ganti Tema Gelap / Terang (Dark / Light)', icon: SunMoon },
    { key: 'Esc', action: 'Tutup Dialog / Modal yang Sedang Aktif', icon: X },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="shortcuts-dialog"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              POS Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {shortcuts.map((sc) => {
            const Icon = sc.icon;
            return (
              <div
                key={sc.key}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  sc.highlight
                    ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${sc.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <span className="font-medium">{sc.action}</span>
                </div>
                <kbd className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold shadow-2xs">
                  {sc.key}
                </kbd>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Speed up cashier operations with instant keyboard triggers.
          </p>
        </div>
      </div>
    </div>
  );
};
