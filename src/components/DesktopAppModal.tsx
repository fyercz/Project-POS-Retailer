import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Laptop,
  Download,
  Maximize2,
  Minimize2,
  Printer,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Terminal,
  ExternalLink,
  FileText,
  Layers,
  Tv,
  Cpu,
  Sparkles,
  X,
  Radio,
  Play,
  Settings,
  HardDrive,
  Zap,
} from 'lucide-react';
import {
  isDesktopApp,
  isElectronApp,
  isStandalonePWA,
  isFullscreenActive,
  togglePOSKioskFullscreen,
  promptPWAInstall,
  subscribeToInstallPrompt,
  triggerCashDrawerKick,
  downloadWindowsDesktopLauncher,
  downloadUnixDesktopLauncher,
  downloadAutorunBat,
  downloadSetupStartupBat,
  downloadAutorunInf,
} from '../utils/desktopHelper';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'install' | 'kiosk' | 'hardware' | 'electron'>('install');
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [testPrintSuccess, setTestPrintSuccess] = useState<boolean>(false);
  const [drawerKickStatus, setDrawerKickStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsDesktop(isDesktopApp());
    setIsElectron(isElectronApp());
    setIsFullscreen(isFullscreenActive());

    const unsubscribe = subscribeToInstallPrompt((canInstall) => {
      setCanInstallPwa(canInstall);
    });

    const handleFullscreenChange = () => {
      setIsFullscreen(isFullscreenActive());
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      unsubscribe();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const outcome = await promptPWAInstall();
    if (outcome === 'accepted') {
      setIsDesktop(true);
    }
  };

  const handleToggleKiosk = async () => {
    const active = await togglePOSKioskFullscreen();
    setIsFullscreen(active);
  };

  const handleTestDrawerKick = async () => {
    const res = await triggerCashDrawerKick();
    setDrawerKickStatus(res.message);
    setTimeout(() => setDrawerKickStatus(null), 4000);
  };

  const handleTestPrint = () => {
    setTestPrintSuccess(true);
    setTimeout(() => {
      window.print();
      setTestPrintSuccess(false);
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <Monitor className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Pusat Aplikasi Kasir Desktop</h3>
                {isDesktop ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Mode Desktop Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[10px] font-bold">
                    Mode Browser Web
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100/80">
                Jadikan POS sebagai aplikasi desktop mandiri, mode layar penuh kasir, dan integrasi hardware
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 pt-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 overflow-x-auto gap-1 text-xs">
          <button
            onClick={() => setActiveTab('install')}
            className={`px-3 py-2.5 rounded-t-xl font-bold flex items-center gap-2 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'install'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Pasang di Desktop</span>
          </button>
          <button
            onClick={() => setActiveTab('kiosk')}
            className={`px-3 py-2.5 rounded-t-xl font-bold flex items-center gap-2 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'kiosk'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Mode Kiosk (Layar Penuh)</span>
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-3 py-2.5 rounded-t-xl font-bold flex items-center gap-2 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'hardware'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Printer &amp; Laci Uang</span>
          </button>
          <button
            onClick={() => setActiveTab('electron')}
            className={`px-3 py-2.5 rounded-t-xl font-bold flex items-center gap-2 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'electron'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Paket .EXE (Electron)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: INSTALL DESKTOP APP */}
          {activeTab === 'install' && (
            <div className="space-y-4">
              {/* Current Status Card */}
              <div
                className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                  isDesktop
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                    : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isDesktop
                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {isDesktop ? <CheckCircle2 className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-sm block">
                      {isDesktop ? 'Aplikasi Sedang Berjalan dalam Mode Desktop' : 'Bisa Dipasang sebagai Aplikasi Desktop'}
                    </span>
                    <p className="mt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isDesktop
                        ? 'Aplikasi berjalan di jendela khusus tanpa bilah alamat browser, memiliki ikon di Taskbar/Desktop, dan siap beroperasi secara instan 100% offline.'
                        : 'Pasang Point of Sales langsung ke sistem operasi komputer kasir Anda (Windows, macOS, atau Linux) tanpa memerlukan software tambahan.'}
                    </p>
                  </div>
                </div>

                {!isDesktop && canInstallPwa && (
                  <button
                    onClick={handleInstallClick}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pasang Sekarang</span>
                  </button>
                )}
              </div>

              {/* 3 Steps to Run as Dedicated Desktop App */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pilihan Menjalankan sebagai Aplikasi Desktop
                </h4>

                {/* Option 1: PWA Direct Install */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xs">
                        1
                      </span>
                      <span>Instal PWA Desktop (Chrome, Edge, Brave, Safari)</span>
                    </div>
                    {canInstallPwa && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                        Siap Dipasang
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Klik ikon instal di bilah browser (di sebelah tombol bookmark/favorit) atau tekan tombol di bawah ini. Aplikasi akan langsung muncul di desktop dan menu Start Windows sebagai program tersendiri.
                  </p>
                  {canInstallPwa ? (
                    <button
                      onClick={handleInstallClick}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Instal Ulilmart POS ke Desktop</span>
                    </button>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                      💡 <strong>Petunjuk Manual:</strong> Pada Google Chrome atau Microsoft Edge, klik titik tiga menu (kanan atas) &rarr; pilih <strong>"Simpan &amp; bagikan"</strong> atau <strong>"Aplikasi"</strong> &rarr; pilih <strong>"Instal situs ini sebagai aplikasi"</strong>.
                    </div>
                  )}
                </div>

                {/* Option 2: 1-Click Desktop Launcher Script */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">
                        2
                      </span>
                      <span>Peluncur Berkas Desktop Mandiri (.BAT / .SH)</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                      App Mode
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Unduh skrip peluncur 1-klik untuk menjalankan server kasir dan membuka jendela desktop mandiri tanpa address bar secara otomatis.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => downloadWindowsDesktopLauncher({ kioskMode: false })}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-500" />
                      <span>Unduh Launcher Windows (.bat)</span>
                    </button>
                    <button
                      onClick={() => downloadWindowsDesktopLauncher({ kioskMode: true })}
                      className="px-3.5 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Unduh Launcher Kiosk Fullscreen (.bat)</span>
                    </button>
                    <button
                      onClick={() => downloadUnixDesktopLauncher({ kioskMode: false })}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Unduh Linux / Mac (.sh)</span>
                    </button>
                  </div>
                </div>

                {/* Option 3: Autorun & Auto-Start Kasir */}
                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                      <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs">
                        3
                      </span>
                      <span>Autorun &amp; Auto-Start Kasir (Saat Komputer Dinyalakan)</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-600" />
                      <span>Auto-Boot</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Sistem <strong>Autorun</strong> lengkap untuk toko fisik. Cukup klik ganda <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 font-mono text-[11px]">autorun.bat</code>, sistem akan memeriksa Node.js, auto-install, auto-build, dan langsung membuka kasir. Gunakan wizard startup untuk membuka kasir otomatis setiap pagi saat PC dinyalakan!
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => downloadAutorunBat()}
                      className="px-3.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh autorun.bat (Universal)</span>
                    </button>
                    <button
                      onClick={() => downloadSetupStartupBat()}
                      className="px-3.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <Settings className="w-3.5 h-3.5 text-amber-600" />
                      <span>Unduh setup-autorun-startup.bat</span>
                    </button>
                    <button
                      onClick={() => downloadAutorunInf()}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Unduh autorun.inf (Media USB)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KIOSK MODE (FULLSCREEN CASHIER) */}
          {activeTab === 'kiosk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Mode Kasir Kiosk (Layar Penuh Tanpa Batas)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Mengunci tampilan ke layar penuh untuk mencegah kasir membuka tab lain atau terdistraksi saat antrean transaksi.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleKiosk}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 ${
                      isFullscreen
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                    }`}
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize2 className="w-4 h-4" />
                        <span>Keluar Mode Kiosk</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-4 h-4" />
                        <span>Aktifkan Kiosk Sekarang (F11)</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Kecepatan Antrean Maksimal
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Seluruh ruang layar didedikasikan untuk katalog produk, keranjang kasir, dan ringkasan pembayaran.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Tombol Pintas (Hotkeys)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tekan tombol <strong>F11</strong> pada keyboard kapan saja untuk masuk atau keluar dari mode layar penuh.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cashier Keyboard Shortcuts Cheat Map */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2.5">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-400 block">
                  Navigasi Cepat Keyboard Kasir Terminal Desktop:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span className="text-slate-400">F2</span>
                    <span className="font-bold text-emerald-400">Bayar / Kasir</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span className="text-slate-400">F4</span>
                    <span className="font-bold text-amber-400">Parkir Order</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span className="text-slate-400">F8</span>
                    <span className="font-bold text-blue-400">Scanner Barcode</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span className="text-slate-400">F9</span>
                    <span className="font-bold text-purple-400">Backup &amp; Restore</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span className="text-slate-400">F11</span>
                    <span className="font-bold text-cyan-400">Layar Penuh</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span className="text-slate-400">ESC</span>
                    <span className="font-bold text-rose-400">Tutup Dialog</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span className="text-slate-400">Alt+L</span>
                    <span className="font-bold text-amber-300">Kunci Layar</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <span className="text-slate-400">Alt+G</span>
                    <span className="font-bold text-indigo-300">Gemini AI</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HARDWARE (THERMAL PRINTER & CASH DRAWER) */}
          {activeTab === 'hardware' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Printer className="w-4 h-4 text-blue-500" />
                  <span>Integrasi Printer Kasir Thermal (58mm / 80mm)</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Aplikasi POS mendukung pencetakan langsung ke printer kasir thermal USB, Bluetooth, ataupun Network (LAN) dengan layout yang sudah dioptimasi untuk struk belanja.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleTestPrint}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Uji Coba Cetak Struk Contoh</span>
                  </button>

                  <button
                    onClick={handleTestDrawerKick}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Tes Sinyal Buka Laci Uang (Drawer Kick)</span>
                  </button>
                </div>

                {drawerKickStatus && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{drawerKickStatus}</span>
                  </div>
                )}
              </div>

              {/* Silent Printing Tips */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Tips Mode Cetak Senyap (Silent Direct Printing)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Agar kasir tidak perlu menekan tombol "Print" pada popup dialog setiap kali transaksi selesai:
                </p>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  chrome.exe --kiosk --kiosk-printing http://localhost:3000
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Menambahkan flag <code>--kiosk-printing</code> pada shortcut kasir akan langsung mengirim struk ke printer default tanpa menampilkan dialog konfirmasi print.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: ELECTRON NATIVE PACKAGE */}
          {activeTab === 'electron' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Arsitektur Native Desktop (Electron Ready)
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Berkas <code>electron/main.cjs</code> dan <code>electron/preload.cjs</code> telah dikonfigurasi di repositori.
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Jika Anda ingin mengemas aplikasi ini menjadi file instalasi mandiri <strong>.exe (Windows Installer)</strong>, <strong>.dmg (macOS)</strong>, atau <strong>.AppImage / .deb (Linux)</strong>:
                </p>

                {/* Commands */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    1. Jalankan mode pengembang Electron lokal:
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-xs flex items-center justify-between">
                    <span>npx electron electron/main.cjs</span>
                  </div>

                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 pt-1">
                    2. Atau luncurkan dengan skrip launcher desktop bawaan:
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 text-blue-300 font-mono text-xs">
                    <span>node scripts/launcher.mjs run</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                  <span className="font-bold block">Keuntungan Menggunakan Desktop App:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <li>Koneksi langsung (*raw communication*) ke printer struk dan laci uang fisik.</li>
                    <li>Dukungan scanner barcode USB &amp; serial RS232 tanpa terpengaruh fokus input browser.</li>
                    <li>Data tetap aman tersimpan di mesin kasir toko lokal.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Sistem POS Offline-First: Siap beroperasi dengan atau tanpa jaringan internet.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
