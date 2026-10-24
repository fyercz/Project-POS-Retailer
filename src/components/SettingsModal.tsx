import React, { useState, useEffect } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Save,
  Store,
  Receipt,
  Percent,
  DollarSign,
  Check,
  Database,
  HardDriveDownload,
  ShieldAlert,
  Sparkles,
  Printer,
  Usb,
  Radio,
  Coins,
  Play,
  AlertCircle,
  Rocket,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Package,
  Download,
  MapPin,
  ExternalLink,
  Clock,
  Phone,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { StoreSettings } from '../types';
import { UlilMartLogo } from './UlilMartLogo';
import {
  getSavedPrinterConfig,
  savePrinterConfig,
  checkPrinterHardwareSupport,
  buildTestReceiptEscPos,
  printViaWebSerial,
  printViaWebBluetooth,
  kickCashDrawerOnly,
  PrinterConfig,
} from '../utils/escposPrinter';
import { executeSystemCleanup } from '../utils/desktopHelper';
import { errorMessage } from '../utils/errors';
import { StoreLogo } from './StoreLogo';
import { formatCurrency } from '../utils/formatters';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'settings' | 'launch';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab }) => {
  const {
    settings,
    updateSettings,
    setIsBackupRestoreOpen,
    downloadBackupFile,
    applyMinStockRuleToAllProducts,
    transactions,
    products,
    cart,
    heldOrders,
    activeEmployee,
    clearTrialTransactions,
    legacyDemoSummary,
    removeLegacyDemoData,
    setIsSyncModalOpen,
    autoSyncEnabled,
    autoSyncIntervalSeconds,
    databaseEngine,
    vouchers,
    deleteVoucher,
  } = usePOS();
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Tabs: 'settings' or 'launch'
  const [activeTab, setActiveTab] = useState<'settings' | 'launch'>(initialTab || 'settings');

  // Launch readiness options
  const [cleanTxOption, setCleanTxOption] = useState(true);
  const [cleanCartOption, setCleanCartOption] = useState(true);
  const [productCatalogChoice, setProductCatalogChoice] = useState<'keep_starter' | 'blank_catalog'>('keep_starter');
  const [isConfirmingLaunch, setIsConfirmingLaunch] = useState(false);
  const [launchSuccessMessage, setLaunchSuccessMessage] = useState<string | null>(null);
  const [launchErrorMessage, setLaunchErrorMessage] = useState<string | null>(null);

  // Hardware Printer state
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(getSavedPrinterConfig());
  const [hardwareSupport, setHardwareSupport] = useState({ hasSerial: false, hasBluetooth: false });
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isCleaningInSettings, setIsCleaningInSettings] = useState(false);
  const [settingsCleanupMsg, setSettingsCleanupMsg] = useState<string | null>(null);

  useEffect(() => {
    setHardwareSupport(checkPrinterHardwareSupport());
    setPrinterConfig(getSavedPrinterConfig());
    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (isOpen) {
      setFormData({ ...settings });
    }
    setIsConfirmingLaunch(false);
    setLaunchSuccessMessage(null);
    setLaunchErrorMessage(null);
  }, [isOpen, initialTab, settings]);

  if (!isOpen) return null;

  const handleTestPrint = async () => {
    setIsTesting(true);
    setTestStatus('Mengirim perintah cetak...');
    try {
      const bytes = buildTestReceiptEscPos(printerConfig.paperWidth, printerConfig.kickCashDrawer);
      let res;
      if (printerConfig.connectionType === 'bluetooth') {
        res = await printViaWebBluetooth(bytes);
      } else {
        res = await printViaWebSerial(bytes, printerConfig.baudRate);
      }
      setTestStatus(res.message);
    } catch (err) {
      setTestStatus('Gagal tes cetak: ' + (errorMessage(err) || String(err)));
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestStatus(null), 5000);
    }
  };

  const handleTestDrawer = async () => {
    setIsTesting(true);
    setTestStatus('Mengirim sinyal pulse RJ11 ke laci kas...');
    try {
      const mode = printerConfig.connectionType === 'bluetooth' ? 'bluetooth' : 'serial';
      const res = await kickCashDrawerOnly(mode, printerConfig.baudRate);
      setTestStatus(res.message);
    } catch (err) {
      setTestStatus('Gagal tes buka laci: ' + (errorMessage(err) || String(err)));
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestStatus(null), 5000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedSettings: StoreSettings = {
      ...formData,
      pointsRatio: Math.max(100, Number(formData.pointsRatio) || 10000),
      pointRedemptionRate: Math.max(1, Number(formData.pointRedemptionRate) || 100),
      minRedeemPoints: Math.max(0, formData.minRedeemPoints !== undefined && !isNaN(Number(formData.minRedeemPoints)) ? Number(formData.minRedeemPoints) : 10),
    };
    // Modal awal: tidak negatif; rincian laci + bank tidak melebihi total
    {
      const total = Math.max(0, Math.round(Number(formData.initialCapital) || 0));
      const cash = Math.min(total, Math.max(0, Math.round(Number(formData.initialCashInDrawer) || 0)));
      const bank = Math.min(total - cash, Math.max(0, Math.round(Number(formData.initialBankBalance) || 0)));
      sanitizedSettings.initialCapital = total;
      sanitizedSettings.initialCashInDrawer = cash;
      sanitizedSettings.initialBankBalance = bank;
    }
    updateSettings(sanitizedSettings);
    savePrinterConfig(printerConfig);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleExecuteLaunch = () => {
    const res = clearTrialTransactions();
    if (res.success) {
      setLaunchSuccessMessage(res.message);
      setLaunchErrorMessage(null);
      setIsConfirmingLaunch(false);
    } else {
      setLaunchErrorMessage(res.message);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="settings-dialog"
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              POS Terminal &amp; Store Settings
            </h3>
          </div>
          <button aria-label="Tutup"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950 px-3 pt-2 gap-1 shrink-0">
          <button aria-pressed={activeTab === 'settings'}
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-2 rounded-t-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-t border-x border-slate-200 dark:border-slate-800 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Pengaturan Toko &amp; Struk</span>
          </button>
          <button aria-pressed={activeTab === 'launch'}
            type="button"
            id="tab-btn-launch-readiness"
            onClick={() => setActiveTab('launch')}
            className={`px-3 py-2 rounded-t-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'launch'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-t border-x border-slate-200 dark:border-slate-800 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-emerald-500" />
            <span>Hapus Transaksi Uji Coba</span>
          </button>
        </div>

        {activeTab === 'settings' && (
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Logo & Brand Identity */}
          <div className="space-y-3 bg-gradient-to-br from-blue-50/70 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-4 rounded-2xl border border-blue-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-sm">
                <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Logo &amp; Identitas Toko</span>
              </div>
              <a
                href="/ulilmart-logo.svg"
                download="ulilmart-logo.svg"
                className="px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                title="Unduh file master logo SVG"
              >
                <Download className="w-3 h-3 text-blue-500" />
                <span>Unduh SVG</span>
              </a>
            </div>

            {/* Logo Live Visualizer Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[90px]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tampilan Mode Terang</span>
                <StoreLogo storeName={formData.storeName} variant="full" height={48} className="max-w-[210px] drop-shadow-xs" />
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[90px]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tampilan Mode Gelap</span>
                <StoreLogo storeName={formData.storeName} variant="full" height={48} theme="dark" className="max-w-[210px] drop-shadow-xs" />
              </div>
            </div>

            {/* Tagline & Receipt Logo Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Slogan / Tagline Toko
                </label>
                <input aria-label="Slogan / Tagline Toko"
                  type="text"
                  value={formData.storeTagline || ''}
                  placeholder="Lengkap &amp; Hemat"
                  onChange={(e) => setFormData({ ...formData, storeTagline: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 cursor-pointer w-full hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.showLogoOnReceipt !== false}
                    onChange={(e) => setFormData({ ...formData, showLogoOnReceipt: e.target.checked })}
                    className="w-4 h-4 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Cetak Logo di Struk</div>
                    <div className="text-[11px] text-slate-500">Tampilkan logo / nama toko di kop struk kasir</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Store Info */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Store className="w-4 h-4 text-emerald-500" />
                <span>Business Profile (Profil Bisnis Toko)</span>
              </div>
              {/* (Tombol isi-otomatis identitas ULIL Mart dihapus: instalasi baru netral) */}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Nama Toko / Brand
                </label>
                <input aria-label="Nama Toko / Brand"
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Nama Cabang / Unit
                </label>
                <input aria-label="Nama Cabang / Unit"
                  type="text"
                  required
                  value={formData.branchName}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Alamat Fisik Toko
              </label>
              <input aria-label="Alamat Fisik Toko"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input aria-label="Nomor Telepon / WhatsApp"
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-8 pr-2 py-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Jam Operasional
                </label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input aria-label="Jam Operasional"
                    type="text"
                    value={formData.operatingHours || ''}
                    placeholder="06.00 – 21.00 WIB (Buka Setiap Hari)"
                    onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                    className="w-full pl-8 pr-2 py-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 dark:text-slate-400 font-semibold">
                  Tautan Google Maps Lokasi Toko
                </label>
                {formData.googleMapsUrl && (
                  <a
                    href={formData.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 flex items-center gap-1"
                  >
                    <span>Buka di Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-600" />
                <input aria-label="Tautan Google Maps Lokasi Toko"
                  type="url"
                  value={formData.googleMapsUrl || ''}
                  placeholder="https://maps.app.goo.gl/..."
                  onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                  className="w-full pl-8 pr-2 py-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Currency & Loyalty Points */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>Mata Uang & Poin Loyalitas</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Mata Uang
                </label>
                <div className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 font-bold text-xs flex items-center justify-between">
                  <span>IDR (Rp) - Rupiah</span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    Baku
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Min Margin Poin (%)
                </label>
                <input aria-label="Min Margin Poin (%)"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={formData.minProfitPercentForPoints ?? 15}
                  onChange={(e) => setFormData({ ...formData, minProfitPercentForPoints: Number(e.target.value) })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  placeholder="15"
                />
                <span className="text-[11px] text-slate-500">Min. profit barang dapat poin</span>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Bonus Poin Member Baru
                </label>
                <input aria-label="Bonus Poin Member Baru"
                  type="number"
                  min={0}
                  step={5}
                  value={formData.welcomeBonusPoints ?? 0}
                  onChange={(e) => setFormData({ ...formData, welcomeBonusPoints: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  placeholder="0"
                />
                <span className="text-[11px] text-slate-500">Diberikan saat daftar. 0 = tanpa bonus</span>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <div className="text-slate-600 dark:text-slate-400 font-semibold text-xs">Tampilan Keranjang Kasir</div>
                <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-emerald-700"
                    checked={Boolean(formData.showMarginInCart)}
                    onChange={(e) => setFormData({ ...formData, showMarginInCart: e.target.checked })}
                  />
                  <span>
                    Tampilkan margin keuntungan per barang
                    <span className="block text-[11px] text-slate-500">Hanya untuk Owner/Supervisor. Matikan bila layar kasir terlihat oleh pembeli.</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-emerald-700"
                    checked={Boolean(formData.showAiUpsellInCart)}
                    onChange={(e) => setFormData({ ...formData, showAiUpsellInCart: e.target.checked })}
                  />
                  <span>Tampilkan saran produk AI di keranjang</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Rasio Perolehan Poin (Rp)
                </label>
                <input aria-label="Rasio Perolehan Poin (Rp)"
                  type="number"
                  min={100}
                  step={100}
                  value={formData.pointsRatio ?? 10000}
                  onChange={(e) => setFormData({ ...formData, pointsRatio: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  placeholder="10000"
                />
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {[1000, 5000, 10000, 20000].map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => setFormData({ ...formData, pointsRatio: pr })}
                      className={`px-1.5 py-0.5 text-[11px] font-mono rounded-md border transition cursor-pointer ${
                        formData.pointsRatio === pr
                          ? 'bg-emerald-700 text-white font-bold border-emerald-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      {pr.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-500">1 poin per kelipatan belanja</span>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Nilai Diskon Poin (Rp/Poin)
                </label>
                <input aria-label="Nilai Diskon Poin (Rp/Poin)"
                  type="number"
                  min={1}
                  step={1}
                  value={formData.pointRedemptionRate ?? 100}
                  onChange={(e) => setFormData({ ...formData, pointRedemptionRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  placeholder="100"
                />
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {[10, 50, 100, 200, 500, 1000].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setFormData({ ...formData, pointRedemptionRate: rate })}
                      className={`px-1.5 py-0.5 text-[11px] font-mono rounded-md border transition cursor-pointer ${
                        formData.pointRedemptionRate === rate
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-600'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                      }`}
                    >
                      {rate}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-500">Nilai diskon per 1 poin (cth: Rp 10 atau Rp 100)</span>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Min. Poin Ditukar
                </label>
                <input aria-label="Min. Poin Ditukar"
                  type="number"
                  min={0}
                  step={1}
                  value={formData.minRedeemPoints ?? 10}
                  onChange={(e) => setFormData({ ...formData, minRedeemPoints: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  placeholder="10"
                />
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {[1, 5, 10, 20, 50, 100].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setFormData({ ...formData, minRedeemPoints: pts })}
                      className={`px-1.5 py-0.5 text-[11px] font-mono rounded-md border transition cursor-pointer ${
                        formData.minRedeemPoints === pts
                          ? 'bg-indigo-600 text-white font-bold border-indigo-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                      }`}
                    >
                      {pts}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-500">Bebas diisi angka bulat berapa saja (cth: 10 atau 100)</span>
              </div>
            </div>
          </div>

          {/* Modal awal untuk neraca (dulu tidak bisa diisi dari aplikasi) */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>Modal Awal &amp; Pembukuan</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Nilai usaha saat mulai memakai aplikasi ini: uang di laci + saldo bank + nilai stok awal. Dipakai di Neraca.
              Rincian laci/bank membuat kas & bank di Neraca sesuai kenyataan; sisanya dicatat sebagai &quot;dana awal lainnya&quot; (mis. stok awal).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">Total Modal Awal (Rp)</label>
                <input
                  aria-label="Total Modal Awal (Rp)"
                  type="number"
                  min={0}
                  step={1000}
                  value={formData.initialCapital ?? 0}
                  onChange={(e) => setFormData({ ...formData, initialCapital: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
                <span className="text-[11px] text-slate-500">Uang + stok awal</span>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">Bagian: Uang di Laci (Rp)</label>
                <input
                  aria-label="Bagian: Uang di Laci (Rp)"
                  type="number"
                  min={0}
                  step={1000}
                  value={formData.initialCashInDrawer ?? 0}
                  onChange={(e) => setFormData({ ...formData, initialCashInDrawer: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
                <span className="text-[11px] text-slate-500">Uang tunai saat mulai</span>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">Bagian: Saldo Bank (Rp)</label>
                <input
                  aria-label="Bagian: Saldo Bank (Rp)"
                  type="number"
                  min={0}
                  step={1000}
                  value={formData.initialBankBalance ?? 0}
                  onChange={(e) => setFormData({ ...formData, initialBankBalance: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
                <span className="text-[11px] text-slate-500">Rekening / QRIS saat mulai</span>
              </div>
            </div>
            {(() => {
              const total = Number(formData.initialCapital) || 0;
              const rest = total - (Number(formData.initialCashInDrawer) || 0) - (Number(formData.initialBankBalance) || 0);
              return rest < 0 ? (
                <p role="alert" className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                  Uang di laci + saldo bank melebihi total modal awal. Saat disimpan, rincian akan dibatasi sesuai total.
                </p>
              ) : (
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Dana awal lainnya (mis. nilai stok awal): <strong>{formatCurrency(rest, formData.currency)}</strong>
                </p>
              );
            })()}
          </div>

          {/* Thermal Receipt Settings */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Receipt className="w-4 h-4 text-emerald-500" />
              <span>Receipt Printing Customization</span>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Receipt Footer Greeting Note
              </label>
              <textarea aria-label="Receipt Footer Greeting Note"
                value={formData.receiptFooterMessage}
                onChange={(e) => setFormData({ ...formData, receiptFooterMessage: e.target.value })}
                rows={2}
                className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* User-configurable setting to automatically trigger thermal receipt print dialog */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                <input
                  type="checkbox"
                  id="settings-auto-print-receipt"
                  checked={formData.autoPrintReceipt !== false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData({ ...formData, autoPrintReceipt: checked });
                    setPrinterConfig({ ...printerConfig, autoPrintReceipt: checked });
                  }}
                  className="w-4 h-4 mt-0.5 rounded-md text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Otomatis Cetak Struk Thermal Setelah Pembayaran Sukses
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Auto-Print Dialog
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Memicu jendela dialog cetak struk thermal kasir secara otomatis begitu transaksi pembayaran berhasil diproses, sehingga kasir tidak perlu menekan tombol cetak manual secara berulang.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Hardware Direct Thermal Printer & Cash Drawer (ESC/POS) */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Printer className="w-4 h-4 text-emerald-500" />
                <span>Hardware Thermal Printer &amp; Laci Kas (ESC/POS)</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Direct RAW Hardware
              </span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Dukungan cetak thermal langsung tanpa dialog browser melalui <strong>Web Serial API (USB)</strong> dan <strong>Web Bluetooth</strong>, dilengkapi pemotong kertas otomatis (auto-cut) dan pemicu pulse laci kas (RJ11 Cash Drawer).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Koneksi Default
                </label>
                <select aria-label="Koneksi Default"
                  value={printerConfig.connectionType}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, connectionType: e.target.value as any })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                >
                  <option value="system">Browser / Jendela Dialog Cetak</option>
                  <option value="serial">USB / Serial Port (ESC/POS)</option>
                  <option value="bluetooth">Bluetooth Thermal Printer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Lebar Kertas Thermal
                </label>
                <select aria-label="Lebar Kertas Thermal"
                  value={printerConfig.paperWidth}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, paperWidth: e.target.value as any })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                >
                  <option value="58mm">58 mm (Standar Mini / 32 Kolom)</option>
                  <option value="80mm">80 mm (Lebar Kasir / 48 Kolom)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Baud Rate (Port Serial)
                </label>
                <select aria-label="Baud Rate (Port Serial)"
                  value={printerConfig.baudRate}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, baudRate: Number(e.target.value) })}
                  className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                >
                  <option value={9600}>9600 bps (Standar Xprinter/Epson)</option>
                  <option value={19200}>19200 bps</option>
                  <option value={38400}>38400 bps</option>
                  <option value={115200}>115200 bps</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={printerConfig.kickCashDrawer}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, kickCashDrawer: e.target.checked })}
                  className="rounded-md border-slate-300 text-emerald-700 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Buka Laci Kas Otomatis (RJ11 Pulse)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={printerConfig.autoCut}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, autoCut: e.target.checked })}
                  className="rounded-md border-slate-300 text-emerald-700 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Auto-Cut Kertas Struk Selesai Cetak
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={printerConfig.autoPrintReceipt !== false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPrinterConfig({ ...printerConfig, autoPrintReceipt: checked });
                    setFormData({ ...formData, autoPrintReceipt: checked });
                  }}
                  className="rounded-md border-slate-300 text-emerald-700 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Auto-Print Struk saat Transaksi Selesai
                </span>
              </label>
            </div>

            {/* Test Hardware Buttons */}
            <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={isTesting}
                  className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tes Cetak Struk ESC/POS</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestDrawer}
                  disabled={isTesting}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition disabled:opacity-50"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-700" />
                  <span>Tes Buka Laci (RJ11)</span>
                </button>
              </div>

              {testStatus && (
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {testStatus}
                </span>
              )}
            </div>
          </div>

          {/* Aturan Batas Minimal Stok (Safety Stock) */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <ShieldAlert className="w-4 h-4 text-blue-500" />
                <span>Aturan Batas Minimal Stok (Safety Stock)</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Aturan 50% PO
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
              Sistem menetapkan <strong>batas minimal stok adalah 50% dari jumlah order terakhir</strong> (PO Faktur). Ketika stok barang di rak mencapai atau di bawah batas ini, sistem akan memunculkan peringatan stok menipis agar toko tidak mengalami kekosongan barang (stockout).
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Persentase Batas Minimal (% Order)
                </label>
                <div className="relative">
                  <input aria-label="Persentase Batas Minimal (% Order)"
                    type="number"
                    min={10}
                    max={100}
                    step={5}
                    value={formData.minStockRulePercentage ?? 50}
                    onChange={(e) => setFormData({ ...formData, minStockRulePercentage: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-500 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">%</span>
                </div>
                <span className="text-[11px] text-slate-500">Default: 50% dari kuantitas order PO</span>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <input
                    type="checkbox"
                    checked={formData.autoUpdateMinStockFromOrder !== false}
                    onChange={(e) => setFormData({ ...formData, autoUpdateMinStockFromOrder: e.target.checked })}
                    className="rounded-md border-slate-300 text-emerald-700 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Auto-Update saat Terima PO
                  </span>
                </label>
                <span className="text-[11px] text-slate-500 mt-1">Otomatis update min stock saat faktur masuk</span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const count = applyMinStockRuleToAllProducts(formData.minStockRulePercentage ?? 50);
                  setSyncMessage(`Berhasil diterapkan ke ${count} produk!`);
                  setTimeout(() => setSyncMessage(null), 3500);
                }}
                className="px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Terapkan Aturan 50% ke Semua Produk Sekarang</span>
              </button>
              {syncMessage && (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 animate-in fade-in">
                  ✓ {syncMessage}
                </span>
              )}
            </div>

            {/* Pengaturan Tampilan Barang Stok Kosong / Habis (0 Pcs) */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 text-xs">
                Tampilan Barang Stok Kosong / Habis (0 Pcs) di Katalog &amp; Inventaris
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, outOfStockDisplay: 'bottom' })}
                  className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                    (formData.outOfStockDisplay ?? 'bottom') === 'bottom'
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>⬇️ Di Paling Bawah</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal leading-tight">
                    Barang stok 0 otomatis digeser ke urutan paling bawah setelah produk yang tersedia.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, outOfStockDisplay: 'hide' })}
                  className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                    formData.outOfStockDisplay === 'hide'
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>👁️‍🗨️ Sembunyikan</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal leading-tight">
                    Barang stok 0 disembunyikan sepenuhnya dari katalog kasir agar hanya menampilkan barang siap jual.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, outOfStockDisplay: 'normal' })}
                  className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                    formData.outOfStockDisplay === 'normal'
                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-500 text-slate-900 dark:text-white font-bold shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>📋 Urutan Normal</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal leading-tight">
                    Barang ditampilkan apa adanya sesuai urutan asli kategori tanpa pemisahan stok.
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Central Server & Relational SQLite WAL Database */}
          <div className="space-y-2 bg-blue-50/70 dark:bg-blue-950/25 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <Database className="w-4 h-4 text-blue-500" />
                <span>Basis Data Relasional Server &amp; Sinkronisasi Otomatis</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setIsSyncModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
              >
                <span>Pusat Sinkronisasi &amp; SQLite WAL</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold text-[11px] font-mono">
                {databaseEngine || 'SQLite WAL Mode'}
              </span>
              <span>
                Sinkronisasi berkala: <strong>{autoSyncEnabled ? `Aktif (${autoSyncIntervalSeconds} detik)` : 'Nonaktif'}</strong>.
                Menjamin transaksi ACID, zero table locks, dan integritas multi-kasir.
              </span>
            </div>
          </div>

          {/* Backup & Disaster Recovery Center */}
          <div className="space-y-2 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-850">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>Basis Data &amp; Cadangan (IndexedDB)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadBackupFile()}
                  className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                  title="Unduh langsung berkas backup .JSON ke komputer Anda"
                >
                  <HardDriveDownload className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>Ekspor .JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setIsBackupRestoreOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
                >
                  <span>Pusat Cadangan</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                IndexedDB Ultra-Capacity
              </span>
              <span>Kapasitas penyimpanan puluhan GB tanpa batas 5MB LocalStorage.</span>
            </div>
          </div>

          {/* Daftar voucher: lihat masa berlaku & hapus voucher yang tidak dipakai lagi */}
          <div className="space-y-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Voucher Diskon Aktif ({vouchers.length})</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Semua kode di bawah ini bisa dipakai di kasir. Hapus voucher yang sudah tidak berlaku atau tidak pernah dibuat toko.
            </p>
            {vouchers.length === 0 ? (
              <p className="text-[11px] text-slate-500">Belum ada voucher.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                {vouchers.map((v) => {
                  const expired = Boolean(v.expiresAt && new Date(v.expiresAt).getTime() < Date.now());
                  return (
                    <div key={v.code} className="py-1.5 flex items-center justify-between gap-2 text-[11px]">
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-100">
                          {v.code}{' '}
                          <span className="font-sans font-normal text-slate-500">
                            {v.discountType === 'percentage' ? `${v.value}%` : `Rp ${v.value.toLocaleString('id-ID')}`} · min. Rp{' '}
                            {(v.minSpend || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className={expired ? 'text-rose-600' : 'text-slate-500'}>
                          {v.expiresAt
                            ? `${expired ? 'Kedaluwarsa' : 'Berlaku s/d'} ${new Date(v.expiresAt).toLocaleDateString('id-ID')}`
                            : 'Tanpa batas waktu'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Hapus voucher ${v.code}? Kode ini tidak bisa dipakai lagi di kasir.`)) deleteVoucher(v.code);
                        }}
                        className="shrink-0 px-2 py-1 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pemeliharaan File Usang & Cache */}
          <div className="space-y-2 bg-gradient-to-r from-rose-50/50 via-amber-50/30 to-slate-50 dark:from-slate-900/80 dark:to-slate-950 p-3.5 rounded-xl border border-rose-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Pembersihan File Usang &amp; Cache Sistem</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Pindai dan hapus file sampah, cache build usang (<code>node_modules/.vite</code>), log debugging (<code>*.log</code>), dan file sementara (<code>*.tmp</code>) dengan aman tanpa menghapus database kasir.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setIsCleaningInSettings(true);
                  setSettingsCleanupMsg(null);
                  try {
                    const res = await executeSystemCleanup();
                    setSettingsCleanupMsg(res.message);
                  } catch (e) {
                    setSettingsCleanupMsg('Gagal: ' + errorMessage(e));
                  } finally {
                    setIsCleaningInSettings(false);
                  }
                }}
                disabled={isCleaningInSettings}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 transition"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isCleaningInSettings ? 'animate-spin' : ''}`} />
                <span>{isCleaningInSettings ? 'Sedang Membersihkan...' : 'Bersihkan File Usang Sekarang'}</span>
              </button>
              {settingsCleanupMsg && (
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {settingsCleanupMsg}
                </span>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saved ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
        )}

        {activeTab === 'launch' && (
          <div className="p-5 space-y-4 text-xs overflow-y-auto">
            {legacyDemoSummary.total > 0 && (
              <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 space-y-2">
                <div className="text-sm font-bold text-slate-900 dark:text-white">Data Contoh dari Versi Lama</div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Masih tersimpan data demo bawaan versi lama:{' '}
                  {[
                    [legacyDemoSummary.customers, 'member'],
                    [legacyDemoSummary.vouchers, 'voucher'],
                    [legacyDemoSummary.suppliers, 'supplier'],
                    [legacyDemoSummary.purchases, 'faktur pembelian'],
                    [legacyDemoSummary.expenses, 'pengeluaran'],
                    [legacyDemoSummary.transactions, 'transaksi contoh'],
                    [legacyDemoSummary.products, 'produk contoh'],
                  ]
                    .filter(([n]) => (n as number) > 0)
                    .map(([n, label]) => `${(n as number).toLocaleString('id-ID')} ${label}`)
                    .join(', ')}
                  . Data ini ikut masuk laporan & daftar member. Hanya data dengan ID/kode demo yang dihapus; data toko Anda
                  tidak tersentuh. Akun karyawan contoh tidak dihapus otomatis — ganti PIN-nya di Kelola Karyawan.
                </p>
                <button
                  type="button"
                  id="btn-remove-legacy-demo"
                  onClick={() => {
                    if (!confirm('Hapus semua data contoh lama? Titik pulih otomatis dibuat lebih dulu.')) return;
                    const res = removeLegacyDemoData();
                    if (res.success) {
                      setLaunchSuccessMessage(res.message);
                      setLaunchErrorMessage(null);
                    } else setLaunchErrorMessage(res.message);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-amber-400 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 font-bold cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/50"
                >
                  Hapus {legacyDemoSummary.total.toLocaleString('id-ID')} Data Contoh Lama
                </button>
              </div>
            )}
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900 dark:text-white">Hapus Transaksi Uji Coba</div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Gunakan setelah melatih kasir atau mencoba aplikasi sebelum toko buka. Yang dihapus:{' '}
                <strong>transaksi, retur penjualan, keranjang, pesanan parkir, dan riwayat shift</strong>.
                Produk, member, supplier, karyawan, dan pengaturan <strong>tidak</strong> disentuh.
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Saat ini: {transactions.length} transaksi tercatat. Titik pulih otomatis dibuat sebelum penghapusan.
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Catatan: transaksi yang sudah terkirim ke database server (folder data\ di komputer server) tidak ikut
                terhapus.
              </p>
            </div>

            {launchSuccessMessage && (
              <div role="status" className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
                {launchSuccessMessage}
              </div>
            )}
            {launchErrorMessage && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
                {launchErrorMessage}
              </div>
            )}

            {!isConfirmingLaunch ? (
              <button
                type="button"
                id="btn-clear-trial-transactions"
                disabled={transactions.length === 0}
                onClick={() => setIsConfirmingLaunch(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold cursor-pointer"
              >
                Hapus {transactions.length} Transaksi Uji Coba
              </button>
            ) : (
              <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 space-y-2">
                <p className="text-rose-800 dark:text-rose-300 font-semibold">
                  Yakin? Jangan lakukan ini bila sudah ada penjualan sungguhan.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteLaunch}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold cursor-pointer"
                  >
                    Ya, Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingLaunch(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
